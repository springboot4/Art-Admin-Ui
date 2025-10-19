export type AiMessagesDTO = {
  /**
   * 主键ID
   */
  id?: string
  /**
   * 消息UUID
   */
  messageUuid?: string
  /**
   * 所属会话ID
   */
  conversationId?: string
  /**
   * 实例ID（工作流或Agent实例，预留字段，后续集成使用）
   */
  instanceId?: string
  /**
   * 实例类型：workflow-工作流, agent-智能体（预留字段，后续集成使用）
   */
  instanceType?: string
  /**
   * 角色：user-用户, assistant-助手, system-系统
   */
  role?: string
  /**
   * 消息类型：text-文本, image-图片, file-文件, audio-音频, video-视频（当前仅支持text）
   */
  messageType?: string
  /**
   * 消息内容（支持大文本）
   */
  content?: string
  /**
   * 模型提供商（如openai、anthropic，仅用于计费审计）
   */
  modelProvider?: string
  /**
   * 模型ID（如gpt-4、claude-3.5-sonnet，仅用于计费审计）
   */
  modelId?: string
  /**
   * 输入Token数（Prompt）
   */
  promptTokens?: string
  /**
   * 输出Token数（Completion）
   */
  completionTokens?: string
  /**
   * 总Token数（prompt_tokens + completion_tokens）
   */
  totalTokens?: string
  /**
   * 总成本
   */
  totalCost?: string
  /**
   * 状态：pending-待处理, completed-已完成, failed-失败
   */
  status?: string
  /**
   * 错误信息（status=failed时记录）
   */
  errorMessage?: string
  /**
   * 扩展元数据（JSON格式，预留扩展，如附件信息等）
   */
  metadata?: string
  /**
   * 创建时间
   */
  createTime?: string
  /**
   * 完成时间
   */
  completedAt?: string
}

export type AiMessageQueryDTO = {
  /**
   * 会话ID
   */
  conversationId?: string
}

export type SendMessageDTO = {
  workflowRunInfo: {
    inputs: Record<string, any>

    systems: Record<string, any>

    workflowId: string
  }
}
