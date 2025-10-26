// 变量类型定义
export enum VariableType {
  ENVIRONMENT = 'env', // 环境变量
  SYSTEM = 'sys', // 系统变量
  CONVERSATION = 'conversation', // 会话变量
  USER_INPUT = 'input', // 用户输入
  NODE_OUTPUT = 'output', // 节点出参
}

// 变量访问权限
export enum VariableAccess {
  READONLY = 'readonly', // 只读
  READWRITE = 'readwrite', // 读写
}

// 变量数据类型
export enum VariableDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  ANY = 'any',
}

// 变量定义接口
export interface VariableDefinition {
  id: string // 变量唯一标识
  name: string // 变量名称
  type: VariableType // 变量类型
  dataType: VariableDataType // 数据类型
  access: VariableAccess // 访问权限
  description?: string // 变量描述
  required?: boolean // 是否必需
  defaultValue?: any // 默认值
  sourceNodeId?: string // 来源节点ID（仅节点出参）
  sourceOutputKey?: string // 来源输出键名（仅节点出参）
}

// 节点输出定义
export interface NodeOutputDefinition {
  key: string // 输出键名
  name: string // 输出名称
  dataType: VariableDataType // 数据类型
  description?: string // 描述
}

// 节点类型对应的输出定义
const LLM_OUTPUT_DEFINITIONS: NodeOutputDefinition[] = [
  {
    key: 'output',
    name: 'AI回复',
    dataType: VariableDataType.STRING,
    description: 'AI模型生成的回复内容',
  },
]

export const NODE_OUTPUT_DEFINITIONS: Record<string, NodeOutputDefinition[]> = {
  start: [],
  llm: LLM_OUTPUT_DEFINITIONS,
  llm_answer: LLM_OUTPUT_DEFINITIONS,
  http: [
    {
      key: 'body',
      name: '响应数据',
      dataType: VariableDataType.STRING,
      description: 'HTTP请求的响应数据',
    },
    {
      key: 'status',
      name: '状态码',
      dataType: VariableDataType.NUMBER,
      description: 'HTTP响应状态码',
    },
  ],
  condition: [],
  code: [
    {
      key: 'output',
      name: '代码输出',
      dataType: VariableDataType.ANY,
      description: '代码执行的输出结果',
    },
  ],
  knowledge: [
    {
      key: 'results',
      name: '检索文档列表',
      dataType: VariableDataType.ARRAY,
      description: '检索到的相关文档列表',
    },
  ],
  template: [
    {
      key: 'output',
      name: '模板输出',
      dataType: VariableDataType.STRING,
      description: '模板渲染后的结果',
    },
    {
      key: 'variables',
      name: '使用变量',
      dataType: VariableDataType.OBJECT,
      description: '模板中使用的变量值',
    },
  ],
  variable: [],
  direct_reply: [],
  output: [], // 输出节点没有输出参数
}

// 系统变量定义 - 工作流模式
export const SYSTEM_VARIABLES: VariableDefinition[] = []

// 系统变量定义 - 对话流模式（包含用户查询）
export const CHATFLOW_SYSTEM_VARIABLES: VariableDefinition[] = [
  {
    id: 'sys_user_query',
    name: 'query',
    type: VariableType.SYSTEM,
    dataType: VariableDataType.STRING,
    access: VariableAccess.READONLY,
    description: '用户对话输入',
    required: true,
  },
]

/**
 * 根据应用模式获取系统变量
 * @param appMode 应用模式：'workflow' | 'chatflow'
 */
export const getSystemVariables = (appMode: 'workflow' | 'chatflow'): VariableDefinition[] => {
  return appMode === 'chatflow' ? CHATFLOW_SYSTEM_VARIABLES : SYSTEM_VARIABLES
}

// 环境变量定义
export const ENVIRONMENT_VARIABLES: VariableDefinition[] = [
  // {
  //   id: 'env_api_key',
  //   name: 'apiKey',
  //   type: VariableType.ENVIRONMENT,
  //   dataType: VariableDataType.STRING,
  //   access: VariableAccess.READONLY,
  //   description: 'API密钥',
  //   required: false,
  // },
  // {
  //   id: 'env_base_url',
  //   name: 'baseUrl',
  //   type: VariableType.ENVIRONMENT,
  //   dataType: VariableDataType.STRING,
  //   access: VariableAccess.READONLY,
  //   description: '基础URL地址',
  //   required: false,
  // },
]

// 变量引用格式
export interface VariableReference {
  type: VariableType
  nodeId?: string // 节点ID（仅节点出参需要）
  variableName: string // 变量名
  outputKey?: string // 输出键名（仅节点出参需要）
  path?: string // 对象路径，如 'response.data.items[0].name'
}

// 变量引用参数（用于节点配置中记录引用的变量信息）
export interface ReferenceParameter {
  nodeId: string // 引用的节点ID
  parameterName: string // 参数名称
  variableType: VariableType // 变量类型
}

// 数据类型颜色映射
export const DATA_TYPE_COLORS: Record<string, string> = {
  string: 'blue',
  number: 'green',
  boolean: 'orange',
  object: 'purple',
  array: 'cyan',
  any: 'default',
}

// 数据类型标签映射
export const DATA_TYPE_LABELS: Record<string, string> = {
  string: '文本',
  number: '数字',
  boolean: '布尔值',
  object: '对象',
  array: '数组',
  any: '任意类型',
}

// 获取节点输出定义的工具函数
export const getNodeOutputDefinitions = (nodeType: string): NodeOutputDefinition[] => {
  return NODE_OUTPUT_DEFINITIONS[nodeType] || []
}

// 获取数据类型颜色
export const getDataTypeColor = (dataType: string): string => {
  return DATA_TYPE_COLORS[dataType] || 'default'
}

// 获取数据类型标签
export const getDataTypeLabel = (dataType: string): string => {
  return DATA_TYPE_LABELS[dataType] || dataType
}
