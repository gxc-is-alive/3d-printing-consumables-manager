<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Brand } from '@/stores/brand';
import type { ConsumableType } from '@/stores/consumableType';

export interface FilterValues {
  brandId: string;
  typeId: string;
  color: string;
  isOpened: string;
}

const props = defineProps<{
  brands: Brand[];
  types: ConsumableType[];
  modelValue: FilterValues;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterValues): void;
  (e: 'filter'): void;
  (e: 'clear'): void;
}>();

const localFilters = ref<FilterValues>({ ...props.modelValue });

// Sync with parent
watch(() => props.modelValue, (newVal) => {
  localFilters.value = { ...newVal };
}, { deep: true });

function updateFilter(key: keyof FilterValues, value: string) {
  localFilters.value[key] = value;
  emit('update:modelValue', { ...localFilters.value });
  emit('filter');
}

function clearFilters() {
  localFilters.value = {
    brandId: '',
    typeId: '',
    color: '',
    isOpened: '',
  };
  emit('update:modelValue', { ...localFilters.value });
  emit('clear');
}

const hasActiveFilters = computed(() => {
  return localFilters.value.brandId !== '' ||
    localFilters.value.typeId !== '' ||
    localFilters.value.color !== '' ||
    localFilters.value.isOpened !== '';
});
</script>

<template>
  <div class="consumable-filter">
    <div class="filter-row">
      <div class="filter-item">
        <label>品牌</label>
        <select 
          :value="localFilters.brandId" 
          @change="updateFilter('brandId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">所有品牌</option>
          <option v-for="brand in brands" :key="brand.id" :value="brand.id">
            {{ brand.name }}
          </option>
        </select>
      </div>

      <div class="filter-item">
        <label>类型</label>
        <select 
          :value="localFilters.typeId" 
          @change="updateFilter('typeId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">所有类型</option>
          <option v-for="type in types" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <div class="filter-item">
        <label>开封状态</label>
        <select 
          :value="localFilters.isOpened" 
          @change="updateFilter('isOpened', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部状态</option>
          <option value="true">已开封</option>
          <option value="false">未开封</option>
        </select>
      </div>

      <div class="filter-item color-filter">
        <label>颜色搜索</label>
        <slot name="color-search">
          <input 
            type="text" 
            :value="localFilters.color"
            @input="updateFilter('color', ($event.target as HTMLInputElement).value)"
            placeholder="搜索颜色..."
          />
        </slot>
      </div>

      <div class="filter-actions">
        <button 
          v-if="hasActiveFilters"
          @click="clearFilters" 
          class="btn btn-secondary btn-sm"
        >
          清除筛选
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.consumable-filter {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
}

.filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 150px;
}

.filter-item label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.filter-item select,
.filter-item input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.filter-item select:focus,
.filter-item input:focus {
  outline: none;
  border-color: #4a90d9;
}

.color-filter {
  flex: 1;
  min-width: 200px;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}
</style>
