<template>
  <a-drawer
    :mask="true"
    :mask-closable="true"
    :title="`编辑节点 - ${node?.label || ''}`"
    :visible="visible || false"
    placement="right"
    width="500"
    @close="handleClose"
  >
    <div v-if="node">
      <a-form layout="vertical">
        <!-- 基础信息 -->
        <a-divider orientation="left">基础信息</a-divider>
        <a-form-item label="节点名称">
          <a-input v-model:value="editData.label" placeholder="请输入节点名称" />
        </a-form-item>
        <a-form-item label="节点描述">
          <a-textarea
            v-model:value="editData.data.description"
            :rows="3"
            placeholder="请输入节点描述..."
          />
        </a-form-item>

        <!-- 节点配置 -->
        <a-divider orientation="left">节点配置</a-divider>

        <!-- 开始节点配置用户输入变量 -->
        <template v-if="editData.data.nodeType === 'start'">
          <a-form-item label="用户输入变量">
            <div class="user-input-config">
              <div
                v-for="(input, index) in editData.data.config.userInputs || []"
                :key="`input_${index}`"
                class="user-input-item"
              >
                <div class="input-header">
                  <span class="input-label">输入项 {{ index + 1 }}</span>
                  <a-button danger size="small" type="text" @click="removeUserInput(index)">
                    删除
                  </a-button>
                </div>
                <a-form-item :class="{ 'mb-2': true }" label="变量名">
                  <a-input v-model:value="input.name" placeholder="变量名，如：userName" />
                </a-form-item>
                <a-form-item :class="{ 'mb-2': true }" label="显示名称">
                  <a-input v-model:value="input.displayName" placeholder="用户看到的名称" />
                </a-form-item>
                <a-form-item :class="{ 'mb-2': true }" label="数据类型">
                  <a-select v-model:value="input.dataType" placeholder="选择数据类型">
                    <a-select-option value="string">文本</a-select-option>
                    <a-select-option value="number">数字</a-select-option>
                    <a-select-option value="boolean">布尔值</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="描述">
                  <a-textarea
                    v-model:value="input.description"
                    :rows="2"
                    placeholder="变量描述..."
                  />
                </a-form-item>
                <a-form-item>
                  <a-checkbox v-model:checked="input.required">必填</a-checkbox>
                </a-form-item>
              </div>
              <a-button block class="mt-3" type="dashed" @click="addUserInput">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加用户输入变量
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- LLM 节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'llm'">
          <a-form-item label="模型选择">
            <a-select v-model:value="editData.data.config.model" placeholder="选择AI模型">
              <a-select-option value="gpt-4">GPT-4</a-select-option>
              <a-select-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-select-option>
              <a-select-option value="claude-3">Claude 3</a-select-option>
              <a-select-option value="chatglm">ChatGLM</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Temperature">
            <a-slider
              v-model:value="editData.data.config.temperature"
              :marks="{ 0: '保守', 1: '平衡', 2: '创意' }"
              :max="2"
              :min="0"
              :step="0.1"
            />
          </a-form-item>
          <a-form-item label="最大Token数">
            <a-input-number
              v-model:value="editData.data.config.maxTokens"
              :max="4096"
              :min="1"
              placeholder="1024"
            />
          </a-form-item>
          <a-form-item label="系统提示词">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.systemPrompt"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="你是一个有用的AI助手..."
            />
          </a-form-item>
          <a-form-item label="用户消息">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.userMessage"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="请输入用户消息内容，可以使用变量..."
            />
          </a-form-item>
        </template>

        <!-- HTTP 节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'http'">
          <a-form-item label="请求方法">
            <a-select v-model:value="editData.data.config.method" placeholder="选择HTTP方法">
              <a-select-option value="GET">GET</a-select-option>
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="PUT">PUT</a-select-option>
              <a-select-option value="DELETE">DELETE</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="请求URL">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.url"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="https://api.example.com/endpoint"
            />
          </a-form-item>
          <a-form-item label="请求头">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.headers"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder='{"Content-Type": "application/json"}'
            />
          </a-form-item>
          <a-form-item label="请求体">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.body"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder='{"key": "${value}"}'
            />
          </a-form-item>
        </template>

        <!-- 条件节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'condition'">
          <a-form-item label="条件配置">
            <div class="condition-list">
              <div
                v-for="(condition, index) in editData.data.config.conditions"
                :key="condition.id"
                class="condition-item"
              >
                <div class="condition-header">
                  <span class="condition-label">{{ condition.label }}</span>
                  <a-button
                    v-if="condition.id !== 'else' && editData.data.config.conditions.length > 2"
                    danger
                    size="small"
                    type="text"
                    @click="removeCondition(index)"
                  >
                    删除
                  </a-button>
                </div>
                <a-form-item :class="{ 'mb-2': true }" label="条件表达式">
                  <VariableSelector
                    v-if="condition.id !== 'else'"
                    v-model:referenceParameters="editData.data.config.referenceParameters"
                    v-model:value="condition.expression"
                    :edges="edges"
                    :node-id="editData.id"
                    :nodes="nodes"
                    placeholder="例如: ${score} > 0.8"
                  />
                  <a-input
                    v-else
                    v-model:value="condition.expression"
                    disabled
                    placeholder="默认分支（自动为 else）"
                  />
                </a-form-item>
                <a-form-item label="分支说明">
                  <a-textarea
                    v-model:value="condition.description"
                    :rows="2"
                    placeholder="描述此分支的用途..."
                  />
                </a-form-item>
              </div>
              <a-button block class="mt-3" type="dashed" @click="addCondition">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加条件分支
              </a-button>
            </div>
          </a-form-item>
        </template>

        <!-- 代码节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'code'">
          <a-form-item label="代码编辑器">
            <CodeEditor
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.code"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
            />
          </a-form-item>
        </template>

        <!-- 知识检索节点配置 -->
        <template v-if="editData.data.nodeType === 'knowledge'">
          <a-form-item label="查询内容">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.query"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="请输入查询内容，可以使用变量，如：${question}"
            />
          </a-form-item>
          <a-form-item label="检索数量(topK)">
            <a-input-number
              v-model:value="editData.data.config.topK"
              :max="20"
              :min="1"
              placeholder="5"
            />
          </a-form-item>
          <a-form-item label="相似度阈值">
            <a-slider
              v-model:value="editData.data.config.threshold"
              :marks="{ 0: '0', 0.5: '0.5', 1: '1' }"
              :max="1"
              :min="0"
              :step="0.1"
            />
          </a-form-item>
        </template>

        <!-- 模板节点配置 -->
        <template v-if="editData.data.nodeType === 'template'">
          <a-form-item label="模板内容">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.template"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder="使用 ${变量} 语法引用变量，如：用户名：${userName}，AI回复：${output}"
            />
          </a-form-item>
        </template>

        <!-- 变量节点配置 -->
        <template v-if="editData.data.nodeType === 'variable'">
          <a-form-item label="变量配置(JSON格式)">
            <VariableSelector
              v-model:referenceParameters="editData.data.config.referenceParameters"
              v-model:value="editData.data.config.variables"
              :edges="edges"
              :node-id="editData.id"
              :nodes="nodes"
              placeholder='{"var1": "${value1}", "var2": "${result}"}'
            />
          </a-form-item>
        </template>

        <!-- 输出节点配置 -->
        <template v-if="editData.data.nodeType === 'output'">
          <a-form-item label="输出内容">
            <a-textarea
              v-model:value="editData.data.config.outputContent"
              :rows="4"
              placeholder="输出的内容，不能使用变量选择器..."
            />
          </a-form-item>
          <a-form-item label="输出格式">
            <a-select v-model:value="editData.data.config.outputFormat" placeholder="选择输出格式">
              <a-select-option value="text">纯文本</a-select-option>
              <a-select-option value="json">JSON格式</a-select-option>
              <a-select-option value="markdown">Markdown格式</a-select-option>
            </a-select>
          </a-form-item>
        </template>

        <!-- 高级设置 -->
        <a-divider orientation="left">高级设置</a-divider>
        <a-form-item label="执行超时(秒)">
          <a-input-number
            v-model:value="editData.data.config.timeout"
            :max="300"
            :min="1"
            placeholder="30"
          />
        </a-form-item>
        <a-form-item label="重试次数">
          <a-input-number
            v-model:value="editData.data.config.retryCount"
            :max="5"
            :min="0"
            placeholder="0"
          />
        </a-form-item>

        <!-- 节点输出参数 -->
        <a-divider orientation="left">节点输出参数</a-divider>
        <div class="node-outputs">
          <div class="outputs-description">
            <p>此节点执行后将产生以下输出变量，后续节点可以使用这些变量：</p>
          </div>
          <div class="output-list">
            <div
              v-for="output in getNodeOutputDefinitions(editData.data.nodeType)"
              :key="output.key"
              class="output-item"
            >
              <div class="output-header">
                <span class="output-name">{{ output.name }}</span>
                <a-tag :color="getDataTypeColor(output.dataType)" size="small">
                  {{ getDataTypeLabel(output.dataType) }}
                </a-tag>
              </div>
              <div class="output-description">{{ output.description }}</div>
              <div class="output-reference">
                <span class="reference-label">引用格式：</span>
                <code class="reference-code">{{
                  getVariableReference(editData.id, output.key)
                }}</code>
              </div>
            </div>
          </div>

          <!-- 如果没有输出参数 -->
          <div
            v-if="getNodeOutputDefinitions(editData.data.nodeType).length === 0"
            class="no-outputs"
          >
            <a-empty :image="false" description="此节点类型没有输出参数" size="small" />
          </div>
        </div>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSave">保存配置</a-button>
            <a-button @click="handleClose">取消</a-button>
            <a-button ghost @click="resetConfig">重置配置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>
  </a-drawer>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import {
    Button as AButton,
    Checkbox as ACheckbox,
    Divider as ADivider,
    Drawer as ADrawer,
    Empty as AEmpty,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    InputNumber as AInputNumber,
    Select as ASelect,
    SelectOption as ASelectOption,
    Slider as ASlider,
    Space as ASpace,
    Tag as ATag,
    Textarea as ATextarea,
  } from 'ant-design-vue'
  import { PlusOutlined } from '@ant-design/icons-vue'
  import VariableSelector from './VariableSelector.vue'
  import CodeEditor from './CodeEditor.vue'
  import { getDataTypeColor, getDataTypeLabel, getNodeOutputDefinitions } from '../types/variables'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    node: {
      type: Object,
      default: null,
    },
    // 添加工作流节点和边数据，用于变量选择
    nodes: {
      type: Array,
      default: () => [],
    },
    edges: {
      type: Array,
      default: () => [],
    },
  })

  const emit = defineEmits(['update:visible', 'save', 'close'])

  const editData = ref({})

  // 监听节点变化，初始化编辑数据
  watch(
    () => props.node,
    (newNode) => {
      console.log('NodeConfigPanel received node:', newNode)
      if (newNode) {
        editData.value = JSON.parse(JSON.stringify(newNode))
        // 确保存在 referenceParameters 字段
        if (!editData.value.data.config.referenceParameters) {
          editData.value.data.config.referenceParameters = []
        }
        console.log('Edit data initialized:', editData.value)
      }
    },
    { immediate: true },
  )

  // 处理关闭事件
  const handleClose = () => {
    emit('update:visible', false)
    emit('close')
  }

  // 添加用户输入变量
  const addUserInput = () => {
    if (!editData.value.data.config.userInputs) {
      editData.value.data.config.userInputs = []
    }
    editData.value.data.config.userInputs.push({
      name: '',
      displayName: '',
      dataType: 'string',
      description: '',
      required: false,
    })
  }

  // 删除用户输入变量
  const removeUserInput = (index) => {
    if (editData.value.data.config.userInputs) {
      editData.value.data.config.userInputs.splice(index, 1)
    }
  }

  // 添加条件分支
  const addCondition = () => {
    const conditions = editData.value.data.config.conditions
    const newConditionIndex = conditions.length - 1 // 在else之前插入
    const newCondition = {
      id: `condition${Date.now()}`,
      expression: '',
      label: `条件${newConditionIndex + 1}`,
      description: '',
    }
    conditions.splice(newConditionIndex, 0, newCondition)
  }

  // 删除条件分支
  const removeCondition = (index) => {
    editData.value.data.config.conditions.splice(index, 1)
  }

  // 保存配置
  const handleSave = () => {
    emit('save', editData.value)
  }

  // 重置配置
  const resetConfig = () => {
    const defaultConfig = getDefaultConfig(editData.value.data.nodeType)
    editData.value.data.config = defaultConfig
  }

  // 获取默认配置
  const getDefaultConfig = (nodeType) => {
    const defaultConfigs = {
      start: {
        userInputs: [
          {
            name: 'question',
            displayName: '用户问题',
            dataType: 'string',
            description: '用户输入的问题',
            required: true,
          },
        ],
      },
      llm: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: '你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。',
        userMessage: '${question}',
        timeout: 30,
        retryCount: 1,
      },
      http: {
        method: 'GET',
        url: '',
        headers: '{}',
        body: '',
        timeout: 30,
        retryCount: 1,
      },
      condition: {
        conditions: [
          { id: 'condition1', expression: '', label: '条件1', description: '' },
          { id: 'else', expression: 'else', label: '其他', description: '默认分支' },
        ],
        timeout: 10,
        retryCount: 0,
      },
      code: {
        language: 'javascript',
        code: "function add(a, b) { return a + b; } add('fxz', ' I love you.');",
        timeout: 30,
        retryCount: 0,
      },
      knowledge: {
        query: '${question}',
        topK: 5,
        threshold: 0.7,
        timeout: 15,
        retryCount: 1,
      },
      template: {
        template: '根据用户问题: ${question}\n生成回答: ${output}',
        timeout: 10,
        retryCount: 0,
      },
      variable: {
        variables: '{"processed_question": "${question}"}',
        timeout: 5,
        retryCount: 0,
      },
      output: {
        outputContent: '工作流执行完成',
        outputFormat: 'text',
        timeout: 5,
        retryCount: 0,
      },
    }

    return (
      defaultConfigs[nodeType] || {
        timeout: 30,
        retryCount: 1,
      }
    )
  }

  // 获取变量引用格式
  const getVariableReference = (nodeId, outputKey) => {
    return `{{output.${nodeId}.${outputKey}}}`
  }
</script>

<style scoped>
  .user-input-config {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
  }

  .user-input-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .user-input-item:last-of-type {
    margin-bottom: 0;
  }

  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .input-label {
    font-weight: 600;
    color: #262626;
  }

  .condition-list {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
  }

  .condition-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;
    background: #fafafa;
  }

  .condition-item:last-of-type {
    margin-bottom: 0;
  }

  .condition-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .condition-label {
    font-weight: 600;
    color: #262626;
  }

  .mb-2 {
    margin-bottom: 8px;
  }

  .mt-3 {
    margin-top: 16px;
  }

  /* 节点输出样式 */
  .node-outputs {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    background: #fafbfc;
  }

  .outputs-description {
    margin-bottom: 16px;
  }

  .outputs-description p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  .output-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .output-item {
    padding: 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    background: #ffffff;
    transition: all 0.2s ease;
  }

  .output-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .output-name {
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
  }

  .output-description {
    color: #6b7280;
    font-size: 12px;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .output-reference {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .reference-label {
    font-size: 11px;
    color: #9ca3af;
  }

  .reference-code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #0ea5e9;
    border: 1px solid #e2e8f0;
  }

  .no-outputs {
    padding: 20px;
    text-align: center;
    color: #9ca3af;
  }
</style>
