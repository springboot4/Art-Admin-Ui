<template>
  <div class="version-history">
    <div class="history-header">
      <h3>版本历史</h3>
      <a-button type="primary" @click="createVersion">
        <template #icon><plus-outlined /></template>
        创建新版本
      </a-button>
    </div>

    <div class="version-list">
      <a-timeline>
        <a-timeline-item
          v-for="version in versions"
          :key="version.id"
          :color="version.isCurrent ? 'green' : 'blue'"
        >
          <div class="version-item">
            <div class="version-header">
              <div class="version-info">
                <span class="version-number">{{ version.version }}</span>
                <span v-if="version.isCurrent" class="current-badge">当前版本</span>
                <span class="version-date">{{ formatDate(version.createdAt) }}</span>
              </div>
              <div class="version-actions">
                <a-space>
                  <a-button v-if="!version.isCurrent" size="small" @click="restoreVersion(version)">
                    恢复
                  </a-button>
                  <a-button size="small" @click="viewVersion(version)"> 查看 </a-button>
                  <a-button size="small" @click="compareVersion(version)"> 对比 </a-button>
                </a-space>
              </div>
            </div>

            <div class="version-description">
              {{ version.description || '无描述' }}
            </div>

            <div class="version-stats">
              <span class="stat-item">
                <nodes-outlined />
                {{ version.nodeCount }} 节点
              </span>
              <span class="stat-item">
                <apartment-outlined />
                {{ version.edgeCount }} 连线
              </span>
              <span class="stat-item">
                <user-outlined />
                {{ version.author }}
              </span>
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </div>

    <!-- 创建版本对话框 -->
    <a-modal
      v-model:open="showCreateModal"
      title="创建新版本"
      @ok="handleCreateVersion"
      :confirm-loading="creating"
    >
      <a-form :model="versionForm" layout="vertical">
        <a-form-item label="版本号" required>
          <a-input v-model:value="versionForm.version" placeholder="如: 1.0.1" />
        </a-form-item>
        <a-form-item label="版本描述">
          <a-textarea
            v-model:value="versionForm.description"
            placeholder="描述此版本的主要更改..."
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 版本对比对话框 -->
    <a-modal v-model:open="showCompareModal" title="版本对比" width="800px" :footer="null">
      <div class="version-compare">
        <div class="compare-header">
          <a-space>
            <span>基础版本:</span>
            <a-select v-model:value="compareBase" style="width: 150px">
              <a-select-option v-for="version in versions" :key="version.id" :value="version.id">
                {{ version.version }}
              </a-select-option>
            </a-select>
            <span>vs</span>
            <a-select v-model:value="compareTarget" style="width: 150px">
              <a-select-option v-for="version in versions" :key="version.id" :value="version.id">
                {{ version.version }}
              </a-select-option>
            </a-select>
          </a-space>
        </div>

        <div class="compare-content">
          <div class="diff-summary">
            <a-statistic
              title="节点变化"
              :value="getNodeDiff()"
              :value-style="{ color: getNodeDiff() > 0 ? '#3f8600' : '#cf1322' }"
              suffix="个"
            />
            <a-statistic
              title="连线变化"
              :value="getEdgeDiff()"
              :value-style="{ color: getEdgeDiff() > 0 ? '#3f8600' : '#cf1322' }"
              suffix="条"
            />
          </div>

          <div class="diff-details">
            <h4>详细变更</h4>
            <div class="change-list">
              <div v-for="change in getDetailedChanges()" :key="change.id" class="change-item">
                <a-tag :color="getChangeColor(change.type)">
                  {{ getChangeLabel(change.type) }}
                </a-tag>
                <span>{{ change.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue'
  import {
    Button as AButton,
    Timeline as ATimeline,
    TimelineItem as ATimelineItem,
    Space as ASpace,
    Modal as AModal,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    Textarea as ATextarea,
    Select as ASelect,
    SelectOption as ASelectOption,
    Statistic as AStatistic,
    Tag as ATag,
    message,
  } from 'ant-design-vue'
  import { PlusOutlined, ApartmentOutlined, UserOutlined } from '@ant-design/icons-vue'

  const emit = defineEmits(['restore', 'close'])

  const showCreateModal = ref(false)
  const showCompareModal = ref(false)
  const creating = ref(false)
  const compareBase = ref('')
  const compareTarget = ref('')

  const versionForm = reactive({
    version: '',
    description: '',
  })

  // 模拟版本数据
  const versions = ref([
    {
      id: 'v3',
      version: '1.2.0',
      description: '新增邮件发送节点，优化大模型节点配置',
      createdAt: new Date().toISOString(),
      author: '张三',
      nodeCount: 8,
      edgeCount: 7,
      isCurrent: true,
    },
    {
      id: 'v2',
      version: '1.1.0',
      description: '修复条件判断节点的bug，增加数据转换节点',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      author: '李四',
      nodeCount: 6,
      edgeCount: 5,
      isCurrent: false,
    },
    {
      id: 'v1',
      version: '1.0.0',
      description: '初始版本，包含基础的AI对话流程',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      author: '王五',
      nodeCount: 4,
      edgeCount: 3,
      isCurrent: false,
    },
  ])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  }

  const createVersion = () => {
    versionForm.version = getNextVersion()
    versionForm.description = ''
    showCreateModal.value = true
  }

  const getNextVersion = (): string => {
    const currentVersion = versions.value.find((v) => v.isCurrent)?.version || '1.0.0'
    const [major, minor, patch] = currentVersion.split('.').map(Number)
    return `${major}.${minor}.${patch + 1}`
  }

  const handleCreateVersion = async () => {
    if (!versionForm.version.trim()) {
      message.error('请输入版本号')
      return
    }

    creating.value = true
    try {
      // 模拟创建版本
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 将当前版本设为非当前
      versions.value.forEach((v) => (v.isCurrent = false))

      // 添加新版本
      versions.value.unshift({
        id: 'v' + Date.now(),
        version: versionForm.version,
        description: versionForm.description,
        createdAt: new Date().toISOString(),
        author: '当前用户',
        nodeCount: Math.floor(Math.random() * 10) + 5,
        edgeCount: Math.floor(Math.random() * 8) + 3,
        isCurrent: true,
      })

      message.success('版本创建成功')
      showCreateModal.value = false
    } catch (error) {
      message.error('创建版本失败')
    } finally {
      creating.value = false
    }
  }

  const restoreVersion = (version: any) => {
    emit('restore', version.id)

    // 更新当前版本标记
    versions.value.forEach((v) => (v.isCurrent = v.id === version.id))
    message.success(`已恢复到版本 ${version.version}`)
  }

  const viewVersion = (version: any) => {
    // 这里可以打开版本详情视图
    message.info(`查看版本 ${version.version}`)
  }

  const compareVersion = (version: any) => {
    compareTarget.value = version.id
    compareBase.value = versions.value.find((v) => v.isCurrent)?.id || ''
    showCompareModal.value = true
  }

  const getNodeDiff = (): number => {
    const baseVersion = versions.value.find((v) => v.id === compareBase.value)
    const targetVersion = versions.value.find((v) => v.id === compareTarget.value)
    if (!baseVersion || !targetVersion) return 0
    return targetVersion.nodeCount - baseVersion.nodeCount
  }

  const getEdgeDiff = (): number => {
    const baseVersion = versions.value.find((v) => v.id === compareBase.value)
    const targetVersion = versions.value.find((v) => v.id === compareTarget.value)
    if (!baseVersion || !targetVersion) return 0
    return targetVersion.edgeCount - baseVersion.edgeCount
  }

  const getDetailedChanges = () => {
    // 模拟详细变更
    return [
      { id: 1, type: 'added', description: '新增邮件发送节点' },
      { id: 2, type: 'modified', description: '修改大模型节点配置' },
      { id: 3, type: 'removed', description: '删除测试节点' },
    ]
  }

  const getChangeColor = (type: string): string => {
    const colors = {
      added: 'success',
      modified: 'warning',
      removed: 'error',
    }
    return colors[type] || 'default'
  }

  const getChangeLabel = (type: string): string => {
    const labels = {
      added: '新增',
      modified: '修改',
      removed: '删除',
    }
    return labels[type] || type
  }
</script>

<style lang="less" scoped>
  .version-history {
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .version-list {
      .version-item {
        .version-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .version-info {
            display: flex;
            align-items: center;
            gap: 12px;

            .version-number {
              font-size: 16px;
              font-weight: 600;
              color: #262626;
            }

            .current-badge {
              background: #52c41a;
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 12px;
            }

            .version-date {
              font-size: 14px;
              color: #8c8c8c;
            }
          }
        }

        .version-description {
          color: #595959;
          margin-bottom: 12px;
          line-height: 1.5;
        }

        .version-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #8c8c8c;

          .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      }
    }

    .version-compare {
      .compare-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0f0f0;
      }

      .compare-content {
        .diff-summary {
          display: flex;
          gap: 32px;
          margin-bottom: 24px;
          justify-content: center;
        }

        .diff-details {
          h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
          }

          .change-list {
            .change-item {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              padding: 8px;
              background: #fafafa;
              border-radius: 4px;
            }
          }
        }
      }
    }
  }
</style>
