<template>
  <div class="markdown-renderer" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { marked } from 'marked'

  interface Props {
    content: string
  }

  const props = defineProps<Props>()

  // 配置 marked
  marked.setOptions({
    gfm: true, // 启用 GitHub 风格的 Markdown
    breaks: true, // 将单个换行符转换为 <br>
    headerIds: true, // 为标题添加 ID
    mangle: false, // 不混淆电子邮件地址
  })

  // 渲染 Markdown
  const renderedHtml = computed(() => {
    if (!props.content) return ''
    try {
      return marked.parse(props.content)
    } catch (error) {
      console.error('Markdown 渲染错误:', error)
      return props.content
    }
  })
</script>

<style lang="less" scoped>
  .markdown-renderer {
    line-height: 1.7;
    color: #262626;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-size: 14px;

    // 标题样式
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
      margin: 14px 0 8px 0;
      font-weight: 600;
      line-height: 1.3;
      color: #111827;

      &:first-child {
        margin-top: 0;
      }
    }

    :deep(h1) {
      font-size: 18px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e5e7eb;
    }

    :deep(h2) {
      font-size: 17px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }

    :deep(h3) {
      font-size: 16px;
    }

    :deep(h4) {
      font-size: 15px;
    }

    :deep(h5) {
      font-size: 14px;
    }

    :deep(h6) {
      font-size: 13px;
      color: #6b7280;
    }

    // 段落样式
    :deep(p) {
      margin: 0 0 12px 0;
      line-height: 1.7;

      &:last-child {
        margin-bottom: 0;
      }
    }

    // 列表样式
    :deep(ul),
    :deep(ol) {
      margin: 0 0 12px 0;
      padding-left: 24px;

      li {
        margin: 4px 0;
        line-height: 1.6;
      }

      ul,
      ol {
        margin: 4px 0;
      }
    }

    :deep(ul) {
      list-style-type: disc;

      ul {
        list-style-type: circle;

        ul {
          list-style-type: square;
        }
      }
    }

    :deep(ol) {
      list-style-type: decimal;
    }

    // 代码样式
    :deep(code) {
      padding: 2px 5px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
      font-size: 0.88em;
      color: #d63384;
      font-weight: 500;
    }

    :deep(pre) {
      margin: 10px 0;
      padding: 14px;
      background: #282c34;
      border-radius: 6px;
      overflow-x: auto;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      position: relative;

      &::-webkit-scrollbar {
        height: 8px;
      }

      &::-webkit-scrollbar-track {
        background: #1e2127;
        border-radius: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 4px;

        &:hover {
          background: #6b7280;
        }
      }

      code {
        padding: 0;
        background: transparent;
        border: none;
        color: #abb2bf;
        font-size: 13px;
        line-height: 1.6;
        font-weight: 400;
        display: block;
      }
    }

    // 引用样式
    :deep(blockquote) {
      margin: 10px 0;
      padding: 10px 14px;
      border-left: 3px solid #3b82f6;
      background: #f0f7ff;
      color: #1e3a8a;
      border-radius: 0 4px 4px 0;
      font-style: italic;

      p {
        margin: 0;
        line-height: 1.6;
      }

      :first-child {
        margin-top: 0;
      }

      :last-child {
        margin-bottom: 0;
      }
    }

    // 链接样式
    :deep(a) {
      color: #3b82f6;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;

      &:hover {
        color: #2563eb;
        border-bottom-color: #3b82f6;
      }
    }

    // 分割线样式
    :deep(hr) {
      margin: 16px 0;
      border: none;
      border-top: 2px solid #e5e7eb;
    }

    // 表格样式
    :deep(table) {
      width: 100%;
      margin: 10px 0;
      border-collapse: collapse;
      border-spacing: 0;
      font-size: 13px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

      th,
      td {
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        text-align: left;
        line-height: 1.5;
      }

      th {
        background: #f8fafc;
        font-weight: 600;
        color: #1e293b;
        border-bottom: 2px solid #cbd5e1;
      }

      tbody tr {
        transition: background-color 0.15s ease;

        &:nth-child(even) {
          background: #f9fafb;
        }

        &:hover {
          background: #f1f5f9;
        }
      }
    }

    // 图片样式
    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    // 强调样式
    :deep(strong) {
      font-weight: 600;
      color: #111827;
    }

    :deep(em) {
      font-style: italic;
      color: #374151;
    }

    // 删除线
    :deep(del) {
      text-decoration: line-through;
      color: #9ca3af;
    }

    // 任务列表
    :deep(input[type='checkbox']) {
      margin-right: 6px;
      cursor: pointer;
    }
  }
</style>
