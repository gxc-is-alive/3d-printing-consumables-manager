<script setup lang="ts">
/**
 * 通用数据卡片组件
 * 用于展示耗材、配件等列表项
 */
interface Props {
  title: string;
  subtitle?: string;
  tag?: string;
  tagType?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  colorBar?: string;
  showWarning?: boolean;
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  tag: '',
  tagType: 'default',
  colorBar: '',
  showWarning: false,
});

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <div class="data-card" @click="$emit('click')">
    <!-- 颜色条 -->
    <div v-if="colorBar" class="color-bar" :style="{ background: colorBar }" />
    
    <div class="card-body">
      <!-- 头部：标题和标签 -->
      <div class="card-header">
        <span class="card-title">{{ title }}</span>
        <van-tag v-if="tag" :type="tagType" size="medium">{{ tag }}</van-tag>
      </div>
      
      <!-- 副标题 -->
      <div v-if="subtitle" class="card-subtitle">{{ subtitle }}</div>
      
      <!-- 自定义内容插槽 -->
      <div class="card-content">
        <slot />
      </div>
      
      <!-- 底部插槽 -->
      <div v-if="$slots.footer" class="card-footer">
        <slot name="footer" />
      </div>
    </div>
    
    <!-- 警告标记 -->
    <van-badge v-if="showWarning" dot class="warning-badge" />
  </div>
</template>

<style scoped>
.data-card {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
}

.color-bar {
  width: 4px;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  padding: 12px 16px;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-subtitle {
  font-size: 13px;
  color: #969799;
  margin-bottom: 8px;
}

.card-content {
  font-size: 14px;
  color: #646566;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f7f8fa;
}

.warning-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

:deep(.van-badge--dot) {
  background: #ee0a24;
}
</style>
