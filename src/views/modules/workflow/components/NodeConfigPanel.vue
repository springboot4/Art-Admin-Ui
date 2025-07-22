<template>
  <a-drawer
    :visible="visible || false"
    :title="`编辑节点 - ${node?.label || ''}`"
    width="500"
    @close="handleClose"
    :mask="true"
    :mask-closable="true"
    placement="right"
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
              :min="0" 
              :max="2" 
              :step="0.1"
              :marks="{ 0: '保守', 1: '平衡', 2: '创意' }"
            />
          </a-form-item>
          <a-form-item label="最大Token数">
            <a-input-number 
              v-model:value="editData.data.config.maxTokens" 
              :min="1" 
              :max="4096"
              placeholder="1024"
            />
          </a-form-item>
          <a-form-item label="系统提示词">
            <a-textarea 
              v-model:value="editData.data.config.systemPrompt"
              :rows="4"
              placeholder="你是一个有用的AI助手..."
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
            <a-input 
              v-model:value="editData.data.config.url" 
              placeholder="https://api.example.com/endpoint"
            />
          </a-form-item>
          <a-form-item label="请求头">
            <a-textarea 
              v-model:value="editData.data.config.headers"
              :rows="3"
              placeholder='{"Content-Type": "application/json"}'
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
                    type="text" 
                    size="small" 
                    danger
                    @click="removeCondition(index)"
                  >
                    删除
                  </a-button>
                </div>
                <a-form-item label="条件表达式" :class="{ 'mb-2': true }">
                  <a-input 
                    v-model:value="condition.expression"
                    :placeholder="condition.id === 'else' ? '默认分支（自动为 else）' : '例如: result.score > 0.8'"
                    :disabled="condition.id === 'else'"
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
              <a-button type="dashed" block @click="addCondition" class="mt-3">
                <template #icon><PlusOutlined /></template>
                添加条件分支
              </a-button>
            </div>
          </a-form-item>
        </template>
        
        <!-- 代码节点特殊配置 -->
        <template v-if="editData.data.nodeType === 'code'">
          <a-form-item label="代码语言">
            <a-select v-model:value="editData.data.config.language" placeholder="选择编程语言">
              <a-select-option value="python">Python</a-select-option>
              <a-select-option value="javascript">JavaScript</a-select-option>
              <a-select-option value="typescript">TypeScript</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="代码内容">
            <a-textarea 
              v-model:value="editData.data.config.code"
              :rows="8"
              placeholder="# 在这里编写你的代码..."
              style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;"
            />
          </a-form-item>
        </template>
        
        <!-- 知识检索节点配置 -->
        <template v-if="editData.data.nodeType === 'knowledge'">
          <a-form-item label="检索数量(topK)">
            <a-input-number 
              v-model:value="editData.data.config.topK" 
              :min="1" 
              :max="20"
              placeholder="5"
            />
          </a-form-item>
          <a-form-item label="相似度阈值">
            <a-slider 
              v-model:value="editData.data.config.threshold" 
              :min="0" 
              :max="1" 
              :step="0.1"
              :marks="{ 0: '0', 0.5: '0.5', 1: '1' }"
            />
          </a-form-item>
        </template>
        
        <!-- 模板节点配置 -->
        <template v-if="editData.data.nodeType === 'template'">
          <a-form-item label="模板内容">
            <a-textarea 
              v-model:value="editData.data.config.template"
              :rows="6"
              placeholder="使用 {{ variable }} 语法引用变量"
            />
          </a-form-item>
        </template>
        
        <!-- 变量节点配置 -->
        <template v-if="editData.data.nodeType === 'variable'">
          <a-form-item label="变量配置(JSON格式)">
            <a-textarea 
              v-model:value="editData.data.config.variables"
              :rows="6"
              placeholder='{"var1": "value1", "var2": "value2"}'
            />
          </a-form-item>
        </template>
        
        <!-- 高级设置 -->
        <a-divider orientation="left">高级设置</a-divider>
        <a-form-item label="执行超时(秒)">
          <a-input-number 
            v-model:value="editData.data.config.timeout" 
            :min="1" 
            :max="300"
            placeholder="30"
          />
        </a-form-item>
        <a-form-item label="重试次数">
          <a-input-number 
            v-model:value="editData.data.config.retryCount" 
            :min="0" 
            :max="5"
            placeholder="0"
          />
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSave">保存配置</a-button>
            <a-button @click="handleClose">取消</a-button>
            <a-button @click="resetConfig" ghost>重置配置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import {
  Drawer as ADrawer,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Textarea as ATextarea,
  Select as ASelect,
  SelectOption as ASelectOption,
  InputNumber as AInputNumber,
  Slider as ASlider,
  Button as AButton,
  Space as ASpace,
  Divider as ADivider
} from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  node: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'save', 'close'])

const editData = ref({})

// 监听节点变化，初始化编辑数据
watch(() => props.node, (newNode) => {
  console.log('NodeConfigPanel received node:', newNode)
  if (newNode) {
    editData.value = JSON.parse(JSON.stringify(newNode))
    console.log('Edit data initialized:', editData.value)
  }
}, { immediate: true })

// 处理关闭事件
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 添加条件分支
const addCondition = () => {
  const conditions = editData.value.data.config.conditions
  const newConditionIndex = conditions.length - 1 // 在else之前插入
  const newCondition = {
    id: `condition${Date.now()}`,
    expression: '',
    label: `条件${newConditionIndex + 1}`,
    description: ''
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
    llm: {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1024,
      systemPrompt: '你是一个有用的AI助手，请根据用户输入提供准确和有帮助的回答。',
      timeout: 30,
      retryCount: 1
    },
    http: {
      method: 'GET',
      url: '',
      headers: '{}',
      timeout: 30,
      retryCount: 1
    },
    condition: {
      conditions: [
        { id: 'condition1', expression: '', label: '条件1', description: '' },
        { id: 'else', expression: 'else', label: '其他', description: '默认分支' }
      ],
      timeout: 10,
      retryCount: 0
    },
    code: {
      language: 'python',
      code: '# 在这里编写你的代码\nprint("Hello, World!")',
      timeout: 30,
      retryCount: 0
    },
    knowledge: {
      topK: 5,
      threshold: 0.7,
      timeout: 15,
      retryCount: 1
    },
    template: {
      template: '{{ input }}',
      timeout: 10,
      retryCount: 0
    },
    variable: {
      variables: '{}',
      timeout: 5,
      retryCount: 0
    }
  }
  
  return defaultConfigs[nodeType] || {
    timeout: 30,
    retryCount: 1
  }
}
</script>

<style scoped>
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
</style>
