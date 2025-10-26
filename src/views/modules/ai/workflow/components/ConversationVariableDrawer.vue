<template>
  <a-drawer
    :mask-closable="false"
    :visible="visible"
    class="conversation-variable-drawer"
    destroy-on-close
    placement="right"
    title="会话变量"
    width="420"
    @close="handleCancel"
  >
    <div class="drawer-main">
      <div class="drawer-header">
        <div class="header-text">
          <h3>声明会话变量</h3>
          <p>运行前注入、运行后写回，可跨节点复用。</p>
        </div>
        <div class="header-meta">
          <span class="meta-pill">{{ variableSummary }}</span>
        </div>
      </div>

      <a-alert
        class="drawer-tip"
        message="仅支持字符串，键名需唯一且由字母、数字或下划线组成。"
        show-icon
        type="info"
      />

      <a-form layout="vertical" class="variable-form">
        <div v-if="hasVariables" class="variable-list">
          <transition-group name="fade-move" tag="div">
            <div v-for="(item, index) in localVariables" :key="item.uid" class="variable-card">
              <div class="variable-card-header">
                <div class="card-meta">
                  <span class="variable-index">{{ index + 1 }}</span>
                  <span class="variable-label">会话变量</span>
                </div>
                <a-button danger size="small" type="text" @click="removeVariable(index)">
                  删除
                </a-button>
              </div>
              <div class="card-body">
                <div class="variable-fields">
                  <a-form-item
                    :validate-status="getKeyStatus(index)"
                    class="form-item"
                    label="变量键名"
                    :help="getKeyHelp(index)"
                  >
                    <a-input
                      v-model:value="item.key"
                      placeholder="如 customer_name"
                      @blur="handleTrimKey(index)"
                    />
                  </a-form-item>
                  <a-form-item class="form-item" label="默认值 (可选)">
                    <a-input
                      v-model:value="item.defaultValue"
                      allow-clear
                      placeholder="默认值，可以为空"
                    />
                  </a-form-item>
                </div>
              </div>
              <div class="card-foot">运行时若未赋值，将使用默认值。</div>
            </div>
          </transition-group>
        </div>

        <a-empty v-else class="empty-state" description="暂无会话变量" />

        <a-button block class="add-variable-btn" type="dashed" @click="addVariable">
          <template #icon>
            <PlusOutlined />
          </template>
          新增变量
        </a-button>
      </a-form>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </a-space>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
  import { computed, reactive, watch } from 'vue'
  import {
    Alert as AAlert,
    Button as AButton,
    Drawer as ADrawer,
    Empty as AEmpty,
    Form as AForm,
    FormItem as AFormItem,
    Input as AInput,
    Space as ASpace,
    message,
  } from 'ant-design-vue'
  import { PlusOutlined } from '@ant-design/icons-vue'

  interface ConversationVariableDraft {
    uid: string
    key: string
    defaultValue: string | null
  }

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    variables: {
      type: Array as () => { key: string; defaultValue: string | null }[],
      default: () => [],
    },
  })

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'update:variables', value: { key: string; defaultValue: string | null }[]): void
  }>()

  const state = reactive({
    localVariables: [] as ConversationVariableDraft[],
  })

  const localVariables = computed({
    get: () => state.localVariables,
    set: (value: ConversationVariableDraft[]) => {
      state.localVariables = value
    },
  })

  const hasVariables = computed(() => localVariables.value.length > 0)
  const variableSummary = computed(() =>
    hasVariables.value ? `共 ${localVariables.value.length} 项` : '尚未添加',
  )

  const initializeLocalVariables = () => {
    const fromProps = Array.isArray(props.variables) ? props.variables : []
    localVariables.value = fromProps.map((item) => ({
      uid: `${item.key}_${Math.random().toString(36).slice(2, 8)}`,
      key: item.key,
      defaultValue: item.defaultValue ?? null,
    }))
  }

  watch(
    () => props.visible,
    (visible) => {
      if (visible) {
        initializeLocalVariables()
      }
    },
    { immediate: true },
  )

  watch(
    () => props.variables,
    () => {
      if (!props.visible) {
        initializeLocalVariables()
      }
    },
    { deep: true },
  )

  const addVariable = () => {
    localVariables.value.push({
      uid: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      key: '',
      defaultValue: null,
    })
  }

  const removeVariable = (index: number) => {
    localVariables.value.splice(index, 1)
  }

  const handleTrimKey = (index: number) => {
    const target = localVariables.value[index]
    if (!target) return
    target.key = target.key.trim()
  }

  const keyRegex = /^[A-Za-z0-9_]+$/

  const invalidKeyIndexes = computed(() => {
    const seen = new Map<string, number>()
    const invalid: Set<number> = new Set()

    localVariables.value.forEach((item, index) => {
      if (!item.key || !keyRegex.test(item.key)) {
        invalid.add(index)
        return
      }

      const existing = seen.get(item.key)
      if (existing !== undefined) {
        invalid.add(index)
        invalid.add(existing)
      } else {
        seen.set(item.key, index)
      }
    })

    return invalid
  })

  const getKeyStatus = (index: number) => {
    return invalidKeyIndexes.value.has(index) ? 'error' : ''
  }

  const getKeyHelp = (index: number) => {
    if (invalidKeyIndexes.value.has(index)) {
      const item = localVariables.value[index]
      if (!item?.key) {
        return '请输入变量键名'
      }
      if (!keyRegex.test(item.key)) {
        return '仅支持字母、数字或下划线'
      }
      return '变量键名已存在'
    }
    return ''
  }

  const handleCancel = () => {
    emit('update:visible', false)
  }

  const handleSave = () => {
    if (invalidKeyIndexes.value.size > 0) {
      message.error('请检查变量键名是否填写且唯一，仅支持字母、数字或下划线')
      return
    }

    const cleaned = localVariables.value
      .filter((item) => item.key)
      .map((item) => ({
        key: item.key,
        defaultValue:
          item.defaultValue === null || item.defaultValue === undefined || item.defaultValue === ''
            ? null
            : item.defaultValue,
      }))

    emit('update:variables', cleaned)
    emit('update:visible', false)
  }
