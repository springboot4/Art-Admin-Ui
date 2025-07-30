export type AiWorkflowsDTO = {
  /**
   * 主键
   */
  id?: number | string | null
  /**
   * 应用id
   */
  appId?: number | string | null
  /**
   * 流程类型
   */
  type: string
  /**
   * 流程版本
   */
  version: string
  /**
   * 图信息
   */
  graph: string
  /**
   * 流程配置
   */
  features: string
  /**
   * 环境变量
   */
  environmentVariables: string
  /**
   * 会话变量
   */
  conversationVariables: string
  /**
   * 创建时间
   */
  createTime: string
  /**
   * 创建人
   */
  createBy: string
  /**
   * 更新时间
   */
  updateTime: string
  /**
   * 更新人
   */
  updateBy: string
  /**
   * 租户id
   */
  tenantId: string
}
