<template>
  <div class="conversation-messages">
    <div class="messages-header">
      <span class="messages-title">对话消息配置</span>
      <a-tag color="blue" size="small">{{ messages.length }} 条消息</a-tag>
    </div>

    <div class="messages-list">
      <div
        v-for="(message, index) in messages"
        :key="message.id"
        :class="`message-${message.role}`"
        class="message-item"
      >
        <!-- 消息头部 -->
        <div class="message-header">
          <div class="message-meta">
            <span class="message-index">消息 {{ index + 1 }}</span>
            <a-select
              v-model:value="message.role"
              class="role-selector"
              size="small"
              @change="handleRoleChange(index, $event)"
            >
              <a-select-option value="user">
                <div class="role-option">
                  <UserOutlined />
                  <span>user</span>
                </div>
              </a-select-option>
              <a-select-option value="assistant">
                <div class="role-option">
                  <RobotOutlined />
                  <span>assistant</span>
                </div>
              </a-select-option>
            </a-select>
          </div>

          <div class="message-actions">
            <a-button
              :disabled="index === 0"
              size="small"
              title="上移"
              type="text"
              @click="handleMoveUp(index)"
            >
              <template #icon>
                <ArrowUpOutlined />
              </template>
            </a-button>
            <a-button
              :disabled="index === messages.length - 1"
              size="small"
              title="下移"
              type="text"
              @click="handleMoveDown(index)"
            >
              <template #icon>
                <ArrowDownOutlined />
              </template>
            </a-button>
            <a-button
              :disabled="messages.length <= 1"
              danger
              size="small"
              title="删除消息"
              type="text"
              @click="handleRemoveMessage(index)"
            >
              <template #icon>
                <DeleteOutlined />
              </template>
            </a-button>
          </div>
        </div>

        <!-- 消息内容编辑器 -->
        <div class="message-content">
          <EnhancedTextEditor
            v-model:value="message.content"
            :default-rows="4"
            :edges="edges"
            :max-rows="15"
            :min-rows="3"
            :node-id="nodeId"
            :nodes="nodes"
            :placeholder="getMessagePlaceholder(message.role)"
            :referenceParameters="referenceParameters"
            @change="handleMessageContentChange(index, $event)"
            @update:referenceParameters="$emit('update:referenceParameters', $event)"
          />
        </div>

        <!-- 消息统计信息 -->
        <div v-if="message.content" class="message-stats">
          <span class="char-count">{{ message.content.length }} 字符</span>
          <span v-if="getVariableCount(message.content) > 0" class="variable-count">
            {{ getVariableCount(message.content) }} 个变量
          </span>
        </div>
      </div>
    </div>

    <!-- 添加消息按钮 -->
    <div class="add-message-section">
      <a-dropdown placement="top" trigger="click">
        <a-button block class="add-message-btn" size="large" type="dashed">
          <template #icon>
            <PlusOutlined />
          </template>
          添加消息
        </a-button>
        <template #overlay>
          <a-menu @click="handleAddMessage">
            <a-menu-item key="user">
              <div class="role-option">
                <UserOutlined />
                <span>用户消息</span>
              </div>
            </a-menu-item>
            <a-menu-item key="assistant">
              <div class="role-option">
                <RobotOutlined />
                <span>助手消息</span>
              </div>
            </a-menu-item>
            <a-menu-item key="system">
              <div class="role-option">
                <SettingOutlined />
                <span>系统消息</span>
              </div>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- 消息预览 -->
    <div v-if="messages.length > 0" class="messages-preview">
      <a-collapse ghost>
        <a-collapse-panel key="preview" header="对话预览">
          <template #extra>
            <a-tag color="green" size="small">{{ messages.length }} 条</a-tag>
          </template>
          <div class="preview-content">
            <div
              v-for="(message, index) in messages"
              :key="message.id"
              :class="`preview-${message.role}`"
              class="preview-message"
            >
              <div class="preview-header">
                <span class="preview-role">{{ getRoleLabel(message.role) }}</span>
                <span class="preview-index">#{{ index + 1 }}</span>
              </div>
              <div class="preview-text">
                {{ message.content || '(空内容)' }}
              </div>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <!-- 消息提示 -->
    <div v-if="messages.length === 0" class="empty-messages">
      <a-empty :image="false" description="还没有添加任何消息">
        <template #description>
          <p>对话消息用于构建多轮对话场景</p>
          <p>点击上方按钮添加第一条消息</p>
        </template>
      </a-empty>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, ref, watch } from 'vue'
  import {
    Button as AButton,
    Collapse as ACollapse,
    CollapsePanel as ACollapsePanel,
    Dropdown as ADropdown,
    Empty as AEmpty,
    Menu as AMenu,
    MenuItem as AMenuItem,
    Select as ASelect,
    SelectOption as ASelectOption,
    Tag as ATag,
  } from 'ant-design-vue'
  import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    DeleteOutlined,
    PlusOutlined,
    RobotOutlined,
    SettingOutlined,
    UserOutlined,
  } from '@ant-design/icons-vue'
  import EnhancedTextEditor from './EnhancedTextEditor.vue'

  const props = defineProps({
    value: {
      type: Array,
      default: () => [],
    },
    // 当前节点ID，用于计算可用变量
    nodeId: {
      type: String,
      required: true,
    },
    // 工作流节点
    nodes: {
      type: Array,
      required: true,
    },
    // 工作流边
    edges: {
      type: Array,
      required: true,
    },
    // 变量引用参数列表
    referenceParameters: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['update:value', 'change', 'update:referenceParameters'])

  // 内部消息列表
  const messages = ref([])

  // 发送更新事件
  const emitUpdate = () => {
    const messageList = messages.value.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
    }))
    emit('update:value', messageList)
    emit('change', messageList)
  }

  // 初始化消息列表
  const initializeMessages = () => {
    if (props.value && props.value.length > 0) {
      messages.value = props.value.map((msg, index) => ({
        id: msg.id || `msg_${Date.now()}_${index}`,
        role: msg.role || 'user',
        content: msg.content || '',
      }))
    } else {
      // 默认添加一条用户消息
      messages.value = [
        {
          id: `msg_${Date.now()}_0`,
          role: 'user',
          content: '${question}',
        },
      ]
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    initializeMessages()
  })

  // 监听value变化
  watch(
    () => props.value,
    (newValue) => {
      if (newValue && Array.isArray(newValue)) {
        const newValueStr = JSON.stringify(newValue)
        const currentValueStr = JSON.stringify(
          messages.value.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          })),
        )

        if (newValueStr !== currentValueStr) {
          initializeMessages()
        }
      }
    },
  )

  // 获取角色标签
  const getRoleLabel = (role) => {
    const roleLabels = {
      user: '用户',
      assistant: '助手',
      system: '系统',
    }
    return roleLabels[role] || role
  }

  // 获取消息占位符
  const getMessagePlaceholder = (role) => {
    const placeholders = {
      user: '请输入用户消息内容，可以使用变量如：${question}',
      assistant: '请输入助手回复内容，可以使用变量如：${output}',
      system: '请输入系统指令，用于指导AI的行为方式',
    }
    return placeholders[role] || '请输入消息内容...'
  }

  // 统计变量数量
  const getVariableCount = (content) => {
    if (!content) return 0
    const matches = content.match(/\$\{[^}]+\}/g)
    return matches ? matches.length : 0
  }

  // 处理角色变化
  const handleRoleChange = (index, newRole) => {
    messages.value[index].role = newRole
    emitUpdate()
  }

  // 处理消息内容变化
  const handleMessageContentChange = (index, newContent) => {
    messages.value[index].content = newContent
    emitUpdate()
  }

  // 添加消息
  const handleAddMessage = ({ key: role }) => {
    const newMessage = {
      id: `msg_${Date.now()}_${messages.value.length}`,
      role,
      content: '',
    }
    messages.value.push(newMessage)
    emitUpdate()
  }

  // 删除消息
  const handleRemoveMessage = (index) => {
    if (messages.value.length > 1) {
      messages.value.splice(index, 1)
      emitUpdate()
    }
  }

  // 上移消息
  const handleMoveUp = (index) => {
    if (index > 0) {
      const temp = messages.value[index]
      messages.value[index] = messages.value[index - 1]
      messages.value[index - 1] = temp
      emitUpdate()
    }
  }

  // 下移消息
  const handleMoveDown = (index) => {
    if (index < messages.value.length - 1) {
      const temp = messages.value[index]
      messages.value[index] = messages.value[index + 1]
      messages.value[index + 1] = temp
      emitUpdate()
    }
  }
