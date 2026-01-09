<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useBrandStore, type Brand, type BrandFormData } from '@/stores/brand';
import { useBrandConfigFileStore, type BrandConfigFile } from '@/stores/brandConfigFile';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const brandStore = useBrandStore();
const configFileStore = useBrandConfigFileStore();

const showForm = ref(false);
const editingBrand = ref<Brand | null>(null);
const formData = ref<BrandFormData>({
  name: '',
  description: '',
  website: '',
});
const deleteConfirmId = ref<string | null>(null);

// 配置文件管理相关状态
const showConfigFiles = ref(false);
const currentBrandForFiles = ref<Brand | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const deleteFileConfirmId = ref<string | null>(null);

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

// 配置文件管理函数
async function openConfigFiles(brand: Brand) {
  currentBrandForFiles.value = brand;
  configFileStore.clearError();
  configFileStore.clearFiles();
  showConfigFiles.value = true;
  await configFileStore.fetchFiles(brand.id);
}

function closeConfigFiles() {
  showConfigFiles.value = false;
  currentBrandForFiles.value = null;
  configFileStore.clearFiles();
  configFileStore.clearError();
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0 && currentBrandForFiles.value) {
    const fileList = Array.from(files);
    await configFileStore.uploadFiles(currentBrandForFiles.value.id, fileList);
    // 清空 input 以便可以再次选择相同文件
    target.value = '';
  }
}

async function handleDownload(file: BrandConfigFile) {
  await configFileStore.downloadFile(file.id, file.fileName);
}

function confirmDeleteFile(fileId: string) {
  deleteFileConfirmId.value = fileId;
}

function cancelDeleteFile() {
  deleteFileConfirmId.value = null;
}

async function handleDeleteFile() {
  if (deleteFileConfirmId.value) {
    const success = await configFileStore.deleteFile(deleteFileConfirmId.value);
    if (success) {
      deleteFileConfirmId.value = null;
    }
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
            <button @click="openConfigFiles(brand)" class="btn btn-info">配置文件</button>
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

    <!-- Config Files Modal -->
    <div v-if="showConfigFiles" class="modal-overlay" @click.self="closeConfigFiles">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>配置文件 - {{ currentBrandForFiles?.name }}</h2>
          <button @click="closeConfigFiles" class="close-btn">&times;</button>
        </div>
        
        <div class="upload-section">
          <input
            ref="fileInput"
            type="file"
            multiple
            @change="handleFileSelect"
            style="display: none"
          />
          <button 
            @click="triggerFileInput" 
            class="btn btn-primary"
            :disabled="configFileStore.isLoading"
          >
            {{ configFileStore.isLoading ? '上传中...' : '+ 上传文件' }}
          </button>
          <span class="upload-hint">支持任意文件类型，可多选</span>
        </div>

        <div v-if="configFileStore.error" class="error-message">
          {{ configFileStore.error }}
        </div>

        <div v-if="configFileStore.isLoading && configFileStore.files.length === 0" class="loading">
          加载中...
        </div>

        <div v-else-if="configFileStore.files.length === 0" class="empty-state">
          <p>暂无配置文件</p>
          <p>点击"上传文件"按钮添加配置文件</p>
        </div>

        <div v-else class="file-list">
          <div v-for="file in configFileStore.files" :key="file.id" class="file-item">
            <div class="file-info">
              <span class="file-name">{{ file.fileName }}</span>
              <span class="file-meta">
                {{ formatFileSize(file.fileSize) }} · {{ formatDate(file.createdAt) }}
              </span>
            </div>
            <div class="file-actions">
              <button @click="handleDownload(file)" class="btn btn-small btn-secondary">
                下载
              </button>
              <button @click="confirmDeleteFile(file.id)" class="btn btn-small btn-danger">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete File Confirmation Modal -->
    <div v-if="deleteFileConfirmId" class="modal-overlay" @click.self="cancelDeleteFile">
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>确定要删除这个配置文件吗？此操作无法撤销。</p>
        <div v-if="configFileStore.error" class="error-message">
          {{ configFileStore.error }}
        </div>
        <div class="form-actions">
          <button @click="cancelDeleteFile" class="btn btn-secondary" :disabled="configFileStore.isLoading">
            取消
          </button>
          <button @click="handleDeleteFile" class="btn btn-danger" :disabled="configFileStore.isLoading">
            {{ configFileStore.isLoading ? '删除中...' : '确认删除' }}
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

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
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

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
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

.modal-large {
  max-width: 700px;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

/* 配置文件相关样式 */
.upload-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.upload-hint {
  color: #888;
  font-size: 0.85rem;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #eee;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.file-name {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.8rem;
  color: #888;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
</style>
