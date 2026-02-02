<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useConsumableStore, type Consumable, type ConsumableFormData, type BatchCreateFormData } from '@/stores/consumable';
import { useBrandStore } from '@/stores/brand';
import { useConsumableTypeStore } from '@/stores/consumableType';
import { useBrandColorStore, type BrandColor } from '@/stores/brandColor';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import ConsumableFilter, { type FilterValues } from '@/components/ConsumableFilter.vue';
import ColorSearch from '@/components/ColorSearch.vue';
import TypeCascadeSelector from '@/components/TypeCascadeSelector.vue';

const router = useRouter();
const authStore = useAuthStore();
const consumableStore = useConsumableStore();
const brandStore = useBrandStore();
const typeStore = useConsumableTypeStore();
const brandColorStore = useBrandColorStore();

const showForm = ref(false);
const editingConsumable = ref<Consumable | null>(null);
const formData = ref<ConsumableFormData & { quantity?: number; isOpened?: boolean; openedAt?: string }>({
  brandId: '',
  typeId: '',
  color: '',
  colorHex: '',
  weight: 1000,
  price: 0,
  purchaseDate: new Date().toISOString().split('T')[0],
  notes: '',
  quantity: 1,
  isOpened: false,
  openedAt: '',
});
const deleteConfirmId = ref<string | null>(null);
const openConfirmId = ref<string | null>(null);
const depleteConfirmId = ref<string | null>(null);
const restoreConfirmId = ref<string | null>(null);

// 类型选择变化处理
function onTypeChange(typeId: string | null) {
  formData.value.typeId = typeId || '';
}

// 显示已用完的耗材
const showDepleted = ref(false);

// 当 isOpened 变化时，自动设置 openedAt
watch(() => formData.value.isOpened, (newVal) => {
  if (newVal && !formData.value.openedAt) {
    formData.value.openedAt = new Date().toISOString().split('T')[0];
  }
});

// 当品牌变化时，加载该品牌的颜色列表并清空已选颜色
watch(() => formData.value.brandId, async (newBrandId, oldBrandId) => {
  if (newBrandId && newBrandId !== oldBrandId) {
    // 清空已选颜色
    formData.value.color = '';
    formData.value.colorHex = '';
    // 加载新品牌的颜色列表
    await brandColorStore.fetchColors(newBrandId);
  }
});

// 颜色选择器相关
const showColorPicker = ref(false);
const brandColors = computed(() => {
  if (!formData.value.brandId) return [];
  return brandColorStore.getColors(formData.value.brandId);
});

function openColorPicker() {
  if (formData.value.brandId) {
    showColorPicker.value = true;
  }
}

function selectBrandColor(color: BrandColor) {
  formData.value.color = color.colorName;
  formData.value.colorHex = color.colorHex;
  showColorPicker.value = false;
}

// Filters using the new component
const filterValues = ref<FilterValues>({
  brandId: '',
  typeId: '',
  color: '',
  isOpened: '',
});

// Available colors for the color search dropdown
const availableColors = computed(() => {
  return consumableStore.consumables.map(c => ({
    name: c.color,
    hex: c.colorHex,
  }));
});

onMounted(async () => {
  await Promise.all([
    consumableStore.fetchConsumables({ includeDepleted: showDepleted.value }),
    brandStore.fetchBrands(),
    typeStore.fetchHierarchy(),
  ]);
});

// Computed for days since opened - now using backend-provided openedDays
function formatOpenedDays(openedDays: number | null): string {
  if (openedDays === null) return '';
  if (openedDays === 0) return '今天开封';
  if (openedDays === 1) return '1 天前开封';
  return `${openedDays} 天前开封`;
}

