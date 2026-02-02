<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
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

// 下拉菜单显示状态
const showDropdown = ref(false);
// 当前展开的大类ID
const expandedCategoryId = ref<string | null>(null);
// 容器引用
const containerRef = ref<HTMLElement | null>(null);

// 显示文本
const displayText = computed(() => {
  if (!props.modelValue) return props.placeholder || "请选择类型";
  return typeStore.getTypeDisplayName(props.modelValue);
});

// 切换下拉菜单
function toggleDropdown() {
  if (props.disabled) return;
  showDropdown.value = !showDropdown.value;
  if (!showDropdown.value) {
    expandedCategoryId.value = null;
  }
}

// 点击大类
function onCategoryClick(categoryId: string, hasChildren: boolean) {
  if (hasChildren) {
    // 有子类，展开/收起
    expandedCategoryId.value = expandedCategoryId.value === categoryId ? null : categoryId;
  } else {
    // 没有子类，直接选中大类
    selectType(categoryId);
  }
}

// 选择类型
function selectType(typeId: string) {
  const displayName = typeStore.getTypeDisplayName(typeId);
  emit("update:modelValue", typeId);
  emit("change", typeId, displayName);
  showDropdown.value = false;
  expandedCategoryId.value = null;
}

// 清除选择
function clearSelection(e: Event) {
  e.stopPropagation();
  emit("update:modelValue", null);
  emit("change", null, "");
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showDropdown.value = false;
    expandedCategoryId.value = null;
  }
}

// 加载数据
onMounted(async () => {
  if (typeStore.hierarchy.categories.length === 0) {
    await typeStore.fetchHierarchy();
  }
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

// 监听 modelValue 变化，自动展开对应的大类
watch(() => props.modelValue, (newVal) => {
  if (newVal && showDropdown.value) {
    for (const cat of typeStore.hierarchy.categories) {
      if (cat.id === newVal) {
        expandedCategoryId.value = null;
        return;
      }
      const subtype = cat.children.find((s) => s.id === newVal);
      if (subtype) {
        expandedCategoryId.value = cat.id;
        return;
      }
    }
  }
});
</script>

<template>
  <div 
    ref="containerRef"
    class="type-cascade-selector" 
    :class="{ disabled: disabled, open: showDropdown }"
  >
    <!-- 选择框 -->
    <div class="selector-input" @click="toggleDropdown">
      <span :class="{ placeholder: !modelValue }">{{ displayText }}</span>
      <div class="selector-icons">
        <span v-if="modelValue" class="clear-icon" @click="clearSelection">×</span>
        <span class="arrow-icon" :class="{ open: showDropdown }">▼</span>
      </div>
    </div>

    <!-- 下拉菜单 -->
    <div v-if="showDropdown" class="dropdown-menu">
      <div 
        v-for="category in typeStore.hierarchy.categories" 
        :key="category.id"
        class="category-group"
      >
        <!-- 大类 -->
        <div 
          class="category-item"
          :class="{ 
            selected: modelValue === category.id,
            expanded: expandedCategoryId === category.id,
            'has-children': category.children.length > 0
          }"
          @click="onCategoryClick(category.id, category.children.length > 0)"
        >
          <span class="category-name">{{ category.name }}</span>
          <span v-if="category.children.length > 0" class="expand-icon">
            {{ expandedCategoryId === category.id ? '−' : '+' }}
          </span>
        </div>

        <!-- 小类列表 -->
        <div 
          v-if="expandedCategoryId === category.id && category.children.length > 0"
          class="subtype-list"
        >
          <div
            v-for="subtype in category.children"
            :key="subtype.id"
            class="subtype-item"
            :class="{ selected: modelValue === subtype.id }"
            @click="selectType(subtype.id)"
          >
            {{ subtype.name }}
          </div>
        </div>
      </div>

      <div v-if="typeStore.hierarchy.categories.length === 0" class="empty-tip">
        暂无类型数据
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-cascade-selector {
  position: relative;
  width: 100%;
}

.selector-input {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  min-height: 42px;
  box-sizing: border-box;
}

.selector-input:hover {
  border-color: #4a90d9;
}

.type-cascade-selector.open .selector-input {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.1);
}

.type-cascade-selector.disabled .selector-input {
  background: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.selector-input .placeholder {
  color: #999;
}

.selector-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-icon {
  color: #999;
  font-size: 14px;
  padding: 2px 4px;
  cursor: pointer;
}

.clear-icon:hover {
  color: #666;
}

.arrow-icon {
  color: #999;
  font-size: 10px;
  transition: transform 0.2s;
}

.arrow-icon.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.category-group {
  border-bottom: 1px solid #f0f0f0;
}

.category-group:last-child {
  border-bottom: none;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 500;
  color: #333;
  background: #fafafa;
}

.category-item:hover {
  background: #f0f0f0;
}

.category-item.selected {
  color: #4a90d9;
  background: #e6f4ff;
}

.category-item.expanded {
  background: #f0f0f0;
}

.category-item.has-children {
  cursor: pointer;
}

.expand-icon {
  color: #999;
  font-size: 14px;
  font-weight: bold;
}

.subtype-list {
  background: white;
}

.subtype-item {
  padding: 10px 12px 10px 24px;
  cursor: pointer;
  color: #666;
  border-top: 1px solid #f5f5f5;
}

.subtype-item:hover {
  background: #f5f5f5;
  color: #333;
}

.subtype-item.selected {
  color: #4a90d9;
  background: #e6f4ff;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #999;
}
</style>
