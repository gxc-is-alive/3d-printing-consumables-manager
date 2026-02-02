<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  useConsumableTypeStore,
  type TypeCategory,
  type TypeSubtype,
} from "@/stores/consumableType";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();
const typeStore = useConsumableTypeStore();

// 表单状态
const showForm = ref(false);
const formMode = ref<"category" | "subtype">("category");
const editingCategory = ref<TypeCategory | null>(null);
const editingSubtype = ref<TypeSubtype | null>(null);
const selectedParentId = ref<string>("");

const formData = ref({
  name: "",
  description: "",
});

// 删除确认
const deleteConfirmType = ref<"category" | "subtype" | null>(null);
const deleteConfirmId = ref<string | null>(null);
const deleteConfirmName = ref<string>("");

// 迁移状态
const showMigrationDialog = ref(false);
const migrationPreview = ref<Awaited<
  ReturnType<typeof typeStore.previewMigration>
> | null>(null);

onMounted(async () => {
  await typeStore.fetchHierarchy();
  // 检查是否需要迁移
  const needsMigration = await typeStore.checkMigrationStatus();
  if (needsMigration) {
    showMigrationDialog.value = true;
    migrationPreview.value = await typeStore.previewMigration();
  }
});

// 大类选项
const categoryOptions = computed(() =>
  typeStore.hierarchy.categories.map((c) => ({
    value: c.id,
    label: c.name,
  }))
);

// 打开创建大类表单
function openCreateCategoryForm() {
  formMode.value = "category";
  editingCategory.value = null;
  formData.value = { name: "", description: "" };
  typeStore.clearError();
  showForm.value = true;
}

// 打开编辑大类表单
function openEditCategoryForm(category: TypeCategory) {
  formMode.value = "category";
  editingCategory.value = category;
  formData.value = {
    name: category.name,
    description: category.description || "",
  };
  typeStore.clearError();
  showForm.value = true;
}

// 打开创建小类表单
function openCreateSubtypeForm(categoryId?: string) {
  formMode.value = "subtype";
  editingSubtype.value = null;
  selectedParentId.value = categoryId || "";
  formData.value = { name: "", description: "" };
  typeStore.clearError();
  showForm.value = true;
}

// 打开编辑小类表单
function openEditSubtypeForm(subtype: TypeSubtype) {
  formMode.value = "subtype";
  editingSubtype.value = subtype;
  selectedParentId.value = subtype.parentId;
  formData.value = {
    name: subtype.name,
    description: subtype.description || "",
  };
  typeStore.clearError();
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingCategory.value = null;
  editingSubtype.value = null;
  formData.value = { name: "", description: "" };
  typeStore.clearError();
}


async function handleSubmit() {
  if (formMode.value === "category") {
    await handleCategorySubmit();
  } else {
    await handleSubtypeSubmit();
  }
}

async function handleCategorySubmit() {
  const submitData = {
    name: formData.value.name,
    description: formData.value.description || undefined,
  };

  if (editingCategory.value) {
    const result = await typeStore.updateCategory(
      editingCategory.value.id,
      submitData
    );
    if (result) {
      closeForm();
    }
  } else {
    const result = await typeStore.createCategory(submitData);
    if (result) {
      closeForm();
    }
  }
}

async function handleSubtypeSubmit() {
  if (!selectedParentId.value) {
    return;
  }

  const submitData = {
    name: formData.value.name,
    description: formData.value.description || undefined,
    parentId: selectedParentId.value,
  };

  if (editingSubtype.value) {
    const result = await typeStore.updateSubtype(editingSubtype.value.id, {
      name: submitData.name,
      description: submitData.description,
    });
    if (result) {
      closeForm();
    }
  } else {
    const result = await typeStore.createSubtype(submitData);
    if (result) {
      closeForm();
    }
  }
}

// 删除确认
function confirmDeleteCategory(category: TypeCategory) {
  if (category.children.length > 0) {
    alert("请先删除该大类下的所有小类");
    return;
  }
  deleteConfirmType.value = "category";
  deleteConfirmId.value = category.id;
  deleteConfirmName.value = category.name;
}

function confirmDeleteSubtype(subtype: TypeSubtype) {
  deleteConfirmType.value = "subtype";
  deleteConfirmId.value = subtype.id;
  deleteConfirmName.value = subtype.name;
}

