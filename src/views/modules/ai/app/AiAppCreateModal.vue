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
            <h2 class="modal-title">创建新应用</h2>
            <p class="modal-subtitle">选择合适的应用类型，开始构建您的AI解决方案</p>
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
        <!-- Step 1: Application Type Selection -->
        <div v-if="currentStep === 0" class="step-container step-one">
          <div class="app-types-grid">
            <div
              v-for="template in appTemplates"
              :key="template.type"
              :class="{ selected: selectedType === template.type }"
              class="app-type-card"
              @click="handleSelectType(template.type)"
            >
              <div class="card-icon">
                <component :is="template.icon" />
              </div>
              <div class="card-content">
                <h4 class="card-title">{{ template.title }}</h4>
                <p class="card-description">{{ template.description }}</p>
                <div class="card-features">
                  <span v-for="feature in template.features" :key="feature" class="feature-tag">
                    {{ feature }}
                  </span>
                </div>
              </div>
              <div class="card-selector">
                <div :class="{ checked: selectedType === template.type }" class="selector-circle">
                  <CheckOutlined v-if="selectedType === template.type" />
                </div>
              </div>
            </div>
          </div>
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
              <!-- Application Icon -->
              <div class="form-section">
                <label class="form-label">应用图标</label>
                <div class="icon-selector">
                  <div class="current-icon">
                    <div :style="{ backgroundColor: selectedColor }" class="icon-display">
                      {{ formState.name ? formState.name.charAt(0).toUpperCase() : 'A' }}
                    </div>
                  </div>
                  <div class="icon-options">
                    <div class="color-palette">
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

              <!-- Application Name -->
              <a-form-item class="form-item" name="name">
                <template #label>
                  <span class="form-label">
                    应用名称
                    <span class="required">*</span>
                  </span>
                </template>
                <a-input
                  v-model:value="formState.name"
                  :maxlength="50"
                  class="form-input"
                  placeholder="为您的应用起一个有意义的名称"
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
                  v-model:value="formState.description"
                  :maxlength="200"
                  :rows="3"
                  class="form-textarea"
                  placeholder="描述这个应用的用途和功能..."
                  show-count
                />
              </a-form-item>

              <!-- Selected Type Info -->
              <div class="selected-type-info">
                <div class="type-badge">
                  <component :is="getSelectedTemplate()?.icon" class="type-icon" />
                  <span>{{ getSelectedTemplate()?.title }}</span>
                </div>
              </div>
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
            <a-button
              v-if="currentStep === 0"
              :disabled="!selectedType"
              size="large"
              type="primary"
              @click="nextStep"
            >
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
              创建应用
            </a-button>
          </div>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue'
  import { FormInstance, message } from 'ant-design-vue'
  import {
    ApartmentOutlined,
    BranchesOutlined,
    CheckOutlined,
    CloseOutlined,
    CommentOutlined,
    LeftOutlined,
    PlusOutlined,
    RightOutlined,
    RobotOutlined,
    ThunderboltOutlined,
  } from '@ant-design/icons-vue'
  import { add } from '/@/api/ai/app/AiAppIndex'
  import { AiAppDTO } from '/@/api/ai/app/AiAppTypes'

  const emit = defineEmits(['ok'])

  const visible = ref(false)
  const confirmLoading = ref(false)
  const currentStep = ref(0)
  const selectedType = ref('')
  const selectedColor = ref('#667eea')

  const formRef = ref<FormInstance>()
  const formState = reactive<Partial<AiAppDTO>>({
    name: '',
    description: '',
    mode: undefined,
    icon: '',
  })

  const rules = {
    name: [
      { required: true, message: '请输入应用名称', trigger: 'blur' },
      { min: 1, max: 50, message: '应用名称长度在1-50个字符', trigger: 'blur' },
    ],
  }

  const colorPalette = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#f5576c',
    '#4facfe',
    '#00f2fe',
    '#43e97b',
    '#38f9d7',
    '#ffecd2',
    '#fcb69f',
    '#a8edea',
    '#fed6e3',
    '#d299c2',
    '#fef9d7',
    '#667eea',
  ]

  // 应用类型映射
  const appTypeModeMap = {
    chatbot: 'chatbot',
    completion: 'completion',
    agent: 'agent',
    chatflow: 'chatflow',
    workflow: 'workflow',
  }

  const appTemplates = [
    {
      type: 'workflow',
      title: '工作流',
      icon: BranchesOutlined,
      description: '创建自动化工作流程，适用于批处理和后台任务场景',
      features: ['批量处理', '定时任务', '数据管道'],
    },
    {
      type: 'chatflow',
      title: '对话流',
      icon: ApartmentOutlined,
      description: '通过可视化流程设计，构建具有复杂逻辑的对话应用',
      features: ['可视化编排', '条件分支', '上下文管理'],
    },
    {
      type: 'agent',
      title: 'Agent',
      icon: RobotOutlined,
      description: '具备工具调用能力的AI助手，能够自主完成复杂任务',
      features: ['工具调用', '任务规划', '自主决策'],
    },
    // {
    //   type: 'chatbot',
    //   title: '聊天助手',
    //   icon: CommentOutlined,
    //   description: '构建智能对话机器人，提供一对一的个性化交流体验',
    //   features: ['对话记忆', '角色扮演', '客服助手'],
    // },
    // {
    //   type: 'completion',
    //   title: '文本生成',
    //   icon: ThunderboltOutlined,
    //   description: '处理各种文本任务，如翻译、摘要、创作等一次性操作',
    //   features: ['文本转换', '内容生成', '格式处理'],
    // },
  ]

  function init() {
    visible.value = true
    currentStep.value = 0
    selectedType.value = ''
    selectedColor.value = '#667eea'
    confirmLoading.value = false
    formState.name = ''
    formState.description = ''
    formState.mode = undefined
    formState.icon = ''
    formRef.value?.resetFields()
  }

  function getSelectedTemplate() {
    return appTemplates.find((t) => t.type === selectedType.value)
  }

  function handleSelectType(type: string) {
    selectedType.value = type
    formState.mode = appTypeModeMap[type]
  }

  function nextStep() {
    if (selectedType.value) {
      currentStep.value++
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
    formState.name = ''
    formState.description = ''
    formState.mode = undefined
    formState.icon = ''
    formRef.value?.resetFields()
  }

  async function handleOk() {
    try {
      await formRef.value?.validate()
      confirmLoading.value = true

      // Set icon with color
      formState.icon = JSON.stringify({
        type: 'color',
        color: selectedColor.value,
        character: formState.name?.charAt(0).toUpperCase() || 'A',
      })

      const result = await add(formState as AiAppDTO)
      message.success('应用创建成功！')
      visible.value = false
      // 传递创建的应用ID给父组件
      emit('ok', result.id || result.data?.id)
    } catch (error) {
      console.error('创建应用失败:', error)
    } finally {
      confirmLoading.value = false
    }
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
