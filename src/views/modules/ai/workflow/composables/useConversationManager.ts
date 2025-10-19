import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  page as queryConversations,
  add as createConversation,
} from '/@/api/ai/conversation/AiConversationsIndex'
import type {
  AiConversationsDTO,
  ConversationCreateDTO,
} from '/@/api/ai/conversation/AiConversationsTypes'

/**
 * 会话管理器
 * 负责对话流模式下的会话生命周期管理
 */
export function useConversationManager() {
  // ==================== 状态 ====================
  const currentConversation = ref<AiConversationsDTO | null>(null)
  const conversations = ref<AiConversationsDTO[]>([])
  const isLoading = ref(false)
  const currentAppId = ref<string | null>(null)

  // ==================== 缓存策略 ====================
  const CACHE_KEY_PREFIX = 'chatflow_conversation_'

  /**
   * 获取缓存的会话ID
   */
  const getCachedConversationId = (appId: string): string | null => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${appId}`
      const cached = sessionStorage.getItem(cacheKey)
      if (!cached) return null

      const data = JSON.parse(cached)
      const now = Date.now()
      const CACHE_EXPIRE_TIME = 30 * 60 * 1000 // 30分钟

      // 检查缓存是否过期
      if (now - data.timestamp < CACHE_EXPIRE_TIME) {
        return data.conversationId
      } else {
        // 清除过期缓存
        sessionStorage.removeItem(cacheKey)
        return null
      }
    } catch (error) {
      console.error('[ConversationManager] 读取缓存失败:', error)
      return null
    }
  }

  /**
   * 缓存当前会话ID
   */
  const cacheConversationId = (appId: string, conversationId: string) => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${appId}`
      const data = {
        appId,
        conversationId,
        timestamp: Date.now(),
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(data))
    } catch (error) {
      console.error('[ConversationManager] 缓存失败:', error)
    }
  }

  /**
   * 清除缓存
   */
  const clearCache = (appId: string) => {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${appId}`
      sessionStorage.removeItem(cacheKey)
    } catch (error) {
      console.error('[ConversationManager] 清除缓存失败:', error)
    }
  }

  // ==================== 核心方法 ====================

  /**
   * 初始化会话管理器
   * 1. 查询该appId下的会话列表
   * 2. 按lastMessageAt降序排序，选择最新的会话
   * 3. 如果没有会话，则创建新会话
   */
  const initialize = async (appId: string): Promise<void> => {
    if (!appId) {
      console.error('[ConversationManager] appId不能为空')
      return
    }

    currentAppId.value = appId
    isLoading.value = true

    try {
      // 1. 先尝试从缓存获取会话ID
      const cachedConversationId = getCachedConversationId(appId)
      if (cachedConversationId) {
      }

      // 2. 查询会话列表（不传递status字段）
      const response = await queryConversations({
        appId,
        // 注意：不传递status字段，因为后端现在不使用这个字段
      })

      if (response && response.records) {
        conversations.value = response.records

        // 3. 按lastMessageAt降序排序（最新的在前面）
        const sortedConversations = [...conversations.value].sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
          return timeB - timeA // 降序：最新的在前
        })

        // 4. 如果有缓存的会话ID，优先使用缓存的会话
        if (cachedConversationId) {
          const cachedConversation = sortedConversations.find(
            (conv) => conv.id === cachedConversationId,
          )
          if (cachedConversation) {
            currentConversation.value = cachedConversation
            return
          } else {
            // 缓存的会话不存在，清除缓存
            clearCache(appId)
          }
        }

        // 5. 选择最新的会话（第一个）
        if (sortedConversations.length > 0) {
          currentConversation.value = sortedConversations[0]
          cacheConversationId(appId, currentConversation.value.id!)
        } else {
          // 6. 没有会话，创建新会话
          await createNewConversation()
        }
      } else {
        // 查询失败或没有结果，创建新会话
        await createNewConversation()
      }
    } catch (error: any) {
      console.error('[ConversationManager] 初始化失败:', error)
      // 降级策略：创建新会话
      try {
        await createNewConversation()
      } catch (createError) {
        console.error('[ConversationManager] 创建新会话也失败:', createError)
        message.error('初始化会话失败，请稍后重试')
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 创建新会话
   */
  const createNewConversation = async (name?: string): Promise<AiConversationsDTO | null> => {
    if (!currentAppId.value) {
      console.error('[ConversationManager] appId不能为空')
      return null
    }

    isLoading.value = true

    try {
      const createData: ConversationCreateDTO = {
        appId: currentAppId.value,
        name: name || `对话 ${new Date().toLocaleString()}`,
      }

      const newConversation = await createConversation(createData)

      if (newConversation) {
        // 更新当前会话
        currentConversation.value = newConversation as AiConversationsDTO

        // 添加到会话列表
        conversations.value.unshift(currentConversation.value)

        // 缓存新会话ID
        cacheConversationId(currentAppId.value, currentConversation.value.id!)

        message.success('已创建新会话')

        return currentConversation.value
      } else {
        console.error('[ConversationManager] 创建会话返回空')
        message.error('创建会话失败')
        return null
      }
    } catch (error: any) {
      console.error('[ConversationManager] 创建会话失败:', error)
      message.error('创建会话失败: ' + (error.message || '未知错误'))
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切换会话
   */
  const switchConversation = (conversationId: string) => {
    const conversation = conversations.value.find((conv) => conv.id === conversationId)

    if (conversation) {
      currentConversation.value = conversation
      if (currentAppId.value) {
        cacheConversationId(currentAppId.value, conversationId)
      }
    } else {
      console.warn('[ConversationManager] 会话不存在:', conversationId)
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    currentConversation.value = null
    conversations.value = []
    currentAppId.value = null
    isLoading.value = false
  }

  /**
   * 刷新当前会话信息
   */
  const refreshCurrentConversation = async () => {
    if (!currentConversation.value || !currentAppId.value) {
      return
    }

    try {
      // 重新查询会话列表，找到当前会话
      const response = await queryConversations({
        appId: currentAppId.value,
      })

      if (response && response.records) {
        const updated = response.records.find((conv) => conv.id === currentConversation.value!.id)
        if (updated) {
          currentConversation.value = updated
        }
      }
    } catch (error) {
      console.error('[ConversationManager] 刷新会话失败:', error)
    }
  }

  // ==================== 计算属性 ====================

  const hasConversation = computed(() => currentConversation.value !== null)

  const conversationId = computed(() => currentConversation.value?.id || null)

  const conversationName = computed(() => currentConversation.value?.name || '未命名会话')

  // ==================== 返回 ====================

  return {
    // 状态
    currentConversation,
    conversations,
    isLoading,
    currentAppId,

    // 计算属性
    hasConversation,
    conversationId,
    conversationName,

    // 方法
    initialize,
    createNewConversation,
    switchConversation,
    reset,
    refreshCurrentConversation,
  }
}
