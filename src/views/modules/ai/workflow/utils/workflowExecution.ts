import { computed, onUnmounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { EnhancedSSEService } from './sseService'
import type {
  ExecutionError,
  ExecutionMetrics,
  NodeExecutionResult,
  NodeExecutionState,
  SSEChunkMessage,
  SSENodeCompleteMessage,
  SSENodeOutputMessage,
  WorkflowExecutionState,
} from '../types'

export function useWorkflowExecution() {
  // 响应式状态
  const isRunning = ref(false)
  const isCompleted = ref(false) // 新增：基于DONE事件的完成状态
  const executionId = ref<string | null>(null)
  const resultPanelVisible = ref(false)
  const selectedResultNodeId = ref<string | null>(null)

  // 使用ref管理复杂对象，确保响应式更新
  const _nodeStates = ref(new Map<string, NodeExecutionState>())
  const _executionResults = ref(new Map<string, NodeExecutionResult>())

  // 记录节点执行顺序
  const nodeExecutionOrder = ref<string[]>([])

  // 直接暴露ref的value，简化访问
  const nodeStates = _nodeStates
  const executionResults = _executionResults
  const errors = reactive<ExecutionError[]>([])
  const executionMetrics = reactive<ExecutionMetrics>({
    totalNodes: 0,
    completedNodes: 0,
    startTime: 0,
    endTime: undefined,
    totalDuration: undefined,
    averageNodeTime: undefined,
  })

  // SSE连接实例
  let sseService: EnhancedSSEService | null = null

  // 计算属性 - 移除进度计算，因为不是所有节点都会执行

  const hasErrors = computed(() => errors.length > 0)

  // 移除旧的isCompleted计算属性，使用基于事件的ref

  // 工作流执行状态的完整对象
  const workflowExecutionState = computed<WorkflowExecutionState>(() => ({
    isRunning: isRunning.value,
    executionId: executionId.value,
    nodeStates,
    executionResults,
    errors,
    resultPanelVisible: resultPanelVisible.value,
    selectedResultNodeId: selectedResultNodeId.value,
    executionMetrics,
  }))

  /**
   * 开始执行工作流
   */
  const executeWorkflow = async (
    workflowId: string,
    nodes: any[],
    inputs: Record<string, any> = {},
  ) => {
    if (isRunning.value) {
      message.warning('工作流正在执行中，请勿重复执行')
      return
    }

    try {
      // 初始化执行状态
      initializeExecution(nodes)

      // 显示结果面板
      resultPanelVisible.value = true

      // 创建SSE连接
      sseService = new EnhancedSSEService({
        url: '/ai/ai/workflows/runtime/run',
        requestBody: {
          workflowId,
          inputs,
        },
        onOpen: handleSSEOpen,
        onMessage: handleSSEMessage,
        onError: handleSSEError,
        onClose: handleSSEClose,
        onStart: handleWorkflowStart,
        onDone: handleWorkflowDone,
      })

      // 启动连接
      await sseService.connect()
    } catch (error) {
      console.error('启动工作流执行失败:', error)
      message.error(`启动工作流执行失败`)
      stopExecution()
    }
  }

  /**
   * 停止工作流执行
   */
  const stopExecution = () => {
    isRunning.value = false

    if (sseService) {
      sseService.disconnect()
      sseService = null
    }

    // 更新执行指标
    if (executionMetrics.startTime) {
      executionMetrics.endTime = Date.now()
      executionMetrics.totalDuration = executionMetrics.endTime - executionMetrics.startTime
    }
  }

  /**
   * 初始化执行状态
   */
  const initializeExecution = (nodes: any[]) => {
    // 清理之前的状态
    _nodeStates.value = new Map()
    _executionResults.value = new Map()
    nodeExecutionOrder.value = []
    errors.length = 0

    // 准备执行状态，但不设置为运行中（等待START事件）
    isRunning.value = false
    isCompleted.value = false
    executionId.value = `exec_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // 初始化节点状态
    nodes.forEach((node) => {
      _nodeStates.value.set(node.id, {
        nodeId: node.id,
        status: 'idle',
      })
    })

    // 初始化执行指标
    Object.assign(executionMetrics, {
      totalNodes: nodes.length,
      completedNodes: 0,
      startTime: Date.now(),
      endTime: undefined,
      totalDuration: undefined,
      averageNodeTime: undefined,
    })
  }

  /**
   * 处理SSE连接打开
   */
  const handleSSEOpen = () => {
    console.log('工作流执行连接已建立')
  }

  /**
   * 处理工作流开始执行事件
   */
  const handleWorkflowStart = () => {
    message.success('开始执行工作流')
    isRunning.value = true
  }

  /**
   * 处理工作流执行完成事件
   */
  const handleWorkflowDone = () => {
    message.success('工作流执行完成')
    isCompleted.value = true
    stopExecution()
  }

  /**
   * 处理SSE消息
   *
   * 后端发送消息说明：
   * 1. chunk消息：LLM实时输出时发送，用于流式显示 {"nodeId": "node_1", "chunk": "文本片段"}
   * 2. outputs消息：节点执行完成时发送，直接表示完成 {"nodeId": "node_5", "outputs": "[{...}]"}
   * 3. status消息：仅在LLM流式输出结束时发送，用于停止"生成中..." {"nodeId": "node_1", "status": "completed"}
   */
  const handleSSEMessage = (
    data: SSENodeOutputMessage | SSEChunkMessage | SSENodeCompleteMessage,
    event?: string,
  ) => {
    if ('outputs' in data) {
      // 节点完整输出消息 - 直接表示节点执行完成
      handleNodeOutputMessage(data)
    } else if ('chunk' in data) {
      // LLM流式输出消息 - 实时显示生成内容
      handleChunkMessage(data)
    } else if ('status' in data && data.status) {
      // 节点完成消息 - 主要用于停止LLM的"生成中..."状态
      handleNodeCompleteMessage(data)
    }
  }

  /**
   * 处理节点完整输出消息
   */
  const handleNodeOutputMessage = (data: SSENodeOutputMessage) => {
    const { nodeId, outputs, nodeName } = data

    // 记录节点执行顺序
    if (!nodeExecutionOrder.value.includes(nodeId)) {
      nodeExecutionOrder.value.push(nodeId)
    }

    // 更新节点状态 - outputs消息直接表示节点执行完成
    let nodeState = _nodeStates.value.get(nodeId)
    if (!nodeState) {
      // 如果节点状态不存在，创建一个已完成的状态
      nodeState = {
        nodeId,
        nodeName,
        status: 'success',
        startTime: Date.now() - 1000, // 给一个默认的开始时间
        endTime: Date.now(),
      }
    } else {
      // 更新现有状态为完成
      nodeState.status = 'success'
      nodeState.endTime = Date.now()
    }

    // 强制更新nodeStates来触发响应式和UI更新
    const newNodeStates = new Map(_nodeStates.value)
    newNodeStates.set(nodeId, { ...nodeState })
    _nodeStates.value = newNodeStates

    const executionTime = nodeState.endTime! - (nodeState.startTime || nodeState.endTime! - 1000)

    // 更新执行结果
    const result: NodeExecutionResult = {
      nodeId,
      nodeName,
      outputs: typeof outputs === 'string' ? JSON.parse(outputs) : outputs,
      executionTime,
    }

    // 强制触发响应式更新
    const newResults = new Map(_executionResults.value)
    newResults.set(nodeId, result)
    _executionResults.value = newResults

    // 更新完成计数
    executionMetrics.completedNodes++

    // 显示结果面板
    if (!resultPanelVisible.value) {
      resultPanelVisible.value = true
    }

    // 检查是否全部完成
    checkExecutionCompletion()
  }

  /**
   * 处理LLM流式输出消息
   */
  const handleChunkMessage = (data: SSEChunkMessage) => {
    const { nodeId, chunk, nodeName } = data

    // 记录节点执行顺序
    if (!nodeExecutionOrder.value.includes(nodeId)) {
      nodeExecutionOrder.value.push(nodeId)
    }

    // 确保节点状态存在
    let nodeState = _nodeStates.value.get(nodeId)
    if (!nodeState) {
      nodeState = {
        nodeId,
        nodeName,
        status: 'running',
        startTime: Date.now(),
      }
      const newNodeStates = new Map(_nodeStates.value)
      newNodeStates.set(nodeId, nodeState)
      _nodeStates.value = newNodeStates
    } else if (nodeState.status === 'idle') {
      nodeState.status = 'running'
      nodeState.startTime = Date.now()
      // 强制更新nodeStates来触发响应式
      const newNodeStates = new Map(_nodeStates.value)
      newNodeStates.set(nodeId, { ...nodeState })
      _nodeStates.value = newNodeStates
    }

    // 更新执行结果
    let result = _executionResults.value.get(nodeId)
    if (!result) {
      result = {
        nodeId,
        nodeName,
        chunks: [],
        fullContent: '',
      }
    }

    // 添加chunk - 关键是确保响应式更新
    result.chunks!.push(chunk)
    result.fullContent = (result.fullContent || '') + chunk

    // 强制触发Vue响应式更新 - 创建新的Map实例
    const newResults = new Map(_executionResults.value)
    newResults.set(nodeId, { ...result })
    _executionResults.value = newResults

    // 显示结果面板
    if (!resultPanelVisible.value) {
      resultPanelVisible.value = true
    }
  }

  /**
   * 处理节点完成消息 - 主要用于LLM流式输出完成
   */
  const handleNodeCompleteMessage = (data: SSENodeCompleteMessage) => {
    const { nodeId, status, message } = data

    // 更新节点状态 - 主要用于停止LLM的"生成中..."状态
    const nodeState = _nodeStates.value.get(nodeId)
    if (nodeState) {
      nodeState.status = status === 'completed' ? 'success' : 'error'
      nodeState.endTime = Date.now()

      if (status === 'error' && message) {
        nodeState.error = message
      }

      // 强制更新nodeStates来触发响应式
      const newNodeStates = new Map(_nodeStates.value)
      newNodeStates.set(nodeId, { ...nodeState })
      _nodeStates.value = newNodeStates

      // 检查是否全部完成
      checkExecutionCompletion()
    }
  }

  /**
   * 处理SSE错误
   */
  const handleSSEError = (error: any) => {
    console.error('工作流执行连接错误:', error)

    const executionError: ExecutionError = {
      nodeId: 'system',
      errorType: 'network',
      message: error.message || '连接错误',
      timestamp: Date.now(),
      details: error,
    }

    errors.push(executionError)
    message.error('工作流执行连接异常')

    stopExecution()
  }

  /**
   * 处理SSE关闭
   */
  const handleSSEClose = () => {
    console.log('工作流执行连接已关闭')

    if (isRunning.value) {
      // 如果还在运行状态，说明是异常关闭（未收到DONE事件）
      message.warning('工作流执行连接意外关闭')
      stopExecution()
    }
  }

  /**
   * 检查执行是否完成
   */
  const checkExecutionCompletion = () => {
    if (executionMetrics.completedNodes >= executionMetrics.totalNodes) {
      // 执行完成
      isRunning.value = false
      executionMetrics.endTime = Date.now()
      executionMetrics.totalDuration = executionMetrics.endTime - executionMetrics.startTime
      executionMetrics.averageNodeTime =
        executionMetrics.totalDuration / executionMetrics.totalNodes

      message.success(`工作流执行完成！耗时 ${Math.round(executionMetrics.totalDuration / 1000)}秒`)

      if (sseService) {
        sseService.disconnect()
        sseService = null
      }
    }
  }

  /**
   * 切换结果面板显示
   */
  const toggleResultPanel = () => {
    resultPanelVisible.value = !resultPanelVisible.value
  }

  /**
   * 选择节点结果
   */
  const selectNodeResult = (nodeId: string) => {
    selectedResultNodeId.value = nodeId
  }

  /**
   * 清理执行状态
   */
  const clearExecution = () => {
    stopExecution()
    _nodeStates.value = new Map()
    _executionResults.value = new Map()
    nodeExecutionOrder.value = []
    errors.length = 0
    isCompleted.value = false
    resultPanelVisible.value = false
    selectedResultNodeId.value = null
    executionId.value = null

    Object.assign(executionMetrics, {
      totalNodes: 0,
      completedNodes: 0,
      startTime: 0,
      endTime: undefined,
      totalDuration: undefined,
      averageNodeTime: undefined,
    })
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stopExecution()
  })

  return {
    // 状态
    workflowExecutionState,
    isRunning,
    executionId,
    nodeStates,
    executionResults,
    nodeExecutionOrder,
    errors,
    resultPanelVisible,
    selectedResultNodeId,
    executionMetrics,

    // 计算属性
    hasErrors,
    isCompleted,

    // 方法
    executeWorkflow,
    stopExecution,
    toggleResultPanel,
    selectNodeResult,
    clearExecution,
  }
}
