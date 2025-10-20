<template>
  <div v-if="visible" class="chat-preview-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">
          <span class="title-icon">💬</span>
          <h3>对话预览</h3>
        </div>
        <div v-if="conversationManager.conversationId.value" class="session-info">
          <span class="label">会话:</span>
          <!-- 编辑模式 -->
          <div v-if="isEditingName" class="session-name-editor">
            <a-input
              ref="nameInputRef"
              v-model:value="editingName"
              size="small"
              class="session-name-input"
              :maxlength="50"
              @blur="handleNameBlur"
              @keydown="handleNameKeydown"
            />
            <div class="edit-actions">
              <Button size="small" type="text" class="action-btn save-btn" @click="handleSaveName">
                <CheckOutlined />
              </Button>
              <Button
                size="small"
                type="text"
                class="action-btn cancel-btn"
                @click="handleCancelEdit"
              >
                <CloseOutlined />
              </Button>
            </div>
          </div>
          <!-- 显示模式 -->
          <div v-else class="session-name-display" @dblclick="startEditName">
            <code class="session-code">{{ conversationManager.conversationName.value }}</code>
            <Button size="small" type="text" class="edit-btn" @click="startEditName">
              <EditOutlined />
            </Button>
          </div>
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
        <div v-if="conversationManager.isLoading.value" class="status-indicator">
          <LoadingOutlined spin />
          <span class="status-text">加载会话中...</span>
        </div>
        <div v-else-if="messageHistory.isLoading.value" class="status-indicator">
          <LoadingOutlined spin />
          <span class="status-text">加载历史消息...</span>
        </div>
      </div>
      <div class="status-right">
        <!-- 初始参数按钮 -->
        <Button
          v-if="hasInitialInputs"
          size="small"
          type="text"
          class="initial-inputs-btn"
          @click="toggleInitialInputs"
        >
          <template #icon>
            <FormOutlined />
          </template>
          初始参数
        </Button>
        <Dropdown>
          <Button size="small" type="text">
            <template #icon>
              <MoreOutlined />
            </template>
          </Button>
          <template #overlay>
            <Menu>
              <!--              <Menu.Item @click="handleClearConversation">-->
              <!--                <ClearOutlined />-->
              <!--                清空对话-->
              <!--              </Menu.Item>-->
              <!--              <Menu.Item @click="handleExportConversation">-->
              <!--                <ExportOutlined />-->
              <!--                导出对话-->
              <!--              </Menu.Item>-->
              <!--              <Menu.Divider />-->
              <Menu.Item @click="handleCreateNewConversation">
                <PlusOutlined />
                新建会话
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </div>

    <!-- 初始参数展示区域 -->
    <transition name="slide-down">
      <div v-if="hasInitialInputs && showInitialInputs" class="initial-inputs-panel">
        <div class="panel-title-row">
          <div class="title-content">
            <FormOutlined class="title-icon" />
            <span class="title-text">初始参数</span>
          </div>
          <div class="title-actions">
            <Button
              v-if="!isEditingInputs"
              size="small"
              type="text"
              class="edit-btn"
              @click="startEditInputs"
            >
              <EditOutlined />
              编辑
            </Button>
            <template v-else>
              <Button size="small" type="text" class="save-btn" @click="saveEditInputs">
                <CheckOutlined />
                保存
              </Button>
              <Button size="small" type="text" class="cancel-btn" @click="cancelEditInputs">
                <CloseOutlined />
                取消
              </Button>
            </template>
          </div>
        </div>
        <div class="inputs-content">
          <!-- 查看模式 -->
          <div v-if="!isEditingInputs" class="inputs-view">
            <div v-for="(value, key) in currentInputs" :key="`view-${key}`" class="input-item-view">
              <div class="input-label">
                {{ getInputDisplayName(key) }}
                <span
                  v-if="getInputSchema(key)"
                  :class="['type-badge-small', `type-${getInputSchema(key).dataType}`]"
                >
                  {{ getTypeDisplayName(getInputSchema(key).dataType) }}
                </span>
              </div>
              <!-- 布尔值特殊展示 -->
              <div v-if="getInputDataType(key) === 'boolean'" class="input-value boolean-value">
                <span :class="['boolean-badge', value ? 'is-true' : 'is-false']">
                  {{ value ? '✓ 是' : '✗ 否' }}
                </span>
              </div>
              <!-- JSON/数组特殊展示 -->
              <div
                v-else-if="getInputDataType(key) === 'json' || getInputDataType(key) === 'array'"
                class="input-value code-value"
              >
                {{ formatJsonValue(value) }}
              </div>
              <!-- 普通值 -->
              <div v-else class="input-value">{{ value }}</div>
            </div>
          </div>
          <!-- 编辑模式 -->
          <div v-else class="inputs-edit">
            <div v-for="(value, key) in editingInputs" :key="`edit-${key}`" class="input-item-edit">
              <div class="input-label-edit">
                {{ getInputDisplayName(key) }}
                <span
                  v-if="getInputSchema(key)"
                  :class="['type-badge', `type-${getInputSchema(key).dataType}`]"
                >
                  {{ getTypeDisplayName(getInputSchema(key).dataType) }}
                </span>
              </div>

              <!-- 字符串类型 -->
              <a-input
                v-if="getInputDataType(key) === 'string' || !getInputDataType(key)"
                v-model:value="editingInputs[key]"
                :placeholder="`请输入${getInputDisplayName(key)}`"
                class="input-field"
              />

              <!-- 多行文本 -->
              <a-textarea
                v-else-if="getInputDataType(key) === 'text'"
                v-model:value="editingInputs[key]"
                :placeholder="`请输入${getInputDisplayName(key)}`"
                :rows="3"
                class="input-field textarea-field"
              />

              <!-- 数字类型 -->
              <a-input-number
                v-else-if="getInputDataType(key) === 'number'"
                v-model:value="editingInputs[key]"
                :placeholder="`请输入${getInputDisplayName(key)}`"
                class="input-field number-field"
                style="width: 100%"
              />

              <!-- 布尔类型 -->
              <div v-else-if="getInputDataType(key) === 'boolean'" class="switch-field">
                <a-switch v-model:checked="editingInputs[key]" class="modern-switch" />
                <span class="switch-label">
                  {{ editingInputs[key] ? '是' : '否' }}
                </span>
              </div>

              <!-- JSON/数组类型 -->
              <a-textarea
                v-else-if="getInputDataType(key) === 'json' || getInputDataType(key) === 'array'"
                v-model:value="editingInputs[key]"
                :placeholder="
                  getInputDataType(key) === 'array' ? '请输入数组格式' : '请输入JSON格式'
                "
                :rows="4"
                class="input-field code-field"
              />

              <!-- 默认字符串 -->
              <a-input
                v-else
                v-model:value="editingInputs[key]"
                :placeholder="`请输入${getInputDisplayName(key)}`"
                class="input-field"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 对话消息区域 -->
    <div class="chat-messages-container">
      <div ref="messagesScrollRef" class="messages-scroll-area">
        <!-- 欢迎消息 -->
        <div
          v-if="messageHistory.messages.value.length === 0 && !messageHistory.isLoading.value"
          class="welcome-section"
        >
          <div class="welcome-icon">👋</div>
          <h3 class="welcome-title">开始对话</h3>
          <p class="welcome-description">请输入您的问题,我将为您提供帮助</p>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(msg, index) in messageHistory.messages.value"
          :key="index"
          class="message-wrapper"
        >
          <!-- 用户消息 -->
          <div v-if="msg.role === 'user'" class="message-item user-message">
            <div class="message-avatar user-avatar">
              <UserOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">您</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-text">{{ msg.content }}</div>
            </div>
          </div>

          <!-- AI消息 -->
          <div v-if="msg.role === 'assistant'" class="message-item assistant-message">
            <div class="message-avatar assistant-avatar">
              <RobotOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">AI助手</span>
                <span v-if="msg.nodeName" class="node-badge">{{ msg.nodeName }}</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-text">
                <!-- 使用 Markdown 渲染器渲染内容 -->
                <MarkdownRenderer v-if="msg.content" :content="msg.content" />
                <!-- 如果正在加载且没有内容，显示等待提示 -->
                <span v-else-if="msg.loading" class="thinking-text">思考中...</span>
                <!-- 加载时在内容后显示光标 -->
                <span v-if="msg.loading && msg.content" class="typing-cursor">▊</span>
              </div>
              <!-- 消息操作 -->
              <div v-if="!msg.loading" class="message-actions">
                <Button size="small" type="text" @click="copyMessage(msg.content)">
                  <template #icon>
                    <CopyOutlined />
                  </template>
                </Button>
              </div>
            </div>
          </div>

          <!-- 错误消息 -->
          <div v-if="msg.role === 'error'" class="message-item error-message">
            <div class="message-avatar error-avatar">
              <ExclamationCircleOutlined />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">错误</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-text error-text">{{ msg.content }}</div>
            </div>
          </div>
        </div>

        <!-- AI思考中提示 - 只在发送中且没有任何loading消息时显示 -->
        <div v-if="showThinkingIndicator" class="thinking-indicator">
          <div class="thinking-avatar">
            <RobotOutlined />
          </div>
          <div class="thinking-content">
            <div class="thinking-text">
              <span class="thinking-label">AI正在思考</span>
              <div class="thinking-dots"> <span></span><span></span><span></span> </div>
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
          :disabled="isSending || !conversationManager.hasConversation.value"
          :placeholder="getInputPlaceholder()"
          class="chat-input"
          @keydown="handleKeyDown"
        />
        <div class="input-actions">
          <Button
            :disabled="!canSend"
            :loading="isSending"
            class="send-button"
            type="primary"
            @click="handleSendMessage"
          >
            <template #icon>
              <SendOutlined v-if="!isSending" />
            </template>
            {{ isSending ? 'AI思考中...' : '发送' }}
          </Button>
        </div>
      </div>
      <div class="input-tips">
        <span v-if="!isSending" class="tip-item">
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
  import { useRoute } from 'vue-router'
  import {
    Button,
    Dropdown,
    Input as AInput,
    InputNumber as AInputNumber,
    message,
    Menu,
    Switch as ASwitch,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import {
    CheckOutlined,
    CloseOutlined,
    CopyOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    FormOutlined,
    LoadingOutlined,
    MoreOutlined,
    PlusOutlined,
    RobotOutlined,
    SendOutlined,
    UserOutlined,
  } from '@ant-design/icons-vue'
  import { useConversationManager } from '../composables/useConversationManager'
  import { useMessageHistory } from '../composables/useMessageHistory'
  import { useChatflowExecution } from '../composables/useChatflowExecution'
  import { updateName } from '/@/api/ai/conversation/AiConversationsIndex'
  import MarkdownRenderer from './MarkdownRenderer.vue'

  interface UserInput {
    name: string
    displayName?: string
    dataType: 'string' | 'text' | 'number' | 'boolean' | 'json' | 'array'
    description?: string
    required: boolean
    defaultValue?: any
  }

  interface Props {
    visible: boolean
    workflowId: string | null
    initialInputs?: Record<string, any>
    userInputsSchema?: UserInput[]
  }

  const props = withDefaults(defineProps<Props>(), {
    initialInputs: () => ({}),
    userInputsSchema: () => [],
  })

  const emit = defineEmits<{
    (e: 'close'): void
  }>()

  // ==================== 路由参数 ====================
  const route = useRoute()
  const appId = ref(route.query.appId as string)

  // ==================== Composables ====================
  const conversationManager = useConversationManager()
  const messageHistory = useMessageHistory()
  const chatflowExecution = useChatflowExecution()

  // ==================== 本地状态 ====================
  const inputMessage = ref('')
  const messagesScrollRef = ref<HTMLElement>()
  const messagesEndRef = ref<HTMLElement>()
  const inputRef = ref()

  // 会话名称编辑相关
  const isEditingName = ref(false)
  const editingName = ref('')
  const nameInputRef = ref()

  // 初始表单相关
  const showInitialInputs = ref(false)
  const isEditingInputs = ref(false)
  const editingInputs = ref<Record<string, any>>({})
  const currentInputs = ref<Record<string, any>>({})

  // ==================== 计算属性 ====================

  /**
   * 是否有初始输入参数
   */
  const hasInitialInputs = computed(() => {
    return Object.keys(currentInputs.value).length > 0
  })

  /**
   * 是否可以发送消息
   * 必须同时满足：有输入内容、没有正在发送、有会话
   */
  const canSend = computed(() => {
    return (
      inputMessage.value.trim().length > 0 &&
      !chatflowExecution.isSending.value &&
      conversationManager.hasConversation.value
    )
  })

  /**
   * 是否正在发送（直接使用 composable 状态）
   */
  const isSending = computed(() => {
    return chatflowExecution.isSending.value
  })

  /**
   * 是否显示"AI正在思考"提示
   * 条件：正在发送 且 没有任何loading状态的消息
   */
  const showThinkingIndicator = computed(() => {
    if (!isSending.value) {
      return false
    }
    // 检查是否有loading状态的消息（已经开始接收chunk）
    const hasLoadingMessage = messageHistory.messages.value.some((msg) => msg.loading === true)
    // 只有在没有loading消息时才显示思考提示
    return !hasLoadingMessage
  })

  // ==================== 方法 ====================

  /**
   * 获取输入框占位符
   */
  const getInputPlaceholder = () => {
    if (!conversationManager.hasConversation.value) {
      return '正在初始化会话...'
    }
    if (isSending.value) {
      return '正在思考中...'
    }
    return '和Bot聊天'
  }

  /**
   * 格式化时间
   */
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  /**
   * 滚动到底部
   */
  const scrollToBottom = async () => {
    await nextTick()
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    // Shift + Enter: 换行
    if (event.key === 'Enter' && event.shiftKey) {
      return
    }

    // Enter (without Shift): 发送消息
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  /**
   * 发送消息
   * 核心逻辑：
   * 1. 验证发送条件
   * 2. 立即清空输入框（防止重复发送）
   * 3. 调用 sendMessage（内部会设置 isSending = true）
   * 4. 等待 onDone 回调（内部会设置 isSending = false）
   */
  const handleSendMessage = async () => {
    // 1. 前置验证
    if (!canSend.value) {
      return
    }

    if (!props.workflowId) {
      console.error('[ChatPreview] workflowId 不存在')
      return
    }

    if (!conversationManager.conversationId.value) {
      message.warning('会话未初始化，请稍候...')
      return
    }

    // 2. 立即保存用户输入并清空输入框（防止用户继续输入）
    const userInput = inputMessage.value.trim()
    inputMessage.value = ''
    await nextTick()

    // 3. 调用发送方法（内部会立即设置 isSending = true）
    await chatflowExecution.sendMessage(
      {
        conversationId: conversationManager.conversationId.value,
        workflowId: props.workflowId,
        userInput,
        inputs: currentInputs.value,
      },
      {
        // 用户消息回调
        onUserMessage: (msg) => {
          messageHistory.appendMessage(msg)
          scrollToBottom()
        },

        // AI消息开始回调
        onAssistantMessageStart: (nodeId, nodeName) => {
          messageHistory.appendMessage({
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            loading: true,
            nodeId,
            nodeName,
          })
          scrollToBottom()
        },

        // AI消息chunk回调
        onAssistantMessageChunk: (nodeId, chunk) => {
          const index = messageHistory.findLoadingMessageIndex(nodeId)
          if (index !== -1) {
            messageHistory.appendToMessage(index, chunk)
            scrollToBottom()
          }
        },

        // AI消息完成回调
        onAssistantMessageComplete: (nodeId) => {
          const index = messageHistory.findLoadingMessageIndex(nodeId)
          if (index !== -1) {
            messageHistory.updateMessage(index, { loading: false })
          }
          scrollToBottom()
        },

        // 错误回调
        onError: (error) => {
          messageHistory.appendErrorMessage(error)
          scrollToBottom()
        },

        // 完成回调（此时 isSending 会被设置为 false）
        onDone: () => {
          conversationManager.refreshCurrentConversation()
        },
      },
    )
  }

  /**
   * 复制消息
   */
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

  /**
   * 清空对话
   */
  const handleClearConversation = () => {
    messageHistory.clear()
    message.success('对话已清空')
  }

  /**
   * 导出对话
   */
  const handleExportConversation = () => {
    const conversationData = {
      conversationId: conversationManager.conversationId.value,
      conversationName: conversationManager.conversationName.value,
      messages: messageHistory.messages.value,
      exportTime: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation_${conversationManager.conversationId.value || Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    message.success('对话已导出')
  }

  /**
   * 新建会话
   */
  const handleCreateNewConversation = async () => {
    await conversationManager.createNewConversation()
    messageHistory.clear()
    message.success('已创建新会话')
  }

  /**
   * 开始编辑会话名称
   */
  const startEditName = async () => {
    if (!conversationManager.currentConversation.value) {
      return
    }
    editingName.value = conversationManager.conversationName.value
    isEditingName.value = true
    await nextTick()
    nameInputRef.value?.focus()
  }

  /**
   * 取消编辑
   */
  const handleCancelEdit = () => {
    isEditingName.value = false
    editingName.value = ''
  }

  /**
   * 保存会话名称
   */
  const handleSaveName = async () => {
    const newName = editingName.value.trim()

    // 验证
    if (!newName) {
      message.warning('会话名称不能为空')
      return
    }

    if (newName === conversationManager.conversationName.value) {
      // 名称没有变化，直接关闭编辑
      handleCancelEdit()
      return
    }

    if (!conversationManager.conversationId.value) {
      message.error('会话ID不存在')
      handleCancelEdit()
      return
    }

    try {
      // 调用API更新名称
      await updateName({
        conversationId: conversationManager.conversationId.value,
        name: newName,
      })

      // 更新本地状态
      if (conversationManager.currentConversation.value) {
        conversationManager.currentConversation.value.name = newName
      }

      message.success('会话名称已更新')
      handleCancelEdit()
    } catch (error: any) {
      console.error('[ChatPreview] 更新会话名称失败:', error)
      message.error('更新会话名称失败: ' + (error.message || '未知错误'))
    }
  }

  /**
   * 处理输入框失焦（延迟触发，避免与按钮点击冲突）
   */
  const handleNameBlur = () => {
    setTimeout(() => {
      if (isEditingName.value) {
        handleSaveName()
      }
    }, 200)
  }

  /**
   * 处理会话名称输入框的键盘事件
   */
  const handleNameKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveName()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelEdit()
    }
  }

  /**
   * 切换显示初始表单
   */
  const toggleInitialInputs = () => {
    showInitialInputs.value = !showInitialInputs.value
  }

  /**
   * 开始编辑初始输入
   */
  const startEditInputs = () => {
    // 复制当前数据到编辑状态
    const copied: Record<string, any> = {}

    for (const key in currentInputs.value) {
      const schema = getInputSchema(key)
      let value = currentInputs.value[key]

      // JSON和数组类型需要转换为字符串以供编辑
      if (schema && (schema.dataType === 'json' || schema.dataType === 'array')) {
        if (typeof value === 'object') {
          copied[key] = JSON.stringify(value, null, 2)
        } else {
          copied[key] = value || ''
        }
      } else {
        copied[key] = value
      }
    }

    editingInputs.value = copied
    isEditingInputs.value = true
  }

  /**
   * 取消编辑初始输入
   */
  const cancelEditInputs = () => {
    isEditingInputs.value = false
    editingInputs.value = {}
  }

  /**
   * 保存初始输入
   */
  const saveEditInputs = () => {
    // 验证和处理数据
    const processedInputs: Record<string, any> = {}

    for (const key in editingInputs.value) {
      const schema = getInputSchema(key)
      let value = editingInputs.value[key]

      if (schema) {
        // 处理JSON和数组类型
        if (schema.dataType === 'json' || schema.dataType === 'array') {
          if (value && typeof value === 'string') {
            try {
              value = JSON.parse(value)
            } catch (error) {
              message.error(`${schema.displayName || key} 的JSON格式不正确`)
              return
            }
          } else if (!value) {
            value = schema.dataType === 'array' ? [] : {}
          }
        }
      }

      processedInputs[key] = value
    }

    currentInputs.value = processedInputs
    isEditingInputs.value = false
    message.success('初始参数已更新')
  }

  /**
   * 获取输入字段的schema
   */
  const getInputSchema = (name: string): UserInput | undefined => {
    return props.userInputsSchema?.find((input) => input.name === name)
  }

  /**
   * 获取输入字段的显示名称
   */
  const getInputDisplayName = (name: string): string => {
    const schema = getInputSchema(name)
    return schema?.displayName || name
  }

  /**
   * 获取输入字段的数据类型
   */
  const getInputDataType = (name: string): string => {
    const schema = getInputSchema(name)
    return schema?.dataType || 'string'
  }

  /**
   * 获取数据类型显示名称
   */
  const getTypeDisplayName = (dataType: string): string => {
    const typeMap: Record<string, string> = {
      string: '文本',
      text: '长文本',
      number: '数字',
      boolean: '布尔',
      json: 'JSON',
      array: '数组',
    }
    return typeMap[dataType] || '文本'
  }

  /**
   * 格式化JSON值用于展示
   */
  const formatJsonValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // ==================== 生命周期 ====================

  /**
   * 监听 isSending 状态变化（用于调试）
   */
  watch(
    () => chatflowExecution.isSending.value,
    (newVal, oldVal) => {},
  )

  /**
   * 监听面板打开，初始化会话和消息
   */
  watch(
    () => props.visible,
    async (visible) => {
      if (visible && appId.value) {
        // 1. 初始化当前输入参数
        currentInputs.value = { ...props.initialInputs }

        // 2. 初始化会话管理器
        await conversationManager.initialize(appId.value)

        // 3. 加载历史消息
        if (conversationManager.conversationId.value) {
          await messageHistory.loadMessages(conversationManager.conversationId.value)
          await scrollToBottom()
        }

        // 4. 聚焦输入框
        await nextTick()
        inputRef.value?.focus()
      } else if (!visible) {
        // 面板关闭时清理
        chatflowExecution.reset()
        showInitialInputs.value = false
        isEditingInputs.value = false
      }
    },
  )

  /**
   * 组件卸载时清理
   */
  onUnmounted(() => {
    chatflowExecution.reset()
    conversationManager.reset()
    messageHistory.clear()
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

    .session-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #8c8c8c;

      .label {
        font-weight: 500;
      }

      // 显示模式
      .session-name-display {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
        cursor: pointer;

        &:hover {
          background: rgba(0, 0, 0, 0.02);

          .edit-btn {
            opacity: 1;
          }
        }

        .session-code {
          background: transparent;
          padding: 0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          color: #262626;
          font-weight: 500;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .edit-btn {
          opacity: 0;
          transition: opacity 0.2s ease;
          color: #8c8c8c;
          padding: 0 4px;
          height: 20px;
          min-width: 20px;

          &:hover {
            color: #1890ff;
          }

          :deep(.anticon) {
            font-size: 12px;
          }
        }
      }

      // 编辑模式
      .session-name-editor {
        display: flex;
        align-items: center;
        gap: 6px;

        .session-name-input {
          width: 200px;
          border-radius: 6px;
          border: 2px solid #1890ff;
          transition: all 0.2s ease;

          &:focus {
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
          }

          :deep(.ant-input) {
            font-size: 12px;
            padding: 2px 8px;
            height: 24px;
          }
        }

        .edit-actions {
          display: flex;
          gap: 2px;

          .action-btn {
            padding: 0 4px;
            height: 24px;
            min-width: 24px;
            border-radius: 4px;
            transition: all 0.2s ease;

            :deep(.anticon) {
              font-size: 12px;
            }
          }

          .save-btn {
            color: #52c41a;

            &:hover {
              background: rgba(82, 196, 26, 0.1);
              color: #389e0d;
            }
          }

          .cancel-btn {
            color: #ff4d4f;

            &:hover {
              background: rgba(255, 77, 79, 0.1);
              color: #cf1322;
            }
          }
        }
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
    min-height: 48px;

    .status-left {
      flex: 1;
    }

    .status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #1890ff;

      .status-text {
        font-weight: 500;
      }
    }

    .initial-inputs-btn {
      color: #1890ff;
      font-size: 13px;

      &:hover {
        background: rgba(24, 144, 255, 0.08);
      }

      :deep(.anticon) {
        font-size: 14px;
      }
    }
  }

  // 初始参数面板
  .initial-inputs-panel {
    background: #ffffff;
    border-bottom: 1px solid #f0f0f0;
    padding: 12px 20px 16px;

    .panel-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .title-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .title-icon {
          font-size: 14px;
          color: #1890ff;
        }

        .title-text {
          font-size: 13px;
          font-weight: 600;
          color: #262626;
        }
      }

      .title-actions {
        display: flex;
        gap: 6px;

        :deep(.ant-btn) {
          font-size: 12px;
          padding: 0 8px;
          height: 24px;
        }

        .edit-btn {
          color: #1890ff;

          &:hover {
            background: rgba(24, 144, 255, 0.08);
          }
        }

        .save-btn {
          color: #52c41a;

          &:hover {
            background: rgba(82, 196, 26, 0.08);
          }
        }

        .cancel-btn {
          color: #8c8c8c;

          &:hover {
            background: rgba(0, 0, 0, 0.04);
          }
        }
      }
    }

    .inputs-content {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 12px;
    }

    // 查看模式
    .inputs-view {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .input-item-view {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .input-label {
          font-size: 11px;
          font-weight: 600;
          color: #8c8c8c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;

          .type-badge-small {
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;

            &.type-string {
              background: #e6f7ff;
              color: #1890ff;
            }

            &.type-text {
              background: #e6fffb;
              color: #13c2c2;
            }

            &.type-number {
              background: #f6ffed;
              color: #52c41a;
            }

            &.type-boolean {
              background: #fff7e6;
              color: #fa8c16;
            }

            &.type-json {
              background: #f9f0ff;
              color: #722ed1;
            }

            &.type-array {
              background: #fff0f6;
              color: #eb2f96;
            }
          }
        }

        .input-value {
          font-size: 13px;
          color: #262626;
          padding: 8px 10px;
          background: #ffffff;
          border: 1px solid #e8e8e8;
          border-radius: 6px;
          word-break: break-word;

          &.boolean-value {
            padding: 6px 10px;
            border: none;
            background: transparent;

            .boolean-badge {
              display: inline-flex;
              align-items: center;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;

              &.is-true {
                background: #f6ffed;
                color: #52c41a;
                border: 1px solid #b7eb8f;
              }

              &.is-false {
                background: #fff1f0;
                color: #ff4d4f;
                border: 1px solid #ffccc7;
              }
            }
          }

          &.code-value {
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 12px;
            background: #f7fafc;
            white-space: pre-wrap;
          }
        }
      }
    }

    // 编辑模式
    .inputs-edit {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .input-item-edit {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .input-label-edit {
          font-size: 12px;
          font-weight: 600;
          color: #595959;
          display: flex;
          align-items: center;
          gap: 8px;

          .type-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;

            &.type-string {
              background: #ebf8ff;
              color: #2b6cb0;
              border: 1px solid #bee3f8;
            }

            &.type-text {
              background: #e6fffa;
              color: #285e61;
              border: 1px solid #9decf9;
            }

            &.type-number {
              background: #f0fff4;
              color: #276749;
              border: 1px solid #9ae6b4;
            }

            &.type-boolean {
              background: #fffaf0;
              color: #c05621;
              border: 1px solid #fbd38d;
            }

            &.type-json {
              background: #faf5ff;
              color: #553c9a;
              border: 1px solid #c4b5fd;
            }

            &.type-array {
              background: #fdf2f8;
              color: #97266d;
              border: 1px solid #f3e8ff;
            }
          }
        }

        .input-field {
          border-radius: 6px;
          border: 2px solid #e8e8e8;
          transition: all 0.2s ease;

          &:hover {
            border-color: #d9d9d9;
          }

          &:focus-within {
            border-color: #1890ff;
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
          }

          :deep(.ant-input) {
            font-size: 13px;
          }

          &.textarea-field {
            :deep(textarea) {
              font-size: 13px;
            }
          }

          &.code-field {
            :deep(textarea) {
              font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
              font-size: 12px;
              background: #f7fafc;
            }
          }

          &.number-field {
            :deep(.ant-input-number-input) {
              font-size: 13px;
            }
          }
        }

        .switch-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #f7fafc;
          border: 2px solid #e8e8e8;
          border-radius: 6px;
          transition: all 0.2s ease;

          &:hover {
            border-color: #d9d9d9;
            background: #edf2f7;
          }

          .modern-switch {
            :deep(.ant-switch) {
              background: #d9d9d9;

              &.ant-switch-checked {
                background: #1890ff;
              }
            }
          }

          .switch-label {
            font-size: 13px;
            font-weight: 500;
            color: #595959;
          }
        }
      }
    }
  }

  // 滑入动画
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 400px;
    overflow: hidden;
  }

  .slide-down-enter-from,
  .slide-down-leave-to {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
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
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .message-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .user-avatar {
      background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
      color: white;
    }

    .assistant-avatar {
      background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
      color: white;
    }

    .error-avatar {
      background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
      color: white;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 75%;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-wrap: wrap;

      .message-role {
        font-size: 12px;
        font-weight: 600;
        color: #595959;
      }

      .node-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 500;
        background: #f0f5ff;
        color: #1890ff;
        border: 1px solid #d6e4ff;
      }

      .message-time {
        font-size: 11px;
        color: #bfbfbf;
      }
    }

    .message-text {
      background: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
      color: #262626;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      word-wrap: break-word;
      white-space: pre-wrap;
      position: relative;
      display: inline-block;
      width: fit-content;

      // 思考中文本样式
      .thinking-text {
        color: #8c8c8c;
        font-style: italic;
      }

      // 打字机光标样式
      .typing-cursor {
        display: inline-block;
        margin-left: 2px;
        color: #1890ff;
        animation: blink 1s step-end infinite;
      }
    }

    @keyframes blink {
      0%,
      50% {
        opacity: 1;
      }
      51%,
      100% {
        opacity: 0;
      }
    }

    // 用户消息：右对齐，蓝色气泡
    &.user-message {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;
      }

      .message-header {
        flex-direction: row-reverse;
      }

      .message-text {
        background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
        color: white;
        border: none;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
      }

      .message-actions {
        justify-content: flex-end;
      }
    }

    // AI消息：左对齐，白色气泡
    &.assistant-message {
      .message-text {
        background: white;
        border: 1px solid #f0f0f0;
        color: #262626;
        width: 100%;
        max-width: 100%;

        // Markdown 渲染器样式重置
        :deep(.markdown-renderer) {
          // 确保 Markdown 内容正确继承样式
          * {
            max-width: 100%;
          }
        }
      }

      .message-content {
        max-width: 85%;
      }
    }

    // 错误消息：左对齐，红色气泡
    &.error-message {
      .message-text {
        background: #fff1f0;
        border: 1px solid #ffccc7;
        color: #cf1322;
      }
    }

    .message-actions {
      display: flex;
      gap: 4px;
      margin-top: 6px;
      opacity: 0;
      transition: opacity 0.2s ease;

      :deep(.ant-btn) {
        color: #8c8c8c;

        &:hover {
          color: #1890ff;
        }
      }
    }

    &:hover .message-actions {
      opacity: 1;
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
