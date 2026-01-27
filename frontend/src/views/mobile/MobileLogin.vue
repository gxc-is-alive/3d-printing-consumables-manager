<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');

async function handleSubmit() {
  if (!email.value.trim()) {
    toast.error('请输入邮箱');
    return;
  }
  if (!password.value) {
    toast.error('请输入密码');
    return;
  }

  const success = await authStore.login({
    email: email.value,
    password: password.value,
  });

  if (success) {
    toast.success('登录成功');
    router.push('/m');
  } else {
    toast.error(authStore.error || '登录失败');
  }
}

function goToRegister() {
  router.push('/register');
}
</script>

<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
    </div>

    <!-- Logo 区域 -->
    <div class="logo-section">
      <div class="logo">🖨️</div>
      <h1 class="app-name">3D 打印耗材管理</h1>
      <p class="app-desc">轻松管理您的打印耗材</p>
    </div>

    <!-- 登录表单 -->
    <div class="form-section">
      <van-form @submit="handleSubmit">
        <van-cell-group inset>
          <van-field
            v-model="email"
            name="email"
            label=""
            placeholder="请输入邮箱"
            left-icon="envelop-o"
            :disabled="authStore.isLoading"
            autocomplete="email"
            :rules="[{ required: true, message: '请输入邮箱' }]"
          />
          <van-field
            v-model="password"
            type="password"
            name="password"
            label=""
            placeholder="请输入密码"
            left-icon="lock"
            :disabled="authStore.isLoading"
            autocomplete="current-password"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>

        <div class="form-actions">
          <van-button
            block
            type="primary"
            native-type="submit"
            :loading="authStore.isLoading"
            loading-text="登录中..."
          >
            登 录
          </van-button>
        </div>
      </van-form>

      <div class="register-link">
        还没有账号？
        <a @click="goToRegister">立即注册</a>
      </div>
    </div>

    <!-- 底部装饰 -->
    <div class="footer">
      <p>安全 · 便捷 · 高效</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8faf9 0%, #e8f5e9 100%);
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: #42b883;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background: #35495e;
  bottom: 100px;
  left: -80px;
}

/* Logo 区域 */
.logo-section {
  text-align: center;
  padding-top: 80px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.logo {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(66, 184, 131, 0.2);
}

.app-name {
  font-size: 24px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 8px;
}

.app-desc {
  font-size: 14px;
  color: #969799;
  margin: 0;
}

/* 表单区域 */
.form-section {
  flex: 1;
  position: relative;
  z-index: 1;
}

.form-actions {
  padding: 24px 16px;
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #969799;
}

.register-link a {
  color: #42b883;
  font-weight: 500;
  cursor: pointer;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 24px 0;
  position: relative;
  z-index: 1;
}

.footer p {
  font-size: 12px;
  color: #c8c9cc;
  margin: 0;
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.van-field__left-icon) {
  margin-right: 12px;
}

:deep(.van-button--primary) {
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  border: none;
  border-radius: 12px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}
</style>