function cancelDelete() {
  deleteConfirmType.value = null;
  deleteConfirmId.value = null;
  deleteConfirmName.value = "";
}

async function handleDelete() {
  if (!deleteConfirmId.value || !deleteConfirmType.value) return;

  let success = false;
  if (deleteConfirmType.value === "category") {
    success = await typeStore.deleteCategory(deleteConfirmId.value);
  } else {
    success = await typeStore.deleteSubtype(deleteConfirmId.value);
  }

  if (success) {
    cancelDelete();
  }
}

// 执行迁移
async function handleMigration() {
  const result = await typeStore.executeMigration();
  if (result) {
    alert(
      `迁移完成：创建 ${result.categoriesCreated} 个大类，更新 ${result.subtypesUpdated} 个小类`
    );
    showMigrationDialog.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push("/login");
}

// 表单标题
const formTitle = computed(() => {
  if (formMode.value === "category") {
    return editingCategory.value ? "编辑大类" : "新增大类";
  }
  return editingSubtype.value ? "编辑小类" : "新增小类";
});
</script>


<template>
  <div class="types-page">
    <header class="page-header">
      <div class="header-left">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>耗材类型管理</h1>
      </div>
      <div class="header-right">
        <span class="user-name">{{ authStore.user?.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="page-content">
      <div class="info-banner">
        <p>
          💡
          类型分为大类（如PLA、PETG）和小类（如Basic、Matte）。温度参数在品牌管理中按品牌+类型配置。
        </p>
      </div>

      <div class="toolbar">
        <button @click="openCreateCategoryForm" class="btn btn-primary">
          + 新增大类
        </button>
        <button @click="openCreateSubtypeForm()" class="btn btn-secondary">
          + 新增小类
        </button>
      </div>

      <div v-if="typeStore.isLoading && !showForm" class="loading">
        加载中...
      </div>

      <div
        v-else-if="typeStore.hierarchy.categories.length === 0"
        class="empty-state"
      >
        <p>暂无耗材类型数据</p>
        <p>点击"新增大类"按钮添加您的第一个耗材类型</p>
      </div>

      <!-- 层级列表 -->
      <div v-else class="hierarchy-list">
        <div
          v-for="category in typeStore.hierarchy.categories"
          :key="category.id"
          class="category-card"
        >
          <div class="category-header">
            <div class="category-info">
              <h3>{{ category.name }}</h3>
              <span class="subtype-count"
                >{{ category.children.length }} 个小类</span
              >
              <p v-if="category.description" class="description">
                {{ category.description }}
              </p>
            </div>
            <div class="category-actions">
              <button
                @click="openCreateSubtypeForm(category.id)"
                class="btn btn-small btn-primary"
              >
                + 小类
              </button>
              <button
                @click="openEditCategoryForm(category)"
                class="btn btn-small btn-secondary"
              >
                编辑
              </button>
              <button
                @click="confirmDeleteCategory(category)"
                class="btn btn-small btn-danger"
              >
                删除
              </button>
            </div>
          </div>

          <!-- 小类列表 -->
          <div v-if="category.children.length > 0" class="subtype-list">
            <div
              v-for="subtype in category.children"
              :key="subtype.id"
              class="subtype-item"
            >
              <div class="subtype-info">
                <span class="subtype-name">{{ subtype.name }}</span>
                <span v-if="subtype.description" class="subtype-desc">{{
                  subtype.description
                }}</span>
              </div>
              <div class="subtype-actions">
                <button
                  @click="openEditSubtypeForm(subtype)"
                  class="btn btn-tiny btn-secondary"
                >
                  编辑
                </button>
                <button
                  @click="confirmDeleteSubtype(subtype)"
                  class="btn btn-tiny btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-subtypes">
            <p>暂无小类，点击"+ 小类"添加</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 新增/编辑表单 -->
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <h2>{{ formTitle }}</h2>
        <form @submit.prevent="handleSubmit">
          <!-- 小类表单：选择所属大类 -->
          <div v-if="formMode === 'subtype'" class="form-group">
            <label for="parentId">所属大类 *</label>
            <select
              id="parentId"
              v-model="selectedParentId"
              required
              :disabled="typeStore.isLoading"
            >
              <option value="">请选择大类</option>
              <option
                v-for="opt in categoryOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="name"
              >{{ formMode === "category" ? "大类" : "小类" }}名称 *</label
            >
            <input
              id="name"
              v-model="formData.name"
              type="text"
              :placeholder="
                formMode === 'category'
                  ? '例如: PLA, PETG, ABS'
                  : '例如: Basic, Matte, Silk'
              "
              required
              :disabled="typeStore.isLoading"
            />
          </div>

          <div class="form-group">
            <label for="description">描述</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="请输入描述（可选）"
              rows="3"
              :disabled="typeStore.isLoading"
            ></textarea>
          </div>

          <div v-if="typeStore.error" class="error-message">
            {{ typeStore.error }}
          </div>

          <div class="form-actions">
            <button
              type="button"
              @click="closeForm"
              class="btn btn-secondary"
              :disabled="typeStore.isLoading"
            >
              取消
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="typeStore.isLoading"
            >
              {{ typeStore.isLoading ? "保存中..." : "保存" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认 -->
    <div
      v-if="deleteConfirmId"
      class="modal-overlay"
      @click.self="cancelDelete"
    >
      <div class="modal modal-confirm">
        <h2>确认删除</h2>
        <p>
          确定要删除{{ deleteConfirmType === "category" ? "大类" : "小类" }}
          "{{ deleteConfirmName }}" 吗？此操作无法撤销。
        </p>
        <div v-if="typeStore.error" class="error-message">
          {{ typeStore.error }}
        </div>
        <div class="form-actions">
          <button
            @click="cancelDelete"
            class="btn btn-secondary"
            :disabled="typeStore.isLoading"
          >
            取消
          </button>
          <button
            @click="handleDelete"
            class="btn btn-danger"
            :disabled="typeStore.isLoading"
          >
            {{ typeStore.isLoading ? "删除中..." : "确认删除" }}
          </button>
        </div>
      </div>
    </div>

    <!-- 迁移提示 -->
    <div
      v-if="showMigrationDialog"
      class="modal-overlay"
      @click.self="showMigrationDialog = false"
    >
      <div class="modal">
        <h2>数据迁移</h2>
        <p>检测到旧版类型数据，需要迁移到新的层级结构。</p>
        <div v-if="migrationPreview" class="migration-preview">
          <p>
            将创建 {{ migrationPreview.categoriesWillCreate.length }} 个大类：
          </p>
          <div class="category-tags">
            <span
              v-for="cat in migrationPreview.categoriesWillCreate"
              :key="cat"
              class="tag"
            >
              {{ cat }}
            </span>
          </div>
        </div>
        <div class="form-actions">
          <button
            @click="showMigrationDialog = false"
            class="btn btn-secondary"
          >
            稍后处理
          </button>
          <button
            @click="handleMigration"
            class="btn btn-primary"
            :disabled="typeStore.isLoading"
          >
            {{ typeStore.isLoading ? "迁移中..." : "执行迁移" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.types-page {
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
  max-width: 1200px;
  margin: 0 auto;
}

.info-banner {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.info-banner p {
  margin: 0;
  color: #1565c0;
  font-size: 0.95rem;
}

.toolbar {
  margin-bottom: 1.5rem;
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

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-tiny {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
}

.btn-primary {
  background: #4a90d9;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.hierarchy-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.category-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #eee;
}

.category-info h3 {
  margin: 0 0 0.25rem 0;
  color: #333;
  font-size: 1.2rem;
}

.subtype-count {
  font-size: 0.85rem;
  color: #888;
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.category-info .description {
  color: #666;
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

.subtype-list {
  padding: 0.5rem 1.5rem 1rem;
}

.subtype-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.subtype-item:last-child {
  margin-bottom: 0;
}

.subtype-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.subtype-name {
  font-weight: 500;
  color: #333;
}

.subtype-desc {
  font-size: 0.85rem;
  color: #888;
}

.subtype-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-subtypes {
  padding: 1rem 1.5rem;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.empty-subtypes p {
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.modal-confirm p {
  color: #666;
  margin-bottom: 1.5rem;
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4a90d9;
}

.form-group input:disabled,
.form-group textarea:disabled,
.form-group select:disabled {
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.migration-preview {
  margin: 1rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.migration-preview p {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #4a90d9;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>
