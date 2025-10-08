<template>
  <LoginFormTitle v-show="getShow" class="enter-x" />
  <Form
    v-show="getShow"
    ref="formRef"
    :model="formData"
    :rules="getFormRules"
    class="login-form enter-x"
    @keypress.enter="verifyLogin"
  >
    <FormItem class="form-item enter-x" name="tenant">
      <Input
        v-model:value="formData.tenant"
        :placeholder="t('sys.login.tenant')"
        class="form-input"
        size="large"
      >
        <template #prefix>
          <span
            class="iconify"
            data-icon="carbon:workspace"
            style="font-size: 16px; color: #64748b"
          ></span>
        </template>
      </Input>
    </FormItem>
    <FormItem class="form-item enter-x" name="account">
      <Input
        v-model:value="formData.account"
        :placeholder="t('sys.login.userName')"
        class="form-input"
        size="large"
      >
        <template #prefix>
          <span
            class="iconify"
            data-icon="carbon:user"
            style="font-size: 16px; color: #64748b"
          ></span>
        </template>
      </Input>
    </FormItem>
    <FormItem class="form-item enter-x" name="password">
      <InputPassword
        v-model:value="formData.password"
        :placeholder="t('sys.login.password')"
        class="form-input"
        size="large"
        visibilityToggle
      >
        <template #prefix>
          <span
            class="iconify"
            data-icon="carbon:locked"
            style="font-size: 16px; color: #64748b"
          ></span>
        </template>
      </InputPassword>
    </FormItem>

    <!--    <ARow class="enter-x">-->
    <!--      <ACol :span="12">-->
    <!--        <FormItem>-->
    <!--          &lt;!&ndash; No logic, you need to deal with it yourself 记住我&ndash;&gt;-->
    <!--          &lt;!&ndash;          <Checkbox v-model:checked="rememberMe" size="small">&ndash;&gt;-->
    <!--          &lt;!&ndash;            {{ t('sys.login.rememberMe') }}&ndash;&gt;-->
    <!--          &lt;!&ndash;          </Checkbox>&ndash;&gt;-->
    <!--        </FormItem>-->
    <!--      </ACol>-->
    <!--      <ACol :span="12">-->
    <!--        <FormItem :style="{ 'text-align': 'right' }">-->
    <!--          &lt;!&ndash; No logic, you need to deal with it yourself 忘记密码&ndash;&gt;-->
    <!--          &lt;!&ndash;          <Button type="link" size="small" @click="setLoginState(LoginStateEnum.RESET_PASSWORD)">&ndash;&gt;-->
    <!--          &lt;!&ndash;            {{ t('sys.login.forgetPassword') }}&ndash;&gt;-->
    <!--          &lt;!&ndash;          </Button>&ndash;&gt;-->
    <!--        </FormItem>-->
    <!--      </ACol>-->
    <!--    </ARow>-->

    <FormItem class="form-item enter-x">
      <Button
        :loading="loading"
        block
        class="login-button"
        size="large"
        type="primary"
        @click="verifyLogin"
      >
        {{ t('sys.login.loginButton') }}
      </Button>
    </FormItem>

    <div class="extra-options enter-x">
      <Button
        class="text-link"
        size="small"
        type="text"
        @click="setLoginState(LoginStateEnum.MOBILE)"
      >
        {{ t('sys.login.mobileSignInFormTitle') }}
      </Button>
    </div>

    <a-divider class="divider enter-x">{{ t('sys.login.otherSignIn') }}</a-divider>

    <div class="social-login enter-x">
      <a :href="giteeUrl" class="social-button gitee-button">
        <icon-font type="icon-gitee1" />
        <span>Gitee 登录</span>
      </a>
    </div>
  </Form>

  <Verify
    ref="verify"
    :captchaType="'blockPuzzle'"
    :imgSize="{ width: '330px', height: '155px' }"
    :mode="'pop'"
    @success="verifySuccess"
  />
