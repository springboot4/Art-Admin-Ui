<template>
  <div class="login-form-title enter-x">
    <h2 class="title">{{ getFormTitle }}</h2>
    <p class="subtitle">欢迎回来，请登录您的账户</p>
  </div>
</template>
<script lang="ts" setup>
  import { computed, unref } from 'vue'
  import { useI18n } from '/@/hooks/web/useI18n'
  import { LoginStateEnum, useLoginState } from './useLogin'

  const { t } = useI18n()

  const { getLoginState } = useLoginState()

  const getFormTitle = computed(() => {
    const titleObj = {
      [LoginStateEnum.RESET_PASSWORD]: t('sys.login.forgetFormTitle'),
      [LoginStateEnum.LOGIN]: t('sys.login.signInFormTitle'),
      [LoginStateEnum.REGISTER]: t('sys.login.signUpFormTitle'),
      [LoginStateEnum.MOBILE]: t('sys.login.mobileSignInFormTitle'),
    }
    return titleObj[unref(getLoginState)]
  })
</script>
<style lang="less" scoped>
  .login-form-title {
    margin-bottom: 2rem;

    .title {
      font-size: 26px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
      line-height: 1.3;
      letter-spacing: -0.02em;

      @media (max-width: 640px) {
        font-size: 22px;
      }
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
      font-weight: 400;
      line-height: 1.5;
    }
  }

  html[data-theme='dark'] {
    .login-form-title {
      .title {
        color: #f8fafc;
      }

      .subtitle {
        color: #94a3b8;
      }
    }
  }
</style>
