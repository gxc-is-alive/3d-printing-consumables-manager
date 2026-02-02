<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';
import { useAccessoryStore } from '@/stores/accessory';
import MobileLayout from '@/components/mobile/MobileLayout.vue';
import StatsCard from '@/components/mobile/StatsCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const accessoryStore = useAccessoryStore();

const isRefreshing = ref(false);

// 功能入口配置
const quickActions = [
  { id: 'dashboard', icon: 'chart-trending-o', label: '仪表盘', route: '/m/dashboard', color: '#42b883' },
  { id: 'usages', icon: 'notes-o', label: '使用记录', route: '/m/usages', color: '#909399' },
  { id: 'maintenance', icon: 'setting-o', label: '保养记录', route: '/m/maintenance', color: '#67c23a' },
  { id: 'brands', icon: 'label-o', label: '品牌', route: '/m/brands', color: '#4a90d9' },
  { id: 'types', icon: 'apps-o', label: '类型', route: '/m/types', color: '#e6a23c' },
  { id: 'backup', icon: 'down', label: '备份', route: '/m/backup', color: '#f56c6c' },
];

// 计算警告数量
const alertCount = computed(() => {
  let count = 0;
  if (dashboardStore.stats?.lowStockItems) {
    count += dashboardStore.stats.lowStockItems.length;
  }
  if (accessoryStore.alerts) {
    count += accessoryStore.alerts.length;
  }
  return count;
});

// 格式化重量
function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(2)}kg`;
  }
  return `${weight.toFixed(0)}g`;
}

onMounted(async () => {
  await Promise.all([
    dashboardStore.fetchAll(),
    accessoryStore.fetchAlerts(),
  ]);
});

async function handleRefresh() {
  isRefreshing.value = true;
  await Promise.all([
    dashboardStore.fetchAll(),
    accessoryStore.fetchAlerts(),
  ]);
  isRefreshing.value = false;
}

function navigateTo(route: string) {
  router.push(route);
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <MobileLayout :show-header="false" :show-tabbar="true">
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="mobile-home">
        <!-- 头部欢迎区域 -->
        <header class="home-header">
          <div class="welcome-section">
            <h1 class="welcome-title">3D打印耗材管理</h1>
            <p class="welcome-text">欢迎，{{ authStore.user?.name }}</p>
          </div>
          <van-button
            icon="poweroff-circle-o"
            round
            size="small"
            class="logout-btn"
            @click="handleLogout"
          />
        </header>

        <!-- 警告提示 -->
        <van-notice-bar
          v-if="alertCount > 0"
          left-icon="warning-o"
          mode="link"
          :text="`${alertCount} 条提醒需要处理`"
          @click="navigateTo('/m/dashboard')"
        />

        <!-- 库存概览 -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">库存概览</h2>
          </div>
          
          <van-skeleton :loading="dashboardStore.isLoading" :row="2">
            <div class="stats-grid">
              <StatsCard
                :value="dashboardStore.stats?.totalConsumables || 0"
                label="耗材总数"
                icon="goods-collect-o"
                color="#42b883"
              />
              <StatsCard
                :value="formatWeight(dashboardStore.stats?.totalRemainingWeight || 0)"
                label="剩余总量"
                icon="balance-o"
                color="#4a90d9"
              />
              <StatsCard
                :value="dashboardStore.stats?.openedCount || 0"
                label="已开封"
                icon="completed"
                color="#e6a23c"
              />
              <StatsCard
                :value="dashboardStore.stats?.unopenedCount || 0"
                label="未开封"
                icon="gift-o"
                color="#909399"
              />
            </div>
          </van-skeleton>
        </section>

        <!-- 功能入口 -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">功能</h2>
          </div>
          <van-grid :column-num="3" :border="false" :gutter="12">
            <van-grid-item
              v-for="action in quickActions"
              :key="action.id"
              :icon="action.icon"
              :text="action.label"
              :icon-color="action.color"
              @click="navigateTo(action.route)"
            />
          </van-grid>
        </section>

        <!-- 低库存警告 -->
        <section v-if="dashboardStore.stats?.lowStockItems?.length" class="section">
          <div class="section-header">
            <h2 class="section-title warning-title">
              <van-icon name="warning-o" color="#ee0a24" />
              低库存警告
            </h2>
          </div>
          
          <van-cell-group inset>
            <van-cell
              v-for="item in dashboardStore.stats.lowStockItems.slice(0, 3)"
              :key="item.id"
              :title="`${item.brandName} ${item.typeName}`"
              :label="item.color"
              is-link
              @click="navigateTo('/m/consumables')"
            >
              <template #value>
                <span class="low-stock-value">
                  {{ formatWeight(item.remainingWeight) }}
                  <van-tag type="danger">{{ item.percentRemaining }}%</van-tag>
                </span>
              </template>
            </van-cell>
          </van-cell-group>
          
          <van-button
            v-if="dashboardStore.stats.lowStockItems.length > 3"
            block
            plain
            type="default"
            size="small"
            class="view-all-btn"
            @click="navigateTo('/m/dashboard')"
          >
            查看全部 {{ dashboardStore.stats.lowStockItems.length }} 条
          </van-button>
        </section>
      </div>
    </van-pull-refresh>
  </MobileLayout>
</template>

<style scoped>
.mobile-home {
  padding-bottom: 16px;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 16px;
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  border-radius: 0 0 24px 24px;
}

.welcome-section {
  color: white;
}

.welcome-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
}

.welcome-text {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.section {
  padding: 0 16px;
  margin-top: 20px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.warning-title {
  color: #ee0a24;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.low-stock-value {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ee0a24;
  font-weight: 500;
}

.view-all-btn {
  margin-top: 12px;
}

:deep(.van-grid-item__content) {
  background: #fff;
  border-radius: 12px;
  padding: 16px 8px;
}

:deep(.van-grid-item__text) {
  margin-top: 8px;
  font-size: 12px;
}

:deep(.van-notice-bar) {
  margin: 16px;
  border-radius: 8px;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}
</style>
