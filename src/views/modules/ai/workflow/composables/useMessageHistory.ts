import { ref, computed } from 'vue'
import { message as antMessage } from 'ant-design-vue'
import { getRecentMessages } from '/@/api/ai/conversation/AiMessagesIndex'
import type { AiMessagesDTO } from '/@/api/ai/conversation/AiMessagesTypes'

/**
 * UI展示的消息格式
 */
export interface Message {
  role: 'user' | 'assistant' | 'error' | 'system'
  content: string
  timestamp: number
  loading?: boolean
  nodeId?: string
  nodeName?: string
  // 扩展字段（保留原始数据）
  raw?: AiMessagesDTO
}

/**
 * 消息历史管理器
 * 负责加载、管理和格式化历史消息
 */
export function useMessageHistory() {
  // ==================== 状态 ====================
  const messages = ref<Message[]>([])
  const isLoading = ref(false)
  const hasMore = ref(false) // 预留：是否还有更多消息（分页）
  const currentConversationId = ref<string | null>(null)

  // ==================== 工具方法 ====================

  /**
   * 将后端消息格式转换为UI展示格式
   */
  const convertToUIMessage = (dto: AiMessagesDTO): Message => {
    return {
      role: (dto.role as Message['role']) || 'assistant',
      content: dto.content || '',
      timestamp: dto.createTime ? new Date(dto.createTime).getTime() : Date.now(),
      loading: false,
      raw: dto,
    }
  }

  /**
   * 格式化消息列表
   */
  const formatMessages = (dtos: AiMessagesDTO[]): Message[] => {
    return dtos.map(convertToUIMessage)
  }

  // ==================== 核心方法 ====================

  /**
   * 加载会话的历史消息
   * @param conversationId 会话ID
   * @param limit 加载数量，默认50条
   */
  const loadMessages = async (conversationId: string, limit = 50): Promise<void> => {
    if (!conversationId) {
      console.error('[MessageHistory] conversationId不能为空')
      return
    }

    isLoading.value = true
    currentConversationId.value = conversationId

    try {
      const response = await getRecentMessages(conversationId, limit)

      if (response) {
        // 后端返回的可能是单个对象或数组，需要处理
        let messageList: AiMessagesDTO[] = []

        if (Array.isArray(response)) {
          messageList = response
        } else if (response && typeof response === 'object') {
          // 如果是单个对象，包装成数组
          messageList = [response]
        }

        // 转换为UI格式
        messages.value = formatMessages(messageList)

        // 按时间排序（升序：旧消息在前，新消息在后）
        messages.value.sort((a, b) => a.timestamp - b.timestamp)

        // 判断是否还有更多消息（预留分页功能）
        hasMore.value = messageList.length >= limit
      } else {
        messages.value = []
        hasMore.value = false
      }
    } catch (error: any) {
      console.error('[MessageHistory] 加载历史消息失败:', error)
      // 不阻断流程，允许继续对话
      antMessage.warning('加载历史消息失败，将从空白开始对话')
      messages.value = []
      hasMore.value = false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 追加新消息到列表末尾
   */
  const appendMessage = (message: Message) => {
    messages.value.push(message)
  }

  /**
   * 追加用户消息（便捷方法）
   */
  const appendUserMessage = (content: string) => {
    appendMessage({
      role: 'user',
      content,
      timestamp: Date.now(),
    })
  }

  /**
   * 追加AI消息（便捷方法）
   */
  const appendAssistantMessage = (content: string, nodeId?: string, nodeName?: string) => {
    appendMessage({
      role: 'assistant',
      content,
      timestamp: Date.now(),
      loading: false,
      nodeId,
      nodeName,
    })
  }

  /**
   * 追加错误消息（便捷方法）
   */
  const appendErrorMessage = (content: string) => {
    appendMessage({
      role: 'error',
      content,
      timestamp: Date.now(),
    })
  }

  /**
   * 更新指定索引的消息
   */
  const updateMessage = (index: number, updates: Partial<Message>) => {
    if (index >= 0 && index < messages.value.length) {
      // 使用对象展开确保触发响应式更新
      messages.value[index] = {
        ...messages.value[index],
        ...updates,
      }
      // 强制触发数组响应式更新
      messages.value = [...messages.value]
    }
  }

  /**
   * 追加内容到指定消息（用于流式输出）
   */
  const appendToMessage = (index: number, chunk: string) => {
    if (index >= 0 && index < messages.value.length) {
      const currentMessage = messages.value[index]
      // 创建新的消息对象来触发响应式
      messages.value[index] = {
        ...currentMessage,
        content: currentMessage.content + chunk,
      }
      // 强制触发数组响应式更新
      messages.value = [...messages.value]
    }
  }

  /**
   * 根据nodeId查找loading状态的消息索引
   */
  const findLoadingMessageIndex = (nodeId: string): number => {
    return messages.value.findIndex((msg) => msg.nodeId === nodeId && msg.loading)
  }

  /**
   * 删除指定索引的消息
   */
  const removeMessage = (index: number) => {
    if (index >= 0 && index < messages.value.length) {
      messages.value.splice(index, 1)
    }
  }

  /**
   * 清空消息列表
   */
  const clear = () => {
    messages.value = []
    currentConversationId.value = null
    hasMore.value = false
  }

  /**
   * 加载更多历史消息（预留分页功能）
   */
  const loadMore = async () => {
    if (!hasMore.value || !currentConversationId.value) {
      return
    }
  }

  /**
   * 重新加载当前会话的消息
   */
  const reload = async () => {
    if (!currentConversationId.value) {
      console.warn('[MessageHistory] 没有当前会话ID，无法重新加载')
      return
    }

    await loadMessages(currentConversationId.value)
  }

  // ==================== 计算属性 ====================

  const messageCount = computed(() => messages.value.length)

  const hasMessages = computed(() => messages.value.length > 0)

  const lastMessage = computed(() => {
    return messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
  })

  const userMessages = computed(() => {
    return messages.value.filter((msg) => msg.role === 'user')
  })

  const assistantMessages = computed(() => {
    return messages.value.filter((msg) => msg.role === 'assistant')
  })

  // ==================== 返回 ====================

  return {
    // 状态
    messages,
    isLoading,
    hasMore,
    currentConversationId,

    // 计算属性
    messageCount,
    hasMessages,
    lastMessage,
    userMessages,
    assistantMessages,

    // 方法
    loadMessages,
    appendMessage,
    appendUserMessage,
    appendAssistantMessage,
    appendErrorMessage,
    updateMessage,
    appendToMessage,
    findLoadingMessageIndex,
    removeMessage,
    clear,
    loadMore,
    reload,
  }
}
