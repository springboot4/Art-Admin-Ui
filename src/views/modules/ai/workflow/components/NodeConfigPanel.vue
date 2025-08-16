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
          <a-form-item label="引用变量">
            <div class="http-variable-selector-wrapper">
              <VariableSelector
                v-model:referenceParameters="editData.data.config.referenceParameters"
                :edges="edges"
                :multiple="true"
                :node-id="editData.id"
                :nodes="nodes"
                :value="''"
                class="http-variable-selector"
                placeholder="点击选择要在HTTP节点中使用的变量..."
                readonly
              />
            </div>
          </a-form-item>

          <a-form-item label="请求方法">
            <a-select
              v-model:value="editData.data.config.method"
              placeholder="选择HTTP方法"
              @change="onHttpMethodChange"
            >
              <a-select-option value="GET">GET</a-select-option>
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="PUT">PUT</a-select-option>
              <a-select-option value="DELETE">DELETE</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="请求URL">
            <a-input
              v-model:value="editData.data.config.url"
              placeholder="https://api.example.com/endpoint?param={{nodeId.paramName}}"
            />
          </a-form-item>

          <!-- HTTP配置标签页 -->
          <a-form-item :colon="false" label=" ">
            <a-tabs
              :activeKey="httpActiveTab"
              size="small"
              type="card"
              @update:activeKey="(key) => (httpActiveTab = key)"
            >
              <!-- Params 标签页 -->
              <a-tab-pane key="params" tab="Params">
                <SimpleKeyValueEditor
                  :value="
                    Array.isArray(editData.data.config.params) ? editData.data.config.params : []
                  "
                  placeholder-key="参数名"
                  placeholder-value="参数值，如：{{nodeId.paramName}}"
                  title="参数"
                  @update:value="(val) => (editData.data.config.params = val)"
                />
              </a-tab-pane>

              <!-- Headers 标签页 -->
              <a-tab-pane key="headers" tab="Headers">
                <SimpleKeyValueEditor
                  :value="
                    Array.isArray(editData.data.config.headers) ? editData.data.config.headers : []
                  "
                  placeholder-key="请求头名称"
                  placeholder-value="请求头值，如：{{nodeId.paramName}}"
                  title="请求头"
                  @update:value="(val) => (editData.data.config.headers = val)"
                />
              </a-tab-pane>

              <!-- Body 标签页 (仅POST/PUT显示) -->
              <a-tab-pane
                v-if="['POST', 'PUT'].includes(editData.data.config.method)"
                key="body"
                tab="Body"
              >
                <div class="body-config">
                  <!-- Body类型选择 -->
                  <div class="body-type-selector mb-3">
                    <a-radio-group
                      :value="editData.data.config.body?.type || 'none'"
                      @change="onBodyTypeChange"
                    >
                      <a-radio-button value="none">None</a-radio-button>
                      <a-radio-button value="form-urlencoded">form-urlencoded</a-radio-button>
                      <a-radio-button value="json">JSON</a-radio-button>
                    </a-radio-group>
                  </div>

                  <!-- form-urlencoded Body -->
                  <div v-if="editData.data.config.body?.type === 'form-urlencoded'">
                    <SimpleKeyValueEditor
                      :value="
                        Array.isArray(editData.data.config.body?.formData)
                          ? editData.data.config.body.formData
                          : []
                      "
                      placeholder-key="字段名"
                      placeholder-value="字段值，如：{{nodeId.paramName}}"
                      title="表单数据"
                      @update:value="(val) => (editData.data.config.body.formData = val)"
                    />
                  </div>

                  <!-- JSON Body -->
                  <div v-if="editData.data.config.body?.type === 'json'">
                    <SimpleJsonEditor
                      :value="editData.data.config.body?.jsonData || ''"
                      placeholder='{\n  "key": "value",\n  "data": "{{nodeId.paramName}}"\n}'
                      @update:value="(val) => (editData.data.config.body.jsonData = val)"
                    />
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>
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

    <!-- 统一变量选择器覆盖层 -->
    <div
      v-if="showUnifiedVariableSelector"
      class="variable-selector-overlay"
      @click="closeUnifiedVariableSelector"
    >
      <div class="variable-selector-panel" @click.stop>
        <div class="variable-selector-header">
          <h3>选择变量</h3>
          <a-button size="small" @click="closeUnifiedVariableSelector">
            <template #icon>
              <CloseOutlined />
            </template>
          </a-button>
        </div>
        <VariableSelector
          v-model:referenceParameters="editData.data.config.referenceParameters"
          :edges="edges"
          :multiple="true"
          :node-id="editData.id"
          :nodes="nodes"
          :value="''"
          placeholder="选择要在HTTP节点中使用的变量..."
          @update:referenceParameters="handleUnifiedVariableChange"
        />
        <div class="variable-selector-actions">
          <a-button size="small" @click="closeUnifiedVariableSelector"> 确定</a-button>
        </div>
      </div>
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
    RadioButton as ARadioButton,
    RadioGroup as ARadioGroup,
    Select as ASelect,
    SelectOption as ASelectOption,
    Slider as ASlider,
    Space as ASpace,
    TabPane as ATabPane,
    Tabs as ATabs,
    Tag as ATag,
    Textarea as ATextarea,
  } from 'ant-design-vue'
  import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
  import VariableSelector from './VariableSelector.vue'
  import CodeEditor from './CodeEditor.vue'
  import SimpleKeyValueEditor from './SimpleKeyValueEditor.vue'
  import SimpleJsonEditor from './SimpleJsonEditor.vue'
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
  const httpActiveTab = ref('params')
  const showUnifiedVariableSelector = ref(false)

  // 监听节点变化，初始化编辑数据
  watch(
    () => props.node,
    (newNode) => {
      if (newNode) {
        editData.value = JSON.parse(JSON.stringify(newNode))
        // 确保存在 referenceParameters 字段
        if (!editData.value.data.config.referenceParameters) {
          editData.value.data.config.referenceParameters = []
        }

        // 确保HTTP节点配置初始化
        if (editData.value.data.nodeType === 'http') {
          // 确保params是数组
          if (!Array.isArray(editData.value.data.config.params)) {
            editData.value.data.config.params = []
          }
          // 确保headers是数组
          if (!Array.isArray(editData.value.data.config.headers)) {
            editData.value.data.config.headers = []
          }
          // 确保body是对象而不是字符串
          if (
            !editData.value.data.config.body ||
            typeof editData.value.data.config.body !== 'object'
          ) {
            editData.value.data.config.body = {
              type: 'none',
              formData: [],
              jsonData: '',
            }
          } else {
            // 确保body对象有必要的属性
            if (!editData.value.data.config.body.type) {
              editData.value.data.config.body.type = 'none'
            }
            if (!Array.isArray(editData.value.data.config.body.formData)) {
              editData.value.data.config.body.formData = []
            }
            if (typeof editData.value.data.config.body.jsonData !== 'string') {
              editData.value.data.config.body.jsonData = ''
            }
          }
        }
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
        params: [],
        headers: [],
        body: {
          type: 'none', // 'none', 'form-urlencoded', 'json'
          formData: [],
          jsonData: '',
        },
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

  // 获取变量显示名称
  const getVariableDisplayName = (param) => {
    if (!param || typeof param !== 'object') {
      console.warn('Invalid param for getVariableDisplayName:', param)
      return ''
    }
    const sourceNode = props.nodes.find((n) => n.id === param.nodeId)
    const nodeName = sourceNode?.label || param.nodeId || 'Unknown'
    const paramKey = param.key || 'unknown'
    return `${nodeName}.${paramKey}`
  }

  // 打开统一变量选择器
  const openUnifiedVariableSelector = () => {
    showUnifiedVariableSelector.value = true
  }

  // 关闭统一变量选择器
  const closeUnifiedVariableSelector = () => {
    showUnifiedVariableSelector.value = false
  }

  // 删除变量引用
  const removeVariableReference = (index) => {
    if (editData.value.data.config.referenceParameters) {
      editData.value.data.config.referenceParameters.splice(index, 1)
    }
  }

  // 处理统一变量选择变化
  const handleUnifiedVariableChange = (newParams) => {
    if (Array.isArray(newParams)) {
      editData.value.data.config.referenceParameters = [...newParams]
    }
  }

  // HTTP节点相关方法
  const onHttpMethodChange = (method) => {
    // 当请求方法改变时，如果切换到GET/DELETE，隐藏Body标签页
    if (['GET', 'DELETE'].includes(method)) {
      if (httpActiveTab.value === 'body') {
        httpActiveTab.value = 'params'
      }
      // 重置Body配置
      editData.value.data.config.body = {
        type: 'none',
        formData: [],
        jsonData: '',
      }
    }
  }

  const onBodyTypeChange = (event) => {
    // 当Body类型改变时，重置相应的数据
    const bodyType = event.target ? event.target.value : event

    // 确保body是对象
    if (!editData.value.data.config.body || typeof editData.value.data.config.body !== 'object') {
      editData.value.data.config.body = {
        type: bodyType,
        formData: [],
        jsonData: '',
      }
      return
    }

    // 创建新的body对象以触发响应式更新
    const newBody = { ...editData.value.data.config.body }
    newBody.type = bodyType

    // 根据类型重置相应数据
    if (bodyType === 'form-urlencoded') {
      newBody.jsonData = ''
      if (!Array.isArray(newBody.formData)) {
        newBody.formData = []
      }
    } else if (bodyType === 'json') {
      newBody.formData = []
      if (typeof newBody.jsonData !== 'string') {
        newBody.jsonData = ''
      }
    } else if (bodyType === 'none') {
      newBody.formData = []
      newBody.jsonData = ''
    }

    // 更新整个body对象
    editData.value.data.config.body = newBody
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

  /* HTTP配置相关样式 */
  .body-config {
    padding: 0;
  }

  .body-type-selector {
    margin-bottom: 16px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #f0f0f0;
  }

  .body-type-selector .ant-radio-group {
    width: 100%;
  }

  .body-type-selector .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
  }

  /* 标签页样式优化 */
  :deep(.ant-tabs-card .ant-tabs-tab) {
    border-radius: 6px 6px 0 0;
    border: 1px solid #d9d9d9;
    background: #fafafa;
    margin-right: 4px;
  }

  :deep(.ant-tabs-card .ant-tabs-tab-active) {
    background: #fff;
    border-bottom-color: #fff;
  }

  :deep(.ant-tabs-card .ant-tabs-content-holder) {
    border: 1px solid #d9d9d9;
    border-radius: 0 6px 6px 6px;
    background: #fff;
    padding: 16px;
  }

  :deep(.ant-tabs-card .ant-tabs-tabpane) {
    padding: 0;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .body-type-selector .ant-radio-button-wrapper {
      padding: 4px 8px;
      font-size: 12px;
    }
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

  /* 变量声明区域样式 */
  .variable-declaration {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 16px;
    background: #fafbfc;
  }

  .variable-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .variable-title {
    font-weight: 500;
    color: #262626;
    font-size: 14px;
  }

  .variable-list {
    min-height: 80px;
  }

  .variable-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .variable-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .variable-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .variable-name {
    font-weight: 500;
    color: #1f2937;
    font-size: 13px;
  }

  .variable-reference {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #0ea5e9;
    border: 1px solid #e2e8f0;
  }

  .no-variables {
    padding: 20px;
    text-align: center;
  }

  .variable-help {
    margin-top: 12px;
    padding: 8px 12px;
    background: #f0f9ff;
    border-radius: 4px;
    border: 1px solid #e0f2fe;
  }

  .variable-help p {
    margin: 0;
    font-size: 12px;
    color: #0c4a6e;
  }

  .variable-help code {
    background: #dbeafe;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    color: #1e40af;
  }

  /* 统一变量选择器覆盖层 */
  .variable-selector-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .variable-selector-panel {
    width: 600px;
    max-height: 80vh;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .variable-selector-header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  .variable-selector-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #262626;
  }

  .variable-selector-actions {
    padding: 16px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
    display: flex;
    justify-content: flex-end;
  }

  /* HTTP 节点变量选择器样式优化 */
  .http-variable-selector-wrapper {
    position: relative;
  }

  .http-variable-selector :deep(.variable-input) {
    cursor: pointer;
    background-color: #fafafa;
    border: 1px dashed #d9d9d9;
    transition: all 0.3s ease;
  }

  .http-variable-selector :deep(.variable-input:hover) {
    border-color: #40a9ff;
    background-color: #f6ffed;
  }

  .http-variable-selector :deep(.variable-input:focus) {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    background-color: #ffffff;
  }

  .http-variable-selector :deep(.variable-input input) {
    cursor: pointer !important;
  }

  .http-variable-selector :deep(.ant-input-suffix .ant-btn) {
    color: #1890ff;
    border: none;
    background: transparent;
  }

  .http-variable-selector :deep(.ant-input-suffix .ant-btn:hover) {
    color: #40a9ff;
    background: rgba(24, 144, 255, 0.1);
  }
</style>
