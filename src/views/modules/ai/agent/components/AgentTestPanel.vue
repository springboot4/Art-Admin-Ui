<template>
  <div class="chat-preview-panel">
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">
          <div class="title-icon">
            <RobotOutlined />
          </div>
          <h3>实时调试</h3>
          <a-tag v-if="status === 'published'" color="blue" class="status-tag">在线版本</a-tag>
          <a-tag v-else color="gold" class="status-tag">草稿版本</a-tag>
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
            <span class="title-text">运行变量</span>
          </div>
          <div class="title-actions">
            <a-button
              v-if="!isEditingVariables"
              size="small"
              type="text"
              class="edit-btn"
              @click="startEditVariables"
            >
              <EditOutlined />
              编辑
            </a-button>
            <template v-else>
              <a-button size="small" type="text" class="save-btn" @click="saveEditVariables">
                <CheckOutlined />
                保存
              </a-button>
              <a-button size="small" type="text" class="cancel-btn" @click="cancelEditVariables">
                <CloseOutlined />
                取消
              </a-button>
            </template>
          </div>
        </div>

        <div class="inputs-content">
          <!-- 无变量提示 -->
          <div v-if="!hasUserInputs" class="no-inputs-hint">
            <ExclamationCircleOutlined class="hint-icon" />
            <span>当前 Agent 未配置用户输入变量</span>
          </div>

          <!-- 查看模式 -->
          <div v-else-if="!isEditingVariables" class="inputs-view">
            <div
              v-for="input in userInputsSchema"
              :key="`view-${input.name}`"
              class="input-item-view"
            >
              <div class="input-label">
                {{ input.displayName || input.name }}
                <span v-if="input.required" class="required-badge">必填</span>
                <span :class="['type-badge-small', `type-${input.dataType}`]">
                  {{ getTypeDisplayName(input.dataType) }}
                </span>
              </div>
              <!-- 布尔值特殊展示 -->
              <div v-if="input.dataType === 'boolean'" class="input-value boolean-value">
                <span
                  :class="['boolean-badge', currentVariables[input.name] ? 'is-true' : 'is-false']"
                >
                  {{ currentVariables[input.name] ? '✓ 是' : '✗ 否' }}
                </span>
              </div>
              <!-- 普通值 -->
              <div v-else class="input-value">
                {{ currentVariables[input.name] || '（未设置）' }}
              </div>
            </div>
          </div>

          <!-- 编辑模式 -->
          <div v-else class="inputs-edit">
            <div
              v-for="input in userInputsSchema"
              :key="`edit-${input.name}`"
              class="input-item-edit"
            >
              <div class="input-label-edit">
                {{ input.displayName || input.name }}
                <span v-if="input.required" class="required-badge">必填</span>
                <span :class="['type-badge', `type-${input.dataType}`]">
                  {{ getTypeDisplayName(input.dataType) }}
                </span>
              </div>
              <div v-if="input.description" class="input-description">{{ input.description }}</div>

              <!-- 字符串类型 -->
              <a-input
                v-if="input.dataType === 'string'"
                v-model:value="editingVariables[input.name]"
                :placeholder="`请输入${input.displayName || input.name}`"
                class="input-field"
              />

              <!-- 数字类型 -->
              <a-input-number
                v-else-if="input.dataType === 'number'"
                v-model:value="editingVariables[input.name]"
                :placeholder="`请输入${input.displayName || input.name}`"
                class="input-field number-field"
                style="width: 100%"
              />

              <!-- 布尔类型 -->
              <div v-else-if="input.dataType === 'boolean'" class="switch-field">
                <a-switch v-model:checked="editingVariables[input.name]" class="modern-switch" />
                <span class="switch-label">
                  {{ editingVariables[input.name] ? '是' : '否' }}
                </span>
              </div>

              <!-- 默认字符串 -->
              <a-input
                v-else
                v-model:value="editingVariables[input.name]"
                :placeholder="`请输入${input.displayName || input.name}`"
                class="input-field"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <div class="chat-messages-container">
      <div ref="messagesScrollRef" class="messages-scroll-area">
        <div v-if="!timeline.length && !conversationLoading" class="welcome-section">
          <div class="welcome-icon">
            <CommentOutlined />
          </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import {
    message,
    Dropdown,
    Menu,
    Button,
    Switch as ASwitch,
    InputNumber as AInputNumber,
  } from 'ant-design-vue'
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
    ExclamationCircleOutlined,
    CommentOutlined,
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
  const showVariables = ref(false)
  const isEditingVariables = ref(false)
  const currentVariables = ref<Record<string, any>>({})
  const editingVariables = ref<Record<string, any>>({})
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

  // 用户输入变量 schema
  const userInputsSchema = computed(() => props.spec?.userInputs || [])

  // 是否有用户输入变量
  const hasUserInputs = computed(() => userInputsSchema.value.length > 0)

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

  function toggleVariables() {
    showVariables.value = !showVariables.value
  }

  /**
   * 开始编辑变量
   */
  function startEditVariables() {
    // 复制当前数据到编辑状态
    editingVariables.value = { ...currentVariables.value }
    isEditingVariables.value = true
  }

  /**
   * 取消编辑变量
   */
  function cancelEditVariables() {
    isEditingVariables.value = false
    editingVariables.value = {}
  }

  /**
   * 保存编辑的变量
   */
  function saveEditVariables() {
    // 验证必填字段
    for (const input of userInputsSchema.value) {
      if (input.required) {
        const value = editingVariables.value[input.name]
        if (value === undefined || value === null || value === '') {
          message.error(`${input.displayName || input.name} 为必填项`)
          return
        }
      }
    }

    // 保存数据
    currentVariables.value = { ...editingVariables.value }
    isEditingVariables.value = false
    message.success('运行变量已更新')
  }

  /**
   * 获取数据类型显示名称
   */
  function getTypeDisplayName(dataType: string): string {
    const typeMap: Record<string, string> = {
      string: '文本',
      number: '数字',
      boolean: '布尔',
    }
    return typeMap[dataType] || '文本'
  }

  /**
   * 获取运行变量（用于发送消息）
   * 空值转换为 null
   */
  function getRunVariables(): Record<string, any> | undefined {
    if (!hasUserInputs.value || Object.keys(currentVariables.value).length === 0) {
      return undefined
    }

    const variables: Record<string, any> = {}
    Object.entries(currentVariables.value).forEach(([key, value]) => {
      // 空字符串、undefined 转为 null
      if (value === '' || value === undefined) {
        variables[key] = null
      } else {
        variables[key] = value
      }
    })

    return variables
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

    // 获取运行变量
    const variables = getRunVariables()

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

  // 监听 spec.userInputs 变化，同步更新 currentVariables
  watch(
    () => props.spec?.userInputs,
    (newUserInputs) => {
      if (!newUserInputs || !Array.isArray(newUserInputs)) {
        // 如果没有用户输入变量，清空当前变量
        currentVariables.value = {}
        return
      }

      // 创建新的变量对象，只保留仍然存在的变量
      const newVariables: Record<string, any> = {}
      const oldVariables = currentVariables.value

      newUserInputs.forEach((input) => {
        const varName = input.name
        // 如果旧变量中有这个变量，保留其值
        if (varName in oldVariables) {
          newVariables[varName] = oldVariables[varName]
        } else {
          // 否则设置默认值
          if (input.dataType === 'boolean') {
            newVariables[varName] = false
          } else if (input.dataType === 'number') {
            newVariables[varName] = 0
          } else {
            newVariables[varName] = ''
          }
        }
      })

      currentVariables.value = newVariables
    },
    { deep: true, immediate: true },
  )
</script>

<style lang="less" scoped>
  @import '/@/styles/chat-variables.less';

  .chat-preview-panel {
    display: flex;
    flex-direction: column;
    height: 95%;
    min-height: 0;
    background: @chat-white;
    color: @chat-text;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: @spacing-lg @spacing-xl;
    border-bottom: 1px solid @chat-border;
    background: @chat-bg-secondary;
    flex-shrink: 0;

    .header-left {
      flex: 1;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: @spacing-sm;
      margin-bottom: @spacing-xs;

      .title-icon {
        width: 32px;
        height: 32px;
        border-radius: @radius-md;
        background: linear-gradient(135deg, @avatar-ai-start 0%, @avatar-ai-end 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: @chat-white;
        font-size: 16px;
      }

      h3 {
        margin: 0;
        font-size: @font-size-lg;
        font-weight: @font-weight-semibold;
        color: @chat-text;
      }

      .status-tag {
        border-radius: @radius-md;
        margin-left: @spacing-xs;
        font-size: @font-size-xs;
        padding: 2px 8px;
      }
    }

    .session-info {
      display: flex;
      align-items: center;
      gap: @spacing-xs;
      font-size: @font-size-sm;
      color: @chat-text-tertiary;

      .label {
        font-weight: @font-weight-medium;
      }

      .session-name-editor {
        display: flex;
        align-items: center;
        gap: @spacing-xs;

        .session-name-input {
          width: 200px;
          border-radius: @radius-sm;
          border: 2px solid @chat-primary;
          transition: all @transition-normal;

          :deep(.ant-input) {
            font-size: @font-size-sm;
            padding: 2px @spacing-sm;
            height: 26px;
          }

          &:focus-within {
            box-shadow: @shadow-focus;
          }
        }

        .edit-actions {
          display: flex;
          gap: 2px;

          .action-btn {
            padding: 0 @spacing-xs;
            height: 24px;
            min-width: 24px;
            border-radius: @radius-xs;
            transition: all @transition-normal;

            :deep(.anticon) {
              font-size: @font-size-sm;
            }
          }

          .save-btn {
            color: @chat-success;

            &:hover {
              background: @chat-success-bg;
              color: darken(@chat-success, 10%);
            }
          }

          .cancel-btn {
            color: @chat-error;

            &:hover {
              background: @chat-error-bg;
              color: darken(@chat-error, 10%);
            }
          }
        }
      }

      .session-name-display {
        display: flex;
        align-items: center;
        gap: @spacing-xs;
        padding: @spacing-xs @spacing-sm;
        border-radius: @radius-sm;
        transition: background @transition-normal;

        &:hover {
          background: @chat-bg-tertiary;
        }

        .session-code {
          background: transparent;
          padding: 0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: @font-size-sm;
          color: @chat-text;
          font-weight: @font-weight-medium;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .close-btn {
      color: @chat-text-tertiary;
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
    padding: @spacing-md @spacing-xl;
    background: @chat-bg-secondary;
    border-bottom: 1px solid @chat-border;
    min-height: 48px;
    flex-shrink: 0;

    .status-left {
      flex: 1;
      display: flex;
      align-items: center;
      gap: @spacing-sm;
    }

    .status-right {
      display: flex;
      align-items: center;
      gap: @spacing-sm;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: @spacing-sm;
      font-size: @font-size-sm;
      color: @chat-primary;

      span {
        font-weight: @font-weight-medium;
      }
    }

    .initial-inputs-btn {
      color: @chat-primary;
      font-size: @font-size-sm;
      transition: background @transition-normal;

      &:hover {
        background: @chat-primary-light;
      }

      :deep(.anticon) {
        font-size: @font-size-base;
      }
    }

    .more-actions-btn {
      color: @chat-text-tertiary;
      transition: color @transition-normal, background @transition-normal;

      &:hover {
        color: @chat-primary;
        background: @chat-primary-light;
      }

      :deep(.anticon) {
        font-size: @font-size-base;
      }
    }
  }

  .initial-inputs-panel {
    background: @chat-white;
    border-bottom: 1px solid @chat-border;
    padding: @spacing-md @spacing-xl @spacing-lg;
    flex-shrink: 0;

    .panel-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: @spacing-md;

      .title-content {
        display: flex;
        align-items: center;
        gap: @spacing-sm;

        .title-icon {
          font-size: @font-size-base;
          color: @chat-primary;
        }

        .title-text {
          font-size: @font-size-sm;
          font-weight: @font-weight-semibold;
          color: @chat-text;
        }
      }

      .title-actions {
        display: flex;
        align-items: center;
        gap: @spacing-xs;

        .edit-btn {
          color: @chat-primary;
          font-size: @font-size-sm;
          transition: all @transition-normal;

          &:hover {
            background: rgba(24, 144, 255, 0.1);
          }
        }

        .save-btn {
          color: #52c41a;
          font-size: 12px;

          &:hover {
            background: rgba(82, 196, 26, 0.1);
            color: #389e0d;
          }
        }

        .cancel-btn {
          color: #ff4d4f;
          font-size: 12px;

          &:hover {
            background: rgba(255, 77, 79, 0.12);
            color: #cf1322;
          }
        }
      }
    }

    .inputs-content {
      min-height: 60px;
    }

    .no-inputs-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      background: #f7fafc;
      border-radius: 8px;
      color: #8c8c8c;
      font-size: 13px;

      .hint-icon {
        font-size: 16px;
        color: #faad14;
      }
    }

    .inputs-view {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .input-item-view {
        padding: 12px;
        background: #f7fafc;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          border-color: #1890ff;
          background: #f0f7ff;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #262626;

          .required-badge {
            padding: 0 4px;
            background: #ff4d4f;
            color: white;
            font-size: 10px;
            border-radius: 3px;
            font-weight: 500;
          }

          .type-badge-small {
            padding: 0 6px;
            font-size: 10px;
            border-radius: 4px;
            font-weight: 500;

            &.type-string {
              background: #e6f4ff;
              color: #0958d9;
            }

            &.type-number {
              background: #fff1f0;
              color: #cf1322;
            }

            &.type-boolean {
              background: #f6ffed;
              color: #389e0d;
            }
          }
        }

        .input-value {
          font-size: 13px;
          color: #595959;
          word-break: break-word;

          &.boolean-value {
            .boolean-badge {
              padding: 2px 10px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;

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
        }
      }
    }

    .inputs-edit {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .input-item-edit {
        .input-label-edit {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #262626;

          .required-badge {
            padding: 0 4px;
            background: #ff4d4f;
            color: white;
            font-size: 10px;
            border-radius: 3px;
            font-weight: 500;
          }

          .type-badge {
            padding: 2px 8px;
            font-size: 11px;
            border-radius: 4px;
            font-weight: 500;

            &.type-string {
              background: #e6f4ff;
              color: #0958d9;
            }

            &.type-number {
              background: #fff1f0;
              color: #cf1322;
            }

            &.type-boolean {
              background: #f6ffed;
              color: #389e0d;
            }
          }
        }

        .input-description {
          font-size: 12px;
          color: #8c8c8c;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .input-field {
          border-radius: 8px;
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
            border: none;
            box-shadow: none;
          }

          :deep(.ant-input-number) {
            border: none;
            box-shadow: none;
            width: 100%;
          }
        }

        .switch-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;

          .modern-switch {
            &:deep(.ant-switch-checked) {
              background-color: #52c41a;
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
    min-height: 0;
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
    padding: 60px @spacing-xl;

    .welcome-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto @spacing-lg;
      border-radius: @radius-xl;
      background: linear-gradient(135deg, @avatar-ai-start 0%, @avatar-ai-end 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: @chat-white;
      box-shadow: @shadow-lg;
    }

    .welcome-title {
      font-size: @font-size-xl;
      font-weight: @font-weight-semibold;
      color: @chat-text;
      margin: 0 0 @spacing-sm 0;
    }

    .welcome-description {
      font-size: @font-size-base;
      color: @chat-text-tertiary;
      margin: 0;
    }
  }

  // 时间线项容器
  .timeline-item {
    // 间距由子组件控制
  }

  .message-wrapper {
    margin-bottom: @spacing-2xl;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .message-item {
    display: flex;
    gap: @spacing-sm;
    align-items: flex-start;

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: @radius-md;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      box-shadow: @shadow-sm;
      color: @chat-white;
    }

    .user-avatar {
      background: linear-gradient(135deg, @avatar-user-start 0%, @avatar-user-end 100%);
    }

    .assistant-avatar {
      background: linear-gradient(135deg, @avatar-ai-start 0%, @avatar-ai-end 100%);
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
      gap: @spacing-sm;
      margin-bottom: @spacing-xs;
      font-size: @font-size-sm;
      color: @chat-text-tertiary;

      .message-role {
        font-weight: @font-weight-semibold;
        color: @chat-text-secondary;
      }

      .message-time {
        font-size: @font-size-sm;
        color: @chat-text-tertiary;
      }
    }

    .message-text {
      background: @chat-white;
      border: 1px solid @chat-border;
      border-radius: @radius-lg @radius-lg @radius-lg @radius-xs;
      padding: @spacing-md @spacing-lg;
      font-size: @font-size-base;
      line-height: @line-height-relaxed;
      color: @chat-text;
      white-space: pre-wrap;
      box-shadow: @shadow-xs;
    }

    .message-actions {
      display: flex;
      gap: @spacing-xs;
      margin-top: @spacing-xs;
      opacity: 0;
      transition: opacity @transition-fast;

      :deep(.ant-btn) {
        color: @chat-text-tertiary;

        &:hover {
          color: @chat-primary;
        }
      }
    }

    &:hover .message-actions {
      opacity: 1;
    }

    .typing-cursor {
      display: inline-block;
      margin-left: 2px;
      color: @chat-primary;
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
        background: @chat-user-bg;
        color: @chat-user-text;
        border: none;
        border-radius: @radius-lg @radius-lg @radius-xs @radius-lg;
        box-shadow: @shadow-md;
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
        background: @chat-ai-bg;
        border: none;
        border-radius: @radius-lg @radius-lg @radius-lg @radius-xs;

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
        background: linear-gradient(135deg, @chat-error 0%, #ff7875 100%);
      }

      .message-text {
        background: @chat-error-bg;
        border: 1px solid #fecaca;
        color: @chat-error;
        border-radius: @radius-lg;
      }
    }
  }

  .thinking-indicator {
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    padding: @spacing-md @spacing-lg;
    background: @chat-primary-light;
    border-radius: @radius-lg;
    color: @chat-primary;

    .thinking-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(21, 94, 239, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thinking-content {
      display: flex;
      align-items: center;
      gap: @spacing-sm;

      .thinking-label {
        font-size: @font-size-sm;
        font-weight: @font-weight-medium;
      }

      .thinking-dots {
        display: flex;
        gap: @spacing-xs;

        span {
          width: 6px;
          height: 6px;
          border-radius: @radius-full;
          background: @chat-primary;
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
    margin: @spacing-md @spacing-xl 0;
    border-radius: @radius-md;
    flex-shrink: 0;
  }

  .chat-input-container {
    padding: @spacing-lg @spacing-xl;
    background: @chat-white;
    border-top: 1px solid @chat-border;
    flex-shrink: 0;

    .input-wrapper {
      display: flex;
      gap: @spacing-md;
      align-items: flex-end;
      margin-bottom: @spacing-sm;

      .chat-input {
        flex: 1;

        :deep(textarea) {
          resize: none;
        }

        :deep(.ant-input) {
          border-radius: @radius-lg;
          border: 2px solid @chat-border;
          transition: all @transition-normal;
          font-size: @font-size-base;
          line-height: @line-height-relaxed;
          padding: @spacing-sm @spacing-md;

          &:hover {
            border-color: @chat-text-tertiary;
          }

          &:focus {
            border-color: @chat-primary;
            box-shadow: @shadow-focus;
          }

          &:disabled {
            background: @chat-bg-secondary;
            cursor: not-allowed;
          }
        }
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: @spacing-sm;
      }

      .send-button {
        border-radius: @radius-md;
        padding: @spacing-sm @spacing-xl;
        height: auto;
        min-height: 40px;
        font-weight: @font-weight-medium;
        background: @chat-primary;
        border: none;
        box-shadow: @shadow-md;
        transition: all @transition-normal;
        color: @chat-white;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: @shadow-lg;
          background: @chat-primary-hover;
        }

        &:disabled {
          background: @chat-text-tertiary;
          box-shadow: none;
        }
      }
    }

    .input-tips {
      display: flex;
      align-items: center;
      gap: @spacing-md;
      font-size: @font-size-sm;
      color: @chat-text-tertiary;
      min-height: 24px;

      .tip-item {
        display: flex;
        align-items: center;
        gap: @spacing-xs;

        &.processing {
          color: @chat-primary;
          font-weight: @font-weight-medium;
        }
      }

      .tip-icon {
        font-size: @font-size-base;
      }

      kbd {
        padding: 2px @spacing-xs;
        background: @chat-bg-secondary;
        border: 1px solid @chat-border;
        border-radius: @radius-xs;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: @font-size-xs;
        color: @chat-text-secondary;
      }

      .processing-text {
        display: flex;
        align-items: center;
        gap: @spacing-xs;
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
      padding: @spacing-md @spacing-lg;
    }

    .chat-messages-container .messages-scroll-area {
      padding: @spacing-lg;
    }
  }
</style>