</script>

<style scoped>
  .conversation-messages {
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    background: #fafbfc;
    overflow: hidden;
  }

  .messages-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .messages-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .messages-list {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .message-item {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .message-item:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .message-user {
    border-left: 4px solid #3b82f6;
  }

  .message-assistant {
    border-left: 4px solid #10b981;
  }

  .message-system {
    border-left: 4px solid #f59e0b;
  }

  .message-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .message-index {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }

  .role-selector {
    min-width: 100px;
  }

  .role-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .message-actions {
    display: flex;
    gap: 4px;
  }

  .message-actions .ant-btn {
    color: #64748b;
    border: none;
    transition: all 0.2s ease;
  }

  .message-actions .ant-btn:hover {
    color: #1890ff;
    background: rgba(24, 144, 255, 0.1);
  }

  .message-actions .ant-btn[disabled] {
    color: #d1d5db;
    background: transparent;
  }

  .message-actions .ant-btn.ant-btn-dangerous:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .message-content {
    padding: 16px;
  }

  .message-stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #64748b;
  }

  .char-count {
    color: #6b7280;
  }

  .variable-count {
    color: #0ea5e9;
    font-weight: 500;
  }

  .add-message-section {
    padding: 16px;
    border-top: 1px solid #f0f0f0;
  }

  .add-message-btn {
    border: 2px dashed #d1d5db;
    color: #6b7280;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .add-message-btn:hover {
    border-color: #1890ff;
    color: #1890ff;
    background: rgba(24, 144, 255, 0.05);
  }

  .messages-preview {
    border-top: 1px solid #f0f0f0;
    padding: 16px;
  }

  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 300px;
    overflow-y: auto;
  }

  .preview-message {
    padding: 12px;
    border-radius: 8px;
    background: #f8fafc;
    border-left: 3px solid #e2e8f0;
  }

  .preview-user {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .preview-assistant {
    border-left-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }

  .preview-system {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .preview-role {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }

  .preview-index {
    font-size: 11px;
    color: #9ca3af;
  }

  .preview-text {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.5;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI',
      monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .empty-messages {
    padding: 40px 20px;
    text-align: center;
  }

  .empty-messages :deep(.ant-empty-description) {
    color: #9ca3af;
  }

  .empty-messages p {
    margin: 4px 0;
    font-size: 13px;
    color: #6b7280;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .message-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .message-meta {
      justify-content: space-between;
    }

    .message-actions {
      justify-content: center;
    }

    .role-selector {
      min-width: auto;
      flex: 1;
    }
  }
</style>
