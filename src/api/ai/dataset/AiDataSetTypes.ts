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
