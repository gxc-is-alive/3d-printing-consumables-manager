<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  useConsumableTypeStore,
  type TypeCategory,
  type TypeSubtype,
} from "@/stores/consumableType";
import MobileLayout from "@/components/mobile/MobileLayout.vue";
import FormPopup from "@/components/mobile/FormPopup.vue";
import EmptyState from "@/components/mobile/EmptyState.vue";
import { useToast } from "@/composables/useToast";
import { showConfirmDialog } from "vant";
import type { PickerConfirmEventParams } from "vant";

const typeStore = useConsumableTypeStore();
const toast = useToast();

const isRefreshing = ref(false);
const showForm = ref(false);
const formMode = ref<"category" | "subtype">("category");
const editingCategory = ref<TypeCategory | null>(null);
const editingSubtype = ref<TypeSubtype | null>(null);
const selectedCategoryId = ref<string | null>(null);
const activeCategories = ref<string>("");
const showCategoryPicker = ref(false);
const showAddMenu = ref(false);

// 表单数据
const formData = ref({
  name: "",
  description: "",
});

// 迁移相关
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

async function handleRefresh() {
  isRefreshing.value = true;
  await typeStore.fetchHierarchy();
  isRefreshing.value = false;
}

// 打开新增菜单
function openAddMenu() {
  showAddMenu.value = true;
}

// 大类表单
function openCreateCategoryForm() {
  formMode.value = "category";
  editingCategory.value = null;
  formData.value = { name: "", description: "" };
  showForm.value = true;
}

function openEditCategoryForm(category: TypeCategory) {
  formMode.value = "category";
  editingCategory.value = category;
  formData.value = {
    name: category.name,
    description: category.description || "",
  };
  showForm.value = true;
}

// 小类表单
function openCreateSubtypeForm(categoryId?: string) {
  formMode.value = "subtype";
  editingSubtype.value = null;
  selectedCategoryId.value = categoryId || null;
  formData.value = { name: "", description: "" };
  showForm.value = true;
}

function openEditSubtypeForm(subtype: TypeSubtype) {
  formMode.value = "subtype";
  editingSubtype.value = subtype;
  selectedCategoryId.value = subtype.parentId;
  formData.value = {
    name: subtype.name,
    description: subtype.description || "",
  };
  showForm.value = true;
}


// 提交表单
async function handleSubmit() {
  if (!formData.value.name.trim()) {
    toast.error("请输入名称");
    return;
  }

  if (formMode.value === "category") {
    await handleCategorySubmit();
  } else {
    await handleSubtypeSubmit();
  }
}

async function handleCategorySubmit() {
  const submitData = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
  };

  if (editingCategory.value) {
    const result = await typeStore.updateCategory(
      editingCategory.value.id,
      submitData
    );
    if (result) {
      toast.success("更新成功");
      showForm.value = false;
    } else {
      toast.error(typeStore.error || "更新失败");
    }
  } else {
    const result = await typeStore.createCategory(submitData);
    if (result) {
      toast.success("添加成功");
      showForm.value = false;
    } else {
      toast.error(typeStore.error || "添加失败");
    }
  }
}

async function handleSubtypeSubmit() {
  if (!selectedCategoryId.value) {
    toast.error("请选择所属大类");
    return;
  }

  const submitData = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
    parentId: selectedCategoryId.value,
  };

  if (editingSubtype.value) {
    const result = await typeStore.updateSubtype(editingSubtype.value.id, {
      name: submitData.name,
      description: submitData.description,
    });
    if (result) {
      toast.success("更新成功");
      showForm.value = false;
    } else {
      toast.error(typeStore.error || "更新失败");
    }
  } else {
    const result = await typeStore.createSubtype(submitData);
    if (result) {
      toast.success("添加成功");
      showForm.value = false;
    } else {
      toast.error(typeStore.error || "添加失败");
    }
  }
}

// 删除大类
async function handleDeleteCategory(category: TypeCategory) {
  if (category.children.length > 0) {
    toast.error("请先删除该大类下的所有小类");
    return;
  }

  try {
    await showConfirmDialog({
      title: "确认删除",
      message: `确定要删除大类 "${category.name}" 吗？`,
    });
    const success = await typeStore.deleteCategory(category.id);
    if (success) {
      toast.success("删除成功");
    } else {
      toast.error(typeStore.error || "删除失败");
    }
  } catch {
    // 用户取消
  }
}

// 删除小类
async function handleDeleteSubtype(subtype: TypeSubtype) {
  try {
    await showConfirmDialog({
      title: "确认删除",
      message: `确定要删除小类 "${subtype.name}" 吗？`,
    });
    const success = await typeStore.deleteSubtype(subtype.id);
    if (success) {
      toast.success("删除成功");
    } else {
      toast.error(typeStore.error || "删除失败");
    }
  } catch {
    // 用户取消
  }
}

// 执行迁移
async function handleMigration() {
  const result = await typeStore.executeMigration();
  if (result) {
    toast.success(
      `迁移完成：创建 ${result.categoriesCreated} 个大类，更新 ${result.subtypesUpdated} 个小类`
    );
    showMigrationDialog.value = false;
  } else {
    toast.error(typeStore.error || "迁移失败");
  }
}

// 表单标题
const formTitle = computed(() => {
  if (formMode.value === "category") {
    return editingCategory.value ? "编辑大类" : "新增大类";
  }
  return editingSubtype.value ? "编辑小类" : "新增小类";
});

// 大类选项（用于小类表单）
const categoryOptions = computed(() =>
  typeStore.hierarchy.categories.map((c) => ({
    text: c.name,
    value: c.id,
  }))
);

// 选中的大类名称
const selectedCategoryName = computed(() => {
  if (!selectedCategoryId.value) return "";
  const cat = typeStore.hierarchy.categories.find(c => c.id === selectedCategoryId.value);
  return cat?.name || "";
});

