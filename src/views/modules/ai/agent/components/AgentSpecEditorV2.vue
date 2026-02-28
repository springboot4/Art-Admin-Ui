<template>
  <div class="agent-spec-editor-v2">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <div class="app-info">
          <span class="app-name">{{ app?.name || 'Agent 应用' }}</span>
          <a-tag :color="statusColor" size="small" class="status-tag">{{ statusLabel }}</a-tag>
        </div>
      </div>
      <div class="toolbar-center">
        <a-button type="default" @click="showModelModal = true">
          <SettingOutlined />
          {{ modelDisplay }}
          <span class="model-meta">
            T: {{ localSpec.temperature?.toFixed(2) || '0.70' }}
            <template v-if="localSpec.maxTokens"> · {{ localSpec.maxTokens }}</template>
          </span>
        </a-button>
      </div>
      <div class="toolbar-right">
        <a-button
          :disabled="!hasChanges || !!blockingIssues.length"
          :loading="saving"
          @click="$emit('save-draft')"
        >
          保存草稿
        </a-button>
        <a-button
          type="primary"
          :disabled="!canPublish || !!blockingIssues.length"
          :loading="publishing"
          @click="$emit('publish')"
        >
          <template #icon><SendOutlined /></template>
          发布上线
        </a-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧配置区 -->
      <div class="config-panel">
        <!-- 配置区域 -->
        <div class="config-sections">
          <!-- 配置概览警告 -->
          <a-alert
            v-if="blockingIssues.length"
            :message="blockingIssues.join('；')"
            type="warning"
            show-icon
            closable
            class="config-alert"
          />

          <!-- 1. 提示词 -->
          <ConfigSection title="提示词" icon="message">
            <a-form layout="vertical" class="section-form">
              <a-form-item>
                <a-textarea
                  v-model:value="localSpec.systemPrompt"
                  :auto-size="{ minRows: 8, maxRows: 16 }"
                  placeholder="为Agent设定角色、能力与行为指引...

