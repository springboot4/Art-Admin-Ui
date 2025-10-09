<template>
  <a-modal
    v-model:visible="visible"
    :class="['create-app-modal', { 'step-two': currentStep === 1 }]"
    :closable="false"
    :destroy-on-close="true"
    :footer="null"
    :mask-closable="false"
    :title="null"
    :width="680"
    wrap-class-name="create-app-modal-wrapper"
    @cancel="handleCancel"
  >
    <template v-if="visible">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <div class="icon-container">
              <PlusOutlined />
            </div>
          </div>
          <div class="header-text">
            <h2 class="modal-title">创建知识库</h2>
          </div>
        </div>
        <a-button class="close-btn" size="large" type="text" @click="handleCancel">
          <template #icon>
            <CloseOutlined />
          </template>
        </a-button>
      </div>

      <!-- Progress Steps -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-track">
            <div :style="{ width: currentStep === 0 ? '25%' : '100%' }" class="progress-fill"></div>
          </div>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="modal-content">
        <div v-if="currentStep === 0" class="step-container step-one">
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

        <!-- Step 2: Basic Information -->
        <div v-if="currentStep === 1" class="step-container step-two">
          <div class="form-container">
            <a-form
              ref="formRef"
              :model="formState"
              :rules="rules"
              :scroll-to-first-error="true"
              layout="vertical"
            >
              <a-form-item class="form-item" name="embeddingModel">
                <template #label>
                  <span class="form-label"> Embedding 模型 </span>
                </template>
                <a-select
                  v-model:value="formState.embeddingModel"
                  :loading="modelOptionsLoading"
                  :options="embeddingModelOptions"
                  allow-clear
                  optionFilterProp="label"
                  placeholder="请选择 Embedding 模型"
                  show-search
                  @change="handleEmbeddingModelChange"
                  @dropdownVisibleChange="(open) => open && loadModelOptions()"
                />
              </a-form-item>

              <a-form-item class="form-item" name="graphicModel">
                <template #label>
                  <span class="form-label"> GraphicModel 模型 </span>
                </template>
                <a-select
                  v-model:value="formState.graphicModel"
                  :loading="modelOptionsLoading"
                  :options="graphicModelOptions"
                  allow-clear
                  optionFilterProp="label"
                  placeholder="请选择 Graphic 模型"
                  show-search
                  @change="handleGraphicModelChange"
                  @dropdownVisibleChange="(open) => open && loadModelOptions()"
                />
              </a-form-item>
            </a-form>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <div class="footer-content">
          <div class="footer-left">
            <a-button v-if="currentStep > 0" size="large" @click="prevStep">
              <template #icon>
                <LeftOutlined />
              </template>
              上一步
            </a-button>
          </div>
          <div class="footer-right">
            <a-button size="large" @click="handleCancel">取消</a-button>
            <a-button v-if="currentStep === 0" size="large" type="primary" @click="nextStep">
              下一步
              <template #icon>
                <RightOutlined />
              </template>
            </a-button>
            <a-button
              v-else
              :loading="confirmLoading"
              size="large"
              type="primary"
              @click="handleOk"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              完成
            </a-button>
          </div>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue'
  import { FormInstance, message, type UploadChangeParam } from 'ant-design-vue'
  import {
    CloseOutlined,
    InboxOutlined,
    LeftOutlined,
    PlusOutlined,
    RightOutlined,
  } from '@ant-design/icons-vue'
  import { add, document } from '/@/api/ai/dataset/AiDataSetIndex'
  import { useUpload } from '/@/hooks/art/useUpload'
  import { AiDatasetsDTO } from '/@/api/ai/dataset/AiDataSetTypes'
  import type { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
  import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import {
    ensureAiModelData,
    findModelByIdOrName,
    formatModelLabel,
  } from '/@/hooks/ai/useAiModelOptions'

  const emit = defineEmits(['ok'])

  const fileList = ref([])

  const { uploadHeader, uploadAction } = useUpload('/system/file/add')

  const fileObj = ref({ bucketName: '', fileName: '', originalFilename: '' })

  const visible = ref(false)
  const confirmLoading = ref(false)
  const currentStep = ref(0)
  const selectedType = ref('')
  const selectedColor = ref('#667eea')

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

  const formRef = ref<FormInstance>()
  const formState = reactive<Partial<AiDatasetsDTO>>({
    embeddingModel: '',
    embeddingModelProvider: '',
    graphicModel: '',
    graphicModelProvider: '',
  })

  const rules = {
    embeddingModel: [{ required: true, message: '请选择embeddingModel', trigger: 'blur' }],
    graphicModel: [{ required: true, message: '请选择graphicModel', trigger: 'blur' }],
  }

  const modelOptionsLoading = ref(false)
  const allModels = ref<AiModelDTO[]>([])
  const modelPlatformMap = ref<Record<string, AiModelPlatformDTO>>({})

  const embeddingModelOptions = computed(() =>
    buildModelOptions('EMBEDDING', normalizeId(formState.embeddingModel)),
  )
  const graphicModelOptions = computed(() => {
    const currentValue = normalizeId(formState.graphicModel)
    const options = buildModelOptions('RERANK', currentValue)
    return options.length ? options : buildModelOptions(undefined, currentValue)
  })

  function init() {
    visible.value = true
    currentStep.value = 0
    selectedType.value = ''
    selectedColor.value = '#667eea'
    confirmLoading.value = false
    fileObj.value = { bucketName: '', fileName: '', originalFilename: '' }
    fileList.value = []

    formState.embeddingModel = ''
    formState.embeddingModelProvider = ''
    formState.graphicModel = ''
    formState.graphicModelProvider = ''
    formState.dataSourceType = ''

    formRef.value?.resetFields()
    loadModelOptions()
  }

  function nextStep() {
    currentStep.value++
    if (currentStep.value === 1) {
      loadModelOptions()
    }
  }

  function prevStep() {
    currentStep.value--
  }

  function handleCancel() {
    visible.value = false
    currentStep.value = 0
    selectedType.value = ''
    selectedColor.value = '#667eea'
    confirmLoading.value = false

    fileObj.value = { bucketName: '', fileName: '', originalFilename: '' }

    formState.embeddingModel = ''
    formState.embeddingModelProvider = ''
    formState.graphicModel = ''
    formState.graphicModelProvider = ''
    formState.dataSourceType = ''

    formRef.value?.resetFields()
  }

  async function handleOk() {
    try {
      await formRef.value?.validate()
      confirmLoading.value = true

      alignModelSelections()

      const result = await add(formState as AiDatasetsDTO)
      message.success('知识库创建成功！')

      if (fileObj.value && fileObj.value.bucketName && fileObj.value.fileName) {
        const documentParam = {
          datasetsId: result.id,
          bucketName: fileObj.value.bucketName,
          fileName: fileObj.value.fileName,
          originalFilename: fileObj.value.originalFilename,
          indexTypes: 'EMBEDDING' + ',' + 'GRAPH',
        }
        document(documentParam)
      }

      visible.value = false
      emit('ok', result.id)
    } catch (error) {
      console.error('知识库创建失败:', error)
    } finally {
      confirmLoading.value = false
    }
  }

  function normalizeId(value: unknown) {
    if (value === undefined || value === null) return ''
    return String(value)
  }

  function buildModelOptions(typeFilter?: string, currentValue?: string) {
    if (!allModels.value.length) {
      return []
    }

    const options = allModels.value
      .filter((model) => {
        if (!normalizeId(model.id)) {
          return false
        }
        if (model.enable !== undefined && model.enable !== null && String(model.enable) !== '1') {
          return false
        }
        if (typeFilter && model.type !== typeFilter) {
          return false
        }
        return true
      })
      .map((model) => {
        const value = normalizeId(model.id)
        return {
          value,
          label: formatModelLabel(model, modelPlatformMap.value, value),
        }
      })

    if (currentValue && !options.some((item) => item.value === currentValue)) {
      const fallbackModel = findModelByIdOrName(allModels.value, currentValue)
      const label = fallbackModel
        ? formatModelLabel(fallbackModel, modelPlatformMap.value, currentValue)
        : currentValue
      options.push({ value: currentValue, label })
    }

    return options
  }

  async function loadModelOptions() {
    if (allModels.value.length > 0 || modelOptionsLoading.value) {
      return
    }

    try {
      modelOptionsLoading.value = true
      const { models, platformMap } = await ensureAiModelData()
      allModels.value = models
      modelPlatformMap.value = platformMap
      alignModelSelections()
    } catch (error) {
      console.error('加载模型列表失败', error)
      message.error('加载模型列表失败，请稍后重试')
    } finally {
      modelOptionsLoading.value = false
    }
  }

  function alignModelSelections() {
    syncEmbeddingModel(formState.embeddingModel)
    syncGraphicModel(formState.graphicModel)
  }

  function handleEmbeddingModelChange(value: string | undefined | null) {
    if (!value) {
      formState.embeddingModel = ''
      formState.embeddingModelProvider = ''
      return
    }
    syncEmbeddingModel(value)
  }

  function handleGraphicModelChange(value: string | undefined | null) {
    if (!value) {
      formState.graphicModel = ''
      formState.graphicModelProvider = ''
      return
    }
    syncGraphicModel(value)
  }

  function syncEmbeddingModel(value: unknown) {
    const match = findModelByIdOrName(allModels.value, value)
    if (!match) {
      if (!value) {
        formState.embeddingModel = ''
      }
      formState.embeddingModelProvider = ''
      return
    }

    formState.embeddingModel = normalizeId(match.id)
    formState.embeddingModelProvider = normalizeId(match.platform)
  }

  function syncGraphicModel(value: unknown) {
    const match = findModelByIdOrName(allModels.value, value)
    if (!match) {
      if (!value) {
        formState.graphicModel = ''
      }
      formState.graphicModelProvider = ''
      return
    }

    formState.graphicModel = normalizeId(match.id)
    formState.graphicModelProvider = normalizeId(match.platform)
  }

  defineExpose({ init })
</script>

<style lang="less" scoped>
  :deep(.create-app-modal-wrapper) {
    .ant-modal {
      .ant-modal-content {
        overflow: hidden;
        border-radius: 12px;
        max-height: 85vh;
        overflow-y: auto;
      }

      .ant-modal-body {
        padding: 0;
      }
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f0f0f0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex: 1;

      .header-icon {
        .icon-container {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }

      .header-text {
        .modal-title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .modal-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          line-height: 1.5;
        }
      }
    }

    .close-btn {
      color: rgba(255, 255, 255, 0.8);
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      transition: all 0.2s;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .progress-section {
    padding: 16px 20px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;

    .progress-bar {
      position: relative;

      .progress-track {
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 3px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }
      }
    }
  }

  .modal-content {
    min-height: 280px;
    background: #fff;
  }

  .step-container {
    padding: 16px;

    .step-header {
      text-align: center;
      margin-bottom: 16px;

      .step-title {
        font-size: 20px;
        font-weight: 600;
        color: #262626;
        margin: 0 0 8px 0;
      }

      .step-description {
        font-size: 14px;
        color: #8c8c8c;
        margin: 0;
      }
    }

    &.step-one {
      .app-types-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;

        .app-type-card {
          border: 2px solid #f0f0f0;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: #fff;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              135deg,
              rgba(102, 126, 234, 0.1) 0%,
              rgba(118, 75, 162, 0.1) 100%
            );
            opacity: 0;
            transition: opacity 0.3s;
          }

          &:hover {
            border-color: #667eea;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
            transform: translateY(-2px);

            &::before {
              opacity: 1;
            }

            .card-icon {
              transform: scale(1.05);
            }
          }

          &.selected {
            border-color: #667eea;
            background: #fff;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.16);
            transform: translateY(-2px);

            &::before {
              opacity: 1;
            }

            .card-icon {
              background: linear-gradient(135deg, #667eea, #764ba2);
              transform: scale(1.05);
            }
          }

          .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: linear-gradient(135deg, #f0f0f0, #e8e8e8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8c8c8c;
            font-size: 20px;
            margin-bottom: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }

          .card-content {
            position: relative;
            z-index: 1;

            .card-title {
              font-size: 16px;
              font-weight: 700;
              color: #262626;
              margin: 0 0 8px 0;
              letter-spacing: -0.01em;
            }

            .card-description {
              font-size: 13px;
              color: #595959;
              line-height: 1.5;
              margin: 0 0 10px 0;
            }

            .card-features {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;

              .feature-tag {
                font-size: 11px;
                color: #667eea;
                background: rgba(102, 126, 234, 0.1);
                border: 1px solid rgba(102, 126, 234, 0.2);
                border-radius: 12px;
                padding: 2px 8px;
                font-weight: 500;
                transition: all 0.2s;
              }
            }
          }

          .card-selector {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 2;

            .selector-circle {
              width: 20px;
              height: 20px;
              border: 2px solid #d9d9d9;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

              &.checked {
                border-color: #667eea;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: #fff;
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
              }
            }
          }
        }
      }
    }

    &.step-two {
      .form-container {
        max-width: 560px;
        margin: 0 auto;

        .form-section {
          margin-bottom: 32px;

          .form-label {
            display: block;
            font-size: 15px;
            font-weight: 600;
            color: #262626;
            margin-bottom: 12px;

            .required {
              color: #ff4d4f;
              margin-left: 4px;
            }
          }

          .icon-selector {
            display: flex;
            align-items: flex-start;
            gap: 24px;

            .current-icon {
              .icon-display {
                width: 72px;
                height: 72px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 28px;
                font-weight: 700;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

                &:hover {
                  transform: scale(1.05);
                }
              }
            }

            .icon-options {
              flex: 1;

              .color-palette {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 12px;

                .color-option {
                  width: 36px;
                  height: 36px;
                  border-radius: 8px;
                  cursor: pointer;
                  border: 2px solid transparent;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

                  &:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                  }

                  &.selected {
                    border-color: #262626;
                    transform: scale(1.15);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                  }
                }
              }
            }
          }
        }

        :deep(.ant-form-item) {
          margin-bottom: 28px;

          .ant-form-item-label {
            padding: 0;

            label {
              font-size: 15px;
              font-weight: 600;
              color: #262626;
            }
          }

          .form-input,
          .form-textarea {
            border-radius: 12px;
            border: 2px solid #f0f0f0;
            padding: 12px 16px;
            font-size: 15px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

            &:focus,
            &:hover {
              border-color: #667eea;
              box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            }

            &::placeholder {
              color: #bfbfbf;
            }
          }

          .form-textarea {
            resize: none;
            line-height: 1.6;
          }
        }

        .selected-type-info {
          margin-top: 32px;
          padding: 20px;
          background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.05) 0%,
            rgba(118, 75, 162, 0.05) 100%
          );
          border: 1px solid rgba(102, 126, 234, 0.1);
          border-radius: 12px;

          .type-badge {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #667eea;
            font-size: 15px;
            font-weight: 600;

            .type-icon {
              font-size: 18px;
            }
          }
        }
      }
    }
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .footer-left,
      .footer-right {
        display: flex;
        gap: 12px;

        .ant-btn {
          height: 36px;
          padding: 0 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          &.ant-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;

            &:hover {
              background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
              box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
            }

            &:disabled {
              background: #d9d9d9;
              color: #8c8c8c;
              transform: none;
              box-shadow: none;
            }
          }

          &:not(.ant-btn-primary) {
            border: 2px solid #f0f0f0;
            color: #595959;

            &:hover {
              border-color: #667eea;
              color: #667eea;
            }
          }
        }
      }
    }
  }

  // Responsive
  @media (max-width: 768px) {
    :deep(.ant-modal.create-app-modal) {
      width: 95% !important;
      margin: 20px auto;
    }

    .step-container {
      padding: 24px 16px;

      &.step-one {
        .app-types-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  }
</style>
