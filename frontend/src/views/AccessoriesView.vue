<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccessoryStore, ACCESSORY_STATUS, type AccessoryFormData, type Accessory, type AccessoryStatus } from '@/stores/accessory';
import { useAccessoryCategoryStore } from '@/stores/accessoryCategory';

const router = useRouter();
const accessoryStore = useAccessoryStore();
const categoryStore = useAccessoryCategoryStore();

// 筛选状态
const filterCategoryId = ref('');
const filterStatus = ref('');

// 弹窗状态
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const deletingId = ref<string | null>(null);
const showUsageModal = ref(false);
const usageAccessoryId = ref<string | null>(null);
const usageAccessoryName = ref('');
const usageAccessoryRemaining = ref(0);
const showCategoryModal = ref(false);

// 备注展开状态
const expandedNotes = ref<Set<string>>(new Set());

// 表单数据
const formData = ref<AccessoryFormData>({
  categoryId: '',
  name: '',
  brand: '',
  model: '',
  price: undefined,
  purchaseDate: '',
  quantity: 1,
  replacementCycle: undefined,
  lowStockThreshold: undefined,
  notes: '',
});

const usageFormData = ref({
  usageDate: new Date().toISOString().split('T')[0],
  quantity: 1,
  purpose: '',
});

const categoryFormData = ref({
  name: '',
  description: '',
});

onMounted(async () => {
  await Promise.all([
    categoryStore.fetchCategories(),
    accessoryStore.fetchAccessories(),
  ]);
});

// 按分类分组的配件
const groupedAccessories = computed(() => {
  const groups: Record<string, { categoryName: string; items: Accessory[] }> = {};
  
  for (const accessory of accessoryStore.accessories) {
    const categoryId = accessory.categoryId;
    const categoryName = accessory.category?.name || '未分类';
    
    if (!groups[categoryId]) {
      groups[categoryId] = { categoryName, items: [] };
    }
    groups[categoryId].items.push(accessory);
  }
  
  return Object.values(groups).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
});

async function applyFilters() {
  await accessoryStore.fetchAccessories({
    categoryId: filterCategoryId.value || undefined,
    status: filterStatus.value || undefined,
  });
}

function clearFilters() {
  filterCategoryId.value = '';
  filterStatus.value = '';
  accessoryStore.fetchAccessories();
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formData.value = {
    categoryId: categoryStore.categories[0]?.id || '',
    name: '',
    brand: '',
    model: '',
    price: undefined,
    purchaseDate: '',
    quantity: 1,
    replacementCycle: undefined,
    lowStockThreshold: undefined,
    notes: '',
  };
  showModal.value = true;
}

