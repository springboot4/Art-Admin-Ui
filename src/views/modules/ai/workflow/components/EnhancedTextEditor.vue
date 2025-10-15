<template>
  <div class="enhanced-text-editor">
    <div class="editor-container" :class="{ 'editor-focused': isFocused }">
      <a-textarea
        ref="textareaRef"
        v-model:value="currentValue"
        :auto-size="autoSizeConfig"
        :placeholder="placeholder"
        :rows="defaultRows"
        class="enhanced-textarea"
        @blur="handleBlur"
        @focus="handleFocus"
        @input="handleInput"
        @keydown="handleKeyDown"
      />

      <!-- 变量选择按钮 -->
      <div class="editor-actions">
        <a-button
          :class="{ active: showVariablePanel }"
          size="small"
          title="插入变量"
          type="text"
          @click="handleToggleVariablePanel"
        >
          <template #icon>
            <FunctionOutlined />
          </template>
        </a-button>

        <!-- 格式化按钮 -->
        <a-button
          v-if="showFormatButton"
          size="small"
          title="格式化文本"
          type="text"
          @click="handleFormat"
        >
          <template #icon>
            <FormatPainterOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <!-- 变量面板 -->
    <div v-if="showVariablePanel" ref="panelRef" :style="panelStyle" class="variable-panel">
      <div class="panel-header">
        <span class="panel-title">选择变量</span>
        <a-button size="small" type="text" @click="handleCloseVariablePanel">
          <template #icon>
            <CloseOutlined />
          </template>
        </a-button>
      </div>

      <div class="panel-content">
        <!-- 已选择的变量区域 -->
        <div v-if="selectedVariableCount > 0" class="selected-variables-section">
          <div class="section-header">
            <span class="section-title">已选择变量</span>
            <a-tag color="green" size="small">{{ selectedVariableCount }}</a-tag>
          </div>
          <div class="selected-variables-list">
            <div
              v-for="selectedVar in selectedVariables"
              :key="selectedVar.uniqueKey"
              class="selected-variable-item"
            >
              <div class="selected-variable-info">
                <div class="selected-variable-main">
                  <span class="selected-variable-name">{{ selectedVar.displayName }}</span>
                  <span class="selected-variable-type">{{ selectedVar.typeLabel }}</span>
                </div>
                <div v-if="selectedVar.description" class="selected-variable-desc">
                  {{ selectedVar.description }}
                </div>
                <div class="selected-variable-reference">
                  ${{ '{' + selectedVar.referenceFormat + '}' }}
                </div>
              </div>
              <a-button
                class="remove-variable-btn"
                danger
                size="small"
                title="移除变量"
                type="text"
                @click="
                  handleRemoveVariable(
                    selectedVar.nodeId,
                    selectedVar.parameterName,
                    selectedVar.variableType,
                  )
                "
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </div>
          </div>
          <a-divider style="margin: 16px 0" />
        </div>

        <!-- 搜索框 -->
        <a-input
          v-model:value="searchKeyword"
          class="search-input"
          placeholder="搜索变量..."
          size="small"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>

        <!-- 变量分组列表 -->
        <div class="variable-groups">
          <a-collapse v-model:activeKey="activeGroups" ghost>
            <!-- 系统变量 -->
            <a-collapse-panel
              v-if="filteredGroups.system.length > 0"
              key="system"
              class="variable-group"
              header="系统变量"
            >
              <template #extra>
                <a-tag color="blue" size="small">{{ filteredGroups.system.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.system"
                  :key="variable.id"
                  class="variable-item"
                  @click="handleSelectVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div class="variable-desc">{{ variable.description }}</div>
                  <div class="variable-reference">{{ getVariableReference(variable) }}</div>
                </div>
              </div>
            </a-collapse-panel>

            <!-- 环境变量 -->
            <a-collapse-panel
              v-if="filteredGroups.environment.length > 0"
              key="environment"
              class="variable-group"
              header="环境变量"
            >
              <template #extra>
                <a-tag color="green" size="small">{{ filteredGroups.environment.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.environment"
                  :key="variable.id"
                  class="variable-item"
                  @click="handleSelectVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div class="variable-desc">{{ variable.description }}</div>
                  <div class="variable-reference">{{ getVariableReference(variable) }}</div>
                </div>
              </div>
            </a-collapse-panel>

            <!-- 用户输入 -->
            <a-collapse-panel
              v-if="filteredGroups.userInput.length > 0"
              key="userInput"
              class="variable-group"
              header="用户输入"
            >
              <template #extra>
                <a-tag color="orange" size="small">{{ filteredGroups.userInput.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.userInput"
                  :key="variable.id"
                  class="variable-item"
                  @click="handleSelectVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div class="variable-desc">{{ variable.description }}</div>
                  <div class="variable-reference">{{ getVariableReference(variable) }}</div>
                </div>
              </div>
            </a-collapse-panel>

            <!-- 会话变量 -->
            <a-collapse-panel
              v-if="filteredGroups.conversation.length > 0"
              key="conversation"
              class="variable-group"
              header="会话变量"
            >
              <template #extra>
                <a-tag color="purple" size="small">{{ filteredGroups.conversation.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.conversation"
                  :key="variable.id"
                  class="variable-item"
                  @click="handleSelectVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div class="variable-desc">{{ variable.description }}</div>
                  <div class="variable-reference">{{ getVariableReference(variable) }}</div>
                </div>
              </div>
            </a-collapse-panel>

            <!-- 节点输出 -->
            <a-collapse-panel
              v-if="filteredGroups.nodeOutput.length > 0"
              key="nodeOutput"
              class="variable-group"
              header="节点输出"
            >
              <template #extra>
                <a-tag color="cyan" size="small">{{ filteredGroups.nodeOutput.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.nodeOutput"
                  :key="variable.id"
                  class="variable-item"
                  @click="handleSelectVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div class="variable-desc">{{ variable.description }}</div>
                  <div class="variable-reference">{{ getVariableReference(variable) }}</div>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <!-- 空状态 -->
        <div v-if="totalVariableCount === 0" class="empty-state">
          <a-empty :image="false" description="当前节点没有可用变量" />
        </div>
      </div>
    </div>

    <!-- 遮罩层 -->
    <div
      v-if="showVariablePanel"
      class="variable-panel-mask"
      @click="handleCloseVariablePanel"
    ></div>
  </div>
</template>

<script setup>
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import {
    Button as AButton,
    Collapse as ACollapse,
    CollapsePanel as ACollapsePanel,
    Empty as AEmpty,
    Input as AInput,
    Tag as ATag,
  } from 'ant-design-vue'
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
  import {
    CloseOutlined,
    DeleteOutlined,
    FormatPainterOutlined,
    FunctionOutlined,
    SearchOutlined,
  } from '@ant-design/icons-vue'
  import { useVariableSelector } from '../composables/useVariableSelector'

  const props = defineProps({
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '请输入内容...',
    },
    // 默认行数
    defaultRows: {
      type: Number,
      default: 5,
    },
    // 最小行数
    minRows: {
      type: Number,
      default: 3,
    },
    // 最大行数
    maxRows: {
      type: Number,
      default: 20,
    },
    // 是否显示格式化按钮
    showFormatButton: {
      type: Boolean,
      default: false,
    },
    // 当前节点ID，用于计算可用变量
    nodeId: {
      type: String,
      required: true,
    },
    // 工作流节点
    nodes: {
      type: Array,
      required: true,
    },
    // 工作流边
    edges: {
      type: Array,
      required: true,
    },
    // 变量引用参数列表
    referenceParameters: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['update:value', 'change', 'update:referenceParameters'])

  // 使用共享的变量选择逻辑
  const {
    searchText: searchKeyword,
    activeGroups,
    availableVariables,
    groupedVariables,
    filteredGroups,
    totalVariableCount,
    selectedVariables,
    selectedVariableCount,
    getNewVariableReference,
    getVariableTypeLabel,
    handleSelectVariable: baseHandleSelectVariable,
    handleRemoveVariable,
  } = useVariableSelector(props, emit)

  // 引用
  const textareaRef = ref()
  const panelRef = ref()

  // 状态
  const currentValue = ref(props.value)
  const isFocused = ref(false)
  const showVariablePanel = ref(false)

  // 面板样式
  const panelStyle = ref({})

  // 自动调整大小配置
  const autoSizeConfig = computed(() => ({
    minRows: props.minRows,
    maxRows: props.maxRows,
  }))

  // 监听value变化
  watch(
    () => props.value,
    (newValue) => {
      currentValue.value = newValue
    },
  )

  // 获取变量引用
  const getVariableReference = (variable) => {
    return `\${${getNewVariableReference(variable)}}`
  }

  // 处理焦点事件
  const handleFocus = () => {
    isFocused.value = true
  }

  const handleBlur = () => {
    isFocused.value = false
  }

  // 处理输入
  const handleInput = (e) => {
    const value = e.target.value
    currentValue.value = value
    emit('update:value', value)
    emit('change', value)
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showVariablePanel.value) {
      showVariablePanel.value = false
      e.preventDefault()
    }

    // Ctrl/Cmd + Enter 快速插入变量
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleToggleVariablePanel()
      e.preventDefault()
    }
  }

  // 切换变量面板显示
  const handleToggleVariablePanel = () => {
    showVariablePanel.value = !showVariablePanel.value
    if (showVariablePanel.value) {
      nextTick(() => {
        updatePanelPosition()
      })
    }
  }

  // 关闭变量面板
  const handleCloseVariablePanel = () => {
    showVariablePanel.value = false
  }

  // 选择变量
  const handleSelectVariable = (variable) => {
    const { reference } = baseHandleSelectVariable(variable)

    const textarea = textareaRef.value?.resizableTextArea?.textArea
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentVal = currentValue.value || ''
      const newValue = currentVal.slice(0, start) + reference + currentVal.slice(end)

      currentValue.value = newValue
      emit('update:value', newValue)
      emit('change', newValue)

      // 设置光标位置
      nextTick(() => {
        const newPosition = start + reference.length
        textarea.setSelectionRange(newPosition, newPosition)
        textarea.focus()
      })
    }

    // 选择变量后关闭面板
    showVariablePanel.value = false
  }

  // 格式化文本
  const handleFormat = () => {
    // 简单的格式化逻辑：规范化换行和空格
    const formatted = currentValue.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n')

    currentValue.value = formatted
    emit('update:value', formatted)
    emit('change', formatted)
  }

  // 更新面板位置
  const updatePanelPosition = () => {
    if (!textareaRef.value || !panelRef.value) return

    const textareaEl = textareaRef.value.$el || textareaRef.value.resizableTextArea?.$el
    if (!textareaEl) return

    const textareaRect = textareaEl.getBoundingClientRect()
    const panelHeight = panelRef.value.offsetHeight
    const viewportHeight = window.innerHeight

    let top = textareaRect.bottom + 8
    let left = textareaRect.left

    // 检查是否超出视口底部
    if (top + panelHeight > viewportHeight) {
      top = textareaRect.top - panelHeight - 8
    }

    // 检查是否超出视口右侧
    const panelWidth = 400
    if (left + panelWidth > window.innerWidth) {
      left = window.innerWidth - panelWidth - 20
    }

    panelStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 1050,
    }
  }

  // 监听窗口大小变化
  const handleResize = () => {
    if (showVariablePanel.value) {
      updatePanelPosition()
    }
  }

  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  // 监听面板显示状态
  watch(showVariablePanel, (visible) => {
    if (visible) {
      nextTick(() => {
        updatePanelPosition()
      })
    }
  })
</script>

<style scoped>
  .enhanced-text-editor {
    position: relative;
  }

  .editor-container {
    position: relative;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: #fff;
    transition: all 0.3s ease;
  }

  .editor-container.editor-focused {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  .enhanced-textarea {
    border: none !important;
    box-shadow: none !important;
    resize: none;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', -apple-system, BlinkMacSystemFont, 'Segoe UI',
      monospace;
    font-size: 14px;
    line-height: 1.6;
    padding: 12px 50px 12px 12px;
  }

  .enhanced-textarea:focus {
    border: none !important;
    box-shadow: none !important;
  }

  .editor-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: 10;
  }

  .editor-actions .ant-btn {
    color: #64748b;
    border: none;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .editor-actions .ant-btn:hover,
  .editor-actions .ant-btn.active {
    color: #1890ff;
    background: rgba(24, 144, 255, 0.1);
    backdrop-filter: blur(4px);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  /* 变量面板样式 */
  .variable-panel {
    position: fixed;
    width: 400px;
    max-height: 500px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    z-index: 1050;
  }

  .variable-panel-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    z-index: 1040;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .panel-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .panel-content {
    max-height: 420px;
    overflow-y: auto;
  }

  .selected-variables-section {
    padding: 16px 20px 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  .selected-variables-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .selected-variable-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .selected-variable-item:hover {
    background: #e0f2fe;
    border-color: #7dd3fc;
  }

  .selected-variable-info {
    flex: 1;
    min-width: 0;
  }

  .selected-variable-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .selected-variable-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 13px;
  }

  .selected-variable-type {
    font-size: 11px;
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .selected-variable-desc {
    font-size: 12px;
    color: #475569;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .selected-variable-reference {
    font-size: 11px;
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.15);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 500;
    display: inline-block;
  }

  .remove-variable-btn {
    margin-left: 8px;
    color: #ef4444;
    opacity: 0.7;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .remove-variable-btn:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.1);
  }

  .search-input {
    margin: 16px 20px;
    width: calc(100% - 40px);
  }

  .variable-groups {
    padding: 0 20px 20px;
  }

  .variable-group :deep(.ant-collapse-header) {
    padding: 12px 0 !important;
    font-weight: 600;
    color: #374151;
  }

  .variable-group :deep(.ant-collapse-content) {
    border-top: 1px solid #f3f4f6;
  }

  .variable-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
  }

  .variable-item {
    padding: 12px;
    border: 1px solid #f1f5f9;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    background: #fafbfc;
  }

  .variable-item:hover {
    border-color: #e2e8f0;
    background: #f8fafc;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .variable-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .variable-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
  }

  .variable-type {
    font-size: 11px;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .variable-desc {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .variable-reference {
    font-size: 11px;
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    word-break: break-all;
  }

  .empty-state {
    padding: 40px 20px;
    text-align: center;
    color: #9ca3af;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .variable-panel {
      width: calc(100vw - 40px);
      left: 20px !important;
      right: 20px !important;
    }
  }
</style>