</template>
<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, unref } from 'vue'
  import { Button, Col, Form, Input, Row } from 'ant-design-vue'
  import LoginFormTitle from './LoginFormTitle.vue'
  import Verify from '/@/components/verifition/Verify.vue'

  import { useI18n } from '/@/hooks/web/useI18n'
  import { useMessage } from '/@/hooks/web/useMessage'

  import { useUserStore } from '/@/store/modules/user'
  import { LoginStateEnum, useFormRules, useFormValid, useLoginState } from './useLogin'
  import { useDesign } from '/@/hooks/web/useDesign'
  import { createFromIconfontCN } from '@ant-design/icons-vue'
  import { findConfiguration } from '/@/api/system/auth'

  const ACol = Col
  const ARow = Row
  const FormItem = Form.Item
  const InputPassword = Input.Password
  const { t } = useI18n()
  const { notification } = useMessage()
  const { prefixCls } = useDesign('login')
  const userStore = useUserStore()

  const { setLoginState, getLoginState } = useLoginState()
  const { getFormRules } = useFormRules()

  const verify = ref()

  const formRef = ref()
  const loading = ref(false)

  const formData = reactive({
    tenant: null,
    account: 'fxz',
    password: '123456',
  })

  const { validForm } = useFormValid(formRef)

  //onKeyStroke('Enter', handleLogin);

  const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN)

  const IconFont = createFromIconfontCN({
    scriptUrl: '//at.alicdn.com/t/c/font_4052295_gmlf56196z.js',
  })

  let giteeUrl = ref('')

  onMounted(() => {
    getConfiguration()
  })

  async function getConfiguration() {
    await findConfiguration().then((res) => {
      giteeUrl.value = `http://art-gateway:9999/auth/gitee/authorize/${res.giteeAppid}?binding=true`
    })
  }

  function verifyLogin() {
    verify.value.show()
  }

  function verifySuccess() {
    handleLogin()
  }

  async function handleLogin() {
    const data = await validForm()
    if (!data) return
    try {
      loading.value = true
      const userInfo = await userStore.login({
        password: data.password,
        username: data.account,
        grant_type: 'password',
        scope: 'server',
        mode: 'message',
      })
      if (userInfo) {
        notification.success({
          message: t('sys.login.loginSuccessTitle'),
          description: `${t('sys.login.loginSuccessDesc')}: ${userInfo.realName}`,
          duration: 3,
        })
      }
    } finally {
      loading.value = false
    }
  }
</script>
<style lang="less" scoped>
  .login-form {
    .form-item {
      margin-bottom: 1.25rem;

      :deep(.ant-input-affix-wrapper),
      :deep(.ant-input) {
        height: 44px;
        border-radius: 8px;
        border: 1px solid rgba(226, 232, 240, 0.6);
        font-size: 14px;
        padding: 0 14px;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.6);

        &:hover {
          border-color: rgba(203, 213, 225, 0.8);
          background: rgba(255, 255, 255, 0.8);
        }

        &:focus,
        &.ant-input-affix-wrapper-focused {
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        .ant-input {
          height: auto;
          border: none;
          padding: 0;
          background: transparent;

          &:focus {
            box-shadow: none;
          }
        }
      }

      :deep(.ant-input-prefix) {
        margin-right: 10px;
      }

      :deep(.ant-input-suffix) {
        margin-left: 0;
        margin-right: 0;
      }

      :deep(.ant-input-password-icon) {
        color: #94a3b8;
        transition: all 0.2s ease;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          color: #3b82f6;
        }

        svg {
          width: 16px;
          height: 16px;
        }
      }

      // 密码输入框特殊处理
      &.ant-input-affix-wrapper-focused,
      &.ant-input-password {
        padding-right: 14px;
      }
    }

    .login-button {
      height: 44px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      background: #3b82f6;
      border: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #2563eb;
        box-shadow: 0 4px 8px rgba(59, 130, 246, 0.25);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }

    .extra-options {
      display: flex;
      justify-content: center;
      margin-top: 1rem;
      margin-bottom: 1.5rem;

      .text-link {
        color: #3b82f6;
        font-size: 13px;
        padding: 0;
        height: auto;

        &:hover {
          color: #2563eb;
        }
      }
    }

    .divider {
      margin: 1.5rem 0;
      color: #94a3b8;
      font-size: 13px;

      :deep(.ant-divider-inner-text) {
        color: #94a3b8;
      }
    }

    .social-login {
      display: flex;
      justify-content: center;

      .social-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 10px 20px;
        border-radius: 8px;
        border: 1px solid rgba(226, 232, 240, 0.6);
        background: rgba(248, 250, 252, 0.6);
        color: #475569;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          border-color: rgba(203, 213, 225, 0.8);
          background: rgba(255, 255, 255, 0.8);
          color: #0f172a;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        :deep(.anticon),
        :deep(svg) {
          font-size: 18px;
        }
      }

      .gitee-button {
        &:hover {
          border-color: #c71d23;
          color: #c71d23;
        }
      }
    }
  }

  // 暗色模式
  html[data-theme='dark'] {
    .login-form {
      .form-item {
        :deep(.ant-input-affix-wrapper),
        :deep(.ant-input) {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: #f8fafc;

          &:hover {
            border-color: rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.08);
          }

          &:focus,
          &.ant-input-affix-wrapper-focused {
            border-color: #3b82f6;
            background: rgba(255, 255, 255, 0.08);
          }
        }

        :deep(.ant-input-prefix .iconify) {
          color: #94a3b8;
        }
      }

      .login-button {
        background: #3b82f6;

        &:hover:not(:disabled) {
          background: #2563eb;
        }
      }

      .divider {
        :deep(.ant-divider-inner-text) {
          color: #64748b;
        }
      }

      .social-login {
        .social-button {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;

          &:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
            color: #f8fafc;
          }
        }
      }
    }
  }
</style>
