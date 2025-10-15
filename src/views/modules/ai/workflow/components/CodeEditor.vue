<template>
  <div class="code-editor-wrapper">
    <!-- 工具栏 -->
    <div class="code-editor-toolbar">
      <div class="toolbar-left">
        <span class="language-label">JavaScript</span>
      </div>

      <div class="toolbar-right">
        <!-- 变量选择按钮 -->
        <a-button
          :class="{ active: panelVisible }"
          size="small"
          title="插入变量 (⌘+Space)"
          type="text"
          @click="toggleVariablePanel"
        >
          <template #icon>
            <FunctionOutlined />
          </template>
          变量 ({{ availableVariables?.length || 0 }})
        </a-button>
      </div>
    </div>

    <!-- 代码编辑区域 -->
    <div class="code-editor-container">
      <a-textarea
        ref="textareaRef"
        v-model:value="editorValue"
        :class="{ 'has-variables': hasVariables }"
        :placeholder="getPlaceholder()"
        :rows="12"
        class="code-textarea"
        @blur="handleBlur"
        @focus="handleFocus"
        @input="handleInput"
        @keydown="handleKeyDown"
      />
    </div>

    <!-- 变量面板 -->
    <div v-if="panelVisible" ref="variablePanelRef" :style="panelStyle" class="variable-panel">
      <div class="panel-header">
        <span class="panel-title">选择变量</span>
        <a-button size="small" type="text" @click="closeVariablePanel">
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
          v-model:value="searchText"
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
                  @click="handleVariableClick(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div v-if="variable.description" class="variable-desc"
                    >{{ variable.description }}
                  </div>
                  <div class="variable-reference"
                    >点击插入: ${{ '{' + getNewVariableReference(variable) + '}' }}
                  </div>
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
                  @click="handleVariableClick(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div v-if="variable.description" class="variable-desc"
                    >{{ variable.description }}
                  </div>
                  <div class="variable-reference"
                    >点击插入: ${{ '{' + getNewVariableReference(variable) + '}' }}
                  </div>
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
                  @click="handleVariableClick(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div v-if="variable.description" class="variable-desc"
                    >{{ variable.description }}
                  </div>
                  <div class="variable-reference"
                    >点击插入: ${{ '{' + getNewVariableReference(variable) + '}' }}
                  </div>
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
                  @click="handleVariableClick(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div v-if="variable.description" class="variable-desc"
                    >{{ variable.description }}
                  </div>
                  <div class="variable-reference"
                    >点击插入: ${{ '{' + getNewVariableReference(variable) + '}' }}
                  </div>
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
                  @click="handleVariableClick(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-type">{{ getVariableTypeLabel(variable.type) }}</span>
                  </div>
                  <div v-if="variable.description" class="variable-desc"
                    >{{ variable.description }}
                  </div>
                  <div class="variable-reference"
                    >点击插入: ${{ '{' + getNewVariableReference(variable) + '}' }}
                  </div>
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

    <!-- 代码帮助提示 -->
    <div class="code-help">
      <div class="help-content">
        <div class="help-item">
          <strong>函数签名:</strong> function main(args) { return result; }
        </div>
        <div class="help-item"><strong>参数获取:</strong> const value = ${variable};</div>
        <div v-if="availableVariables?.length === 0" class="help-item help-tip">
          <strong>提示:</strong> 添加前置节点或在开始节点配置用户输入变量后，即可在此处使用变量
        </div>
      </div>
    </div>
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
  import { Textarea as ATextarea } from 'ant-design-vue/es/input'
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

  const emit = defineEmits(['update:value', 'update:referenceParameters', 'change'])

  // 使用共享的变量选择逻辑
  const {
    searchText,
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
  const variablePanelRef = ref()

  // 状态
  const editorValue = ref(props.value)
  const panelVisible = ref(false)
  const panelStyle = ref({})

  // 监听外部值变化
  watch(
    () => props.value,
    (newValue) => {
      editorValue.value = newValue
    },
  )

  // 过滤变量（保留原有逻辑用于显示总数）
  const filteredVariables = computed(() => {
    return Object.values(filteredGroups.value).flat()
  })

  // 检查是否包含变量引用
  const hasVariables = computed(() => {
    return /\$\{[^}]+\}/.test(editorValue.value)
  })

  // 获取占位符文本
  const getPlaceholder = () => {
    return `
      function add(a, b) { return a + b; } add('fxz', ' I love you.');
    `
  }

  // 处理输入
  const handleInput = (e) => {
    const value = e.target.value
    editorValue.value = value
    emit('update:value', value)
    emit('change', value)
  }

  // 处理焦点
  const handleFocus = () => {
    // 可以在这里添加焦点处理逻辑
  }

  const handleBlur = () => {
    // 可以在这里添加失焦处理逻辑
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {

    // Mac: Cmd+Space, Windows: Ctrl+Space 打开变量面板
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      toggleVariablePanel()
      return
    }

    // Tab 键缩进
    if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      insertTextAtCursor('  ') // 插入2个空格
    }
  }

  // 切换变量面板
  const toggleVariablePanel = () => {
    panelVisible.value = !panelVisible.value

    // 确保面板打开时重置搜索
    if (panelVisible.value) {
      searchText.value = ''
      nextTick(() => {
        updatePanelPosition()
      })
    }
  }

  // 更新面板位置
  const updatePanelPosition = () => {
    if (!textareaRef.value || !variablePanelRef.value) return

    const textareaElement =
      textareaRef.value.resizableTextArea?.textArea ||
      textareaRef.value.$el?.querySelector('textarea')
    if (!textareaElement) return

    const textareaRect = textareaElement.getBoundingClientRect()
    const panelHeight = variablePanelRef.value.offsetHeight
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
      zIndex: 9999,
    }
  }

  // 监听窗口大小变化
  const handleResize = () => {
    if (panelVisible.value) {
      updatePanelPosition()
    }
  }

  const closeVariablePanel = () => {
    panelVisible.value = false
  }

  // 处理变量点击 - 继承基础逻辑并添加文本插入
  const handleVariableClick = (variable) => {
    const { reference } = baseHandleSelectVariable(variable)
    insertTextAtCursor(reference)

    // 关闭面板
    closeVariablePanel()
  }

  // 在光标位置插入文本
  const insertTextAtCursor = (text) => {
    const textarea = textareaRef.value?.resizableTextArea?.textArea
    if (!textarea) {
      console.error('Textarea not found, trying alternative access method')

      // 尝试替代方法获取textarea
      const altTextarea = textareaRef.value?.$el?.querySelector('textarea')
      if (!altTextarea) {
        console.error('Could not find textarea element')
        // 直接更新值作为后备方案
        const currentValue = editorValue.value || ''
        const newValue = currentValue + text
        editorValue.value = newValue
        emit('update:value', newValue)
        emit('change', newValue)
        return
      }
    }

    const targetTextarea = textarea || textareaRef.value?.$el?.querySelector('textarea')

    const start = targetTextarea.selectionStart || 0
    const end = targetTextarea.selectionEnd || 0
    const currentValue = editorValue.value || ''

    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end)


    editorValue.value = newValue
    emit('update:value', newValue)
    emit('change', newValue)

    // 设置光标位置
    nextTick(() => {
      const newPosition = start + text.length
      targetTextarea.setSelectionRange(newPosition, newPosition)
      targetTextarea.focus()
    })
  }

  // 点击外部关闭面板
  const handleClickOutside = (event) => {
    if (!panelVisible.value) return

    const panel = variablePanelRef.value
    const target = event.target

    // 检查点击是否在面板内部
    if (panel && (panel.contains(target) || panel === target)) {
      return // 点击在面板内，不关闭
    }

    // 检查是否点击的是变量按钮
    const variableButton = event.target.closest('.ant-btn')
    if (variableButton && variableButton.title?.includes('插入变量')) {
      return // 点击的是变量按钮，由按钮处理
    }

    // 点击在外部，关闭面板
    closeVariablePanel()
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('resize', handleResize)
  })

  // 监听面板显示状态
  watch(panelVisible, (visible) => {
    if (visible) {
      nextTick(() => {
        updatePanelPosition()
      })
    }
  })
