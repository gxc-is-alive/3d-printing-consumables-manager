<script setup lang="ts">
/**
 * 统计数据卡片组件
 * 用于仪表盘等页面展示统计数据
 */
interface Props {
  value: string | number;
  label: string;
  icon?: string;
  color?: string;
}

withDefaults(defineProps<Props>(), {
  icon: '',
  color: '#42b883',
});
</script>

<template>
  <div class="stats-card">
    <div v-if="icon" class="stats-icon" :style="{ backgroundColor: color + '15', color }">
      <van-icon :name="icon" size="24" />
    </div>
    <div class="stats-info">
      <div class="stats-value" :style="{ color }">{{ value }}</div>
      <div class="stats-label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.stats-label {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}
</style>
