export type AiConversationsDTO = {
  id?: string
  /**
   * 会话UUID
   */
  conversationUuid?: string
  /**
   * 租户ID（多租户隔离）
   */
  tenantId?: string
  /**
   * 应用ID（关联ai_app表）
   */
  appId?: string
  /**
   * 终端用户ID
   */
  endUserId?: string
  /**
   * 会话标题（自动生成或用户修改）
   */
  name?: string
  /**
   * 会话状态：active-活跃, archived-已归档, deleted-已删除
   */
  status?: string
  /**
   * 消息总数（包括用户和AI消息）
   */
  messageCount?: string
  /**
   * 总Token消耗（累计）
   */
  totalTokens?: string
  /**
   * 总成本
   */
  totalCost?: string
  /**
   * 首条消息时间（用于排序）
   */
  firstMessageAt?: string
  /**
   * 最后消息时间（用于超时判断）
   */
  lastMessageAt?: string
  /**
   * 归档时间
   */
  archivedAt?: string
  /**
   * 创建时间
   */
  createTime?: string
  /**
   * 创建人
   */
  createBy?: string
  /**
   * 更新时间
   */
  updateTime?: string
  /**
   * 更新人
   */
  updateBy?: string
}

export type ConversationCreateDTO = {
  /**
   * 应用ID
   */
  appId: string
  /**
   * 会话标题
   */
  name?: string
}

export type ConversationQueryDTO = {
  /**
   * 应用ID
   */
  appId?: string
  /**
   * 终端用户ID
   */
  endUserId?: string
  /**
   * 会话状态
   */
  status?: string
  /**
   * 会话标题（模糊查询）
   */
  name?: string
}

export type ConversationUpdateNameDTO = {
  /**
   * 会话ID
   */
  conversationId: string
  /**
   * 会话标题
   */
  name: string
}
