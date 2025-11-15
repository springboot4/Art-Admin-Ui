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
            <p class="modal-subtitle">{{ isViewMode ? '查看应用详细信息' : '修改应用基础设置' }}</p>
          </div>
          <div v-if="formData.name" class="app-preview">
            <div :style="{ backgroundColor: getIconColor() }" class="app-icon">
              {{ getIconCharacter() }}
            </div>
            <div class="app-info">
              <h4 class="app-name">{{ formData.name }}</h4>
              <a-tag :color="getModeColor(formData.mode)" class="app-type">
                {{ formatMode(formData.mode) }}
              </a-tag>
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
                <!-- Application Icon -->
                <div class="form-group">
                  <label class="form-label">应用图标</label>
                  <div class="icon-setting">
                    <div class="current-icon">
                      <div :style="{ backgroundColor: selectedColor }" class="icon-display">
                        {{ formData.name ? formData.name.charAt(0).toUpperCase() : 'A' }}
                      </div>
                    </div>
                    <div v-if="!isViewMode" class="icon-controls">
                      <div class="color-picker">
                        <span class="picker-label">选择颜色</span>
                        <div class="color-options">
                          <div
                            v-for="color in colorPalette"
                            :key="color"
                            :class="{ selected: selectedColor === color }"
                            :style="{ backgroundColor: color }"
                            class="color-option"
                            @click="selectedColor = color"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Application Name -->
                <a-form-item class="form-item" name="name">
                  <template #label>
                    <span class="form-label">
                      应用名称
                      <span v-if="!isViewMode" class="required">*</span>
                    </span>
                  </template>
                  <a-input
                    v-model:value="formData.name"
                    :maxlength="50"
                    :readonly="isViewMode"
                    class="form-input"
                    placeholder="应用名称"
                    show-count
                    size="large"
                  />
                </a-form-item>

                <!-- Application Description -->
                <a-form-item class="form-item" name="description">
                  <template #label>
                    <span class="form-label">应用描述</span>
                  </template>
                  <a-textarea
                    v-model:value="formData.description"
                    :maxlength="200"
                    :readonly="isViewMode"
                    :rows="3"
                    class="form-textarea"
                    placeholder="描述这个应用的用途和功能..."
                    show-count
                  />
                </a-form-item>

                <!-- Application Type -->
                <a-form-item class="form-item" name="mode">
                  <template #label>
                    <span class="form-label">
                      应用类型
                      <span v-if="!isViewMode" class="required">*</span>
                    </span>
                  </template>
                  <a-select
                    v-model:value="formData.mode"
                    :disabled="true"
                    class="form-select"
                    placeholder="选择应用类型"
                    size="large"
                  >
                    <a-select-option value="chatbot">
                      <div class="option-content">
                        <CommentOutlined class="option-icon" />
                        <span>聊天助手</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="completion">
                      <div class="option-content">
                        <ThunderboltOutlined class="option-icon" />
                        <span>文本生成</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="agent">
                      <div class="option-content">
                        <RobotOutlined class="option-icon" />
                        <span>Agent</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="chatflow">
                      <div class="option-content">
                        <ApartmentOutlined class="option-icon" />
                        <span>对话流</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="workflow">
                      <div class="option-content">
                        <BranchesOutlined class="option-icon" />
                        <span>工作流</span>
                      </div>
                    </a-select-option>
                  </a-select>
                </a-form-item>

                <!-- Application Status -->
                <a-form-item v-if="formOperationType !== 'ADD'" class="form-item" name="status">
                  <template #label>
                    <span class="form-label">
                      应用状态
                      <span v-if="!isViewMode" class="required">*</span>
                    </span>
                  </template>
                  <a-select
                    v-model:value="formData.status"
                    :disabled="true"
                    class="form-select"
                    placeholder="选择应用状态"
                    size="large"
                  >
                    <a-select-option value="draft">
                      <div class="status-option">
                        <EditOutlined class="status-icon draft" />
                        <span>草稿</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="published">
                      <div class="status-option">
                        <CheckCircleOutlined class="status-icon published" />
                        <span>已发布</span>
                      </div>
                    </a-select-option>
                    <a-select-option value="disabled">
                      <div class="status-option">
                        <StopOutlined class="status-icon disabled" />
                        <span>已停用</span>
                      </div>
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-form>
            </div>

            <!-- Metadata Section (View Mode Only) -->
            <div v-if="isViewMode && formData.createTime" class="settings-section">
              <div class="section-header">
                <h3 class="section-title">
                  <InfoCircleOutlined class="section-icon" />
                  元数据信息
                </h3>
                <p class="section-description">应用的创建和更新记录</p>
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
  import {
    ApartmentOutlined,
    BranchesOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    CommentOutlined,
    EditOutlined,
    InfoCircleOutlined,
    RobotOutlined,
    SaveOutlined,
    StopOutlined,
    ThunderboltOutlined,
  } from '@ant-design/icons-vue'
  import useFormEdit from '/@/hooks/art/useFormEdit'
  import { FormOperationType } from '/@/enums/formOperationType'
  import { add, get, update } from '/@/api/ai/app/AiAppIndex'
  import { AiAppDTO } from '/@/api/ai/app/AiAppTypes'

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

  const colorPalette = [
    '#1890ff',
    '#722ed1',
    '#13c2c2',
    '#52c41a',
    '#fa8c16',
    '#f5222d',
    '#eb2f96',
    '#096dd9',
    '#389e0d',
    '#d48806',
    '#8c8c8c',
    '#262626',
    '#fa541c',
    '#2f54eb',
    '#73d13d',
  ]

  const rules = reactive({
    name: [
      { required: true, message: '请输入应用名称', trigger: 'blur' },
      { min: 1, max: 50, message: '应用名称长度在1-50个字符', trigger: 'blur' },
    ],
    mode: [{ required: true, message: '请选择应用类型', trigger: 'change' }],
  })

  const formData = ref<AiAppDTO>({
    id: '',
    name: '',
    description: '',
    mode: '',
    icon: '',
    status: '',
    createTime: '',
    createBy: '',
    updateTime: '',
    updateBy: '',
    tenantId: '',
  })

  /**
   * 表单初始化
   */
  function init(id: string, operationType: FormOperationType) {
    initFormEditType(operationType)
    resetForm()
    getInfo(id, operationType)
  }

  /**
   * 获取表单信息
   */
  async function getInfo(id: string, editType: FormOperationType) {
    if ([FormOperationType.EDIT, FormOperationType.SHOW].includes(editType)) {
      confirmLoading.value = true
      try {
        const res = await get(id)
        formData.value = res

        // 解析图标信息
        if (res.icon) {
          try {
            const iconData = JSON.parse(res.icon)
            if (iconData.color) {
              selectedColor.value = iconData.color
            }
          } catch (e) {
            // 忽略解析错误，使用默认颜色
          }
        }
      } catch (error) {
        message.error('获取应用信息失败')
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
        // 设置图标信息
        formData.value.icon = JSON.stringify({
          type: 'color',
          color: selectedColor.value,
          character: formData.value.name?.charAt(0).toUpperCase() || 'A',
        })

        if (formOperationType.value === FormOperationType.ADD) {
          await add(formData.value)
          message.success('应用创建成功')
        } else if (formOperationType.value === FormOperationType.EDIT) {
          await update(formData.value)
          message.success('应用更新成功')
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
      mode: '',
      icon: '',
      status: '',
      createTime: '',
      createBy: '',
      updateTime: '',
      updateBy: '',
      tenantId: '',
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
   * 格式化应用类型
   */
  function formatMode(mode: string) {
    const map = {
      chatbot: '聊天助手',
      completion: '文本生成',
      agent: 'Agent',
      chatflow: '对话流',
      workflow: '工作流',
    }
    return map[mode] || mode
  }

  /**
   * 获取应用类型颜色
   */
  function getModeColor(mode: string) {
    const colors = {
      chatbot: '#1890ff',
      completion: '#52c41a',
      agent: '#722ed1',
      chatflow: '#fa8c16',
      workflow: '#13c2c2',
    }
    return colors[mode] || '#d9d9d9'
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