function onCategorySelect({ selectedOptions }: PickerConfirmEventParams) {
  selectedCategoryId.value = selectedOptions[0]?.value as string || null;
  showCategoryPicker.value = false;
}

// 新增菜单选项
const addMenuActions = [
  { name: '新增大类' },
  { name: '新增小类' }
];

function onAddMenuSelect(action: { name: string }) {
  showAddMenu.value = false;
  if (action.name === '新增大类') {
    openCreateCategoryForm();
  } else if (action.name === '新增小类') {
    openCreateSubtypeForm();
  }
}
</script>


<template>
  <MobileLayout title="类型管理" :show-back="true" :show-tabbar="false">
    <template #headerRight>
      <van-icon name="plus" size="20" @click="openAddMenu" />
    </template>
    <van-pull-refresh v-model="isRefreshing" @refresh="handleRefresh">
      <div class="types-page">
        <!-- 加载状态 -->
        <div v-if="typeStore.isLoading && !isRefreshing" class="loading-state">
          <van-skeleton title :row="1" v-for="i in 5" :key="i" />
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="typeStore.hierarchy.categories.length === 0"
          image="default"
          description="暂无类型数据"
          button-text="添加大类"
          @click="openCreateCategoryForm"
        />

        <!-- 层级列表 -->
        <div v-else class="hierarchy-list">
          <van-collapse v-model="activeCategories" accordion>
            <van-collapse-item
              v-for="category in typeStore.hierarchy.categories"
              :key="category.id"
              :name="category.id"
            >
              <template #title>
                <div class="category-title">
                  <span class="category-name">{{ category.name }}</span>
                  <van-tag type="primary">
                    {{ category.children.length }} 个小类
                  </van-tag>
                </div>
              </template>

              <template #right-icon>
                <div class="category-actions" @click.stop>
                  <van-icon
                    name="plus"
                    size="18"
                    @click="openCreateSubtypeForm(category.id)"
                  />
                  <van-icon
                    name="edit"
                    size="18"
                    @click="openEditCategoryForm(category)"
                  />
                  <van-icon
                    name="delete-o"
                    size="18"
                    color="#ee0a24"
                    @click="handleDeleteCategory(category)"
                  />
                </div>
              </template>

              <!-- 小类列表 -->
              <van-cell-group v-if="category.children.length > 0">
                <van-swipe-cell
                  v-for="subtype in category.children"
                  :key="subtype.id"
                >
                  <van-cell
                    :title="subtype.name"
                    :label="subtype.description || ''"
                    @click="openEditSubtypeForm(subtype)"
                  />
                  <template #right>
                    <van-button
                      square
                      type="danger"
                      text="删除"
                      class="swipe-btn"
                      @click="handleDeleteSubtype(subtype)"
                    />
                  </template>
                </van-swipe-cell>
              </van-cell-group>

              <van-empty
                v-else
                image="default"
                description="暂无小类"
                :image-size="60"
              >
                <van-button
                  size="small"
                  type="primary"
                  @click="openCreateSubtypeForm(category.id)"
                >
                  添加小类
                </van-button>
              </van-empty>
            </van-collapse-item>
          </van-collapse>
        </div>
      </div>
    </van-pull-refresh>

    <!-- 新增/编辑表单 -->
    <FormPopup
      v-model:visible="showForm"
      :title="formTitle"
      :loading="typeStore.isLoading"
      @submit="handleSubmit"
    >
      <van-cell-group inset>
        <!-- 小类表单：选择所属大类 -->
        <van-field
          v-if="formMode === 'subtype'"
          :model-value="selectedCategoryName"
          is-link
          readonly
          label="所属大类"
          required
          placeholder="请选择大类"
          @click="showCategoryPicker = true"
        />

        <van-field
          v-model="formData.name"
          :label="formMode === 'category' ? '大类名称' : '小类名称'"
          required
          :placeholder="
            formMode === 'category' ? '如: PLA, PETG, ABS' : '如: Basic, Matte'
          "
        />

        <van-field
          v-model="formData.description"
          label="描述"
          type="textarea"
          rows="2"
          placeholder="可选描述"
        />
      </van-cell-group>
    </FormPopup>

    <!-- 大类选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategorySelect"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <!-- 迁移提示对话框 -->
    <van-dialog
      v-model:show="showMigrationDialog"
      title="数据迁移"
      show-cancel-button
      confirm-button-text="执行迁移"
      cancel-button-text="稍后处理"
      @confirm="handleMigration"
    >
      <div class="migration-dialog">
        <p>检测到旧版类型数据，需要迁移到新的层级结构。</p>
        <p v-if="migrationPreview">
          将创建 {{ migrationPreview.categoriesWillCreate.length }} 个大类：
          <van-tag
            v-for="cat in migrationPreview.categoriesWillCreate"
            :key="cat"
            type="primary"
            style="margin: 2px"
          >
            {{ cat }}
          </van-tag>
        </p>
      </div>
    </van-dialog>

    <!-- 新增菜单 -->
    <van-action-sheet
      v-model:show="showAddMenu"
      :actions="addMenuActions"
      cancel-text="取消"
      @select="onAddMenuSelect"
    />
  </MobileLayout>
</template>

<style scoped>
.types-page {
  padding: 12px;
  padding-bottom: 80px;
  min-height: calc(100vh - 96px);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hierarchy-list {
  margin-top: 8px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-name {
  font-weight: 500;
}

.category-actions {
  display: flex;
  gap: 16px;
  padding-right: 8px;
}

.swipe-btn {
  height: 100%;
}

.migration-dialog {
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.van-collapse-item__content) {
  padding: 0;
}
</style>
