<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsageRecordStore, type UsageRecord, type UsageRecordFormData } from '@/stores/usageRecord';
import { useConsumableStore } from '@/stores/consumable';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const usageRecordStore = useUsageRecordStore();
const consumableStore = useConsumableStore();

const showForm = ref(false);
const editingRecord = ref<UsageRecord | null>(null);
const formData = ref<UsageRecordFormData>({
  consumableId: '',
  amountUsed: 0,
  usageDate: new Date().toISOString().split('T')[0],
  projectName: '',
  notes: '',
});
const deleteConfirmId = ref<string | null>(null);
const showWarningModal = ref(false);
const pendingWarning = ref<string | null>(null);

// Filters
const filterConsumableId = ref('');
const filterStartDate = ref('');
const filterEndDate = ref('');

// Get selected consumable for validation
const selectedConsumable = computed(() => {
  if (!formData.value.consumableId) return null;
  return consumableStore.consumables.find(c => c.id === formData.value.consumableId);
});

// Check if usage exceeds remaining weight
const exceedsRemaining = computed(() => {
  if (!selectedConsumable.value) return false;
  const remaining = selectedConsumable.value.remainingWeight;
  if (editingRecord.value && editingRecord.value.consumableId === formData.value.consumableId) {
    return formData.value.amountUsed > remaining + editingRecord.value.amountUsed;
  }
  return formData.value.amountUsed > remaining;
});

onMounted(async () => {
  await Promise.all([
    usageRecordStore.fetchUsageRecords(),
    consumableStore.fetchConsumables(),
  ]);
});

async function applyFilters() {
  const filters: { consumableId?: string; startDate?: string; endDate?: string } = {};
  if (filterConsumableId.value) filters.consumableId = filterConsumableId.value;
  if (filterStartDate.value) filters.startDate = filterStartDate.value;
  if (filterEndDate.value) filters.endDate = filterEndDate.value;
  await usageRecordStore.fetchUsageRecords(filters);
}

async function clearFilters() {
  filterConsumableId.value = '';
  filterStartDate.value = '';
  filterEndDate.value = '';
  await usageRecordStore.fetchUsageRecords();
}

function openCreateForm() {
  editingRecord.value = null;
  formData.value = {
    consumableId: '',
    amountUsed: 0,
    usageDate: new Date().toISOString().split('T')[0],
    projectName: '',
    notes: '',
  };
  usageRecordStore.clearError();
  usageRecordStore.clearWarning();
  showForm.value = true;
}

function openEditForm(record: UsageRecord) {
  editingRecord.value = record;
  formData.value = {
    consumableId: record.consumableId,
    amountUsed: record.amountUsed,
    usageDate: record.usageDate.split('T')[0],
    projectName: record.projectName || '',
    notes: record.notes || '',
  };
  usageRecordStore.clearError();
  usageRecordStore.clearWarning();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingRecord.value = null;
  usageRecordStore.clearError();
  usageRecordStore.clearWarning();
}

async function handleSubmit() {
  const submitData: UsageRecordFormData = {
    consumableId: formData.value.consumableId,
    amountUsed: formData.value.amountUsed,
    usageDate: formData.value.usageDate,
    projectName: formData.value.projectName || undefined,
    notes: formData.value.notes || undefined,
  };

  let result;
  if (editingRecord.value) {
    result = await usageRecordStore.updateUsageRecord(editingRecord.value.id, submitData);
  } else {
    result = await usageRecordStore.createUsageRecord(submitData);
  }

  if (result.record) {
    if (result.warning) {
      pendingWarning.value = result.warning;
      showWarningModal.value = true;
    }
    closeForm();
    await consumableStore.fetchConsumables();
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
    const success = await usageRecordStore.deleteUsageRecord(deleteConfirmId.value);
    if (success) {
      deleteConfirmId.value = null;
      await consumableStore.fetchConsumables();
    }
  }
}

function closeWarningModal() {
  showWarningModal.value = false;
  pendingWarning.value = null;
}

function getConsumableLabel(consumable: UsageRecord['consumable']) {
  if (!consumable) return '未知耗材';
  const brand = consumable.brand?.name || '未知品牌';
  const type = consumable.type?.name || '未知类型';
  return `${brand} - ${type} (${consumable.color})`;
}

