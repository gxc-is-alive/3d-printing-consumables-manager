<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import { useToast } from '@/composables/useToast';
import { showConfirmDialog } from 'vant';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// 功能菜单配置
const menuGroups = [
  {
    title: '数据管理',
    items: [
      { icon: 'chart-trending-o', label: '仪表盘', route: '/m/dashboard', color: '#42b883' },
      { icon: 'notes-o', label: '使用记录', route: '/m/usages', color: '#4a90d9' },
      { icon: 'setting-o', label: '保养记录', route: '/m/maintenance', color: '#67c23a' },
    ],
  },
  {
    title: '基础设置',
    items: [
      { icon: 'label-o', label: '品牌管理', route: '/m/brands', color: '#e6a23c' },
      { icon: 'apps-o', label: '类型管理', route: '/m/types', color: '#909399' },
    ],
  },
  {
    title: '系统',
    items: [
      { icon: 'down', label: '数据备份', route: '/m/backup', color: '#f56c6c' },
    ],
  },
];

function navigateTo(route: string) {
  router.push(route);
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '确认退出',
      message: '确定要退出登录吗？',
    });
    await authStore.logout();
    toast.success('已退出登录');
    router.push('/login');
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <MobileLayout title="更多" :show-back="false" :show-tabbar="true">
    <div class="more-page">
      <!-- 用户信息卡片 -->
      <div class="user-card">
        <div class="user-avatar">
          <van-icon name="user-o" size="32" color="#42b883" />
        </div>
        <div class="user-info">
          <div class="user-name">{{ authStore.user?.name || '用户' }}</div>
          <div class="user-email">{{ authStore.user?.email }}</div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div v-for="group in menuGroups" :key="group.title" class="menu-group">
        <div class="group-title">{{ group.title }}</div>
        <van-cell-group inset>
          <van-cell
            v-for="item in group.items"
            :key="item.route"
            :title="item.label"
            is-link
            @click="navigateTo(item.route)"
          >
            <template #icon>
              <van-icon :name="item.icon" :color="item.color" size="20" class="menu-icon" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 退出登录 -->
      <div class="logout-section">
        <van-button block plain type="danger" @click="handleLogout">
          退出登录
        </van-button>
      </div>

      <!-- 版本信息 -->
      <div class="version-info">
        <p>3D打印耗材管理系统</p>
        <p>版本 1.1.0</p>
      </div>
    </div>
  </MobileLayout>
</template>

<style scoped>
.more-page {
  padding: 16px;
  padding-bottom: 80px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  padding: 24px 20px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.user-avatar {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info {
  flex: 1;
  color: white;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-email {
  font-size: 13px;
  opacity: 0.9;
}

.menu-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 13px;
  color: #969799;
  padding: 0 4px;
  margin-bottom: 8px;
}

.menu-icon {
  margin-right: 12px;
}

.logout-section {
  margin-top: 32px;
  padding: 0 16px;
}

.version-info {
  text-align: center;
  margin-top: 32px;
  color: #c8c9cc;
  font-size: 12px;
}

.version-info p {
  margin: 4px 0;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-cell) {
  padding: 14px 16px;
}
</style>
