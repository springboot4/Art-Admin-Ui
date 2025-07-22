<template>
  <div class="node-palette">
    <div class="palette-header">
      <div class="palette-title">
        <span class="title-text">节点组件</span>
        <span class="node-count">{{ totalNodeCount }}</span>
      </div>
      <a-input-search
        v-model:value="searchTerm"
        placeholder="搜索节点..."
        size="small"
        class="search-input"
        allow-clear
      />
    </div>

    <div class="palette-content">
      <a-collapse v-model:activeKey="activeKeys" ghost size="small">
        <a-collapse-panel
          v-for="category in filteredCategories"
          :key="category.key"
          class="category-panel"
        >
          <template #header>
            <div class="category-header">
              <span class="category-name">{{ category.name }}</span>
              <a-badge
                :count="category.nodes.length"
                :number-style="{ backgroundColor: '#f0f0f0', color: '#666' }"
              />
            </div>
          </template>

          <div class="category-nodes">
            <div
              v-for="nodeType in category.nodes"
              :key="nodeType.type"
              class="palette-node"
              :draggable="true"
              @dragstart="onDragStart($event, nodeType)"
              @click="onNodeClick(nodeType)"
            >
              <div class="node-content">
                <div class="node-header">
                  <span class="node-icon">{{ nodeType.icon }}</span>
                  <div class="node-title">{{ nodeType.label }}</div>
                </div>
                <div class="node-description">{{ nodeType.description }}</div>
                <div v-if="nodeType.category" class="node-category">
                  <a-tag size="small" :color="getCategoryColor(nodeType.category)">
                    {{ getCategoryLabel(nodeType.category) }}
                  </a-tag>
                </div>
              </div>

              <!-- 节点预览提示 -->
              <div class="node-preview" v-if="hoveredNode === nodeType.type">
                <div class="preview-header">
                  <span class="preview-icon">{{ nodeType.icon }}</span>
                  <span class="preview-title">{{ nodeType.label }}</span>
                </div>
                <div class="preview-description">{{ nodeType.description }}</div>
                <div class="preview-config" v-if="nodeType.configSchema.length > 0">
                  <div class="config-title">主要配置：</div>
                  <ul class="config-list">
                    <li v-for="field in nodeType.configSchema.slice(0, 3)" :key="field.key">
                      {{ field.label }}
                      <span v-if="field.required" class="required">*</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>

      <!-- 空状态 -->
      <div v-if="filteredCategories.length === 0" class="empty-state">
        <a-empty description="未找到匹配的节点" size="small">
          <template #image>
            <search-outlined style="font-size: 24px; color: #ccc" />
          </template>
        </a-empty>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="palette-footer">
      <a-space size="small">
        <a-tooltip title="收起所有分类">
          <a-button size="small" type="text" @click="collapseAll">
            <template #icon><minus-square-outlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="展开所有分类">
          <a-button size="small" type="text" @click="expandAll">
            <template #icon><plus-square-outlined /></template>
          </a-button>
        </a-tooltip>
        <a-tooltip title="刷新节点列表">
          <a-button size="small" type="text" @click="refreshNodes">
            <template #icon><reload-outlined /></template>
          </a-button>
        </a-tooltip>
      </a-space>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import {
    Collapse,
    CollapsePanel,
    Input,
    Badge,
    Tag,
    Empty,
    Space,
    Button,
    Tooltip,
    message,
  } from 'ant-design-vue'
  import {
    SearchOutlined,
    MinusSquareOutlined,
    PlusSquareOutlined,
    ReloadOutlined,
  } from '@ant-design/icons-vue'
  import { nodeTypeConfigs, NODE_CATEGORIES, getCategoryLabel } from '../../types/nodeTypes'
  import type { NodeType } from '../../types/workflow'

  const ACollapse = Collapse
  const ACollapsePanel = CollapsePanel
  const AInputSearch = Input.Search
  const ABadge = Badge
  const ATag = Tag
  const AEmpty = Empty
  const ASpace = Space
  const AButton = Button
  const ATooltip = Tooltip

  const searchTerm = ref('')
  const activeKeys = ref(['trigger', 'llm', 'knowledge', 'logic', 'output', 'transform', 'api'])
  const hoveredNode = ref<string | null>(null)

  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    if (event.dataTransfer) {
      const dragData = {
        type: nodeType.type,
        label: nodeType.label,
        data: {
          type: nodeType.type,
          icon: nodeType.icon,
          description: nodeType.description,
          config: nodeType.defaultConfig,
        },
      }
      event.dataTransfer.setData('application/vueflow', JSON.stringify(dragData))
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  const onNodeClick = (nodeType: NodeType) => {
    message.info(`点击了 ${nodeType.label} 节点，拖拽到画布中添加`)
  }

  const categories = computed(() =>
    [
      {
        key: 'trigger',
        name: '触发器',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.TRIGGER),
      },
      {
        key: 'llm',
        name: '大模型',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.LLM),
      },
      {
        key: 'knowledge',
        name: '知识库',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.KNOWLEDGE),
      },
      {
        key: 'transform',
        name: '数据转换',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.TRANSFORM),
      },
      {
        key: 'api',
        name: 'API调用',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.API),
      },
      {
        key: 'logic',
        name: '逻辑处理',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.LOGIC),
      },
      {
        key: 'output',
        name: '输出',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.OUTPUT),
      },
      {
        key: 'custom',
        name: '自定义',
        nodes: nodeTypeConfigs.filter((node) => node.category === NODE_CATEGORIES.CUSTOM),
      },
    ].filter((category) => category.nodes.length > 0),
  )

  const filteredCategories = computed(() => {
    if (!searchTerm.value) return categories.value

    return categories.value
      .map((category) => ({
        ...category,
        nodes: category.nodes.filter(
          (node) =>
            node.label.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            node.description.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            node.type.toLowerCase().includes(searchTerm.value.toLowerCase()),
        ),
      }))
      .filter((category) => category.nodes.length > 0)
  })

  const totalNodeCount = computed(() => {
    return nodeTypeConfigs.length
  })

  const getCategoryColor = (category: string): string => {
    const colors = {
      [NODE_CATEGORIES.TRIGGER]: 'green',
      [NODE_CATEGORIES.LLM]: 'blue',
      [NODE_CATEGORIES.KNOWLEDGE]: 'purple',
      [NODE_CATEGORIES.TRANSFORM]: 'orange',
      [NODE_CATEGORIES.API]: 'cyan',
      [NODE_CATEGORIES.LOGIC]: 'geekblue',
      [NODE_CATEGORIES.OUTPUT]: 'red',
      [NODE_CATEGORIES.CUSTOM]: 'volcano',
    }
    return colors[category] || 'default'
  }

  const collapseAll = () => {
    activeKeys.value = []
  }

  const expandAll = () => {
    activeKeys.value = categories.value.map((cat) => cat.key)
  }

  const refreshNodes = () => {
    message.success('节点列表已刷新')
    // 这里可以添加重新加载节点配置的逻辑
  }

  // 鼠标悬停事件
  const handleNodeMouseEnter = (nodeType: string) => {
    hoveredNode.value = nodeType
  }

  const handleNodeMouseLeave = () => {
    hoveredNode.value = null
  }

  onMounted(() => {
    // 为所有节点添加鼠标事件监听
    const nodeElements = document.querySelectorAll('.palette-node')
    nodeElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const nodeType = el.getAttribute('data-node-type')
        if (nodeType) handleNodeMouseEnter(nodeType)
      })
      el.addEventListener('mouseleave', handleNodeMouseLeave)
    })
  })

  onUnmounted(() => {
    // 清理事件监听
    const nodeElements = document.querySelectorAll('.palette-node')
    nodeElements.forEach((el) => {
      el.removeEventListener('mouseenter', handleNodeMouseEnter)
      el.removeEventListener('mouseleave', handleNodeMouseLeave)
    })
  })
