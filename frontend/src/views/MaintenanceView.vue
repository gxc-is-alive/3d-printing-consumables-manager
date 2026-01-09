<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMaintenanceStore, MAINTENANCE_TYPES, type MaintenanceType, type MaintenanceFormData } from '@/stores/maintenance';

const router = useRouter();
const maintenanceStore = useMaintenanceStore();

const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const deletingId = ref<string | null>(null);

const formData = ref<MaintenanceFormData>({
  date: new Date().toISOString().split('T')[0],
  type: 'cleaning',
  description: '',
});

onMounted(() => {
  maintenanceStore.fetchRecords();
});

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  formData.value = {
    date: new Date().toISOString().split('T')[0],
    type: 'cleaning',
    description: '',
  };
  showModal.value = true;
}

function openEditModal(record: { id: string; date: string; type: string; description: string | null }) {
  isEditing.value = true;
  editingId.value = record.id;
  formData.value = {
    date: record.date.split('T')[0],
    type: record.type,
    description: record.description || '',
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  maintenanceStore.clearError();
}

async function handleSubmit() {
  if (isEditing.value && editingId.value) {
    const result = await maintenanceStore.updateRecord(editingId.value, formData.value);
    if (result) {
      closeModal();
    }
  } else {
    const result = await maintenanceStore.createRecord(formData.value);
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
    await maintenanceStore.deleteRecord(deletingId.value);
    showDeleteConfirm.value = false;
    deletingId.value = null;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getTypeLabel(type: string): string {
  return MAINTENANCE_TYPES[type as MaintenanceType] || type;
}
</script>

<template>
  <div class="maintenance-view">
    <header class="page-header">
      <div class="header-left">
        <button @click="router.push('/')" class="back-btn">← 返回</button>
        <h1>🔧 保养记录</h1>
      </div>
      <button @click="openCreateModal" class="add-btn">+ 新增记录</button>
    </header>

    <main class="page-content">
      <div v-if="maintenanceStore.isLoading" class="loading">加载中...</div>
      
      <div v-else-if="maintenanceStore.records.length === 0" class="empty-state">
        <p>暂无保养记录</p>
        <p class="hint">点击右上角"新增记录"添加第一条保养记录</p>
      </div>

      <div v-else class="records-list">
        <div v-for="record in maintenanceStore.records" :key="record.id" class="record-card">
          <div class="record-header">
            <span class="record-date">{{ formatDate(record.date) }}</span>
            <span class="record-type" :class="record.type">{{ getTypeLabel(record.type) }}</span>
          </div>
          <p v-if="record.description" class="record-description">{{ record.description }}</p>
          <div class="record-actions">
            <button @click="openEditModal(record)" class="edit-btn">编辑</button>
            <button @click="confirmDelete(record.id)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </main>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ isEditing ? '编辑保养记录' : '新增保养记录' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="date">保养日期</label>
            <input type="date" id="date" v-model="formData.date" required />
          </div>
          <div class="form-group">
            <label for="type">保养类型</label>
            <select id="type" v-model="formData.type" required>
              <option v-for="(label, value) in MAINTENANCE_TYPES" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="description">保养内容（可选）</label>
            <textarea id="description" v-model="formData.description" rows="3" placeholder="描述保养内容..."></textarea>
          </div>
          <div v-if="maintenanceStore.error" class="error-message">{{ maintenanceStore.error }}</div>
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn" :disabled="maintenanceStore.isLoading">
              {{ maintenanceStore.isLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal confirm-modal">
        <h2>确认删除</h2>
        <p>确定要删除这条保养记录吗？此操作不可撤销。</p>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="cancel-btn">取消</button>
          <button @click="handleDelete" class="delete-confirm-btn" :disabled="maintenanceStore.isLoading">
            {{ maintenanceStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.maintenance-view {
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
  max-width: 800px;
  margin: 0 auto;
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

.records-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.record-date {
  font-weight: 600;
  color: #333;
}

.record-type {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  background: #e0e0e0;
  color: #666;
}

.record-type.cleaning { background: #e3f2fd; color: #1976d2; }
.record-type.lubrication { background: #fff3e0; color: #f57c00; }
.record-type.replacement { background: #fce4ec; color: #c2185b; }
.record-type.calibration { background: #e8f5e9; color: #388e3c; }
.record-type.other { background: #f3e5f5; color: #7b1fa2; }

.record-description {
  color: #666;
  margin: 0.5rem 0;
  line-height: 1.5;
}

.record-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.edit-btn, .delete-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
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
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
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
</style>
