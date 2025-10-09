<template>
  <a-modal
    v-model:visible="visible"
    :closable="false"
    :footer="null"
    :mask-closable="false"
    :title="null"
    :width="600"
    class="app-settings-modal"
  >
    <template v-if="visible">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-info">
            <h2 class="modal-title">{{ title }}</h2>
            <p class="modal-subtitle">{{ isViewMode ? '详细信息' : '修改设置' }}</p>
          </div>
          <div v-if="formData.name" class="app-preview">
            <div :style="{ backgroundColor: getIconColor() }" class="app-icon">
              {{ getIconCharacter() }}
            </div>
            <div class="app-info">
              <h4 class="app-name">{{ formData.name }}</h4>
            </div>
          </div>
        </div>
        <a-button class="close-btn" size="large" type="text" @click="handleCancel">
          <template #icon>
            <CloseOutlined />
          </template>
        </a-button>
      </div>

      <!-- Modal Content -->
      <div class="modal-content">
        <a-spin :spinning="confirmLoading" tip="处理中...">
          <div class="settings-container">
            <!-- Basic Information Section -->
            <div class="settings-section">
              <a-form
                ref="formRef"
                :disabled="isViewMode"
                :model="formData"
                :rules="rules"
                class="settings-form"
                layout="vertical"
              >
                <a-form-item class="form-item" name="name">
                  <template #label>
                    <span class="form-label">
                      知识库名称
                      <span v-if="!isViewMode" class="required">*</span>
                    </span>
                  </template>
                  <a-input
                    v-model:value="formData.name"
                    :maxlength="50"
                    :readonly="isViewMode"
                    class="form-input"
                    placeholder="知识库名称"
                    show-count
                    size="large"
                  />
                </a-form-item>

                <a-form-item class="form-item" name="description">
                  <template #label>
                    <span class="form-label">知识库描述</span>
                  </template>
                  <a-textarea
                    v-model:value="formData.description"
                    :maxlength="200"
                    :readonly="isViewMode"
                    :rows="3"
                    class="form-textarea"
                    placeholder="描述知识库的用途和功能..."
                    show-count
                  />
                </a-form-item>

                <a-form-item class="form-item" name="embeddingModel">
                  <template #label>
                    <span class="form-label">向量化模型</span>
                  </template>
                  <a-select
                    v-model:value="formData.embeddingModel"
                    :disabled="isViewMode"
                    :loading="modelOptionsLoading"
                    :options="embeddingModelOptions"
                    allow-clear
                    optionFilterProp="label"
                    placeholder="请选择向量化模型"
                    show-search
                    size="large"
                    @change="handleEmbeddingModelChange"
                    @dropdownVisibleChange="(open) => open && loadModelOptions()"
                  />
                </a-form-item>

                <a-form-item class="form-item" name="graphicModel">
                  <template #label>
                    <span class="form-label">图谱抽取模型</span>
                  </template>
                  <a-select
                    v-model:value="formData.graphicModel"
                    :disabled="isViewMode"
                    :loading="modelOptionsLoading"
                    :options="graphicModelOptions"
                    allow-clear
                    optionFilterProp="label"
                    placeholder="请选择图谱抽取模型"
                    show-search
                    size="large"
                    @change="handleGraphicModelChange"
                    @dropdownVisibleChange="(open) => open && loadModelOptions()"
                  />
                </a-form-item>
              </a-form>
            </div>

            <div v-if="isViewMode && formData.createTime" class="settings-section">
              <div class="section-header">
                <h3 class="section-title">
                  <InfoCircleOutlined class="section-icon" />
                  元数据信息
                </h3>
                <p class="section-description">知识库的创建和更新记录</p>
              </div>

              <div class="metadata-grid">
                <div class="metadata-item">
                  <label class="metadata-label">创建时间</label>
                  <span class="metadata-value">{{ formatDateTime(formData.createTime) }}</span>
                </div>
                <div class="metadata-item">
                  <label class="metadata-label">创建者</label>
                  <span class="metadata-value">{{ formData.createBy || '系统' }}</span>
                </div>
                <div class="metadata-item">
                  <label class="metadata-label">更新时间</label>
                  <span class="metadata-value">{{ formatDateTime(formData.updateTime) }}</span>
                </div>
                <div class="metadata-item">
                  <label class="metadata-label">更新者</label>
                  <span class="metadata-value">{{ formData.updateBy || '系统' }}</span>
                </div>
              </div>
            </div>
          </div>
        </a-spin>
      </div>

      <!-- Modal Footer -->
      <div v-if="!isViewMode" class="modal-footer">
        <div class="footer-content">
          <div class="footer-left">
            <a-button size="large" @click="handleCancel">取消</a-button>
          </div>
          <div class="footer-right">
            <a-button :loading="confirmLoading" size="large" type="primary" @click="handleOk">
              <template #icon>
                <SaveOutlined />
              </template>
              保存更改
            </a-button>
          </div>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, nextTick, reactive, ref } from 'vue'
  import { FormInstance, message } from 'ant-design-vue'
  import { CloseOutlined, InfoCircleOutlined, SaveOutlined } from '@ant-design/icons-vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { add, get, update } from '/@/api/ai/dataset/AiDataSetIndex'
  import { AiDatasetsDTO } from '/@/api/ai/dataset/AiDataSetTypes'
  import type { AiModelDTO } from '/@/api/ai/model/AiModelTypes'
  import type { AiModelPlatformDTO } from '/@/api/ai/model/AiModelPlatformTypes'
  import {
    ensureAiModelData,
    findModelByIdOrName,
    formatModelLabel,
  } from '/@/hooks/ai/useAiModelOptions'

  const {
    initFormEditType,
    handleCancel,
    title,
    confirmLoading,
    visible,
    showable,
    formOperationType,
  } = useFormEdit()

  const emits = defineEmits(['ok'])

  const selectedColor = ref('#1890ff')
  const formRef = ref<FormInstance>()

  const isViewMode = computed(() => showable.value)

  const rules = reactive({
    name: [
      { required: true, message: '请输入名称', trigger: 'blur' },
      { min: 1, max: 50, message: '名称长度在1-50个字符', trigger: 'blur' },
    ],
  })

  const modelOptionsLoading = ref(false)
  const allModels = ref<AiModelDTO[]>([])
  const modelPlatformMap = ref<Record<string, AiModelPlatformDTO>>({})

  const embeddingModelOptions = computed(() =>
    buildModelOptions('EMBEDDING', normalizeId(formData.value.embeddingModel)),
  )
  const graphicModelOptions = computed(() => {
    const currentValue = normalizeId(formData.value.graphicModel)
    const options = buildModelOptions('RERANK', currentValue)
    return options.length ? options : buildModelOptions(undefined, currentValue)
  })

  const formData = ref<AiDatasetsDTO>({
    id: '',
    name: '',
    description: '',
    embeddingModel: '',
    embeddingModelProvider: '',
    graphicModel: '',
    graphicModelProvider: '',
  })

  /**
   * 表单初始化
   */
  async function init(id: string, operationType: FormOperationType) {
    initFormEditType(operationType)
    resetForm()
    await loadModelOptions()
    await getInfo(id, operationType)
  }

  /**
   * 获取表单信息
   */
  async function getInfo(id: string, editType: FormOperationType) {
    if ([FormOperationType.EDIT, FormOperationType.SHOW].includes(editType)) {
      confirmLoading.value = true
      try {
        const res = await get(id)
        formData.value = {
          ...formData.value,
          ...res,
          embeddingModel: normalizeId(res.embeddingModel),
          embeddingModelProvider: normalizeId(res.embeddingModelProvider),
          graphicModel: normalizeId(res.graphicModel),
          graphicModelProvider: normalizeId(res.graphicModelProvider),
        }
        alignModelSelections()
      } catch (error) {
        message.error('获取信息失败')
      }
    }
    confirmLoading.value = false
  }

  /**
   * 保存新增或者编辑
   */
  function handleOk() {
    formRef.value?.validate().then(async () => {
      confirmLoading.value = true
      try {
        if (formOperationType.value === FormOperationType.ADD) {
          await add(formData.value)
          message.success('创建成功')
        } else if (formOperationType.value === FormOperationType.EDIT) {
          await update(formData.value)
          message.success('更新成功')
        }

        handleCancel()
        emits('ok')
      } catch (error) {
        message.error('保存失败，请重试')
      } finally {
        confirmLoading.value = false
      }
    })
  }

  /**
   * 重置表单字段
   */
  function resetForm() {
    formData.value = {
      id: '',
      name: '',
      description: '',
      embeddingModel: '',
      embeddingModelProvider: '',
      graphicModel: '',
      graphicModelProvider: '',
    }
    selectedColor.value = '#1890ff'
    nextTick(() => formRef.value?.resetFields())
  }

  /**
   * 获取图标颜色
   */
  function getIconColor() {
    return selectedColor.value
  }

  /**
   * 获取图标字符
   */
  function getIconCharacter() {
    return formData.value.name ? formData.value.name.charAt(0).toUpperCase() : 'A'
  }

  /**
   * 格式化日期时间
   */
  function formatDateTime(dateTime: string) {
    if (!dateTime) return '-'
    return new Date(dateTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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
    syncEmbeddingModel(formData.value.embeddingModel)
    syncGraphicModel(formData.value.graphicModel)
  }

  function handleEmbeddingModelChange(value: string | undefined | null) {
    if (!value) {
      formData.value.embeddingModel = ''
      formData.value.embeddingModelProvider = ''
      return
    }
    syncEmbeddingModel(value)
  }

  function handleGraphicModelChange(value: string | undefined | null) {
    if (!value) {
      formData.value.graphicModel = ''
      formData.value.graphicModelProvider = ''
      return
    }
    syncGraphicModel(value)
  }

  function syncEmbeddingModel(value: unknown) {
    const match = findModelByIdOrName(allModels.value, value)
    if (!match) {
      if (!value) {
        formData.value.embeddingModel = ''
      }
      formData.value.embeddingModelProvider = ''
      return
    }

    formData.value.embeddingModel = normalizeId(match.id)
    formData.value.embeddingModelProvider = normalizeId(match.platform)
  }

  function syncGraphicModel(value: unknown) {
    const match = findModelByIdOrName(allModels.value, value)
    if (!match) {
      if (!value) {
        formData.value.graphicModel = ''
      }
      formData.value.graphicModelProvider = ''
      return
    }

    formData.value.graphicModel = normalizeId(match.id)
    formData.value.graphicModelProvider = normalizeId(match.platform)
  }

  /**
   * 暴露子组件init方法
   */
  defineExpose({ init })
</script>

<style lang="less" scoped>
  :deep(.app-settings-modal) {
    .ant-modal-content {
      overflow: hidden;
      border-radius: 12px;
    }

    .ant-modal-body {
      padding: 0;
      max-height: 85vh;
      overflow-y: auto;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fff;

    .header-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .header-info {
        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #262626;
          margin: 0 0 6px 0;
        }

        .modal-subtitle {
          font-size: 14px;
          color: #8c8c8c;
          margin: 0;
        }
      }

      .app-preview {
        display: flex;
        align-items: center;
        gap: 12px;

        .app-icon {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 20px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .app-info {
          .app-name {
            font-size: 16px;
            font-weight: 600;
            color: #262626;
            margin: 0 0 4px 0;
          }

          .app-type {
            font-size: 12px;
            border: none;
            color: #fff;
          }
        }
      }
    }

    .close-btn {
      color: #8c8c8c;
      border: none;

      &:hover {
        color: #262626;
        background: #f5f5f5;
      }
    }
  }

  .modal-content {
    background: #fafafa;
  }

  .settings-container {
    padding: 12px 16px;
  }

  .settings-section {
    background: #fff;
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;

    .section-header {
      padding: 20px 24px;
      border-bottom: 1px solid #f0f0f0;
      background: #fafafa;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #262626;
        margin: 0 0 4px 0;
        display: flex;
        align-items: center;
        gap: 8px;

        .section-icon {
          color: #1890ff;
        }
      }

      .section-description {
        font-size: 13px;
        color: #8c8c8c;
        margin: 0;
      }
    }

    .settings-form {
      padding: 16px;
    }

    .form-group {
      margin-bottom: 16px;

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #262626;
        margin-bottom: 12px;

        .required {
          color: #ff4d4f;
          margin-left: 4px;
        }
      }

      .icon-setting {
        display: flex;
        align-items: flex-start;
        gap: 24px;

        .current-icon {
          .icon-display {
            width: 64px;
            height: 64px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 24px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        }

        .icon-controls {
          flex: 1;

          .color-picker {
            .picker-label {
              display: block;
              font-size: 13px;
              color: #8c8c8c;
              margin-bottom: 8px;
            }

            .color-options {
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 8px;
              max-width: 240px;

              .color-option {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;

                &:hover {
                  transform: scale(1.1);
                }

                &.selected {
                  border-color: #262626;
                  transform: scale(1.1);
                }
              }
            }
          }
        }
      }
    }

    :deep(.form-item) {
      margin-bottom: 24px;

      .ant-form-item-label {
        padding: 0;

        label {
          font-size: 14px;
          font-weight: 500;
          color: #262626;
        }
      }

      .form-input,
      .form-textarea,
      .form-select {
        border-radius: 6px;
        border: 1px solid #d9d9d9;

        &:focus,
        &:hover {
          border-color: #1890ff;
        }

        &[readonly] {
          background: #f5f5f5;
          color: #8c8c8c;
        }
      }

      .ant-select-disabled {
        background: #f5f5f5;

        .ant-select-selector {
          background: #f5f5f5;
          color: #8c8c8c;
        }
      }
    }

    .metadata-grid {
      padding: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;

      .metadata-item {
        .metadata-label {
          display: block;
          font-size: 13px;
          color: #8c8c8c;
          margin-bottom: 4px;
        }

        .metadata-value {
          font-size: 14px;
          color: #262626;
          font-weight: 500;
        }
      }
    }
  }

  .modal-footer {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    background: #fff;

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .footer-left,
      .footer-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  // Option Content Styles
  :deep(.option-content) {
    display: flex;
    align-items: center;
    gap: 8px;

    .option-icon {
      color: #1890ff;
    }
  }

  :deep(.status-option) {
    display: flex;
    align-items: center;
    gap: 8px;

    .status-icon {
      &.draft {
        color: #fa8c16;
      }

      &.published {
        color: #52c41a;
      }

      &.disabled {
        color: #8c8c8c;
      }
    }
  }

  // Responsive
  @media (max-width: 768px) {
    .modal-header {
      padding: 16px 20px;

      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }
    }

    .settings-container {
      padding: 16px 20px;
    }

    .settings-section {
      .section-header {
        padding: 16px 20px;
      }

      .settings-form {
        padding: 20px;
      }

      .form-group .icon-setting {
        flex-direction: column;
        gap: 16px;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  }
</style>
