<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const localError = ref('');

async function handleSubmit() {
  localError.value = '';
  authStore.clearError();

  if (password.value !== confirmPassword.value) {
    localError.value = '两次输入的密码不一致';
    return;
  }

  if (password.value.length < 6) {
    localError.value = '密码长度至少为6位';
    return;
  }

  const success = await authStore.register({
    name: name.value,
    email: email.value,
    password: password.value,
  });
  if (success) {
    router.push('/');
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>注册</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">用户名</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="请输入用户名"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码（至少6位）"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <div v-if="localError || authStore.error" class="error-message">
          {{ localError || authStore.error }}
        </div>
        <button type="submit" :disabled="authStore.isLoading" class="submit-btn">
          {{ authStore.isLoading ? '注册中...' : '注册' }}
        </button>
      </form>
      <p class="auth-link">
        已有账号？<router-link to="/login">立即登录</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 1rem;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.auth-card h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #4a90d9;
}

.form-group input:disabled {
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

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #357abd;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.auth-link {
  text-align: center;
  margin-top: 1rem;
  color: #666;
}

.auth-link a {
  color: #4a90d9;
  text-decoration: none;
}

.auth-link a:hover {
  text-decoration: underline;
}
</style>
