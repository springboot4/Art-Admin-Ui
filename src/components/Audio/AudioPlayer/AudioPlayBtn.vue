<template>
  <a-tooltip :title="isPlaying ? '暂停' : '播放语音'">
    <a-button
      :type="isPlaying ? 'primary' : 'text'"
      :class="['audio-play-btn', { playing: isPlaying }]"
      :loading="isLoading"
      size="small"
      @click="togglePlay"
    >
      <SoundOutlined v-if="!isPlaying && !isLoading" />
      <PauseCircleOutlined v-else-if="isPlaying" />
    </a-button>
  </a-tooltip>
</template>

<script lang="ts" setup>
  import { ref, computed, onUnmounted } from 'vue'
  import { message } from 'ant-design-vue'
  import { SoundOutlined, PauseCircleOutlined } from '@ant-design/icons-vue'
  import { audioPlayerManager } from './composables/AudioPlayerManager'

  interface Props {
    appId: number
    messageId: string
    content: string
    voice?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    voice: '',
  })

  const isPlaying = ref(false)
  const isLoading = ref(false)

  /**
   * 切换播放状态
   */
  const togglePlay = async () => {
    if (isLoading.value) return

    isLoading.value = true

    try {
      await audioPlayerManager.play(
        {
          appId: props.appId,
          messageId: props.messageId,
          voice: props.voice,
          onStateChange: (playing) => {
            isPlaying.value = playing
          },
          onError: (error) => {
            message.error('播放失败: ' + error.message)
            isPlaying.value = false
          },
        },
        props.content,
      )
    } catch (error: any) {
      message.error('播放失败')
    } finally {
      isLoading.value = false
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    if (isPlaying.value && audioPlayerManager.getCurrentMessageId() === props.messageId) {
      audioPlayerManager.stop()
    }
  })
</script>

<style scoped>
  .audio-play-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .audio-play-btn.playing {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(24, 144, 255, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
    }
  }
</style>
