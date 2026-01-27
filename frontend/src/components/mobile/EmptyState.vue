<script setup lang="ts">
/**
 * 空状态组件
 * 统一的空数据展示
 */
interface Props {
  image?: 'default' | 'error' | 'network' | 'search';
  description?: string;
  buttonText?: string;
}

withDefaults(defineProps<Props>(), {
  image: 'default',
  description: '暂无数据',
  buttonText: '',
});

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <van-empty :image="image" :description="description">
    <van-button
      v-if="buttonText"
      round
      type="primary"
      size="small"
      @click="$emit('click')"
    >
      {{ buttonText }}
    </van-button>
  </van-empty>
</template>

<style scoped>
:deep(.van-empty) {
  padding: 60px 0;
}

:deep(.van-button--primary) {
  background: #42b883;
  border-color: #42b883;
}
</style>
