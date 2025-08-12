<template>
  <div
    :class="[
      'node-result-card',
      {
        'is-selected': isSelected,
        'is-streaming': isStreaming,
        'has-error': hasError,
        [`view-mode-${viewMode}`]: true,
      },
    ]"
    :data-node-id="result.nodeId"
    @click="handleSelect"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="header-left">
        <div class="node-info">
          <div class="node-icon">
            <component :is="getNodeIcon()" />
          </div>
          <div class="node-details">
            <h4 class="node-name">{{ getNodeName() }}</h4>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="node-status">
          <div :class="['status-indicator', `status-${nodeState?.status || 'idle'}`]">
            <div class="status-dot"></div>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>
          <div v-if="executionTime" class="execution-time">
            {{ formatTime(executionTime) }}
          </div>
        </div>

        <div class="card-actions">
          <Tooltip title="复制结果">
            <a-button size="small" type="text" @click.stop="handleCopy">
              <template #icon>
                <CopyOutlined />
              </template>
            </a-button>
          </Tooltip>
          <Tooltip title="展开/收起">
            <a-button size="small" type="text" @click.stop="toggleExpanded">
              {{ isExpanded ? '收起' : '展开' }}
            </a-button>
          </Tooltip>
        </div>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div v-if="isExpanded" class="card-content">
      <!-- 错误显示 -->
      <div v-if="hasError" class="error-section">
        <a-alert
          :closable="false"
          :message="nodeState?.error || '执行失败'"
          show-icon
          type="error"
        />
      </div>

      <!-- LLM流式输出 -->
      <div v-else-if="isLLMNode && result.fullContent" class="llm-content">
        <div class="content-header">
          <span class="content-label">AI输出</span>
          <div class="content-meta">
            <span v-if="result.tokenUsage" class="token-usage">
              {{ result.tokenUsage.total }} tokens
            </span>
            <a-tag v-if="isStreaming" color="processing" size="small">
              <LoadingOutlined :spin="true" />
              生成中...
            </a-tag>
          </div>
        </div>

        <div class="llm-output" ref="contentRef">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="formatted-content" v-html="renderMarkdown(result.fullContent)"></div>
          <div v-if="isStreaming" class="typing-cursor">|</div>
        </div>

        <!-- Token使用详情 -->
        <div v-if="result.tokenUsage && isExpanded" class="token-details">
          <a-descriptions :column="3" size="small">
            <a-descriptions-item label="提示词">
              {{ result.tokenUsage.prompt }}
            </a-descriptions-item>
            <a-descriptions-item label="生成">
              {{ result.tokenUsage.completion }}
            </a-descriptions-item>
            <a-descriptions-item label="总计">
              {{ result.tokenUsage.total }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </div>

      <!-- 结构化输出 -->
      <div v-else-if="result.outputs && result.outputs.length > 0" class="structured-outputs">
        <div class="outputs-header">
          <span class="content-label">输出数据</span>
          <a-tag size="small">{{ result.outputs.length }} 项</a-tag>
        </div>

        <div class="outputs-list">
          <div v-for="(output, index) in result.outputs" :key="index" class="output-item">
            <div class="output-header">
              <span class="output-name">{{ output.name }}</span>
              <a-tag :color="getDataTypeColor(output.dataType)" size="small">
                {{ output.dataType }}
              </a-tag>
            </div>

            <div class="output-value">
              <pre v-if="typeof output.value === 'object'" class="json-output">{{
                JSON.stringify(output.value, null, 2)
              }}</pre>
              <div v-else class="text-output">{{ output.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-content">
        <Empty
          :image-style="{ height: '40px' }"
          description="暂无输出数据"
          image="/empty-box.svg"
        />
      </div>

      <!-- 性能指标 -->
      <div v-if="showMetrics && executionTime" class="performance-metrics">
        <a-divider>性能指标</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <Statistic
              :value="executionTime"
              :value-style="{ fontSize: '14px' }"
              suffix="ms"
              title="执行时间"
            />
          </a-col>
          <a-col v-if="result.tokenUsage" :span="8">
            <Statistic
              :value="result.tokenUsage.total"
              :value-style="{ fontSize: '14px' }"
              title="Token使用"
            />
          </a-col>
          <a-col :span="8">
            <Statistic
              :value="getOutputSize()"
              :value-style="{ fontSize: '14px' }"
              suffix="字符"
              title="输出大小"
            />
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 简洁模式预览 -->
    <div v-else class="card-preview">
      <div class="preview-content">
        <span v-if="result.fullContent" class="preview-text">
          {{ truncateText(result.fullContent, 100) }}
        </span>
        <span v-else-if="result.outputs && result.outputs.length > 0" class="preview-text">
          {{ getOutputsPreview() }}
        </span>
        <span v-else class="preview-placeholder"> 点击查看详细结果... </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, nextTick } from 'vue'
  import {
    ApiOutlined,
    CopyOutlined,
    LoadingOutlined,
    PlayCircleOutlined,
    RobotOutlined,
  } from '@ant-design/icons-vue'
  import type { NodeExecutionResult, NodeExecutionState } from '../types'
  import { Empty, Statistic, Tooltip } from 'ant-design-vue'

  interface Props {
    result: NodeExecutionResult
    nodeState?: NodeExecutionState
    isSelected?: boolean
    viewMode?: 'timeline' | 'tree' | 'focus'
  }

  const props = withDefaults(defineProps<Props>(), {
    isSelected: false,
    viewMode: 'timeline',
  })

  const emit = defineEmits<{
    select: [nodeId: string]
    copy: [result: NodeExecutionResult]
  }>()

  // 组件状态
  const isExpanded = ref(props.viewMode === 'focus')
  const showMetrics = ref(false)

  // 计算属性
  const hasError = computed(() => props.nodeState?.status === 'error')
  const isStreaming = computed(
    () =>
      props.nodeState?.status === 'running' &&
      props.result.fullContent &&
      !props.nodeState?.endTime,
  )
  const isLLMNode = computed(() => Boolean(props.result.fullContent || props.result.chunks))
  const executionTime = computed(() => props.result.executionTime || 0)

  // 方法
  const handleSelect = () => {
    emit('select', props.result.nodeId)
  }

  const handleCopy = () => {
    emit('copy', props.result)
  }

  const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
  }

  const getNodeIcon = () => {
    // 根据节点是否有LLM内容来判断图标
    if (isLLMNode.value) {
      return RobotOutlined
    } else if (props.result.outputs) {
      return PlayCircleOutlined
    } else {
      return ApiOutlined
    }
  }

  const getNodeName = () => {
    // 优先使用nodeName，如果没有则直接使用nodeId
    return props.result.nodeName || props.result.nodeId
  }

  const getStatusText = () => {
    const statusMap = {
      idle: '等待',
      running: '运行中',
      success: '成功',
      error: '失败',
    }
    return statusMap[props.nodeState?.status || 'idle']
  }

  const formatTime = (time: number) => {
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(1)}s`
  }

  const renderMarkdown = (content: string) => {
    // 简单的文本格式化，避免使用外部依赖
    try {
      return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^#{1,6}\s+(.*)$/gm, '<h3>$1</h3>')
    } catch (error) {
      console.error('文本格式化失败:', error)
      return content.replace(/\n/g, '<br>')
    }
  }

  const getDataTypeColor = (dataType: string) => {
    const colorMap = {
      string: 'blue',
      number: 'green',
      boolean: 'orange',
      object: 'purple',
      array: 'cyan',
      any: 'default',
    }
    return colorMap[dataType] || 'default'
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getOutputsPreview = () => {
    if (!props.result.outputs || props.result.outputs.length === 0) return ''

    const firstOutput = props.result.outputs[0]
    let preview = `${firstOutput.name}: `

    if (typeof firstOutput.value === 'string') {
      preview += truncateText(firstOutput.value, 50)
    } else {
      preview += `[${firstOutput.dataType}]`
    }

    if (props.result.outputs.length > 1) {
      preview += ` +${props.result.outputs.length - 1} 项`
    }

    return preview
  }

  const getOutputSize = () => {
    let size = 0

    if (props.result.fullContent) {
      size = props.result.fullContent.length
    } else if (props.result.outputs) {
      size = props.result.outputs.reduce((total, output) => {
        return total + JSON.stringify(output.value).length
      }, 0)
    }

    return size
  }

  // 强制DOM实时更新 - 监听内容变化
  const contentRef = ref<HTMLElement>()

  watch(
    () => props.result.fullContent,
    async (newContent) => {
      if (newContent && isStreaming.value) {
        // 强制Vue重新渲染组件
        await nextTick()

        // 滚动到底部显示最新内容
        if (contentRef.value) {
          const scrollContainer = contentRef.value.closest('.result-scroll-area')
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      }
    },
    { immediate: true, flush: 'sync' },
  )
</script>

<style lang="less" scoped>
  .node-result-card {
    background: #ffffff;
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
    overflow: hidden;

    &:hover {
      border-color: #d9d9d9;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    &.is-selected {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }

    &.is-streaming {
      border-color: #52c41a;
      box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
    }

    &.has-error {
      border-color: #ff4d4f;
      box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
    }

    // 视图模式样式
    &.view-mode-focus {
      border-radius: 16px;
      margin-bottom: 16px;
    }

    &.view-mode-tree {
      border-radius: 8px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);

    .header-left {
      flex: 1;
      min-width: 0;
    }

    .node-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .node-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f9ff;
        border-radius: 8px;
        color: #1890ff;
        font-size: 16px;
      }

      .node-details {
        flex: 1;
        min-width: 0;

        .node-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #262626;
          line-height: 1.4;
        }

        .node-type {
          font-size: 12px;
          color: #8c8c8c;
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;

      .node-status {
        text-align: right;

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;

          .status-dot {
            width: 6px;
            height: 6px;
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
            font-size: 12px;
            font-weight: 500;
          }
        }

        .execution-time {
          font-size: 11px;
          color: #8c8c8c;
        }
      }

      .card-actions {
        display: flex;
        gap: 4px;
      }
    }
  }

  .card-content {
    padding: 16px;

    .error-section {
      margin-bottom: 12px;
    }

    .llm-content {
      .content-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .content-label {
          font-size: 13px;
          font-weight: 500;
          color: #595959;
        }

        .content-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .token-usage {
            font-size: 12px;
            color: #8c8c8c;
          }
        }
      }

      .llm-output {
        position: relative;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;

        .formatted-content {
          line-height: 1.6;

          :deep(strong) {
            font-weight: 600;
            color: #262626;
          }

          :deep(em) {
            font-style: italic;
            color: #595959;
          }

          :deep(code) {
            background: #f1f3f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.9em;
            font-family: 'Monaco', 'Menlo', monospace;
            color: #d63384;
          }

          :deep(h3) {
            font-size: 14px;
            font-weight: 600;
            color: #262626;
            margin: 12px 0 6px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #f0f0f0;
          }
        }

        .typing-cursor {
          display: inline-block;
          animation: blink 1s infinite;
          color: #1890ff;
          font-weight: bold;
        }
      }

      .token-details {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 8px;
      }
    }

    .structured-outputs {
      .outputs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .content-label {
          font-size: 13px;
          font-weight: 500;
          color: #595959;
        }
      }

      .outputs-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .output-item {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;

          .output-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #e9ecef;
            border-bottom: 1px solid #dee2e6;

            .output-name {
              font-size: 13px;
              font-weight: 500;
              color: #495057;
            }
          }

          .output-value {
            padding: 12px;

            .json-output {
              margin: 0;
              background: #ffffff;
              border: 1px solid #e9ecef;
              border-radius: 4px;
              padding: 8px;
              font-size: 12px;
              overflow-x: auto;
            }

            .text-output {
              word-break: break-word;
              line-height: 1.5;
            }
          }
        }
      }
    }

    .empty-content {
      text-align: center;
      padding: 20px;
      color: #8c8c8c;
    }

    .performance-metrics {
      margin-top: 16px;
    }
  }

  .card-preview {
    padding: 12px 16px;

    .preview-content {
      .preview-text {
        font-size: 13px;
        color: #595959;
        line-height: 1.5;
      }

      .preview-placeholder {
        font-size: 13px;
        color: #bfbfbf;
        font-style: italic;
      }
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

  // 响应式调整
  @media (max-width: 768px) {
    .card-header {
      .header-right {
        .card-actions {
          flex-direction: column;
          gap: 2px;
        }
      }
    }

    .card-content {
      padding: 12px;

      .performance-metrics {
        :deep(.ant-row) {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      }
    }
  }
</style>