function openEditModal(accessory: Accessory) {
  isEditing.value = true;
  editingId.value = accessory.id;
  formData.value = {
    categoryId: accessory.categoryId,
    name: accessory.name,
    brand: accessory.brand || '',
    model: accessory.model || '',
    price: accessory.price || undefined,
    purchaseDate: accessory.purchaseDate ? accessory.purchaseDate.split('T')[0] : '',
    quantity: accessory.quantity,
    replacementCycle: accessory.replacementCycle || undefined,
    lowStockThreshold: accessory.lowStockThreshold || undefined,
    notes: accessory.notes || '',
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  accessoryStore.clearError();
}

async function handleSubmit() {
  if (isEditing.value && editingId.value) {
    const result = await accessoryStore.updateAccessory(editingId.value, formData.value);
    if (result) {
      closeModal();
    }
  } else {
    const result = await accessoryStore.createAccessory(formData.value);
    if (result) {
      closeModal();
    }
  }
}

function confirmDelete(id: string) {
  deletingId.value = id;
  showDeleteConfirm.value = true;
}

async function handleDelete() {
  if (deletingId.value) {
    await accessoryStore.deleteAccessory(deletingId.value);
    showDeleteConfirm.value = false;
    deletingId.value = null;
  }
}

function openUsageModal(accessory: Accessory) {
  usageAccessoryId.value = accessory.id;
  usageAccessoryName.value = accessory.name;
  usageAccessoryRemaining.value = accessory.remainingQty;
  usageFormData.value = {
    usageDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    purpose: '',
  };
  showUsageModal.value = true;
}

function closeUsageModal() {
  showUsageModal.value = false;
  usageAccessoryId.value = null;
  accessoryStore.clearError();
}

async function handleUsageSubmit() {
  if (usageAccessoryId.value) {
    const success = await accessoryStore.recordUsage(usageAccessoryId.value, usageFormData.value);
    if (success) {
      closeUsageModal();
    }
  }
}

function openCategoryModal() {
  categoryFormData.value = { name: '', description: '' };
  showCategoryModal.value = true;
}

function closeCategoryModal() {
  showCategoryModal.value = false;
  categoryStore.clearError();
}

async function handleCategorySubmit() {
  const result = await categoryStore.createCategory(categoryFormData.value);
  if (result) {
    closeCategoryModal();
  }
}

async function handleDeleteCategory(id: string) {
  if (confirm('确定要删除这个分类吗？')) {
    await categoryStore.deleteCategory(id);
  }
}

function toggleNotes(id: string) {
  if (expandedNotes.value.has(id)) {
    expandedNotes.value.delete(id);
  } else {
    expandedNotes.value.add(id);
  }
}

function truncateNotes(notes: string | null, maxLength = 50): string {
  if (!notes) return '';
  if (notes.length <= maxLength) return notes;
  return notes.substring(0, maxLength) + '...';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '-';
  return `¥${price.toFixed(2)}`;
}

function getStatusLabel(status: string): string {
  return ACCESSORY_STATUS[status as AccessoryStatus] || status;
}
</script>

<template>
  <div class="accessories-view">
    <header class="page-header">
      <div class="header-left">
        <button @click="router.push('/')" class="back-btn">← 返回</button>
        <h1>🔩 配件管理</h1>
      </div>
      <div class="header-actions">
        <button @click="openCategoryModal" class="category-btn">管理分类</button>
        <button @click="openCreateModal" class="add-btn">+ 新增配件</button>
      </div>
    </header>

    <main class="page-content">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <div class="filter-item">
          <label>分类</label>
          <select v-model="filterCategoryId" @change="applyFilters">
            <option value="">全部分类</option>
            <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select v-model="filterStatus" @change="applyFilters">
            <option value="">全部状态</option>
            <option v-for="(label, value) in ACCESSORY_STATUS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </div>
        <button v-if="filterCategoryId || filterStatus" @click="clearFilters" class="clear-filter-btn">
          清除筛选
        </button>
      </div>

      <div v-if="accessoryStore.isLoading" class="loading">加载中...</div>
      
      <div v-else-if="accessoryStore.accessories.length === 0" class="empty-state">
        <p>暂无配件记录</p>
        <p class="hint">点击右上角"新增配件"添加第一个配件</p>
      </div>

      <!-- 按分类分组显示 -->
      <div v-else class="accessories-groups">
        <div v-for="group in groupedAccessories" :key="group.categoryName" class="category-group">
          <h2 class="category-title">{{ group.categoryName }}</h2>
          <div class="accessories-list">
            <div v-for="accessory in group.items" :key="accessory.id" class="accessory-card">
              <div class="card-header">
                <h3 class="accessory-name">{{ accessory.name }}</h3>
                <span class="accessory-status" :class="accessory.status">
                  {{ getStatusLabel(accessory.status) }}
                </span>
              </div>
              
              <div class="card-body">
                <div class="info-row">
                  <span class="label">品牌/型号:</span>
                  <span class="value">{{ accessory.brand || '-' }} {{ accessory.model ? `/ ${accessory.model}` : '' }}</span>
                </div>
                <div class="info-row">
                  <span class="label">数量:</span>
                  <span class="value quantity">
                    <span class="remaining">{{ accessory.remainingQty }}</span> / {{ accessory.quantity }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="label">购买价格:</span>
                  <span class="value">{{ formatPrice(accessory.price) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">购买日期:</span>
                  <span class="value">{{ formatDate(accessory.purchaseDate) }}</span>
                </div>
                <div v-if="accessory.replacementCycle" class="info-row">
                  <span class="label">更换周期:</span>
                  <span class="value">{{ accessory.replacementCycle }} 天</span>
                </div>
                
                <!-- 备注显示 -->
                <div v-if="accessory.notes" class="notes-section">
                  <span class="label">备注:</span>
                  <div class="notes-content">
                    <span v-if="!expandedNotes.has(accessory.id)">
                      {{ truncateNotes(accessory.notes) }}
                      <button v-if="accessory.notes.length > 50" @click="toggleNotes(accessory.id)" class="expand-btn">
                        展开
                      </button>
                    </span>
                    <span v-else>
                      {{ accessory.notes }}
                      <button @click="toggleNotes(accessory.id)" class="expand-btn">收起</button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button @click="openUsageModal(accessory)" class="usage-btn" :disabled="accessory.remainingQty <= 0">
                  记录使用
                </button>
                <button @click="openEditModal(accessory)" class="edit-btn">编辑</button>
                <button @click="confirmDelete(accessory.id)" class="delete-btn">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 新增/编辑配件弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal large-modal">
        <h2>{{ isEditing ? '编辑配件' : '新增配件' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-row">
            <div class="form-group">
              <label for="name">配件名称 *</label>
              <input type="text" id="name" v-model="formData.name" required placeholder="输入配件名称" />
            </div>
            <div class="form-group">
              <label for="categoryId">分类 *</label>
              <select id="categoryId" v-model="formData.categoryId" required>
                <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="brand">品牌/制造商</label>
              <input type="text" id="brand" v-model="formData.brand" placeholder="输入品牌" />
            </div>
            <div class="form-group">
              <label for="model">规格型号</label>
              <input type="text" id="model" v-model="formData.model" placeholder="输入型号" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="price">购买价格</label>
              <input type="number" id="price" v-model.number="formData.price" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label for="purchaseDate">购买日期</label>
              <input type="date" id="purchaseDate" v-model="formData.purchaseDate" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="quantity">数量</label>
              <input type="number" id="quantity" v-model.number="formData.quantity" min="1" />
            </div>
            <div class="form-group">
              <label for="lowStockThreshold">库存不足阈值</label>
              <input type="number" id="lowStockThreshold" v-model.number="formData.lowStockThreshold" min="0" placeholder="低于此数量提醒" />
            </div>
          </div>

          <div class="form-group">
            <label for="replacementCycle">建议更换周期（天）</label>
            <input type="number" id="replacementCycle" v-model.number="formData.replacementCycle" min="1" placeholder="多少天后提醒更换" />
          </div>

          <div class="form-group">
            <label for="notes">备注</label>
            <textarea id="notes" v-model="formData.notes" rows="3" placeholder="记录配件的使用说明、适用范围、商家确认信息等"></textarea>
          </div>

          <div v-if="accessoryStore.error" class="error-message">{{ accessoryStore.error }}</div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn" :disabled="accessoryStore.isLoading">
              {{ accessoryStore.isLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal confirm-modal">
        <h2>确认删除</h2>
        <p>确定要删除这个配件吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="cancel-btn">取消</button>
          <button @click="handleDelete" class="delete-confirm-btn" :disabled="accessoryStore.isLoading">
            {{ accessoryStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 记录使用弹窗 -->
    <div v-if="showUsageModal" class="modal-overlay" @click.self="closeUsageModal">
      <div class="modal">
        <h2>记录使用 - {{ usageAccessoryName }}</h2>
        <p class="usage-hint">当前剩余: {{ usageAccessoryRemaining }}</p>
        <form @submit.prevent="handleUsageSubmit">
          <div class="form-group">
            <label for="usageDate">使用日期</label>
            <input type="date" id="usageDate" v-model="usageFormData.usageDate" required />
          </div>
          <div class="form-group">
            <label for="usageQuantity">使用数量</label>
            <input type="number" id="usageQuantity" v-model.number="usageFormData.quantity" min="1" :max="usageAccessoryRemaining" required />
          </div>
          <div class="form-group">
            <label for="purpose">用途说明</label>
            <textarea id="purpose" v-model="usageFormData.purpose" rows="2" placeholder="描述使用用途..."></textarea>
          </div>
          <div v-if="accessoryStore.error" class="error-message">{{ accessoryStore.error }}</div>
          <div class="modal-actions">
            <button type="button" @click="closeUsageModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn" :disabled="accessoryStore.isLoading">
              {{ accessoryStore.isLoading ? '保存中...' : '确认' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 分类管理弹窗 -->
    <div v-if="showCategoryModal" class="modal-overlay" @click.self="closeCategoryModal">
      <div class="modal">
        <h2>管理配件分类</h2>
        
        <!-- 现有分类列表 -->
        <div class="category-list">
          <div v-for="cat in categoryStore.categories" :key="cat.id" class="category-item">
            <span class="category-name">
              {{ cat.name }}
              <span v-if="cat.isPreset" class="preset-badge">预设</span>
            </span>
            <button v-if="!cat.isPreset" @click="handleDeleteCategory(cat.id)" class="delete-category-btn">
              删除
            </button>
          </div>
        </div>

        <!-- 添加新分类 -->
        <div class="add-category-section">
          <h3>添加自定义分类</h3>
          <form @submit.prevent="handleCategorySubmit">
            <div class="form-group">
              <label for="categoryName">分类名称</label>
              <input type="text" id="categoryName" v-model="categoryFormData.name" required placeholder="输入分类名称" />
            </div>
            <div class="form-group">
              <label for="categoryDesc">分类描述（可选）</label>
              <input type="text" id="categoryDesc" v-model="categoryFormData.description" placeholder="输入分类描述" />
            </div>
            <div v-if="categoryStore.error" class="error-message">{{ categoryStore.error }}</div>
            <button type="submit" class="submit-btn" :disabled="categoryStore.isLoading">
              {{ categoryStore.isLoading ? '添加中...' : '添加分类' }}
            </button>
          </form>
        </div>

        <div class="modal-actions">
          <button @click="closeCategoryModal" class="cancel-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.accessories-view {
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

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.back-btn:hover {
  background: #f5f5f5;
}

.category-btn {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.category-btn:hover {
  background: #e0e0e0;
}

.add-btn {
  padding: 0.5rem 1rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-btn:hover {
  background: #3aa876;
}

.page-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-item label {
  font-size: 0.85rem;
  color: #666;
}

.filter-item select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.clear-filter-btn {
  padding: 0.5rem 1rem;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-filter-btn:hover {
  background: #d0d0d0;
}

.loading {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state .hint {
  font-size: 0.9rem;
  color: #999;
}

/* 分类分组 */
.accessories-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.category-group {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-title {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #333;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #42b883;
}

.accessories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.accessory-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  background: #fafafa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.accessory-name {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.accessory-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.accessory-status.available {
  background: #e8f5e9;
  color: #388e3c;
}

.accessory-status.low_stock {
  background: #fff3e0;
  color: #f57c00;
}

.accessory-status.depleted {
  background: #ffebee;
  color: #c62828;
}

.card-body {
  font-size: 0.9rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.4rem;
}

.info-row .label {
  color: #666;
  min-width: 80px;
}

.info-row .value {
  color: #333;
}

.info-row .quantity .remaining {
  font-weight: 600;
  color: #42b883;
}

.notes-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e0e0e0;
}

.notes-section .label {
  color: #666;
  display: block;
  margin-bottom: 0.25rem;
}

.notes-content {
  color: #555;
  font-size: 0.85rem;
  line-height: 1.4;
}

.expand-btn {
  background: none;
  border: none;
  color: #42b883;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  margin-left: 0.25rem;
}

.expand-btn:hover {
  text-decoration: underline;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e0e0e0;
}

.usage-btn, .edit-btn, .delete-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.usage-btn {
  background: #e8f5e9;
  color: #388e3c;
}

.usage-btn:hover:not(:disabled) {
  background: #c8e6c9;
}

.usage-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.edit-btn:hover {
  background: #bbdefb;
}

.delete-btn {
  background: #ffebee;
  color: #c62828;
}

.delete-btn:hover {
  background: #ffcdd2;
}

/* 弹窗样式 */
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
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal.large-modal {
  max-width: 600px;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
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
  color: #666;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
}

.error-message {
  color: #c62828;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #ffebee;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:hover:not(:disabled) {
  background: #3aa876;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-modal p {
  color: #666;
  margin-bottom: 1rem;
}

.delete-confirm-btn {
  padding: 0.75rem 1.5rem;
  background: #c62828;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-confirm-btn:hover:not(:disabled) {
  background: #b71c1c;
}

.delete-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 使用记录弹窗 */
.usage-hint {
  color: #666;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* 分类管理弹窗 */
.category-list {
  margin-bottom: 1.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preset-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: #e0e0e0;
  border-radius: 4px;
  color: #666;
}

.delete-category-btn {
  padding: 0.25rem 0.5rem;
  background: #ffebee;
  color: #c62828;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.delete-category-btn:hover {
  background: #ffcdd2;
}

.add-category-section {
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.add-category-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item select {
    width: 100%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .accessories-list {
    grid-template-columns: 1fr;
  }
}
</style>
