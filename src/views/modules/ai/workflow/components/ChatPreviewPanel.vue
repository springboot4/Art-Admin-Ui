<template>
  <div v-if="visible" class="chat-preview-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">
          <span class="title-icon">💬</span>
          <h3>对话预览</h3>
        </div>
        <div v-if="sessionId" class="session-id">
          <span class="label">会话ID:</span>
          <code class="session-code">{{ sessionId }}</code>
        </div>
      </div>
      <div class="header-right">
        <Button size="small" type="text" @click="emit('close')">
          <template #icon>
            <CloseOutlined />
          </template>
        </Button>
      </div>
    </div>

    <!-- 对话状态栏 -->
    <div class="chat-status-bar">
      <div class="status-left">
<!--        <div :class="['status-indicator', `status-${currentStatus}`]">-->
<!--          <div class="status-dot">-->
<!--            <LoadingOutlined v-if="currentStatus === 'running'" spin />-->
<!--            <CheckCircleOutlined v-else-if="currentStatus === 'success'" />-->
<!--            <CloseCircleOutlined v-else-if="currentStatus === 'error'" />-->
<!--            <span v-else class="status-icon">⏸</span>-->
<!--          </div>-->
<!--          <span class="status-text">{{ getStatusText() }}</span>-->
<!--        </div>-->
      </div>
      <div class="status-right">
        <Dropdown>
          <Button size="small" type="text">
            <template #icon>
              <MoreOutlined />
            </template>
          </Button>
          <template #overlay>
            <Menu>
              <Menu.Item @click="clearConversation">
                <ClearOutlined />
                清空对话
              </Menu.Item>
              <Menu.Item @click="exportConversation">
                <ExportOutlined />
                导出对话
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </div>

    <!-- 对话消息区域 -->
    <div class="chat-messages-container">
      <div ref="messagesScrollRef" class="messages-scroll-area">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-section">
          <div class="welcome-icon">👋</div>
          <h3 class="welcome-title">开始对话</h3>
          <p class="welcome-description">请输入您的问题,我将为您提供帮助</p>
        </div>

        <!-- 消息列表 -->
        <div v-for="(message, index) in messages" :key="index" class="message-wrapper">
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'" class="message-item user-message">
            <div class="message-avatar user-avatar">
              <UserOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">您</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-text">{{ message.content }}</div>
            </div>
          </div>

          <!-- AI消息 -->
          <div v-if="message.role === 'assistant'" class="message-item assistant-message">
            <div class="message-avatar assistant-avatar">
              <RobotOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">AI助手</span>
                <span v-if="message.nodeName" class="node-badge">{{ message.nodeName }}</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-text">
                <div v-if="message.loading" class="loading-dots">
                  <span></span><span></span><span></span>
                </div>
                <template v-else>
                  {{ message.content }}
                </template>
              </div>
              <!-- 消息操作 -->
              <div v-if="!message.loading" class="message-actions">
                <Button size="small" type="text" @click="copyMessage(message.content)">
                  <template #icon>
                    <CopyOutlined />
                  </template>
                </Button>
                <Button size="small" type="text" @click="retryMessage(index)">
                  <template #icon>
                    <ReloadOutlined />
                  </template>
                </Button>
              </div>
            </div>
          </div>

          <!-- 错误消息 -->
          <div v-if="message.role === 'error'" class="message-item error-message">
            <div class="message-avatar error-avatar">
              <ExclamationCircleOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">错误</span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              <div class="message-text error-text">{{ message.content }}</div>
            </div>
          </div>
        </div>

        <!-- AI思考中提示 -->
        <div v-if="isProcessing && activeNodeMessages.size === 0" class="thinking-indicator">
          <div class="thinking-avatar">
            <RobotOutlined />
          </div>
          <div class="thinking-content">
            <div class="thinking-text">
              <span class="thinking-label">AI正在思考</span>
              <div class="thinking-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 滚动到底部的占位符 -->
        <div ref="messagesEndRef" class="messages-end"></div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-container">
      <div class="input-wrapper">
        <a-textarea
          ref="inputRef"
          v-model:value="inputMessage"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          :disabled="isProcessing"
          :placeholder="isProcessing ? '正在思考中...' : '和Bot聊天'"
          class="chat-input"
          @keydown="handleKeyDown"
        />
        <div class="input-actions">
          <Button
            :disabled="!canSend || isProcessing"
            :loading="isProcessing"
            class="send-button"
            type="primary"
            @click="handleSendMessage"
          >
            <template #icon>
              <SendOutlined v-if="!isProcessing" />
            </template>
            {{ isProcessing ? 'AI思考中...' : '发送' }}
          </Button>
        </div>
      </div>
      <div class="input-tips">
        <span v-if="!isProcessing" class="tip-item">
          <span class="tip-icon">💡</span>
          提示: 按 <kbd>Enter</kbd> 发送,<kbd>Shift + Enter</kbd> 换行
        </span>
        <span v-else class="tip-item processing">
          <LoadingOutlined spin />
          <span class="processing-text">AI正在思考并生成回复...</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
  import { Button, Dropdown, message, Menu } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import {
    CheckCircleOutlined,
    ClearOutlined,
    CloseCircleOutlined,
    CloseOutlined,
    CopyOutlined,
    ExclamationCircleOutlined,
    ExportOutlined,
    LoadingOutlined,
    MoreOutlined,
    ReloadOutlined,
    RobotOutlined,
    SendOutlined,
    UserOutlined,
  } from '@ant-design/icons-vue'
  import { EnhancedSSEService } from '../utils/sseService'
  import type { SSEChunkMessage, SSENodeOutputMessage } from '../types'

  interface Message {
    role: 'user' | 'assistant' | 'error'
    content: string
    timestamp: number
    loading?: boolean
    nodeId?: string // 关联的节点ID
    nodeName?: string // 节点名称
  }

  interface Props {
    visible: boolean
    workflowId: string | null
    initialInputs?: Record<string, any>
  }

  const props = withDefaults(defineProps<Props>(), {
    initialInputs: () => ({}),
  })

  const emit = defineEmits<{
    (e: 'close'): void
  }>()

  // 状态管理
  const messages = ref<Message[]>([])
  const inputMessage = ref('')
  const isProcessing = ref(false)
  const sessionId = ref<string | null>(null)
  const messagesScrollRef = ref<HTMLElement>()
  const messagesEndRef = ref<HTMLElement>()
  const inputRef = ref()

  // SSE连接实例
  let sseService: EnhancedSSEService | null = null

  // 当前正在处理的节点消息映射 (nodeId -> messageIndex)
  const activeNodeMessages = ref<Map<string, number>>(new Map())

  // 计算属性
  const currentStatus = computed(() => {
    if (isProcessing.value) return 'running'
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage?.role === 'error') return 'error'
    if (messages.value.length > 0) return 'success'
    return 'idle'
  })

  const canSend = computed(() => {
    return inputMessage.value.trim().length > 0 && !isProcessing.value
  })

  // 方法
  const getStatusText = () => {
    const statusMap = {
      idle: '等待输入',
      running: '处理中',
      success: '就绪',
      error: '出错',
    }
    return statusMap[currentStatus.value] || '未知状态'
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const scrollToBottom = async () => {
    await nextTick()
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    // Shift + Enter: 换行
    if (event.key === 'Enter' && event.shiftKey) {
      // 允许默认行为(换行)
      return
    }

    // Enter (without Shift): 发送消息
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleSendMessage = async () => {
    if (!canSend.value || !props.workflowId) return

    const userInput = inputMessage.value.trim()
    inputMessage.value = ''

    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    })

    await scrollToBottom()

    isProcessing.value = true

    // 关闭之前的连接(如果存在)
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }

    // 清空节点消息映射
    activeNodeMessages.value.clear()

    try {
      // 生成或更新会话ID
      if (!sessionId.value) {
        sessionId.value = `chat_${Date.now()}`
      }

      // 创建SSE连接
      sseService = new EnhancedSSEService({
        url: '/ai/ai/workflows/runtime/run',
        requestBody: {
          workflowId: props.workflowId,
          inputs: props.initialInputs, // 开始节点的初始输入参数
          systems: {
            query: userInput, // 用户当前输入的消息
          },
        },
        onStart: () => {
          console.log('对话流SSE开始')
        },
        onMessage: (data: SSENodeOutputMessage | SSEChunkMessage) => {
          // 处理chunk消息 - 流式输出
          if ('chunk' in data && data.chunk) {
            const { nodeId, nodeName, chunk } = data

            // 检查该节点是否已有对应的消息
            let messageIndex = activeNodeMessages.value.get(nodeId)

            if (messageIndex === undefined) {
              // 为该节点创建新的AI消息
              messageIndex = messages.value.length
              messages.value.push({
                role: 'assistant',
                content: chunk,
                timestamp: Date.now(),
                loading: true,
                nodeId,
                nodeName,
              })
              activeNodeMessages.value.set(nodeId, messageIndex)
            } else {
              // 追加chunk到已有消息
              const currentMessage = messages.value[messageIndex]
              if (currentMessage) {
                currentMessage.content += chunk
                currentMessage.loading = false
              }
            }

            // 自动滚动到底部
            scrollToBottom()
          }
          // 处理节点完成消息
          else if ('outputs' in data) {
            console.log('节点完成:', data.nodeId, data.nodeName)
          }
        },
        onDone: () => {
          console.log('对话流SSE结束')
          isProcessing.value = false

          // 标记所有活跃节点的消息为完成状态
          activeNodeMessages.value.forEach((messageIndex) => {
            const currentMessage = messages.value[messageIndex]
            if (currentMessage) {
              currentMessage.loading = false
              // 如果没有内容,显示默认消息
              if (!currentMessage.content) {
                currentMessage.content = '(无响应内容)'
              }
            }
          })

          // 如果没有收到任何节点的chunk消息,显示提示
          if (activeNodeMessages.value.size === 0) {
            messages.value.push({
              role: 'assistant',
              content: '工作流执行完成,但未收到任何节点的流式输出',
              timestamp: Date.now(),
              loading: false,
            })
          }

          activeNodeMessages.value.clear()
          scrollToBottom()
        },
        onError: (error) => {
          console.error('SSE连接错误:', error)
          isProcessing.value = false

          // 移除加载消息,添加错误消息
          messages.value.splice(aiMessageIndex, 1)
          messages.value.push({
            role: 'error',
            content: '抱歉,处理您的消息时出现错误,请稍后重试。',
            timestamp: Date.now(),
          })

          message.error('发送消息失败')
          scrollToBottom()
        },
        onClose: () => {
        },
      })

      // 启动SSE连接
      await sseService.connect()
    } catch (error: any) {
      console.error('发送消息失败:', error)
      isProcessing.value = false

      // 移除加载消息,添加错误消息
      messages.value.splice(aiMessageIndex, 1)
      messages.value.push({
        role: 'error',
        content: error.message || '抱歉,处理您的消息时出现错误,请稍后重试。',
        timestamp: Date.now(),
      })

      message.error('发送消息失败')
      await scrollToBottom()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('已复制到剪贴板')
      })
      .catch(() => {
        message.error('复制失败')
      })
  }

  const retryMessage = async (index: number) => {
    // 找到对应的用户消息
    let userMessageIndex = -1
    for (let i = index - 1; i >= 0; i--) {
      if (messages.value[i].role === 'user') {
        userMessageIndex = i
        break
      }
    }

    if (userMessageIndex === -1) return

    const userMessage = messages.value[userMessageIndex].content
    inputMessage.value = userMessage

    // 移除之后的所有消息
    messages.value = messages.value.slice(0, userMessageIndex)

    // 重新发送
    await handleSendMessage()
  }

  const clearConversation = () => {
    messages.value = []
    sessionId.value = null
    message.success('对话已清空')
  }

  const exportConversation = () => {
    const conversationData = {
      sessionId: sessionId.value,
      messages: messages.value,
      exportTime: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation_${sessionId.value || Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    message.success('对话已导出')
  }

  // 监听面板打开,自动聚焦输入框
  watch(
    () => props.visible,
    async (visible) => {
      if (visible) {
        await nextTick()
        inputRef.value?.focus()
      } else {
        // 面板关闭时断开SSE连接
        if (sseService) {
          sseService.disconnect()
          sseService = null
        }
      }
    },
  )

  // 组件卸载时清理SSE连接
  onUnmounted(() => {
    if (sseService) {
      sseService.disconnect()
      sseService = null
    }
  })
</script>

<style lang="less" scoped>
  .chat-preview-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 480px;
    height: 100vh;
    background: #ffffff;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    border-left: 1px solid #e8e8e8;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s ease-out;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  // 面板头部
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);

    .header-left {
      flex: 1;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .title-icon {
        font-size: 18px;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #262626;
      }
    }

    .session-id {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #8c8c8c;

      .label {
        font-weight: 500;
      }

      .session-code {
        background: #f6f6f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
      }
    }
  }

  // 状态栏
  .chat-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;

      .status-dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
      }

      &.status-idle .status-dot {
        background: linear-gradient(135deg, #d9d9d9 0%, #f0f0f0 100%);
        color: #666;
      }

      &.status-running .status-dot {
        background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);
        color: white;
      }

      &.status-success .status-dot {
        background: linear-gradient(135deg, #52c41a 0%, #95de64 100%);
        color: white;
      }

      &.status-error .status-dot {
        background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
        color: white;
      }

      .status-text {
        font-size: 13px;
        font-weight: 500;
        color: #262626;
      }
    }
  }

  // 消息容器
  .chat-messages-container {
    flex: 1;
    overflow: hidden;
    background: #fafafa;

    .messages-scroll-area {
      height: 100%;
      overflow-y: auto;
      padding: 20px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f5f5f5;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;

        &:hover {
          background: #bfbfbf;
        }
      }
    }
  }

  // 欢迎区域
  .welcome-section {
    text-align: center;
    padding: 60px 20px;

    .welcome-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .welcome-title {
      font-size: 20px;
      font-weight: 600;
      color: #262626;
      margin: 0 0 8px 0;
    }

    .welcome-description {
      font-size: 14px;
      color: #8c8c8c;
      margin: 0;
    }
  }

  // 消息项
  .message-wrapper {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .message-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .user-avatar {
      background: linear-gradient(135deg, #1890ff 0%, #69c0ff 100%);
      color: white;
    }

    .assistant-avatar {
      background: linear-gradient(135deg, #52c41a 0%, #95de64 100%);
      color: white;
    }

    .error-avatar {
      background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-wrap: wrap;

      .message-role {
        font-size: 13px;
        font-weight: 600;
        color: #262626;
      }

      .node-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 500;
        background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
        color: #0050b3;
        border: 1px solid #91d5ff;
      }

      .message-time {
        font-size: 12px;
        color: #8c8c8c;
        margin-left: auto;
      }
    }

    .message-text {
      background: white;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.6;
      color: #262626;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    &.user-message .message-text {
      background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
      border: 1px solid #91d5ff;
    }

    &.assistant-message .message-text {
      background: white;
      border: 1px solid #f0f0f0;
    }

    &.error-message .message-text {
      background: #fff1f0;
      border: 1px solid #ffccc7;
      color: #cf1322;
    }

    .message-actions {
      display: flex;
      gap: 4px;
      margin-top: 8px;

      :deep(.ant-btn) {
        color: #8c8c8c;

        &:hover {
          color: #1890ff;
        }
      }
    }
  }

  // 加载动画
  .loading-dots {
    display: flex;
    gap: 4px;
    align-items: center;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #1890ff;
      animation: bounce 1.4s infinite ease-in-out both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
      }
    }
  }

  @keyframes bounce {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  // AI思考中指示器
  .thinking-indicator {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 20px;
    padding: 16px;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 12px;
    border: 1px solid #bae7ff;
    animation: fadeInUp 0.3s ease-out;

    .thinking-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
      animation: pulse 2s infinite;
    }

    .thinking-content {
      flex: 1;
      display: flex;
      align-items: center;
      min-height: 36px;

      .thinking-text {
        display: flex;
        align-items: center;
        gap: 8px;

        .thinking-label {
          font-size: 14px;
          font-weight: 500;
          color: #0050b3;
        }

        .thinking-dots {
          display: flex;
          gap: 4px;
          align-items: center;

          span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #1890ff;
            animation: bounce 1.4s infinite ease-in-out both;

            &:nth-child(1) {
              animation-delay: -0.32s;
            }

            &:nth-child(2) {
              animation-delay: -0.16s;
            }
          }
        }
      }
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(24, 144, 255, 0.5);
    }
  }

  // 输入区域
  .chat-input-container {
    padding: 16px 20px;
    background: white;
    border-top: 1px solid #f0f0f0;

    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 8px;

      .chat-input {
        flex: 1;
        border-radius: 12px;
        border: 2px solid #e8e8e8;
        transition: all 0.2s ease;

        &:hover {
          border-color: #d9d9d9;
        }

        &:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
        }

        &:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        :deep(textarea) {
          resize: none;
        }
      }

      .send-button {
        border-radius: 8px;
        padding: 4px 20px;
        height: auto;
        min-height: 36px;
        font-weight: 500;
        background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
        border: none;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
          background: linear-gradient(135deg, #096dd9 0%, #0050b3 100%);
        }

        &:disabled {
          background: #d9d9d9;
          box-shadow: none;
        }
      }
    }

    .input-tips {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: #8c8c8c;
      min-height: 24px;
      transition: all 0.3s ease;

      .tip-item {
        display: flex;
        align-items: center;
        gap: 6px;

        &.processing {
          color: #1890ff;
          font-weight: 500;
          animation: fadeIn 0.3s ease-out;

          .processing-text {
            animation: fadeIn 0.5s ease-out;
          }
        }
      }

      .tip-icon {
        font-size: 14px;
      }

      kbd {
        padding: 2px 6px;
        background: #f5f5f5;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 11px;
        color: #595959;
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }

  .messages-end {
    height: 1px;
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .chat-preview-panel {
      width: 400px;
    }
  }

  @media (max-width: 768px) {
    .chat-preview-panel {
      width: 100vw;
      right: 0;
    }
  }
</style>
