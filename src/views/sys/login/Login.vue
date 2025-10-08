<template>
  <div :class="prefixCls" class="login-container">
    <!-- 语言选择器 -->
    <div class="absolute right-8 top-8 z-10">
      <AppLocalePicker
        v-if="!sessionTimeout && showLocale"
        :show-text="false"
        class="locale-picker enter-x"
      />
    </div>

    <!-- 移动端 Logo -->
    <div class="mobile-logo xl:hidden">
      <AppLogo :alwaysShowTitle="true" />
    </div>

    <div class="login-wrapper">
      <!-- 左侧品牌区域 -->
      <div class="brand-section hidden xl:flex">
        <div class="brand-content">
          <!-- Logo -->
          <div class="brand-logo enter-x">
            <AppLogo :alwaysShowTitle="true" />
          </div>

          <!-- 主标题 -->
          <div class="brand-title enter-x">
            <h1 class="title-main">大模型应用开发平台</h1>
            <p class="title-sub">{{ title }}</p>
          </div>

          <!-- 特性列表 -->
          <div class="features-list enter-x">
            <div v-for="(feature, index) in features" :key="index" class="feature-item">
              <div class="feature-icon">
                <span :data-icon="feature.icon" class="iconify"></span>
              </div>
              <div class="feature-text">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.desc }}</p>
              </div>
            </div>
          </div>

          <!-- 装饰元素 -->
          <div class="decoration-circles">
            <div class="circle circle-1"></div>
            <div class="circle circle-2"></div>
            <div class="circle circle-3"></div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="form-section">
        <div class="form-container">
          <div :class="`${prefixCls}-form`" class="form-wrapper enter-x">
            <LoginForm />
            <ForgetPasswordForm />
            <RegisterForm />
            <MobileForm />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { computed } from 'vue'
  import { AppLocalePicker, AppLogo } from '/@/components/Application'
  import LoginForm from './LoginForm.vue'
  import ForgetPasswordForm from './ForgetPasswordForm.vue'
  import RegisterForm from './RegisterForm.vue'
  import MobileForm from './MobileForm.vue'
  import { useGlobSetting } from '/@/hooks/setting'
  import { useDesign } from '/@/hooks/web/useDesign'
  import { useLocaleStore } from '/@/store/modules/locale'

  defineProps({
    sessionTimeout: {
      type: Boolean,
    },
  })

  const globSetting = useGlobSetting()
  const { prefixCls } = useDesign('login')
  const localeStore = useLocaleStore()
  const showLocale = localeStore.getShowPicker
  const title = computed(() => globSetting?.title ?? '')

  // 平台特性
  const features = [
    {
      icon: 'carbon:ai-results',
      title: 'AI 应用编排',
      desc: '拖拽式可视化编排，快速构建智能应用',
    },
    {
      icon: 'carbon:document',
      title: '知识库引擎',
      desc: '企业级文档管理，高精度向量检索',
    },
    {
      icon: 'logos:java',
      title: '纯 Java 生态',
      desc: '基于 Spring Cloud，易于扩展维护',
    },
    {
      icon: 'carbon:cloud-service-management',
      title: '微服务架构',
      desc: '模块化设计，支持分布式部署',
    },
    {
      icon: 'carbon:security',
      title: '安全可控',
      desc: '私有化部署，数据安全合规',
    },
    {
      icon: 'carbon:enterprise',
      title: '企业级特性',
      desc: '完整权限体系，支持多租户隔离',
    },
  ]
