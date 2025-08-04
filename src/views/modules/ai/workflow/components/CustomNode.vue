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
        <a-button size="small" title="复制节点" type="text" @click="$emit('copy', id)">
          <template #icon>
            <CopyOutlined />
          </template>
        </a-button>
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
          v-for="(condition, index) in data.config.conditions"
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
        <div v-if="data.nodeType === 'llm'" class="config-item">
          <span class="config-label">模型:</span>
          <span class="config-value">{{ data.config.model || 'N/A' }}</span>
        </div>
        <!-- HTTP 节点 -->
        <div v-if="data.nodeType === 'http'" class="config-item">
          <span class="config-label">{{ data.config.method || 'GET' }}:</span>
          <span class="config-value">{{ data.config.url || '未配置' }}</span>
        </div>
        <!-- 代码节点 -->
        <div v-if="data.nodeType === 'code'" class="config-item">
          <span class="config-label">语言:</span>
          <span class="config-value">{{ data.config.language || 'Python' }}</span>
        </div>
      </div>
    </div>

    <!-- 状态指示器 -->
    <div v-if="data.status !== 'idle'" class="status-indicator">
      <span v-if="data.status === 'running'" class="status-icon running">⚡</span>
      <span v-else-if="data.status === 'success'" class="status-icon success">✅</span>
      <span v-else-if="data.status === 'error'" class="status-icon error">❌</span>
      <span v-else-if="data.status === 'warning'" class="status-icon warning">⚠️</span>
    </div>

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
  import { Handle } from '@vue-flow/core'
  import { Button as AButton } from 'ant-design-vue'
  import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue'

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

  const emit = defineEmits(['delete', 'edit', 'copy'])
</script>

<style scoped>
  .custom-node {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    min-width: 200px;
    max-width: 280px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease-in-out;
    position: relative;
    overflow: visible; /* Allow handles and buttons to overflow */
  }

  .custom-node:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
    border-color: #cbd5e1;
  }

  .custom-node.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  /* Status-specific styles */
  .custom-node.status-running {
    border-left: 4px solid #3b82f6;
  }

  .custom-node.status-success {
    border-left: 4px solid #22c55e;
  }

  .custom-node.status-error {
    border-left: 4px solid #ef4444;
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    color: #1f2937;
    font-weight: 600;
    border-bottom: 1px solid #f1f5f9;
    background-color: #f8fafc;
    border-top-left-radius: 11px;
    border-top-right-radius: 11px;
  }

  .node-icon {
    font-size: 18px;
  }

  .node-title {
    flex: 1;
    font-size: 14px;
  }

  .node-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .custom-node:hover .node-actions {
    opacity: 1;
  }

  .node-actions .ant-btn {
    color: #64748b;
    background: transparent;
    border: none;
  }

  .node-actions .ant-btn:hover {
    color: #1f2937;
    background: #e2e8f0;
  }

  .node-content {
    padding: 12px 14px;
    font-size: 13px;
    color: #475569;
  }

  /* Modern Port (Handle) Styles */
  .node-handle {
    width: 12px;
    height: 12px;
    border: 2px solid #e2e8f0;
    background: #ffffff;
    border-radius: 50%;
    transition: all 0.2s ease-in-out;
    opacity: 0; /* Hidden by default */
    transform: scale(0.8);
  }

  /* Show handles on node hover or when node is selected */
  .custom-node:hover .node-handle,
  .custom-node.selected .node-handle {
    opacity: 1;
    transform: scale(1);
  }

  /* Highlight handle when connecting or hovering directly */
  .node-handle.connecting,
  .node-handle:hover {
    border-color: #3b82f6;
    background: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
    transform: scale(1.2); /* Add extra emphasis */
  }

  .input-handle {
    left: -7px;
  }

  .output-handle {
    right: -7px;
  }

  /* Condition Node Specific Styles */
  .condition-preview {
    margin-top: 8px;
  }

  .condition-item-with-port {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    position: relative;
  }

  .condition-content {
    font-size: 12px;
    color: #334155;
  }

  .inline-condition-handle {
    position: static; /* Remove absolute positioning */
    transform: none;
    margin-left: 12px;
  }
</style>
