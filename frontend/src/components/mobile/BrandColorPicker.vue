<script setup lang="ts">
/**
 * 品牌颜色选择器组件
 * 用于在耗材表单中选择或输入颜色
 */
import { ref, watch, computed } from 'vue';
import { useBrandColorStore, type BrandColor } from '@/stores/brandColor';

interface Props {
  brandId: string;
  modelValue: string; // 颜色名称
  colorHex: string; // 颜色代码
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:colorHex', value: string): void;
  (e: 'select', color: BrandColor): void;
}>();

const brandColorStore = useBrandColorStore();

const showPicker = ref(false);
const localColorName = ref(props.modelValue);
const localColorHex = ref(props.colorHex || '#CCCCCC');

// 获取当前品牌的颜色列表
const colors = computed(() => brandColorStore.getColors(props.brandId));

// 是否正在加载
const isLoading = computed(() => brandColorStore.isLoading);

// 品牌变化时加载颜色列表并清空已选颜色
watch(
  () => props.brandId,
  async (newBrandId, oldBrandId) => {
    if (newBrandId && newBrandId !== oldBrandId) {
      // 清空已选颜色
      localColorName.value = '';
      localColorHex.value = '#CCCCCC';
      emit('update:modelValue', '');
      emit('update:colorHex', '#CCCCCC');
      
      // 加载新品牌的颜色列表
      await brandColorStore.fetchColors(newBrandId);
    }
  },
  { immediate: true }
);

// 同步外部值变化
watch(
  () => props.modelValue,
  (newValue) => {
    localColorName.value = newValue;
  }
);

watch(
  () => props.colorHex,
  (newValue) => {
    localColorHex.value = newValue || '#CCCCCC';
  }
);

// 选择颜色
function selectColor(color: BrandColor) {
  localColorName.value = color.colorName;
  localColorHex.value = color.colorHex;
  emit('update:modelValue', color.colorName);
  emit('update:colorHex', color.colorHex);
  emit('select', color);
  showPicker.value = false;
}

// 手动输入颜色名称
function onColorNameInput(value: string) {
  localColorName.value = value;
  emit('update:modelValue', value);
}

// 手动输入颜色代码
function onColorHexInput(value: string) {
  localColorHex.value = value;
  emit('update:colorHex', value);
}

// 打开颜色选择器
function openPicker() {
  if (props.brandId) {
    showPicker.value = true;
  }
}
</script>

<template>
  <div class="brand-color-picker">
    <!-- 颜色名称输入 -->
    <van-field
      :model-value="localColorName"
      label="颜色"
      placeholder="点击选择或输入颜色"
      :disabled="!brandId"
      @update:model-value="onColorNameInput"
      @click="openPicker"
    >
      <template #left-icon>
        <div
          class="color-preview"
          :style="{ backgroundColor: localColorHex }"
        />
      </template>
      <template #right-icon>
        <van-icon name="arrow-down" />
      </template>
    </van-field>

    <!-- 颜色代码输入 -->
    <van-field
      :model-value="localColorHex"
      label="颜色代码"
      placeholder="#CCCCCC"
      :disabled="!brandId"
      @update:model-value="onColorHexInput"
    >
      <template #button>
        <input
          type="color"
          :value="localColorHex"
          class="color-input"
          @input="onColorHexInput(($event.target as HTMLInputElement).value)"
        />
      </template>
    </van-field>

    <!-- 颜色选择弹窗 -->
    <van-popup
      v-model:show="showPicker"
      position="bottom"
      round
      :style="{ height: '50%' }"
    >
      <div class="color-picker-popup">
        <div class="picker-header">
          <span class="picker-title">选择颜色</span>
          <van-icon name="cross" @click="showPicker = false" />
        </div>

        <div class="picker-body">
          <van-loading v-if="isLoading" class="loading" />
          
          <div v-else-if="colors.length === 0" class="empty-state">
            <van-empty description="暂无颜色记录，请手动输入" />
          </div>

          <div v-else class="color-list">
            <div
              v-for="color in colors"
              :key="color.id"
              class="color-item"
              :class="{ active: color.colorName === localColorName }"
              @click="selectColor(color)"
            >
              <div
                class="color-swatch"
                :style="{ backgroundColor: color.colorHex }"
              />
              <span class="color-name">{{ color.colorName }}</span>
              <span class="color-hex">{{ color.colorHex }}</span>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.brand-color-picker {
  width: 100%;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #dcdee0;
  margin-right: 8px;
}

.color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  cursor: pointer;
  background: transparent;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input::-webkit-color-swatch {
  border: 1px solid #dcdee0;
  border-radius: 4px;
}

.color-picker-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f7f8fa;
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.color-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-item:active {
  background: #e8e8e8;
}

.color-item.active {
  background: #e8f5e9;
  border: 1px solid #42b883;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #dcdee0;
  margin-right: 12px;
  flex-shrink: 0;
}

.color-name {
  flex: 1;
  font-size: 14px;
  color: #323233;
}

.color-hex {
  font-size: 12px;
  color: #969799;
  font-family: monospace;
}
</style>
