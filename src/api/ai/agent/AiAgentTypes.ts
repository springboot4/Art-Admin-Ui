export type AgentStrategyType = 'react' | 'plan_execute' | 'router'

export interface ToolArgumentSelector {
  nodeId: 'sys' | 'env' | 'conversation' | 'input' | 'output' | string
  key: string
}

export interface ToolArgumentBinding {
  field: string
  selector?: ToolArgumentSelector
  constant?: unknown
  override?: boolean
}

export interface AgentToolBindings {
  [toolName: string]: ToolArgumentBinding[]
}

export interface AgentKnowledgeConfig {
  datasetIds?: Array<string | number>
  retrievalTypes?: string[]
}

export interface AgentMemoryConfig {
  enabled?: boolean
  window?: {
    size?: number | null
  }
}

export interface AgentBudgetsConfig {
  maxSteps?: number | null
  maxTimeMs?: number | null
  maxToolCalls?: number | null
}

export interface AgentOutputConfig {
  mode?: 'text' | 'structured'
}

export interface UserInputVariable {
  name: string
  /** 数据类型 */
  dataType: 'string' | 'number' | 'boolean'
  /** 是否必填 */
  required: boolean
  /** 变量描述 */
  description?: string
  /** 显示名称 */
  displayName: string
}

export interface AgentSpec {
  version?: string
  platformId: string | number | null
  modelId: string | number | null
  temperature?: number | null
  maxTokens?: number | null
  language?: string
  systemPrompt?: string
  strategy: {
    type: AgentStrategyType
    params?: Record<string, unknown>
    decorators?: string[]
  }
  tools: string[]
  toolBindings?: AgentToolBindings
  userInputs?: UserInputVariable[]
  knowledge?: AgentKnowledgeConfig | null
  memory?: AgentMemoryConfig | null
  budgets?: AgentBudgetsConfig | null
  output?: AgentOutputConfig | null
  extensions?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export interface AiAgentDTO {
  id?: string | number
  appId: string | number
  name: string
  status: 'draft' | 'published'
  specJson: string
  tenantId?: number
  createTime?: string
  createBy?: string
  updateTime?: string
  updateBy?: string
}

export interface AgentPageQuery {
  current?: number
  size?: number
  id?: number
  appId?: number
  name?: string
  status?: string
  tenantId?: number
}

export interface AgentRunPayload {
  agentId: string | number
  conversationId: string | number
  userQuery: string
  variables?: Record<string, unknown>
}
