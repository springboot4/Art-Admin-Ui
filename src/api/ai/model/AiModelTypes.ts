export type AiModelDTO = {
  /**
   * 主键
   */
  id?: string
  /**
   * 模型类型（推理、chat等）
   */
  type?: string
  /**
   * 模型名称
   */
  name?: string
  /**
   * 所属平台
   */
  platform?: string
  /**
   * 是否启用
   */
  enable?: string
  /**
   * 最大输入长度
   */
  maxInputTokens?: string
  /**
   * 最大输出长度
   */
  maxOutputTokens?: string
  /**
   * 模型配置
   */
  config?: string
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
