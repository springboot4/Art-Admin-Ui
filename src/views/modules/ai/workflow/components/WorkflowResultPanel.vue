<template>
  <div v-if="visible" class="workflow-result-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="panel-title">
          <span class="title-icon">🚀</span>
          <h3>执行结果</h3>
        </div>
        <div v-if="executionId" class="execution-id">
          <span class="label">执行ID:</span>
          <code class="exec-id">{{ executionId }}</code>
        </div>
      </div>
      <div class="header-right">
        <Button size="small" type="text" @click="$emit('close')">
          <template #icon>
            <CloseOutlined />
          </template>
        </Button>
      </div>
    </div>

    <!-- 智能执行仪表板 -->
    <div class="execution-dashboard">
      <div class="dashboard-grid">
        <!-- 执行状态 -->
        <div class="status-section-main">
          <div class="status-header">
            <span class="section-title">执行状态</span>
            <div class="execution-stats">{{ completedNodes }} 个节点已完成</div>
          </div>
        </div>

        <!-- 状态指示器 -->
        <div class="status-section">
          <div class="status-indicator">
            <div :class="['status-dot', `status-${currentStatus}`]"></div>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>
          <div v-if="executionTime" class="time-info">
            <ClockCircleOutlined class="time-icon" />
            <span>{{ formatTime(executionTime) }}</span>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="quick-actions">
          <Space>
            <Button v-if="isRunning" size="small" danger @click="$emit('stop')">
              <template #icon>
                <PauseCircleOutlined />
              </template>
              停止
            </Button>
            <Button v-else-if="isCompleted" size="small" type="primary" @click="$emit('restart')">
              <template #icon>
                <ReloadOutlined />
              </template>
              重新运行
            </Button>
            <Dropdown>
              <Button size="small">
                <template #icon>
                  <MoreOutlined />
                </template>
              </Button>
              <template #overlay>
                <Menu>
                  <Menu.Item @click="clearResults">
                    <ClearOutlined />
                    清理结果
                  </Menu.Item>
                </Menu>
              </template>
            </Dropdown>
          </Space>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="hasErrors" class="error-banner">
        <Alert
          type="error"
          show-icon
          :message="`执行过程中发生 ${errors.length} 个错误`"
          :description="getErrorSummary()"
          closable
        />
      </div>
    </div>

    <!-- 结果内容区 -->
    <div class="result-content">
      <div class="result-scroll-area">
        <!-- 执行结果 -->
        <div class="overview-section">
          <!-- 执行中的节点 -->
          <div v-if="runningResults.length > 0" class="section-group">
            <div class="section-header">
              <div class="section-title">
                <LoadingOutlined :spin="true" />
                正在执行 ({{ runningResults.length }})
              </div>
            </div>
            <div class="cards-grid">
              <NodeResultCard
                v-for="result in runningResults"
                :key="result.nodeId"
                :result="result"
                :node-state="getNodeState(result.nodeId)"
                :is-selected="selectedNodeId === result.nodeId"
                @select="selectNode"
                @copy="copyNodeResult"
              />
            </div>
          </div>

          <!-- 已完成的节点 -->
          <div v-if="completedResults.length > 0" class="section-group">
            <div class="section-header">
              <div class="section-title">
                <CheckCircleOutlined style="color: #52c41a" />
                执行完成 ({{ completedResults.length }})
              </div>
            </div>
            <div class="cards-grid">
              <NodeResultCard
                v-for="result in completedResults"
                :key="result.nodeId"
                :result="result"
                :node-state="getNodeState(result.nodeId)"
                :is-selected="selectedNodeId === result.nodeId"
                @select="selectNode"
                @copy="copyNodeResult"
              />
            </div>
          </div>

          <!-- 错误节点 -->
          <div v-if="errorResults.length > 0" class="section-group">
            <div class="section-header">
              <div class="section-title">
                <CloseCircleOutlined style="color: #ff4d4f" />
                执行失败 ({{ errorResults.length }})
              </div>
            </div>
            <div class="cards-grid">
              <NodeResultCard
                v-for="result in errorResults"
                :key="result.nodeId"
                :result="result"
                :node-state="getNodeState(result.nodeId)"
                :is-selected="selectedNodeId === result.nodeId"
                @select="selectNode"
                @copy="copyNodeResult"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
  import { message, Button, Space, Dropdown, Menu, Alert } from 'ant-design-vue'
  import {
    CloseOutlined,
    ClockCircleOutlined,
    PauseCircleOutlined,
    ReloadOutlined,
    MoreOutlined,
    ClearOutlined,
    LoadingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
  } from '@ant-design/icons-vue'
  import NodeResultCard from './NodeResultCard.vue'
  import type { NodeExecutionResult, NodeExecutionState, ExecutionError } from '../types'

  interface Props {
    visible: boolean
    isRunning: boolean
    isCompleted: boolean
    executionId: string | null
    nodeStates: Map<string, NodeExecutionState>
    executionResults: Map<string, NodeExecutionResult>
    nodeExecutionOrder: string[]
    errors: ExecutionError[]
    selectedNodeId?: string | null
    totalNodes: number
    completedNodes: number
    executionTime?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    selectedNodeId: null,
    executionTime: 0,
    nodeExecutionOrder: () => [],
  })

  const emit = defineEmits<{
    close: []
    stop: []
    restart: []
    selectNode: [nodeId: string]
    clearResults: []
  }>()

  // 只保留完整视图模式
  const viewMode = ref<'overview'>('overview')

  // 计算属性
  const currentStatus = computed(() => {
    if (props.hasErrors) return 'error'
    if (props.isRunning) return 'running'
    if (props.isCompleted) return 'success'
    return 'idle'
  })

  const hasErrors = computed(() => props.errors.length > 0)

  const sortedResults = computed(() => {
    // 直接按照nodeExecutionOrder的顺序来构建结果数组
    const orderedResults: NodeExecutionResult[] = []

    // 首先按执行顺序添加结果
    for (const nodeId of props.nodeExecutionOrder) {
      const result = props.executionResults.get(nodeId)
      if (result) {
        orderedResults.push(result)
      }
    }

    // 然后添加不在执行顺序中但有结果的节点（按startTime排序）
    const remainingResults = Array.from(props.executionResults.values())
      .filter((result) => !props.nodeExecutionOrder.includes(result.nodeId))
      .sort((a, b) => {
        const stateA = props.nodeStates.get(a.nodeId)
        const stateB = props.nodeStates.get(b.nodeId)
        return (stateA?.startTime || 0) - (stateB?.startTime || 0)
      })

    orderedResults.push(...remainingResults)

    return orderedResults
  })

  // 按状态分组的结果
  const runningResults = computed(() => {
    return sortedResults.value.filter((result) => {
      const state = props.nodeStates.get(result.nodeId)
      return state?.status === 'running'
    })
  })

  const completedResults = computed(() => {
    return sortedResults.value.filter((result) => {
      const state = props.nodeStates.get(result.nodeId)
      return state?.status === 'success'
    })
  })

  const errorResults = computed(() => {
    return sortedResults.value.filter((result) => {
      const state = props.nodeStates.get(result.nodeId)
      return state?.status === 'error'
    })
  })

  // 方法

  const getStatusText = () => {
    const statusMap = {
      idle: '等待中',
      running: '执行中',
      success: '已完成',
      error: '执行失败',
    }
    return statusMap[currentStatus.value] || '未知状态'
  }

  const getNodeState = (nodeId: string): NodeExecutionState | undefined => {
    return props.nodeStates.get(nodeId)
  }

  const formatTime = (time: number) => {
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(1)}s`
  }

  const getErrorSummary = () => {
    if (props.errors.length === 0) return ''
    const firstError = props.errors[0]
    return `${firstError.message}${props.errors.length > 1 ? ' 等' : ''}`
  }

  const selectNode = (nodeId: string) => {
    emit('selectNode', nodeId)
  }

  const copyNodeResult = (result: NodeExecutionResult) => {
    let content = ''

    if (result.fullContent) {
      content = result.fullContent
    } else if (result.outputs) {
      content = result.outputs
        .map((output) => `${output.name}: ${JSON.stringify(output.value, null, 2)}`)
        .join('\n')
    }

    if (content) {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          message.success('结果已复制到剪贴板')
        })
        .catch(() => {
          message.error('复制失败')
        })
    }
  }

  const clearResults = () => {
    emit('clearResults')
  }

  // 监听选中节点的变化
  watch(
    () => props.selectedNodeId,
    (newNodeId) => {
      if (newNodeId && viewMode.value === 'focus') {
        // 在专注模式下，如果选中了节点，自动滚动到该节点
        const element = document.querySelector(`[data-node-id="${newNodeId}"]`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    },
  )
</script>

<style lang="less" scoped>
  .workflow-result-panel {
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

    .execution-id {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #8c8c8c;

      .label {
        font-weight: 500;
      }

      .exec-id {
        background: #f6f6f6;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
      }
    }
  }

  .execution-dashboard {
    padding: 16px 20px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
    }

    .status-section-main {
      min-width: 0;

      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .section-title {
          font-size: 13px;
          font-weight: 500;
          color: #595959;
        }

        .execution-stats {
          font-size: 12px;
          color: #8c8c8c;
        }
      }
    }

    .status-section {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 6px;

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;

          &.status-idle {
            background: #d9d9d9;
          }
          &.status-running {
            background: #1890ff;
            animation: pulse 2s infinite;
          }
          &.status-success {
            background: #52c41a;
          }
          &.status-error {
            background: #ff4d4f;
          }
        }

        .status-text {
          font-size: 13px;
          font-weight: 500;
          color: #262626;
        }
      }

      .time-info {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #8c8c8c;

        .time-icon {
          font-size: 12px;
        }
      }
    }

    .error-banner {
      margin-top: 12px;
    }
  }

  .result-content {
    flex: 1;
    overflow: hidden;

    .result-scroll-area {
      height: 100%;
      overflow-y: auto;

      /* 自定义滚动条 */
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

    .overview-section {
      padding: 16px;
    }

    .section-group {
      margin-bottom: 24px;

      &:last-child {
        margin-bottom: 0;
      }

      .section-header {
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #262626;

          .anticon {
            font-size: 16px;
          }
        }
      }
    }

    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 240px;
      padding: 40px 20px;
      text-align: center;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .workflow-result-panel {
      width: 400px;
    }
  }

  @media (max-width: 768px) {
    .workflow-result-panel {
      width: 100vw;
      right: 0;
    }
  }
</style>
