<template>
  <div class="agent-spec-editor">
    <div class="editor-action-bar" :class="{ 'is-collapsed': !actionsExpanded }">
      <Transition name="action-panel">
        <div v-if="actionsExpanded" class="action-content">
          <div class="status-block">
            <a-tag :color="statusColor">{{ statusLabel }}</a-tag>
            <span class="status-tip">{{ statusDescription }}</span>
          </div>
          <div class="action-cluster">
            <div class="action-group ghost">
              <a-tooltip title="保存草稿不会影响已发布版本" placement="bottom">
                <a-button
                  class="pill-btn outline"
                  :disabled="!hasChanges || !!blockingIssues.length"
                  :loading="saving"
                  @click="$emit('save-draft')"
                >
                  保存草稿
                </a-button>
              </a-tooltip>
            </div>
            <div class="action-group cta">
              <a-tooltip :title="publishTooltip" placement="bottom">
                <a-button
                  class="pill-btn filled"
                  :disabled="!canPublish || !!blockingIssues.length"
                  :loading="publishing"
                  type="primary"
                  @click="$emit('publish')"
                >
                  <template #icon>
                    <SendOutlined />
                  </template>
                  发布上线
                </a-button>
              </a-tooltip>
              <a-button
                class="pill-btn primary"
                type="default"
                :disabled="!agent?.id"
                @click="$emit('open-test')"
              >
                <template #icon>
                  <ExperimentOutlined />
                </template>
                实时调试
              </a-button>
            </div>
          </div>
        </div>
      </Transition>
      <a-button
        v-if="!hasChanges"
        class="collapse-toggle"
        type="text"
        shape="circle"
        size="small"
        @click="toggleActionPanel"
      >
        <component :is="actionsExpanded ? MenuFoldOutlined : MenuUnfoldOutlined" />
      </a-button>
    </div>

    <a-alert
      v-if="blockingIssues.length"
      :message="blockingIssues.join('；')"
      banner
      type="warning"
      show-icon
      class="blocking-alert"
    />

    <a-card :bordered="false" class="spec-summary-card">
      <div class="summary-content">
        <div class="summary-main">
          <div class="summary-title">实时配置概览</div>
          <div class="summary-hint">聚焦最关键的参数组合，帮助你快速确认当前草稿状态。</div>
        </div>
        <div class="summary-grid">
          <div v-for="item in summaryItems" :key="item.label" class="summary-item">
            <div class="item-label">{{ item.label }}</div>
            <div class="item-value">{{ item.value }}</div>
          </div>
        </div>
      </div>
    </a-card>

    <a-tabs v-model:activeKey="activeTab" class="editor-tabs">
      <a-tab-pane key="base" tab="基础配置">
        <div class="tab-pane">
          <a-card :bordered="false" class="editor-card" title="模型与提示词">
            <a-form layout="vertical" class="section-form">
              <div class="model-row">
                <a-form-item class="model-field" label="模型">
                  <a-select
                    v-model:value="localSpec.modelId"
                    :loading="modelLoading"
                    :options="modelSelectOptions"
                    allow-clear
                    placeholder="选择模型"
                    show-search
                    option-filter-prop="label"
                    @dropdownVisibleChange="(open) => open && loadModels()"
                    @change="handleModelChange"
                  />
                </a-form-item>
                <a-form-item class="token-field" label="最大输出 Tokens">
                  <a-input-number
                    v-model:value="localSpec.maxTokens"
                    :min="1"
                    :precision="0"
                    placeholder="留空使用模型默认值"
                    style="width: 100%"
                  />
                </a-form-item>
                <a-form-item class="temperature-field" label="采样温度">
                  <div class="temperature-control temperature-inline">
                    <a-slider
                      v-model:value="temperatureProxy"
                      :max="1"
                      :min="0"
                      :step="0.01"
                      :tooltip-formatter="formatTemperatureTooltip"
                    />
                  </div>
                </a-form-item>
              </div>
              <a-form-item class="system-prompt-item" label="系统提示词">
                <a-textarea
                  v-model:value="localSpec.systemPrompt"
                  :auto-size="{ minRows: 4, maxRows: 8 }"
                  placeholder="为Agent设定角色与行为指引"
                  show-count
                  :maxlength="1200"
                />
              </a-form-item>
            </a-form>
          </a-card>

          <a-card :bordered="false" class="editor-card" title="Agent 策略">
            <div class="strategy-options">
              <a-radio-group v-model:value="localSpec.strategy.type" button-style="solid">
                <a-radio-button value="react">React</a-radio-button>
                <a-radio-button value="plan_execute">计划执行</a-radio-button>
              </a-radio-group>
              <div class="strategy-description">
                <template v-if="localSpec.strategy.type === 'react'">
                  <strong>React</strong>：按需感知、推理与行动的通用模式，适合大多数Agent场景。
                </template>
                <template v-else-if="localSpec.strategy.type === 'plan_execute'">
                  <strong>计划执行</strong>：先规划后执行，适用于需要拆分任务、分步处理的复杂目标。
                </template>
                <template v-else>
                  <strong>路由</strong
                  >：基于路由策略在多种方案间切换，可配合自定义逻辑实现分流能力。
                </template>
              </div>
            </div>
          </a-card>
        </div>
      </a-tab-pane>

      <a-tab-pane key="tools" tab="工具与变量">
        <div class="tab-pane">
          <a-card :bordered="false" class="editor-card" title="工具配置">
            <div class="tool-selector">
              <CheckboxGroup v-model:value="localSpec.tools" :options="toolOptions" />
            </div>
            <div v-if="localSpec.tools.length" class="tool-binding-wrapper">
              <div v-for="tool in localSpec.tools" :key="tool" class="tool-binding-card">
                <div class="tool-binding-header">
                  <div>
                    <div class="tool-name">{{ getToolMeta(tool)?.title || tool }}</div>
                    <div class="tool-desc">{{ getToolMeta(tool)?.description }}</div>
                  </div>
                </div>

                <div v-if="getToolMeta(tool)?.fields?.length" class="tool-binding-grid">
                  <div
                    v-for="field in getToolMeta(tool)?.fields"
                    :key="field.field"
                    class="tool-binding-field"
                  >
                    <div class="field-meta">
                      <div class="field-name">
                        {{ field.field }}
                        <span v-if="field.required" class="required-tag">必填</span>
                      </div>
                      <div class="field-desc">{{ field.description }}</div>
                    </div>

                    <div class="field-control">
                      <a-radio-group
                        :value="getFieldBindingMode(tool, field.field)"
                        @change="(e) => changeFieldBindingMode(tool, field.field, e.target.value)"
                      >
                        <a-radio value="selector">变量</a-radio>
                        <a-radio value="constant">固定值</a-radio>
                      </a-radio-group>

                      <div
                        v-if="getFieldBindingMode(tool, field.field) === 'selector'"
                        class="selector-row"
                      >
                        <div class="selector-display">
                          <span
                            v-if="
                              getBindingSelector(tool, field.field)?.nodeId &&
                              getBindingSelector(tool, field.field)?.key
                            "
                            class="selector-chip"
                          >
                            {{ formatSelectorLabel(getBindingSelector(tool, field.field)) }}
                          </span>
                          <span v-else class="selector-placeholder">未选择变量</span>
                          <a-button
                            size="small"
                            type="link"
                            @click="openFieldVariableSelector(tool, field.field)"
                          >
                            选择变量
                          </a-button>
                        </div>
                      </div>

                      <div v-else class="constant-row">
                        <a-textarea
                          :value="formatConstant(getBindingConstant(tool, field.field))"
                          :auto-size="{ minRows: 1, maxRows: 3 }"
                          placeholder="输入固定值，支持 JSON 结构"
                          @change="(e) => setFieldConstant(tool, field.field, e.target.value)"
                        />
                      </div>
                    </div>

                    <div class="field-override">
                      <label>覆盖模型结果</label>
                      <a-switch
                        :checked="getBindingOverride(tool, field.field)"
                        @change="(value) => setFieldOverride(tool, field.field, value)"
                      />
                    </div>
                  </div>
                </div>

                <a-empty v-else description="该工具暂无参数" />
              </div>
            </div>
            <a-empty v-else description="请选择需要的工具" />
          </a-card>
        </div>
      </a-tab-pane>

      <a-tab-pane key="knowledge" tab="知识增强">
        <div class="tab-pane">
          <a-card :bordered="false" class="editor-card" title="知识库增强">
            <div class="knowledge-header">
              <div class="header-copy">
                <div class="header-title">启用知识检索</div>
                <div class="header-subtitle">通过召回高质量片段，为模型实时补充上下文。</div>
              </div>
              <a-switch v-model:checked="knowledgeEnabled" />
            </div>
            <template v-if="knowledgeEnabled">
              <div class="knowledge-settings">
                <div class="knowledge-row">
                  <div class="setting-field">
                    <label>关联数据集</label>
                    <a-select
                      v-model:value="localSpec.knowledge!.datasetIds"
                      :loading="datasetLoading"
                      allow-clear
                      mode="multiple"
                      placeholder="选择可检索的数据集"
                      style="width: 100%"
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
                    <p class="field-hint">支持多选，可组合不同来源的专业知识。</p>
                  </div>
                  <div class="setting-field">
                    <label>检索策略</label>
                    <a-select
                      v-model:value="localSpec.knowledge!.retrievalTypes"
                      :options="RETRIEVAL_TYPE_OPTIONS"
                      option-label-prop="label"
                      allow-clear
                      mode="multiple"
                      placeholder="选择检索方式"
                      style="width: 100%"
                    />
                    <p class="field-hint">结合召回 + 重排提升命中率，可按需求灵活搭配。</p>
                  </div>
                </div>
              </div>
            </template>
            <a-alert
              v-else
              message="知识检索未启用，Agent 将仅依赖模型上下文回答"
              type="info"
              show-icon
            />
          </a-card>
        </div>
      </a-tab-pane>

      <a-tab-pane key="memory" tab="记忆与预算">
        <div class="tab-pane">
          <a-card :bordered="false" class="editor-card" title="记忆与预算">
            <div class="section-grid section-grid--two">
              <div class="memory-block">
                <div class="memory-header">
                  <span class="memory-title">会话记忆</span>
                  <a-switch v-model:checked="memoryEnabled" />
                </div>
                <div v-if="memoryEnabled" class="memory-body">
                  <label>记忆窗口（轮次）</label>
                  <a-input-number
                    v-model:value="localSpec.memory!.window!.size"
                    :min="1"
                    :precision="0"
                    placeholder="例如 10"
                    style="width: 100%"
                  />
                </div>
                <p v-else class="memory-hint">关闭记忆后，Agent 仅依赖当前会话内容。</p>
              </div>
              <div class="budget-block">
                <div class="budget-title">预算控制</div>
                <div class="budget-grid">
                  <div class="budget-item">
                    <label>最大步骤数</label>
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxSteps"
                      :min="1"
                      :precision="0"
                      placeholder="限制Agent迭代次数"
                    />
                  </div>
                  <div class="budget-item">
                    <label>最大工具调用次数</label>
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxToolCalls"
                      :min="1"
                      :precision="0"
                      placeholder="限制工具调用次数"
                    />
                  </div>
                  <div class="budget-item">
                    <label>最长执行时长 (ms)</label>
                    <a-input-number
                      v-model:value="localSpec.budgets!.maxTimeMs"
                      :min="1000"
                      :step="1000"
                      :precision="0"
                      placeholder="例如 30000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </div>
      </a-tab-pane>

      <!--      <a-tab-pane key="advanced" tab="输出与高级">-->
      <!--        <div class="tab-pane">-->
      <!--          <a-card :bordered="false" class="editor-card" title="输出与高级设置">-->
      <!--            <div class="section-grid section-grid&#45;&#45;two">-->
      <!--              <a-form-item label="输出模式">-->
      <!--                <a-radio-group v-model:value="localSpec.output!.mode">-->
      <!--                  <a-radio-button value="text">文本</a-radio-button>-->
      <!--                  <a-radio-button value="structured">结构化</a-radio-button>-->
      <!--                </a-radio-group>-->
      <!--              </a-form-item>-->
      <!--            </div>-->
      <!--            <div class="advanced-grid">-->
      <!--              <div class="advanced-item">-->
      <!--                <div class="advanced-header">-->
      <!--                  <span>扩展字段 extensions</span>-->
      <!--                  <a-tag v-if="extensionsError" color="error">{{ extensionsError }}</a-tag>-->
      <!--                </div>-->
      <!--                <a-textarea-->
      <!--                  v-model:value="extensionsInput"-->
      <!--                  :auto-size="{ minRows: 4, maxRows: 12 }"-->
      <!--                  placeholder="输入 JSON 对象，为 Agent 扩展自定义配置"-->
      <!--                  @blur="commitAdvanced('extensions')"-->
      <!--                />-->
      <!--              </div>-->
      <!--              <div class="advanced-item">-->
      <!--                <div class="advanced-header">-->
      <!--                  <span>元数据 metadata</span>-->
      <!--                  <a-tag v-if="metadataError" color="error">{{ metadataError }}</a-tag>-->
      <!--                </div>-->
      <!--                <a-textarea-->
      <!--                  v-model:value="metadataInput"-->
      <!--                  :auto-size="{ minRows: 4, maxRows: 12 }"-->
      <!--                  placeholder="输入 JSON 对象，记录描述性信息"-->
      <!--                  @blur="commitAdvanced('metadata')"-->
      <!--                />-->
      <!--              </div>-->
      <!--            </div>-->
      <!--          </a-card>-->
      <!--        </div>-->
      <!--      </a-tab-pane>-->
    </a-tabs>

    <div
      v-if="variableSelectorVisible"
      class="agent-variable-selector-overlay"
      @click="closeVariableSelector"
    >
      <div class="agent-variable-selector-panel" @click.stop>
        <div class="selector-header">
          <div class="selector-title">选择变量</div>
          <a-button size="small" type="text" @click="closeVariableSelector">关闭</a-button>
        </div>

        <div class="variable-selector-body">
          <div class="selector-section">
            <div class="section-title">变量类型</div>
            <a-radio-group v-model:value="variableSelectorForm.nodeId" button-style="solid">
              <a-radio-button
                v-for="option in VARIABLE_NODE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-radio-button>
            </a-radio-group>
          </div>

          <div class="selector-section">
            <div class="section-title">变量键名</div>
            <a-input
              v-model:value="variableSelectorForm.key"
              placeholder="输入或选择变量键名"
              allow-clear
            />
            <div class="selector-hint">支持直接输入未在列表中的键名</div>
          </div>

          <div v-if="variableKeyOptions.length" class="selector-suggestion-block">
            <div class="section-title">推荐变量</div>
            <div class="suggestion-chips">
              <a-tag
                v-for="suggestion in variableKeyOptions"
                :key="suggestion.value"
                :color="suggestion.value === variableSelectorForm.key ? 'processing' : 'default'"
                @click="selectVariableSuggestion(suggestion.value)"
              >
                {{ suggestion.label || suggestion.value }}
              </a-tag>
            </div>
          </div>
        </div>

        <div class="selector-actions">
          <a-space>
            <a-button @click="closeVariableSelector">取消</a-button>
            <a-button type="primary" @click="applyVariableSelection">使用变量</a-button>
          </a-space>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
  import { message, Checkbox } from 'ant-design-vue'
  import { ExperimentOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SendOutlined } from '@ant-design/icons-vue'
  import cloneDeep from 'lodash-es/cloneDeep'
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
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    (e: 'update-spec', value: AgentSpec): void
    (e: 'save-draft'): void
    (e: 'publish'): void
    (e: 'refresh'): void
    (e: 'open-test'): void
  }>()

  const CheckboxGroup = Checkbox.Group

  const actionPanelManualExpanded = ref(false)
  const actionsExpanded = computed(() => props.hasChanges || actionPanelManualExpanded.value)

  watch(
    () => props.hasChanges,
    (value) => {
      if (value) {
        actionPanelManualExpanded.value = true
      } else {
        actionPanelManualExpanded.value = false
      }
    },
    { immediate: true },
  )

  function toggleActionPanel() {
    if (props.hasChanges && actionsExpanded.value) {
      return
    }
    actionPanelManualExpanded.value = !actionsExpanded.value
  }

  const VARIABLE_NODE_OPTIONS = [
    { label: '系统变量', value: 'sys' },
    // { label: '环境变量', value: 'env' },
    { label: '会话变量', value: 'conversation' },
    // { label: '运行入参', value: 'input' },
    // { label: '历史输出', value: 'output' },
  ]

  const RETRIEVAL_TYPE_OPTIONS = [
    { label: '向量检索', value: 'VECTOR' },
    { label: '问答检索', value: 'QA' },
    { label: '混合检索', value: 'HYBRID' },
  ]

  const TOOL_LIBRARY = [
    {
      name: 'knowledge_search',
      title: '知识检索',
      description: '从指定知识库中检索相关文档片段，强化上下文能力。',
      fields: [
        { field: 'query', required: true, description: '检索查询语句，通常绑定用户输入。' },
        { field: 'datasetIds', description: '限定检索的数据集ID列表。' },
        { field: 'retrievalTypes', description: '检索模式，例如 VECTOR/QA/HYBRID。' },
      ],
    },
    {
      name: 'http_request',
      title: 'HTTP 请求',
      description: '调用外部接口或Webhook，实现数据同步与触发操作。',
      fields: [
        { field: 'url', required: true, description: '请求地址。' },
        { field: 'method', description: 'HTTP 方法，默认 GET。' },
        { field: 'headers', description: '请求头，键值对象。' },
        { field: 'body', description: '请求体，支持JSON内容。' },
      ],
    },
  ]

  const VARIABLE_SUGGESTIONS: Record<string, { value: string; label: string }[]> = {
    sys: [
      { value: 'query', label: '用户输入（query）' },
      { value: 'sessionId', label: '会话 ID（sessionId）' },
    ],
    // env: [
    //   { value: 'appId', label: '应用 ID（appId）' },
    //   { value: 'tenantId', label: '租户 ID（tenantId）' },
    // ],
    conversation: [{ value: 'summary', label: '会话摘要（summary）' }],
    // input: [],
    // output: [],
  }

  const DEFAULT_KNOWLEDGE: AgentKnowledgeConfig = {
    datasetIds: [],
    retrievalTypes: [],
  }

  const DEFAULT_MEMORY: AgentMemoryConfig = {
    enabled: false,
    window: {
      size: null,
    },
  }

  const DEFAULT_BUDGETS: AgentBudgetsConfig = {
    maxSteps: null,
    maxTimeMs: null,
    maxToolCalls: null,
  }

  const localSpec = reactive<AgentSpec>(normalizeSpec(props.spec))
  const activeTab = ref('base')

  const availableModels = ref<AiModelDTO[]>([])
  const platformMap = ref<Record<string, AiModelPlatformDTO>>({})
  const modelLoading = ref(false)
  const datasetLoading = ref(false)
  const datasetOptions = ref<{ label: string; value: string | number }[]>([])

  const extensionsInput = ref('')
  const metadataInput = ref('')
  const extensionsError = ref('')
  const metadataError = ref('')

  const variableSelectorVisible = ref(false)
  const variableSelectorContext = reactive({ tool: '', field: '' })
  const variableSelectorForm = reactive({ nodeId: 'input', key: '' })

  let syncingFromParent = false

  const summaryItems = computed(() => {
    // 获取模型显示名称
    let modelDisplay = '未选择'
    if (localSpec.modelId) {
      const modelId = normalizeId(localSpec.modelId)
      const model = availableModels.value.find((m) => normalizeId(m.id) === modelId)
      if (model) {
        modelDisplay = formatModelLabel(model, platformMap.value, modelId)
      } else {
        modelDisplay = `#${modelId}`
      }
    }

    return [
      { label: '模型', value: modelDisplay },
      { label: '策略', value: formatStrategyLabel(localSpec.strategy?.type) },
      {
        label: '工具数量',
        value: localSpec.tools.length ? `${localSpec.tools.length} 个` : '未启用',
      },
      {
        label: '知识增强',
        value: localSpec.knowledge ? '已开启' : '未使用',
      },
    ]
  })

  function normalizeSpec(spec: AgentSpec): AgentSpec {
    const normalized = cloneDeep(spec || {})
    const clone = {
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
    }

    if (!clone.memory) {
      clone.memory = cloneDeep(DEFAULT_MEMORY)
    }
    if (!clone.memory.window) {
      clone.memory.window = { size: null }
    }
    if (!clone.budgets) {
      clone.budgets = cloneDeep(DEFAULT_BUDGETS)
    }
    if (!clone.output) {
      clone.output = { mode: 'text' }
    }

    return clone as AgentSpec
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

  function formatStrategyLabel(type?: string) {
    const map: Record<string, string> = {
      react: 'React 模式',
      plan_execute: '计划执行',
      router: '智能路由',
    }
    return map[type || ''] || '默认策略'
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

    ensureAllToolBindings()

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

    resetAdvancedInputs()
  }

  watch(
    () => props.spec,
    (value) => {
      if (!value) return
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
      emit('update-spec', sanitizeSpec(cloneDeep(localSpec)))
    },
    { deep: true },
  )

  watch(
    () => localSpec.tools.slice(),
    (tools) => {
      if (!localSpec.toolBindings) {
        localSpec.toolBindings = {}
      }

      tools.forEach((tool) => {
        ensureToolFieldBindings(tool)
      })

      Object.keys(localSpec.toolBindings).forEach((tool) => {
        if (!tools.includes(tool)) {
          delete localSpec.toolBindings![tool]
        }
      })
    },
    { deep: true },
  )

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

  const statusDescription = computed(() => {
    if (props.status === 'published') return '当前在线版本已生效'
    if (props.status === 'draft') return '草稿可继续编辑并发布'
    return '尚未发布的Agent配置'
  })

  const publishTooltip = computed(() => {
    if (!canPublish.value) {
      return '请先选择模型'
    }
    if (blockingIssues.value.length) {
      return blockingIssues.value.join('；')
    }
    return '发布当前配置'
  })

  function normalizeId(value: unknown): string {
    if (value === undefined || value === null) return ''
    return String(value)
  }

  const modelSelectOptions = computed(() => {
    if (!availableModels.value.length) return []
    const options = availableModels.value
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

    // 如果当前选中的模型不在列表中，添加回显选项
    const currentValue = normalizeId(localSpec.modelId)
    if (currentValue && !options.some((item) => item.value === currentValue)) {
      const currentModel = availableModels.value.find((m) => normalizeId(m.id) === currentValue)
      if (currentModel) {
        options.push({
          label: formatModelLabel(currentModel, platformMap.value, currentValue),
          value: currentValue,
        })
      }
    }

    return options
  })

  const nodeLabelMap = computed(() => {
    return VARIABLE_NODE_OPTIONS.reduce<Record<string, string>>((map, option) => {
      map[option.value] = option.label
      return map
    }, {})
  })

  const variableKeyOptions = computed(() => {
    const nodeId = variableSelectorForm.nodeId || 'input'
    const defaults = VARIABLE_SUGGESTIONS[nodeId] || []
    const dynamicKeys = collectVariableKeys(nodeId)
    const optionMap = new Map<string, { value: string; label: string }>()

    defaults.forEach((item) => {
      optionMap.set(item.value, { value: item.value, label: item.label })
    })

    dynamicKeys.forEach((key) => {
      if (!optionMap.has(key)) {
        optionMap.set(key, { value: key, label: key })
      }
    })

    return Array.from(optionMap.values())
  })

  const temperatureProxy = computed({
    get: () => localSpec.temperature ?? 0,
    set: (value: number) => {
      localSpec.temperature = Number(value.toFixed(2))
    },
  })

  function formatTemperatureTooltip(value?: number) {
    if (typeof value !== 'number') return ''
    return value.toFixed(2)
  }

  const toolOptions = TOOL_LIBRARY.map((tool) => ({
    label: tool.title,
    value: tool.name,
  }))

  const knowledgeEnabled = computed({
    get: () => !!localSpec.knowledge,
    set: (value: boolean) => {
      if (value) {
        localSpec.knowledge = cloneDeep(DEFAULT_KNOWLEDGE)
      } else {
        localSpec.knowledge = null
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

  const blockingIssues = computed(() => {
    const issues: string[] = []
    if (!normalizeId(localSpec.modelId)) {
      issues.push('尚未选择模型')
    }

    localSpec.tools.forEach((tool) => {
      const meta = getToolMeta(tool)
      if (!meta) return
      if (!meta.fields) return

      const bindings = getBindings(tool)
      meta.fields
        .filter((field) => field.required)
        .forEach((field) => {
          const hasBinding = bindings.some((binding) => binding.field === field.field)
          if (!hasBinding) {
            issues.push(`${meta.title} 缺少必填字段 ${field.field} 的绑定`)
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

  function getToolMeta(name: string) {
    return TOOL_LIBRARY.find((tool) => tool.name === name)
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

  function collectVariableKeys(nodeId: string): string[] {
    const bindingsMap = ensureToolBindings()
    const keys = new Set<string>()
    Object.keys(bindingsMap).forEach((tool) => {
      const bindings = bindingsMap[tool]
      if (!Array.isArray(bindings)) return
      bindings.forEach((binding) => {
        if (binding.selector?.nodeId === nodeId && binding.selector.key) {
          const key = String(binding.selector.key).trim()
          if (key) {
            keys.add(key)
          }
        }
      })
    })
    return Array.from(keys)
  }

  function getNodeLabel(nodeId: string) {
    return nodeLabelMap.value[nodeId] || nodeId
  }

  function formatSelectorLabel(selector?: ToolArgumentSelector | null) {
    if (!selector || !selector.nodeId) return '未选择变量'
    const nodeLabel = getNodeLabel(selector.nodeId)
    const keyLabel = selector.key ? String(selector.key).trim() : '未指定键'
    return `${nodeLabel} · ${keyLabel}`
  }

  function ensureFieldBinding(tool: string, field: string): ToolArgumentBinding {
    const bindings = getBindings(tool)
    let binding = bindings.find((item) => item.field === field)
    if (!binding) {
      binding = {
        field,
        override: false,
        selector: { nodeId: 'input', key: '' },
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

  function ensureAllToolBindings() {
    localSpec.tools.forEach((tool) => ensureToolFieldBindings(tool))
  }

  function getFieldBindingMode(tool: string, field: string): 'selector' | 'constant' {
    const binding = ensureFieldBinding(tool, field)
    return binding.selector ? 'selector' : 'constant'
  }

  function changeFieldBindingMode(tool: string, field: string, mode: 'selector' | 'constant') {
    const binding = ensureFieldBinding(tool, field)
    if (mode === 'selector') {
      binding.selector = binding.selector ?? ({ nodeId: 'input', key: '' } as ToolArgumentSelector)
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

  function openFieldVariableSelector(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    variableSelectorContext.tool = tool
    variableSelectorContext.field = field
    variableSelectorForm.nodeId = binding.selector?.nodeId || 'input'
    variableSelectorForm.key = binding.selector?.key || ''
    nextTick(() => {
      variableSelectorVisible.value = true
    })
  }

  function closeVariableSelector() {
    variableSelectorVisible.value = false
    variableSelectorContext.tool = ''
    variableSelectorContext.field = ''
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

  function selectVariableSuggestion(value: string) {
    variableSelectorForm.key = value
  }

  function getBindingConstant(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    return binding.constant
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
      message.warning('固定值格式无法解析，已按文本处理')
      binding.constant = raw
    }
  }

  function getBindingOverride(tool: string, field: string) {
    const binding = ensureFieldBinding(tool, field)
    return !!binding.override
  }

  function setFieldOverride(tool: string, field: string, value: boolean) {
    const binding = ensureFieldBinding(tool, field)
    binding.override = value
  }

  function formatConstant(value: unknown): string {
    if (value === undefined || value === null) return ''
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value)
    } catch (error) {
      return String(value)
    }
  }

  function handleModelChange(value: string | undefined | null) {
    if (!value) {
      localSpec.modelId = null
      localSpec.platformId = null
      return
    }

    // 查找模型对象
    const match = findModelByIdOrName(availableModels.value, value)
    if (match) {
      localSpec.modelId = normalizeId(match.id)
      localSpec.platformId = normalizeId(match.platform)
    } else {
      localSpec.modelId = normalizeId(value)
      localSpec.platformId = null
    }
  }

  function alignModelSelection() {
    const modelId = normalizeId(localSpec.modelId)
    if (modelId && !normalizeId(localSpec.platformId)) {
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

      alignModelSelection()
    } catch (error) {
      message.error('加载模型列表失败，请稍后重试')
    } finally {
      modelLoading.value = false
    }
  }

  async function loadDatasets() {
    const knowledgeDatasetIds = localSpec.knowledge?.datasetIds
    const selectedIds = Array.isArray(knowledgeDatasetIds)
      ? knowledgeDatasetIds.map((id) => normalizeId(id)).filter(Boolean)
      : []

    // 检查是否有已选ID不在当前选项中
    const hasMissingSelected = selectedIds.some(
      (id) => !datasetOptions.value.some((option) => option.value === id),
    )

    // 如果已有选项且没有缺失的已选项，则不重新加载
    if (datasetOptions.value.length > 0 && !hasMissingSelected) {
      return
    }

    if (datasetLoading.value) return
    datasetLoading.value = true

    try {
      // 使用 Map 存储数据集，避免重复
      const datasetMap = new Map<string, AiDatasetsDTO>()

      // 先添加已有的选项数据
      datasetOptions.value.forEach((option) => {
        const existingDataset = {
          id: option.value,
          name: option.label,
        } as AiDatasetsDTO
        datasetMap.set(String(option.value), existingDataset)
      })

      // 加载分页数据
      const res = await fetchDatasetPage({ current: 1, size: 200 })
      const records: AiDatasetsDTO[] = Array.isArray(res?.records) ? res.records : []
      records.forEach((dataset) => {
        if (dataset && dataset.id) {
          datasetMap.set(String(dataset.id), dataset)
        }
      })

      // 检查是否还有已选ID不在Map中
      const missingAfterPage = selectedIds.filter((id) => !datasetMap.has(id))

      // 单独加载缺失的数据集
      if (missingAfterPage.length > 0) {
        const extraDatasets = await Promise.all(
          missingAfterPage.map(async (id) => {
            try {
              const detail = await getDatasetById(id)
              return detail
            } catch (error) {
              console.warn('加载数据集详情失败:', id, error)
              return null
            }
          }),
        )

        // 将成功加载的数据集添加到Map
        extraDatasets.filter(Boolean).forEach((dataset) => {
          if (dataset && dataset.id) {
            datasetMap.set(String(dataset.id), dataset)
          }
        })
      }

      // 转换为选项列表
      datasetOptions.value = Array.from(datasetMap.values()).map((dataset) => ({
        label: dataset.name || `数据集 ${dataset.id}`,
        value: normalizeId(dataset.id),
      }))
    } catch (error) {
      console.error('加载数据集失败', error)
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
      const hasDatasets = sanitized.knowledge.datasetIds.length > 0
      const hasRetrieval = sanitized.knowledge.retrievalTypes.length > 0
      if (!hasDatasets && !hasRetrieval) {
        sanitized.knowledge = null
      }
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

    if (sanitized.extensions && !Object.keys(sanitized.extensions).length) {
      sanitized.extensions = null
    }

    if (sanitized.metadata && !Object.keys(sanitized.metadata).length) {
      sanitized.metadata = null
    }

    return sanitized
  }

  function resetAdvancedInputs() {
    extensionsInput.value = formatJsonText(localSpec.extensions)
    metadataInput.value = formatJsonText(localSpec.metadata)
    extensionsError.value = ''
    metadataError.value = ''
  }

  function formatJsonText(value: any): string {
    if (!value) return ''
    try {
      return JSON.stringify(value, null, 2)
    } catch (error) {
      return ''
    }
  }

  onMounted(() => {
    loadModels()
    if (localSpec.knowledge) {
      loadDatasets()
    }
    ensureAllToolBindings()
    resetAdvancedInputs()
  })
</script>

<style scoped>
  .agent-spec-editor {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .editor-action-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    width: 100%;
    padding: 12px 18px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(83, 111, 255, 0.1), rgba(86, 134, 255, 0.03));
    border: 1px solid rgba(118, 144, 255, 0.18);
    gap: 12px;
    overflow: hidden;
    transition: padding 0.2s ease, min-height 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }

  .editor-action-bar:not(.is-collapsed) {
    min-height: 56px;
  }

  .editor-action-bar.is-collapsed {
    padding: 2px 4px;
    border-radius: 16px;
    background: rgba(83, 111, 255, 0.04);
    border-color: rgba(118, 144, 255, 0.08);
    width: fit-content;
    min-height: auto;
    margin-left: auto;
  }

  .action-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 18px;
    flex: 1;
  }

  .status-block {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4a5770;
  }

  .status-tip {
    font-size: 13px;
  }

  .action-cluster {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .collapse-toggle {
    min-width: 22px;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #5a6a92;
    padding: 0;
  }

  .collapse-toggle:hover {
    color: #3c4d82;
    background: rgba(94, 126, 210, 0.12);
  }

  .collapse-toggle :deep(.anticon) {
    font-size: 12px;
    line-height: 1;
  }

  .action-panel-enter-active,
  .action-panel-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .action-panel-enter-from,
  .action-panel-leave-to {
    opacity: 0;
    transform: translateY(-6px);
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .action-group.cta {
    gap: 12px;
  }

  .pill-btn {
    border-radius: 9px;
    padding: 0 16px;
    height: 34px;
    font-weight: 500;
    letter-spacing: 0.1px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .pill-btn.subtle {
    background: transparent;
    color: #5a6a92;
    border: none;
  }

  .pill-btn.subtle:hover {
    background: rgba(94, 126, 210, 0.12);
  }

  .pill-btn.outline {
    border: 1px solid rgba(116, 138, 235, 0.35);
    color: #364269;
    background: rgba(255, 255, 255, 0.9);
  }

  .pill-btn.outline:hover {
    border-color: rgba(116, 138, 235, 0.55);
    background: rgba(116, 138, 235, 0.08);
  }

  .pill-btn.filled {
    background: linear-gradient(135deg, #4466ff 0%, #6d89ff 100%);
    border: none;
    box-shadow: 0 12px 26px -16px rgba(54, 87, 232, 0.55);
  }

  .pill-btn.filled:hover {
    background: linear-gradient(135deg, #3c5cf3 0%, #607af6 100%);
  }

  .pill-btn.primary {
    border: 1px solid rgba(116, 138, 235, 0.45);
    background: rgba(103, 123, 224, 0.12);
    color: #2f3f74;
    box-shadow: none;
  }

  .pill-btn.primary:hover {
    border-color: rgba(116, 138, 235, 0.65);
    background: rgba(103, 123, 224, 0.18);
  }

  .pill-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none !important;
  }

  .blocking-alert {
    border-radius: 12px;
  }

  .spec-summary-card {
    border-radius: 18px;
    border: 1px solid rgba(194, 204, 240, 0.6);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 16px 40px -32px rgba(76, 118, 255, 0.45);
  }

  .summary-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .summary-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .summary-title {
    font-weight: 600;
    font-size: 16px;
    color: #1f2740;
  }

  .summary-hint {
    font-size: 13px;
    color: #6c7898;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(245, 247, 255, 0.75);
    border: 1px solid rgba(180, 196, 255, 0.4);
  }

  .item-label {
    font-size: 12px;
    color: #7280a4;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .item-value {
    font-size: 15px;
    font-weight: 600;
    color: #1f2740;
  }

  .model-row {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(180px, 0.65fr) minmax(320px, 1.5fr);
    gap: 24px;
    align-items: end;
  }

  .model-row .ant-form-item {
    margin-bottom: 0;
  }

  .system-prompt-item {
    margin-top: 18px;
  }

  .temperature-control {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .temperature-slider {
    background: #f8faff;
    border: 1px solid #e4e9f7;
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .temperature-slider :deep(.ant-slider-dot) {
    border: none;
    width: 8px;
    height: 8px;
    background: #cbd5f5;
  }

  .temperature-slider :deep(.ant-slider-dot-active) {
    background: #3b82f6;
  }

  .temperature-slider :deep(.ant-slider-rail) {
    background: linear-gradient(90deg, #cbd5f5 0%, #3b82f6 100%);
  }

  .temperature-slider :deep(.ant-slider-track) {
    background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
  }

  .temperature-meter {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .temperature-value {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .temperature-caption {
    font-size: 12px;
    color: #6b7280;
  }

  .temperature-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .temperature-control.temperature-inline {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(180px, auto);
    gap: 16px;
    align-items: center;
  }

  .temperature-side {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .temperature-presets.compact {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .temperature-presets.compact .preset-chip {
    padding: 4px 10px;
    font-size: 11px;
  }

  .preset-chip {
    border: 1px solid #dbe3ff;
    border-radius: 999px;
    padding: 6px 12px;
    background: #ffffff;
    color: #3b5bfd;
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
    font-family: inherit;
  }

  .preset-chip:hover {
    border-color: #3b5bfd;
    background: rgba(59, 91, 253, 0.1);
  }

  .preset-chip.active {
    border-color: #3b5bfd;
    background: rgba(59, 91, 253, 0.16);
    color: #1f2dd8;
  }

  .preset-chip .preset-value {
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(59, 91, 253, 0.12);
    font-size: 11px;
    font-weight: 500;
    color: inherit;
  }

  @media (max-width: 1080px) {
    .model-row {
      grid-template-columns: minmax(240px, 1fr) minmax(220px, 1fr);
      grid-template-rows: auto auto;
      gap: 20px;
    }

    .temperature-field {
      grid-column: span 2;
    }

    .temperature-control.temperature-inline {
      grid-template-columns: minmax(200px, 1fr) minmax(180px, auto);
      gap: 14px;
    }
  }

  @media (max-width: 720px) {
    .model-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .temperature-field {
      grid-column: span 1;
    }

    .temperature-control.temperature-inline {
      grid-template-columns: 1fr;
    }

    .temperature-side {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px 12px;
    }
  }

  .knowledge-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f7f9ff;
    border: 1px solid #e1e7ff;
    border-radius: 12px;
    margin-bottom: 16px;
    gap: 16px;
  }

  .knowledge-header .header-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .knowledge-header .header-title {
    font-weight: 600;
    color: #1f2937;
  }

  .knowledge-header .header-subtitle {
    font-size: 12px;
    color: #6b7280;
  }

  .knowledge-settings {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .knowledge-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
  }

  .setting-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fafbff;
    border: 1px solid #edf1ff;
    border-radius: 12px;
    padding: 16px;
  }

  .setting-field label {
    font-weight: 600;
    color: #1f2937;
  }

  .setting-field .field-hint {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
  }

  .setting-field.compact {
    max-width: 280px;
  }

  .setting-field.tip {
    background: transparent;
    border: none;
    padding: 0;
  }

  .inline-number {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inline-number .unit {
    font-size: 12px;
    color: #6b7280;
  }

  .hint-card {
    background: #f5f9ff;
    border: 1px solid #d9e6ff;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hint-card .hint-title {
    font-weight: 600;
    color: #1e40af;
  }

  .hint-card ul {
    margin: 0;
    padding-left: 18px;
    color: #4b5563;
    font-size: 12px;
  }

  .hint-card li + li {
    margin-top: 4px;
  }

  .editor-tabs {
    background: transparent;
  }

  .editor-tabs :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
    padding: 0 6px;
  }

  .editor-tabs :deep(.ant-tabs-tab) {
    padding: 8px 16px;
    border-radius: 12px;
    font-weight: 500;
  }

  .editor-tabs :deep(.ant-tabs-tab.ant-tabs-tab-active) {
    background: rgba(80, 120, 255, 0.12);
    border-radius: 12px;
  }

  .editor-tabs :deep(.ant-tabs-ink-bar) {
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(80, 120, 255, 0.9), rgba(120, 150, 255, 0.6));
  }

  .tab-pane {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .editor-card {
    border-radius: 18px;
    border: 1px solid rgba(210, 222, 255, 0.55);
    box-shadow: 0 18px 48px -44px rgba(64, 102, 255, 0.65);
    backdrop-filter: blur(4px);
  }

  .section-form {
    width: 100%;
  }

  .section-grid {
    display: grid;
    gap: 16px;
  }

  .section-grid--two {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
  .tool-selector {
    margin-bottom: 16px;
  }

  .tool-binding-wrapper {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .tool-binding-card {
    border: 1px solid rgba(206, 216, 240, 0.7);
    border-radius: 16px;
    padding: 18px 20px;
    background: #ffffff;
    box-shadow: 0 10px 24px -18px rgba(33, 60, 133, 0.35);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .tool-binding-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tool-name {
    font-size: 16px;
    font-weight: 600;
    color: #1f2329;
  }

  .tool-desc {
    font-size: 13px;
    color: #6b7785;
  }

  .tool-binding-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tool-binding-field {
    display: grid;
    grid-template-columns: minmax(180px, 220px) minmax(260px, 1fr) 120px;
    gap: 20px;
    align-items: flex-start;
    padding: 16px 18px;
    border: 1px dashed rgba(82, 124, 255, 0.22);
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(82, 124, 255, 0.05), rgba(82, 124, 255, 0.09));
  }

  .field-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-name {
    font-weight: 600;
    color: #1f2329;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-desc {
    font-size: 12px;
    color: #6b7785;
    line-height: 18px;
  }

  .required-tag {
    margin-left: 0;
    color: #ff4d4f;
    font-size: 12px;
  }

  .field-control {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field-control :deep(.ant-radio-group) {
    display: inline-flex;
    gap: 16px;
  }

  .selector-row,
  .constant-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .selector-display {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(240, 243, 255, 0.85);
    border: 1px dashed rgba(120, 150, 255, 0.35);
  }

  .selector-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 12px;
    border-radius: 999px;
    background: rgba(82, 124, 255, 0.16);
    color: #2f4fb4;
    font-size: 12px;
    line-height: 20px;
  }

  .selector-placeholder {
    color: #97a0b3;
    font-size: 12px;
  }

  .field-override {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    font-size: 12px;
    color: #6b7785;
  }

  .knowledge-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
  }

  .memory-block,
  .budget-block {
    border: 1px solid #e6ebf5;
    border-radius: 12px;
    padding: 16px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .memory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .memory-title {
    font-weight: 600;
    font-size: 15px;
  }

  .memory-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .memory-hint {
    margin: 0;
    color: #8b95a5;
    font-size: 13px;
  }

  .budget-title {
    font-weight: 600;
    font-size: 15px;
  }

  .budget-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .budget-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .advanced-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .advanced-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .advanced-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #1f2329;
  }

  .strategy-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .strategy-description {
    font-size: 13px;
    color: #5c667a;
    background: #f5f7fb;
    padding: 12px 14px;
    border-radius: 12px;
  }

  .agent-variable-selector-overlay {
    position: fixed;
    inset: 0;
    background: rgba(16, 24, 48, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .agent-variable-selector-panel {
    width: 520px;
    max-width: 92vw;
    background: #ffffff;
    border-radius: 16px;
    padding: 22px 24px 20px;
    box-shadow: 0 24px 48px -16px rgba(25, 52, 132, 0.4);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .selector-title {
    font-size: 18px;
    font-weight: 600;
    color: #1f2329;
  }

  .variable-selector-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .selector-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    font-weight: 600;
    color: #1f2329;
    font-size: 14px;
  }

  .selector-hint {
    font-size: 12px;
    color: #98a0b2;
  }

  .selector-suggestion-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .suggestion-chips :deep(.ant-tag) {
    cursor: pointer;
  }

  .selector-actions {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 1024px) {
    .tool-binding-field {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .field-override {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
  }
</style>
