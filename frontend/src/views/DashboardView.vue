<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useDashboardStore } from "@/stores/dashboard";
import { useBrandStore } from "@/stores/brand";
import { useConsumableTypeStore } from "@/stores/consumableType";
import { useAccessoryStore } from "@/stores/accessory";
import ColorSearch from "@/components/ColorSearch.vue";

const router = useRouter();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const brandStore = useBrandStore();
const typeStore = useConsumableTypeStore();
const accessoryStore = useAccessoryStore();

const activeTab = ref<"brand" | "type" | "color">("brand");

// Filter state for dashboard
const filterBrandId = ref('');
const filterTypeIds = ref<string[]>([]);
const filterColor = ref('');

// 类型筛选下拉状态
const showTypeFilter = ref(false);
const typeFilterRef = ref<HTMLElement | null>(null);

// 类型筛选：展开的大类
const expandedFilterCategories = ref<Set<string>>(new Set());

// 切换大类展开
function toggleFilterCategory(categoryId: string) {
  if (expandedFilterCategories.value.has(categoryId)) {
    expandedFilterCategories.value.delete(categoryId);
  } else {
    expandedFilterCategories.value.add(categoryId);
  }
}

// 切换选中某个类型（大类或小类）
function toggleTypeSelection(typeId: string, isCategory: boolean, category?: { id: string; children: { id: string }[] }) {
  const ids = filterTypeIds.value;
  if (isCategory && category) {
    // 点击大类：选中/取消该大类及其所有小类
    const allIds = [category.id, ...category.children.map(c => c.id)];
    const allSelected = allIds.every(id => ids.includes(id));
    if (allSelected) {
      filterTypeIds.value = ids.filter(id => !allIds.includes(id));
    } else {
      const newIds = new Set([...ids, ...allIds]);
      filterTypeIds.value = Array.from(newIds);
    }
  } else {
    // 点击小类：单独切换
    const idx = ids.indexOf(typeId);
    if (idx >= 0) {
      filterTypeIds.value = ids.filter(id => id !== typeId);
    } else {
      filterTypeIds.value = [...ids, typeId];
    }
  }
}

// 是否选中
function isTypeSelected(typeId: string): boolean {
  return filterTypeIds.value.includes(typeId);
}

// 大类是否全选
function isCategoryAllSelected(category: { id: string; children: { id: string }[] }): boolean {
  const allIds = [category.id, ...category.children.map(c => c.id)];
  return allIds.every(id => filterTypeIds.value.includes(id));
}

// 大类是否部分选中
function isCategoryPartialSelected(category: { id: string; children: { id: string }[] }): boolean {
  const allIds = [category.id, ...category.children.map(c => c.id)];
  const selectedCount = allIds.filter(id => filterTypeIds.value.includes(id)).length;
  return selectedCount > 0 && selectedCount < allIds.length;
}

// 筛选显示文本
const typeFilterDisplayText = computed(() => {
  if (filterTypeIds.value.length === 0) return '所有类型';
  return `已选 ${filterTypeIds.value.length} 个类型`;
});

// 点击外部关闭
function handleTypeFilterClickOutside(e: MouseEvent) {
  if (typeFilterRef.value && !typeFilterRef.value.contains(e.target as Node)) {
    showTypeFilter.value = false;
  }
}

onMounted(async () => {
  document.addEventListener('click', handleTypeFilterClickOutside);
  await Promise.all([
    dashboardStore.fetchAll(),
    brandStore.fetchBrands(),
    typeStore.fetchTypes(),
    typeStore.fetchHierarchy(),
    accessoryStore.fetchAlerts(),
  ]);
});

onUnmounted(() => {
  document.removeEventListener('click', handleTypeFilterClickOutside);
});

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}

