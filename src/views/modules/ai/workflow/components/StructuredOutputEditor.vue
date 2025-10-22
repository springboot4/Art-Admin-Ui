<template>
  <div class="structured-output-editor">
    <section class="panel summary-panel">
      <div class="summary-header">
        <div>
          <div class="panel-title">结构化输出</div>
          <div class="panel-subtitle">定义模型返回的 JSON Schema，便于后续节点直接消费数据</div>
        </div>
        <a-button size="small" type="primary" @click="openSchemaEditor">
          <template #icon>
            <PlusOutlined />
          </template>
          配置字段
        </a-button>
      </div>
      <div class="summary-meta">
        <div class="meta-item">
          <span class="meta-label">字段数</span>
          <span class="meta-value">{{ fieldCount }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">额外字段</span>
          <a-tag :color="additionalProperties ? 'blue' : 'red'" size="small">
            {{ additionalProperties ? '允许' : '禁止' }}
          </a-tag>
        </div>
      </div>
    </section>

    <section class="panel preview-panel">
      <div class="preview-header">
        <div class="panel-title">Schema 预览</div>
        <div class="preview-actions">
          <a-button size="small" type="text" @click="copySchema">
            <template #icon>
              <CopyOutlined />
            </template>
            复制
          </a-button>
          <a-button size="small" type="text" @click="openSchemaEditor">
            <template #icon>
              <EditOutlined />
            </template>
            编辑
          </a-button>
        </div>
      </div>
      <div class="preview-body" :class="{ empty: !hasSchemaFields }">
        <template v-if="hasSchemaFields">
          <pre>{{ displaySchemaText }}</pre>
        </template>
        <template v-else>
          <a-empty description="还没有定义字段，点击“配置字段”按钮添加" />
        </template>
      </div>
    </section>

    <a-modal
      v-model:visible="isSchemaEditorVisible"
      :width="1024"
      :maskClosable="false"
      :destroyOnClose="true"
      centered
      class="structured-schema-modal"
      title="配置结构化输出"
      @cancel="handleSchemaEditorCancel"
    >
      <div class="schema-editor-modal">
        <div class="modal-body">
          <div class="editor-main">
            <section class="panel editor-fields-panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">字段定义</div>
                  <div class="panel-subtitle">添加、修改模型需要输出的字段及类型</div>
                </div>
              </div>
              <SchemaObjectEditor
                :schema="editorSchema"
                :level="0"
                @update:schema="handleEditorSchemaUpdate"
              />
            </section>

            <section class="panel advanced-panel">
              <div class="panel-header compact">
                <div class="panel-title">高级选项</div>
              </div>
              <div class="option-item">
                <div class="option-text">
                  <div class="option-title">允许额外字段</div>
                  <div class="option-subtitle"
                    >开启后模型可以返回 Schema 外的字段，关闭则严格校验</div
                  >
                </div>
                <a-switch
                  v-model:checked="editorAdditionalProperties"
                  checked-children="允许"
                  un-checked-children="禁止"
                  @change="handleEditorAdditionalPropertiesChange"
                />
              </div>
            </section>
          </div>

          <aside class="panel modal-preview-panel">
            <div class="modal-preview-header">
              <div>
                <div class="panel-title">实时预览</div>
                <div class="panel-subtitle">当前配置生成的 JSON Schema</div>
              </div>
              <div class="modal-preview-actions">
                <a-button size="small" type="text" @click="openJsonImport">
                  <template #icon>
                    <CodeOutlined />
                  </template>
                  导入 JSON
                </a-button>
                <a-button size="small" type="text" @click="copyEditorSchema">
                  <template #icon>
                    <CopyOutlined />
                  </template>
                  复制
                </a-button>
              </div>
            </div>
            <div class="modal-preview-body">
              <pre>{{ displayEditorSchemaText }}</pre>
            </div>
          </aside>
        </div>
      </div>

      <template #footer>
        <a-space>
          <a-button @click="handleSchemaEditorCancel">取消</a-button>
          <a-button type="primary" @click="handleSchemaEditorSave">保存</a-button>
        </a-space>
      </template>
    </a-modal>

    <a-modal
      v-model:visible="isJsonEditorVisible"
      :destroyOnClose="true"
      :width="720"
      class="schema-json-modal"
      title="导入 JSON Schema"
      @cancel="handleJsonEditorCancel"
    >
      <SimpleJsonEditor v-model:value="jsonEditorText" :placeholder="jsonEditorPlaceholder" />
      <template #footer>
        <a-space>
          <a-button @click="handleJsonEditorCancel">取消</a-button>
          <a-button type="primary" @click="handleJsonEditorSave">应用</a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, triggerRef, watch } from 'vue'
  import {
    Button as AButton,
    Empty as AEmpty,
    Modal as AModal,
    Space as ASpace,
    Switch as ASwitch,
    Tag as ATag,
    message,
  } from 'ant-design-vue'
  import { CodeOutlined, CopyOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
  import SchemaObjectEditor from './SchemaObjectEditor.vue'
  import SimpleJsonEditor from './SimpleJsonEditor.vue'
  import type { StructuredOutputConfig } from '../types/structuredOutput'

  const props = defineProps<{
    value: StructuredOutputConfig
  }>()

  const emit = defineEmits<{
    'update:value': [value: StructuredOutputConfig]
  }>()

  function createDefaultSchema() {
    return {
      type: 'object',
      description: '结构化输出',
      properties: {},
      required: [],
      additionalProperties: false,
    }
  }

  function normalizeSchema(input: any) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return createDefaultSchema()
    }

    const base = createDefaultSchema()
    return {
      ...base,
      ...input,
      type: 'object',
      properties: input.properties && typeof input.properties === 'object' ? input.properties : {},
      required: Array.isArray(input.required) ? input.required : [],
      additionalProperties: input.additionalProperties ?? false,
    }
  }

  const PLACEHOLDER_KEY_PREFIX = 'field_'

  function formatSchemaForDisplay(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema
    }

    const clone: any = Array.isArray(schema) ? [...schema] : { ...schema }

    if (clone.properties && typeof clone.properties === 'object') {
      const formatted: Record<string, any> = {}
      let untitledIndex = 1
      for (const [key, value] of Object.entries(clone.properties)) {
        const isPlaceholder = key.startsWith(PLACEHOLDER_KEY_PREFIX)
        const displayKey = isPlaceholder ? `未命名字段${untitledIndex++}` : key
        formatted[displayKey] = formatSchemaForDisplay(value)
      }
      clone.properties = formatted
    }

    if (clone.items && typeof clone.items === 'object') {
      clone.items = formatSchemaForDisplay(clone.items)
    }

    return clone
  }

  const rootSchema = ref<any>(createDefaultSchema())
  const additionalProperties = ref(false)

  const isSchemaEditorVisible = ref(false)
  const editorSchema = ref<any>(createDefaultSchema())
  const editorAdditionalProperties = ref(false)

  const isJsonEditorVisible = ref(false)
  const jsonEditorText = ref('')
  const jsonEditorPlaceholder = `{
  "type": "object",
  "description": "结构化输出",
  "properties": {},
  "required": [],
  "additionalProperties": false
}`

  watch(
    () => props.value,
    (newVal) => {
      const incoming = newVal?.schema?.root
      const normalized = normalizeSchema(incoming)
      rootSchema.value = normalized
      additionalProperties.value = normalized.additionalProperties ?? false
    },
    { immediate: true, deep: true },
  )

  const fieldCount = computed(() => {
    const props = rootSchema.value?.properties
    return props ? Object.keys(props).length : 0
  })

  const hasSchemaFields = computed(() => fieldCount.value > 0)

  const generatedSchemaText = computed(() => JSON.stringify(rootSchema.value, null, 2))
  const editorGeneratedSchemaText = computed(() => JSON.stringify(editorSchema.value, null, 2))

  const displaySchemaText = computed(() =>
    JSON.stringify(formatSchemaForDisplay(rootSchema.value), null, 2),
  )
  const displayEditorSchemaText = computed(() =>
    JSON.stringify(formatSchemaForDisplay(editorSchema.value), null, 2),
  )

  function syncToParent() {
    const enabled = props.value?.enabled ?? true

    emit('update:value', {
      enabled,
      schema: {
        root: JSON.parse(JSON.stringify(rootSchema.value)),
      },
    })
  }

  function openSchemaEditor() {
    const schemaForEdit = rootSchema.value ? rootSchema.value : createDefaultSchema()
    editorSchema.value = normalizeSchema(JSON.parse(JSON.stringify(schemaForEdit)))
    editorAdditionalProperties.value = !!editorSchema.value.additionalProperties
    isSchemaEditorVisible.value = true
  }

  function handleSchemaEditorCancel() {
    isSchemaEditorVisible.value = false
  }

  function handleSchemaEditorSave() {
    rootSchema.value = normalizeSchema(editorSchema.value)
    additionalProperties.value = !!editorAdditionalProperties.value
    rootSchema.value.additionalProperties = additionalProperties.value
    syncToParent()
    isSchemaEditorVisible.value = false
  }

  function handleEditorSchemaUpdate(updatedSchema: any) {
    editorSchema.value = updatedSchema
    editorSchema.value.additionalProperties = editorAdditionalProperties.value
    triggerRef(editorSchema)
  }

  function handleEditorAdditionalPropertiesChange() {
    editorSchema.value.additionalProperties = editorAdditionalProperties.value
    triggerRef(editorSchema)
  }

  function copySchema() {
    if (!hasSchemaFields.value) {
      message.info('暂无 Schema 可以复制')
      return
    }
    navigator.clipboard.writeText(generatedSchemaText.value)
    message.success('已复制到剪贴板')
  }

  function copyEditorSchema() {
    navigator.clipboard.writeText(editorGeneratedSchemaText.value)
    message.success('已复制到剪贴板')
  }

  function openJsonImport() {
    jsonEditorText.value = editorGeneratedSchemaText.value
    isJsonEditorVisible.value = true
  }

  function handleJsonEditorCancel() {
    isJsonEditorVisible.value = false
  }

  function handleJsonEditorSave() {
    try {
      const parsed = JSON.parse(jsonEditorText.value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        message.error('Schema 必须是一个对象')
        return
      }
      if (parsed.type && parsed.type !== 'object') {
        message.error('根节点类型必须为 object')
        return
      }
      const normalized = normalizeSchema(parsed)
      editorSchema.value = normalized
      editorAdditionalProperties.value = normalized.additionalProperties ?? false
      triggerRef(editorSchema)
      isJsonEditorVisible.value = false
      message.success('Schema 已导入')
    } catch (error: any) {
      message.error(`JSON 解析失败: ${error.message}`)
    }
  }