</script>
<style lang="less" scoped>
  @prefix-cls: ~'@{namespace}-login';
  @logo-prefix-cls: ~'@{namespace}-app-logo';
  @countdown-prefix-cls: ~'@{namespace}-countdown-input';

  // 登录容器
  .login-container {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    overflow: hidden;

    // 背景网格装饰
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    // 光晕装饰
    &::after {
      content: '';
      position: absolute;
      top: -40%;
      right: -10%;
      width: 60%;
      height: 100%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%);
      pointer-events: none;
    }
  }

  // 语言选择器
  .locale-picker {
    :deep(.ant-select-selector) {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(10px);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
    }
  }

  // 移动端 Logo
  .mobile-logo {
    position: absolute;
    top: 2rem;
    left: 2rem;
    z-index: 10;

    :deep(.@{logo-prefix-cls}__title) {
      color: #fff;
      font-size: 20px;
      font-weight: 600;
    }
  }

  // 主包装容器
  .login-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;

    @media (max-width: 1279px) {
      padding: 1rem;
    }
  }

  // 品牌区域
  .brand-section {
    flex: 1;
    max-width: 560px;
    padding-right: 5rem;
    position: relative;
    z-index: 1;

    .brand-content {
      position: relative;
    }

    .brand-logo {
      margin-bottom: 4rem;

      :deep(.@{logo-prefix-cls}) {
        &__title {
          color: #f8fafc;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        img {
          width: 48px;
          height: 48px;
        }
      }
    }

    .brand-title {
      margin-bottom: 3.5rem;

      .title-main {
        font-size: 40px;
        font-weight: 700;
        color: #f8fafc;
        line-height: 1.3;
        margin-bottom: 1rem;
        letter-spacing: -0.02em;
      }

      .title-sub {
        font-size: 18px;
        color: rgba(226, 232, 240, 0.85);
        font-weight: 400;
        margin: 0;
        letter-spacing: -0.01em;
      }
    }

    .features-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.875rem;

      .feature-item {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 8px;
          color: #60a5fa;

          .iconify {
            font-size: 18px;
          }
        }

        .feature-text {
          flex: 1;

          h3 {
            font-size: 14px;
            font-weight: 600;
            color: #f8fafc;
            margin: 0 0 0.25rem 0;
            letter-spacing: -0.01em;
          }

          p {
            font-size: 12px;
            color: rgba(226, 232, 240, 0.7);
            margin: 0;
            line-height: 1.5;
          }
        }
      }
    }

    // 移除浮动圆圈装饰
    .decoration-circles {
      display: none;
    }
  }

  // 表单区域
  .form-section {
    flex: 0 0 auto;
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 2;

    @media (max-width: 1279px) {
      max-width: 100%;
    }

    .form-container {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      border-radius: 16px;
      padding: 2.5rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);

      @media (max-width: 640px) {
        padding: 2rem 1.5rem;
        border-radius: 12px;
      }
    }

    .form-wrapper {
      width: 100%;
    }
  }

  // 暗色模式
  html[data-theme='dark'] {
    .login-container {
      background: linear-gradient(135deg, #0a0f1e 0%, #151b2e 50%, #1e2535 100%);
    }

    .form-container {
      background: rgba(26, 31, 46, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .brand-section {
      .features-list .feature-item {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.06);

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(59, 130, 246, 0.25);
        }
      }
    }
  }
</style>

<style lang="less">
  @prefix-cls: ~'@{namespace}-login';
  @countdown-prefix-cls: ~'@{namespace}-countdown-input';

  .@{prefix-cls} {
    input:not([type='checkbox']) {
      min-width: 360px;

      @media (max-width: @screen-xl) {
        min-width: 320px;
      }

      @media (max-width: @screen-lg) {
        min-width: 280px;
      }

      @media (max-width: @screen-md) {
        min-width: 240px;
      }

      @media (max-width: @screen-sm) {
        min-width: 100%;
      }
    }

    .@{countdown-prefix-cls} input {
      min-width: unset;
    }

    &-sign-in-way {
      .anticon {
        font-size: 22px;
        color: #888;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          color: @primary-color;
          transform: scale(1.1);
        }
      }
    }

    .ant-divider-inner-text {
      font-size: 12px;
      color: @text-color-secondary;
    }
  }
</style>
