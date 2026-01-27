<script setup lang="ts">
/**
 * 表单弹窗组件
 * 统一的新增/编辑表单弹窗
 */
import { ref } from 'vue';

interface Props {
  visible: boolean;
  title: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submit'): void;
  (e: 'cancel'): void;
}>();

const formRef = ref();

function handleClose() {
  emit('update:visible', false);
  emit('cancel');
}

async function handleSubmit() {
  emit('submit');
}

// 暴露表单引用，供父组件调用验证
defineExpose({
  formRef,
});
</script>

<template>
  <van-popup
    :show="visible"
    position="bottom"
    round
    closeable
    close-icon-position="top-left"
    :style="{ height: '90%' }"
    @update:show="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="form-popup">
      <!-- 标题 -->
      <div class="popup-header">
        <h3 class="popup-title">{{ title }}</h3>
      </div>

      <!-- 表单内容 -->
      <div class="popup-body">
        <van-form ref="formRef" @submit="handleSubmit">
          <slot />
        </van-form>
      </div>

      <!-- 底部按钮 -->
      <div class="popup-footer">
        <van-button block type="primary" :loading="loading" @click="handleSubmit">
          确认
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.form-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.popup-header {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #f7f8fa;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.popup-footer {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #f7f8fa;
  background: #fff;
}

:deep(.van-button--primary) {
  background: #42b883;
  border-color: #42b883;
}

:deep(.van-cell) {
  padding: 12px 0;
}

:deep(.van-field__label) {
  width: 80px;
}
</style>
