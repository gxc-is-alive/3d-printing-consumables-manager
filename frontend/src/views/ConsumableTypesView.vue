<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConsumableTypeStore, type ConsumableType, type ConsumableTypeFormData } from '@/stores/consumableType';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const typeStore = useConsumableTypeStore();

const showForm = ref(false);
const editingType = ref<ConsumableType | null>(null);
const formData = ref<ConsumableTypeFormData>({
  name: '',
  description: '',
  printTempMin: undefined,
  printTempMax: undefined,
  bedTempMin: undefined,
  bedTempMax: undefined,
});
const deleteConfirmId = ref<string | null>(null);

onMounted(async () => {
  await typeStore.fetchTypes();
});

function openCreateForm() {
  editingType.value = null;
  formData.value = {
    name: '',
    description: '',
    printTempMin: undefined,
    printTempMax: undefined,
    bedTempMin: undefined,
    bedTempMax: undefined,
  };
  typeStore.clearError();
  showForm.value = true;
}

function openEditForm(type: ConsumableType) {
  editingType.value = type;
  formData.value = {
    name: type.name,
    description: type.description || '',
    printTempMin: type.printTempMin ?? undefined,
    printTempMax: type.printTempMax ?? undefined,
    bedTempMin: type.bedTempMin ?? undefined,
    bedTempMax: type.bedTempMax ?? undefined,
  };
  typeStore.clearError();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingType.value = null;
  formData.value = {
    name: '',
    description: '',
    printTempMin: undefined,
    printTempMax: undefined,
    bedTempMin: undefined,
    bedTempMax: undefined,
  };
  typeStore.clearError();
}

async function handleSubmit() {
  // Convert empty strings to undefined for optional number fields
  const submitData: ConsumableTypeFormData = {
    name: formData.value.name,
    description: formData.value.description || undefined,
    printTempMin: formData.value.printTempMin,
    printTempMax: formData.value.printTempMax,
    bedTempMin: formData.value.bedTempMin,
    bedTempMax: formData.value.bedTempMax,
  };

  if (editingType.value) {
    const result = await typeStore.updateType(editingType.value.id, submitData);
    if (result) {
      closeForm();
    }
  } else {
    const result = await typeStore.createType(submitData);
    if (result) {
      closeForm();
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
    const success = await typeStore.deleteType(deleteConfirmId.value);
    if (success) {
      deleteConfirmId.value = null;
    }
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}

function formatTempRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '-';
  if (min !== null && max !== null) return `${min}°C - ${max}°C`;
  if (min !== null) return `≥${min}°C`;
  return `≤${max}°C`;
}
</script>

<template>
  <div class="types-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>耗材类型管理</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <div class="toolbar">
        <button @click="openCreateForm" class="btn btn-primary">
          + 新增类型
        </button>
      </div>

      <div v-if="typeStore.isLoading && !showForm" class="loading">
        加载中...
      </div>

      <div v-else-if="typeStore.types.length === 0" class="empty-state">
        <p>暂无耗材类型数据</p>
        <p>点击"新增类型"按钮添加您的第一个耗材类型</p>
      </div>

      <div v-else class="type-list">
        <div v-for="type in typeStore.types" :key="type.id" class="type-card">
          <div class="type-info">
            <h3>{{ type.name }}</h3>
            <p v-if="type.description" class="description">{{ type.description }}</p>
            <div class="temp-info">
              <span class="temp-label">打印温度:</span>
              <span class="temp-value">{{ formatTempRange(type.printTempMin, type.printTempMax) }}</span>
              <span class="temp-label">热床温度:</span>
              <span class="temp-value">{{ formatTempRange(type.bedTempMin, type.bedTempMax) }}</span>
            </div>
          </div>
          <div class="type-actions">
            <button @click="openEditForm(type)" class="btn btn-secondary">编辑</button>
            <button @click="confirmDelete(type.id)" class="btn btn-danger">删除</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ editingType ? '编辑耗材类型' : '新增耗材类型' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">类型名称 *</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              placeholder="例如: PLA, ABS, PETG"
              required
              :disabled="typeStore.isLoading"
            />
          </div>
          <div class="form-group">
            <label for="description">描述</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="请输入类型描述（可选）"
              rows="3"
              :disabled="typeStore.isLoading"
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="printTempMin">打印温度最低 (°C)</label>
              <input
                id="printTempMin"
                v-model.number="formData.printTempMin"
                type="number"
                min="0"
                max="400"
                placeholder="例如: 190"
                :disabled="typeStore.isLoading"
              />
            </div>
            <div class="form-group">
              <label for="printTempMax">打印温度最高 (°C)</label>
              <input
                id="printTempMax"
                v-model.number="formData.printTempMax"
                type="number"
                min="0"
                max="400"
                placeholder="例如: 220"
                :disabled="typeStore.isLoading"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="bedTempMin">热床温度最低 (°C)</label>
              <input
                id="bedTempMin"
                v-model.number="formData.bedTempMin"
                type="number"
                min="0"
                max="150"
                placeholder="例如: 50"
                :disabled="typeStore.isLoading"
              />
            </div>
            <div class="form-group">
              <label for="bedTempMax">热床温度最高 (°C)</label>
              <input
                id="bedTempMax"
                v-model.number="formData.bedTempMax"
                type="number"
                min="0"
                max="150"
                placeholder="例如: 70"
                :disabled="typeStore.isLoading"
              />
            </div>
          </div>
          <div v-if="typeStore.error" class="error-message">
            {{ typeStore.error }}
          </div>
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn btn-secondary" :disabled="typeStore.isLoading">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="typeStore.isLoading">
              {{ typeStore.isLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteConfirmId" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>确定要删除这个耗材类型吗？此操作无法撤销。</p>
        <div v-if="typeStore.error" class="error-message">
          {{ typeStore.error }}
        </div>
        <div class="form-actions">
          <button @click="cancelDelete" class="btn btn-secondary" :disabled="typeStore.isLoading">
            取消
          </button>
          <button @click="handleDelete" class="btn btn-danger" :disabled="typeStore.isLoading">
            {{ typeStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.types-page {
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
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
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

.type-list {
  display: grid;
  gap: 1rem;
}

.type-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.type-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.type-info .description {
  color: #666;
  margin: 0 0 0.5rem 0;
}

.temp-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.temp-label {
  color: #888;
}

.temp-value {
  color: #333;
  margin-right: 1rem;
}

.type-actions {
  display: flex;
  gap: 0.5rem;
}

.type-actions .btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
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

.modal-confirm p {
  color: #666;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4a90d9;
}

.form-group input:disabled,
.form-group textarea:disabled {
  background: #f5f5f5;
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
