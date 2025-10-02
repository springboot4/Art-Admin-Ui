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
      <a-form-item label="分段内容" name="segment">
        <a-textarea
          v-model:value="formData.segment"
          :disabled="showable"
          allow-clear
          auto-size
          placeholder="请输入分段内容"
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
  import { nextTick, reactive, Ref, ref } from 'vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { FormInstance } from 'ant-design-vue'
  import { add, get, update } from '/@/api/ai/document/AiDocumentSegmentIndex'
  import { AiDocumentSegmentDTO } from '/@/api/ai/document/AiDocumentSegmentTypes'

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

  const rules = reactive({})

  const formRef = ref<FormInstance>()

  let formData: Ref<AiDocumentSegmentDTO> = ref({
    id: '',
    segment: '',
    datasetId: '',
    documentId: '',
    tenantId: '',
    updateBy: '',
    updateTime: '',
    createBy: '',
    createTime: '',
    segmentType: '',
  })

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
        formData.value = res
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
    formData = ref({
      id: '',
      segment: '',
      datasetId: '',
      documentId: '',
      tenantId: '',
      updateBy: '',
      updateTime: '',
      createBy: '',
      createTime: '',
      segmentType: '',
    })
    nextTick(() => formRef.value?.resetFields())
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({
    init,
  })
</script>

<style lang="less" scoped></style>