</script>

<style scoped lang="less">
  .structured-output-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel {
    background: #ffffff;
    border: 1px solid #e7ecf5;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  }

  .panel-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .panel-subtitle {
    margin-top: 6px;
    font-size: 12px;
    color: #6b7280;
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .summary-meta {
    display: flex;
    gap: 32px;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid #eef2f9;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .meta-label {
    font-size: 12px;
    color: #6b7280;
  }

  .meta-value {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .preview-panel {
    background: #f6f8fb;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .preview-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.ant-btn-text) {
      color: #2563eb;

      &:hover {
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.08);
      }
    }
  }

  .preview-body {
    min-height: 160px;
    background: #ffffff;
    border: 1px solid #e4e9f2;
    border-radius: 10px;
    padding: 16px;
    overflow: auto;
  }

  .preview-body pre {
    margin: 0;
    font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .preview-body.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #f9fafc 0%, #f1f5f9 100%);
  }

  .preview-body :deep(.ant-empty-image) {
    height: 60px;
  }

  .preview-body :deep(.ant-empty-description) {
    color: #6b7280;
  }

  .structured-schema-modal :deep(.ant-modal-body) {
    padding: 28px 32px;
    background: #f5f7fb;
    border-radius: 20px;
  }

  .structured-schema-modal :deep(.ant-modal-content) {
    border-radius: 24px;
    overflow: hidden;
  }

  .schema-editor-modal {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .modal-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
    align-items: stretch;
  }

  .editor-main {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .editor-main .panel {
    border-radius: 16px;
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
    border: 1px solid #e4e9f4;
  }

  .editor-fields-panel {
    padding: 20px 24px;
  }

  .advanced-panel {
    padding: 20px 24px;
  }

  .advanced-panel .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border: 1px solid #e0e7f5;
    border-radius: 12px;
    background: linear-gradient(180deg, #f9fbff 0%, #f4f6fb 100%);
  }

  .option-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .option-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .option-subtitle {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.5;
  }

  .modal-preview-panel {
    padding: 22px 22px 18px;
    background: #ffffff;
    border: 1px solid #e4e9f4;
    border-radius: 18px;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
    position: sticky;
    top: 0;
    max-height: calc(80vh - 120px);
    display: flex;
    flex-direction: column;
  }

  .modal-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .modal-preview-actions {
    display: flex;
    gap: 8px;

    :deep(.ant-btn-text) {
      color: #2563eb;

      &:hover {
        color: #1d4ed8;
        background: rgba(37, 99, 235, 0.08);
      }
    }
  }

  .modal-preview-body {
    background: linear-gradient(180deg, #f9fbff 0%, #eef3fb 100%);
    border-radius: 12px;
    padding: 20px 18px;
    border: 1px solid #e0e7f5;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
    overflow: auto;
  }

  .modal-preview-body pre {
    margin: 0;
    font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #1e293b;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .schema-json-modal :deep(.simple-json-editor) {
    .json-editor-header {
      border-bottom: none;
      margin-bottom: 12px;
      padding-bottom: 0;
    }

    .json-textarea {
      min-height: 320px;
      font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace;
    }
  }

  @media (max-width: 992px) {
    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .modal-preview-panel {
      position: static;
      max-height: none;
    }

    .modal-preview-body {
      max-height: 360px;
    }
  }

  @media (max-width: 640px) {
    .summary-header {
      flex-direction: column;
      align-items: stretch;
    }

    .summary-meta {
      flex-direction: column;
      gap: 16px;
    }
  }
</style>
