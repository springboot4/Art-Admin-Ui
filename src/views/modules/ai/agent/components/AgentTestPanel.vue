<template>
  <div class="chat-preview-panel">
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">
          <span class="title-icon">🤖</span>
          <h3>实时调试</h3>
          <a-tag v-if="status === 'published'" color="blue" class="status-tag">在线版本</a-tag>
          <a-tag v-else color="gold" class="status-tag">草稿版本</a-tag>
        </div>
        <div v-if="conversationId" class="session-info">
          <span class="label">会话:</span>
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
              <a-button
                size="small"
                type="text"
                class="action-btn save-btn"
                @click="saveConversationName"
              >
                <CheckOutlined />
              </a-button>
              <a-button
                size="small"
                type="text"
                class="action-btn cancel-btn"
                @click="cancelEditName"
              >
                <CloseOutlined />
              </a-button>
            </div>
          </div>
          <div v-else class="session-name-display" @dblclick="startEditName">
            <code class="session-code">{{ conversationNameDisplay }}</code>
            <a-button size="small" type="text" class="edit-btn" @click="startEditName">
              <template #icon>
                <EditOutlined />
              </template>
            </a-button>
          </div>
        </div>
      </div>
      <div class="header-right">
        <a-button size="small" type="text" class="close-btn" @click="$emit('close')">
          <template #icon>
            <CloseOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <div class="chat-status-bar">
      <div class="status-left">
        <div v-if="conversationLoading" class="status-indicator">
          <LoadingOutlined spin />
          <span>加载会话中...</span>
        </div>
        <div v-else-if="isRunning" class="status-indicator thinking">
          <LoadingOutlined spin />
          <span>生成中...</span>
        </div>
      </div>
      <div class="status-right">
        <Button size="small" type="text" class="initial-inputs-btn" @click="toggleVariables">
          <template #icon>
            <FormOutlined />
          </template>
          运行变量
        </Button>
        <Dropdown>
          <Button size="small" type="text">
            <template #icon>
              <MoreOutlined />
            </template>
          </Button>
          <template #overlay>
            <Menu>
              <Menu.Item @click="resetConversation"> <PlusOutlined /> 新建会话 </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </div>

    <transition name="slide-down">
      <div v-if="showVariables" class="initial-inputs-panel">
        <div class="panel-title-row">
          <div class="title-content">
            <FormOutlined class="title-icon" />
            <span class="title-text">运行变量 (JSON)</span>
          </div>
          <a-button size="small" type="text" @click="toggleVariables">收起</a-button>
        </div>
        <a-alert
          v-if="variablesError"
          :message="variablesError"
          show-icon
          type="error"
          class="variables-alert"
        />
        <a-textarea
          v-model:value="variablesInput"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          placeholder='{"city": "上海"}'
          class="variables-textarea"
        />
        <div class="variables-tip">为空时将以默认上下文运行</div>
      </div>
    </transition>

    <div class="chat-messages-container">
      <div ref="messagesScrollRef" class="messages-scroll-area">
        <div v-if="!timeline.length && !conversationLoading" class="welcome-section">
          <div class="welcome-icon">👋</div>
          <h3 class="welcome-title">开始对话</h3>
          <p class="welcome-description">请输入您的问题，我将为您提供帮助</p>
        </div>

        <!-- 统一的时间线展示，按时间顺序 -->
        <div v-for="item in timeline" :key="item.id" class="timeline-item">
          <!-- 用户消息 -->
          <div v-if="item.type === 'user'" class="message-wrapper">
            <div class="message-item user-message">
              <div class="message-avatar user-avatar">
                <UserOutlined />
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">您</span>
                  <span class="message-time">{{ formatTime(item.timestamp) }}</span>
                </div>
                <div class="message-text">{{ item.content }}</div>
              </div>
            </div>
          </div>

          <!-- 执行计划 -->
          <PlanSteps v-else-if="item.type === 'plan' && item.planSteps" :steps="item.planSteps" />

          <!-- 工具调用进度 -->
          <ToolExecutionProgress
            v-else-if="item.type === 'tool' && item.toolExecution"
            :execution="item.toolExecution"
          />

          <!-- AI 消息 -->
          <div v-else-if="item.type === 'assistant'" class="message-wrapper">
            <div class="message-item assistant-message">
              <div class="message-avatar assistant-avatar">
                <RobotOutlined />
              </div>
              <div class="message-content">
                <div class="message-header">
                  <span class="message-role">Agent</span>
                  <span class="message-time">{{ formatTime(item.timestamp) }}</span>
                </div>
                <div class="message-text">
                  <span v-if="!item.content && item.status === 'streaming'" class="thinking-text"
                    >思考中...</span
                  >
                  <MarkdownRenderer v-else-if="item.content" :content="item.content" />
                  <span v-else>{{ item.content || '[无输出]' }}</span>
                  <span v-if="item.status === 'streaming' && item.content" class="typing-cursor"
                    >▊</span
                  >
                </div>
                <div v-if="item.status === 'done' && item.content" class="message-actions">
                  <a-button size="small" type="text" @click="copyMessage(item.content || '')">
                    <template #icon>
                      <CopyOutlined />
                    </template>
                  </a-button>
                </div>
                <div v-if="item.status === 'error'" class="message-error">生成失败</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="showThinkingIndicator" class="thinking-indicator">
          <div class="thinking-avatar">
            <RobotOutlined />
          </div>
          <div class="thinking-content">
            <span class="thinking-label">AI 正在思考</span>
            <div class="thinking-dots"><span></span><span></span><span></span></div>
          </div>
        </div>

        <div ref="messagesEndRef" class="messages-end"></div>
      </div>
    </div>

    <a-alert
      v-if="errorBanner"
      :message="errorBanner"
      show-icon
      type="error"
      class="error-banner"
    />

    <div class="chat-input-container">
      <div class="input-wrapper">
        <a-textarea
          v-model:value="inputValue"
          :auto-size="{ minRows: 1, maxRows: 4 }"
          :disabled="isInputDisabled"
          placeholder="和Bot聊天"
          class="chat-input"
          @keydown="handleKeydown"
        />
        <div class="input-actions">
          <a-button
            class="send-button"
            size="small"
            type="primary"
            :loading="isRunning"
            :disabled="!canSend"
            @click="handleSend"
          >
            <template #icon>
              <SendOutlined v-if="!isRunning" />
            </template>
            {{ isRunning ? 'AI 思考中...' : '发送' }}
          </a-button>
        </div>
      </div>
      <div class="input-tips">
        <span v-if="!isRunning" class="tip-item">
          <span class="tip-icon">💡</span>
          提示: 按 <kbd>Enter</kbd> 发送，<kbd>Shift + Enter</kbd> 换行
        </span>
        <span v-else class="tip-item processing">
          <LoadingOutlined spin />
          <span class="processing-text">AI 正在思考并生成回复...</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
  import { message, Dropdown, Menu, Button } from 'ant-design-vue'
  import {
    SendOutlined,
    FormOutlined,
    CloseOutlined,
    LoadingOutlined,
    UserOutlined,
    RobotOutlined,
    CopyOutlined,
    MoreOutlined,
    PlusOutlined,
    EditOutlined,
    CheckOutlined,
  } from '@ant-design/icons-vue'
  import {
    add as createConversation,
    page as queryConversations,
    updateName as updateConversationName,
  } from '/@/api/ai/conversation/AiConversationsIndex'
  import { getRecentMessages } from '/@/api/ai/conversation/AiMessagesIndex'
  import { useAgentRunner } from '../composables/useAgentRunner'
  import type { AgentSpec } from '/@/api/ai/agent/AiAgentTypes'
  import type { AiConversationsDTO } from '/@/api/ai/conversation/AiConversationsTypes'
  import type { AiMessagesDTO } from '/@/api/ai/conversation/AiMessagesTypes'
  import type { IntermediateProcess } from '../composables/useAgentRunner'
  import MarkdownRenderer from '../../workflow/components/MarkdownRenderer.vue'
  import PlanSteps from './PlanSteps.vue'
  import ToolExecutionProgress from './ToolExecutionProgress.vue'

  interface Props {
    agentId: string
    appId: string
    appName: string
    status: string
    spec: AgentSpec
  }

  const emit = defineEmits<{ (e: 'close'): void }>()

  const props = defineProps<Props>()

  /**
   * 计划步骤数据结构
   */
  interface PlanStep {
    step: number
    goal: string
    tool?: string
  }

  /**
   * 工具执行状态
   */
  interface ToolExecution {
    name: string
    label: string
    status: 'running' | 'success' | 'failed'
    elapsed?: number
    error?: string
  }

  /**
   * 统一的时间线项类型
   * 包括：用户消息、助手消息、执行计划、工具调用
   */
  interface TimelineItem {
    id: string
    timestamp: number
    type: 'user' | 'assistant' | 'plan' | 'tool'
    // 用户/助手消息字段
    content?: string
    status?: 'done' | 'streaming' | 'error'
    // 计划字段
    planSteps?: PlanStep[]
    // 工具字段
    toolExecution?: ToolExecution
  }

  const timeline = ref<TimelineItem[]>([])
  const inputValue = ref('')
  const variablesInput = ref('')
  const variablesError = ref('')
  const showVariables = ref(false)
  const messagesScrollRef = ref<HTMLDivElement | null>(null)
  const messagesEndRef = ref<HTMLDivElement | null>(null)

  const conversation = ref<AiConversationsDTO | null>(null)
  const conversationLoading = ref(false)
  const creatingConversation = ref(false)
  const isEditingName = ref(false)
  const editingName = ref('')
  const nameInputRef = ref()

  const { isRunning, lastError, runAgent, stop } = useAgentRunner()
  const streamingMessage = ref<TimelineItem | null>(null)

  const conversationId = computed(() =>
    conversation.value?.id ? String(conversation.value.id) : null,
  )
  const conversationName = computed(() => conversation.value?.name?.trim() || '')
  const conversationNameDisplay = computed(
    () =>
      conversationName.value || (conversationId.value ? `会话 #${conversationId.value}` : '待创建'),
  )
  const isInputDisabled = computed(
    () => isRunning.value || creatingConversation.value || conversationLoading.value,
  )
  const errorBanner = computed(() => (lastError.value ? String(lastError.value) : ''))
  const showThinkingIndicator = computed(() => {
    // 只有在运行中且还没有创建 assistant 消息时才显示思考指示器
    // 一旦收到第一个 chunk，就不再显示思考指示器
    return isRunning.value && !streamingMessage.value
  })
  const canSend = computed(
    () => inputValue.value.trim().length > 0 && !isInputDisabled.value && !!conversationId.value,
  )

  function createTimelineItem(
    type: 'user' | 'assistant',
    content: string,
    status: TimelineItem['status'],
  ): TimelineItem {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      content,
      status,
      timestamp: Date.now(),
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString()
  }

  function scrollToBottom() {
    nextTick(() => {
      messagesEndRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  function extractChunkText(raw: string): string {
    if (!raw) return ''
    const trimmed = raw.trim()
    if (!trimmed) return ''

    const resolveValue = (value: any): string => {
      if (value == null) return ''
      if (typeof value === 'string') return value
      if (Array.isArray(value)) {
        return value
          .map((item) => resolveValue(item))
          .filter(Boolean)
          .join('')
      }
      if (typeof value === 'object') {
        const preferredKeys = ['chunk', 'message', 'text', 'content', 'delta', 'output']
        for (const key of preferredKeys) {
          if (key in value) {
            const result = resolveValue((value as Record<string, any>)[key])
            if (result) return result
          }
        }
        if ('data' in value) {
          const result = resolveValue((value as Record<string, any>).data)
          if (result) return result
        }
        if ('outputs' in value) {
          const result = resolveValue((value as Record<string, any>).outputs)
          if (result) return result
        }
        for (const item of Object.values(value)) {
          const result = resolveValue(item)
          if (result) return result
        }
        return ''
      }
      return String(value)
    }

    try {
      const parsed = JSON.parse(trimmed)
      const resolved = resolveValue(parsed)
      return resolved || trimmed
    } catch (error) {
      return raw
    }
  }

  function normalizeConversation(record: any): AiConversationsDTO {
    if (!record) return record
    const normalizedId = record.id ?? record.conversationId
    return {
      ...record,
      id: normalizedId ? String(normalizedId) : record.id,
    }
  }

  function getConversationTimestamp(conv: AiConversationsDTO): number {
    const fields = [conv.lastMessageAt, conv.updateTime, conv.createTime]
    for (const field of fields) {
      if (field) {
        const time = new Date(field).getTime()
        if (!Number.isNaN(time)) return time
      }
    }
    return 0
  }

  function convertHistoryMessage(dto: AiMessagesDTO): TimelineItem | null {
    if (!dto) return null
    const type: 'user' | 'assistant' = dto.role === 'user' ? 'user' : 'assistant'
    const status: TimelineItem['status'] = dto.status === 'failed' ? 'error' : 'done'
    return {
      id:
        String(dto.id || dto.messageUuid) ||
        `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      content: dto.content || '',
      status,
      timestamp: dto.createTime ? new Date(dto.createTime).getTime() : Date.now(),
    }
  }

  async function loadConversationMessages(targetId: string) {
    try {
      const response: any = await getRecentMessages(targetId, 50)
      let history: AiMessagesDTO[] = []

      if (Array.isArray(response)) {
        history = response
      } else if (Array.isArray(response?.records)) {
        history = response.records
      } else if (response) {
        history = [response]
      }

      const parsed = history
        .map((item) => convertHistoryMessage(item))
        .filter((item): item is TimelineItem => !!item)
        .sort((a, b) => a.timestamp - b.timestamp)

      timeline.value = parsed
      scrollToBottom()
    } catch (error) {
      console.warn('加载历史消息失败', error)
    }
  }

  async function loadLatestConversation(): Promise<AiConversationsDTO | null> {
    if (!props.appId) {
      message.error('缺少应用ID')
      return null
    }

    conversationLoading.value = true
    try {
      const response: any = await queryConversations({ appId: props.appId })
      const records = Array.isArray(response?.records)
        ? response.records.map(normalizeConversation)
        : []

      if (records.length > 0) {
        const sorted = [...records].sort(
          (a, b) => getConversationTimestamp(b) - getConversationTimestamp(a),
        )
        const latest = sorted[0]
        const currentId = conversationId.value
        conversation.value = latest
        if (!currentId || currentId !== conversationId.value) {
          timeline.value = []
          if (conversationId.value) {
            await loadConversationMessages(conversationId.value)
          }
        }
        return latest
      }

      return await createNewConversation()
    } catch (error: any) {
      console.error('加载会话失败', error)
      message.error(error?.message || '加载会话失败')
      return null
    } finally {
      conversationLoading.value = false
    }
  }

  async function createNewConversation(customName?: string): Promise<AiConversationsDTO | null> {
    if (!props.appId) {
      message.error('缺少应用ID')
      return null
    }

    creatingConversation.value = true
    conversationLoading.value = true
    try {
      const result: any = await createConversation({
        appId: String(props.appId),
        name: customName || `${props.appName || 'Agent'} 调试 ${new Date().toLocaleString()}`,
      })

      if (!result) {
        throw new Error('后端未返回会话信息')
      }

      conversation.value = normalizeConversation(result)
      timeline.value = []
      isEditingName.value = false
      editingName.value = ''
      message.success('已创建新会话')
      return conversation.value
    } catch (error: any) {
      console.error('创建会话失败', error)
      message.error(error?.message || '创建会话失败')
      return null
    } finally {
      creatingConversation.value = false
      conversationLoading.value = false
    }
  }

  async function refreshConversationMeta() {
    if (!conversationId.value || !props.appId) {
      return
    }

    try {
      const response: any = await queryConversations({ appId: props.appId })
      const records = Array.isArray(response?.records)
        ? response.records.map(normalizeConversation)
        : []
      const current = records.find((item) => String(item.id) === conversationId.value)
      if (current) {
        conversation.value = current
      }
    } catch (error) {
      console.warn('刷新会话信息失败', error)
    }
  }

  async function ensureConversation(): Promise<string | null> {
    if (conversationId.value) {
      return conversationId.value
    }
    const latest = await loadLatestConversation()
    return latest?.id ? String(latest.id) : null
  }

  async function initializePanel() {
    await loadLatestConversation()
  }

  async function resetConversation() {
    await createNewConversation()
  }

  function toggleVariables() {
    showVariables.value = !showVariables.value
  }

  async function startEditName() {
    if (!conversationId.value) return
    editingName.value = conversationName.value || conversationNameDisplay.value
    isEditingName.value = true
    await nextTick()
    nameInputRef.value?.focus()
  }

  function cancelEditName() {
    isEditingName.value = false
    editingName.value = ''
  }

  async function saveConversationName() {
    if (!conversationId.value) {
      cancelEditName()
      return
    }

    const newName = editingName.value.trim()
    if (!newName) {
      message.warning('会话名称不能为空')
      return
    }

    if (newName === conversationName.value) {
      cancelEditName()
      return
    }

    try {
      await updateConversationName({
        conversationId: conversationId.value,
        name: newName,
      })
      if (conversation.value) {
        conversation.value = {
          ...conversation.value,
          name: newName,
        }
      }
      message.success('会话名称已更新')
      cancelEditName()
    } catch (error: any) {
      console.error('更新会话名称失败', error)
      message.error(error?.message || '更新会话名称失败')
    }
  }

  function handleNameBlur() {
    setTimeout(() => {
      if (isEditingName.value) {
        saveConversationName()
      }
    }, 150)
  }

  function handleNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveConversationName()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditName()
    }
  }

  function parseVariables(): Record<string, any> | undefined {
    const raw = variablesInput.value.trim()
    if (!raw) {
      variablesError.value = ''
      return undefined
    }
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('变量必须是对象')
      }
      variablesError.value = ''
      return parsed
    } catch (error: any) {
      variablesError.value = error?.message || 'JSON 解析失败'
      throw error
    }
  }

  /**
   * 处理中间过程消息
   * 根据 intermediateProcess 类型进行不同的处理
   */
  function handleIntermediateProcess(process: IntermediateProcess) {
    const { type, data } = process

    switch (type) {
      case 'plan':
        // 显示执行计划
        if (data?.steps && Array.isArray(data.steps)) {
          timeline.value.push({
            id: `plan-${Date.now()}`,
            type: 'plan',
            timestamp: Date.now(),
            planSteps: data.steps,
          })
          scrollToBottom()
        }
        break

      case 'tool_start':
        // 添加工具开始执行的状态
        if (data?.name && data?.label) {
          timeline.value.push({
            id: `tool-${data.name}-${Date.now()}`,
            type: 'tool',
            timestamp: Date.now(),
            toolExecution: {
              name: data.name,
              label: data.label,
              status: 'running',
            },
          })
          scrollToBottom()
        }
        break

      case 'tool_end':
        // 更新工具执行结果
        if (data?.name && data?.label) {
          // 查找最近的同名工具执行项
          const lastToolIndex = [...timeline.value]
            .reverse()
            .findIndex(
              (item) =>
                item.type === 'tool' &&
                item.toolExecution?.name === data.name &&
                item.toolExecution?.status === 'running',
            )

          if (lastToolIndex !== -1) {
            // 从后往前找，需要转换索引
            const actualIndex = timeline.value.length - 1 - lastToolIndex
            const item = timeline.value[actualIndex]

            if (item.toolExecution) {
              item.toolExecution.status = data.status === 'success' ? 'success' : 'failed'
              item.toolExecution.elapsed = data.elapsed
              if (data.error) {
                item.toolExecution.error = data.error
              }
            }
          }
          scrollToBottom()
        }
        break

      default:
        console.warn('[AgentTestPanel] 未知的中间过程类型:', type)
    }
  }

  async function handleSend() {
    if (!props.agentId) {
      message.warning('请先保存 Agent 配置')
      return
    }

    const text = inputValue.value.trim()
    if (!text) {
      message.warning('请输入提问内容')
      return
    }

    let variables: Record<string, any> | undefined
    try {
      variables = parseVariables()
    } catch (error) {
      message.error('运行变量解析失败')
      return
    }

    const convId = await ensureConversation()
    if (!convId) {
      return
    }

    // 添加用户消息
    const userMsg = createTimelineItem('user', text, 'done')
    timeline.value.push(userMsg)

    // ⚠️ 不再提前创建 assistant 消息，而是在收到第一个 chunk 时创建
    // 这样可以保证中间过程（plan/tool）在 assistant 消息之前

    inputValue.value = ''
    await nextTick()
    scrollToBottom()

    await runAgent(
      {
        agentId: props.agentId,
        conversationId: convId,
        userQuery: text,
        variables,
      },
      {
        onStart: () => {
          // onStart 时不做任何事情，等待第一个 chunk
        },
        onChunk: (chunk) => {
          // 如果还没有 streamingMessage，说明这是第一个 chunk，需要创建
          if (!streamingMessage.value) {
            const assistantMsg = createTimelineItem('assistant', '', 'streaming')
            timeline.value.push(assistantMsg)
            streamingMessage.value = assistantMsg
          }

          const textToAppend = extractChunkText(chunk)
          if (!textToAppend) return

          streamingMessage.value.content = (streamingMessage.value.content || '') + textToAppend
          scrollToBottom()
        },
        onIntermediateProcess: (process) => {
          handleIntermediateProcess(process)
        },
        onError: async (err) => {
          const friendlyError = extractChunkText(err)

          // 如果还没有创建 assistant 消息，创建一个错误消息
          if (!streamingMessage.value) {
            const assistantMsg = createTimelineItem('assistant', friendlyError, 'error')
            timeline.value.push(assistantMsg)
            streamingMessage.value = assistantMsg
          } else {
            // 如果已经有了，更新内容和状态
            if (!streamingMessage.value.content) {
              streamingMessage.value.content = friendlyError
            } else if (friendlyError) {
              streamingMessage.value.content = `${streamingMessage.value.content}
${friendlyError}`
            }
            streamingMessage.value.status = 'error'
          }

          streamingMessage.value = null
          scrollToBottom()
          await refreshConversationMeta()
        },
        onComplete: async () => {
          if (!streamingMessage.value) {
            // 如果没有收到任何 chunk，创建一个空消息
            const assistantMsg = createTimelineItem('assistant', '[无输出]', 'done')
            timeline.value.push(assistantMsg)
          } else {
            // 更新现有消息的状态
            if (!streamingMessage.value.content) {
              streamingMessage.value.content = '[无输出]'
            }
            streamingMessage.value.status = 'done'
          }

          streamingMessage.value = null
          scrollToBottom()
          await refreshConversationMeta()
        },
      },
    )
  }

  function copyMessage(content: string) {
    if (!content) return
    navigator.clipboard
      .writeText(content)
      .then(() => message.success('已复制'))
      .catch(() => message.error('复制失败'))
  }

  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      handleSend()
    }
  }

  onMounted(() => {
    initializePanel()
  })

  onUnmounted(() => {
    stop()
  })
</script>

<style lang="less" scoped>
  .chat-preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    color: #262626;
    overflow: hidden;
  }

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

      .status-tag {
        border-radius: 8px;
        margin-left: 4px;
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

      .session-name-editor {
        display: flex;
        align-items: center;
        gap: 6px;

        .session-name-input {
          width: 200px;
          border-radius: 6px;
          border: 2px solid #1890ff;
          transition: all 0.2s ease;

          :deep(.ant-input) {
            font-size: 12px;
            padding: 2px 8px;
            height: 26px;
          }

          &:focus-within {
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.15);
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
              background: rgba(255, 77, 79, 0.12);
              color: #cf1322;
            }
          }
        }
      }

      .session-name-display {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 6px;
        transition: background 0.2s ease;

        &:hover {
          background: rgba(0, 0, 0, 0.02);
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
      }
    }

    .close-btn {
      color: #8c8c8c;
      transition: color 0.2s ease;

      &:hover {
        color: #1890ff;
      }

      :deep(.anticon) {
        font-size: 14px;
      }
    }
  }

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
      display: flex;
      align-items: center;
      gap: 8px;
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

      span {
        font-weight: 500;
      }
    }

    .initial-inputs-btn {
      color: #1890ff;
      font-size: 13px;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(24, 144, 255, 0.08);
      }

      :deep(.anticon) {
        font-size: 14px;
      }
    }

    .more-actions-btn {
      color: #8c8c8c;
      transition: color 0.2s ease, background 0.2s ease;

      &:hover {
        color: #1890ff;
        background: rgba(24, 144, 255, 0.08);
      }

      :deep(.anticon) {
        font-size: 14px;
      }
    }
  }

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
    }

    .variables-alert {
      margin-bottom: 12px;
      border-radius: 6px;
    }

    .variables-textarea {
      margin-bottom: 8px;

      :deep(.ant-input) {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 12px;
        background: #f7fafc;
        border-radius: 8px;
        border: 1px solid #e8e8e8;
      }
    }

    .variables-tip {
      font-size: 12px;
      color: #8c8c8c;
    }
  }

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

  // 时间线项容器
  .timeline-item {
    // 间距由子组件控制
  }

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
      color: #fff;
    }

    .user-avatar {
      background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
    }

    .assistant-avatar {
      background: linear-gradient(135deg, #722ed1 0%, #9254de 100%);
    }

    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      min-width: 0;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 12px;
      color: #8c8c8c;

      .message-role {
        font-weight: 600;
        color: #595959;
      }

      .message-time {
        font-size: 12px;
        color: #bfbfbf;
      }
    }

    .message-text {
      background: white;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #262626;
      white-space: pre-wrap;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
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

    .typing-cursor {
      display: inline-block;
      margin-left: 2px;
      color: #1890ff;
      animation: blink 1s step-end infinite;
    }

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

    &.assistant-message {
      .message-content {
        max-width: 85%;
      }

      .message-text {
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
    }

    &.error-message {
      .message-avatar {
        background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
      }

      .message-text {
        background: #fff1f0;
        border: 1px solid #ffccc7;
        color: #cf1322;
      }
    }
  }

  .thinking-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(24, 144, 255, 0.08);
    border-radius: 12px;
    color: #1890ff;

    .thinking-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(24, 144, 255, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thinking-content {
      display: flex;
      align-items: center;
      gap: 8px;

      .thinking-label {
        font-size: 13px;
        font-weight: 500;
      }

      .thinking-dots {
        display: flex;
        gap: 4px;

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

  .error-banner {
    margin: 12px 20px 0;
    border-radius: 8px;
  }

  .chat-input-container {
    padding: 16px 20px;
    background: #ffffff;
    border-top: 1px solid #f0f0f0;

    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 8px;

      .chat-input {
        flex: 1;

        :deep(textarea) {
          resize: none;
        }

        :deep(.ant-input) {
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
        }
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: 8px;
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
        color: #fff;

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

      .tip-item {
        display: flex;
        align-items: center;
        gap: 6px;

        &.processing {
          color: #1890ff;
          font-weight: 500;
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

      .processing-text {
        display: flex;
        align-items: center;
        gap: 6px;
      }
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

  @media (max-width: 768px) {
    .panel-header,
    .chat-status-bar,
    .initial-inputs-panel,
    .chat-input-container {
      padding: 12px 16px;
    }

    .chat-messages-container .messages-scroll-area {
      padding: 16px;
    }
  }
</style>
