<template>
  <div class="workflow-editor-container">
    <!-- 工具栏 -->
    <div class="workflow-toolbar">
      <div class="toolbar-left">
        <a-input
          v-model:value="workflowName"
          class="workflow-name-input"
          placeholder="输入工作流名称..."
        />
        <div class="workflow-status">
          <a-tag :color="getStatusColor(workflowStatus)">
            {{ getStatusText(workflowStatus) }}
          </a-tag>
        </div>
      </div>

      <div class="toolbar-right">
        <a-space :size="12">
          <a-button @click="addNode">
            <template #icon>
              <PlusOutlined />
            </template>
            添加节点
          </a-button>
          <a-button @click="clearWorkflow">
            <template #icon>
              <ClearOutlined />
            </template>
            清空
          </a-button>

          <a-divider type="vertical" />

          <a-button @click="importWorkflow">
            <template #icon>
              <ImportOutlined />
            </template>
            导入
          </a-button>
          <a-button @click="exportWorkflow">
            <template #icon>
              <ExportOutlined />
            </template>
            导出
          </a-button>

          <a-divider type="vertical" />

          <a-button :loading="validating" @click="validateWorkflow">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            验证
          </a-button>
          <a-button :loading="saving" type="primary" @click="saveWorkflow">
            <template #icon>
              <SaveOutlined />
            </template>
            保存
          </a-button>
          <a-button :loading="executing" class="btn-run" type="primary" @click="executeWorkflow">
            <template #icon>
              <PlayCircleOutlined />
            </template>
            运行
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="workflow-content">
      <!-- VueFlow 画布 - 全屏显示 -->
      <div class="workflow-canvas" @click="handleCanvasClick">
        <VueFlow
          v-model:edges="edges"
          v-model:nodes="nodes"
          :default-zoom="0.5"
          :max-zoom="0.8"
          :min-zoom="0.1"
          :node-types="nodeTypes"
          class="vue-flow-container"
          fit-view-on-init
          @connect="onConnect"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @node-click="onNodeClick"
          @node-double-click="onNodeDoubleClick"
          @edge-click="onEdgeClick"
        >
          <!-- 添加背景 -->
          <Background :gap="16" :size="1" color="#bbb" pattern="dots" />

          <template #node-customNode="props">
            <CustomNode
              v-bind="props"
              @copy="handleCopyNode"
              @dblclick="() => onNodeDoubleClick(null, props)"
              @delete="handleDeleteNode"
              @edit="handleEditNode"
            />
          </template>

          <Controls />
        </VueFlow>

        <!-- 添加节点悬浮菜单 -->
        <div
          v-if="showAddNodeMenu"
          :style="{ left: addNodeMenuPosition.x + 'px', top: addNodeMenuPosition.y + 'px' }"
          class="add-node-menu"
          @click.stop
        >
          <div class="add-node-menu-content">
            <div class="add-node-title">选择节点类型</div>
            <div class="add-node-list">
              <div
                v-for="nodeType in availableNodeTypes"
                :key="nodeType.type"
                class="add-node-item"
                @click="addNodeFromMenu(nodeType)"
              >
                <span class="node-icon">{{ nodeType.icon }}</span>
                <span class="node-label">{{ nodeType.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 节点配置面板 -->
    <NodeConfigPanel
      :node="selectedNode"
      :visible="configPanelVisible"
      @close="handleConfigPanelClose"
      @save="handleConfigSave"
    />

    <!-- 导入文件输入 -->
    <input
      ref="fileInput"
      accept=".json"
      style="display: none"
      type="file"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { VueFlow } from '@vue-flow/core'
  import { Controls } from '@vue-flow/controls'
  import { Background } from '@vue-flow/background'
  import {
    Button as AButton,
    Input as AInput,
    message,
    Space as ASpace,
    Tag as ATag,
  } from 'ant-design-vue'
  import {
    CheckCircleOutlined,
    ClearOutlined,
    ExportOutlined,
    ImportOutlined,
    PlayCircleOutlined,
    SaveOutlined,
  } from '@ant-design/icons-vue'
  import CustomNode from './components/CustomNode.vue'
  import NodeConfigPanel from './components/NodeConfigPanel.vue'

  // 导入 VueFlow 样式
  import '@vue-flow/core/dist/style.css'
  import '@vue-flow/core/dist/theme-default.css'
  import '@vue-flow/controls/dist/style.css'

  // 可用的节点类型
  const availableNodeTypes = ref([
    {
      type: 'start',
      label: '开始节点',
      icon: '🚀',
      color: '#52c41a',
      description: '工作流的起始点',
      category: 'trigger',
    },
    {
      type: 'llm',
      label: '大语言模型',
      icon: '🤖',
      color: '#1890ff',
      description: 'GPT/Claude/ChatGLM等AI模型',
      category: 'llm',
    },
    {
      type: 'knowledge',
      label: '知识检索',
      icon: '📚',
      color: '#722ed1',
      description: '从向量数据库检索相关知识',
      category: 'knowledge',
    },
    {
      type: 'condition',
      label: '条件判断',
      icon: '🔀',
      color: '#faad14',
      description: '根据条件分支执行不同逻辑',
      category: 'logic',
      multiOutput: true, // 支持多个输出端口
    },
    {
      type: 'code',
      label: '代码执行',
      icon: '💻',
      color: '#13c2c2',
      description: '执行Python/JavaScript代码',
      category: 'logic',
    },
    {
      type: 'http',
      label: 'HTTP请求',
      icon: '🌐',
      color: '#fa8c16',
      description: '调用外部API接口',
      category: 'integration',
    },
    {
      type: 'template',
      label: '模板转换',
      icon: '📝',
      color: '#eb2f96',
      description: 'Jinja2模板渲染文本',
      category: 'transform',
    },
    {
      type: 'variable',
      label: '变量赋值',
      icon: '🔗',
      color: '#722ed1',
      description: '设置和管理变量',
      category: 'logic',
    },
    {
      type: 'output',
      label: '输出节点',
      icon: '📤',
      color: '#f5222d',
      description: '工作流的最终输出',
      category: 'output',
    },
  ])

  // 节点类型映射
  const nodeTypes = {
    customNode: CustomNode,
  }

  // 初始化一个开始节点
  const nodes = ref([
    {
      id: 'start-node',
      type: 'customNode',
      position: { x: 400, y: 200 },
      label: '开始节点',
      data: {
        nodeType: 'start',
        icon: '🚀',
        color: '#52c41a',
        description: '工作流的起始点',
        config: {},
        status: 'idle',
      },
    },
  ])

  const edges = ref([])
  const workflowName = ref('新建AI工作流')
  const saving = ref(false)
  const executing = ref(false)
  const validating = ref(false)
  const workflowStatus = ref('draft')
  const fileInput = ref()

  // 配置面板相关
  const configPanelVisible = ref(false)
  const selectedNode = ref(null)

  // 添加节点菜单相关
  const showAddNodeMenu = ref(false)
  const addNodeMenuPosition = ref({ x: 0, y: 0 })
  const addNodeFromNodeId = ref(null)

  // 执行状态相关
  const executingEdges = ref(new Set()) // 记录正在执行的边

  // 节点 ID 生成器
  let nodeId = 1
  const generateNodeId = () => `node_${nodeId++}`

  // 注: 移除了拖拽功能，现在通过悬浮菜单添加节点

  // 创建节点的统一方法
  const createNode = (nodeType, position) => {
    return {
      id: generateNodeId(),
      type: 'customNode',
      position,
      label: nodeType.label,
      data: {
        nodeType: nodeType.type,
        icon: nodeType.icon,
        color: nodeType.color,
        description: nodeType.description,
        config: getDefaultConfig(nodeType.type),
        status: 'idle',
        multiOutput: nodeType.multiOutput || false,
      },
    }
  }

  // 获取默认配置
  const getDefaultConfig = (nodeType) => {
    const defaultConfigs = {
      start: {},
      llm: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: '你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。',
      },
      http: {
        method: 'GET',
        url: '',
        headers: '{}',
      },
      condition: {
        conditions: [
          { id: 'condition1', expression: '', label: '条件1', description: '' },
          { id: 'else', expression: 'else', label: '其他', description: '默认分支' },
        ],
      },
      code: {
        language: 'python',
        code: '# 在这里编写你的代码\nresult = "Hello World"\nprint(result)',
      },
      knowledge: {
        topK: 5,
        threshold: 0.7,
      },
      template: {
        template: '这是一个模板: {{ variable }}',
      },
      variable: {
        name: 'my_variable',
        value: '',
      },
      output: {},
    }
    return defaultConfigs[nodeType] || {}
  }

  // VueFlow 事件处理
  const onNodesChange = (changes) => {
    // 可以在这里处理节点变化
    console.log('Nodes changed:', changes)
  }

  const onEdgesChange = (changes) => {
    // 可以在这里处理连线变化
    console.log('Edges changed:', changes)
  }

  const onConnect = (params) => {
    const newEdge = {
      id: `edge_${Date.now()}`,
      ...params,
      type: 'default',
      animated: false, // 默认不动画
      style: { stroke: '#666', strokeWidth: 2 },
    }

    edges.value.push(newEdge)
    message.success('节点连接成功')
  }

  const onNodeClick = (event, node) => {
    console.log('Node clicked:', node)
  }

  const onNodeDoubleClick = (event, node) => {
    console.log('Double click event:', event, 'Node:', node)
    // VueFlow可能传递的参数格式不同，尝试从event中获取node
    const targetNode = node || (event && event.node) || event
    console.log('Target node:', targetNode)

    if (targetNode) {
      selectedNode.value = targetNode
      configPanelVisible.value = true
      console.log(
        'Config panel should open:',
        configPanelVisible.value,
        'Selected node:',
        selectedNode.value,
      )
    }
  }

  const onEdgeClick = (event, edge) => {
    console.log('Edge clicked:', edge)
  }

  // 从菜单添加节点 - 添加到画布中央，不自动连接
  const addNodeFromMenu = (nodeType) => {
    // 计算画布中央位置
    const canvas = document.querySelector('.vue-flow-container')
    const canvasRect = canvas?.getBoundingClientRect()

    const centerPosition = {
      x: canvasRect ? canvasRect.width / 2 - 100 : 400,
      y: canvasRect ? canvasRect.height / 2 - 60 : 300,
    }

    const newNode = createNode(nodeType, centerPosition)
    nodes.value.push(newNode)

    // 关闭菜单
    showAddNodeMenu.value = false
    message.success(`${nodeType.label} 已添加到画布`)
  }

  // 节点操作处理
  const handleDeleteNode = (nodeId) => {
    nodes.value = nodes.value.filter((node) => node.id !== nodeId)
    edges.value = edges.value.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    message.success('节点已删除')
  }

  const handleEditNode = (nodeId) => {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (node) {
      selectedNode.value = node
      configPanelVisible.value = true
    }
  }

  const handleCopyNode = (nodeId) => {
    const originalNode = nodes.value.find((n) => n.id === nodeId)
    if (!originalNode) return

    const newNode = {
      ...originalNode,
      id: generateNodeId(),
      position: {
        x: originalNode.position.x + 50,
        y: originalNode.position.y + 50,
      },
      label: `${originalNode.label} 副本`,
    }

    nodes.value.push(newNode)
    message.success('节点已复制')
  }

  // 配置面板相关
  const handleConfigPanelClose = () => {
    configPanelVisible.value = false
    selectedNode.value = null
  }

  const handleConfigSave = (updatedNode) => {
    console.log('Saving node config:', updatedNode)
    const index = nodes.value.findIndex((n) => n.id === updatedNode.id)
    if (index !== -1) {
      nodes.value[index] = updatedNode
      message.success('节点配置已保存')
    }
    configPanelVisible.value = false
    selectedNode.value = null
  }

  // 工作流操作
  const saveWorkflow = async () => {
    saving.value = true
    try {
      // 模拟保存
      await new Promise((resolve) => setTimeout(resolve, 1000))
      workflowStatus.value = 'saved'
      message.success('工作流已保存')
    } catch (error) {
      message.error('保存失败')
    } finally {
      saving.value = false
    }
  }

  const validateWorkflow = async () => {
    validating.value = true
    try {
      // 模拟验证
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 简单验证逻辑
      if (nodes.value.length === 0) {
        throw new Error('工作流不能为空')
      }

      const hasStart = nodes.value.some((node) => node.data.nodeType === 'start')
      if (!hasStart) {
        throw new Error('工作流必须有一个开始节点')
      }

      message.success('工作流验证通过')
    } catch (error) {
      message.error(`验证失败: ${error.message}`)
    } finally {
      validating.value = false
    }
  }

  const clearWorkflow = () => {
    nodes.value = [
      {
        id: 'start-node',
        type: 'customNode',
        position: { x: 400, y: 200 },
        label: '开始节点',
        data: {
          nodeType: 'start',
          icon: '🚀',
          color: '#52c41a',
          description: '工作流的起始点',
          config: {},
          status: 'idle',
        },
      },
    ]
    edges.value = []
    workflowStatus.value = 'draft'
    message.success('画布已清空')
  }

  const exportWorkflow = () => {
    const workflowData = {
      name: workflowName.value,
      nodes: nodes.value,
      edges: edges.value,
      status: workflowStatus.value,
      exportTime: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.value || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('工作流已导出')
  }

  const importWorkflow = () => {
    fileInput.value?.click()
  }

  const handleFileImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workflowData = JSON.parse(e.target.result)
        workflowName.value = workflowData.name || '导入的工作流'
        nodes.value = workflowData.nodes || []
        edges.value = workflowData.edges || []
        workflowStatus.value = 'draft'
        message.success('工作流已导入')
      } catch (error) {
        message.error('导入失败，文件格式不正确')
      }
    }
    reader.readAsText(file)
  }

  const executeWorkflow = async () => {
    executing.value = true
    workflowStatus.value = 'executing'

    try {
      // 重置所有节点状态
      nodes.value.forEach((node) => {
        node.data.status = 'idle'
      })

      // 模拟执行过程
      for (let i = 0; i < nodes.value.length; i++) {
        const node = nodes.value[i]

        // 设置当前节点为运行状态
        node.data.status = 'running'

        // 找到相关的边并设置动画
        const relatedEdges = edges.value.filter(
          (edge) => edge.source === node.id || edge.target === node.id,
        )

        relatedEdges.forEach((edge) => {
          edge.animated = true
          edge.style = { stroke: '#1890ff', strokeWidth: 3 }
        })

        // 模拟节点执行时间
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // 设置节点为成功状态
        node.data.status = 'success'

        // 移除边的动画
        relatedEdges.forEach((edge) => {
          edge.animated = false
          edge.style = { stroke: '#52c41a', strokeWidth: 2 }
        })
      }

      workflowStatus.value = 'saved'
      message.success('工作流执行完成')
    } catch (error) {
      workflowStatus.value = 'error'
      message.error('工作流执行失败')
    } finally {
      executing.value = false
    }
  }

  // 状态相关
  const getStatusText = (status) => {
    const statusMap = {
      draft: '草稿',
      saved: '已保存',
      executing: '执行中',
      error: '执行失败',
    }
    return statusMap[status] || '未知'
  }

  const getStatusColor = (status) => {
    const colorMap = {
      draft: 'default',
      saved: 'success',
      executing: 'processing',
      error: 'error',
    }
    return colorMap[status] || 'default'
  }

  // 点击画布其他地方关闭添加节点菜单
  const handleCanvasClick = () => {
    if (showAddNodeMenu.value) {
      showAddNodeMenu.value = false
    }
  }

  const addNode = () => {
    addNodeFromNodeId.value = 'start-node'
    addNodeMenuPosition.value = { x: 300, y: 300 }
    showAddNodeMenu.value = true
  }
