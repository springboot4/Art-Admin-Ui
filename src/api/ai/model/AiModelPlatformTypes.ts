export type AiModelPlatformDTO = {
  /**
   * 主键
   */
  id?: string
  /**
   * 厂商名称
   */
  name?: string
  /**
   * base_url
   */
  baseUrl?: string
  /**
   * api_key
   */
  apiKey?: string
  /**
   * secret_key
   */
  secretKey?: string
  /**
   * 是否启用代理
   */
  proxyEnable?: string
  /**
   * 是否兼容openapi协议
   */
  openaiApiCompatible?: string
  /**
   *
   */
  createTime?: string
  /**
   *
   */
  createBy?: string
  /**
   *
   */
  updateTime?: string
  /**
   *
   */
  updateBy?: string
  /**
   *
   */
  tenantId?: string
}