例如：
你是一个专业的客服助手，擅长解答用户问题。你需要：
1. 用友好、专业的语气回答
2. 如果不确定答案，主动寻求帮助
3. 根据知识库内容提供准确信息"
                  show-count
                  :maxlength="2000"
                />
              </a-form-item>
            </a-form>
          </ConfigSection>

          <!-- 2. 用户输入变量 -->
          <ConfigSection title="用户输入变量" icon="form" :defaultCollapsed="true">
            <div class="user-inputs-config">
              <div class="config-desc">
                <div class="desc-content">
                  <div class="desc-text">定义需要用户在运行时提供的变量，可在提示词中使用</div>
                  <code class="desc-code">'${input.input.变量名}'</code>
                  <span class="desc-text">引用</span>
                </div>
              </div>

              <div
                v-if="localSpec.userInputs && localSpec.userInputs.length"
                class="user-inputs-list"
              >
                <div
                  v-for="(input, index) in localSpec.userInputs"
                  :key="`input_${index}`"
                  class="user-input-item"
                >
                  <div class="input-header">
                    <div class="header-left">
                      <div class="input-number">{{ index + 1 }}</div>
                      <span class="input-title">变量配置</span>
                      <span v-if="input.required" class="required-badge">必填</span>
                    </div>
                    <a-button
                      danger
                      size="small"
                      type="text"
                      class="delete-btn"
                      @click="removeUserInput(index)"
                    >
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                      删除
                    </a-button>
                  </div>

                  <a-form layout="vertical" class="input-form">
                    <a-row :gutter="16">
                      <a-col :span="12">
                        <a-form-item label="变量名" class="form-item-enhanced">
                          <a-input
                            v-model:value="input.name"
                            placeholder="如：age, city"
                            :maxlength="50"
                            class="enhanced-input"
                            @blur="validateVariableName(input, index)"
                          >
                            <template #prefix>
                              <span class="input-prefix">$</span>
                            </template>
                          </a-input>
                          <div class="field-hint">
                            <InfoCircleOutlined class="hint-icon" />
                            仅支持字母、数字、下划线，字母开头
                          </div>
                        </a-form-item>
                      </a-col>
                      <a-col :span="12">
                        <a-form-item label="显示名称" class="form-item-enhanced">
                          <a-input
                            v-model:value="input.displayName"
                            placeholder="用户看到的名称"
                            :maxlength="50"
                            class="enhanced-input"
                          >
                            <template #prefix>
                              <UserOutlined class="input-prefix-icon" />
                            </template>
                          </a-input>
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <a-row :gutter="16">
                      <a-col :span="12">
                        <a-form-item label="数据类型" class="form-item-enhanced">
                          <a-select v-model:value="input.dataType" class="enhanced-select">
                            <a-select-option value="string">
                              <span class="option-content">
                                <FileTextOutlined class="option-icon" />
                                <span>文本</span>
                              </span>
                            </a-select-option>
                            <a-select-option value="number">
                              <span class="option-content">
                                <NumberOutlined class="option-icon" />
                                <span>数字</span>
                              </span>
                            </a-select-option>
                            <a-select-option value="boolean">
                              <span class="option-content">
                                <CheckOutlined class="option-icon" />
                                <span>布尔值</span>
                              </span>
                            </a-select-option>
                          </a-select>
                        </a-form-item>
                      </a-col>
                      <a-col :span="12">
                        <a-form-item label="选项" class="form-item-enhanced checkbox-item">
                          <div class="checkbox-wrapper">
                            <a-checkbox v-model:checked="input.required" class="enhanced-checkbox">
                              <span class="checkbox-label">设为必填项</span>
                            </a-checkbox>
                          </div>
                        </a-form-item>
                      </a-col>
                    </a-row>

                    <a-form-item label="描述" class="form-item-enhanced">
                      <a-textarea
                        v-model:value="input.description"
                        :auto-size="{ minRows: 2, maxRows: 4 }"
                        placeholder="请输入变量的用途说明，帮助用户理解此变量的作用"
                        :maxlength="200"
                        show-count
                        class="enhanced-textarea"
                      />
                    </a-form-item>
                  </a-form>
                </div>
              </div>

              <a-button block type="dashed" class="add-input-btn" @click="addUserInput">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加用户输入变量
              </a-button>
            </div>
          </ConfigSection>

          <!-- 3. 知识库 -->
          <ConfigSection title="知识库" icon="book" :defaultCollapsed="true">
            <div class="knowledge-config">
              <div class="config-toggle">
                <div class="toggle-info">
                  <span class="toggle-desc">从知识库中检索相关内容，增强Agent回答能力</span>
                </div>
              </div>

              <template v-if="knowledgeEnabled">
                <a-divider style="margin: 16px 0" />

                <a-form layout="vertical" class="section-form">
                  <a-form-item label="关联数据集">
                    <a-select
                      v-model:value="localSpec.knowledge!.datasetIds"
                      :loading="datasetLoading"
                      mode="multiple"
                      placeholder="选择可检索的数据集"
                      allow-clear
                      @dropdownVisibleChange="(open) => open && loadDatasets()"
                    >
                      <a-select-option
                        v-for="dataset in datasetOptions"
                        :key="dataset.value"
                        :value="dataset.value"
                      >
                        {{ dataset.label }}
                      </a-select-option>
                    </a-select>
                    <div class="field-hint">支持多选，可组合不同来源的知识</div>
                  </a-form-item>

                  <a-form-item label="检索策略">
                    <a-select
                      v-model:value="localSpec.knowledge!.retrievalTypes"
                      :options="RETRIEVAL_TYPE_OPTIONS"
                      mode="multiple"
                      placeholder="选择检索方式"
                      allow-clear
                    />
                    <div class="field-hint">向量检索速度快，混合检索准确率高</div>
                  </a-form-item>
                </a-form>
              </template>
            </div>
          </ConfigSection>

          <!-- 4. 工具配置 -->
          <ConfigSection title="工具" icon="tool" :defaultCollapsed="true">
            <div class="tools-config">
              <div class="tools-list">
                <div
                  v-for="tool in availableTools"
                  :key="tool.name"
                  class="tool-item"
                  :class="{ active: isToolEnabled(tool.name) }"
                  @click="toggleTool(tool.name)"
                >
                  <div class="tool-main">
                    <div class="tool-icon">{{ tool.icon }}</div>
                    <div class="tool-info">
                      <div class="tool-name">{{ tool.title }}</div>
                      <div class="tool-desc">{{ tool.description }}</div>
                    </div>
                  </div>
                  <div class="tool-action">
                    <a-switch :checked="isToolEnabled(tool.name)" @click.stop />
                  </div>
                </div>
              </div>

              <!-- 工具参数配置 -->
              <div v-if="enabledNonKnowledgeTools.length" class="tool-params">
                <a-divider>工具参数配置</a-divider>
                <div v-for="tool in enabledNonKnowledgeTools" :key="tool" class="tool-param-card">
                  <div class="param-header">
                    <strong>{{ getToolMeta(tool)?.title }}</strong>
                  </div>
                  <div v-if="getToolMeta(tool)?.fields?.length" class="param-fields">
                    <div
                      v-for="field in getToolMeta(tool)?.fields"
                      :key="field.field"
                      class="param-field"
                    >
                      <div class="field-label">
                        {{ field.field }}
                        <span v-if="field.required" class="required">*</span>
                      </div>
                      <div class="field-desc">{{ field.description }}</div>

                      <a-radio-group
                        :value="getFieldBindingMode(tool, field.field)"
                        @change="(e) => changeFieldBindingMode(tool, field.field, e.target.value)"
                        size="small"
                        style="margin-top: 8px"
                      >
                        <a-radio-button value="selector">变量</a-radio-button>
                        <a-radio-button value="constant">固定值</a-radio-button>
                      </a-radio-group>

                      <div
                        v-if="getFieldBindingMode(tool, field.field) === 'selector'"
                        class="field-input"
                      >
                        <a-input
                          :value="formatSelectorLabel(getBindingSelector(tool, field.field))"
                          placeholder="点击选择变量"
                          readonly
                          @click="openFieldVariableSelector(tool, field.field)"
                        >
                          <template #suffix>
                            <EditOutlined />
                          </template>
                        </a-input>
                      </div>
                      <div v-else class="field-input">
                        <a-textarea
                          :value="formatConstant(getBindingConstant(tool, field.field))"
                          :auto-size="{ minRows: 2, maxRows: 4 }"
                          placeholder="输入固定值，支持 JSON"
                          @change="(e) => setFieldConstant(tool, field.field, e.target.value)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ConfigSection>

          <!-- 5. 高级配置 -->
          <ConfigSection title="高级配置" icon="setting" :defaultCollapsed="true">
            <a-form layout="vertical" class="section-form">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="Agent 策略">
                    <a-select v-model:value="localSpec.strategy.type">
                      <a-select-option value="react">React 模式</a-select-option>
                      <a-select-option value="plan_execute">计划执行</a-select-option>
                    </a-select>
                    <div class="field-hint">
                      {{ strategyDescription }}
                    </div>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="最大步骤数">
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxSteps"
                      :min="1"
                      :precision="0"
                      placeholder="限制迭代次数"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="最大工具调用次数">
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxToolCalls"
                      :min="1"
                      :precision="0"
                      placeholder="限制工具调用"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="最长执行时长(ms)">
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxTimeMs"
                      :min="1000"
                      :step="1000"
                      :precision="0"
                      placeholder="例如 30000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item>
                <template #label>
                  <div class="label-with-switch">
                    <span>会话记忆</span>
                    <a-switch v-model:checked="memoryEnabled" size="small" />
                  </div>
                </template>
                <a-input-number
                  v-if="memoryEnabled"
                  v-model:value="localSpec.memory!.window!.size"
                  :min="1"
                  :precision="0"
                  placeholder="记忆窗口（轮次）"
                  style="width: 100%"
                />
                <div v-else class="field-hint">关闭后Agent仅依赖当前会话内容</div>
              </a-form-item>
            </a-form>
          </ConfigSection>
        </div>
      </div>

      <!-- 右侧调试面板 -->
      <div class="debug-panel">
        <AgentTestPanel
          v-if="agent?.id"
          :agent-id="String(agent.id)"
          :app-id="app?.id || ''"
          :app-name="app?.name || ''"
          :status="status"
          :spec="spec"
        />
        <div v-else class="debug-placeholder">
          <div class="placeholder-content">
            <RobotOutlined class="placeholder-icon" />
            <p class="placeholder-title">等待配置</p>
            <p class="placeholder-desc">请先保存Agent配置后开始调试</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 模型配置弹窗 -->
    <ModelConfigModal
      v-model:visible="showModelModal"
      v-model:model-id="localSpec.modelId"
      v-model:max-tokens="localSpec.maxTokens"
      v-model:temperature="temperatureProxy"
      :model-options="modelSelectOptions"
      :model-loading="modelLoading"
      @change="handleModelConfigChange"
    />

    <!-- 变量选择器弹窗 -->
    <a-modal
      v-model:visible="variableSelectorVisible"
      title="选择变量"
      :width="460"
      :maskClosable="false"
      :bodyStyle="{ paddingTop: '16px', paddingBottom: '8px' }"
      @ok="applyVariableSelection"
      @cancel="closeVariableSelector"
    >
      <a-form layout="vertical" class="variable-selector-form">
        <a-form-item label="变量类型">
          <a-radio-group v-model:value="variableSelectorForm.nodeId" button-style="solid">
            <a-radio-button
              v-for="option in VARIABLE_NODE_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="变量键名">
          <a-input
            v-model:value="variableSelectorForm.key"
            placeholder="输入或选择变量键名"
            allow-clear
          />
        </a-form-item>

        <a-form-item v-if="variableKeyOptions.length" label="推荐变量" style="margin-bottom: 0">
          <div class="variable-suggestions">
            <a-tag
              v-for="suggestion in variableKeyOptions"
              :key="suggestion.value"
              :color="suggestion.value === variableSelectorForm.key ? 'blue' : 'default'"
              class="suggestion-tag"
              @click="selectVariableSuggestion(suggestion.value)"
            >
              {{ suggestion.label || suggestion.value }}
            </a-tag>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
  import { message, Checkbox as ACheckbox } from 'ant-design-vue'
  import {
    SendOutlined,
    EditOutlined,
    RobotOutlined,
    SettingOutlined,
    PlusOutlined,
    DeleteOutlined,
    InfoCircleOutlined,
    UserOutlined,
    FileTextOutlined,
    NumberOutlined,
    CheckOutlined,
  } from '@ant-design/icons-vue'
  import cloneDeep from 'lodash-es/cloneDeep'
  import ConfigSection from './ConfigSection.vue'
  import AgentTestPanel from './AgentTestPanel.vue'
  import ModelConfigModal from './ModelConfigModal.vue'
  import {
    ensureAiModelData,
    findModelByIdOrName,
    formatModelLabel,
  } from '/@/hooks/ai/useAiModelOptions'
  import type { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
  import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import type {
    AgentBudgetsConfig,
    AgentKnowledgeConfig,
    AgentMemoryConfig,
    AgentSpec,
    AgentToolBindings,
    ToolArgumentBinding,
    ToolArgumentSelector,
    UserInputVariable,
  } from '/@/api/ai/agent/AiAgentTypes'
  import { page as fetchDatasetPage, get as getDatasetById } from '/@/api/ai/dataset/AiDataSetIndex'
  import type { AiDatasetsDTO } from '/@/api/ai/dataset/AiDataSetTypes'

  interface Props {
    app: Record<string, any> | null
    agent: Record<string, any> | null
    spec: AgentSpec
    status: string
    saving: boolean
    publishing: boolean
    hasChanges: boolean
    canPublish: boolean
    blockingIssues: string[]
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'update-spec', value: AgentSpec): void
    (e: 'save-draft'): void
    (e: 'publish'): void
    (e: 'refresh'): void
    (e: 'open-test'): void
    (e: 'back'): void
  }>()

  // 常量定义
  const VARIABLE_NODE_OPTIONS = [
    { label: '系统变量', value: 'sys' },
    { label: '会话变量', value: 'conversation' },
  ]

  const RETRIEVAL_TYPE_OPTIONS = [
    { label: '向量检索', value: 'VECTOR' },
    { label: '问答检索', value: 'QA' },
    { label: '图谱检索', value: 'GRAPH' },
    { label: '混合检索', value: 'HYBRID' },
  ]

  // 工具库定义
  const TOOL_LIBRARY = [
    // {
    //   name: 'http_request',
    //   title: 'HTTP 请求',
    //   description: '调用外部API接口，获取实时数据',
    //   icon: '🌐',
    //   fields: [
    //     { field: 'url', required: true, description: '请求地址' },
    //     { field: 'method', description: 'HTTP 方法，默认 GET' },
    //     { field: 'headers', description: '请求头，JSON对象' },
    //     { field: 'body', description: '请求体，JSON内容' },
    //   ],
    // },
  ]

  const VARIABLE_SUGGESTIONS: Record<string, { value: string; label: string }[]> = {
    sys: [
      { value: 'query', label: '用户输入（query）' },
      { value: 'sessionId', label: '会话 ID（sessionId）' },
    ],
    conversation: [{ value: 'summary', label: '会话摘要（summary）' }],
  }

  const DEFAULT_KNOWLEDGE: AgentKnowledgeConfig = {
    datasetIds: [],
    retrievalTypes: [],
  }

  const DEFAULT_MEMORY: AgentMemoryConfig = {
    enabled: false,
    window: { size: null },
  }

  const DEFAULT_BUDGETS: AgentBudgetsConfig = {
    maxSteps: null,
    maxTimeMs: null,
    maxToolCalls: null,
  }

  // 响应式数据
  const localSpec = reactive<AgentSpec>(normalizeSpec(props.spec))
  const showModelModal = ref(false)
  const availableModels = ref<AiModelDTO[]>([])
  const platformMap = ref<Record<string, AiModelPlatformDTO>>({})
  const modelLoading = ref(false)
  const datasetLoading = ref(false)
  const datasetOptions = ref<{ label: string; value: string | number }[]>([])
  const variableSelectorVisible = ref(false)
  const variableSelectorContext = reactive({ tool: '', field: '' })
  const variableSelectorForm = reactive({ nodeId: 'sys', key: '' })

  let syncingFromParent = false
  let isEmitting = false // 标记正在发射更新，防止循环同步

  // 计算属性
  const statusLabel = computed(() => {
    if (props.status === 'published') return '已发布'
    if (props.status === 'draft') return '草稿'
    return props.status || '未发布'
  })

  const statusColor = computed(() => {
    if (props.status === 'published') return 'success'
    if (props.status === 'draft') return 'warning'
    return 'default'
  })

  const temperatureProxy = computed({
    get: () => localSpec.temperature ?? 0.7,
    set: (value: number) => {
      localSpec.temperature = Number(value.toFixed(2))
    },
  })

  const knowledgeEnabled = computed({
    get: () => !!localSpec.knowledge,
    set: (value: boolean) => {
      if (value) {
        localSpec.knowledge = cloneDeep(DEFAULT_KNOWLEDGE)
      } else {
        localSpec.knowledge = null
        const index = localSpec.tools.indexOf('knowledge_search')
        if (index > -1) {
          localSpec.tools.splice(index, 1)
        }
      }
    },
  })

  const memoryEnabled = computed({
    get: () => localSpec.memory?.enabled ?? false,
    set: (value: boolean) => {
      if (!localSpec.memory) {
        localSpec.memory = cloneDeep(DEFAULT_MEMORY)
      }
      localSpec.memory.enabled = value
      if (value && !localSpec.memory.window) {
        localSpec.memory.window = { size: null }
      }
    },
  })

  const availableTools = computed(() => {
    return TOOL_LIBRARY
  })

  const enabledNonKnowledgeTools = computed(() => {
    return localSpec.tools.filter((tool) => tool !== 'knowledge_search')
  })

  const modelSelectOptions = computed(() => {
    if (!availableModels.value.length) return []
    return availableModels.value
      .filter((model) => {
        if (model.enable !== undefined && model.enable !== null && String(model.enable) !== '1') {
          return false
        }
        return true
      })
      .map((model) => ({
        label: formatModelLabel(model, platformMap.value, model.id as string),
        value: String(model.id),
      }))
  })

  const modelDisplay = computed(() => {
    if (!localSpec.modelId) return '未选择模型'
    const modelId = normalizeId(localSpec.modelId)
    const model = availableModels.value.find((m) => normalizeId(m.id) === modelId)
    if (model) {
      return formatModelLabel(model, platformMap.value, modelId)
    }
    return `模型 #${modelId}`
  })

  const strategyDescription = computed(() => {
    const type = localSpec.strategy?.type
    if (type === 'react') return 'React：按需感知、推理与行动，适合大多数场景'
    if (type === 'plan_execute') return '计划执行：先规划后执行，适用于复杂任务'
    return ''
  })

  const variableKeyOptions = computed(() => {
    const nodeId = variableSelectorForm.nodeId || 'sys'
    const defaults = VARIABLE_SUGGESTIONS[nodeId] || []
    return defaults
  })

  const blockingIssues = computed(() => {
    const issues: string[] = []

    if (!normalizeId(localSpec.modelId)) {
      issues.push('尚未选择模型')
    }

    enabledNonKnowledgeTools.value.forEach((tool) => {
      const meta = getToolMeta(tool)
      if (!meta?.fields) return

      const bindings = getBindings(tool)
      meta.fields
        .filter((field) => field.required)
        .forEach((field) => {
          const hasBinding = bindings.some((binding) => binding.field === field.field)
          if (!hasBinding) {
            issues.push(`${meta.title} 缺少必填字段 ${field.field} 的配置`)
          }
        })
    })

    if (memoryEnabled.value) {
      const size = localSpec.memory?.window?.size
      if (!size || size <= 0) {
        issues.push('开启会话记忆后需设置有效的记忆窗口大小')
      }
    }

    return issues
  })

  const canPublish = computed(() => {
    return !!normalizeId(localSpec.modelId)
  })

  // 工具函数
  function normalizeId(value: unknown): string {
    if (value === undefined || value === null) return ''
    return String(value)
  }

  function normalizeSpec(spec: AgentSpec): AgentSpec {
    const normalized = cloneDeep(spec || {})
    return {
      version: normalized.version ?? 'v1',
      platformId: normalizeId(normalized.platformId) || null,
      modelId: normalizeId(normalized.modelId) || null,
      temperature: normalized.temperature ?? 0.7,
      maxTokens: normalized.maxTokens ?? null,
      language: normalized.language ?? 'zh',
      systemPrompt: normalized.systemPrompt ?? '',
      strategy: {
        type: normalized.strategy?.type ?? 'react',
        params: normalized.strategy?.params ?? {},
        decorators: normalized.strategy?.decorators ?? [],
      },
      tools: Array.isArray(normalized.tools) ? [...new Set(normalized.tools)] : [],
      toolBindings: cloneToolBindings(normalized.toolBindings),
      userInputs: Array.isArray(normalized.userInputs)
        ? normalized.userInputs.map((input) => ({
            name: input.name || '',
            displayName: input.displayName || '',
            dataType: input.dataType || 'string',
            required: !!input.required,
            description: input.description || '',
          }))
        : [],
      knowledge: normalized.knowledge
        ? {
            ...DEFAULT_KNOWLEDGE,
            ...cloneDeep(normalized.knowledge),
            datasetIds: Array.isArray(normalized.knowledge.datasetIds)
              ? normalized.knowledge.datasetIds.map((id) => normalizeId(id)).filter(Boolean)
              : [],
          }
        : null,
      memory: normalized.memory
        ? {
            enabled: normalized.memory.enabled ?? false,
            window: { size: normalized.memory.window?.size ?? null },
          }
        : cloneDeep(DEFAULT_MEMORY),
      budgets: normalized.budgets
        ? {
            maxSteps: normalized.budgets.maxSteps ?? null,
            maxTimeMs: normalized.budgets.maxTimeMs ?? null,
            maxToolCalls: normalized.budgets.maxToolCalls ?? null,
          }
        : cloneDeep(DEFAULT_BUDGETS),
      output: normalized.output ? { mode: normalized.output.mode ?? 'text' } : { mode: 'text' },
      extensions: normalized.extensions ?? null,
      metadata: normalized.metadata ?? null,
    } as AgentSpec
  }

  function cloneToolBindings(source?: AgentToolBindings | null): AgentToolBindings {
    const target: AgentToolBindings = {}
    if (!source) return target
    Object.keys(source).forEach((tool) => {
      const bindings = source[tool]
      if (!Array.isArray(bindings)) return
      target[tool] = bindings.map((binding) => ({
        field: binding.field ?? '',
        override: binding.override ?? false,
        selector: binding.selector
          ? { nodeId: binding.selector.nodeId, key: binding.selector.key }
          : undefined,
        constant:
          binding.constant !== undefined && binding.constant !== null
            ? cloneDeep(binding.constant)
            : undefined,
      }))
    })
    return target
  }

  function getToolMeta(name: string) {
    return TOOL_LIBRARY.find((tool) => tool.name === name)
  }

  function isToolEnabled(toolName: string) {
    return localSpec.tools.includes(toolName)
  }

  function toggleTool(toolName: string) {
    const index = localSpec.tools.indexOf(toolName)
    if (index > -1) {
      localSpec.tools.splice(index, 1)
      if (localSpec.toolBindings && localSpec.toolBindings[toolName]) {
        delete localSpec.toolBindings[toolName]
      }
    } else {
      localSpec.tools.push(toolName)
      ensureToolFieldBindings(toolName)
    }
  }

  function ensureToolBindings(): AgentToolBindings {
    if (!localSpec.toolBindings) {
      localSpec.toolBindings = {}
    }
    return localSpec.toolBindings
  }

  function getBindings(tool: string): ToolArgumentBinding[] {
    const bindings = ensureToolBindings()[tool]
    if (!bindings) {
      ensureToolBindings()[tool] = []
      return ensureToolBindings()[tool]
    }
    return bindings
  }

  function ensureFieldBinding(tool: string, field: string): ToolArgumentBinding {
    const bindings = getBindings(tool)
    let binding = bindings.find((item) => item.field === field)
    if (!binding) {
      binding = {
        field,
        override: false,
        selector: { nodeId: 'sys', key: '' },
      }
      bindings.push(binding)
    }
    return binding
  }

  function ensureToolFieldBindings(tool: string) {
    const meta = getToolMeta(tool)
    if (!meta?.fields?.length) return
    meta.fields.forEach((field) => {
      ensureFieldBinding(tool, field.field)
    })
  }

  function getFieldBindingMode(tool: string, field: string): 'selector' | 'constant' {
    const binding = ensureFieldBinding(tool, field)
    return binding.selector ? 'selector' : 'constant'
  }

  function changeFieldBindingMode(tool: string, field: string, mode: 'selector' | 'constant') {
    const binding = ensureFieldBinding(tool, field)
    if (mode === 'selector') {
      binding.selector = binding.selector ?? ({ nodeId: 'sys', key: '' } as ToolArgumentSelector)
      binding.constant = undefined
    } else {
      binding.constant = binding.constant ?? ''
      binding.selector = undefined
    }
  }

  function getBindingSelector(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    return binding.selector
  }

  function getBindingConstant(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    return binding.constant
  }

  function formatSelectorLabel(selector?: ToolArgumentSelector | null) {
    if (!selector || !selector.nodeId) return '未选择变量'
    const nodeLabel =
      VARIABLE_NODE_OPTIONS.find((o) => o.value === selector.nodeId)?.label || selector.nodeId
    const keyLabel = selector.key ? String(selector.key).trim() : '未指定键'
    return `${nodeLabel} · ${keyLabel}`
  }

  function formatConstant(value: unknown): string {
    if (value === undefined || value === null) return ''
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value, null, 2)
    } catch (error) {
      return String(value)
    }
  }

  function setFieldConstant(tool: string, field: string, raw: string) {
    const binding = ensureFieldBinding(tool, field)
    const trimmed = raw.trim()

    if (!trimmed) {
      binding.constant = ''
      return
    }

    try {
      if (trimmed === 'true' || trimmed === 'false') {
        binding.constant = trimmed === 'true'
      } else if (trimmed === 'null') {
        binding.constant = null
      } else if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        binding.constant = Number(trimmed)
      } else if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        binding.constant = JSON.parse(trimmed)
      } else {
        binding.constant = raw
      }
    } catch (error) {
      binding.constant = raw
    }
  }

  function openFieldVariableSelector(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    variableSelectorContext.tool = tool
    variableSelectorContext.field = field
    variableSelectorForm.nodeId = binding.selector?.nodeId || 'sys'
    variableSelectorForm.key = binding.selector?.key || ''
    variableSelectorVisible.value = true
  }

  function closeVariableSelector() {
    variableSelectorVisible.value = false
    variableSelectorContext.tool = ''
    variableSelectorContext.field = ''
  }

  function selectVariableSuggestion(value: string) {
    variableSelectorForm.key = value
  }

  function applyVariableSelection() {
    const { tool, field } = variableSelectorContext
    if (!tool || !field) {
      closeVariableSelector()
      return
    }

    const key = (variableSelectorForm.key || '').trim()
    if (!key) {
      message.warning('请选择或输入变量键名')
      return
    }

    const binding = ensureFieldBinding(tool, field)
    binding.selector = {
      nodeId: variableSelectorForm.nodeId,
      key,
    }

    closeVariableSelector()
  }

  function addUserInput() {
    if (!Array.isArray(localSpec.userInputs)) {
      localSpec.userInputs = []
    }
    const newInput: UserInputVariable = {
      name: '',
      displayName: '',
      dataType: 'string',
      required: false,
      description: '',
    }
    localSpec.userInputs.push(newInput)
  }

  function removeUserInput(index: number) {
    if (!localSpec.userInputs) return
    localSpec.userInputs.splice(index, 1)
  }

  function validateVariableName(input: UserInputVariable, index: number) {
    const name = (input.name || '').trim()

    if (!name) {
      return
    }

    // 验证格式：字母开头，仅字母数字下划线
    const namePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/
    if (!namePattern.test(name)) {
      message.warning(
        `变量 ${index + 1} 的名称格式不正确，必须以字母开头，仅包含字母、数字、下划线`,
      )
      return
    }

    // 验证唯一性
    const duplicateIndex = localSpec.userInputs?.findIndex(
      (item, idx) => idx !== index && item.name === name,
    )
    if (duplicateIndex !== undefined && duplicateIndex !== -1) {
      message.warning(`变量名称 "${name}" 已存在，请使用不同的名称`)
      input.name = ''
    }
  }

  function handleModelChange(value: string | undefined | null) {
    if (!value) {
      localSpec.modelId = null
      localSpec.platformId = null
      return
    }

    const match = findModelByIdOrName(availableModels.value, value)
    if (match) {
      localSpec.modelId = normalizeId(match.id)
      localSpec.platformId = normalizeId(match.platform)
    } else {
      localSpec.modelId = normalizeId(value)
      localSpec.platformId = null
    }
  }

  function handleModelConfigChange() {
    const modelId = localSpec.modelId
    if (modelId) {
      const match = findModelByIdOrName(availableModels.value, modelId)
      if (match) {
        localSpec.platformId = normalizeId(match.platform)
      }
    }
  }

  async function loadModels() {
    if (availableModels.value.length && Object.keys(platformMap.value).length) {
      return
    }
    if (modelLoading.value) return

    modelLoading.value = true
    try {
      const { models, platformMap: map } = await ensureAiModelData()
      availableModels.value = models
      platformMap.value = map
    } catch (error) {
      message.error('加载模型列表失败')
    } finally {
      modelLoading.value = false
    }
  }

  async function loadDatasets() {
    const knowledgeDatasetIds = localSpec.knowledge?.datasetIds
    const selectedIds = Array.isArray(knowledgeDatasetIds)
      ? knowledgeDatasetIds.map((id) => normalizeId(id)).filter(Boolean)
      : []

    const hasMissingSelected = selectedIds.some(
      (id) => !datasetOptions.value.some((option) => option.value === id),
    )

    if (datasetOptions.value.length > 0 && !hasMissingSelected) {
      return
    }

    if (datasetLoading.value) return
    datasetLoading.value = true

    try {
      const datasetMap = new Map<string, AiDatasetsDTO>()

      datasetOptions.value.forEach((option) => {
        const existingDataset = {
          id: option.value,
          name: option.label,
        } as AiDatasetsDTO
        datasetMap.set(String(option.value), existingDataset)
      })

      const res = await fetchDatasetPage({ current: 1, size: 200 })
      const records: AiDatasetsDTO[] = Array.isArray(res?.records) ? res.records : []
      records.forEach((dataset) => {
        if (dataset && dataset.id) {
          datasetMap.set(String(dataset.id), dataset)
        }
      })

      const missingAfterPage = selectedIds.filter((id) => !datasetMap.has(id))

      if (missingAfterPage.length > 0) {
        const extraDatasets = await Promise.all(
          missingAfterPage.map(async (id) => {
            try {
              return await getDatasetById(id)
            } catch (error) {
              console.warn('加载数据集详情失败:', id, error)
              return null
            }
          }),
        )

        extraDatasets.filter(Boolean).forEach((dataset) => {
          if (dataset && dataset.id) {
            datasetMap.set(String(dataset.id), dataset)
          }
        })
      }

      datasetOptions.value = Array.from(datasetMap.values()).map((dataset) => ({
        label: dataset.name || `数据集 ${dataset.id}`,
        value: normalizeId(dataset.id),
      }))
    } catch (error) {
      message.error('加载数据集失败')
    } finally {
      datasetLoading.value = false
    }
  }

  function sanitizeSpec(spec: AgentSpec): AgentSpec {
    const sanitized = cloneDeep(spec)

    sanitized.platformId = normalizeId(sanitized.platformId) || null
    sanitized.modelId = normalizeId(sanitized.modelId) || null
    sanitized.temperature = sanitized.temperature ?? 0.7
    if (sanitized.temperature < 0) sanitized.temperature = 0
    if (sanitized.temperature > 1) sanitized.temperature = 1

    sanitized.tools = Array.from(new Set(sanitized.tools || [])).filter(Boolean)

    if (sanitized.userInputs) {
      sanitized.userInputs = sanitized.userInputs
        .filter((input) => {
          // 必须有变量名且格式正确
          const name = (input.name || '').trim()
          if (!name) return false
          const namePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/
          return namePattern.test(name)
        })
        .map((input) => ({
          name: (input.name || '').trim(),
          displayName: (input.displayName || '').trim(),
          dataType: input.dataType || 'string',
          required: !!input.required,
          description: (input.description || '').trim(),
        }))
    }

    if (sanitized.toolBindings) {
      Object.keys(sanitized.toolBindings).forEach((tool) => {
        const bindings = sanitized.toolBindings![tool]
        if (!Array.isArray(bindings) || !bindings.length) {
          delete sanitized.toolBindings![tool]
          return
        }

        const normalizedBindings = bindings.map((binding) => {
          const key = binding.selector?.key ? String(binding.selector.key).trim() : ''
          const normalizedSelector = binding.selector?.nodeId
            ? {
                nodeId: normalizeId(binding.selector.nodeId),
                key,
              }
            : undefined

          return {
            field: binding.field ?? '',
            override: !!binding.override,
            selector: normalizedSelector,
            constant: binding.constant,
          }
        })

        const filtered = normalizedBindings.filter((binding) => binding.field)

        if (!filtered.length) {
          delete sanitized.toolBindings![tool]
        } else {
          sanitized.toolBindings![tool] = filtered
        }
      })

      if (!Object.keys(sanitized.toolBindings).length) {
        sanitized.toolBindings = undefined
      }
    }

    if (sanitized.knowledge) {
      sanitized.knowledge.datasetIds = Array.isArray(sanitized.knowledge.datasetIds)
        ? sanitized.knowledge.datasetIds.map((id) => normalizeId(id)).filter((id) => id)
        : []
      sanitized.knowledge.retrievalTypes = Array.isArray(sanitized.knowledge.retrievalTypes)
        ? sanitized.knowledge.retrievalTypes.map((type) => String(type).toUpperCase())
        : []
    }

    if (sanitized.memory) {
      if (!sanitized.memory.enabled) {
        sanitized.memory = { enabled: false, window: { size: null } }
      } else {
        sanitized.memory.window = sanitized.memory.window ?? { size: null }
      }
    }

    if (sanitized.budgets) {
      sanitized.budgets.maxSteps = sanitized.budgets.maxSteps ?? null
      sanitized.budgets.maxToolCalls = sanitized.budgets.maxToolCalls ?? null
      sanitized.budgets.maxTimeMs = sanitized.budgets.maxTimeMs ?? null
    } else {
      sanitized.budgets = cloneDeep(DEFAULT_BUDGETS)
    }

    return sanitized
  }

  function syncFromProps(spec: AgentSpec) {
    const normalized = normalizeSpec(spec)

    localSpec.version = normalized.version
    localSpec.platformId = normalized.platformId
    localSpec.modelId = normalized.modelId
    localSpec.temperature = normalized.temperature
    localSpec.maxTokens = normalized.maxTokens
    localSpec.language = normalized.language
    localSpec.systemPrompt = normalized.systemPrompt

    localSpec.strategy.type = normalized.strategy.type
    localSpec.strategy.params = normalized.strategy.params ?? {}
    localSpec.strategy.decorators = normalized.strategy.decorators ?? []

    localSpec.tools = [...normalized.tools]
    localSpec.toolBindings = cloneToolBindings(normalized.toolBindings)

    localSpec.userInputs = Array.isArray(normalized.userInputs)
      ? normalized.userInputs.map((input) => ({ ...input }))
      : []

    localSpec.knowledge = normalized.knowledge
      ? { ...DEFAULT_KNOWLEDGE, ...cloneDeep(normalized.knowledge) }
      : null

    localSpec.memory = normalized.memory
      ? {
          enabled: normalized.memory.enabled ?? false,
          window: { size: normalized.memory.window?.size ?? null },
        }
      : cloneDeep(DEFAULT_MEMORY)

    localSpec.budgets = normalized.budgets
      ? {
          maxSteps: normalized.budgets.maxSteps ?? null,
          maxTimeMs: normalized.budgets.maxTimeMs ?? null,
          maxToolCalls: normalized.budgets.maxToolCalls ?? null,
        }
      : cloneDeep(DEFAULT_BUDGETS)

    localSpec.output = normalized.output
      ? { mode: normalized.output.mode ?? 'text' }
      : { mode: 'text' }

    localSpec.extensions = normalized.extensions ?? null
    localSpec.metadata = normalized.metadata ?? null
  }

  // 监听器
  watch(
    () => showModelModal.value,
    (value) => {
      if (value) {
        loadModels()
      }
    },
  )

  watch(
    () => props.spec,
    (value) => {
      if (!value) return

      // 如果正在发射更新，跳过同步（这是我们自己的更新）
      if (isEmitting) {
        return
      }

      syncingFromParent = true
      syncFromProps(value)
      if (localSpec.knowledge) {
        loadDatasets()
      }
      nextTick(() => {
        syncingFromParent = false
      })
    },
    { deep: true, immediate: true },
  )

  watch(
    localSpec,
    () => {
      if (syncingFromParent) return

      // 设置发射标志，防止循环
      isEmitting = true
      const sanitized = sanitizeSpec(cloneDeep(localSpec))
      emit('update-spec', sanitized)

      // 在下一个 tick 后重置标志
      nextTick(() => {
        isEmitting = false
      })
    },
    { deep: true },
  )

  // 生命周期
  onMounted(() => {
    loadModels()
    if (localSpec.knowledge) {
      loadDatasets()
    }
  })