</script>

<style scoped>
  .conversation-variable-drawer :deep(.ant-drawer-body) {
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .drawer-main {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 24px 24px;
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-top: 24px; /* Add padding to the top of the scrollable area */
  }

  .header-text h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .header-text p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
  }

  .header-meta {
    display: flex;
    align-items: center;
    margin-top: 4px;
    flex-shrink: 0;
  }

  .meta-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #4b5563;
    font-size: 12px;
    font-weight: 500;
  }

  .drawer-tip {
    border-radius: 8px;
    margin-bottom: 0; /* Let the parent gap handle spacing */
  }

  .variable-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .variable-list {
    display: flex;
    flex-direction: column;
    gap: 28px; /* Increased spacing between cards as requested */
  }

  .variable-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    background-color: #ffffff;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .variable-card:hover {
    border-color: #a5b4fc;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  }

  .variable-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .variable-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #f3f4f6;
    color: #4b5563;
    font-weight: 600;
    font-size: 12px;
  }

  .variable-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .variable-fields {
    display: grid;
    grid-template-columns: 1fr; /* Stack fields vertically for better alignment */
    gap: 4px; /* Further reduced gap between form items for compactness */
  }

  .form-item :deep(.ant-form-item-label > label) {
    font-weight: 500;
    color: #374151;
    padding-bottom: 2px; /* Adjust label padding */
  }

  .form-item :deep(.ant-form-item) {
    margin-bottom: 0; /* Remove bottom margin for compactness */
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-foot {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px dashed #e5e7eb;
    font-size: 12px;
    color: #6b7280;
  }

  .empty-state {
    padding: 32px 0;
  }

  .add-variable-btn {
    margin-top: 0;
  }

  .drawer-footer {
    text-align: right;
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    background-color: #ffffff;
    flex-shrink: 0;
  }

  .fade-move-enter-active,
  .fade-move-leave-active {
    transition: all 0.2s ease;
  }

  .fade-move-enter-from,
  .fade-move-leave-to {
    opacity: 0;
    transform: translateY(6px);
  }

  @media (max-width: 520px) {
    .drawer-main {
      padding: 0 16px 16px;
    }
    .drawer-header {
      padding-top: 16px;
    }
  }
</style>
