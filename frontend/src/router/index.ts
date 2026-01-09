import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes: RouteRecordRaw[] = [
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

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // If route requires auth
  if (to.meta.requiresAuth) {
    // Check if we have a token
    if (!authStore.token) {
      next({ name: "Login" });
      return;
    }

    // If we have a token but no user data, try to fetch it
    if (!authStore.user) {
      const success = await authStore.fetchCurrentUser();
      if (!success) {
        next({ name: "Login" });
        return;
      }
    }
  }

  // If user is authenticated and trying to access login/register, redirect to home
  if (
    (to.name === "Login" || to.name === "Register") &&
    authStore.isAuthenticated
  ) {
    next({ name: "Home" });
    return;
  }

  next();
});

export default router;
