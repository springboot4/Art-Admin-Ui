import { Node } from '@vue-flow/core'

export interface BaseNodeData {
  type: string // e.g., 'start', 'llm', 'knowledgeRetrieval', 'custom'
  label: string
  description?: string
}

export interface StartNodeData extends BaseNodeData {
  type: 'start'
}

export interface LLMNodeData extends BaseNodeData {
  type: 'llm'
  model: string // e.g., 'gpt-3.5-turbo', 'gemini-pro'
  temperature: number
  maxTokens: number
  prompt: string
}

export interface KnowledgeRetrievalNodeData extends BaseNodeData {
  type: 'knowledgeRetrieval'
  knowledgeBaseId: string
  query: string
  topK: number
}

export interface CustomNodeData extends BaseNodeData {
  type: 'custom'
  // Any custom properties for a generic custom node
  [key: string]: any
}

// Extend VueFlow's Node interface to include our custom data
export interface WorkflowNode extends Node {
  data: StartNodeData | LLMNodeData | KnowledgeRetrievalNodeData | CustomNodeData
}
