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
              v-if="filteredGroups.session.length > 0"
              key="session"
              class="variable-group"
              header="会话变量"
            >
              <template #extra>
                <a-tag color="purple" size="small">{{ filteredGroups.session.length }}</a-tag>
              </template>
              <div class="variable-list">
                <div
                  v-for="variable in filteredGroups.session"
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
    Empty as AEmpty,
    Input as AInput,
    Tag as ATag,
  } from 'ant-design-vue'
  import { CloseOutlined, FunctionOutlined, SearchOutlined } from '@ant-design/icons-vue'

  // 临时类型定义
  const VariableType = {
    ENVIRONMENT: 'environment',
    SYSTEM: 'system',
    SESSION: 'session',
    USER_INPUT: 'userInput',
    NODE_OUTPUT: 'nodeOutput',
  }

  const VariableDataType = {
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    OBJECT: 'object',
    ARRAY: 'array',
    ANY: 'any',
  }

  const VariableAccess = {
    READONLY: 'readonly',
    READWRITE: 'readwrite',
  }

  // 模拟依赖分析器
  class NodeDependencyAnalyzer {
    constructor(nodes, edges) {
      this.nodes = nodes
      this.edges = edges
    }

    getAvailableVariables(nodeId) {
      // 获取系统变量
      const systemVariables = [
        {
          id: 'sys_user_id',
          name: 'userId',
          type: VariableType.SYSTEM,
          dataType: VariableDataType.STRING,
          access: VariableAccess.READONLY,
          description: '当前用户ID',
        },
        {
          id: 'sys_session_id',
          name: 'sessionId',
          type: VariableType.SYSTEM,
          dataType: VariableDataType.STRING,
          access: VariableAccess.READONLY,
          description: '当前会话ID',
        },
        {
          id: 'sys_timestamp',
          name: 'timestamp',
          type: VariableType.SYSTEM,
          dataType: VariableDataType.NUMBER,
          access: VariableAccess.READONLY,
          description: '当前时间戳',
        },
      ]

      // 获取用户输入变量（从开始节点配置中获取）
      const startNode = this.nodes.find((node) => node.data?.nodeType === 'start')
      const userInputVariables = []

      if (startNode && startNode.data.config?.userInputs) {
        userInputVariables.push(
          ...startNode.data.config.userInputs.map((input) => ({
            id: `user_input_${input.name}`,
            name: input.name,
            type: VariableType.USER_INPUT,
            dataType: input.dataType || VariableDataType.STRING,
            access: VariableAccess.READONLY,
            description: input.description || `用户输入: ${input.displayName || input.name}`,
            required: input.required || false,
          })),
        )
      }

      // 获取会话变量
      const sessionVariables = [
        {
          id: 'session_chat_history',
          name: 'chatHistory',
          type: VariableType.SESSION,
          dataType: VariableDataType.ARRAY,
          access: VariableAccess.READWRITE,
          description: '对话历史记录',
        },
      ]

      // 获取前驱节点的输出变量
      const nodeOutputVariables = []
      const predecessorNodeIds = this.getPredecessorNodes(nodeId)

      for (const predecessorId of predecessorNodeIds) {
        const predecessorNode = this.nodes.find((n) => n.id === predecessorId)
        if (predecessorNode) {
          const outputDefs = this.getNodeOutputDefinitions(predecessorNode.data.nodeType)
          nodeOutputVariables.push(
            ...outputDefs.map((outputDef) => ({
              id: `node_output_${predecessorId}_${outputDef.key}`,
              name: `${predecessorNode.label || predecessorNode.data.nodeType}.${outputDef.name}`,
              type: VariableType.NODE_OUTPUT,
              dataType: outputDef.dataType,
              access: VariableAccess.READONLY,
              description:
                outputDef.description ||
                `来自节点 ${predecessorNode.label || predecessorId} 的输出`,
              sourceNodeId: predecessorId,
              sourceOutputKey: outputDef.key,
            })),
          )
        }
      }

      return [
        ...systemVariables,
        ...userInputVariables,
        ...sessionVariables,
        ...nodeOutputVariables,
      ]
    }

    // 获取前驱节点
    getPredecessorNodes(nodeId) {
      const predecessors = new Set()
      const visited = new Set()

      const dfs = (currentNodeId) => {
        if (visited.has(currentNodeId)) return
        visited.add(currentNodeId)

        const incomingEdges = this.edges.filter((edge) => edge.target === currentNodeId)

        for (const edge of incomingEdges) {
          const sourceNodeId = edge.source
          predecessors.add(sourceNodeId)
          dfs(sourceNodeId)
        }
      }

      dfs(nodeId)
      return Array.from(predecessors)
    }

    // 获取节点输出定义
    getNodeOutputDefinitions(nodeType) {
      const outputDefs = {
        start: [
          {
            key: 'userId',
            name: '用户ID',
            dataType: VariableDataType.STRING,
            description: '当前用户ID',
          },
          {
            key: 'sessionId',
            name: '会话ID',
            dataType: VariableDataType.STRING,
            description: '当前会话ID',
          },
          {
            key: 'timestamp',
            name: '时间戳',
            dataType: VariableDataType.NUMBER,
            description: '流程开始时间',
          },
        ],
        llm: [
          {
            key: 'output',
            name: 'AI回复',
            dataType: VariableDataType.STRING,
            description: 'AI模型生成的回复内容',
          },
          {
            key: 'tokens',
            name: '消耗Token',
            dataType: VariableDataType.NUMBER,
            description: '本次请求消耗的Token数量',
          },
          {
            key: 'model',
            name: '使用模型',
            dataType: VariableDataType.STRING,
            description: '实际使用的AI模型',
          },
        ],
        http: [
          {
            key: 'response',
            name: '响应数据',
            dataType: VariableDataType.OBJECT,
            description: 'HTTP请求的响应数据',
          },
          {
            key: 'statusCode',
            name: '状态码',
            dataType: VariableDataType.NUMBER,
            description: 'HTTP响应状态码',
          },
          {
            key: 'headers',
            name: '响应头',
            dataType: VariableDataType.OBJECT,
            description: 'HTTP响应头信息',
          },
        ],
        condition: [
          {
            key: 'result',
            name: '条件结果',
            dataType: VariableDataType.STRING,
            description: '匹配的条件分支名称',
          },
          {
            key: 'matched',
            name: '是否匹配',
            dataType: VariableDataType.BOOLEAN,
            description: '是否有条件匹配成功',
          },
        ],
        code: [
          {
            key: 'output',
            name: '代码输出',
            dataType: VariableDataType.ANY,
            description: '代码执行的输出结果',
          },
          {
            key: 'logs',
            name: '执行日志',
            dataType: VariableDataType.STRING,
            description: '代码执行过程中的日志',
          },
          {
            key: 'error',
            name: '错误信息',
            dataType: VariableDataType.STRING,
            description: '代码执行错误信息（如果有）',
          },
        ],
        knowledge: [
          {
            key: 'documents',
            name: '检索文档',
            dataType: VariableDataType.ARRAY,
            description: '检索到的相关文档列表',
          },
          {
            key: 'scores',
            name: '相似度分数',
            dataType: VariableDataType.ARRAY,
            description: '文档相似度分数',
          },
          {
            key: 'query',
            name: '查询内容',
            dataType: VariableDataType.STRING,
            description: '实际执行的查询内容',
          },
        ],
        template: [
          {
            key: 'output',
            name: '模板输出',
            dataType: VariableDataType.STRING,
            description: '模板渲染后的结果',
          },
          {
            key: 'variables',
            name: '使用变量',
            dataType: VariableDataType.OBJECT,
            description: '模板中使用的变量值',
          },
        ],
        variable: [
          {
            key: 'variables',
            name: '设置变量',
            dataType: VariableDataType.OBJECT,
            description: '设置的变量键值对',
          },
        ],
      }

      return outputDefs[nodeType] || []
    }

    getVariableReference(variable) {
      switch (variable.type) {
        case VariableType.SYSTEM:
          return `{{system.${variable.name}}}`
        case VariableType.USER_INPUT:
          return `{{userInput.${variable.name}}}`
        case VariableType.NODE_OUTPUT:
          return `{{nodeOutput.${variable.sourceNodeId}.${variable.sourceOutputKey}}}`
        default:
          return `{{${variable.name}}}`
      }
    }
  }

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
  })

  const emit = defineEmits(['update:value', 'change'])

  // 引用
  const inputRef = ref()
  const panelRef = ref()

  // 状态
  const showPanel = ref(false)
  const searchKeyword = ref('')
  const activeGroups = ref(['system', 'environment', 'userInput', 'session', 'nodeOutput'])

  // 面板样式
  const panelStyle = ref({})

  // 计算可用变量
  const dependencyAnalyzer = computed(() => {
    return new NodeDependencyAnalyzer(props.nodes, props.edges)
  })

  const availableVariables = computed(() => {
    if (!props.nodeId) return []
    return dependencyAnalyzer.value.getAvailableVariables(props.nodeId)
  })

  // 按类型分组的变量
  const groupedVariables = computed(() => {
    const groups = {
      system: [],
      environment: [],
      userInput: [],
      session: [],
      nodeOutput: [],
    }

    availableVariables.value.forEach((variable) => {
      switch (variable.type) {
        case VariableType.SYSTEM:
          groups.system.push(variable)
          break
        case VariableType.ENVIRONMENT:
          groups.environment.push(variable)
          break
        case VariableType.USER_INPUT:
          groups.userInput.push(variable)
          break
        case VariableType.SESSION:
          groups.session.push(variable)
          break
        case VariableType.NODE_OUTPUT:
          groups.nodeOutput.push(variable)
          break
      }
    })

    return groups
  })

  // 过滤后的变量组
  const filteredGroups = computed(() => {
    if (!searchKeyword.value) return groupedVariables.value

    const keyword = searchKeyword.value.toLowerCase()
    const filtered = {}

    Object.keys(groupedVariables.value).forEach((key) => {
      filtered[key] = groupedVariables.value[key].filter(
        (variable) =>
          variable.name.toLowerCase().includes(keyword) ||
          variable.description?.toLowerCase().includes(keyword),
      )
    })

    return filtered
  })

  // 总变量数量
  const totalVariableCount = computed(() => {
    return Object.values(filteredGroups.value).reduce((sum, group) => sum + group.length, 0)
  })

  // 显示值（处理变量高亮）
  const displayValue = computed(() => {
    return props.value
  })

  // 是否包含变量
  const hasVariables = computed(() => {
    return /\{\{.*?\}\}/.test(props.value)
  })

  // 获取变量类型标签
  const getVariableTypeLabel = (type) => {
    const labels = {
      [VariableType.SYSTEM]: '系统',
      [VariableType.ENVIRONMENT]: '环境',
      [VariableType.USER_INPUT]: '输入',
      [VariableType.SESSION]: '会话',
      [VariableType.NODE_OUTPUT]: '输出',
    }
    return labels[type] || type
  }

  // 获取变量引用
  const getVariableReference = (variable) => {
    return dependencyAnalyzer.value.getVariableReference(variable)
  }

  // 处理输入焦点
  const handleFocus = () => {
    // 可以在这里处理焦点事件
  }

  const handleBlur = () => {
    // 延迟关闭面板，允许点击面板内容
    setTimeout(() => {
      if (!panelRef.value?.contains(document.activeElement)) {
        showPanel.value = false
      }
    }, 200)
  }

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

  // 选择变量
  const handleSelectVariable = (variable) => {
    const reference = getVariableReference(variable)

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
    } else {
      // 只支持单个变量，直接替换
      emit('update:value', reference)
      emit('change', reference)
      showPanel.value = false
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
