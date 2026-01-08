<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="home">
    <header class="page-header">
      <h1>3D打印耗材管理系统</h1>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <p class="welcome">欢迎使用耗材管理系统</p>
      
      <div class="nav-cards">
        <router-link to="/dashboard" class="nav-card highlight">
          <h2>📊 库存仪表盘</h2>
          <p>查看库存概览和统计数据</p>
        </router-link>
        <router-link to="/brands" class="nav-card">
          <h2>品牌管理</h2>
          <p>管理耗材品牌信息</p>
        </router-link>
        <router-link to="/types" class="nav-card">
          <h2>类型管理</h2>
          <p>管理耗材类型（PLA、ABS等）</p>
        </router-link>
        <router-link to="/consumables" class="nav-card">
          <h2>耗材管理</h2>
          <p>管理耗材库存</p>
        </router-link>
        <router-link to="/usages" class="nav-card">
          <h2>使用记录</h2>
          <p>记录耗材使用情况</p>
        </router-link>
        <router-link to="/backup" class="nav-card">
          <h2>💾 数据备份</h2>
          <p>备份数据、导出Excel报表</p>
        </router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home {
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

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
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

.welcome {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.nav-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.nav-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.nav-card:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.nav-card.highlight {
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  color: white;
}

.nav-card.highlight h2 {
  color: white;
}

.nav-card.highlight p {
  color: rgba(255, 255, 255, 0.9);
}

.nav-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.nav-card h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.25rem;
}

.nav-card p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}
</style>
