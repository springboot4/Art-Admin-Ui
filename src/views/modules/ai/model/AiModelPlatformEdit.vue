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
      <a-form-item label="厂商名称" name="name">
        <a-input
          v-model:value="formData.name"
          :disabled="showable"
          allow-clear
          placeholder="请输入厂商名称"
        />
      </a-form-item>
      <a-form-item label="base_url" name="baseUrl">
        <a-input
          v-model:value="formData.baseUrl"
          :disabled="showable"
          allow-clear
          placeholder="请输入base_url"
        />
      </a-form-item>
      <a-form-item label="api_key" name="apiKey">
        <a-input
          v-model:value="formData.apiKey"
          :readonly="showable"
          :type="showApiKey ? 'text' : 'password'"
          allow-clear
          placeholder="请输入api_key"
        >
          <template #suffix>
            <a-button
              class="eye-toggle"
              size="small"
              type="text"
              @click.prevent="showApiKey = !showApiKey"
            >
              <component :is="showApiKey ? EyeOutlined : EyeInvisibleOutlined" />
            </a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="secret_key" name="secretKey">
        <a-input
          v-model:value="formData.secretKey"
          :readonly="showable"
          :type="showSecretKey ? 'text' : 'password'"
          allow-clear
          placeholder="请输入secret_key"
        >
          <template #suffix>
            <a-button
              class="eye-toggle"
              size="small"
              type="text"
              @click.prevent="showSecretKey = !showSecretKey"
            >
              <component :is="showSecretKey ? EyeOutlined : EyeInvisibleOutlined" />
            </a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="是否启用代理" name="proxyEnable">
        <a-radio-group v-model:value="formData.proxyEnable" :disabled="showable">
          <a-radio value="1">启用</a-radio>
          <a-radio value="0">禁用</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="兼容 OpenAPI 协议" name="openaiApiCompatible">
        <a-radio-group v-model:value="formData.openaiApiCompatible" :disabled="showable">
          <a-radio value="1">兼容</a-radio>
          <a-radio value="0">不兼容</a-radio>
        </a-radio-group>
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
  import { nextTick, reactive, ref } from 'vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { FormInstance } from 'ant-design-vue'
  import { add, get, update } from '/@/api/ai/model/AiModelPlatformIndex'
  import { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue'

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

  const rules = reactive({
    name: [{ required: true, message: '请输入厂商名称', trigger: ['blur', 'change'] }],
    baseUrl: [{ required: true, message: '请输入 Base URL', trigger: ['blur', 'change'] }],
    apiKey: [{ required: true, message: '请输入 API Key', trigger: ['blur', 'change'] }],
    secretKey: [{ required: true, message: '请输入 Secret Key', trigger: ['blur', 'change'] }],
    proxyEnable: [{ required: true, message: '请选择是否启用代理', trigger: ['change'] }],
    openaiApiCompatible: [
      {
        required: true,
        message: '请选择是否兼容 OpenAPI 协议',
        trigger: ['change'],
      },
    ],
  })

  const formRef = ref<FormInstance>()

  const createDefaultForm = (): AiModelPlatformDTO => ({
    id: '',
    name: '',
    baseUrl: '',
    apiKey: '',
    secretKey: '',
    proxyEnable: '0',
    openaiApiCompatible: '1',
    createTime: '',
    createBy: '',
    updateTime: '',
    updateBy: '',
    tenantId: '',
  })

  const formData = ref<AiModelPlatformDTO>(createDefaultForm())
  const showApiKey = ref(false)
  const showSecretKey = ref(false)

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
          proxyEnable:
            res.proxyEnable === undefined || res.proxyEnable === null
              ? '0'
              : String(res.proxyEnable),
          openaiApiCompatible:
            res.openaiApiCompatible === undefined || res.openaiApiCompatible === null
              ? '1'
              : String(res.openaiApiCompatible),
        }
        showApiKey.value = false
        showSecretKey.value = false
      })
    }
    confirmLoading.value = false
  }

  /**
   * 保存新增或者编辑
   */
  function handleOk() {
    formRef.value?.validate().then(async () => {
      confirmLoading.value = true
      if (formOperationType.value === FormOperationType.ADD) {
        await add(formData.value)
      } else if (formOperationType.value === FormOperationType.EDIT) {
        await update(formData.value)
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
    showApiKey.value = false
    showSecretKey.value = false
    nextTick(() => formRef.value?.clearValidate())
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({
    init,
  })
</script>

<style lang="less" scoped>
  .eye-toggle {
    padding: 0;
    &:hover {
      background: transparent;
    }
  }
</style>
