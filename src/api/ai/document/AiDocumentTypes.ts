export type AiDocumentsDTO = {
  /**
   *
   */
  id?: string
  /**
   * 数据集主键
   */
  datasetId?: string
  /**
   * 文件桶名称
   */
  bucketName?: string
  /**
   * 文件名
   */
  fileName?: string
  /**
   * 文档标题
   */
  title?: string
  /**
   * 文档摘要
   */
  brief?: string
  /**
   * 文档内容
   */
  content?: string
  /**
   * 向量化状态
   */
  embeddingStatus?: string
  /**
   * 向量化状态改变时间
   */
  embeddingStatusChangeTime?: string
  /**
   * 图谱化状态
   */
  graphicalStatus?: string
  /**
   * 图谱状态改变时间
   */
  graphicalStatusChangeTime?: string
  /**
   *
   */
  updateBy?: string
  /**
   *
   */
  updateTime?: string
  /**
   *
   */
  createBy?: string
  /**
   *
   */
  createTime?: string
}