function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(2)} kg`;
  }
  return `${weight.toFixed(0)} g`;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

function getPercentage(remaining: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((remaining / total) * 100);
}

function getProgressColor(percent: number): string {
  if (percent <= 20) return "#f56c6c";
  if (percent <= 50) return "#e6a23c";
  return "#67c23a";
}

const usagePercentage = computed(() => {
  if (!dashboardStore.stats) return 0;
  const { totalWeight, totalRemainingWeight } = dashboardStore.stats;
  if (totalWeight === 0) return 0;
  return Math.round((totalRemainingWeight / totalWeight) * 100);
});

// Available colors for color search
const availableColors = computed(() => {
  if (!dashboardStore.inventory) return [];
  return dashboardStore.inventory.byColor.map(c => ({
    name: c.color,
    hex: c.colorHex,
  }));
});

// Filtered inventory data
const filteredByBrand = computed(() => {
  if (!dashboardStore.inventory) return [];
  let items = dashboardStore.inventory.byBrand;
  if (filterBrandId.value) {
    items = items.filter(item => item.brandId === filterBrandId.value);
  }
  return items;
});

const filteredByType = computed(() => {
  if (!dashboardStore.inventory) return [];
  let items = dashboardStore.inventory.byType;
  if (filterTypeIds.value.length > 0) {
    items = items.filter(item => 
      filterTypeIds.value.includes(item.typeId) ||
      (item.parentId && filterTypeIds.value.includes(item.parentId))
    );
  }
  return items;
});

const filteredByColor = computed(() => {
  if (!dashboardStore.inventory) return [];
  let items = dashboardStore.inventory.byColor;
  if (filterColor.value) {
    const search = filterColor.value.toLowerCase();
    items = items.filter(item => 
      item.color.toLowerCase().includes(search) ||
      (item.colorHex && item.colorHex.toLowerCase().includes(search))
    );
  }
  return items;
});

function clearDashboardFilters() {
  filterBrandId.value = '';
  filterTypeIds.value = [];
  filterColor.value = '';
}

const hasActiveFilters = computed(() => {
  return filterBrandId.value !== '' || filterTypeIds.value.length > 0 || filterColor.value !== '';
});
</script>

<template>
  <div class="dashboard">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回</router-link>
        <h1>库存仪表盘</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <!-- Loading State -->
      <div v-if="dashboardStore.isLoading" class="loading">加载中...</div>

      <!-- Error State -->
      <div v-else-if="dashboardStore.error" class="error-message">
        {{ dashboardStore.error }}
        <button @click="dashboardStore.fetchAll()" class="retry-btn">
          重试
        </button>
      </div>

      <!-- Dashboard Content -->
      <template v-else-if="dashboardStore.stats && dashboardStore.inventory">
        <!-- Stats Overview -->
        <section class="stats-overview">
          <div class="stat-card">
            <div class="stat-value">
              {{ dashboardStore.stats.totalConsumables }}
            </div>
            <div class="stat-label">耗材总数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              {{ formatWeight(dashboardStore.stats.totalRemainingWeight) }}
            </div>
            <div class="stat-label">剩余总量</div>
            <div class="stat-sub">
              / {{ formatWeight(dashboardStore.stats.totalWeight) }}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              {{ formatCurrency(dashboardStore.stats.totalSpending) }}
            </div>
            <div class="stat-label">总支出</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">
              {{ dashboardStore.stats.openedCount }} /
              {{ dashboardStore.stats.unopenedCount }}
            </div>
            <div class="stat-label">已开封 / 未开封</div>
          </div>
        </section>

        <!-- Overall Usage Progress -->
        <section class="usage-section">
          <h2>总体使用情况</h2>
          <div class="progress-container">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: `${usagePercentage}%`,
                  backgroundColor: getProgressColor(usagePercentage),
                }"
              ></div>
            </div>
            <span class="progress-text">{{ usagePercentage }}% 剩余</span>
          </div>
        </section>

        <!-- Low Stock Alerts -->
        <section
          v-if="dashboardStore.stats.lowStockItems.length > 0"
          class="low-stock-section"
        >
          <h2>⚠️ 低库存警告</h2>
          <div class="low-stock-list">
            <div
              v-for="item in dashboardStore.stats.lowStockItems"
              :key="item.id"
              class="low-stock-item"
            >
              <div class="item-info">
                <span class="item-brand">{{ item.brandName }}</span>
                <span class="item-type">{{ item.typeName }}</span>
                <span class="item-color">{{ item.color }}</span>
              </div>
              <div class="item-stock">
                <span class="remaining">{{
                  formatWeight(item.remainingWeight)
                }}</span>
                <span class="percent">({{ item.percentRemaining }}%)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Accessory Alerts -->
        <section
          v-if="accessoryStore.alerts.length > 0"
          class="accessory-alerts-section"
        >
          <h2>🔩 配件提醒</h2>
          <div class="accessory-alerts-list">
            <div
              v-for="alert in accessoryStore.alerts"
              :key="alert.id"
              class="accessory-alert-item"
              :class="alert.type"
            >
              <div class="alert-info">
                <span class="alert-name">{{ alert.name }}</span>
                <span class="alert-category">{{ alert.categoryName }}</span>
              </div>
              <div class="alert-message">
                <span v-if="alert.type === 'replacement_due'" class="replacement-alert">
                  ⏰ 已超期 {{ alert.daysOverdue }} 天需更换
                </span>
                <span v-else-if="alert.type === 'low_stock'" class="stock-alert">
                  📦 库存不足 (剩余 {{ alert.remainingQty }} / 阈值 {{ alert.threshold }})
                </span>
              </div>
            </div>
          </div>
          <router-link to="/accessories" class="view-accessories-link">
            查看配件管理 →
          </router-link>
        </section>

        <!-- Inventory by Category -->
        <section class="inventory-section">
          <div class="section-header">
            <h2>库存分布</h2>
            <div class="tab-buttons">
              <button
                :class="{ active: activeTab === 'brand' }"
                @click="activeTab = 'brand'"
              >
                按品牌
              </button>
              <button
                :class="{ active: activeTab === 'type' }"
                @click="activeTab = 'type'"
              >
                按类型
              </button>
              <button
                :class="{ active: activeTab === 'color' }"
                @click="activeTab = 'color'"
              >
                按颜色
              </button>
            </div>
          </div>

          <!-- Dashboard Filters -->
          <div class="dashboard-filters">
            <div v-if="activeTab === 'brand'" class="filter-item">
              <label>筛选品牌</label>
              <select v-model="filterBrandId">
                <option value="">所有品牌</option>
                <option v-for="brand in brandStore.brands" :key="brand.id" :value="brand.id">
                  {{ brand.name }}
                </option>
              </select>
            </div>
            <div v-if="activeTab === 'type'" class="filter-item type-filter-item" ref="typeFilterRef">
              <label>筛选类型</label>
              <div class="type-cascade-filter">
                <div class="type-filter-trigger" @click.stop="showTypeFilter = !showTypeFilter">
                  <span :class="{ placeholder: filterTypeIds.length === 0 }">{{ typeFilterDisplayText }}</span>
                  <span class="trigger-arrow" :class="{ open: showTypeFilter }">▾</span>
                </div>
                <div v-if="showTypeFilter" class="type-filter-dropdown" @click.stop>
                  <div v-for="cat in typeStore.hierarchy.categories" :key="cat.id" class="filter-category">
                    <div class="filter-category-header" @click="toggleFilterCategory(cat.id)">
                      <input
                        type="checkbox"
                        :checked="isCategoryAllSelected(cat)"
                        :indeterminate="isCategoryPartialSelected(cat)"
                        @click.stop="toggleTypeSelection(cat.id, true, cat)"
                      />
                      <span class="category-name">{{ cat.name }}</span>
                      <span class="expand-icon" :class="{ expanded: expandedFilterCategories.has(cat.id) }">▸</span>
                    </div>
                    <div v-if="expandedFilterCategories.has(cat.id) && cat.children.length > 0" class="filter-subtypes">
                      <label v-for="sub in cat.children" :key="sub.id" class="filter-subtype-item">
                        <input
                          type="checkbox"
                          :checked="isTypeSelected(sub.id)"
                          @change="toggleTypeSelection(sub.id, false)"
                        />
                        <span>{{ sub.name }}</span>
                      </label>
                    </div>
                  </div>
                  <div v-if="filterTypeIds.length > 0" class="filter-actions">
                    <button class="clear-type-filter-btn" @click="filterTypeIds = []; showTypeFilter = false;">清除选择</button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="activeTab === 'color'" class="filter-item color-filter-item">
              <label>搜索颜色</label>
              <ColorSearch
                v-model="filterColor"
                :available-colors="availableColors"
                placeholder="输入颜色名称或代码..."
              />
            </div>
            <button 
              v-if="hasActiveFilters"
              @click="clearDashboardFilters" 
              class="clear-filter-btn"
            >
              清除筛选
            </button>
          </div>

          <!-- By Brand -->
          <div v-if="activeTab === 'brand'" class="inventory-grid">
            <div
              v-for="item in filteredByBrand"
              :key="item.brandId"
              class="inventory-card"
            >
              <div class="card-header">
                <h3>{{ item.brandName }}</h3>
                <span class="count">{{ item.count }} 卷</span>
              </div>
              <div class="card-body">
                <div class="weight-info">
                  <span class="remaining-weight">{{
                    formatWeight(item.totalRemainingWeight)
                  }}</span>
                  <span class="total-weight"
                    >/ {{ formatWeight(item.totalWeight) }}</span
                  >
                </div>
                <div class="progress-bar small">
                  <div
                    class="progress-fill"
                    :style="{
                      width: `${getPercentage(item.totalRemainingWeight, item.totalWeight)}%`,
                      backgroundColor: getProgressColor(
                        getPercentage(item.totalRemainingWeight, item.totalWeight)
                      ),
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              v-if="filteredByBrand.length === 0"
              class="empty-state"
            >
              暂无数据
            </div>
          </div>

          <!-- By Type -->
          <div v-if="activeTab === 'type'" class="inventory-grid">
            <div
              v-for="item in filteredByType"
              :key="item.typeId"
              class="inventory-card"
            >
              <div class="card-header">
                <div class="type-header">
                  <span v-if="item.parentName" class="parent-type-tag">{{ item.parentName }}</span>
                  <h3>{{ item.typeName }}</h3>
                </div>
                <span class="count">{{ item.count }} 卷</span>
              </div>
              <div class="card-body">
                <div class="weight-info">
                  <span class="remaining-weight">{{
                    formatWeight(item.totalRemainingWeight)
                  }}</span>
                  <span class="total-weight"
                    >/ {{ formatWeight(item.totalWeight) }}</span
                  >
                </div>
                <div class="progress-bar small">
                  <div
                    class="progress-fill"
                    :style="{
                      width: `${getPercentage(item.totalRemainingWeight, item.totalWeight)}%`,
                      backgroundColor: getProgressColor(
                        getPercentage(item.totalRemainingWeight, item.totalWeight)
                      ),
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              v-if="filteredByType.length === 0"
              class="empty-state"
            >
              暂无数据
            </div>
          </div>

          <!-- By Color -->
          <div v-if="activeTab === 'color'" class="inventory-grid">
            <div
              v-for="item in filteredByColor"
              :key="item.color"
              class="inventory-card"
            >
              <div class="card-header">
                <div class="color-header">
                  <span
                    v-if="item.colorHex"
                    class="color-swatch"
                    :style="{ backgroundColor: item.colorHex }"
                  ></span>
                  <h3>{{ item.color }}</h3>
                </div>
                <span class="count">{{ item.count }} 卷</span>
              </div>
              <div class="card-body">
                <div class="weight-info">
                  <span class="remaining-weight">{{
                    formatWeight(item.totalRemainingWeight)
                  }}</span>
                  <span class="total-weight"
                    >/ {{ formatWeight(item.totalWeight) }}</span
                  >
                </div>
                <div class="progress-bar small">
                  <div
                    class="progress-fill"
                    :style="{
                      width: `${getPercentage(item.totalRemainingWeight, item.totalWeight)}%`,
                      backgroundColor: getProgressColor(
                        getPercentage(item.totalRemainingWeight, item.totalWeight)
                      ),
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              v-if="filteredByColor.length === 0"
              class="empty-state"
            >
              暂无数据
            </div>
          </div>
        </section>
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <p>暂无库存数据</p>
        <router-link to="/consumables" class="add-link"
          >添加耗材</router-link
        >
      </div>
    </main>
  </div>
</template>


<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  color: #42b883;
  text-decoration: none;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  color: #666;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.page-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.loading,
.error-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-message {
  color: #f56c6c;
}

.retry-btn {
  margin-left: 1rem;
  padding: 0.5rem 1rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #42b883;
}

.stat-label {
  color: #666;
  margin-top: 0.5rem;
}

.stat-sub {
  color: #999;
  font-size: 0.9rem;
}

/* Usage Section */
.usage-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.usage-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #333;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar.small {
  height: 8px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  color: #666;
  min-width: 80px;
}

/* Low Stock Section */
.low-stock-section {
  background: #fff5f5;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #f56c6c;
  margin-bottom: 2rem;
}

.low-stock-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #f56c6c;
}

.low-stock-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.low-stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
}

.item-info {
  display: flex;
  gap: 0.5rem;
}

.item-brand {
  font-weight: 500;
}

.item-type {
  color: #666;
}

.item-color {
  color: #999;
}

.item-stock {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.remaining {
  font-weight: 500;
  color: #f56c6c;
}

.percent {
  color: #999;
  font-size: 0.9rem;
}

/* Accessory Alerts Section */
.accessory-alerts-section {
  background: #fff8e1;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #ffb74d;
  margin-bottom: 2rem;
}

.accessory-alerts-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #f57c00;
}

.accessory-alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.accessory-alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
}

.accessory-alert-item.replacement_due {
  border-left: 3px solid #f57c00;
}

.accessory-alert-item.low_stock {
  border-left: 3px solid #42a5f5;
}

.alert-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.alert-name {
  font-weight: 500;
  color: #333;
}

.alert-category {
  color: #666;
  font-size: 0.85rem;
}

.alert-message {
  font-size: 0.9rem;
}

.replacement-alert {
  color: #f57c00;
}

.stock-alert {
  color: #1976d2;
}

.view-accessories-link {
  display: inline-block;
  margin-top: 1rem;
  color: #f57c00;
  text-decoration: none;
  font-size: 0.9rem;
}

.view-accessories-link:hover {
  text-decoration: underline;
}

/* Inventory Section */
.inventory-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.tab-buttons {
  display: flex;
  gap: 0.5rem;
}

.tab-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-buttons button.active {
  background: #42b883;
  color: white;
  border-color: #42b883;
}

.dashboard-filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.dashboard-filters .filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 200px;
}

.dashboard-filters .filter-item label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.dashboard-filters .filter-item select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.dashboard-filters .filter-item select:focus {
  outline: none;
  border-color: #42b883;
}

.dashboard-filters .color-filter-item {
  flex: 1;
  max-width: 300px;
}

.dashboard-filters .clear-filter-btn {
  padding: 0.5rem 1rem;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #333;
  transition: background 0.2s;
}

.dashboard-filters .clear-filter-btn:hover {
  background: #d0d0d0;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.inventory-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.color-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.parent-type-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-weight: 500;
}

/* 类型级联多选筛选器 */
.type-filter-item {
  position: relative;
}

.type-cascade-filter {
  position: relative;
}

.type-filter-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  min-width: 180px;
}

.type-filter-trigger:hover {
  border-color: #42b883;
}

.type-filter-trigger .placeholder {
  color: #999;
}

.trigger-arrow {
  transition: transform 0.2s;
  font-size: 0.8rem;
  color: #999;
}

.trigger-arrow.open {
  transform: rotate(180deg);
}

.type-filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
  padding: 8px 0;
}

.filter-category {
  border-bottom: 1px solid #f0f0f0;
}

.filter-category:last-child {
  border-bottom: none;
}

.filter-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.filter-category-header:hover {
  background: #f5f5f5;
}

.filter-category-header input[type="checkbox"] {
  accent-color: #42b883;
  cursor: pointer;
}

.category-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
}

.expand-icon {
  font-size: 0.8rem;
  color: #999;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.filter-subtypes {
  padding: 4px 0 4px 20px;
  background: #fafafa;
}

.filter-subtype-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
}

.filter-subtype-item:hover {
  background: #f0f0f0;
}

.filter-subtype-item input[type="checkbox"] {
  accent-color: #42b883;
  cursor: pointer;
}

.filter-actions {
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
}

.clear-type-filter-btn {
  width: 100%;
  padding: 6px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  transition: background 0.2s;
}

.clear-type-filter-btn:hover {
  background: #e0e0e0;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.count {
  color: #999;
  font-size: 0.9rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.weight-info {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.remaining-weight {
  font-weight: 500;
  color: #333;
}

.total-weight {
  color: #999;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.add-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #42b883;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}
</style>