</script>

<style scoped>
  .workflow-editor-container {
    width: 100%;
    height: calc(100vh - 88px);
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
  }

  .workflow-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    z-index: 10;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  .workflow-name-input {
    font-size: 20px;
    font-weight: 600;
    border: none;
    background: transparent;
    color: #111827;
    padding: 4px 8px;
    border-radius: 8px;
    transition: all 0.2s ease-in-out;
  }

  .workflow-name-input:hover {
    background-color: #f3f4f6;
  }

  .workflow-name-input:focus {
    background-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  /* Modern Button Styles */
  .toolbar-right :deep(.ant-btn) {
    border-radius: 8px;
    height: 38px;
    padding: 0 18px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #374151;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  }

  .toolbar-right :deep(.ant-btn:hover) {
    transform: translateY(-1px);
    border-color: #9ca3af;
    color: #111827;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  }

  .toolbar-right :deep(.ant-btn:focus),
  .toolbar-right :deep(.ant-btn:active) {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
  }

  /* Primary button (Save) */
  .toolbar-right :deep(.ant-btn-primary) {
    background-color: #3b82f6;
    color: white;
    border-color: transparent;
  }

  .toolbar-right :deep(.ant-btn-primary:hover) {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  /* Special "Run" button */
  .toolbar-right :deep(.btn-run) {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    border-color: transparent;
    color: white;
  }

  .toolbar-right :deep(.btn-run:hover) {
    transform: translateY(-1px);
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
  }

  .toolbar-right :deep(.ant-divider-vertical) {
    height: 24px;
    margin: 0 4px;
    border-left: 1px solid #e5e7eb;
  }

  .workflow-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .workflow-content {
    flex: 1;
    overflow: hidden;
  }

  .workflow-canvas {
    width: 100%;
    height: 100%;
    background: #fafafa;
  }

  .vue-flow-container {
    width: 100%;
    height: 100%;
  }

  /* 移除了左侧面板相关样式 */

  .status-icon {
    display: inline-block;
    animation: none;
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

  /* 添加节点菜单样式 - Dify风格 */
  .add-node-menu {
    position: fixed;
    z-index: 2000;
    background: white;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    min-width: 280px;
    max-width: 320px;
    pointer-events: auto;
  }

  .add-node-menu-content {
    max-height: 480px;
    overflow-y: auto;
  }

  .add-node-title {
    padding: 16px 20px 12px;
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .add-node-list {
    padding: 12px 8px;
    display: grid;
    gap: 4px;
  }

  .add-node-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 12px;
    margin: 0 4px;
  }

  .add-node-item:hover {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .add-node-item .node-icon {
    font-size: 22px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .add-node-item .node-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    flex: 1;
  }

  /* VueFlow 样式定制 */
  :deep(.vue-flow__background) {
    background-color: #fafafa;
  }

  :deep(.vue-flow__edge-path) {
    stroke: #666;
    stroke-width: 2;
  }

  :deep(.vue-flow__edge.animated .vue-flow__edge-path) {
    stroke: #1890ff;
    stroke-dasharray: 5;
    animation: dashdraw 0.5s linear infinite;
  }

  :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
    stroke: #722ed1;
    stroke-width: 3;
  }

  :deep(.vue-flow__controls) {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: 4px;
  }

  :deep(.vue-flow__controls-button) {
    border: none;
    background: transparent;
    color: #595959;
    border-radius: 8px;
    margin: 2px;
  }

  :deep(.vue-flow__controls-button:hover) {
    background: #f0f9ff;
    color: #1890ff;
  }

  @keyframes dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