</script>

<style scoped>
  .agent-spec-editor-v2 {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f7fa;
    overflow: hidden;
  }

  /* 顶部工具栏 - Dify 风格 */
  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 60px;
    background: #ffffff;
    border-bottom: 1px solid #eaecf0;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .back-btn {
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    border: 1px solid transparent;
    min-width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .back-btn:hover {
    color: #111827;
    background: #f3f4f6;
    border-color: #e5e7eb;
  }

  .back-btn .anticon {
    font-size: 16px;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: #e5e7eb;
  }

  .app-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .app-name {
    font-size: 15px;
    font-weight: 600;
    color: #101828;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
  }

  .status-tag {
    margin: 0;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .toolbar-center {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .model-meta {
    font-size: 12px;
    color: #6b7280;
    margin-left: 4px;
    padding-left: 6px;
    border-left: 1px solid #e5e7eb;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: flex-end;
  }

  .toolbar-right .ant-btn {
    height: 34px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .toolbar-right .ant-btn:hover {
    transform: translateY(-1px);
  }

  .toolbar-right .ant-btn-primary {
    background: #155eef;
    border-color: #155eef;
    box-shadow: 0 1px 2px rgba(21, 94, 239, 0.2);
  }

  .toolbar-right .ant-btn-primary:hover {
    background: #1849e0;
    border-color: #1849e0;
    box-shadow: 0 2px 4px rgba(21, 94, 239, 0.3);
  }

  /* 主内容区 */
  .editor-content {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #f5f7fa;
    overflow: hidden;
  }

  /* 左侧配置区 - Dify 风格 */
  .config-panel {
    position: absolute;
    top: 0;
    left: 0;
    right: 50%;
    bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
    background: #f9fafb;
    border-right: 1px solid #eaecf0;
    z-index: 1;
    padding: 0 20px 20px 20px;
  }

  .config-alert {
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .config-sections {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 16px;
  }

  .section-form {
    margin-top: 0;
  }

  .field-hint {
    margin-top: 4px;
    font-size: 12px;
    color: #475467;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hint-icon {
    font-size: 13px;
    color: #98a2b3;
  }

  .temperature-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .temp-value {
    font-size: 24px;
    font-weight: 600;
    color: #1890ff;
  }

  .temp-desc {
    font-size: 13px;
    color: #6b7280;
  }

  /* 知识库配置 */
  .knowledge-config {
    display: flex;
    flex-direction: column;
  }

  .config-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .toggle-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toggle-title {
    font-weight: 500;
    color: #101828;
    font-size: 14px;
  }

  .toggle-desc {
    font-size: 12px;
    color: #475467;
  }

  /* 工具配置 */
  .tools-config {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tools-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tool-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border: 1px solid #eaecf0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }

  .tool-item:hover {
    border-color: #155eef;
    background: #f5f9ff;
    box-shadow: 0 2px 4px rgba(16, 24, 40, 0.06);
  }

  .tool-item.active {
    border-color: #155eef;
    background: #eff8ff;
    box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.1);
  }

  .tool-main {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .tool-icon {
    font-size: 20px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f2f4f7;
    border-radius: 8px;
  }

  .tool-info {
    flex: 1;
  }

  .tool-name {
    font-weight: 500;
    color: #101828;
    font-size: 14px;
  }

  .tool-desc {
    font-size: 12px;
    color: #475467;
    margin-top: 2px;
  }

  .tool-params {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tool-param-card {
    padding: 16px 18px;
    background: #f9fafb;
    border: 1px solid #eaecf0;
    border-radius: 10px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  }

  .param-header {
    margin-bottom: 12px;
    font-size: 14px;
  }

  .param-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .param-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field-label {
    font-weight: 500;
    font-size: 13px;
    color: #344054;
  }

  .field-label .required {
    color: #f04438;
    margin-left: 2px;
  }

  .field-desc {
    font-size: 12px;
    color: #475467;
  }

  .field-input {
    margin-top: 4px;
  }

  .label-with-switch {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  /* 用户输入变量配置 */
  .user-inputs-config {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .config-desc {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: #eff8ff;
    border-radius: 10px;
    border: 1px solid #b2ddff;

    .desc-icon {
      font-size: 18px;
      flex-shrink: 0;
      margin-top: 2px;
      color: #155eef;
    }

    .desc-content {
      flex: 1;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      line-height: 1.6;
    }

    .desc-text {
      font-size: 13px;
      color: #475467;
    }

    .desc-code {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      background: #ffffff;
      border: 1px solid #d0d5dd;
      border-radius: 6px;
      font-family: 'JetBrains Mono', 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      font-weight: 500;
      color: #155eef;
    }
  }

  .user-inputs-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .user-input-item {
    padding: 20px;
    background: #ffffff;
    border: 1px solid #eaecf0;
    border-radius: 12px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);

    &:hover {
      border-color: #155eef;
      background: #f5f9ff;
      box-shadow: 0 4px 12px rgba(21, 94, 239, 0.08);
    }
  }

  .input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #eaecf0;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .input-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #155eef;
      color: white;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
    }

    .input-title {
      font-weight: 600;
      font-size: 14px;
      color: #101828;
    }

    .required-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      background: #f04438;
      color: white;
      font-size: 11px;
      font-weight: 500;
      border-radius: 4px;
    }

    .delete-btn {
      color: #f04438;
      font-weight: 500;
      border-radius: 6px;
      padding: 4px 10px;
      transition: all 0.2s ease;

      &:hover {
        background: #fef3f2;
        color: #d92d20;
      }

      :deep(.anticon) {
        font-size: 14px;
      }
    }
  }

  .input-form {
    margin: 0;

    .ant-row {
      margin-bottom: 4px;
    }
  }

  .form-item-enhanced {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    :deep(.ant-form-item-label) {
      padding-bottom: 6px;

      > label {
        font-size: 13px;
        font-weight: 500;
        color: #344054;
        letter-spacing: 0.1px;

        &::before {
          display: none !important;
        }
      }
    }
  }

  .enhanced-input,
  .enhanced-select,
  .enhanced-textarea {
    border-radius: 8px;
    border: 1px solid #d0d5dd;
    transition: all 0.2s ease;
    font-size: 13px;

    &:hover {
      border-color: #98a2b3;
    }

    &:focus,
    &:focus-within {
      border-color: #155eef;
      box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.1);
    }

    :deep(.ant-input),
    :deep(.ant-select-selector),
    :deep(textarea) {
      border: none !important;
      box-shadow: none !important;
      font-size: 13px;
    }

    :deep(.ant-input-affix-wrapper) {
      border: none;
      box-shadow: none;
    }
  }

  .input-prefix {
    font-size: 14px;
    color: #98a2b3;
    margin-right: 4px;
  }

  .input-prefix-icon {
    font-size: 14px;
    color: #98a2b3;
  }

  .option-content {
    display: flex;
    align-items: center;
    gap: 8px;

    .option-icon {
      font-size: 14px;
      color: #475467;
    }
  }

  .checkbox-item {
    :deep(.ant-form-item-control-input) {
      min-height: 38px;
      display: flex;
      align-items: center;
    }
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #eaecf0;
    transition: all 0.2s ease;

    &:hover {
      background: #f5f9ff;
      border-color: #155eef;
    }
  }

  .enhanced-checkbox {
    :deep(.ant-checkbox) {
      transform: scale(1.1);
    }

    :deep(.ant-checkbox-checked .ant-checkbox-inner) {
      background: #155eef;
      border-color: #155eef;
    }

    .checkbox-label {
      font-size: 13px;
      font-weight: 500;
      color: #344054;
      margin-left: 4px;
    }
  }

  .field-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 12px;
    color: #8c8c8c;
    line-height: 1.5;

    .hint-icon {
      font-size: 14px;
    }
  }

  .enhanced-textarea {
    :deep(textarea) {
      resize: none;
      line-height: 1.6;
    }

    :deep(.ant-input-textarea-show-count::after) {
      font-size: 11px;
      color: #bfbfbf;
    }
  }

  .add-input-btn {
    border-radius: 10px;
    height: 48px;
    font-weight: 600;
    font-size: 14px;
    color: #1890ff;
    border: 2px dashed #91caff;
    background: linear-gradient(135deg, #ffffff 0%, #f9fcff 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(24, 144, 255, 0.06);

    &:hover {
      color: #40a9ff;
      border-color: #40a9ff;
      border-style: solid;
      background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
      transform: translateY(-2px);
    }

    :deep(.anticon) {
      font-size: 16px;
    }
  }

  /* 右侧调试面板 */
  .debug-panel {
    position: absolute;
    top: 0;
    left: 50%;
    right: 0;
    bottom: 0;
    background: #ffffff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  .debug-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }

  .placeholder-content {
    text-align: center;
  }

  .placeholder-icon {
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 12px;
  }

  .placeholder-title {
    font-size: 15px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 6px 0;
  }

  .placeholder-desc {
    font-size: 13px;
    color: #9ca3af;
    margin: 0;
  }

  /* 变量选择器弹窗样式 */
  .variable-selector-form {
    margin: 0;
  }

  .variable-selector-form .ant-form-item {
    margin-bottom: 12px;
  }

  .variable-selector-form .ant-form-item-label {
    padding-bottom: 2px;
  }

  .variable-selector-form .ant-form-item-label > label {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
  }

  .variable-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .suggestion-tag {
    cursor: pointer;
    transition: all 0.2s;
  }

  .suggestion-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  /* 响应式 */
  @media (max-width: 1400px) {
    .editor-content {
      grid-template-columns: 45% 55%;
    }
  }

  @media (max-width: 1200px) {
    .editor-content {
      grid-template-columns: 40% 60%;
    }

    .model-meta {
      display: none;
    }
  }

  @media (max-width: 992px) {
    .editor-toolbar {
      padding: 0 16px;
      height: 56px;
    }

    .toolbar-left {
      gap: 12px;
    }

    .divider {
      display: none;
    }

    .app-name {
      font-size: 14px;
    }

    .model-config-btn {
      height: 32px;
      padding: 0 12px;
    }

    .model-label {
      font-size: 13px;
    }

    .editor-content {
      grid-template-columns: 1fr;
    }

    .debug-panel {
      display: none;
    }
  }
</style>
