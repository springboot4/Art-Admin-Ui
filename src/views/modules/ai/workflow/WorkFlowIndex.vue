<template>
  <div class="workflow-editor-container">
    <!-- 工具栏 -->
    <div class="workflow-toolbar">
      <div class="toolbar-left">
        <a-input
          v-model:value="workflowName"
          class="workflow-name-input"
          placeholder="输入工作流名称..."
        />
        <!-- 统一的状态展示 -->
        <div class="workflow-status">
          <div :class="['modern-status-tag', `status-${getUnifiedStatus}`]">
            <!-- 自动保存状态图标 -->
            <span v-if="autoSaveStatus === 'saving'" class="status-icon icon-loading">⏳</span>
            <span v-else-if="autoSaveStatus === 'error'" class="status-icon icon-error">⚠️</span>
            <span v-else-if="autoSaveStatus === 'pending'" class="status-icon icon-pending">●</span>
            <!-- 普通状态点 -->
            <div v-else class="status-dot"></div>
            <span class="status-text">{{ getUnifiedStatusText }}</span>
          </div>
        </div>

        <!-- 版本信息 -->
        <div v-if="workflowVersion" class="workflow-version">
          <div class="version-tag">
            <span class="version-icon">📋</span>
            <span class="version-text">{{ formatVersionText(workflowVersion) }}</span>
          </div>
        </div>
      </div>

      <div class="toolbar-right">
        <a-space :size="12">
          <a-button @click="addNode">
            <template #icon>
              <PlusOutlined />
            </template>
            添加节点
          </a-button>
          <a-button @click="clearWorkflow">
            <template #icon>
              <ClearOutlined />
            </template>
            清空
          </a-button>

          <a-divider type="vertical" />

          <a-button @click="importWorkflow">
            <template #icon>
              <ImportOutlined />
            </template>
            导入
          </a-button>
          <a-button @click="exportWorkflow">
            <template #icon>
              <ExportOutlined />
            </template>
            导出
          </a-button>

          <a-divider type="vertical" />

          <a-button :loading="executing" class="btn-run" type="primary" @click="executeWorkflow">
            <template #icon>
              <PlayCircleOutlined />
            </template>
            运行
          </a-button>
          <a-button
            :loading="publishing"
            class="btn-publish"
            type="primary"
            @click="publishWorkflow"
          >
            <template #icon>
              <CloudUploadOutlined />
            </template>
            发布
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="workflow-content">
      <!-- 应用模式校验失败提示 -->
      <div v-if="!appModeValidated && appModeValidationError" class="app-mode-error-overlay">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h3 class="error-title">应用模式不匹配</h3>
          <p class="error-message">{{ appModeValidationError }}</p>
          <a-button type="primary" @click="$router.back()">返回应用列表</a-button>
        </div>
      </div>

      <!-- VueFlow 画布 - 全屏显示 -->
      <div v-if="appModeValidated" class="workflow-canvas" @click="handleCanvasClick">
        <VueFlow
          v-model:edges="displayEdges"
          v-model:nodes="nodes"
          :default-zoom="0.5"
          :is-valid-connection="isValidConnection"
          :max-zoom="0.8"
          :min-zoom="0.1"
          :node-types="nodeTypes"
          class="vue-flow-container"
          fit-view-on-init
          @connect="onConnect"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @node-click="onNodeClick"
          @node-double-click="onNodeDoubleClick"
          @edge-click="onEdgeClick"
        >
          <template #node-customNode="props">
            <CustomNode
              v-bind="props"
              @copy="handleCopyNode"
              @dblclick="() => onNodeDoubleClick(null, props)"
              @delete="handleDeleteNode"
              @edit="handleEditNode"
            />
          </template>

          <Controls />
        </VueFlow>

        <!-- 添加节点悬浮菜单 -->
        <div
          v-if="showAddNodeMenu"
          :style="{ left: addNodeMenuPosition.x + 'px', top: addNodeMenuPosition.y + 'px' }"
          class="add-node-menu"
          @click.stop
        >
          <div class="add-node-menu-content">
            <div class="add-node-title">选择节点类型</div>
            <div class="add-node-list">
              <div
                v-for="nodeType in availableNodeTypes"
                :key="nodeType.type"
                class="add-node-item"
                @click="addNodeFromMenu(nodeType)"
              >
                <span class="node-icon">{{ nodeType.icon }}</span>
                <span class="node-label">{{ nodeType.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 节点配置面板 -->
    <NodeConfigPanel
      :edges="edges"
      :node="selectedNode"
      :nodes="nodes"
      :visible="configPanelVisible"
      @close="handleConfigPanelClose"
      @save="handleConfigSave"
    />

    <!-- 导入文件输入 -->
    <input
      ref="fileInput"
      accept=".json"
      style="display: none"
      type="file"
      @change="handleFileImport"
    />

    <!-- 工作流执行结果面板 - 仅在工作流模式下显示 -->
    <WorkflowResultPanel
      v-if="appMode === 'workflow'"
      :completed-nodes="executionMetrics.completedNodes"
      :errors="executionErrors"
      :execution-id="executionId"
      :execution-results="executionResults"
      :execution-time="executionMetrics.totalDuration"
      :is-completed="executionCompleted"
      :is-running="executionRunning"
      :node-execution-order="nodeExecutionOrder"
      :node-states="nodeStates"
      :selected-node-id="selectedResultNodeId"
      :total-nodes="executionMetrics.totalNodes"
      :visible="resultPanelVisible"
      @close="toggleResultPanel"
      @restart="handleRestartExecution"
      @stop="handleStopExecution"
      @select-node="selectNodeResult"
      @clear-results="handleClearResults"
    />

    <!-- 对话流预览面板 - 仅在对话流模式下显示 -->
    <ChatPreviewPanel
      v-if="appMode === 'chatflow'"
      :initial-inputs="chatInitialInputs"
      :visible="chatPreviewVisible"
      :workflow-id="currentWorkflowId"
      @close="closeChatPreview"
    />

    <!-- 开始节点输入变量模态框 -->
    <StartNodeInputModal
      v-model:open="startNodeInputModalVisible"
      :executing="executing"
      :user-inputs="getStartNodeUserInputs()"
      @cancel="handleStartNodeInputCancel"
      @run="handleStartNodeInputRun"
    />
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { applyEdgeChanges, applyNodeChanges, VueFlow } from '@vue-flow/core'
  import { Controls } from '@vue-flow/controls'
  import { Button as AButton, Input as AInput, message, Space as ASpace } from 'ant-design-vue'
  import {
    ClearOutlined,
    CloudUploadOutlined,
    ExportOutlined,
    ImportOutlined,
    PlayCircleOutlined,
    PlusOutlined,
  } from '@ant-design/icons-vue'
  import CustomNode from './components/CustomNode.vue'
  import NodeConfigPanel from './components/NodeConfigPanel.vue'
  import WorkflowResultPanel from './components/WorkflowResultPanel.vue'
  import ChatPreviewPanel from './components/ChatPreviewPanel.vue'
  import StartNodeInputModal from '/@/components/Workflow/StartNodeInputModal.vue'
  import { draft, findByAppId, publish } from '/@/api/ai/workflow/AiWorkflowsIndex'
  import { useWorkflowExecution } from './utils'
  import {
    type AppMode,
    filterNodeTypesByAppMode,
    validateAppMode,
  } from '/@/utils/workflowNodeFilter'
  import { useWorkflowRuntimeStyles } from './composables/useWorkflowRuntimeStyles'
  import { useAutoSave } from './composables/useAutoSave'

  import '@vue-flow/core/dist/style.css'
  import '@vue-flow/core/dist/theme-default.css'
  import '@vue-flow/controls/dist/style.css'

  const route = useRoute()

  // 路由参数
  const appId = ref(route.query.appId)
  const appMode = ref<AppMode>((route.query.appMode as AppMode) || 'workflow')
  const currentWorkflowId = ref(null)

  // 后端返回的应用模式，用于校验
  const backendAppMode = ref<string | undefined>(undefined)

  // 应用模式校验状态
  const appModeValidated = ref(false)
  const appModeValidationError = ref<string | undefined>(undefined)

  // 所有节点类型定义
  const allNodeTypes = [
    {
      type: 'start',
      label: '开始节点',
      icon: '🚀',
      color: '#52c41a',
      description: '工作流的起始点',
      category: 'trigger',
    },
    {
      type: 'llm',
      label: '大语言模型',
      icon: '🤖',
      color: '#1890ff',
      description: '大模型节点',
      category: 'llm',
    },
    {
      type: 'llm_answer',
      label: '大模型应答',
      icon: '💬',
      color: '#13c2c2',
      description: '用于生成应答内容的大模型节点',
      category: 'llm',
    },
    {
      type: 'knowledge',
      label: '知识检索',
      icon: '📚',
      color: '#722ed1',
      description: '从向量数据库检索相关知识',
      category: 'knowledge',
    },
    {
      type: 'condition',
      label: '条件判断',
      icon: '🔀',
      color: '#faad14',
      description: '根据条件分支执行不同逻辑',
      category: 'logic',
      multiOutput: true,
    },
    {
      type: 'code',
      label: '代码执行',
      icon: '💻',
      color: '#13c2c2',
      description: '执行代码',
      category: 'logic',
    },
    {
      type: 'http',
      label: 'HTTP请求',
      icon: '🌐',
      color: '#fa8c16',
      description: '调用外部API接口',
      category: 'integration',
    },
    {
      type: 'output',
      label: '输出节点',
      icon: '📤',
      color: '#f5222d',
      description: '工作流的最终输出',
      category: 'output',
    },
  ]

  // 根据应用模式过滤可用的节点类型
  const availableNodeTypes = ref(filterNodeTypesByAppMode(allNodeTypes, appMode.value))

  // 节点类型映射
  const nodeTypes = {
    customNode: CustomNode,
  }

  // ==================== 运行时样式管理 ====================
  // 引入运行时样式管理（UI状态，不持久化）
  const {
    setNodeStatus,
    getNodeStatus,
    setNodeStates,
    updateEdgeStylesByNodeStatus,
    computeDisplayEdges,
    startRuntimeMode,
    endRuntimeMode,
    clearAllRuntimeStates,
    resetAllNodesToIdle,
    resetAllEdgesToDefault,
  } = useWorkflowRuntimeStyles()

  // ==================== 数据状态（持久化） ====================
  // 初始化一个开始节点
  const nodes = ref([
    {
      id: 'start-node',
      type: 'customNode',
      position: { x: 400, y: 200 },
      label: '开始节点',
      data: {
        nodeType: 'start',
        icon: '🚀',
        color: '#52c41a',
        description: '工作流的起始点',
        config: {
          userInputs: [],
        },
        status: 'idle',
      },
    },
  ])

  const edges = ref([])

  const displayEdges = computed({
    get: () => computeDisplayEdges(edges.value).value,
    set: (newEdges) => {
      edges.value = newEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
      }))
    },
  })

  const workflowName = ref('新建AI工作流')
  const saving = ref(false)
  const executing = ref(false)
  const publishing = ref(false)
  const workflowStatus = ref('draft')
  const workflowVersion = ref(null)
  const fileInput = ref()

  // 配置面板相关
  const configPanelVisible = ref(false)
  const selectedNode = ref(null)

  // 添加节点菜单相关
  const showAddNodeMenu = ref(false)
  const addNodeMenuPosition = ref({ x: 0, y: 0 })
  const addNodeFromNodeId = ref(null)

  // 开始节点输入模态框相关
  const startNodeInputModalVisible = ref(false)
  const pendingExecutionData = ref(null)

  // 对话预览相关状态
  const chatPreviewVisible = ref(false)
  const chatInitialInputs = ref({})

  // 工作流执行逻辑
  const {
    isRunning: executionRunning,
    executionId,
    nodeStates,
    executionResults,
    nodeExecutionOrder,
    errors: executionErrors,
    resultPanelVisible,
    selectedResultNodeId,
    executionMetrics,
    hasErrors: executionHasErrors,
    isCompleted: executionCompleted,
    executeWorkflow: startWorkflowExecution,
    stopExecution,
    toggleResultPanel,
    selectNodeResult,
    clearExecution,
  } = useWorkflowExecution()

  // ==================== 自动保存逻辑 ====================
  const {
    status: autoSaveStatus,
    statusText: autoSaveStatusText,
    isSaving: autoSaving,
    hasUnsavedChanges,
    pause: pauseAutoSave,
    resume: resumeAutoSave,
    setupAutoSave,
  } = useAutoSave({
    debounceDelay: 5000, // 5秒防抖
    maxWaitTime: 30000, // 最长30秒
    enabled: true,
    maxRetries: 3,
    retryDelay: 2000,
    saveOnUnmount: true,
  })

  // 节点 ID 生成器
  let nodeId = 1
  const generateNodeId = () => `node_${nodeId++}`

  // 更新节点ID计数器，确保新生成的ID不与现有节点冲突
  const updateNodeIdCounter = (existingNodes) => {
    if (!existingNodes || existingNodes.length === 0) return

    // 找出所有现有节点中符合 node_数字 格式的最大数字
    let maxId = 0
    existingNodes.forEach((node) => {
      const match = node.id.match(/^node_(\d+)$/)
      if (match) {
        const id = parseInt(match[1], 10)
        if (id > maxId) {
          maxId = id
        }
      }
    })

    // 将计数器设置为最大ID + 1
    nodeId = maxId + 1
  }

  // 按照路由参数加载工作流数据
  const loadWorkflowByAppId = async () => {
    if (!appId.value) {
      return
    }

    try {
      const response = await findByAppId(appId.value)
      if (response && response.graph) {
        // 保存后端返回的应用模式
        backendAppMode.value = response.type

        // 校验应用模式
        const validation = validateAppMode(appMode.value, backendAppMode.value)

        if (!validation.valid) {
          // 校验失败，设置错误状态
          appModeValidationError.value = validation.message
          appModeValidated.value = false
          message.error(validation.message || '应用模式校验失败')

          // 不加载流程图数据
          return
        }

        // 校验通过
        appModeValidated.value = true
        appModeValidationError.value = undefined

        // 更新可用节点类型（使用后端返回的模式或路由模式）
        const currentMode = (backendAppMode.value || appMode.value) as AppMode
        availableNodeTypes.value = filterNodeTypesByAppMode(allNodeTypes, currentMode)

        // 保存工作流ID和版本信息用于后续更新
        currentWorkflowId.value = response.id
        workflowVersion.value = response.version

        // 使用加载流程图的逻辑加载数据（不清空ID）
        const workflowData = JSON.parse(response.graph)
        await loadWorkflowData(workflowData, false)
        workflowName.value = workflowData.name || '已存在的工作流'

        // 根据版本设置状态
        workflowStatus.value = response.version === 'draft' ? 'draft' : 'published'

        message.success('工作流数据加载成功')
      } else {
        workflowVersion.value = null
        // 没有数据时也标记为已校验
        appModeValidated.value = true
        appModeValidationError.value = undefined
      }
    } catch (error) {
      console.error('加载工作流数据失败:', error)
      message.warning('加载工作流数据失败，使用默认流程图')
      // 加载失败时也标记为已校验，允许继续操作
      appModeValidated.value = true
      appModeValidationError.value = undefined
    }
  }

  // 加载工作流数据的通用方法
  const loadWorkflowData = async (workflowData, isImporting = true) => {
    const importedNodes = workflowData.nodes || []
    const importedEdges = workflowData.edges || []

    // 创建一个节点ID到节点数据的映射，方便快速查找
    const nodeMap = new Map(importedNodes.map((node) => [node.id, node]))

    // 更新节点ID计数器，避免重复ID
    updateNodeIdCounter(importedNodes)

    // 1. 先加载节点
    nodes.value = importedNodes
    // 2. 清空旧的边，防止重复
    edges.value = []

    // 3. 等待Vue完成节点DOM的渲染
    await nextTick()

    // 4. 清理和验证边数据
    const validEdges = importedEdges
      .filter((edge) => {
        const sourceExists = nodeMap.has(edge.source)
        const targetExists = nodeMap.has(edge.target)
        if (!sourceExists || !targetExists) {
          console.warn('过滤无效的边，节点不存在:', edge)
          return false
        }
        return true
      })
      .map((edge) => {
        return {
          id: edge.id || `edge_${Date.now()}_${Math.random()}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type || 'default',
        }
      })

    // 5. 加载有效的边和其他数据
    edges.value = validEdges
    workflowName.value = workflowData.name || '导入的工作流'

    // 根据是否为导入操作来决定是否清空ID和版本信息
    if (isImporting) {
      // 对于导入的工作流，设置为草稿状态，清空工作流ID和版本信息
      workflowStatus.value = 'draft'
      currentWorkflowId.value = null // 导入新工作流时清空之前的ID
      workflowVersion.value = null
    }
  }

  // 组件挂载时加载数据
  onMounted(async () => {
    await loadWorkflowByAppId()

    // 加载完成后设置自动保存
    // 只有在有 appId 的情况下才启用自动保存
    if (appId.value) {
      setupAutoSave(
        [nodes, edges], // 监听节点和边的变化
        // 获取要保存的数据
        () => ({
          nodes: nodes.value,
          edges: edges.value,
          name: workflowName.value,
        }),
        // 执行保存的函数
        async () => {
          try {
            // 清理节点数据，只保留必要的属性
            const cleanNodes = nodes.value.map((node) => ({
              id: node.id,
              type: node.type,
              position: node.position,
              label: node.label,
              data: node.data,
            }))

            const cleanEdges = edges.value.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              type: edge.type || 'default',
            }))

            const workflowData = {
              name: workflowName.value,
              nodes: cleanNodes,
              edges: cleanEdges,
              exportTime: new Date().toISOString(),
            }

            // 构建保存数据
            const saveData = {
              name: workflowName.value,
              appId: appId.value,
              version: 'draft',
              graph: JSON.stringify(workflowData),
              type: appMode.value,
            }

            const response = await draft(saveData)

            if (response === true || response) {
              // 保存成功，更新工作流信息
              try {
                const workflowInfo = await findByAppId(appId.value)
                if (workflowInfo && workflowInfo.id) {
                  currentWorkflowId.value = workflowInfo.id
                  workflowVersion.value = workflowInfo.version || 'draft'
                }
              } catch (error) {
                console.error('[AutoSave] 获取工作流信息失败:', error)
              }
              workflowStatus.value = 'saved'
              return true
            } else {
              return false
            }
          } catch (error) {
            console.error('[AutoSave] 自动保存失败:', error)
            return false
          }
        },
      )
    }
  })

  // 创建节点的统一方法
  const createNode = (nodeType, position) => {
    return {
      id: generateNodeId(),
      type: 'customNode',
      position,
      label: nodeType.label,
      data: {
        nodeType: nodeType.type,
        icon: nodeType.icon,
        color: nodeType.color,
        description: nodeType.description,
        config: getDefaultConfig(nodeType.type),
        status: 'idle',
        multiOutput: nodeType.multiOutput || false,
      },
    }
  }

  // 获取默认配置
  const createLLMDefaultConfig = () => ({
    model: '',
    temperature: 0.7,
    maxTokens: 1024,
    systemPrompt: '你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。',
    userMessage: '',
  })

  const getDefaultConfig = (nodeType) => {
    const defaultConfigs = {
      start: {
        userInputs: [], // 用户输入变量配置
      },
      llm: createLLMDefaultConfig(),
      llm_answer: createLLMDefaultConfig(),
      http: {
        method: 'GET',
        url: '',
        headers: '{}',
        body: '',
      },
      condition: {
        conditions: [
          { id: 'condition1', expression: '', label: '条件1', description: '' },
          { id: 'else', expression: 'else', label: '其他', description: '默认分支' },
        ],
      },
      code: {
        language: 'javascript',
        code: "function add(a, b) { return a + b; } add('fxz', ' I love you.');",
      },
      knowledge: {
        query: '',
        topK: 5,
        threshold: 0.7,
      },
      output: {
        outputContent: '工作流执行完成',
        outputFormat: 'text',
      },
    }
    return defaultConfigs[nodeType] || {}
  }

  // VueFlow 事件处理
  const onNodesChange = (changes) => {
    nodes.value = applyNodeChanges(changes, nodes.value)
  }

  const onEdgesChange = (changes) => {
    displayEdges.value = applyEdgeChanges(changes, displayEdges.value)
  }

  const onConnect = (params) => {
    const newEdge = {
      id: `edge_${Date.now()}`,
      ...params,
      type: 'default',
    }

    edges.value.push(newEdge)
  }

  const onNodeClick = (_event, _node) => {}

  const onNodeDoubleClick = (event, node) => {
    // VueFlow可能传递的参数格式不同，尝试从event中获取node
    const targetNode = node || (event && event.node) || event

    if (targetNode) {
      selectedNode.value = targetNode
      configPanelVisible.value = true
    }
  }

  const onEdgeClick = (_event, _edge) => {}

  // 从菜单添加节点 - 添加到画布中央，不自动连接
  const addNodeFromMenu = (nodeType) => {
    // 计算画布中央位置
    const canvas = document.querySelector('.vue-flow-container')
    const canvasRect = canvas?.getBoundingClientRect()

    const centerPosition = {
      x: canvasRect ? canvasRect.width / 2 - 100 : 400,
      y: canvasRect ? canvasRect.height / 2 - 60 : 300,
    }

    const newNode = createNode(nodeType, centerPosition)
    nodes.value.push(newNode)

    // 关闭菜单
    showAddNodeMenu.value = false
  }

  // 节点操作处理
  const handleDeleteNode = (nodeId) => {
    nodes.value = nodes.value.filter((node) => node.id !== nodeId)
    edges.value = edges.value.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
  }

  const handleEditNode = (nodeId) => {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (node) {
      selectedNode.value = node
      configPanelVisible.value = true
    }
  }

  const handleCopyNode = (nodeId) => {
    const originalNode = nodes.value.find((n) => n.id === nodeId)
    if (!originalNode) return

    const newNode = {
      ...originalNode,
      id: generateNodeId(),
      position: {
        x: originalNode.position.x + 50,
        y: originalNode.position.y + 50,
      },
      label: `${originalNode.label} 副本`,
    }

    nodes.value.push(newNode)
  }

  // 配置面板相关
  const handleConfigPanelClose = () => {
    configPanelVisible.value = false
    selectedNode.value = null
  }

  const handleConfigSave = (updatedNode) => {
    const index = nodes.value.findIndex((n) => n.id === updatedNode.id)
    if (index !== -1) {
      // 使用深拷贝确保响应式更新
      nodes.value[index] = JSON.parse(JSON.stringify(updatedNode))

      // 强制触发响应式更新
      nodes.value = [...nodes.value]
    }
    configPanelVisible.value = false
    selectedNode.value = null
  }

  // 工作流操作
  const saveWorkflow = async () => {
    saving.value = true
    try {
      // 清理节点数据，只保留必要的属性
      const cleanNodes = nodes.value.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        label: node.label,
        data: node.data,
      }))

      const cleanEdges = edges.value.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
      }))

      const workflowData = {
        name: workflowName.value,
        nodes: cleanNodes,
        edges: cleanEdges,
        exportTime: new Date().toISOString(),
      }

      // 构建保存数据
      const saveData = {
        name: workflowName.value,
        appId: appId.value,
        version: 'draft',
        graph: JSON.stringify(workflowData),
        type: appMode.value,
      }

      const response = await draft(saveData)

      if (response === true || response) {
        // 保存成功，通过findByAppId获取工作流信息
        try {
          const workflowInfo = await findByAppId(appId.value)

          if (workflowInfo && workflowInfo.id) {
            currentWorkflowId.value = workflowInfo.id
            workflowVersion.value = workflowInfo.version || 'draft'
            message.success('工作流保存成功')
          } else {
            console.warn('获取工作流信息失败:', workflowInfo)
            message.success('工作流保存成功，但无法获取工作流ID')
          }
        } catch (error) {
          console.error('获取工作流信息失败:', error)
          message.success('工作流保存成功，但无法获取工作流ID')
        }

        workflowStatus.value = 'saved'
      } else {
        console.warn('保存失败，响应格式:', response)
        message.error('保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败: ' + (error.message || '未知错误'))
    } finally {
      saving.value = false
    }
  }

  const clearWorkflow = () => {
    nodes.value = [
      {
        id: 'start-node',
        type: 'customNode',
        position: { x: 400, y: 200 },
        label: '开始节点',
        data: {
          nodeType: 'start',
          icon: '🚀',
          color: '#52c41a',
          description: '工作流的起始点',
          config: {
            userInputs: [],
          },
          status: 'idle',
        },
      },
    ]
    edges.value = []
    workflowStatus.value = 'draft'
    workflowVersion.value = null
    currentWorkflowId.value = null
    message.success('画布已清空')
  }

  const exportWorkflow = () => {
    // 清理节点数据，只保留必要的属性
    const cleanNodes = nodes.value.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      label: node.label,
      data: node.data,
    }))

    // 清理边数据，只保留必要的连接信息
    const cleanEdges = edges.value.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type || 'default',
    }))

    const workflowData = {
      name: workflowName.value,
      nodes: cleanNodes,
      edges: cleanEdges,
      status: workflowStatus.value,
      exportTime: new Date().toISOString(),
      version: '1.0',
    }

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.value || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('工作流已导出')
  }

  const importWorkflow = () => {
    fileInput.value?.click()
  }

  const handleFileImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const workflowData = JSON.parse(e.target.result)
        await loadWorkflowData(workflowData)
        message.success('工作流已导入')
      } catch (error) {
        console.error('导入工作流失败:', error)
        message.error('导入失败，文件格式不正确或数据已损坏')
      }
    }
    reader.readAsText(file)

    // 清空文件输入框
    event.target.value = ''
  }

  // 获取开始节点的用户输入配置
  const getStartNodeUserInputs = () => {
    const startNode = nodes.value.find((node) => node.data.nodeType === 'start')

    if (!startNode || !startNode.data.config || !startNode.data.config.userInputs) {
      return []
    }

    return startNode.data.config.userInputs || []
  }

  const executeWorkflow = async () => {
    // 检查是否有有效的工作流ID
    if (!currentWorkflowId.value) {
      if (workflowStatus.value === 'draft') {
        message.error('请先保存工作流后再执行')
      } else {
        message.error('请重新保存工作流后再执行')
      }
      return
    }

    // 检查是否有节点
    if (!nodes.value || nodes.value.length === 0) {
      message.error('工作流中没有节点，无法执行')
      return
    }

    // 对话流模式：直接显示对话预览面板
    if (appMode.value === 'chatflow') {
      // 获取开始节点的用户输入配置
      const userInputs = getStartNodeUserInputs()

      // 如果开始节点有用户输入变量，先显示输入表单
      if (userInputs && userInputs.length > 0) {
        pendingExecutionData.value = {
          workflowId: currentWorkflowId.value,
          nodes: nodes.value,
          isChatflow: true,
        }

        startNodeInputModalVisible.value = true

        // 使用nextTick确保响应式更新
        await nextTick()

        return
      }

      // 没有用户输入，直接打开对话预览
      chatInitialInputs.value = {}
      chatPreviewVisible.value = true
      return
    }

    // 工作流
    // 获取开始节点的用户输入配置
    const userInputs = getStartNodeUserInputs()

    // 如果开始节点有用户输入变量，显示输入表单
    if (userInputs && userInputs.length > 0) {
      pendingExecutionData.value = {
        workflowId: currentWorkflowId.value,
        nodes: nodes.value,
      }

      startNodeInputModalVisible.value = true

      // 使用nextTick确保响应式更新
      await nextTick()

      return
    }

    // 没有用户输入，直接执行
    await executeWorkflowWithInputs({})
  }

  // 带输入参数执行工作流
  const executeWorkflowWithInputs = async (inputs) => {
    const workflowId = pendingExecutionData.value?.workflowId || currentWorkflowId.value
    const workflowNodes = pendingExecutionData.value?.nodes || nodes.value

    if (!workflowId || !workflowNodes) {
      message.error('工作流信息不完整，无法执行')
      return
    }

    executing.value = true

    try {
      startRuntimeMode()

      // 重置所有节点的UI状态
      workflowNodes.forEach((node) => {
        node.data.status = 'idle'
      })

      // 启动真正的工作流执行，传入用户输入的参数
      await startWorkflowExecution(workflowId, workflowNodes, inputs)
    } catch (error) {
      console.error('工作流执行失败:', error)
      workflowStatus.value = 'error'
      message.error(`工作流执行失败: ${error.message || '未知错误'}`)
      executing.value = false
    } finally {
      // 清理待执行数据
      pendingExecutionData.value = null
    }
  }

  // 处理开始节点输入模态框的运行事件
  const handleStartNodeInputRun = (inputs) => {
    startNodeInputModalVisible.value = false

    // 对话流模式：保存初始输入并打开对话预览
    if (pendingExecutionData.value?.isChatflow) {
      chatInitialInputs.value = inputs
      chatPreviewVisible.value = true
      pendingExecutionData.value = null
      return
    }

    // 工作流模式：执行工作流
    executeWorkflowWithInputs(inputs)
  }

  // 处理开始节点输入模态框的取消事件
  const handleStartNodeInputCancel = () => {
    startNodeInputModalVisible.value = false
    pendingExecutionData.value = null
  }

  // 关闭对话预览
  const closeChatPreview = () => {
    chatPreviewVisible.value = false
    chatInitialInputs.value = {}
  }

  // 监听执行状态变化，同步UI状态
  watch(executionRunning, (running) => {
    executing.value = running
    if (running) {
      workflowStatus.value = 'executing'
      // 执行时暂停自动保存
      pauseAutoSave()
    } else {
      // 执行完成后恢复自动保存
      resumeAutoSave()
    }
  })

  watch(executionCompleted, (completed) => {
    if (completed) {
      workflowStatus.value = 'saved'
      executing.value = false
    }
  })

  watch(executionHasErrors, (hasErrors) => {
    if (hasErrors) {
      workflowStatus.value = 'error'
      executing.value = false
    }
  })

  // ==================== 运行时状态监听器（重构版） ====================
  // 监听节点状态变化，使用运行时样式管理
  watch(
    nodeStates,
    (states) => {
      if (!states) return

      // 同步节点运行时状态到运行时管理器
      setNodeStates(states)

      // 更新每个节点的UI状态和相关边的样式
      nodes.value.forEach((node) => {
        const nodeState = states.get(node.id)
        if (nodeState) {
          // 更新节点的视觉状态（这个可以保留，因为节点状态需要实时显示）
          node.data.status = nodeState.status

          updateEdgeStylesByNodeStatus(node.id, nodeState.status, edges.value)
        }
      })
    },
    { deep: true },
  )

  // 处理结果面板事件
  const handleStopExecution = () => {
    stopExecution()
    executing.value = false
    workflowStatus.value = 'saved'
  }

  const handleRestartExecution = () => {
    executeWorkflow()
  }

  const handleClearResults = () => {
    clearExecution()

    // 重置画布节点状态
    nodes.value.forEach((node) => {
      node.data.status = 'idle'
    })

    clearAllRuntimeStates()
  }

  const publishWorkflow = async () => {
    if (!appId.value) {
      message.error('缺少应用ID，无法发布工作流')
      return
    }

    // 发布前先保存工作流
    if (workflowStatus.value === 'draft') {
      message.info('发布前需要先保存工作流...')
      await saveWorkflow()
    }

    publishing.value = true
    try {
      const publishData = {
        appId: appId.value,
      }

      const response = await publish(publishData)

      if (response) {
        // 发布成功后，重新获取工作流信息以获取最新版本号
        try {
          const updatedWorkflow = await findByAppId(appId.value)
          if (updatedWorkflow && updatedWorkflow.version) {
            workflowVersion.value = updatedWorkflow.version
            workflowStatus.value = 'published'
            message.success('工作流发布成功')
          } else {
            workflowStatus.value = 'published'
            message.success('工作流发布成功')
          }
        } catch (fetchError) {
          console.warn('获取版本信息失败:', fetchError)
          workflowStatus.value = 'published'
          message.success('工作流发布成功')
        }
      } else {
        message.success('工作流发布成功')
        workflowStatus.value = 'published'
      }
    } catch (error) {
      console.error('发布失败:', error)
      message.error('发布失败: ' + (error.message || '未知错误'))
    } finally {
      publishing.value = false
    }
  }

  // 统一的状态计算（优先级：自动保存 > 工作流执行 > 发布状态）
  const getUnifiedStatus = computed(() => {
    // 自动保存状态优先级最高
    if (autoSaveStatus.value === 'saving') return 'saving'
    if (autoSaveStatus.value === 'error') return 'error'
    if (autoSaveStatus.value === 'pending') return 'pending'

    // 其次是工作流执行状态
    if (workflowStatus.value === 'executing') return 'executing'
    if (workflowStatus.value === 'error') return 'error'

    // 最后是发布状态
    if (workflowStatus.value === 'published') return 'published'

    // 默认显示保存状态
    if (autoSaveStatus.value === 'success' || autoSaveStatus.value === 'idle') {
      return 'saved'
    }

    return 'draft'
  })

  const getUnifiedStatusText = computed(() => {
    // 自动保存状态文本
    if (autoSaveStatus.value === 'saving') return '保存中...'
    if (autoSaveStatus.value === 'pending') return '等待保存...'
    if (autoSaveStatus.value === 'error') return '保存失败'

    // 工作流执行状态文本
    if (workflowStatus.value === 'executing') return '执行中'
    if (workflowStatus.value === 'error') return '执行失败'

    // 发布状态文本
    if (workflowStatus.value === 'published') return '已发布'

    // 保存成功状态文本（显示时间）
    if (autoSaveStatus.value === 'success' && autoSaveStatusText.value) {
      return autoSaveStatusText.value
    }

    // 默认状态
    return '草稿'
  })

  // 原有的状态文本方法保留（用于其他地方）
  const getStatusText = (status) => {
    const statusMap = {
      draft: '草稿',
      saved: '已保存',
      executing: '执行中',
      error: '执行失败',
      published: '已发布',
    }
    return statusMap[status] || '未知'
  }

  // 格式化版本文本
  const formatVersionText = (version) => {
    if (!version) return ''
    if (version === 'draft') return '草稿版本'
    // 如果是版本号，显示版本号
    return `版本 ${version}`
  }

  // 点击画布其他地方关闭添加节点菜单
  const handleCanvasClick = () => {
    if (showAddNodeMenu.value) {
      showAddNodeMenu.value = false
    }
  }

  // 连接验证函数 - 严格限制只能输出端口连接到输入端口
  const isValidConnection = (connection) => {
    // 获取源节点和目标节点
    const sourceNode = nodes.value.find((node) => node.id === connection.source)
    const targetNode = nodes.value.find((node) => node.id === connection.target)

    if (!sourceNode || !targetNode) {
      console.warn('❌ 连接失败：源节点或目标节点不存在')
      return false
    }

    // 不允许节点连接到自己
    if (connection.source === connection.target) {
      console.warn('❌ 连接失败：不允许节点连接到自己')
      return false
    }

    // 检查源节点的输出端口是否已经连接了其他节点
    const existingOutputConnection = edges.value.find(
      (edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle,
    )

    if (existingOutputConnection) {
      // 如果是相同的连接（同一个目标节点和目标端口），则允许通过（重复连接）
      if (
        existingOutputConnection.target === connection.target &&
        existingOutputConnection.targetHandle === connection.targetHandle
      ) {
        // 重复连接，允许（VueFlow可能会重新触发）
        return true
      } else {
        // 该输出端口已经连接了其他节点
        console.warn('❌ 连接失败：源节点的输出端口已经连接了其他节点', {
          sourceNode: connection.source,
          sourceHandle: connection.sourceHandle,
          existingTarget: existingOutputConnection.target,
        })
        return false
      }
    }

    // 检查目标节点的输入端口是否已经被其他节点连接
    const existingInputConnection = edges.value.find(
      (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
    )

    if (existingInputConnection) {
      // 如果是相同的连接（同一个源节点和源端口），则允许通过（重复连接）
      if (
        existingInputConnection.source === connection.source &&
        existingInputConnection.sourceHandle === connection.sourceHandle
      ) {
        // 重复连接，允许（VueFlow可能会重新触发）
        return true
      } else {
        // 不同的节点试图连接到已被占用的输入端口
        console.warn('❌ 连接失败：目标节点的输入端口已经被其他节点连接', {
          targetNode: connection.target,
          targetHandle: connection.targetHandle,
          existingSource: existingInputConnection.source,
        })
        return false
      }
    }

    // 核心验证：通过handle检查确保只能从输出端口连接到输入端口
    const { sourceHandle, targetHandle } = connection

    // 检查源端口 - 必须是输出端口
    // 输出端口的handle通常包含'source'字样或者是条件节点的具体条件ID
    const isSourceValid =
      sourceHandle &&
      (sourceHandle.includes('source') || // 普通节点的输出端口
        sourceHandle === 'condition1' ||
        sourceHandle === 'else' || // 条件节点的输出端口
        (sourceNode.data.nodeType === 'condition' &&
          sourceNode.data.config?.conditions?.some((c) => c.id === sourceHandle)))

    // 检查目标端口 - 必须是输入端口
    // 输入端口的handle通常包含'left'或'target'字样
    const isTargetValid =
      targetHandle &&
      (targetHandle.includes('left') || // 左侧输入端口
        targetHandle.includes('target')) // 目标端口

    // 特别检查：如果targetHandle包含'source'，说明连接到了输出端口，这是不允许的
    if (targetHandle && targetHandle.includes('source')) {
      console.warn('❌ 连接失败：试图连接到目标节点的输出端口（右侧），只能连接到输入端口（左侧）')
      return false
    }

    // 特别检查：如果sourceHandle包含'left'或'target'，说明从输入端口开始连接，这是不允许的
    if (sourceHandle && (sourceHandle.includes('left') || sourceHandle.includes('target'))) {
      console.warn('❌ 连接失败：试图从输入端口（左侧）开始连接，只能从输出端口（右侧）开始连接')
      return false
    }

    if (!isSourceValid) {
      console.warn('❌ 连接失败：源端口不是有效的输出端口', { sourceHandle })
      return false
    }

    if (!isTargetValid) {
      console.warn('❌ 连接失败：目标端口不是有效的输入端口', { targetHandle })
      return false
    }

    // 基于节点类型的额外验证
    // 检查源节点是否可以输出（有右侧端口）
    const sourceHasOutput = sourceNode.data.nodeType !== 'output' // 输出节点没有输出端口

    // 检查目标节点是否可以接收输入（有左侧端口）
    const targetHasInput = targetNode.data.nodeType !== 'start' // 开始节点没有输入端口

    if (!sourceHasOutput) {
      console.warn('❌ 连接失败：源节点没有输出端口（右侧端口）')
      return false
    }

    if (!targetHasInput) {
      console.warn('❌ 连接失败：目标节点没有输入端口（左侧端口）')
      return false
    }

    // 检查是否会形成循环
    const wouldCreateCycle = checkForCycle(connection.source, connection.target)
    if (wouldCreateCycle) {
      console.warn('❌ 连接失败：连接会形成循环')
      return false
    }

    return true
  }

  // 检查是否会形成循环的简单实现
  const checkForCycle = (sourceId, targetId) => {
    // 从目标节点开始，看是否能通过现有的边回到源节点
    const visited = new Set()

    const dfs = (nodeId) => {
      if (nodeId === sourceId) return true
      if (visited.has(nodeId)) return false

      visited.add(nodeId)

      // 找到从当前节点出发的所有边
      const outgoingEdges = edges.value.filter((edge) => edge.source === nodeId)

      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) return true
      }

      return false
    }

    return dfs(targetId)
  }

  const addNode = () => {
    addNodeFromNodeId.value = 'start-node'
    addNodeMenuPosition.value = { x: 300, y: 300 }
    showAddNodeMenu.value = true
  }
</script>

<style scoped>
  .workflow-editor-container {
    width: 100%;
    height: calc(100vh - 48px);
    position: relative;
    overflow: hidden;
  }

  .workflow-toolbar {
    position: absolute;
    top: 24px;
    left: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
    pointer-events: none; /* 允许点击穿透到画布 */
  }

  .toolbar-left,
  .toolbar-right {
    pointer-events: auto; /* Restore click events for children */
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .workflow-name-input {
    font-size: 18px;
    font-weight: 600;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #1f2937;
    padding: 6px 12px;
    border-radius: 12px;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .workflow-name-input:hover {
    border-color: #9ca3af;
  }

  .workflow-name-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  /* Buttons floating directly on the canvas */
  .toolbar-right :deep(.ant-btn) {
    border-radius: 12px;
    height: 38px;
    padding: 0 16px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    border: 1px solid #d1d5db; /* Clean border */
    background-color: #ffffff; /* Solid background */
    color: #374151;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* Subtle shadow */
  }

  .toolbar-right :deep(.ant-btn:hover) {
    transform: translateY(-1px);
    border-color: #9ca3af;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  }

  .toolbar-right :deep(.ant-btn:focus),
  .toolbar-right :deep(.ant-btn:active) {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  /* Primary button (Save) */
  .toolbar-right :deep(.ant-btn-primary) {
    background-color: #3b82f6;
    color: white;
    border-color: transparent;
  }

  .toolbar-right :deep(.ant-btn-primary:hover) {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  /* Special "Run" button */
  .toolbar-right :deep(.btn-run) {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-color: transparent;
    color: white;
  }

  .toolbar-right :deep(.btn-run:hover) {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
  }

  /* Special "Publish" button */
  .toolbar-right :deep(.btn-publish) {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    border-color: transparent;
    color: white;
  }

  .toolbar-right :deep(.btn-publish:hover) {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
  }

  .toolbar-right :deep(.ant-divider-vertical) {
    height: 20px;
    margin: 0;
    border-left: 1px solid #e5e7eb;
  }

  .workflow-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .workflow-version {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 版本标签样式 */
  .version-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(67, 56, 202, 0.1) 100%);
    color: #4f46e5;
    border: 1px solid rgba(99, 102, 241, 0.2);
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
  }

  .version-tag:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(67, 56, 202, 0.15) 100%);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  }

  .version-icon {
    font-size: 14px;
    opacity: 0.8;
  }

  .version-text {
    white-space: nowrap;
    font-weight: 600;
  }

  /* 统一状态图标样式 */
  .status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
  }

  .icon-loading {
    animation: rotate 2s linear infinite;
    display: inline-block;
  }

  .icon-error {
    font-size: 14px;
    line-height: 1;
  }

  .icon-pending {
    font-size: 10px;
    line-height: 1;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 新增 saving 和 pending 状态样式 */
  .status-saving {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(69, 139, 255, 0.1) 100%);
    border-color: rgba(24, 144, 255, 0.3);
  }

  .status-saving .status-text {
    color: #1890ff;
  }

  .status-pending {
    background: linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, rgba(250, 219, 20, 0.1) 100%);
    border-color: rgba(250, 173, 20, 0.3);
  }

  .status-pending .status-text {
    color: #faad14;
  }

  /* 现代化状态标签样式 */
  .modern-status-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-height: 32px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .status-text {
    white-space: nowrap;
    line-height: 1.5;
    display: inline-flex;
    align-items: center;
  }

  /* 不同状态的样式 */
  .status-draft {
    background: linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(209, 213, 219, 0.1) 100%);
    color: #6b7280;
    border-color: rgba(156, 163, 175, 0.2);
  }

  .status-draft .status-dot {
    background: #9ca3af;
  }

  .status-saved {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%);
    color: #059669;
    border-color: rgba(34, 197, 94, 0.2);
  }

  .status-saved .status-dot {
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
  }

  .status-published {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
    color: #7c3aed;
    border-color: rgba(139, 92, 246, 0.2);
  }

  .status-published .status-dot {
    background: #8b5cf6;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }

  .status-executing {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
    color: #2563eb;
    border-color: rgba(59, 130, 246, 0.2);
  }

  .status-executing .status-dot {
    background: #3b82f6;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  .status-error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.2);
  }

  .status-error .status-dot {
    background: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
  }

  @keyframes pulse-dot {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }

  .workflow-content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .workflow-canvas {
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 1px 1px, #cbd5e1 1.5px, transparent 0);
    background-size: 24px 24px;
    background-color: #ffffff;
    position: relative;
  }

  .vue-flow-container {
    width: 100%;
    height: 100%;
    background: transparent !important;
  }

  /* 移除了左侧面板相关样式 */

  .status-icon {
    display: inline-block;
    animation: none;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* 添加节点菜单样式 - Dify风格 */
  .add-node-menu {
    position: fixed;
    z-index: 2000;
    background: white;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    min-width: 280px;
    max-width: 320px;
    pointer-events: auto;
  }

  .add-node-menu-content {
    max-height: 480px;
    overflow-y: auto;
  }

  .add-node-title {
    padding: 16px 20px 12px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .add-node-list {
    padding: 12px 8px;
    display: grid;
    gap: 4px;
  }

  .add-node-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 12px;
    margin: 0 4px;
  }

  .add-node-item:hover {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .add-node-item .node-icon {
    font-size: 22px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .add-node-item .node-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    flex: 1;
  }

  /* VueFlow 原生样式，不覆盖连线样式 */
  .workflow-canvas {
    background-color: #fafafa;
  }

  :deep(.vue-flow__edge-path) {
    stroke: #666;
    stroke-width: 2;
  }

  :deep(.vue-flow__edge.animated .vue-flow__edge-path) {
    stroke: #1890ff;
    stroke-dasharray: 5;
    animation: dashdraw 0.5s linear infinite;
  }

  :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
    stroke: #722ed1;
    stroke-width: 3;
  }

  :deep(.vue-flow__controls) {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: 4px;
  }

  :deep(.vue-flow__controls-button) {
    border: none;
    background: transparent;
    color: #595959;
    border-radius: 8px;
    margin: 2px;
  }

  :deep(.vue-flow__controls-button:hover) {
    background: #f0f9ff;
    color: #1890ff;
  }

  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  /* 应用模式校验失败提示样式 */
  .app-mode-error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    z-index: 1000;

    .error-content {
      text-align: center;
      padding: 48px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.15);
      max-width: 500px;

      .error-icon {
        font-size: 64px;
        margin-bottom: 24px;
        animation: shake 0.5s ease-in-out;
      }

      .error-title {
        font-size: 24px;
        font-weight: 600;
        color: #dc2626;
        margin-bottom: 16px;
      }

      .error-message {
        font-size: 16px;
        color: #6b7280;
        line-height: 1.6;
        margin-bottom: 32px;
      }
    }
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-10px);
    }
    75% {
      transform: translateX(10px);
    }
  }
</style>
