// 重新导出所有类型和常量
export * from './variables'

// 工作流执行相关类型定义
export interface NodeExecutionState {
  nodeId: string
  nodeName?: string // 节点显示名称
  status: 'idle' | 'running' | 'success' | 'error'
  startTime?: number
  endTime?: number
  error?: string
}

export interface NodeExecutionResult {
  nodeId: string
  nodeName?: string // 节点显示名称
  outputs?: Array<{
    name: string
    dataType: string
    value: any
  }>
  chunks?: string[] // 存储LLM节点的所有chunk
  fullContent?: string // LLM节点的完整内容
  executionTime?: number
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
}

export interface ExecutionError {
  nodeId: string
  errorType: 'network' | 'timeout' | 'validation' | 'runtime'
  message: string
  timestamp: number
  details?: any
}

export interface ExecutionMetrics {
  totalNodes: number
  completedNodes: number
  startTime: number
  endTime?: number
  totalDuration?: number
  averageNodeTime?: number
}

export interface WorkflowExecutionState {
  isRunning: boolean
  executionId: string | null
  nodeStates: Map<string, NodeExecutionState>
  executionResults: Map<string, NodeExecutionResult>
  errors: Array<ExecutionError>
  resultPanelVisible: boolean
  selectedResultNodeId: string | null
  executionMetrics: ExecutionMetrics
}

// SSE消息类型
// 节点完整输出消息 - 表示节点执行完成并返回结果
export interface SSENodeOutputMessage {
  outputs: Array<{
    name: string
    dataType: string
    value: any
  }>
  nodeId: string
  nodeName?: string // 可选的节点显示名称
}

// LLM流式输出消息 - 用于实时显示AI生成内容
export interface SSEChunkMessage {
  chunk: string
  nodeId: string
  nodeName?: string // 可选的节点显示名称
}

// 节点完成状态消息 - 主要用于停止LLM流式输出的"生成中..."状态
export interface SSENodeCompleteMessage {
  nodeId: string
  nodeName?: string // 可选的节点显示名称
  status: 'completed' | 'error'
  message?: string
}
