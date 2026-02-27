<template>
  <Card title="最近项目" :loading="loading">
    <div v-if="recentProjects.length > 0" class="space-y-3">
      <div
        v-for="project in recentProjects"
        :key="project.id"
        class="project-item"
        @click="handleOpenApp(project)"
      >
        <div class="project-left">
          <div class="app-avatar" :style="{ backgroundColor: getAvatarColor(project.name) }">
            {{ project.name.charAt(0).toUpperCase() }}
          </div>
          <div class="project-info">
            <div class="app-name">
              {{ project.name }}
              <span class="app-type-indicator">{{ formatMode(project.mode) }}</span>
            </div>
            <div class="app-description">{{ project.description || '暂无描述' }}</div>
          </div>
        </div>
        <div class="project-right">
          <span class="update-time">{{ formatTime(project.updateTime) }}</span>
          <Icon icon="ant-design:right-outlined" :size="14" color="#9ca3af" />
        </div>
      </div>
    </div>
    <div v-else class="text-center text-gray-500 py-8">
      <Icon icon="ant-design:folder-open-outlined" :size="48" color="#d9d9d9" />
      <div class="mt-3">暂无最近项目</div>
    </div>
  </Card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { Card, message } from 'ant-design-vue'
  import { Icon } from '/@/components/Icon'

  interface Project {
    id: number | string
    name: string
    description: string
    mode: string
    updateTime: string
    status: number
  }

  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
    apps: {
      type: Array,
      default: () => [],
    },
    workflows: {
      type: Array,
      default: () => [],
    },
  })

  const router = useRouter()

  // 格式化应用类型显示 - 与 AiAppList 保持一致
  function formatMode(mode: string) {
    const map: Record<string, string> = {
      chatbot: '聊天助手',
      completion: '文本生成',
      agent: 'Agent',
      chatflow: '对话流',
      workflow: '工作流',
    }
    return map[mode] || '未知类型'
  }

  // 格式化时间 - 与 AiAppList 保持一致
  function formatTime(time: string) {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < hour) {
      const minutes = Math.floor(diff / minute)
      return minutes < 1 ? '刚刚' : `${minutes}分钟前`
    } else if (diff < day) {
      const hours = Math.floor(diff / hour)
      return `${hours}小时前`
    } else if (diff < 7 * day) {
      const days = Math.floor(diff / day)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  // 生成头像颜色 - 与 AiAppList 保持一致
  function getAvatarColor(name: string) {
    if (!name) return '#1890ff'
    const colors = [
      '#1890ff',
      '#722ed1',
      '#13c2c2',
      '#52c41a',
      '#fa8c16',
      '#f5222d',
      '#eb2f96',
      '#096dd9',
      '#389e0d',
      '#d48806',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // 打开应用 - 与 AiAppList.handleOpenApp 保持一致
  function handleOpenApp(project: Project) {
    if (project.mode === 'workflow' || project.mode === 'chatflow') {
      router.push({
        path: '/ai/workflow',
        query: {
          appId: String(project.id),
          appMode: project.mode,
        },
      })
    } else if (project.mode === 'agent') {
      router.push({
        path: '/ai/agent',
        query: {
          appId: String(project.id),
          appMode: project.mode,
        },
      })
    } else {
      // chatbot, completion 等其他类型
      message.info(`正在打开应用: ${project.name}`)
    }
  }

  // 计算最近项目列表
  const recentProjects = computed<Project[]>(() => {
    const apps = Array.isArray(props.apps) ? props.apps : []
    const projects: Project[] = apps.map((app: any) => ({
      id: app.id,
      name: app.name || '未命名应用',
      description: app.description || '',
      mode: app.mode || 'chatbot',
      updateTime: app.updateTime || '',
      status: app.status || 0,
    }))

    // 按更新时间排序
    projects.sort((a, b) => {
      return new Date(b.updateTime || 0).getTime() - new Date(a.updateTime || 0).getTime()
    })

    return projects.slice(0, 5)
  })
</script>

<style lang="less" scoped>
  .project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      background: #fafafa;
    }

    .project-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;

      .app-avatar {
        width: 40px;
        height: 40px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .project-info {
        flex: 1;
        min-width: 0;

        .app-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;

          .app-type-indicator {
            font-size: 11px;
            font-weight: 500;
            color: #6b7280;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            white-space: nowrap;
            flex-shrink: 0;
          }
        }

        .app-description {
          font-size: 12px;
          color: #6b7280;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .project-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .update-time {
        font-size: 12px;
        color: #9ca3af;
      }
    }
  }
</style>
