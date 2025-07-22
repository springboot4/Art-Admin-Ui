<template>
  <div 
    :class="['custom-node', `status-${data.status}`, { 'has-error': data.status === 'error' }]"
    :style="{ borderColor: data.color }"
  >
    <!-- 节点头部 -->
    <div class="node-header" :style="{ backgroundColor: data.color }">
      <span class="node-icon">{{ data.icon }}</span>
      <span class="node-title">{{ label }}</span>
      
      <!-- 节点操作按钮 -->
      <div class="node-actions">
        <a-button type="text" size="small" @click="$emit('copy', id)" title="复制节点">
          <template #icon><CopyOutlined /></template>
        </a-button>
        <a-button type="text" size="small" @click="$emit('edit', id)" title="编辑节点">
          <template #icon><EditOutlined /></template>
        </a-button>
        <a-button type="text" size="small" danger @click="$emit('delete', id)" title="删除节点">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </div>
    </div>
    
    <!-- 节点内容 -->
    <div class="node-content">
      <div class="node-description">{{ data.description }}</div>
      
      <!-- 条件节点显示条件列表 -->
      <div v-if="data.nodeType === 'condition' && data.config.conditions" class="condition-preview">
        <div 
          v-for="condition in data.config.conditions.slice(0, 2)" 
          :key="condition.id"
          class="condition-item"
        >
          <span class="condition-label">{{ condition.label }}</span>
          <span class="condition-expr">{{ condition.expression || 'N/A' }}</span>
        </div>
        <div v-if="data.config.conditions.length > 2" class="condition-more">
          +{{ data.config.conditions.length - 2 }} 更多条件
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
    
    <!-- 移除了悬浮添加按钮，现在通过工具栏按钮添加节点 -->
    
    <!-- 输入端口 -->
    <Handle 
      v-if="data.nodeType !== 'start'"
      type="target" 
      position="left" 
      class="node-handle input-handle"
    />
    
    <!-- 输出端口 -->
    <!-- 条件节点支持多个输出端口 -->
    <template v-if="data.nodeType === 'condition' && data.config.conditions">
      <div 
        v-for="(condition, index) in data.config.conditions" 
        :key="condition.id"
        class="condition-port-wrapper"
        :style="{ top: `${20 + index * 30}px` }"
      >
        <span class="condition-label-text">{{ condition.label }}</span>
        <Handle 
          :id="condition.id"
          type="source" 
          position="right" 
          class="node-handle output-handle condition-handle"
          :title="condition.label"
        />
      </div>
    </template>
    <!-- 普通节点单个输出端口 -->
    <Handle 
      v-else-if="data.nodeType !== 'output'"
      type="source" 
      position="right" 
      class="node-handle output-handle"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Handle } from '@vue-flow/core'
import { Button as AButton } from 'ant-design-vue'
import { 
  EditOutlined, 
  DeleteOutlined, 
  CopyOutlined,
  PlusOutlined 
} from '@ant-design/icons-vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  label: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['delete', 'edit', 'copy'])
</script>

<style scoped>
.custom-node {
  background: white;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  min-width: 160px;
  max-width: 220px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.custom-node:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.custom-node.status-running {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.custom-node.status-success {
  border-color: #52c41a;
  box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
}

.custom-node.status-error {
  border-color: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

.custom-node.status-warning {
  border-color: #faad14;
  box-shadow: 0 0 0 2px rgba(250, 173, 20, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: white;
  font-weight: 600;
  font-size: 12px;
  position: relative;
}

.node-icon {
  font-size: 16px;
  margin-right: 6px;
}

.node-title {
  flex: 1;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 600;
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
  color: white;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-actions .ant-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.node-content {
  padding: 8px 12px;
}

.node-description {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 12px;
  line-height: 1.4;
}

.condition-preview {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 8px;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.condition-label {
  font-weight: 500;
  color: #262626;
}

.condition-expr {
  color: #8c8c8c;
  font-family: monospace;
  font-size: 11px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.condition-more {
  font-size: 11px;
  color: #1890ff;
  text-align: center;
  margin-top: 4px;
}

.config-preview {
  font-size: 12px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.config-label {
  font-weight: 500;
  color: #595959;
}

.config-value {
  color: #262626;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.status-icon {
  font-size: 16px;
  display: inline-block;
}

.status-icon.running {
  animation: pulse 1.5s infinite;
}

/* 移除了添加按钮样式 */

.node-handle {
  width: 12px;
  height: 12px;
  border: 2px solid white;
  background: #1890ff;
  border-radius: 50%;
}

.input-handle {
  left: -6px;
}

.output-handle {
  right: -6px;
}

.condition-handle {
  background: #faad14;
  width: 10px;
  height: 10px;
  right: -5px;
}

.condition-port-wrapper {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.condition-label-text {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

/* 条件端口的连接线样式 */
:deep(.vue-flow__edge[data-source-handle]) {
  stroke-width: 2;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 选中状态 */
.custom-node.selected {
  border-color: #722ed1;
  box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .custom-node {
    min-width: 160px;
    max-width: 200px;
  }
  
  .node-header {
    padding: 10px 12px;
  }
  
  .node-content {
    padding: 12px;
  }
}
</style>
