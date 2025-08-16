<template>
  <div class="variable-selector">
    <!-- 变量输入框 -->
    <a-input
      ref="inputRef"
      :class="{ 'has-variables': hasVariables }"
      :placeholder="placeholder"
      :value="displayValue"
      class="variable-input"
      @blur="handleBlur"
      @focus="handleFocus"
      @input="handleInput"
      @keydown="handleKeyDown"
    >
      <template #suffix>
        <a-button
          :class="{ active: showPanel }"
          size="small"
          title="选择变量"
          type="text"
          @click="handleTogglePanel"
        >
          <template #icon>
            <FunctionOutlined />
          </template>
        </a-button>
      </template>
    </a-input>

    <!-- 变量面板 -->
    <div v-if="showPanel" ref="panelRef" :style="panelStyle" class="variable-panel">
      <div class="panel-header">
        <span class="panel-title">选择变量</span>
        <a-button size="small" type="text" @click="handleClosePanel">
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
    <div v-if="showPanel" class="variable-panel-mask" @click="handleClosePanel"></div>
  </div>
</template>

<script setup>
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import {
    Button as AButton,
    Collapse as ACollapse,
    CollapsePanel as ACollapsePanel,
    Divider as ADivider,
    Empty as AEmpty,
    Input as AInput,
    Tag as ATag,
  } from 'ant-design-vue'
  import {
    CloseOutlined,
    DeleteOutlined,
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
      default: '请输入或选择变量...',
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
    // 是否支持多个变量（默认支持）
    multiple: {
      type: Boolean,
      default: true,
    },
    // 变量引用参数列表（用于维护变量引用信息）
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
  const inputRef = ref()
  const panelRef = ref()

  // 状态
  const showPanel = ref(false)

  // 面板样式
  const panelStyle = ref({})

  // 显示值（处理变量高亮）
  const displayValue = computed(() => {
    return props.value
  })

  // 是否包含变量
  const hasVariables = computed(() => {
    return /\{\{.*?\}\}/.test(props.value)
  })

  // 获取变量引用
  const getVariableReference = (variable) => {
    return `\${${getNewVariableReference(variable)}}`
  }

  // 处理输入焦点
  const handleFocus = () => {
    // 可以在这里处理焦点事件
  }

  const handleBlur = () => {}

  // 处理输入
  const handleInput = (e) => {
    const value = e.target.value
    emit('update:value', value)
    emit('change', value)
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      showPanel.value = false
      inputRef.value?.blur()
    }
  }

  // 切换面板显示
  const handleTogglePanel = () => {
    showPanel.value = !showPanel.value
    if (showPanel.value) {
      nextTick(() => {
        updatePanelPosition()
      })
    }
  }

  // 关闭面板
  const handleClosePanel = () => {
    showPanel.value = false
  }

  // 选择变量 - 继承基础逻辑并添加输入框更新
  const handleSelectVariable = (variable) => {
    const { reference } = baseHandleSelectVariable(variable)

    if (props.multiple) {
      // 支持多个变量，在光标位置插入
      const input = inputRef.value?.input
      if (input) {
        const start = input.selectionStart
        const end = input.selectionEnd
        const currentValue = props.value || ''
        const newValue = currentValue.slice(0, start) + reference + currentValue.slice(end)

        emit('update:value', newValue)
        emit('change', newValue)

        // 设置光标位置
        nextTick(() => {
          const newPosition = start + reference.length
          input.setSelectionRange(newPosition, newPosition)
          input.focus()
        })
      }
      // 选择变量后关闭面板
    } else {
      // 只支持单个变量，直接替换
      emit('update:value', reference)
      emit('change', reference)
    }
  }

  // 更新面板位置
  const updatePanelPosition = () => {
    if (!inputRef.value || !panelRef.value) return

    const inputRect = inputRef.value.$el.getBoundingClientRect()
    const panelHeight = panelRef.value.offsetHeight
    const viewportHeight = window.innerHeight

    let top = inputRect.bottom + 8
    let left = inputRect.left

    // 检查是否超出视口底部
    if (top + panelHeight > viewportHeight) {
      top = inputRect.top - panelHeight - 8
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
    if (showPanel.value) {
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
  watch(showPanel, (visible) => {
    if (visible) {
      nextTick(() => {
        updatePanelPosition()
      })
    }
  })
</script>

<style scoped>
  .variable-selector {
    position: relative;
  }

  .variable-input {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .variable-input.has-variables {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-color: #0ea5e9;
  }

  .variable-input :deep(.ant-input-suffix .ant-btn) {
    color: #64748b;
    transition: all 0.2s ease;
  }

  .variable-input :deep(.ant-input-suffix .ant-btn:hover),
  .variable-input :deep(.ant-input-suffix .ant-btn.active) {
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }

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
</style>
