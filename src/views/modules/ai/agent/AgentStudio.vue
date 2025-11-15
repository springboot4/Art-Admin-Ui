<template>
  <div class="agent-studio-page">
    <a-spin :spinning="loading" wrapper-class-name="agent-studio-spin">
      <div v-if="loadError" style="padding: 40px; text-align: center">
        <Result :sub-title="loadError" status="error" title="无法加载Agent配置">
          <template #extra>
            <a-button type="primary" @click="initialize">重试</a-button>
          </template>
        </Result>
      </div>
      <div v-else-if="!editorReady" style="padding: 40px; text-align: center; color: #999">
        正在加载应用信息...
      </div>
      <div v-else class="agent-studio-container">
        <AgentSpecEditorV2
          :app="appInfo"
          :agent="editableAgent"
          :spec="agentSpec"
          :status="editorStatus"
          :saving="saving"
          :publishing="publishing"
          :has-changes="hasChanges"
          :can-publish="canPublish"
          :blocking-issues="blockingIssues"
          @back="handleBack"
          @save-draft="handleSaveDraft"
          @publish="handlePublish"
          @update-spec="handleSpecUpdate"
          @refresh="initialize"
          @open-test="openTestPanel"
        />
      </div>
    </a-spin>

    <a-drawer
      :width="480"
      :visible="testPanelVisible"
      class="agent-test-drawer"
      destroy-on-close
      placement="right"
      :mask-style="{ backgroundColor: 'rgba(15, 23, 42, 0.35)' }"
      :body-style="{ padding: 0 }"
      :closable="false"
      @close="closeTestPanel"
    >
      <AgentTestPanel
        v-if="editorReady && editableAgent?.id"
        :agent-id="editableAgent.id ? String(editableAgent.id) : ''"
        :app-id="appId || ''"
        :app-name="appInfo?.name || ''"
        :status="editorStatus"
        :spec="agentSpec"
        @close="closeTestPanel"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { message } from 'ant-design-vue'
  import { useRoute, useRouter } from 'vue-router'
  import AgentSpecEditorV2 from './components/AgentSpecEditorV2.vue'
  import AgentTestPanel from './components/AgentTestPanel.vue'
  import { Result } from 'ant-design-vue'
  import { get as fetchApp } from '/@/api/ai/app/AiAppIndex'
  import { getLastAgent, publishAgent, saveAgentDraft } from '/@/api/ai/agent/AiAgentIndex'
  import type { AiAgentDTO, AgentSpec } from '/@/api/ai/agent/AiAgentTypes'

  interface AiAppInfo {
    id: string
    name: string
    mode?: string | number
    icon?: string
    status?: string
    description?: string
    updateTime?: string
  }

  const DEFAULT_SPEC: AgentSpec = {
    version: 'v1',
    platformId: null,
    modelId: null,
    temperature: 0.7,
    maxTokens: null,
    language: 'zh',
    systemPrompt: '',
    strategy: {
      type: 'react',
      params: {},
      decorators: [],
    },
    tools: [],
    toolBindings: {},
    knowledge: null,
    memory: { enabled: false, window: { size: null } },
    budgets: { maxSteps: null, maxTimeMs: null, maxToolCalls: null },
    output: { mode: 'text' },
    extensions: null,
    metadata: null,
  }

  const router = useRouter()
  const route = useRoute()

  const appId = computed(() => route.query.appId as string | undefined)

  const loading = ref(false)
  const saving = ref(false)
  const publishing = ref(false)
  const loadError = ref('')

  const appInfo = ref<AiAppInfo | null>(null)
  const latestAgent = ref<AiAgentDTO | null>(null)
  const editableAgent = ref<AiAgentDTO | null>(null)
  const agentSpec = reactive<AgentSpec>({ ...DEFAULT_SPEC })
  const originalSpecJson = ref('')

  const editorReady = computed(() => !!appInfo.value)

  const hasChanges = computed(() => {
    if (!editableAgent.value) return false
    try {
      const current = JSON.stringify(agentSpec)
      return current !== originalSpecJson.value
    } catch (error) {
      console.warn('无法比较Agent配置', error)
      return true
    }
  })

  const editorStatus = computed(() => editableAgent.value?.status || 'draft')

  const canPublish = computed(() => {
    const modelId = agentSpec.modelId
    return !!(modelId && String(modelId).trim())
  })

  const blockingIssues = computed(() => {
    const issues: string[] = []
    if (!canPublish.value) {
      issues.push('尚未选择模型')
    }
    return issues
  })

  const testPanelVisible = ref(false)

  function openTestPanel() {
    if (!editableAgent.value?.id) {
      message.warning('请先配置并保存 Agent')
      return
    }
    testPanelVisible.value = true
  }

  function closeTestPanel() {
    testPanelVisible.value = false
  }

  function handleBack() {
    router.push({ path: '/ai/app' })
  }

  async function ensureApp(): Promise<boolean> {
    const id = appId.value?.toString().trim()
    if (!id) {
      message.error('缺少有效的应用ID')
      handleBack()
      return false
    }

    try {
      const result = await fetchApp(id)
      if (!result) {
        loadError.value = '未找到对应的应用信息'
        return false
      }

      const mode = typeof result.mode === 'number' ? String(result.mode) : result.mode
      if (mode !== 'agent') {
        loadError.value = '当前应用不是Agent类型'
        return false
      }

      appInfo.value = {
        id: result.id ? String(result.id) : id,
        name: result.name || '未命名应用',
        mode,
        icon: result.icon,
        status: result.status,
        description: result.description,
        updateTime: result.updateTime,
      }
      return true
    } catch (error: any) {
      console.error('加载应用详情失败', error)
      loadError.value = error?.message || '加载应用信息失败'
      return false
    }
  }

  function parseSpec(specJson?: string | null): AgentSpec {
    if (!specJson) {
      return { ...DEFAULT_SPEC }
    }

    try {
      const parsed = JSON.parse(specJson)
      return {
        ...DEFAULT_SPEC,
        ...parsed,
        strategy: {
          ...DEFAULT_SPEC.strategy,
          ...(parsed.strategy || {}),
        },
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
        toolBindings: parsed.toolBindings || {},
        knowledge: parsed.knowledge || null,
        memory: parsed.memory || { enabled: false, window: { size: null } },
        budgets: parsed.budgets || { maxSteps: null, maxTimeMs: null, maxToolCalls: null },
        output: parsed.output || { mode: 'text' },
        extensions: parsed.extensions || null,
        metadata: parsed.metadata || null,
      }
    } catch (error) {
      console.warn('解析Agent配置失败，使用默认配置', error)
      return { ...DEFAULT_SPEC }
    }
  }

  function loadSpec(agent: AiAgentDTO | null) {
    const spec = parseSpec(agent?.specJson)
    Object.assign(agentSpec, spec)
    originalSpecJson.value = JSON.stringify(spec)
  }

  async function initialize() {
    loadError.value = ''
    loading.value = true

    try {
      const appOk = await ensureApp()
      if (!appOk) {
        return
      }

      const id = appId.value?.toString().trim()
      if (!id) {
        throw new Error('缺少有效的应用ID')
      }

      const latest = await getLastAgent(id)

      latestAgent.value = latest
        ? {
            ...latest,
            id: latest.id ? String(latest.id) : latest.id,
            appId: latest.appId ? String(latest.appId) : id,
          }
        : null

      editableAgent.value = latestAgent.value || {
        appId: appInfo.value!.id,
        name: appInfo.value!.name,
        status: 'draft',
        specJson: JSON.stringify(DEFAULT_SPEC),
      }

      loadSpec(editableAgent.value)
    } catch (error: any) {
      console.error('初始化Agent编辑器失败', error)
      loadError.value = error?.message || '加载Agent配置失败'
    } finally {
      loading.value = false
    }
  }

  function handleSpecUpdate(updated: AgentSpec) {
    Object.assign(agentSpec, updated)
  }

  async function handleSaveDraft() {
    if (!editableAgent.value) return

    saving.value = true
    try {
      const payload: AiAgentDTO = {
        ...editableAgent.value,
        appId: editableAgent.value.appId || appInfo.value!.id,
        name: editableAgent.value.name || appInfo.value!.name,
        status: 'draft',
        specJson: JSON.stringify(agentSpec),
      }

      const response = await saveAgentDraft(payload)
      if (response) {
        message.success('草稿已保存')
        await initialize()
      }
    } catch (error: any) {
      console.error('保存Agent草稿失败', error)
      message.error(error?.message || '保存草稿失败')
    } finally {
      saving.value = false
    }
  }

  async function handlePublish() {
    if (!editableAgent.value) return

    publishing.value = true
    try {
      const payload: AiAgentDTO = {
        ...editableAgent.value,
        appId: editableAgent.value.appId || appInfo.value!.id,
        name: editableAgent.value.name || appInfo.value!.name,
        status: 'published',
        specJson: JSON.stringify(agentSpec),
      }

      const response = await publishAgent(payload)
      if (response) {
        message.success('Agent已发布')
        await initialize()
      }
    } catch (error: any) {
      console.error('发布Agent失败', error)
      message.error(error?.message || '发布失败')
    } finally {
      publishing.value = false
    }
  }

  watch(
    () => editableAgent.value?.specJson,
    (value) => {
      if (value) {
        loadSpec({ ...editableAgent.value!, specJson: value })
      }
    },
  )

  onMounted(async () => {
    await initialize()
  })
</script>

<style scoped>
  .agent-studio-page {
    height: 100vh;
    background: #f5f7fa;
    overflow: hidden;
  }

  .agent-studio-spin {
    width: 100%;
    height: 100%;
  }

  .agent-studio-spin :deep(.ant-spin-container) {
    height: 100%;
  }

  .agent-studio-container {
    height: 100%;
    overflow: hidden;
  }

  .agent-test-drawer :deep(.ant-drawer-body) {
    padding: 0;
    background: #ffffff;
  }
</style>