// Apply filters using the new filter component
async function applyFilters() {
  const filters: { brandId?: string; typeId?: string; color?: string; isOpened?: boolean; includeDepleted?: boolean } = {};
  if (filterValues.value.brandId) filters.brandId = filterValues.value.brandId;
  if (filterValues.value.typeId) filters.typeId = filterValues.value.typeId;
  if (filterValues.value.color) filters.color = filterValues.value.color;
  if (filterValues.value.isOpened !== '') filters.isOpened = filterValues.value.isOpened === 'true';
  filters.includeDepleted = showDepleted.value;
  await consumableStore.fetchConsumables(filters);
}

async function clearFilters() {
  filterValues.value = {
    brandId: '',
    typeId: '',
    color: '',
    isOpened: '',
  };
  await consumableStore.fetchConsumables({ includeDepleted: showDepleted.value });
}

// 切换显示已用完
async function toggleShowDepleted() {
  showDepleted.value = !showDepleted.value;
  await applyFilters();
}

function handleColorSearch(color: string) {
  filterValues.value.color = color;
  applyFilters();
}

function openCreateForm() {
  editingConsumable.value = null;
  formData.value = {
    brandId: '',
    typeId: '',
    color: '',
    colorHex: '',
    weight: 1000,
    price: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    quantity: 1,
    isOpened: false,
    openedAt: '',
  };
  consumableStore.clearError();
  showForm.value = true;
}

function openEditForm(consumable: Consumable) {
  editingConsumable.value = consumable;
  formData.value = {
    brandId: consumable.brandId,
    typeId: consumable.typeId,
    color: consumable.color,
    colorHex: consumable.colorHex || '',
    weight: consumable.weight,
    price: consumable.price,
    purchaseDate: consumable.purchaseDate.split('T')[0],
    notes: consumable.notes || '',
    quantity: 1, // 编辑时不显示数量
    isOpened: consumable.isOpened,
    openedAt: consumable.openedAt ? consumable.openedAt.split('T')[0] : '',
  };
  consumableStore.clearError();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingConsumable.value = null;
  consumableStore.clearError();
}

async function handleSubmit() {
  const submitData = {
    ...formData.value,
    colorHex: formData.value.colorHex || undefined,
    notes: formData.value.notes || undefined,
  };

  // 检查是否为新颜色，如果是则自动添加到品牌颜色库
  if (formData.value.brandId && formData.value.color) {
    const colorExists = brandColorStore.colorExists(formData.value.brandId, formData.value.color);
    if (!colorExists) {
      await brandColorStore.createColor(formData.value.brandId, {
        colorName: formData.value.color,
        colorHex: formData.value.colorHex || '#CCCCCC',
      });
    }
  }

  if (editingConsumable.value) {
    // 编辑模式：使用单个更新
    const result = await consumableStore.updateConsumable(editingConsumable.value.id, submitData);
    if (result) {
      closeForm();
    }
  } else {
    // 新增模式：根据数量决定使用批量创建还是单个创建
    const quantity = formData.value.quantity || 1;
    if (quantity > 1) {
      // 批量创建
      const batchData: BatchCreateFormData = {
        brandId: formData.value.brandId,
        typeId: formData.value.typeId,
        color: formData.value.color,
        colorHex: formData.value.colorHex || undefined,
        weight: formData.value.weight,
        price: formData.value.price,
        purchaseDate: formData.value.purchaseDate,
        notes: formData.value.notes || undefined,
        quantity: quantity,
        isOpened: formData.value.isOpened,
        openedAt: formData.value.isOpened ? formData.value.openedAt : undefined,
      };
      const result = await consumableStore.batchCreateConsumable(batchData);
      if (result) {
        closeForm();
      }
    } else {
      // 单个创建（也支持开封状态）
      const batchData: BatchCreateFormData = {
        brandId: formData.value.brandId,
        typeId: formData.value.typeId,
        color: formData.value.color,
        colorHex: formData.value.colorHex || undefined,
        weight: formData.value.weight,
        price: formData.value.price,
        purchaseDate: formData.value.purchaseDate,
        notes: formData.value.notes || undefined,
        quantity: 1,
        isOpened: formData.value.isOpened,
        openedAt: formData.value.isOpened ? formData.value.openedAt : undefined,
      };
      const result = await consumableStore.batchCreateConsumable(batchData);
      if (result) {
        closeForm();
      }
    }
  }
}

