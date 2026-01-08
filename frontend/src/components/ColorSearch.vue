<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface ColorOption {
  name: string;
  hex: string | null;
}

const props = defineProps<{
  modelValue: string;
  availableColors?: ColorOption[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'search', value: string): void;
}>();

const searchText = ref(props.modelValue);
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (newVal) => {
  searchText.value = newVal;
});

// Filter available colors based on search text
const filteredColors = computed(() => {
  if (!props.availableColors || !searchText.value) {
    return props.availableColors || [];
  }
  const search = searchText.value.toLowerCase();
  return props.availableColors.filter(c => 
    c.name.toLowerCase().includes(search) ||
    (c.hex && c.hex.toLowerCase().includes(search))
  );
});

// Get unique colors for display
const uniqueColors = computed(() => {
  const seen = new Set<string>();
  return filteredColors.value.filter(c => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});

// Check if current search matches a color with hex
const matchedColor = computed(() => {
  if (!searchText.value || !props.availableColors) return null;
  const search = searchText.value.toLowerCase();
  return props.availableColors.find(c => 
    c.name.toLowerCase() === search && c.hex
  );
});

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  searchText.value = value;
  emit('update:modelValue', value);
  emit('search', value);
  showDropdown.value = true;
}

function selectColor(color: ColorOption) {
  searchText.value = color.name;
  emit('update:modelValue', color.name);
  emit('search', color.name);
  showDropdown.value = false;
}

function handleFocus() {
  if (props.availableColors && props.availableColors.length > 0) {
    showDropdown.value = true;
  }
}

function handleBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

function clearSearch() {
  searchText.value = '';
  emit('update:modelValue', '');
  emit('search', '');
  inputRef.value?.focus();
}
</script>

<template>
  <div class="color-search">
    <div class="search-input-wrapper">
      <span 
        v-if="matchedColor?.hex" 
        class="color-preview"
        :style="{ backgroundColor: matchedColor.hex }"
      ></span>
      <input
        ref="inputRef"
        type="text"
        :value="searchText"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        :placeholder="placeholder || '搜索颜色...'"
        :class="{ 'has-preview': matchedColor?.hex }"
      />
      <button 
        v-if="searchText" 
        @click="clearSearch" 
        class="clear-btn"
        type="button"
      >
        ×
      </button>
    </div>

    <!-- Dropdown with color suggestions -->
    <div 
      v-if="showDropdown && uniqueColors.length > 0" 
      class="color-dropdown"
    >
      <div 
        v-for="color in uniqueColors.slice(0, 10)" 
        :key="color.name"
        class="color-option"
        @mousedown.prevent="selectColor(color)"
      >
        <span 
          class="color-swatch"
          :style="{ backgroundColor: color.hex || '#ccc' }"
        ></span>
        <span class="color-name">{{ color.name }}</span>
        <span v-if="color.hex" class="color-hex">{{ color.hex }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-search {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.color-preview {
  position: absolute;
  left: 8px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.search-input-wrapper input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-input-wrapper input.has-preview {
  padding-left: 36px;
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: #4a90d9;
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.clear-btn:hover {
  color: #666;
}

.color-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 250px;
  overflow-y: auto;
  margin-top: 4px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
}

.color-option:hover {
  background: #f5f5f5;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-name {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
}

.color-hex {
  font-size: 0.8rem;
  color: #999;
  font-family: monospace;
}
</style>
