<template>
  <div
    class="custom-node"
    :class="[
      `node-${data.type}`,
      `node-category-${getNodeCategory(data.type)}`,
      { 'node-running': data.status === 'running' },
      { 'node-success': data.status === 'success' },
      { 'node-error': data.status === 'error' },
      { 'node-selected': selected },
    ]"
  >
    <Handle
      v-if="!isStartNode"
      type="target"
      :position="Position.Left"
      class="node-handle-target"
    />

    <!-- 节点状态指示器 -->
    <div v-if="data.status && data.status !== 'idle'" class="node-status-indicator">
      <div class="status-dot" :class="`status-${data.status}`"></div>
    </div>

    <!-- 节点头部 -->
    <div class="node-header">
      <div class="node-header-left">
        <div class="node-icon-container">
          <span class="node-icon">{{ data.icon }}</span>
          <div v-if="data.status === 'running'" class="loading-ring"></div>
        </div>
        <div class="node-title-container">
          <span class="node-title">{{ label }}</span>
          <span v-if="data.version" class="node-version">v{{ data.version }}</span>
        </div>
      </div>
      <div class="node-header-right">
        <div v-if="data.status && data.status !== 'idle'" class="node-status">
          <loading-outlined v-if="data.status === 'running'" class="status-running" />
          <check-circle-outlined v-else-if="data.status === 'success'" class="status-success" />
          <close-circle-outlined v-else-if="data.status === 'error'" class="status-error" />
        </div>
        <a-dropdown trigger="click" @click.stop>
          <a-button size="small" type="text" class="more-btn">
            <template #icon><more-outlined /></template>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="settings" @click="onSettingsClick">
                <setting-outlined /> 节点配置
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="duplicate" @click="onDuplicate">
                <copy-outlined /> 复制节点
              </a-menu-item>
              <a-menu-item key="delete" @click="onDelete" danger>
                <delete-outlined /> 删除节点
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 节点内容 -->
    <div class="node-content">
      <div class="node-description">{{ data.description }}</div>

      <!-- 配置预览 -->
      <div v-if="hasConfig" class="node-config-preview">
        <!-- LLM节点配置 -->
        <template v-if="isLLMNode">
          <div v-if="data.config.model" class="config-item">
            <span class="config-label">模型:</span>
            <span class="config-value">{{ data.config.model }}</span>
          </div>
          <div v-if="data.config.temperature" class="config-item">
            <span class="config-label">创造性:</span>
            <span class="config-value">{{ data.config.temperature }}</span>
          </div>
        </template>

        <!-- 知识检索节点配置 -->
        <template v-else-if="data.type === 'knowledge'">
          <div v-if="data.config.knowledgeBaseId" class="config-item">
            <span class="config-label">知识库:</span>
            <span class="config-value">{{ data.config.knowledgeBaseId }}</span>
          </div>
          <div v-if="data.config.topK" class="config-item">
            <span class="config-label">返回数量:</span>
            <span class="config-value">{{ data.config.topK }}</span>
          </div>
        </template>

        <!-- 条件节点配置 -->
        <template v-else-if="data.type === 'condition'">
          <div v-if="data.config.conditions?.length" class="config-item">
            <span class="config-label">条件数:</span>
            <span class="config-value">{{ data.config.conditions.length }}</span>
          </div>
        </template>

        <!-- Webhook节点配置 -->
        <template v-else-if="data.type === 'webhook'">
          <div v-if="data.config.method" class="config-item">
            <span class="config-label">方法:</span>
            <span
              class="config-value method-badge"
              :class="`method-${data.config.method.toLowerCase()}`"
            >
              {{ data.config.method }}
            </span>
          </div>
          <div v-if="data.config.url" class="config-item">
            <span class="config-label">URL:</span>
            <span class="config-value">{{ truncateText(data.config.url, 25) }}</span>
          </div>
        </template>

        <!-- 通用提示词配置 -->
        <div v-if="data.config.prompt" class="config-item">
          <span class="config-label">提示词:</span>
          <span class="config-value">{{ truncateText(data.config.prompt, 30) }}</span>
        </div>
      </div>

      <!-- 执行统计 -->
      <div v-if="data.executionStats" class="execution-stats">
        <div class="stats-item">
          <span class="stats-label">执行次数:</span>
          <span class="stats-value">{{ data.executionStats.count || 0 }}</span>
        </div>
        <div v-if="data.executionStats.avgDuration" class="stats-item">
          <span class="stats-label">平均耗时:</span>
          <span class="stats-value">{{ data.executionStats.avgDuration }}ms</span>
        </div>
      </div>
    </div>

    <Handle
      v-if="!isOutputNode"
      type="source"
      :position="Position.Right"
      class="node-handle-source"
    />

    <!-- 多输出连接点（条件节点） -->
    <template v-if="data.type === 'condition' && data.config.conditions">
      <Handle
        v-for="(condition, index) in data.config.conditions"
        :key="`condition-${index}`"
        type="source"
        :id="`condition-${index}`"
        :position="Position.Right"
        :style="{ top: `${30 + index * 20}px` }"
        class="node-handle-condition"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { Handle, Position, NodeProps } from '@vue-flow/core'
  import { computed } from 'vue'
  import {
    Button as AButton,
    Dropdown as ADropdown,
    Menu as AMenu,
    MenuItem as AMenuItem,
    MenuDivider as AMenuDivider,
  } from 'ant-design-vue'
  import {
    SettingOutlined,
    MoreOutlined,
    CopyOutlined,
    DeleteOutlined,
    LoadingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
  } from '@ant-design/icons-vue'
  import { NODE_CATEGORIES } from '../../types/nodeTypes'
  import './style.less'

  interface CustomNodeData {
    type: string
    icon?: string
    description?: string
    config?: Record<string, any>
    status?: 'idle' | 'running' | 'success' | 'error'
    version?: string
    executionStats?: {
      count: number
      avgDuration: number
      successRate: number
    }
  }

  interface CustomNodeProps extends NodeProps {
    data: CustomNodeData
    label: string
    selected?: boolean
  }

  const props = defineProps<CustomNodeProps>()

  const emit = defineEmits(['settings', 'duplicate', 'delete'])

  const LLM_NODE_TYPES = new Set(['llm', 'llm_answer'])

  const isStartNode = computed(() => props.data.type === 'start')
  const isOutputNode = computed(() => props.data.type === 'output')
  const isLLMNode = computed(() => LLM_NODE_TYPES.has(props.data.type))

  const hasConfig = computed(() => {
    return props.data.config && Object.keys(props.data.config).length > 0
  })

  const getNodeCategory = (type: string): string => {
    const categoryMap = {
      start: NODE_CATEGORIES.TRIGGER,
      llm: NODE_CATEGORIES.LLM,
      knowledge: NODE_CATEGORIES.KNOWLEDGE,
      condition: NODE_CATEGORIES.LOGIC,
      code: NODE_CATEGORIES.LOGIC,
      webhook: NODE_CATEGORIES.OUTPUT,
      output: NODE_CATEGORIES.OUTPUT,
      llm_answer: NODE_CATEGORIES.LLM,
    }
    return categoryMap[type] || 'custom'
  }

  const onSettingsClick = () => {
    emit('settings', props.id)
  }

  const onDuplicate = () => {
    emit('duplicate', props.id)
  }

  const onDelete = () => {
    emit('delete', props.id)
  }

  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }
</script>
