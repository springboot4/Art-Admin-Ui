/**
 * 结构化输出类型定义
 */

export type JsonSchemaType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object'

/**
 * JSON Schema 属性定义（递归结构）
 */
export interface JsonSchemaProperty {
  type: JsonSchemaType
  description?: string
  enum?: (string | number | boolean)[]
  minimum?: number
  maximum?: number
  items?: JsonSchemaProperty // 当 type=array 时使用
  properties?: Record<string, JsonSchemaProperty> // 当 type=object 时使用
  required?: string[] // 当 type=object 时使用
  additionalProperties?: boolean // 当 type=object 时使用
}

/**
 * 结构化输出配置
 * 根节点固定为 object 类型
 */
export interface StructuredOutputConfig {
  enabled: boolean
  schema: {
    root: JsonSchemaProperty | null
  }
}
