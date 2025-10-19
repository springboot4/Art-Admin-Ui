import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { EnhancedSSEService } from '../utils/sseService'
import type { SSEChunkMessage, SSENodeOutputMessage } from '../types'
import type { Message } from './useMessageHistory'

/**
 * 发送消息参数
 */
export interface SendMessageParams {
  conversationId: string
  workflowId: string
  userInput: string
  inputs: Record<string, any> // 开始节点的初始变量
}

/**
 * 消息回调
 */
export interface MessageCallbacks {
  onUserMessage?: (message: Message) => void
  onAssistantMessageStart?: (nodeId: string, nodeName: string) => void
  onAssistantMessageChunk?: (nodeId: string, chunk: string, nodeName: string) => void
  onAssistantMessageComplete?: (nodeId: string, content: string, nodeName: string) => void
  onError?: (error: string) => void
  onDone?: () => void
}

/**
 * 对话流执行器
 * 负责通过sendMessage接口发送消息并处理SSE响应
 */
export function useChatflowExecution() {
  // ==================== 状态 ====================
  const isSending = ref(false)
  const lastError = ref<string | null>(null)

  // SSE连接实例
  let sseService: EnhancedSSEService | null = null

  // 当前正在处理的节点消息映射 (nodeId -> accumulated content)
  const activeNodeContents = ref<Map<string, string>>(new Map())

  // ==================== 核心方法 ====================

  /**
   * 发送消息
   */
  const sendMessage = async (
    params: SendMessageParams,
    callbacks?: MessageCallbacks,
  ): Promise<void> => {
    // ===== 第一步：防重复发送检查 =====
    if (isSending.value) {
      console.warn('[ChatflowExecution] 已有消息正在发送，忽略本次请求')
      message.warning('正在发送消息，请稍候...')
      return
    }

    // ===== 第二步：立即设置发送状态（阻止后续请求）=====
    isSending.value = true
    lastError.value = null

    // ===== 第三步：参数校验（如果失败，重置状态）=====
    const { conversationId, workflowId, userInput, inputs } = params

    if (!conversationId) {
      const errorMsg = '会话ID不能为空'
      console.error('[ChatflowExecution]', errorMsg)
      lastError.value = errorMsg
      isSending.value = false // 重置状态
      callbacks?.onError?.(errorMsg)
      return
    }

    if (!workflowId) {
      const errorMsg = '工作流ID不能为空'
      console.error('[ChatflowExecution]', errorMsg)
      lastError.value = errorMsg
      isSending.value = false // 重置状态
      callbacks?.onError?.(errorMsg)
      return
    }

    if (!userInput.trim()) {
      const errorMsg = '消息内容不能为空'
      console.error('[ChatflowExecution]', errorMsg)
      lastError.value = errorMsg
      isSending.value = false // 重置状态
      callbacks?.onError?.(errorMsg)
      return
    }

    // ===== 第四步：清理之前的状态 =====
    // 清空节点内容映射
    activeNodeContents.value.clear()

    // 关闭之前的连接（如果存在）
    // 注意：必须在设置新的 sseService 之前关闭旧连接，避免 onClose 回调干扰
    const oldService = sseService
    sseService = null // 先清空引用，避免 onClose 回调访问到旧实例
    if (oldService) {
      console.log('[ChatflowExecution] 关闭之前的 SSE 连接（不触发状态重置）')
      oldService.disconnect()
    }

    // ===== 第五步：开始发送流程 =====
    try {
      console.log('[ChatflowExecution] 开始发送消息:', {
        conversationId,
        workflowId,
        userInput: userInput.substring(0, 50) + '...',
        isSending: isSending.value,
      })

      // 触发用户消息回调
      callbacks?.onUserMessage?.({
        role: 'user',
        content: userInput,
        timestamp: Date.now(),
      })

      // 创建SSE连接
      sseService = new EnhancedSSEService({
        url: '/ai/ai/message/send',
        requestBody: {
          conversationId,
          workflowRunInfo: {
            workflowId,
            inputs, // 开始节点的初始输入参数
            systems: {
              query: userInput, // 用户当前输入的消息
            },
          },
        },
        disableRetry: true, // 禁用重试
        onStart: () => {},
        onMessage: (data: SSENodeOutputMessage | SSEChunkMessage) => {
          handleSSEMessage(data, callbacks)
        },
        onDone: () => {
          isSending.value = false

          // 标记所有活跃节点的消息为完成状态
          activeNodeContents.value.forEach((content, nodeId) => {
            callbacks?.onAssistantMessageComplete?.(nodeId, content, '')
          })

          activeNodeContents.value.clear()
          callbacks?.onDone?.()
        },
        onError: (error) => {
          console.error('[ChatflowExecution] SSE连接错误:', error)
          isSending.value = false

          const errorMsg = error.message || '发送消息失败，请稍后重试'
          lastError.value = errorMsg

          callbacks?.onError?.(errorMsg)
          message.error('发送消息失败')
        },
        onClose: () => {
          // 只有当这是当前活动的 SSE 连接时，才处理关闭逻辑
          // 如果 sseService 已经是 null 或指向其他实例，说明这是旧连接，忽略
          if (sseService === null) {
            return
          }

          // 无论如何都要重置 isSending 状态，确保用户可以继续输入
          if (isSending.value) {
            // 标记所有活跃节点的消息为完成状态
            activeNodeContents.value.forEach((content, nodeId) => {
              callbacks?.onAssistantMessageComplete?.(nodeId, content, '')
            })

            activeNodeContents.value.clear()
            isSending.value = false

            // 如果没有收到 [DONE] 事件就关闭了，也触发 onDone 回调
            callbacks?.onDone?.()
          }
        },
      })

      // 启动SSE连接
      await sseService.connect()
    } catch (error: any) {
      console.error('[ChatflowExecution] 发送消息失败:', error)
      isSending.value = false

      const errorMsg = error.message || '发送消息失败，请稍后重试'
      lastError.value = errorMsg

      callbacks?.onError?.(errorMsg)
      message.error('发送消息失败')
    }
  }

  /**
   * 处理SSE消息
   */
  const handleSSEMessage = (
    data: SSENodeOutputMessage | SSEChunkMessage,
    callbacks?: MessageCallbacks,
  ) => {
    // 处理chunk消息 - 流式输出
    if ('chunk' in data && data.chunk) {
      const { nodeId, nodeName, chunk } = data

      // 检查该节点是否已有内容
      let currentContent = activeNodeContents.value.get(nodeId)

      if (currentContent === undefined) {
        // 第一个chunk，通知开始
        currentContent = chunk
        activeNodeContents.value.set(nodeId, currentContent)
        callbacks?.onAssistantMessageStart?.(nodeId, nodeName || '')
      } else {
        // 追加chunk
        currentContent += chunk
        activeNodeContents.value.set(nodeId, currentContent)
      }

      // 触发chunk回调
      callbacks?.onAssistantMessageChunk?.(nodeId, chunk, nodeName || '')
    }
    // 处理节点完成消息
    else if ('outputs' in data) {
      // outputs消息表示节点执行完成，但对于流式输出的节点，内容已经在chunk中接收
      // 这里可以做一些额外的处理，比如更新节点状态等
    }
  }

  /**
   * 取消发送
   */
  const cancelSending = () => {
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }

    isSending.value = false
    activeNodeContents.value.clear()

    message.info('已取消发送')
  }

  /**
   * 重置状态
   */
  const reset = () => {
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }

    isSending.value = false
    lastError.value = null
    activeNodeContents.value.clear()
  }

  // ==================== 返回 ====================

  return {
    // 状态
    isSending,
    lastError,

    // 方法
    sendMessage,
    cancelSending,
    reset,
  }
}