function confirmDelete(id: string) {
  deleteConfirmId.value = id;
}

function cancelDelete() {
  deleteConfirmId.value = null;
}

async function handleDelete() {
  if (deleteConfirmId.value) {
    const success = await consumableStore.deleteConsumable(deleteConfirmId.value);
    if (success) {
      deleteConfirmId.value = null;
    }
  }
}

function confirmOpen(id: string) {
  openConfirmId.value = id;
}

function cancelOpen() {
  openConfirmId.value = null;
}

async function handleMarkAsOpened() {
  if (openConfirmId.value) {
    const result = await consumableStore.markAsOpened(openConfirmId.value);
    if (result) {
      openConfirmId.value = null;
    }
  }
}

// 标记为已用完
function confirmDeplete(id: string) {
  depleteConfirmId.value = id;
}

function cancelDeplete() {
  depleteConfirmId.value = null;
}

async function handleMarkAsDepleted() {
  if (depleteConfirmId.value) {
    const result = await consumableStore.markAsDepleted(depleteConfirmId.value);
    if (result) {
      depleteConfirmId.value = null;
    }
  }
}

// 恢复已用完的耗材
function confirmRestore(id: string) {
  restoreConfirmId.value = id;
}

function cancelRestore() {
  restoreConfirmId.value = null;
}

async function handleRestore() {
  if (restoreConfirmId.value) {
    const result = await consumableStore.restoreFromDepleted(restoreConfirmId.value);
    if (result) {
      restoreConfirmId.value = null;
    }
  }
}

// 获取状态显示文本
function getStatusText(consumable: Consumable): string {
  if (consumable.status === 'depleted') return '已用完';
  return consumable.isOpened ? '已开封' : '未开封';
}

