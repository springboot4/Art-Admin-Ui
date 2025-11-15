<template>
  <div class="agent-studio-header">
    <div class="header-left">
      <a-button type="text" class="back-btn" @click="$emit('back')">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
      </a-button>
      <div class="app-meta">
        <span class="app-name">{{ app?.name || 'Agent 应用' }}</span>
        <a-tag :color="statusColor" class="status-tag">{{ statusLabel }}</a-tag>
      </div>
    </div>
    <div class="header-right">
      <a-button
        :disabled="!hasChanges || !!blockingIssues.length"
        :loading="saving"
        @click="$emit('save-draft')"
      >
        保存草稿
      </a-button>
      <a-tooltip :title="publishTooltip">
        <a-button
          type="primary"
          :disabled="!canPublish || !!blockingIssues.length"
          :loading="publishing"
          @click="$emit('publish')"
        >
          <template #icon><SendOutlined /></template>
          发布上线
        </a-button>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons-vue'

  interface Props {
    app: {
      id?: number | string
      name?: string
    } | null
    agent: {
      name?: string
      status?: string
      updateTime?: string
    } | null
    loading?: boolean
    saving?: boolean
    publishing?: boolean
    hasChanges?: boolean
    canPublish?: boolean
    blockingIssues?: string[]
  }

  const props = defineProps<Props>()

  defineEmits<{
    (e: 'back'): void
    (e: 'save-draft'): void
    (e: 'publish'): void
  }>()

  const statusLabel = computed(() => {
    const status = props.agent?.status
    if (!status) return '未配置'
    if (status === 'published') return '已发布'
    if (status === 'draft') return '草稿'
    return status
  })

  const statusColor = computed(() => {
    const status = props.agent?.status
    if (status === 'published') return 'success'
    if (status === 'draft') return 'warning'
    return 'default'
  })

  const publishTooltip = computed(() => {
    if (!props.canPublish) return '请先选择模型'
    if (props.blockingIssues?.length) return props.blockingIssues.join('；')
    return '发布当前配置'
  })
</script>

<style scoped>
  .agent-studio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 6px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .back-btn {
    color: #6b7280;
  }

  .back-btn:hover {
    color: #111827;
  }

  .app-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .app-name {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .status-tag {
    font-size: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
