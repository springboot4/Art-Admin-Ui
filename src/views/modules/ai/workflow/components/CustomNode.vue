<template>
  <div
    :class="['custom-node', `status-${data.status}`, { 'has-error': data.status === 'error' }]"
    :style="{ borderColor: data.color }"
  >
    <!-- 节点头部 -->
    <div :style="{ backgroundColor: data.color }" class="node-header">
      <span class="node-icon">{{ data.icon }}</span>
      <span class="node-title">{{ label }}</span>

      <!-- 节点操作按钮 -->
      <div class="node-actions">
        <a-button size="small" title="编辑节点" type="text" @click="$emit('edit', id)">
          <template #icon>
            <EditOutlined />
          </template>
        </a-button>
        <a-button danger size="small" title="删除节点" type="text" @click="$emit('delete', id)">
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <!-- 节点内容 -->
    <div class="node-content">
      <div class="node-description">{{ data.description }}</div>

      <!-- 条件节点显示条件列表 -->
      <div
        v-if="data.nodeType === 'condition' && data.config?.conditions?.length"
        class="condition-preview"
      >
        <div
          v-for="condition in data.config.conditions"
          :key="`preview_${condition.id}`"
          class="condition-item-with-port"
        >
          <div class="condition-content">
            <span class="condition-label">{{ condition.label }}</span>
            <span
              v-if="condition.expression && condition.expression !== 'else'"
              class="condition-expr"
            >
              {{ condition.expression }}
            </span>
            <span v-else class="condition-expr else-expr">默认分支</span>
          </div>
          <!-- 端口直接在条件项内 -->
          <Handle
            :id="condition.id"
            :class="[
              'node-handle',
              'output-handle',
              'inline-condition-handle',
              condition.id === 'else' ? 'else-handle' : '',
            ]"
            :title="`${condition.label}: ${condition.expression || 'N/A'}`"
            position="right"
            type="source"
          />
        </div>
      </div>

      <!-- 其他节点类型显示关键配置 -->
      <div v-else-if="data.config" class="config-preview">
        <!-- LLM 节点 -->
        <div v-if="isLLMNode" class="config-item">
          <span class="config-label">模型:</span>
          <span class="config-value">{{ modelDisplay || 'N/A' }}</span>
        </div>
        <!-- HTTP 节点 -->
        <div v-if="data.nodeType === 'http'" class="config-item">
          <span class="config-label">{{ data.config.method || 'GET' }}:</span>
          <span class="config-value">{{ data.config.url || '未配置' }}</span>
        </div>
        <div v-if="data.nodeType === 'http' && hasHttpConfig" class="config-item">
          <span class="config-label">配置:</span>
          <span class="config-value">{{ getHttpConfigSummary }}</span>
        </div>
        <!-- 代码节点 -->
        <div v-if="data.nodeType === 'code'" class="config-item">
          <span class="config-label">语言:</span>
          <span class="config-value">{{ data.config.language || 'Python' }}</span>
        </div>
      </div>
    </div>

    <!-- 状态指示器 -->
    <!--    <div v-if="data.status !== 'idle'" class="status-indicator">-->
    <!--      <span v-if="data.status === 'running'" class="status-icon running">⚡</span>-->
    <!--      <span v-else-if="data.status === 'success'" class="status-icon success">✅</span>-->
    <!--      <span v-else-if="data.status === 'error'" class="status-icon error">❌</span>-->
    <!--      <span v-else-if="data.status === 'warning'" class="status-icon warning">⚠️</span>-->
    <!--    </div>-->

    <!-- 输入端口 -->
    <Handle
      v-if="data.nodeType !== 'start'"
      id="target_handle"
      class="node-handle input-handle"
      position="left"
      type="target"
    />

    <!-- 输出端口 -->
    <!-- 普通节点单个输出端口 -->
    <Handle
      v-if="data.nodeType !== 'output' && data.nodeType !== 'condition'"
      id="source_handle"
      class="node-handle output-handle"
      position="right"
      type="source"
    />
  </div>
</template>