function getConsumableSelectLabel(c: typeof consumableStore.consumables[0]) {
  const brand = c.brand?.name || '未知品牌';
  const type = c.type?.name || '未知类型';
  return `${brand} - ${type} (${c.color}) - 剩余: ${c.remainingWeight}g`;
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="usage-records-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>使用记录</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <!-- Filters -->
      <div class="filters">
        <select v-model="filterConsumableId" @change="applyFilters">
          <option value="">所有耗材</option>
          <option v-for="c in consumableStore.consumables" :key="c.id" :value="c.id">
            {{ getConsumableSelectLabel(c) }}
          </option>
        </select>
        <div class="date-filter">
          <label>开始日期:</label>
          <input type="date" v-model="filterStartDate" @change="applyFilters" />
        </div>
        <div class="date-filter">
          <label>结束日期:</label>
          <input type="date" v-model="filterEndDate" @change="applyFilters" />
        </div>
        <button @click="clearFilters" class="btn btn-secondary btn-sm">清除筛选</button>
      </div>

      <div class="toolbar">
        <button @click="openCreateForm" class="btn btn-primary">+ 新增使用记录</button>
      </div>

      <div v-if="usageRecordStore.isLoading && !showForm" class="loading">加载中...</div>

      <div v-else-if="usageRecordStore.usageRecords.length === 0" class="empty-state">
        <p>暂无使用记录</p>
        <p>点击"新增使用记录"按钮添加您的第一条使用记录</p>
      </div>

      <div v-else class="usage-list">
        <div v-for="record in usageRecordStore.usageRecords" :key="record.id" class="usage-card">
          <div class="usage-color" :style="{ backgroundColor: record.consumable?.colorHex || '#ccc' }"></div>
          <div class="usage-info">
            <div class="usage-header">
              <h3>{{ getConsumableLabel(record.consumable) }}</h3>
              <span class="usage-amount">-{{ record.amountUsed }}g</span>
            </div>
            <div class="usage-details">
              <span>使用日期: {{ record.usageDate.split('T')[0] }}</span>
              <span v-if="record.projectName">项目: {{ record.projectName }}</span>
            </div>
            <p v-if="record.notes" class="notes">{{ record.notes }}</p>
          </div>
          <div class="usage-actions">
            <button @click="openEditForm(record)" class="btn btn-secondary btn-sm">编辑</button>
            <button @click="confirmDelete(record.id)" class="btn btn-danger btn-sm">删除</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ editingRecord ? '编辑使用记录' : '新增使用记录' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="consumableId">耗材 *</label>
            <select id="consumableId" v-model="formData.consumableId" required :disabled="usageRecordStore.isLoading">
              <option value="">请选择耗材</option>
              <option v-for="c in consumableStore.consumables.filter(c => c.isOpened)" :key="c.id" :value="c.id">
                {{ getConsumableSelectLabel(c) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="amountUsed">使用量 (g) *</label>
            <input 
              id="amountUsed" 
              v-model.number="formData.amountUsed" 
              type="number" 
              min="0.1" 
              step="0.1" 
              required 
              :disabled="usageRecordStore.isLoading" 
            />
            <!-- Over-usage warning -->
            <div v-if="exceedsRemaining" class="warning-inline">
              ⚠️ 使用量超过剩余库存 (剩余: {{ selectedConsumable?.remainingWeight }}g)
            </div>
          </div>
          <div class="form-group">
            <label for="usageDate">使用日期 *</label>
            <input id="usageDate" v-model="formData.usageDate" type="date" required :disabled="usageRecordStore.isLoading" />
          </div>
          <div class="form-group">
            <label for="projectName">项目名称</label>
            <input id="projectName" v-model="formData.projectName" type="text" placeholder="打印项目名称（可选）" :disabled="usageRecordStore.isLoading" />
          </div>
          <div class="form-group">
            <label for="notes">备注</label>
            <textarea id="notes" v-model="formData.notes" placeholder="可选备注信息" rows="2" :disabled="usageRecordStore.isLoading"></textarea>
          </div>
          <div v-if="usageRecordStore.error" class="error-message">{{ usageRecordStore.error }}</div>
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn btn-secondary" :disabled="usageRecordStore.isLoading">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="usageRecordStore.isLoading">
              {{ usageRecordStore.isLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteConfirmId" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>确定要删除这条使用记录吗？删除后库存将恢复。</p>
        <div v-if="usageRecordStore.error" class="error-message">{{ usageRecordStore.error }}</div>
        <div class="form-actions">
          <button @click="cancelDelete" class="btn btn-secondary" :disabled="usageRecordStore.isLoading">取消</button>
          <button @click="handleDelete" class="btn btn-danger" :disabled="usageRecordStore.isLoading">
            {{ usageRecordStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Over-usage Warning Modal -->
    <div v-if="showWarningModal" class="modal-overlay" @click.self="closeWarningModal">
      <div class="modal modal-warning">
        <h2>⚠️ 超量使用警告</h2>
        <p>{{ pendingWarning }}</p>
        <p class="warning-note">记录已保存，但请注意库存可能已为负数。</p>
        <div class="form-actions">
          <button @click="closeWarningModal" class="btn btn-primary">我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usage-records-page {
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

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.filters select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 250px;
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-filter label {
  color: #666;
  font-size: 0.9rem;
}

.date-filter input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.toolbar {
  margin-bottom: 1.5rem;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.usage-list {
  display: grid;
  gap: 1rem;
}

.usage-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
}

.usage-color {
  width: 12px;
  flex-shrink: 0;
}

.usage-info {
  flex: 1;
  padding: 1rem;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.usage-header h3 {
  margin: 0;
  color: #333;
  font-size: 1rem;
}

.usage-amount {
  font-weight: 600;
  color: #e74c3c;
  font-size: 1.1rem;
}

.usage-details {
  display: flex;
  gap: 1.5rem;
  color: #666;
  font-size: 0.9rem;
}

.notes {
  margin: 0.5rem 0 0 0;
  color: #888;
  font-size: 0.85rem;
  font-style: italic;
}

.usage-actions {
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.modal-confirm p,
.modal-warning p {
  color: #666;
  margin-bottom: 1rem;
}

.modal-warning {
  border-top: 4px solid #f39c12;
}

.modal-warning h2 {
  color: #f39c12;
}

.warning-note {
  font-size: 0.9rem;
  color: #888;
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

.warning-inline {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 0.9rem;
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
</style>