</script>

<style lang="less" scoped>
  .code-editor-wrapper {
    position: relative;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    overflow: visible;

    &:focus-within {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }
  }

  .code-editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #fafafa;
    border-bottom: 1px solid #f0f0f0;

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .language-label {
      font-size: 12px;
      font-weight: 500;
      color: #1890ff;
      background-color: #e6f7ff;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .ant-btn.active {
      color: #1890ff;
      background-color: #e6f7ff;
    }
  }

  .code-editor-container {
    position: relative;
  }

  .code-textarea {
    border: none !important;
    box-shadow: none !important;
    resize: vertical;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
    font-size: 13px;
    line-height: 1.5;

    &:focus {
      border: none !important;
      box-shadow: none !important;
    }

    &.has-variables {
      background: linear-gradient(90deg, #f6ffed 0%, #ffffff 100%);
    }
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
    z-index: 9999;
    top: 100%;
    left: 0;
    right: 0;

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

      .panel-title {
        font-size: 15px;
        font-weight: 600;
        color: #1f2937;
      }
    }

    .panel-content {
      max-height: 420px;
      overflow-y: auto;

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

        &:hover {
          background: #e0f2fe;
          border-color: #7dd3fc;
        }
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

        &:hover {
          opacity: 1;
          background: rgba(239, 68, 68, 0.1);
        }
      }

      .search-input {
        margin: 16px 20px;
        width: calc(100% - 40px);
      }

      .variable-groups {
        padding: 0 20px 20px;
      }

      .variable-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 0;

        .variable-item {
          padding: 12px;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #fafbfc;

          &:hover {
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
        }
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #9ca3af;
      }
    }
  }

  .variable-group :deep(.ant-collapse-header) {
    padding: 12px 0 !important;
    font-weight: 600;
    color: #374151;
  }

  .variable-group :deep(.ant-collapse-content) {
    border-top: 1px solid #f3f4f6;
  }

  .code-help {
    padding: 12px;
    background-color: #f9f9f9;
    border-top: 1px solid #f0f0f0;

    .help-item {
      font-size: 12px;
      color: #595959;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      strong {
        color: #262626;
      }

      &.help-tip {
        color: #1890ff;
        background-color: #e6f7ff;
        padding: 8px;
        border-radius: 4px;
        border-left: 3px solid #1890ff;
      }
    }
  }
</style>
