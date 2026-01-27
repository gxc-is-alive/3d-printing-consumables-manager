import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 检测是否为移动设备
function checkIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  const width =
    window.innerWidth || document.documentElement.clientWidth || 1024;
  const ua = navigator.userAgent || "";
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(
      ua
    );
  return width < 768 || (isMobileUA && width < 1024);
}

// PC端路由
const desktopRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/HomeView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: () => import("@/views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/brands",
    name: "Brands",
    component: () => import("@/views/BrandsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/types",
    name: "ConsumableTypes",
    component: () => import("@/views/ConsumableTypesView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/consumables",
    name: "Consumables",
    component: () => import("@/views/ConsumablesView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/usages",
    name: "UsageRecords",
    component: () => import("@/views/UsageRecordsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/backup",
    name: "Backup",
    component: () => import("@/views/BackupView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/maintenance",
    name: "Maintenance",
    component: () => import("@/views/MaintenanceView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/accessories",
    name: "Accessories",
    component: () => import("@/views/AccessoriesView.vue"),
    meta: { requiresAuth: true },
  },
];

// 移动端路由
const mobileRoutes: RouteRecordRaw[] = [
  {
    path: "/m",
    name: "MobileHome",
    component: () => import("@/views/mobile/MobileHome.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/dashboard",
    name: "MobileDashboard",
    component: () => import("@/views/mobile/MobileDashboard.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/consumables",
    name: "MobileConsumables",
    component: () => import("@/views/mobile/MobileConsumables.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/accessories",
    name: "MobileAccessories",
    component: () => import("@/views/mobile/MobileAccessories.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/usages",
    name: "MobileUsages",
    component: () => import("@/views/mobile/MobileUsages.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/maintenance",
    name: "MobileMaintenance",
    component: () => import("@/views/mobile/MobileMaintenance.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/more",
    name: "MobileMore",
    component: () => import("@/views/mobile/MobileMore.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/brands",
    name: "MobileBrands",
    component: () => import("@/views/mobile/MobileBrands.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/types",
    name: "MobileTypes",
    component: () => import("@/views/mobile/MobileTypes.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/backup",
    name: "MobileBackup",
    component: () => import("@/views/mobile/MobileBackup.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/m/login",
    name: "MobileLogin",
    component: () => import("@/views/mobile/MobileLogin.vue"),
    meta: { requiresAuth: false },
  },
];

// 公共路由
const commonRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/LoginView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/RegisterView.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/donate",
    name: "Donate",
    component: () => import("@/views/DonateView.vue"),
    meta: { requiresAuth: false },
  },
];

const routes: RouteRecordRaw[] = [
  ...desktopRoutes,
  ...mobileRoutes,
  ...commonRoutes,
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const isMobile = checkIsMobile();

  // 设备类型路由重定向
  // 如果是移动设备访问PC路由，重定向到移动端
  if (
    isMobile &&
    !to.path.startsWith("/m") &&
    !to.path.startsWith("/login") &&
    !to.path.startsWith("/register") &&
    !to.path.startsWith("/donate")
  ) {
    const mobileRouteMap: Record<string, string> = {
      "/": "/m",
      "/dashboard": "/m/dashboard",
      "/consumables": "/m/consumables",
      "/accessories": "/m/accessories",
      "/usages": "/m/usages",
      "/maintenance": "/m/maintenance",
      "/brands": "/m/brands",
      "/types": "/m/types",
      "/backup": "/m/backup",
    };
    const mobileRoute = mobileRouteMap[to.path] || "/m";
    console.log("[Router] 移动设备访问PC路由，重定向到:", mobileRoute);
    next(mobileRoute);
    return;
  }

  // 如果是PC设备访问移动端路由，重定向到PC端
  if (!isMobile && to.path.startsWith("/m")) {
    const desktopRouteMap: Record<string, string> = {
      "/m": "/",
      "/m/dashboard": "/dashboard",
      "/m/consumables": "/consumables",
      "/m/accessories": "/accessories",
      "/m/usages": "/usages",
      "/m/maintenance": "/maintenance",
      "/m/brands": "/brands",
      "/m/types": "/types",
      "/m/backup": "/backup",
      "/m/more": "/",
    };
    const desktopRoute = desktopRouteMap[to.path] || "/";
    console.log("[Router] PC设备访问移动端路由，重定向到:", desktopRoute);
    next(desktopRoute);
    return;
  }

  // If route requires auth
  if (to.meta.requiresAuth) {
    // Check if we have a token
    if (!authStore.token) {
      // 移动设备跳转到移动端登录页
      if (isMobile) {
        next({ name: "MobileLogin" });
      } else {
        next({ name: "Login" });
      }
      return;
    }

    // If we have a token but no user data, try to fetch it
    if (!authStore.user) {
      const success = await authStore.fetchCurrentUser();
      if (!success) {
        if (isMobile) {
          next({ name: "MobileLogin" });
        } else {
          next({ name: "Login" });
        }
        return;
      }
    }
  }

  // If user is authenticated and trying to access login/register, redirect to home
  if (
    (to.name === "Login" ||
      to.name === "Register" ||
      to.name === "MobileLogin") &&
    authStore.isAuthenticated
  ) {
    if (isMobile) {
      next({ name: "MobileHome" });
    } else {
      next({ name: "Home" });
    }
    return;
  }

  next();
});

export default router;
