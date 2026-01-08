<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import apiClient from '@/api/client';

const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');
const fileInput = ref<HTMLInputElement | null>(null);

async function exportJson() {
  isLoading.value = true;
  message.value = '';
  try {
    const response = await apiClient.get('/backup/export', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    message.value = '数据备份导出成功';
    messageType.value = 'success';
  } catch (error: any) {
    message.value = error.response?.data?.error || '导出失败';
    messageType.value = 'error';
  } finally {
    isLoading.value = false;
  }
}

async function exportExcel() {
  isLoading.value = true;
  message.value = '';
  try {
    const response = await apiClient.get('/backup/excel', { responseType: 'blob' });
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consumables-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    message.value = 'Excel导出成功';
    messageType.value = 'success';
  } catch (error: any) {
    message.value = error.response?.data?.error || '导出失败';
    messageType.value = 'error';
  } finally {
    isLoading.value = false;
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    message.value = '请选择 JSON 格式的备份文件';
    messageType.value = 'error';
    return;
  }

  const confirmed = window.confirm('警告：导入备份将覆盖您当前的所有数据！确定要继续吗？');
  if (!confirmed) {
    target.value = '';
    return;
  }

  isLoading.value = true;
  message.value = '';

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    await apiClient.post('/backup/import', data);
    message.value = '数据恢复成功！页面将在3秒后刷新...';
    messageType.value = 'success';
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      message.value = '无效的备份文件格式';
    } else {
      message.value = error.response?.data?.error || '导入失败';
    }
    messageType.value = 'error';
  } finally {
    isLoading.value = false;
    target.value = '';
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="backup-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>数据备份与导出</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>

      <div class="backup-sections">
        <section class="backup-section">
          <h2>📦 数据备份</h2>
          <p class="description">导出您的所有数据为 JSON 格式，可用于备份或迁移到其他设备。</p>
          <div class="actions">
            <button @click="exportJson" :disabled="isLoading" class="btn btn-primary">
              {{ isLoading ? '导出中...' : '导出 JSON 备份' }}
            </button>
          </div>
        </section>

        <section class="backup-section">
          <h2>📊 Excel 导出</h2>
          <p class="description">将耗材清单和使用记录导出为 Excel 表格，方便查看和打印。</p>
          <div class="actions">
            <button @click="exportExcel" :disabled="isLoading" class="btn btn-primary">
              {{ isLoading ? '导出中...' : '导出 Excel 报表' }}
            </button>
          </div>
        </section>

        <section class="backup-section restore-section">
          <h2>🔄 数据恢复</h2>
          <p class="description warning">从之前导出的 JSON 备份文件恢复数据。<strong>注意：这将覆盖您当前的所有数据！</strong></p>
          <div class="actions">
            <input 
              ref="fileInput" 
              type="file" 
              accept=".json" 
              @change="handleFileSelect" 
              style="display: none"
            />
            <button @click="triggerFileInput" :disabled="isLoading" class="btn btn-warning">
              {{ isLoading ? '恢复中...' : '选择备份文件恢复' }}
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.backup-page {
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
  max-width: 800px;
  margin: 0 auto;
}

.message {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.message.success {
  background: #d4edda;
  color: #155724;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
}

.backup-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.backup-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.backup-section h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #333;
}

.description {
  color: #666;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.description.warning {
  color: #856404;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4a90d9;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
}

.restore-section {
  border: 2px dashed #ffc107;
}
</style>
