import { ConfigField, NodeType } from './workflow'

export const NODE_CATEGORIES = {
  TRIGGER: 'trigger',
  LLM: 'llm',
  KNOWLEDGE: 'knowledge',
  LOGIC: 'logic',
  OUTPUT: 'output',
  TRANSFORM: 'transform',
  API: 'api',
  CUSTOM: 'custom',
} as const

const LLM_DEFAULT_CONFIG = {
  model: 'gpt-4',
  prompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '',
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
}

const LLM_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'model',
    label: '模型选择',
    type: 'select',
    required: true,
    default: 'gpt-4',
    options: [],
  },
  {
    key: 'systemPrompt',
    label: '系统提示词',
    type: 'textarea',
    placeholder: '请输入系统提示词...',
    description: '定义AI助手的角色和行为',
  },
  {
    key: 'prompt',
    label: '用户提示词',
    type: 'textarea',
    required: true,
    placeholder: '请输入提示词模板，可使用变量如 {{input}}...',
    description: '支持变量替换，如 {{变量名}}',
  },
  {
    key: 'temperature',
    label: '创造性',
    type: 'number',
    default: 0.7,
    min: 0,
    max: 1,
    step: 0.1,
    description: '0-1之间，越高越有创造性',
  },
  {
    key: 'maxTokens',
    label: '最大令牌数',
    type: 'number',
    default: 2048,
    min: 1,
    max: 8192,
    description: '生成文本的最大长度',
  },
  {
    key: 'topP',
    label: 'Top P',
    type: 'number',
    default: 1,
    min: 0,
    max: 1,
    step: 0.1,
    description: '核采样参数',
  },
  {
    key: 'frequencyPenalty',
    label: '频率惩罚',
    type: 'number',
    default: 0,
    min: -2,
    max: 2,
    step: 0.1,
    description: '降低重复内容的概率',
  },
  {
    key: 'presencePenalty',
    label: '存在惩罚',
    type: 'number',
    default: 0,
    min: -2,
    max: 2,
    step: 0.1,
    description: '鼓励讨论新主题',
  },
]

const createLLMNodeType = (
  type: string,
  label: string,
  description: string,
  icon: string,
): NodeType => ({
  type,
  label,
  category: NODE_CATEGORIES.LLM,
  icon,
  description,
  defaultConfig: { ...LLM_DEFAULT_CONFIG },
  configSchema: LLM_CONFIG_SCHEMA,
})

