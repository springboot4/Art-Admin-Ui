<template>
  <div class="config-section">
    <div class="section-header" @click="toggle">
      <div class="header-left">
        <span class="section-icon">{{ iconMap[icon] || '📋' }}</span>
        <h4 class="section-title">{{ title }}</h4>
      </div>
      <div class="header-right">
        <DownOutlined v-if="isCollapsed" class="collapse-icon" />
        <UpOutlined v-else class="collapse-icon" />
      </div>
    </div>

    <Transition name="section-content">
      <div v-if="!isCollapsed" class="section-content">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'

  interface Props {
    title: string
    icon?: string
    defaultCollapsed?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    icon: 'default',
    defaultCollapsed: false,
  })

  const iconMap: Record<string, string> = {
    robot: '🤖',
    message: '💬',
    book: '📚',
    tool: '🔧',
    setting: '⚙️',
    default: '📋',
  }

  const isCollapsed = ref(props.defaultCollapsed)

  function toggle() {
    isCollapsed.value = !isCollapsed.value
  }
</script>

<style scoped>
  .config-section {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    cursor: pointer;
    user-select: none;
    transition: background 0.2s;
  }

  .section-header:hover {
    background: #f9fafb;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-icon {
    font-size: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .collapse-icon {
    font-size: 12px;
    color: #6b7280;
    transition: transform 0.2s;
  }

  .section-content {
    padding: 0 16px 16px;
  }

  .section-content-enter-active,
  .section-content-leave-active {
    transition: all 0.3s ease;
    max-height: 2000px;
    overflow: hidden;
  }

  .section-content-enter-from,
  .section-content-leave-to {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
</style>