</script>

<style lang="less" scoped>
  .node-palette {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 280px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;

    .palette-header {
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      background: #fafafa;
      border-radius: 8px 8px 0 0;

      .palette-title {
        font-size: 16px;
        font-weight: 600;
        color: #262626;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;

        .title-text {
          font-size: 16px;
          font-weight: 600;
          color: #262626;
        }

        .node-count {
          font-size: 14px;
          color: #8c8c8c;
        }
      }

      .search-input {
        width: 100%;
      }
    }

    .palette-content {
      padding: 16px;
      overflow-y: auto;
      height: calc(100% - 100px); /* Adjust based on header height */
    }

    .category-panel {
      :deep(.ant-collapse-header) {
        padding: 12px 16px !important;
        font-weight: 500;
        color: #595959;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;
      }

      :deep(.ant-collapse-content-box) {
        padding: 8px 16px 16px !important;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-weight: 500;
        color: #595959;
        background: #fafafa;
        border-bottom: 1px solid #f0f0f0;

        .category-name {
          font-size: 14px;
        }
      }

      .category-nodes {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }

    .palette-node {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      background-color: #fff;
      cursor: grab;
      border: 1px solid #e8e8e8;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 8px;

      &:hover {
        background-color: #f5f5f5;
        border-color: #d9d9d9;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:active {
        cursor: grabbing;
      }

      .node-content {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .node-header {
          display: flex;
          align-items: center;
          gap: 8px;

          .node-icon {
            font-size: 20px;
            line-height: 1;
            flex-shrink: 0;
          }

          .node-title {
            font-size: 14px;
            font-weight: 500;
            color: #262626;
            line-height: 1.4;
          }
        }

        .node-description {
          font-size: 12px;
          color: #8c8c8c;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .node-category {
          display: flex;
          gap: 8px;
        }
      }

      .node-preview {
        margin-top: 8px;
        padding: 12px;
        border: 1px solid #e8e8e8;
        border-radius: 6px;
        background-color: #f9f9f9;
        font-size: 12px;
        color: #595959;

        .preview-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          .preview-icon {
            font-size: 18px;
            line-height: 1;
            flex-shrink: 0;
          }

          .preview-title {
            font-size: 13px;
            font-weight: 500;
            color: #262626;
          }
        }

        .preview-description {
          margin-bottom: 8px;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .preview-config {
          .config-title {
            font-size: 12px;
            font-weight: 500;
            color: #262626;
            margin-bottom: 8px;
          }

          .config-list {
            list-style: none;
            padding: 0;
            margin: 0;

            .required {
              color: #ff4d4f;
              font-size: 12px;
            }
          }
        }
      }
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .palette-footer {
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
      border-radius: 0 0 8px 8px;
    }
  }

  .node-palette::-webkit-scrollbar {
    width: 6px;
  }

  .node-palette::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .node-palette::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .node-palette::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>
