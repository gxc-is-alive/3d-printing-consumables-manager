<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useConsumableTypeStore } from "@/stores/consumableType";

const props = defineProps<{
  modelValue: string | null;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  change: [typeId: string | null, displayName: string];
}>();

const typeStore = useConsumableTypeStore();

const showPicker = ref(false);
const selectedValue = ref<string | number | undefined>(undefined);

// 级联选择器选项
const cascaderOptions = computed(() => {
  return typeStore.hierarchy.categories.map((cat) => ({
    text: cat.name,
    value: cat.id,
    children:
      cat.children.length > 0
        ? cat.children.map((sub) => ({
            text: sub.name,
            value: sub.id,
          }))
        : undefined,
  }));
});

// 显示文本
const displayText = computed(() => {
  if (!props.modelValue) return "";
  return typeStore.getTypeDisplayName(props.modelValue);
});

// 初始化选中值
function initSelectedValue() {
  if (!props.modelValue) {
    selectedValue.value = undefined;
    return;
  }
  selectedValue.value = props.modelValue;
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  () => {
    initSelectedValue();
  }
);

// 监听层级数据变化
watch(
  () => typeStore.hierarchy,
  () => {
    initSelectedValue();
  },
  { deep: true }
);

// 选择完成
function onFinish({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  showPicker.value = false;
  
  if (selectedOptions.length === 0) {
    emit("update:modelValue", null);
    emit("change", null, "");
    return;
  }

  // 获取最后一个选中的值（小类或大类）
  const lastOption = selectedOptions[selectedOptions.length - 1];
  const displayName = selectedOptions.map((o) => o.text).join(" ");

  emit("update:modelValue", lastOption.value);
  emit("change", lastOption.value, displayName);
}

// 清空选择
function onClear() {
  selectedValue.value = undefined;
  emit("update:modelValue", null);
  emit("change", null, "");
}

// 加载数据
onMounted(async () => {
  if (typeStore.hierarchy.categories.length === 0) {
    await typeStore.fetchHierarchy();
  }
  initSelectedValue();
});
</script>

<template>
  <div class="type-cascade-picker">
    <van-field
      :model-value="displayText"
      readonly
      clickable
      :placeholder="placeholder || '请选择类型'"
      :disabled="disabled"
      @click="!disabled && (showPicker = true)"
    >
      <template #right-icon>
        <van-icon
          v-if="modelValue && !disabled"
          name="clear"
          @click.stop="onClear"
        />
        <van-icon v-else name="arrow" />
      </template>
    </van-field>

    <van-popup v-model:show="showPicker" position="bottom" round>
      <van-cascader
        v-model="selectedValue"
        title="选择类型"
        :options="cascaderOptions"
        @close="showPicker = false"
        @finish="onFinish"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.type-cascade-picker {
  width: 100%;
}
</style>
