export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  label: string
  data: NodeData
}

export interface NodeData {
  type: string
  icon: string
  description: string
  config: Record<string, any>
  version?: string
  status?: 'idle' | 'running' | 'success' | 'error' | 'warning'
  executionStats?: {
    count: number
    avgDuration: number
    lastExecuted?: string
    successRate?: number
  }
  errors?: string[]
  warnings?: string[]
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  animated?: boolean
  style?: Record<string, any>
  label?: string
  data?: {
    condition?: string
    weight?: number
  }
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  version: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'published' | 'running' | 'stopped' | 'error'
  tags?: string[]
  category?: string
  isTemplate?: boolean
  variables?: WorkflowVariable[]
  settings?: WorkflowSettings
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  value: any
  description?: string
  required?: boolean
}

export interface WorkflowSettings {
  timeout?: number
  retryPolicy?: {
    enabled: boolean
    maxRetries: number
    retryDelay: number
  }
  errorHandling?: {
    mode: 'stop' | 'continue' | 'skip'
    notifyOnError: boolean
  }
  concurrency?: {
    maxParallel: number
    queueSize: number
  }
}

export interface NodeType {
  type: string
  label: string
  category: string
  icon: string
  description: string
  defaultConfig: Record<string, any>
  configSchema: ConfigField[]
  inputs?: NodePort[]
  outputs?: NodePort[]
  constraints?: NodeConstraints
}

export interface NodePort {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'array' | 'any'
  required?: boolean
  description?: string
}

export interface NodeConstraints {
  maxInputs?: number
  maxOutputs?: number
  allowedPrevious?: string[]
  allowedNext?: string[]
  requiresPrevious?: boolean
  requiresNext?: boolean
}

export interface ConfigField {
  key: string
  label: string
  type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'number'
    | 'boolean'
    | 'json'
    | 'file'
    | 'password'
    | 'color'
    | 'date'
    | 'time'
  required?: boolean
  default?: any
  options?: { label: string; value: any; description?: string }[]
  placeholder?: string
  description?: string
  validation?: FieldValidation
  dependency?: FieldDependency
  group?: string
  // 数字类型专用
  min?: number
  max?: number
  step?: number
  // 文本类型专用
  maxLength?: number
  minLength?: number
  // 文件类型专用
  accept?: string
  maxSize?: number
  // 选择类型专用
  multiple?: boolean
}

export interface FieldValidation {
  pattern?: string
  message?: string
  custom?: (value: any) => boolean | string
}

export interface FieldDependency {
  field: string
  value: any
  condition: 'equals' | 'not_equals' | 'contains' | 'not_contains'
}

export interface ExecutionResult {
  nodeId: string
  status: 'success' | 'error' | 'running' | 'waiting' | 'skipped'
  output?: any
  error?: string
  startTime?: string
  endTime?: string
  duration?: number
  retryCount?: number
  logs?: ExecutionLog[]
}

export interface ExecutionLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'running' | 'success' | 'error' | 'cancelled' | 'paused'
  startTime: string
  endTime?: string
  results: ExecutionResult[]
  context?: Record<string, any>
  variables?: Record<string, any>
  totalDuration?: number
  progress?: {
    completed: number
    total: number
    currentNode?: string
  }
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
  author?: string
  version: string
  rating?: number
  downloads?: number
  preview?: string
}

export interface WorkflowValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  type:
    | 'missing_start'
    | 'missing_end'
    | 'disconnected_node'
    | 'invalid_config'
    | 'circular_dependency'
  nodeId?: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  type: 'unused_node' | 'missing_config' | 'performance'
  nodeId?: string
  message: string
}

// 工作流运行时上下文
export interface WorkflowContext {
  workflowId: string
  executionId: string
  variables: Record<string, any>
  nodeResults: Record<string, any>
  startTime: string
  userId?: string
  metadata?: Record<string, any>
}

// 节点执行接口
export interface NodeExecutor {
  execute(input: any, context: WorkflowContext): Promise<any>
  validate?(config: any): ValidationError[]
}

// 工作流事件
export interface WorkflowEvent {
  type:
    | 'node_start'
    | 'node_complete'
    | 'node_error'
    | 'workflow_start'
    | 'workflow_complete'
    | 'workflow_error'
  workflowId: string
  executionId: string
  nodeId?: string
  timestamp: string
  data?: any
}
