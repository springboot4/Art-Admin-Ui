export type AiQaPairsDTO = {
  /**
   * 主键
   */
  id?: string
  /**
   * 所属数据集ID
   */
  datasetId?: string
  /**
   * 问题
   */
  question?: string
  /**
   * 问题Hash(MD5)
   */
  questionHash?: string
  /**
   * 答案
   */
  answer?: string
  /**
   * 优先级(1-5)
   */
  priority?: string
  /**
   * 是否启用
   */
  enabled?: boolean
  /**
   * 命中次数
   */
  hitCount?: number
  /**
   * 最后命中时间
   */
  lastHitTime?: string
  /**
   * 是否已向量化
   */
  vectorIndexed?: boolean
  /**
   * 向量ID
   */
  vectorId?: string
  /**
   * 来源类型(manual/llm/import)
   */
  sourceType?: string
  /**
   * 租户ID
   */
  tenantId?: string
  /**
   * 创建人
   */
  createBy?: string
  /**
   * 创建时间
   */
  createTime?: string
  /**
   * 更新人
   */
  updateBy?: string
  /**
   * 更新时间
   */
  updateTime?: string
}
