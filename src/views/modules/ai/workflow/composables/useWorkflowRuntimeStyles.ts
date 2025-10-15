import { computed, reactive, ref } from 'vue'

/**
 * 节点运行时状态
 */
export type NodeRuntimeStatus = 'idle' | 'running' | 'success' | 'error'

/**
 * 边运行时样式配置
 */
export interface EdgeRuntimeStyle {
  stroke: string
  strokeWidth: number
  animated: boolean
}

/**
 * 节点运行时状态数据
 */
export interface NodeRuntimeState {
  status: NodeRuntimeStatus

  [key: string]: any
}

/**
 * 预定义的边样式
 */
const EDGE_STYLES = {
  default: { stroke: '#666', strokeWidth: 2, animated: false },
  running: { stroke: '#1890ff', strokeWidth: 3, animated: true },
  success: { stroke: '#52c41a', strokeWidth: 2, animated: false },
  error: { stroke: '#ff4d4f', strokeWidth: 2, animated: false },
  idle: { stroke: '#d9d9d9', strokeWidth: 2, animated: false },
} as const

/**
 * 工作流运行时样式管理 Hook
 */
export function useWorkflowRuntimeStyles() {
  // ==================== 状态定义 ====================

  /**
   * 节点运行时状态映射
   * key: nodeId, value: 节点运行时状态
   */
  const nodeRuntimeStates = reactive(new Map<string, NodeRuntimeState>())

  /**
   * 边运行时样式映射
   * key: edgeId, value: 边的运行时样式
   */
  const edgeRuntimeStyles = reactive(new Map<string, EdgeRuntimeStyle>())

  /**
   * 是否处于运行时模式
   */
  const isRuntimeMode = ref(false)

  // ==================== 节点状态管理 ====================

  /**
   * 设置节点的运行时状态
   * @param nodeId 节点ID
   * @param status 状态
   */
  function setNodeStatus(nodeId: string, status: NodeRuntimeStatus) {
    nodeRuntimeStates.set(nodeId, { status })
  }

  /**
   * 获取节点的运行时状态
   * @param nodeId 节点ID
   * @returns 节点状态，如果不存在则返回 'idle'
   */
  function getNodeStatus(nodeId: string): NodeRuntimeStatus {
    return nodeRuntimeStates.get(nodeId)?.status || 'idle'
  }

  /**
   * 批量设置节点状态
   * @param statesMap 节点状态映射
   */
  function setNodeStates(statesMap: Map<string, NodeRuntimeState>) {
    statesMap.forEach((state, nodeId) => {
      nodeRuntimeStates.set(nodeId, state)
    })
  }

  // ==================== 边样式管理 ====================

  /**
   * 根据节点状态计算边的样式
   * @param nodeId 节点ID
   * @param status 节点状态
   */
  function updateEdgeStylesByNodeStatus(nodeId: string, status: NodeRuntimeStatus, edges: any[]) {
    // 找到与该节点相关的所有边
    const relatedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId)

    // 根据节点状态设置边的样式
    const style = EDGE_STYLES[status] || EDGE_STYLES.idle

    relatedEdges.forEach((edge) => {
      edgeRuntimeStyles.set(edge.id, { ...style })
    })
  }

  /**
   * 设置指定边的运行时样式
   * @param edgeId 边ID
   * @param style 样式
   */
  function setEdgeStyle(edgeId: string, style: EdgeRuntimeStyle) {
    edgeRuntimeStyles.set(edgeId, style)
  }

  /**
   * 获取边的运行时样式
   * @param edgeId 边ID
   * @returns 边的样式，如果不存在则返回默认样式
   */
  function getEdgeStyle(edgeId: string): EdgeRuntimeStyle {
    return edgeRuntimeStyles.get(edgeId) || EDGE_STYLES.default
  }

  /**
   * 计算用于渲染的边列表（合并数据状态和UI状态）
   * @param dataEdges 数据层的边列表
   * @returns 合并了运行时样式的边列表
   */
  const computeDisplayEdges = (dataEdges: any[]) => {
    return computed(() =>
      dataEdges.map((edge) => {
        // 如果处于运行时模式，使用运行时样式
        if (isRuntimeMode.value && edgeRuntimeStyles.has(edge.id)) {
          const runtimeStyle = edgeRuntimeStyles.get(edge.id)!
          return {
            ...edge,
            style: { stroke: runtimeStyle.stroke, strokeWidth: runtimeStyle.strokeWidth },
            animated: runtimeStyle.animated,
          }
        }

        // 否则使用边本身的样式或默认样式
        return {
          ...edge,
          style: edge.style || { stroke: '#666', strokeWidth: 2 },
          animated: edge.animated || false,
        }
      }),
    )
  }

  // ==================== 运行时模式控制 ====================

  /**
   * 开始运行时模式
   */
  function startRuntimeMode() {
    isRuntimeMode.value = true
  }

  /**
   * 结束运行时模式并清理所有运行时状态
   */
  function endRuntimeMode() {
    isRuntimeMode.value = false
    clearAllRuntimeStates()
  }

  /**
   * 清理所有运行时状态
   */
  function clearAllRuntimeStates() {
    nodeRuntimeStates.clear()
    edgeRuntimeStyles.clear()
  }

  /**
   * 重置所有节点为 idle 状态
   */
  function resetAllNodesToIdle(nodeIds: string[]) {
    nodeIds.forEach((nodeId) => {
      setNodeStatus(nodeId, 'idle')
    })
  }

  /**
   * 重置所有边为默认样式
   */
  function resetAllEdgesToDefault(edgeIds: string[]) {
    edgeIds.forEach((edgeId) => {
      edgeRuntimeStyles.set(edgeId, EDGE_STYLES.default)
    })
  }

  // ==================== 对外暴露 ====================

  return {
    // 状态
    nodeRuntimeStates,
    edgeRuntimeStyles,
    isRuntimeMode,

    // 节点状态管理
    setNodeStatus,
    getNodeStatus,
    setNodeStates,

    // 边样式管理
    updateEdgeStylesByNodeStatus,
    setEdgeStyle,
    getEdgeStyle,
    computeDisplayEdges,

    // 运行时模式控制
    startRuntimeMode,
    endRuntimeMode,
    clearAllRuntimeStates,
    resetAllNodesToIdle,
    resetAllEdgesToDefault,
  }
}