// 获取状态样式类
function getStatusClass(consumable: Consumable): string {
  if (consumable.status === 'depleted') return 'depleted';
  return consumable.isOpened ? 'opened' : 'sealed';
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="consumables-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>耗材管理</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <!-- Filters using new components -->
      <ConsumableFilter
        v-model="filterValues"
        :brands="brandStore.brands"
        :types="typeStore.types"
        @filter="applyFilters"
        @clear="clearFilters"
      >
        <template #color-search>
          <ColorSearch
            v-model="filterValues.color"
            :available-colors="availableColors"
            placeholder="搜索颜色名称或代码..."
            @search="handleColorSearch"
          />
        </template>
      </ConsumableFilter>

      <div class="toolbar">
        <button @click="openCreateForm" class="btn btn-primary">+ 新增耗材</button>
        <label class="show-depleted-toggle">
          <input type="checkbox" :checked="showDepleted" @change="toggleShowDepleted" />
          <span>显示已用完</span>
        </label>
      </div>

      <div v-if="consumableStore.isLoading && !showForm" class="loading">加载中...</div>

      <div v-else-if="consumableStore.consumables.length === 0" class="empty-state">
        <p>暂无耗材数据</p>
        <p>点击"新增耗材"按钮添加您的第一个耗材</p>
      </div>

      <div v-else class="consumable-list">
        <div v-for="consumable in consumableStore.consumables" :key="consumable.id" 
             :class="['consumable-card', { 'depleted-card': consumable.status === 'depleted' }]">
          <div class="consumable-color" :style="{ backgroundColor: consumable.colorHex || '#ccc' }"></div>
          <div class="consumable-info">
            <div class="consumable-header">
              <h3>{{ consumable.brand?.name }} - {{ consumable.type?.name }}</h3>
              <span :class="['status-badge', getStatusClass(consumable)]">
                {{ getStatusText(consumable) }}
              </span>
            </div>
            <div class="consumable-details">
              <span class="color-name">颜色: {{ consumable.color }}</span>
              <span>重量: {{ consumable.weight.toFixed(0) }}g</span>
              <span>剩余: {{ consumable.remainingWeight.toFixed(0) }}g</span>
              <span>价格: ¥{{ consumable.price.toFixed(2) }}</span>
            </div>
            <div class="consumable-meta">
              <span>购买日期: {{ consumable.purchaseDate.split('T')[0] }}</span>
              <span v-if="consumable.isOpened && consumable.openedDays !== null" class="opened-duration">
                {{ formatOpenedDays(consumable.openedDays) }}
              </span>
              <span v-if="consumable.status === 'depleted' && consumable.depletedAt" class="depleted-date">
                用完于: {{ consumable.depletedAt.split('T')[0] }}
              </span>
            </div>
            <p v-if="consumable.notes" class="notes">{{ consumable.notes }}</p>
          </div>
          <div class="consumable-actions">
            <!-- 已用完的耗材只显示恢复按钮 -->
            <template v-if="consumable.status === 'depleted'">
              <button @click="confirmRestore(consumable.id)" class="btn btn-secondary btn-sm">
                恢复
              </button>
            </template>
            <!-- 正常耗材显示完整操作 -->
            <template v-else>
              <button v-if="!consumable.isOpened" @click="confirmOpen(consumable.id)" class="btn btn-secondary btn-sm">
                标记开封
              </button>
              <button v-if="consumable.isOpened" @click="confirmDeplete(consumable.id)" class="btn btn-warning btn-sm">
                标记用完
              </button>
              <button @click="openEditForm(consumable)" class="btn btn-secondary btn-sm">编辑</button>
              <button @click="confirmDelete(consumable.id)" class="btn btn-danger btn-sm">删除</button>
            </template>
          </div>
        </div>
      </div>
    </main>

    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ editingConsumable ? '编辑耗材' : '新增耗材' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <div class="form-group">
              <label for="brandId">品牌 *</label>
              <select id="brandId" v-model="formData.brandId" required :disabled="consumableStore.isLoading">
                <option value="">请选择品牌</option>
                <option v-for="brand in brandStore.brands" :key="brand.id" :value="brand.id">
                  {{ brand.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="typeId">类型 *</label>
              <TypeCascadeSelector
                v-model="formData.typeId"
                placeholder="请选择类型"
                :disabled="consumableStore.isLoading"
                @change="onTypeChange"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="color">颜色名称 *</label>
              <div class="color-select-group">
                <input id="color" v-model="formData.color" type="text" placeholder="如: 白色、黑色" required :disabled="consumableStore.isLoading" />
                <button 
                  type="button" 
                  class="btn btn-secondary btn-color-select" 
                  @click="openColorPicker"
                  :disabled="!formData.brandId || consumableStore.isLoading"
                  :title="!formData.brandId ? '请先选择品牌' : '从颜色库选择'"
                >
                  选择
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="colorHex">颜色代码</label>
              <div class="color-input-group">
                <input id="colorHex" v-model="formData.colorHex" type="text" placeholder="#FFFFFF" :disabled="consumableStore.isLoading" />
                <input type="color" v-model="formData.colorHex" class="color-picker" :disabled="consumableStore.isLoading" />
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="weight">重量 (g) *</label>
              <input id="weight" v-model.number="formData.weight" type="number" min="1" required :disabled="consumableStore.isLoading" />
            </div>
            <div class="form-group">
              <label for="price">价格 (¥) *</label>
              <input id="price" v-model.number="formData.price" type="number" min="0" step="0.01" required :disabled="consumableStore.isLoading" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="purchaseDate">购买日期 *</label>
              <input id="purchaseDate" v-model="formData.purchaseDate" type="date" required :disabled="consumableStore.isLoading" />
            </div>
            <!-- 数量输入框（仅新增时显示） -->
            <div v-if="!editingConsumable" class="form-group">
              <label for="quantity">数量</label>
              <input id="quantity" v-model.number="formData.quantity" type="number" min="1" max="100" :disabled="consumableStore.isLoading" />
              <span class="form-hint">批量添加同品牌同类型同颜色的耗材</span>
            </div>
          </div>
          <!-- 开封状态（仅新增时显示） -->
          <div v-if="!editingConsumable" class="form-row">
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.isOpened" :disabled="consumableStore.isLoading" />
                <span>已开封</span>
              </label>
            </div>
            <div v-if="formData.isOpened" class="form-group">
              <label for="openedAt">开封日期</label>
              <input id="openedAt" v-model="formData.openedAt" type="date" :disabled="consumableStore.isLoading" />
            </div>
          </div>
          <div class="form-group">
            <label for="notes">备注</label>
            <textarea id="notes" v-model="formData.notes" placeholder="可选备注信息" rows="2" :disabled="consumableStore.isLoading"></textarea>
          </div>
          <div v-if="consumableStore.error" class="error-message">{{ consumableStore.error }}</div>
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn btn-secondary" :disabled="consumableStore.isLoading">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="consumableStore.isLoading">
              {{ consumableStore.isLoading ? '保存中...' : (editingConsumable ? '保存' : (formData.quantity && formData.quantity > 1 ? `添加 ${formData.quantity} 个` : '保存')) }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Color Picker Modal -->
    <div v-if="showColorPicker" class="modal-overlay" @click.self="showColorPicker = false">
      <div class="modal modal-color-picker">
        <div class="modal-header">
          <h2>选择颜色</h2>
          <button @click="showColorPicker = false" class="close-btn">&times;</button>
        </div>
        
        <div v-if="brandColorStore.isLoading" class="loading">
          加载中...
        </div>

        <div v-else-if="brandColors.length === 0" class="empty-state">
          <p>该品牌暂无颜色记录</p>
          <p>请手动输入颜色名称</p>
        </div>

        <div v-else class="color-picker-list">
          <div 
            v-for="color in brandColors" 
            :key="color.id" 
            class="color-picker-item"
            :class="{ active: color.colorName === formData.color }"
            @click="selectBrandColor(color)"
          >
            <div class="color-swatch" :style="{ backgroundColor: color.colorHex }"></div>
            <div class="color-info">
              <span class="color-name">{{ color.colorName }}</span>
              <span class="color-hex">{{ color.colorHex }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteConfirmId" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>确定要删除这个耗材吗？此操作无法撤销。</p>
        <div v-if="consumableStore.error" class="error-message">{{ consumableStore.error }}</div>
        <div class="form-actions">
          <button @click="cancelDelete" class="btn btn-secondary" :disabled="consumableStore.isLoading">取消</button>
          <button @click="handleDelete" class="btn btn-danger" :disabled="consumableStore.isLoading">
            {{ consumableStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Open Confirmation Modal -->
    <div v-if="openConfirmId" class="modal-overlay" @click.self="cancelOpen">
      <div class="modal modal-confirm">
        <h2>标记开封</h2>
        <p>确定要将此耗材标记为已开封吗？开封日期将设为今天。</p>
        <div v-if="consumableStore.error" class="error-message">{{ consumableStore.error }}</div>
        <div class="form-actions">
          <button @click="cancelOpen" class="btn btn-secondary" :disabled="consumableStore.isLoading">取消</button>
          <button @click="handleMarkAsOpened" class="btn btn-primary" :disabled="consumableStore.isLoading">
            {{ consumableStore.isLoading ? '处理中...' : '确认开封' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Deplete Confirmation Modal -->
    <div v-if="depleteConfirmId" class="modal-overlay" @click.self="cancelDeplete">
      <div class="modal modal-confirm">
        <h2>标记用完</h2>
        <p>确定要将此耗材标记为已用完吗？用完日期将设为今天。</p>
        <p class="hint">标记为已用完后，耗材将从默认列表中隐藏，但仍可通过"显示已用完"选项查看。</p>
        <div v-if="consumableStore.error" class="error-message">{{ consumableStore.error }}</div>
        <div class="form-actions">
          <button @click="cancelDeplete" class="btn btn-secondary" :disabled="consumableStore.isLoading">取消</button>
          <button @click="handleMarkAsDepleted" class="btn btn-warning" :disabled="consumableStore.isLoading">
            {{ consumableStore.isLoading ? '处理中...' : '确认用完' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Restore Confirmation Modal -->
    <div v-if="restoreConfirmId" class="modal-overlay" @click.self="cancelRestore">
      <div class="modal modal-confirm">
        <h2>恢复耗材</h2>
        <p>确定要恢复此耗材吗？耗材将恢复为已开封状态。</p>
        <div v-if="consumableStore.error" class="error-message">{{ consumableStore.error }}</div>
        <div class="form-actions">
          <button @click="cancelRestore" class="btn btn-secondary" :disabled="consumableStore.isLoading">取消</button>
          <button @click="handleRestore" class="btn btn-primary" :disabled="consumableStore.isLoading">
            {{ consumableStore.isLoading ? '处理中...' : '确认恢复' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.consumables-page {
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
  color: #4a90d9;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.header-left h1 {
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

.logout-btn:hover {
  background: #f5f5f5;
}

.page-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.show-depleted-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #666;
  font-size: 0.9rem;
}

.show-depleted-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-primary {
  background: #4a90d9;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d68910;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.consumable-list {
  display: grid;
  gap: 1rem;
}

.consumable-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
}

.consumable-card.depleted-card {
  opacity: 0.7;
  background: #f8f8f8;
}

.consumable-card.depleted-card .consumable-color {
  filter: grayscale(50%);
}

.consumable-color {
  width: 20px;
  flex-shrink: 0;
}

.consumable-info {
  flex: 1;
  padding: 1rem;
}

.consumable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.consumable-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.status-badge.opened {
  background: #fff3cd;
  color: #856404;
}

.status-badge.sealed {
  background: #d4edda;
  color: #155724;
}

.status-badge.depleted {
  background: #e2e3e5;
  color: #6c757d;
}

.consumable-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.color-name {
  font-weight: 500;
}

.consumable-meta {
  display: flex;
  gap: 1rem;
  color: #888;
  font-size: 0.85rem;
}

.opened-duration {
  color: #856404;
  background: #fff3cd;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.depleted-date {
  color: #6c757d;
  background: #e2e3e5;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.notes {
  margin: 0.5rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
}

.consumable-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  justify-content: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.modal-confirm p {
  color: #666;
  margin-bottom: 1rem;
}

.modal-confirm p.hint {
  font-size: 0.85rem;
  color: #888;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input[type="color"] {
  width: 42px !important;
  min-width: 42px;
  padding: 2px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4a90d9;
}

.form-group input:disabled,
.form-group textarea:disabled,
.form-group select:disabled {
  background: #f5f5f5;
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input-group input[type="text"] {
  flex: 1;
}

.color-picker {
  width: 42px;
  height: 42px;
  padding: 2px;
  cursor: pointer;
  flex-shrink: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.error-message {
  color: #e74c3c;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #fdf2f2;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

/* 颜色选择器相关样式 */
.color-select-group {
  display: flex;
  gap: 0.5rem;
}

.color-select-group input {
  flex: 1;
}

.btn-color-select {
  padding: 0.75rem 1rem;
  white-space: nowrap;
}

.modal-color-picker {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.color-picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.color-picker-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: #f9f9f9;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-picker-item:hover {
  background: #f0f0f0;
}

.color-picker-item.active {
  background: #e8f5e9;
  border-color: #42b883;
}

.color-picker-item .color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.color-picker-item .color-info {
  flex: 1;
  margin-left: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-picker-item .color-name {
  font-weight: 500;
  color: #333;
}

.color-picker-item .color-hex {
  font-size: 0.8rem;
  color: #888;
  font-family: monospace;
}
</style>