<script setup>
  import { computed, ref, watch } from 'vue'
  import { Handle } from '@vue-flow/core'
  import { Button as AButton } from 'ant-design-vue'
  import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'
  import { getModelLabelById } from '/@/hooks/ai/useAiModelOptions'

  const props = defineProps({
    id: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
      required: true,
    },
    label: {
      type: String,
      default: '',
    },
  })

  defineEmits(['delete', 'edit'])

  const LLM_NODE_TYPES = new Set(['llm', 'llm_answer'])
  const isLLMNode = computed(() => LLM_NODE_TYPES.has(props.data?.nodeType || ''))

  const modelDisplay = ref('')
  let lastLookupId = 0

  watch(
    () => props.data?.config?.model,
    async (modelId) => {
      const token = ++lastLookupId
      const normalized = modelId === undefined || modelId === null ? '' : String(modelId)

      if (!normalized) {
        modelDisplay.value = ''
        return
      }

      try {
        const label = await getModelLabelById(normalized)
        if (token === lastLookupId) {
          modelDisplay.value = label || normalized
        }
      } catch (error) {
        if (token === lastLookupId) {
          modelDisplay.value = normalized
        }
      }
    },
    { immediate: true },
  )

  // HTTP配置摘要
  const hasHttpConfig = computed(() => {
    if (props.data.nodeType !== 'http') return false
    const config = props.data.config
    return (
      (config.params && config.params.length > 0) ||
      (config.headers && config.headers.length > 0) ||
      (config.body && config.body.type !== 'none')
    )
  })

  const getHttpConfigSummary = computed(() => {
    if (props.data.nodeType !== 'http') return ''
    const config = props.data.config
    const parts = []

    if (config.params && config.params.length > 0) {
      parts.push(`${config.params.length}个参数`)
    }

    if (config.headers && config.headers.length > 0) {
      parts.push(`${config.headers.length}个请求头`)
    }

    if (config.body && config.body.type !== 'none') {
      if (config.body.type === 'form-urlencoded') {
        const formDataCount = config.body.formData ? config.body.formData.length : 0
        parts.push(`表单(${formDataCount}项)`)
      } else if (config.body.type === 'json') {
        parts.push('JSON数据')
      }
    }

    return parts.join(', ') || '基础配置'
  })
</script>

<style scoped>
  .custom-node {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    min-width: 240px;
    max-width: 300px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: visible;
  }

  .custom-node:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
    border-color: #d1d5db;
    transform: translateY(-0.5px);
  }

  /* 选中状态 - 使用单一强调色 */
  .custom-node.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  /* 运行中 - 微妙的蓝色左边框强调 */
  .custom-node.status-running {
    border-left: 2px solid #3b82f6;
    border-left-width: 3px;
  }

  /* 成功 - 微妙的绿色左边框 */
  .custom-node.status-success {
    border-left: 2px solid #10b981;
    border-left-width: 3px;
  }

  /* 错误 - 微妙的红色左边框 */
  .custom-node.status-error {
    border-left: 2px solid #ef4444;
    border-left-width: 3px;
  }

  /* 头部 - 极简设计 */
  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 12px 10px;
    color: #111827;
    font-weight: 600;
    border-bottom: 1px solid #f3f4f6;
    background: #fafafa;
    border-top-left-radius: 7px;
    border-top-right-radius: 7px;
  }

  .node-icon {
    font-size: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .node-title {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #111827;
  }

  .node-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .custom-node:hover .node-actions {
    opacity: 1;
  }

  .node-actions :deep(.ant-btn) {
    width: 24px;
    height: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    background: transparent;
    border: none;
    border-radius: 4px;
    font-size: 13px;
  }

  .node-actions :deep(.ant-btn:hover) {
    color: #111827;
    background: rgba(0, 0, 0, 0.04);
  }

  .node-actions :deep(.ant-btn.ant-btn-dangerous:hover) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }

  .node-content {
    padding: 12px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
    background: #ffffff;
  }

  .node-description {
    color: #6b7280;
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .config-preview {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f3f4f6;
  }

  .config-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 11px;
  }

  .config-item:last-child {
    margin-bottom: 0;
  }

  .config-label {
    color: #9ca3af;
    font-weight: 500;
    flex-shrink: 0;
  }

  .config-value {
    color: #374151;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 端口设计 - 极简专业
   * 默认低调灰色，激活时单一蓝色
   */
  .node-handle {
    width: 10px;
    height: 10px;
    border: 2px solid #ffffff;
    background: #9ca3af;
    border-radius: 50%;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  /* 始终显示端口 */
  .node-handle {
    opacity: 1;
    transform: scale(1);
  }

  /* 激活状态 - 单一蓝色 */
  .node-handle.connecting,
  .node-handle:hover {
    border-color: #ffffff;
    background: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 1px 3px rgba(0, 0, 0, 0.15);
    transform: scale(1.15);
  }

  .input-handle {
    left: -6px;
  }

  .output-handle {
    right: -6px;
  }

  /* 条件节点 - 极简列表风格 */
  .condition-preview {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #f3f4f6;
  }

  .condition-item-with-port {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 6px;
    margin: 4px -6px;
    position: relative;
    border-radius: 4px;
    transition: all 0.15s ease;
    background: transparent;
  }

  .condition-item-with-port:hover {
    background: #f9fafb;
  }

  .condition-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .condition-label {
    font-size: 12px;
    font-weight: 500;
    color: #111827;
  }

  .condition-expr {
    font-size: 11px;
    color: #6b7280;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
      monospace;
  }

  .condition-expr.else-expr {
    color: #9ca3af;
    font-style: italic;
  }

  .inline-condition-handle {
    position: relative !important;
    transform: none !important;
    margin-left: 8px;
    flex-shrink: 0;
  }

  /* else条件端口 - 使用灰色系保持统一 */
  .inline-condition-handle.else-handle {
    background: #6b7280;
  }

  .inline-condition-handle.else-handle:hover,
  .inline-condition-handle.else-handle.connecting {
    background: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 1px 3px rgba(0, 0, 0, 0.15);
  }
</style>