export const nodeTypeConfigs: NodeType[] = [
  {
    type: 'start',
    label: '开始节点',
    category: NODE_CATEGORIES.TRIGGER,
    icon: '▶️',
    description: '工作流的起始节点',
    defaultConfig: {
      trigger: 'manual',
      inputs: [],
    },
    configSchema: [
      {
        key: 'trigger',
        label: '触发方式',
        type: 'select',
        required: true,
        default: 'manual',
        options: [
          { label: '手动触发', value: 'manual' },
          { label: 'API触发', value: 'api' },
          { label: '定时触发', value: 'schedule' },
          { label: 'Webhook触发', value: 'webhook' },
        ],
      },
      {
        key: 'inputs',
        label: '输入参数',
        type: 'json',
        placeholder: '[{"name": "input", "type": "string", "required": true}]',
        description: '定义工作流的输入参数',
      },
    ],
  },
  createLLMNodeType('llm', '大模型节点', '调用大语言模型进行文本生成', '🤖'),
  createLLMNodeType('llm_answer', '大模型应答', '用于生成应答内容的模型节点', '💬'),
  {
    type: 'knowledge',
    label: '知识检索节点',
    category: NODE_CATEGORIES.KNOWLEDGE,
    icon: '📚',
    description: '从知识库中检索相关信息',
    defaultConfig: {
      knowledgeBaseId: '',
      query: '',
      topK: 5,
      similarity: 0.7,
      searchMode: 'semantic',
      rerank: false,
    },
    configSchema: [
      {
        key: 'knowledgeBaseId',
        label: '知识库',
        type: 'select',
        required: true,
        options: [
          { label: '企业知识库', value: 'kb_001' },
          { label: '产品文档', value: 'kb_002' },
          { label: 'FAQ库', value: 'kb_003' },
          { label: '技术文档', value: 'kb_004' },
        ],
      },
      {
        key: 'query',
        label: '查询内容',
        type: 'textarea',
        required: true,
        placeholder: '请输入查询内容，支持变量如 {{input}}...',
      },
      {
        key: 'searchMode',
        label: '搜索模式',
        type: 'select',
        default: 'semantic',
        options: [
          { label: '语义搜索', value: 'semantic' },
          { label: '关键词搜索', value: 'keyword' },
          { label: '混合搜索', value: 'hybrid' },
        ],
      },
      {
        key: 'topK',
        label: '返回数量',
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        description: '最多返回的相关文档数量',
      },
      {
        key: 'similarity',
        label: '相似度阈值',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 1,
        step: 0.1,
        description: '0-1之间，相似度低于此值的文档将被过滤',
      },
      {
        key: 'rerank',
        label: '重排序',
        type: 'boolean',
        default: false,
        description: '是否对检索结果进行重排序',
      },
    ],
  },
  {
    type: 'document',
    label: '文档处理节点',
    category: NODE_CATEGORIES.TRANSFORM,
    icon: '📄',
    description: '处理各种格式的文档',
    defaultConfig: {
      operation: 'extract',
      format: 'auto',
      chunkSize: 1000,
      overlap: 100,
    },
    configSchema: [
      {
        key: 'operation',
        label: '操作类型',
        type: 'select',
        required: true,
        default: 'extract',
        options: [
          { label: '文本提取', value: 'extract' },
          { label: '文档分块', value: 'chunk' },
          { label: '格式转换', value: 'convert' },
          { label: '内容清洗', value: 'clean' },
        ],
      },
      {
        key: 'format',
        label: '文档格式',
        type: 'select',
        default: 'auto',
        options: [
          { label: '自动识别', value: 'auto' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Word', value: 'docx' },
          { label: 'Excel', value: 'xlsx' },
          { label: 'PowerPoint', value: 'pptx' },
          { label: 'HTML', value: 'html' },
          { label: 'Markdown', value: 'md' },
        ],
      },
      {
        key: 'chunkSize',
        label: '分块大小',
        type: 'number',
        default: 1000,
        min: 100,
        max: 5000,
        description: '每个文本块的字符数',
      },
      {
        key: 'overlap',
        label: '重叠字符',
        type: 'number',
        default: 100,
        min: 0,
        max: 500,
        description: '相邻块之间的重叠字符数',
      },
    ],
  },
  {
    type: 'data-transform',
    label: '数据转换节点',
    category: NODE_CATEGORIES.TRANSFORM,
    icon: '🔄',
    description: '转换和处理数据格式',
    defaultConfig: {
      transformation: 'json-to-text',
      template: '',
      encoding: 'utf-8',
    },
    configSchema: [
      {
        key: 'transformation',
        label: '转换类型',
        type: 'select',
        required: true,
        default: 'json-to-text',
        options: [
          { label: 'JSON转文本', value: 'json-to-text' },
          { label: '文本转JSON', value: 'text-to-json' },
          { label: 'CSV转JSON', value: 'csv-to-json' },
          { label: 'XML转JSON', value: 'xml-to-json' },
          { label: '自定义转换', value: 'custom' },
        ],
      },
      {
        key: 'template',
        label: '转换模板',
        type: 'textarea',
        placeholder: '{{#each items}}\n  {{name}}: {{value}}\n{{/each}}',
        description: '使用Handlebars模板语法进行数据转换',
      },
      {
        key: 'encoding',
        label: '字符编码',
        type: 'select',
        default: 'utf-8',
        options: [
          { label: 'UTF-8', value: 'utf-8' },
          { label: 'GBK', value: 'gbk' },
          { label: 'ASCII', value: 'ascii' },
        ],
      },
    ],
  },
  {
    type: 'http-request',
    label: 'HTTP请求节点',
    category: NODE_CATEGORIES.API,
    icon: '🌐',
    description: '发送HTTP请求到外部API',
    defaultConfig: {
      url: '',
      method: 'POST',
      headers: {},
      body: '',
      timeout: 30000,
      retries: 0,
    },
    configSchema: [
      {
        key: 'url',
        label: 'URL地址',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/v1/endpoint',
      },
      {
        key: 'method',
        label: '请求方法',
        type: 'select',
        default: 'POST',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
        ],
      },
      {
        key: 'headers',
        label: '请求头',
        type: 'json',
        placeholder: '{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}',
        description: '支持变量替换',
      },
      {
        key: 'body',
        label: '请求体',
        type: 'textarea',
        placeholder: '请输入请求体内容，支持变量如 {{input}}...',
      },
      {
        key: 'timeout',
        label: '超时时间(ms)',
        type: 'number',
        default: 30000,
        min: 1000,
        max: 300000,
        description: '请求超时时间，单位毫秒',
      },
      {
        key: 'retries',
        label: '重试次数',
        type: 'number',
        default: 0,
        min: 0,
        max: 5,
        description: '失败时的重试次数',
      },
    ],
  },
  {
    type: 'email',
    label: '邮件发送节点',
    category: NODE_CATEGORIES.OUTPUT,
    icon: '📧',
    description: '发送邮件通知',
    defaultConfig: {
      to: '',
      cc: '',
      subject: '',
      body: '',
      isHtml: false,
    },
    configSchema: [
      {
        key: 'to',
        label: '收件人',
        type: 'text',
        required: true,
        placeholder: 'user@example.com, user2@example.com',
        description: '多个邮箱用逗号分隔',
      },
      {
        key: 'cc',
        label: '抄送',
        type: 'text',
        placeholder: 'cc@example.com',
        description: '抄送邮箱，多个用逗号分隔',
      },
      {
        key: 'subject',
        label: '邮件主题',
        type: 'text',
        required: true,
        placeholder: '工作流执行结果 - {{workflowName}}',
        description: '支持变量替换',
      },
      {
        key: 'body',
        label: '邮件内容',
        type: 'textarea',
        required: true,
        placeholder: '工作流执行完成\n结果：{{result}}',
        description: '支持变量替换和HTML格式',
      },
      {
        key: 'isHtml',
        label: 'HTML格式',
        type: 'boolean',
        default: false,
        description: '是否使用HTML格式发送邮件',
      },
    ],
  },
  {
    type: 'condition',
    label: '条件判断节点',
    category: NODE_CATEGORIES.LOGIC,
    icon: '🔀',
    description: '根据条件进行分支判断',
    defaultConfig: {
      conditions: [
        {
          variable: '',
          operator: 'equals',
          value: '',
          output: 'true',
        },
      ],
      defaultOutput: 'false',
    },
    configSchema: [
      {
        key: 'conditions',
        label: '判断条件',
        type: 'json',
        required: true,
        placeholder:
          '[{"variable": "{{input}}", "operator": "contains", "value": "success", "output": "true"}]',
        description: '设置判断条件和对应的输出',
      },
      {
        key: 'defaultOutput',
        label: '默认输出',
        type: 'text',
        default: 'false',
        description: '所有条件都不满足时的输出',
      },
    ],
  },
  {
    type: 'code',
    label: '代码执行节点',
    category: NODE_CATEGORIES.LOGIC,
    icon: '💻',
    description: '执行自定义JavaScript代码',
    defaultConfig: {
      code: `// 在这里编写你的代码
function execute(input, context) {
  // 处理输入数据
  console.log('输入数据:', input);
  
  // 返回处理结果
  return {
    success: true,
    output: input,
    message: '代码执行成功'
  };
}`,
      timeout: 10000,
    },
    configSchema: [
      {
        key: 'code',
        label: 'JavaScript代码',
        type: 'textarea',
        required: true,
        placeholder: '// 请输入JavaScript代码...',
        description: '代码必须包含execute函数，接收input和context参数',
      },
      {
        key: 'timeout',
        label: '执行超时(ms)',
        type: 'number',
        default: 10000,
        min: 1000,
        max: 60000,
        description: '代码执行超时时间，单位毫秒',
      },
    ],
  },
  {
    type: 'webhook',
    label: 'Webhook节点',
    category: NODE_CATEGORIES.OUTPUT,
    icon: '🔗',
    description: '发送HTTP请求到外部服务',
    defaultConfig: {
      url: '',
      method: 'POST',
      headers: {},
      body: '',
    },
    configSchema: [
      {
        key: 'url',
        label: 'URL地址',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/webhook',
      },
      {
        key: 'method',
        label: '请求方法',
        type: 'select',
        default: 'POST',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
      {
        key: 'headers',
        label: '请求头',
        type: 'json',
        placeholder: '{"Content-Type": "application/json"}',
      },
      {
        key: 'body',
        label: '请求体',
        type: 'textarea',
        placeholder: '请输入请求体内容，支持变量如 {{input}}...',
      },
    ],
  },
  {
    type: 'output',
    label: '输出节点',
    category: NODE_CATEGORIES.OUTPUT,
    icon: '📤',
    description: '工作流的输出节点',
    defaultConfig: {
      format: 'json',
      fields: [],
      name: 'result',
    },
    configSchema: [
      {
        key: 'name',
        label: '输出名称',
        type: 'text',
        default: 'result',
        required: true,
        description: '输出变量的名称',
      },
      {
        key: 'format',
        label: '输出格式',
        type: 'select',
        default: 'json',
        options: [
          { label: 'JSON', value: 'json' },
          { label: '文本', value: 'text' },
          { label: 'HTML', value: 'html' },
          { label: 'CSV', value: 'csv' },
        ],
      },
      {
        key: 'fields',
        label: '输出字段',
        type: 'json',
        placeholder:
          '[{"name": "result", "source": "{{llm.output}}"}, {"name": "confidence", "source": "{{llm.confidence}}"}]',
        description: '定义输出的字段映射',
      },
    ],
  },
]

export const getNodeTypeConfig = (type: string): NodeType | undefined => {
  return nodeTypeConfigs.find((config) => config.type === type)
}

export const getNodeTypesByCategory = (category: string): NodeType[] => {
  return nodeTypeConfigs.filter((config) => config.category === category)
}

export const getAllCategories = () => {
  return Object.values(NODE_CATEGORIES)
}

export const getCategoryLabel = (category: string): string => {
  const labels = {
    [NODE_CATEGORIES.TRIGGER]: '触发器',
    [NODE_CATEGORIES.LLM]: '大模型',
    [NODE_CATEGORIES.KNOWLEDGE]: '知识库',
    [NODE_CATEGORIES.LOGIC]: '逻辑处理',
    [NODE_CATEGORIES.OUTPUT]: '输出',
    [NODE_CATEGORIES.TRANSFORM]: '数据转换',
    [NODE_CATEGORIES.API]: 'API调用',
    [NODE_CATEGORIES.CUSTOM]: '自定义',
  }
  return labels[category] || category
}
