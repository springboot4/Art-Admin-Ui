<template>
  <BasicModal
    :loading="confirmLoading"
    :mask-closable="showable"
    :title="title"
    :visible="visible"
    v-bind="$attrs"
    @cancel="handleCancel"
  >
    <div v-if="formOperationType === FormOperationType.ADD" style="margin-bottom: 16px">
      <a-upload-dragger
        v-model:fileList="fileList"
        :action="uploadAction"
        :headers="uploadHeader"
        :multiple="false"
        :showUploadList="true"
        name="file"
        @change="handleChange"
        @remove="handleRemove"
      >
        <p class="ant-upload-drag-icon">
          <inbox-outlined />
        </p>
        <p class="ant-upload-text">点击或拖动文件至此区域上传</p>
      </a-upload-dragger>
    </div>
    <div v-if="formOperationType !== FormOperationType.ADD">
      <a-form
        ref="formRef"
        :label-col="labelCol"
        :model="formData"
        :rules="rules"
        :wrapper-col="wrapperCol"
      >
        <a-form-item label="文件名" name="fileName">
          <a-input
            v-model:value="formData.fileName"
            :disabled="showable"
            allow-clear
            placeholder="请输入文件名"
          />
        </a-form-item>
        <a-form-item label="文档标题" name="title">
          <a-input
            v-model:value="formData.title"
            :disabled="showable"
            allow-clear
            placeholder="请输入文档标题"
          />
        </a-form-item>
        <a-form-item label="文档内容" name="content">
          <a-textarea
            v-model:value="formData.content"
            :disabled="showable"
            allow-clear
            auto-size
            placeholder="请输入文档内容"
          />
        </a-form-item>
      </a-form>
    </div>

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
  import { FormInstance, message, type UploadChangeParam } from 'ant-design-vue'
  import { get } from '/@/api/ai/document/AiDocumentIndex'
  import { AiDocumentsDTO } from '/@/api/ai/document/AiDocumentTypes'
  import { InboxOutlined } from '@ant-design/icons-vue'
  import { useUpload } from '/@/hooks/art/useUpload'
  import { document } from '/@/api/ai/dataset/AiDataSetIndex'

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

  const fileList = ref([])

  const { uploadHeader, uploadAction } = useUpload('/system/file/add')

  const fileObj = ref({ bucketName: '', fileName: '', originalFilename: '' })

  const handleChange = (info: UploadChangeParam) => {
    if (info.file.status === 'done') {
      message.info('上传成功!')

      fileObj.value = {
        bucketName: info.file.response.data.bucketName,
        fileName: info.file.response.data.fileName,
        originalFilename: info.file.response.data.originalFilename,
      }

      fileList.value = fileList.value.slice(-1)
    } else if (info.file.status === 'error') {
      message.error('上传失败!')
    }
  }

  const handleRemove = () => {
    fileObj.value = { bucketName: '', fileName: '', originalFilename: '' }
  }

  let formData: Ref<AiDocumentsDTO> = ref({
    id: '',
    datasetId: '',
    bucketName: '',
    fileName: '',
    title: '',
    brief: '',
    content: '',
    embeddingStatus: '',
    embeddingStatusChangeTime: '',
    graphicalStatus: '',
    graphicalStatusChangeTime: '',
    updateBy: '',
    updateTime: '',
    createBy: '',
    createTime: '',
  })

  const datasetId = ref('')

  /**
   * 表单初始化
   */
  function init(id, operationType: FormOperationType) {
    initFormEditType(operationType)
    resetForm()
    getInfo(id, operationType)
    datasetId.value = id
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
    confirmLoading.value = true

    if (formOperationType.value === FormOperationType.ADD) {
      const documentParam = {
        datasetsId: datasetId.value,
        bucketName: fileObj.value.bucketName,
        fileName: fileObj.value.fileName,
        originalFilename: fileObj.value.originalFilename,
        indexTypes: 'EMBEDDING' + ',' + 'GRAPH',
      }
      document(documentParam)
    }

    confirmLoading.value = false
    handleCancel()
    emits('ok')
  }

  /**
   * 重置表单字段
   */
  function resetForm() {
    fileObj.value = { bucketName: '', fileName: '', originalFilename: '' }
    datasetId.value = ''
    fileList.value = []

    formData = ref({
      id: '',
      datasetId: '',
      bucketName: '',
      fileName: '',
      title: '',
      brief: '',
      content: '',
      embeddingStatus: '',
      embeddingStatusChangeTime: '',
      graphicalStatus: '',
      graphicalStatusChangeTime: '',
      updateBy: '',
      updateTime: '',
      createBy: '',
      createTime: '',
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
