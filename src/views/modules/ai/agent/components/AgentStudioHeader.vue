<template>
  <div class="agent-studio-header">
    <div class="header-left">
      <a-button type="text" class="back-btn" @click="$emit('back')">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
      </a-button>
      <div class="app-meta">
        <div class="app-name-row">
          <span class="app-name">{{ app?.name || 'Agent 应用' }}</span>
          <a-tag color="blue" v-if="agentStatus">{{ statusLabel }}</a-tag>
        </div>
        <div class="app-subtitle">
          <span>应用 ID：{{ app?.id }}</span>
          <a-divider type="vertical" />
          <span v-if="agent?.updateTime">更新于 {{ formatTime(agent?.updateTime) }}</span>
          <span v-else>配置尚未发布</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ArrowLeftOutlined } from '@ant-design/icons-vue'

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
  }

  const props = defineProps<Props>()

  defineEmits<{ (e: 'back'): void }>()

  const statusLabel = computed(() => {
    const status = props.agent?.status
    if (!status) return '未配置'
    if (status === 'published') return '已发布'
    if (status === 'draft') return '草稿'
    return status
  })

  const agentStatus = computed(() => props.agent?.status)

  function formatTime(time?: string) {
    if (!time) return ''
    const date = new Date(time)
    return date.toLocaleString()
  }
</script>

<style scoped>
  .agent-studio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-radius: 20px;
    background: linear-gradient(135deg, #f0f5ff 0%, #ffffff 40%, #fff 100%);
    box-shadow: 0 10px 30px -20px rgba(24, 144, 255, 0.4);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .app-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .app-name-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-name {
    font-size: 22px;
    font-weight: 600;
    color: #1f2329;
  }

  .app-subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6b7785;
    font-size: 13px;
  }

  .header-right {
    display: flex;
    align-items: center;
  }
</style>
