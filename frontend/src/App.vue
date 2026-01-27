<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router';
import { watch, onMounted, onUnmounted, ref, nextTick } from 'vue';
import { useDeviceDetector } from '@/composables/useDeviceDetector';

const router = useRouter();
const route = useRoute();
const { isMobile } = useDeviceDetector();

// 页面过渡动画名称
const transitionName = ref('fade');

// 防抖标志，避免频繁切换
let switchTimeout: ReturnType<typeof setTimeout> | null = null;

// 执行设备检测和路由切换
function performDeviceCheck(mobile: boolean) {
  const currentPath = route.path;
  
  console.log('[DeviceDetector] 检测结果:', { 
    mobile, 
    currentPath, 
    screenWidth: window.innerWidth
  });
  
  // 排除登录、注册、捐赠页面
  const excludePaths = ['/login', '/register', '/donate'];
  if (excludePaths.some(p => currentPath.startsWith(p))) {
    return;
  }
  
  if (mobile && !currentPath.startsWith('/m')) {
    const mobileRoute = getMobileRoute(currentPath);
    console.log('[DeviceDetector] 跳转到移动端:', mobileRoute);
    router.replace(mobileRoute);
  } else if (!mobile && currentPath.startsWith('/m')) {
    const desktopRoute = getDesktopRoute(currentPath);
    console.log('[DeviceDetector] 跳转到PC端:', desktopRoute);
    router.replace(desktopRoute);
  }
}

// 监听路由变化，设置过渡动画方向
router.beforeEach((to, from) => {
  // 移动端页面使用滑动动画
  if (to.path.startsWith('/m') && from.path.startsWith('/m')) {
    // 根据路由深度判断方向
    const toDepth = to.path.split('/').length;
    const fromDepth = from.path.split('/').length;
    transitionName.value = toDepth > fromDepth ? 'slide-left' : 'slide-right';
  } else {
    transitionName.value = 'fade';
  }
});

// 监听设备变化，自动切换路由（带防抖）
watch(isMobile, (mobile) => {
  // 清除之前的定时器
  if (switchTimeout) {
    clearTimeout(switchTimeout);
  }
  // 防抖 200ms，避免窗口调整时频繁切换
  switchTimeout = setTimeout(() => {
    performDeviceCheck(mobile);
  }, 200);
}, { immediate: false });

// 初始化时检查设备类型
onMounted(() => {
  // 延迟执行，确保布局完成
  nextTick(() => {
    setTimeout(() => {
      performDeviceCheck(isMobile.value);
    }, 50);
  });
});

// 清理定时器
onUnmounted(() => {
  if (switchTimeout) {
    clearTimeout(switchTimeout);
  }
});

// PC路由转移动端路由
function getMobileRoute(path: string): string {
  const routeMap: Record<string, string> = {
    '/': '/m',
    '/dashboard': '/m/dashboard',
    '/consumables': '/m/consumables',
    '/accessories': '/m/accessories',
    '/usages': '/m/usages',
    '/maintenance': '/m/maintenance',
    '/brands': '/m/brands',
    '/types': '/m/types',
    '/backup': '/m/backup',
  };
  return routeMap[path] || '/m';
}

// 移动端路由转PC路由
function getDesktopRoute(path: string): string {
  const routeMap: Record<string, string> = {
    '/m': '/',
    '/m/dashboard': '/dashboard',
    '/m/consumables': '/consumables',
    '/m/accessories': '/accessories',
    '/m/usages': '/usages',
    '/m/maintenance': '/maintenance',
    '/m/brands': '/brands',
    '/m/types': '/types',
    '/m/backup': '/backup',
    '/m/more': '/',
  };
  return routeMap[path] || '/';
}
</script>

<template>
  <div id="app">
    <RouterView v-slot="{ Component }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
}

/* 页面切换动画 - 滑动效果 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}

/* 淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
