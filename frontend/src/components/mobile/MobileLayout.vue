<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

interface Props {
  title?: string;
  showBack?: boolean;
  showHeader?: boolean;
  showTabbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showBack: false,
  showHeader: true,
  showTabbar: true,
});

const router = useRouter();
const route = useRoute();

// Tabbar 配置
const tabbarItems = [
  { name: 'home', icon: 'home-o', label: '首页', path: '/m' },
  { name: 'consumables', icon: 'goods-collect-o', label: '耗材', path: '/m/consumables' },
  { name: 'accessories', icon: 'setting-o', label: '配件', path: '/m/accessories' },
  { name: 'more', icon: 'more-o', label: '更多', path: '/m/more' },
];

// 当前激活的 tab
const activeTab = computed(() => {
  const path = route.path;
  // 精确匹配优先，然后是前缀匹配
  // 注意：/m/more 不应该匹配 /m，所以需要特殊处理
  if (path === '/m' || path === '/m/') {
    return 'home';
  }
  // 查找精确匹配或前缀匹配的 tab
  for (const item of tabbarItems) {
    if (item.path === '/m') continue; // 跳过首页，已经处理过了
    if (path === item.path || path.startsWith(item.path + '/')) {
      return item.name;
    }
  }
  return 'home';
});

function handleBack() {
  router.back();
}

function handleTabChange(name: string | number) {
  const item = tabbarItems.find((item) => item.name === name);
  if (item) {
    router.push(item.path);
  }
}
</script>

<template>
  <div class="mobile-layout">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      v-if="showHeader"
      :title="title"
      :left-arrow="showBack"
      fixed
      placeholder
      safe-area-inset-top
      @click-left="handleBack"
    >
      <template #right>
        <slot name="headerRight" />
      </template>
    </van-nav-bar>

    <!-- 主内容区域 -->
    <main class="mobile-content" :class="{ 'no-header': !showHeader, 'no-tabbar': !showTabbar }">
      <slot />
    </main>

    <!-- 底部导航栏 -->
    <van-tabbar
      v-if="showTabbar"
      :model-value="activeTab"
      fixed
      safe-area-inset-bottom
      @change="handleTabChange"
    >
      <van-tabbar-item
        v-for="item in tabbarItems"
        :key="item.name"
        :name="item.name"
        :icon="item.icon"
      >
        {{ item.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  background: #f7f8fa;
}

.mobile-content {
  padding-bottom: 50px;
}

.mobile-content.no-header {
  padding-top: 0;
}

.mobile-content.no-tabbar {
  padding-bottom: 0;
}

/* Vant 主题定制 */
:deep(.van-nav-bar) {
  --van-nav-bar-background: #fff;
  --van-nav-bar-title-font-size: 17px;
  --van-nav-bar-title-text-color: #323233;
}

:deep(.van-tabbar) {
  --van-tabbar-item-active-color: #42b883;
}
</style>
