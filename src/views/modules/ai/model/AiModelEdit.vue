<template>
  <BasicModal
    :loading="confirmLoading"
    :mask-closable="showable"
    :title="title"
    :visible="visible"
    v-bind="$attrs"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :label-col="labelCol"
      :model="formData"
      :rules="rules"
      :wrapper-col="wrapperCol"
    >
      <a-form-item :hidden="true" label="主键">
        <a-input v-model:value="formData.id" :disabled="showable" />
      </a-form-item>
      <a-form-item label="模型类型" name="type">
        <a-select
          v-model:value="formData.type"
          :disabled="showable"
          :options="modelTypeOptions"
          allow-clear
          placeholder="请选择模型类型"
        />
      </a-form-item>
      <a-form-item label="模型名称" name="name">
        <a-input
          v-model:value="formData.name"
          :disabled="showable"
          allow-clear
          placeholder="请输入模型名称"
        />
      </a-form-item>
      <a-form-item label="所属平台" name="platform">
        <a-select
          v-model:value="formData.platform"
          :disabled="showable"
          :loading="platformLoading"
          :options="platformOptions"
          allow-clear
          placeholder="请选择所属平台"
          show-search
          :filter-option="filterPlatformOption"
        />
      </a-form-item>
      <a-form-item label="是否启用" name="enable">
        <a-radio-group v-model:value="formData.enable" :disabled="showable">
          <a-radio value="1">启用</a-radio>
          <a-radio value="0">禁用</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="最大输入长度" name="maxInputTokens">
        <a-input-number
          v-model:value="formData.maxInputTokens"
          :disabled="showable"
          :min="1"
          placeholder="请输入最大输入长度"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="最大输出长度" name="maxOutputTokens">
        <a-input-number
          v-model:value="formData.maxOutputTokens"
          :disabled="showable"
          :min="1"
          placeholder="请输入最大输出长度"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="模型配置" name="config">
        <a-textarea
          v-model:value="formData.config"
          :disabled="showable"
          :auto-size="{ minRows: 4, maxRows: 12 }"
          placeholder="请输入模型配置JSON"
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button v-if="!showable" :loading="confirmLoading" type="primary" @click="handleOk"
          >保存
        </a-button>
      </a-space>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
  import { BasicModal } from '/@/components/Modal'
  import { nextTick, reactive, ref, computed, watch } from 'vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { FormInstance } from 'ant-design-vue'
  import { add, get, update } from '/@/api/ai/model/AiModelIndex'
  import { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
  import { page as fetchPlatforms, get as fetchPlatformDetail } from '/@/api/ai/model/AiModelPlatformIndex'
  import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import type { SelectProps } from 'ant-design-vue'

  const {
    initFormEditType,
    handleCancel,
    labelCol,
    wrapperCol,
    title,
    confirmLoading,
    visible,
    showable,
    formOperationType,
  } = useFormEdit()

  const emits = defineEmits(['ok'])

  const MODEL_TYPE_OPTIONS = [
    { label: '聊天 / 文本生成 (CHAT)', value: 'CHAT' },
    { label: '向量嵌入 (EMBEDDING)', value: 'EMBEDDING' },
    { label: '重排序 (RERANK)', value: 'RERANK' },
    { label: '图像生成 (IMAGE)', value: 'IMAGE' },
    { label: '音频模型 (AUDIO)', value: 'AUDIO' },
  ]

  const rules = reactive({
    type: [{ required: true, message: '请选择模型类型', trigger: ['change', 'blur'] }],
    name: [{ required: true, message: '请输入模型名称', trigger: ['blur', 'change'] }],
    platform: [{ required: true, message: '请选择所属平台', trigger: ['change', 'blur'] }],
    enable: [{ required: true, message: '请选择是否启用', trigger: ['change'] }],
    maxInputTokens: [
      {
        required: true,
        message: '请输入最大输入长度',
        trigger: ['change', 'blur'],
      },
    ],
    maxOutputTokens: [
      {
        required: true,
        message: '请输入最大输出长度',
        trigger: ['change', 'blur'],
      },
    ],
    config: [
      {
        required: true,
        message: '请输入模型配置JSON',
        trigger: ['blur', 'change'],
      },
      {
        validator: async (_, value) => {
          if (!value) {
            return Promise.reject('请输入模型配置JSON')
          }
          try {
            JSON.parse(value)
            return Promise.resolve()
          } catch (error) {
            return Promise.reject('JSON 格式不正确')
          }
        },
        trigger: ['blur'],
      },
    ],
  })

  const formRef = ref<FormInstance>()

  type AiModelForm = Omit<AiModelDTO, 'maxInputTokens' | 'maxOutputTokens'> & {
    maxInputTokens?: number | null
    maxOutputTokens?: number | null
    enable?: string
  }

  const createDefaultForm = (): AiModelForm => ({
    id: '',
    type: '',
    name: '',
    platform: '',
    enable: '1',
    maxInputTokens: 2048,
    maxOutputTokens: 2048,
    config: '{}',
    createTime: '',
    createBy: '',
    updateTime: '',
    updateBy: '',
    tenantId: '',
  })

  const formData = ref<AiModelForm>(createDefaultForm())

  const availablePlatforms = ref<AiModelPlatformDTO[]>([])
  const platformLoading = ref(false)
  const modelTypeOptions = MODEL_TYPE_OPTIONS

  const platformOptions = computed<SelectProps['options']>(() =>
    availablePlatforms.value
      .filter((item) => !!item.id)
      .map((item) => ({
        label: item.name || item.id || '',
        value: String(item.id),
      })),
  )

  const filterPlatformOption: SelectProps['filterOption'] = (input, option) => {
    const label = (option?.label ?? '').toString().toLowerCase()
    return label.includes(input.toLowerCase())
  }

  /**
   * 表单初始化
   */
  function init(id, operationType: FormOperationType) {
    initFormEditType(operationType)
    resetForm()
    getInfo(id, operationType)
  }

  /**
   * 获取表单信息
   */
  async function getInfo(id, editType: FormOperationType) {
    if ([FormOperationType.EDIT, FormOperationType.SHOW].includes(editType)) {
      confirmLoading.value = true
      await get(id).then((res) => {
        formData.value = {
          ...createDefaultForm(),
          ...res,
          platform: res.platform ? String(res.platform) : '',
          enable:
            res.enable === undefined || res.enable === null ? '1' : String(res.enable),
          maxInputTokens: res.maxInputTokens ? Number(res.maxInputTokens) : 2048,
          maxOutputTokens: res.maxOutputTokens ? Number(res.maxOutputTokens) : 2048,
          config: res.config || '{}',
        }
        if (formData.value.type === 'EMBEDDING') {
          ensureEmbeddingConfig()
        }
      })
      await loadPlatforms(formData.value.platform)
    } else {
      await loadPlatforms()
    }
    confirmLoading.value = false
  }

  /**
   * 保存新增或者编辑
   */
  function handleOk() {
    formRef.value?.validate().then(async () => {
      confirmLoading.value = true
      const payload: AiModelDTO = {
        ...formData.value,
        enable: formData.value.enable,
        maxInputTokens: formData.value.maxInputTokens?.toString(),
        maxOutputTokens: formData.value.maxOutputTokens?.toString(),
      }

      if (formOperationType.value === FormOperationType.ADD) {
        await add(payload)
      } else if (formOperationType.value === FormOperationType.EDIT) {
        await update(payload)
      }
      confirmLoading.value = false
      handleCancel()
      emits('ok')
    })
  }

  /**
   * 重置表单字段
   */
  function resetForm() {
    formData.value = createDefaultForm()
    nextTick(() => formRef.value?.clearValidate())
  }

  const loadPlatforms = async (selectedId?: string) => {
    try {
      platformLoading.value = true

      const map = new Map<string, AiModelPlatformDTO>()
      availablePlatforms.value.forEach((item) => {
        if (item.id) {
          map.set(String(item.id), item)
        }
      })

      const response = await fetchPlatforms({ current: 1, size: 1000 })
      if (response?.records) {
        response.records.forEach((item) => {
          if (item.id) {
            map.set(String(item.id), item)
          }
        })
      }

      const needDetailIds: string[] = []
      const lookupId = selectedId || formData.value.platform
      if (lookupId && !map.has(String(lookupId))) {
        needDetailIds.push(String(lookupId))
      }

      if (needDetailIds.length > 0) {
        const details = await Promise.all(
          needDetailIds.map(async (id) => {
            try {
              return await fetchPlatformDetail(id)
            } catch (error) {
              console.warn('加载模型平台详情失败', id, error)
              return null
            }
          }),
        )
        details.filter(Boolean).forEach((item) => {
          if (item?.id) {
            map.set(String(item.id), item)
          }
        })
      }

      availablePlatforms.value = Array.from(map.values())
    } catch (error) {
      console.error('加载模型平台失败', error)
    } finally {
      platformLoading.value = false
    }
  }

  watch(
    () => formData.value.type,
    (type) => {
      if (type === 'EMBEDDING') {
        ensureEmbeddingConfig()
      }
    },
  )

  function ensureEmbeddingConfig() {
    let parsed: Record<string, any>

    try {
      parsed = formData.value.config ? JSON.parse(formData.value.config) : {}
    } catch (error) {
      parsed = {}
    }

    if (parsed.dimensions === undefined || parsed.dimensions === null) {
      parsed.dimensions = 1024
      formData.value.config = JSON.stringify(parsed, null, 2)
    }
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({
    init,
  })
</script>

<style lang="less" scoped></style>
