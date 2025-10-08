export type AiDatasetsDocument = {
  datasetsId?: string
  indexTypes?: string
  fileName?: string
  bucketName?: string
}

export type AiDatasetsDTO = {
  id?: string
  tenantId?: string
  name?: string
  description?: string
  permission?: string
  dataSourceType?: string
  createTime?: string
  createBy?: string
  updateTime?: string
  updateBy?: string
  embeddingModel?: string
  embeddingModelProvider?: string
  collectionBindingId?: string
  retrievalModel?: string
  graphicModel?: string
  graphicModelProvider?: string
}

/**
 * 召回测试请求参数
 */
export type RecallTestRequest = {
  /**
   * 查询语句
   */
  query: string
  /**
   * 数据集ID
   */
  datasetId: string
  /**
   * 检索类型列表
   */
  retrievalTypes: string[]
}

/**
 * 召回测试结果项
 */
export type RecallTestResultItem = {
  /**
   * 文档ID
   */
  documentId: string
  /**
   * 分块ID
   */
  segmentId: string
  /**
   * 内容
   */
  content: string
  /**
   * 相关度分数
   */
  score: number
  /**
   * 检索类型
   */
  retrievalType: string
  /**
   * 元数据
   */
  metadata?: Record<string, any>
}

/**
 * 召回测试响应
 */
export type RecallTestResponse = {
  /**
   * 查询语句
   */
  query: string
  /**
   * 结果列表
   */
  results: RecallTestResultItem[]
  /**
   * 总数量
   */
  totalCount: number
  /**
   * 耗时(ms)
   */
  costTime: string
  /**
   * 类型统计
   */
  typeCount: Record<string, number>
  /**
   * 调试信息
   */
  debugInfo?: Record<string, any>
}
