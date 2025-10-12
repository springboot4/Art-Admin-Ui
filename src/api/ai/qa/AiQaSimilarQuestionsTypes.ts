export type AiQaSimilarQuestionsDTO = {
  /**
   * 主键
   */
  id?: string
  /**
   * 关联的QA对ID
   */
  qaPairId?: string
  /**
   * 相似问题
   */
  similarQuestion?: string
  /**
   * 相似问题Hash
   */
  similarHash?: string
  /**
   * 来源类型(manual/auto)
   */
  sourceType?: string
  /**
   * 创建人
   */
  createBy?: string
  /**
   * 创建时间
   */
  createTime?: string
}
