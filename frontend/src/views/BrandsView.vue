<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useBrandStore, type Brand, type BrandFormData } from '@/stores/brand';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const brandStore = useBrandStore();

const showForm = ref(false);
const editingBrand = ref<Brand | null>(null);
const formData = ref<BrandFormData>({
  name: '',
  description: '',
  website: '',
});
const deleteConfirmId = ref<string | null>(null);

onMounted(async () => {
  await brandStore.fetchBrands();
});

function openCreateForm() {
  editingBrand.value = null;
  formData.value = { name: '', description: '', website: '' };
  brandStore.clearError();
  showForm.value = true;
}

function openEditForm(brand: Brand) {
  editingBrand.value = brand;
  formData.value = {
    name: brand.name,
    description: brand.description || '',
    website: brand.website || '',
  };
  brandStore.clearError();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingBrand.value = null;
  formData.value = { name: '', description: '', website: '' };
  brandStore.clearError();
}

async function handleSubmit() {
  if (editingBrand.value) {
    const result = await brandStore.updateBrand(editingBrand.value.id, formData.value);
    if (result) {
      closeForm();
    }
  } else {
    const result = await brandStore.createBrand(formData.value);
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
    const success = await brandStore.deleteBrand(deleteConfirmId.value);
    if (success) {
      deleteConfirmId.value = null;
    }
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="brands-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>品牌管理</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <div class="toolbar">
        <button @click="openCreateForm" class="btn btn-primary">
          + 新增品牌
        </button>
      </div>

      <div v-if="brandStore.isLoading && !showForm" class="loading">
        加载中...
      </div>

      <div v-else-if="brandStore.brands.length === 0" class="empty-state">
        <p>暂无品牌数据</p>
        <p>点击"新增品牌"按钮添加您的第一个品牌</p>
      </div>

      <div v-else class="brand-list">
        <div v-for="brand in brandStore.brands" :key="brand.id" class="brand-card">
          <div class="brand-info">
            <h3>{{ brand.name }}</h3>
            <p v-if="brand.description" class="description">{{ brand.description }}</p>
            <a v-if="brand.website" :href="brand.website" target="_blank" class="website">
              {{ brand.website }}
            </a>
          </div>
          <div class="brand-actions">
            <button @click="openEditForm(brand)" class="btn btn-secondary">编辑</button>
            <button @click="confirmDelete(brand.id)" class="btn btn-danger">删除</button>
          </div>
        </div>
      </div>
    </main>


    <!-- Create/Edit Form Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ editingBrand ? '编辑品牌' : '新增品牌' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">品牌名称 *</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              placeholder="请输入品牌名称"
              required
              :disabled="brandStore.isLoading"
            />
          </div>
          <div class="form-group">
            <label for="description">描述</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="请输入品牌描述（可选）"
              rows="3"
              :disabled="brandStore.isLoading"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="website">官网</label>
            <input
              id="website"
              v-model="formData.website"
              type="url"
              placeholder="https://example.com（可选）"
              :disabled="brandStore.isLoading"
            />
          </div>
          <div v-if="brandStore.error" class="error-message">
            {{ brandStore.error }}
          </div>
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn btn-secondary" :disabled="brandStore.isLoading">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="brandStore.isLoading">
              {{ brandStore.isLoading ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteConfirmId" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>确定要删除这个品牌吗？此操作无法撤销。</p>
        <div v-if="brandStore.error" class="error-message">
          {{ brandStore.error }}
        </div>
        <div class="form-actions">
          <button @click="cancelDelete" class="btn btn-secondary" :disabled="brandStore.isLoading">
            取消
          </button>
          <button @click="handleDelete" class="btn btn-danger" :disabled="brandStore.isLoading">
            {{ brandStore.isLoading ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.brands-page {
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

.brand-list {
  display: grid;
  gap: 1rem;
}

.brand-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.brand-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.brand-info .description {
  color: #666;
  margin: 0 0 0.5rem 0;
}

.brand-info .website {
  color: #4a90d9;
  text-decoration: none;
  font-size: 0.9rem;
}

.brand-info .website:hover {
  text-decoration: underline;
}

.brand-actions {
  display: flex;
  gap: 0.5rem;
}

.brand-actions .btn {
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
