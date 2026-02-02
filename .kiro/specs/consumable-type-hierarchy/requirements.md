# 需求文档

## 简介

本功能将现有的耗材类型（ConsumableType）从单级分类改为两级分类结构，支持大类（如 PETG、PLA、ABS）和小类（如 Basic、Matte、Silk）的层级管理。同时需要对现有数据进行自动迁移处理，确保系统平滑升级。

## 术语表

- **Type_Category**: 耗材类型大类，如 PETG、PLA、ABS 等材料大类
- **Type_Subtype**: 耗材类型小类，如 Basic、Matte、Silk 等具体变体
- **Consumable_Type_System**: 耗材类型管理系统，负责大类和小类的 CRUD 操作
- **Migration_Service**: 数据迁移服务，负责将现有单级分类数据转换为两级分类
- **Cascade_Selector**: 级联选择器组件，用于先选大类再选小类的 UI 交互

## 需求

### 需求 1：大类管理

**用户故事：** 作为用户，我希望能够管理耗材类型的大类，以便对耗材进行更清晰的分类组织。

#### 验收标准

1. WHEN 用户创建一个新的大类 THEN Consumable_Type_System SHALL 创建该大类并返回创建结果
2. WHEN 用户创建大类时名称为空或仅包含空白字符 THEN Consumable_Type_System SHALL 拒绝创建并返回错误信息
3. WHEN 用户创建大类时名称与该用户已有大类重复 THEN Consumable_Type_System SHALL 拒绝创建并返回重复错误
4. WHEN 用户更新大类名称 THEN Consumable_Type_System SHALL 更新该大类并同步更新所有关联数据
5. WHEN 用户删除一个没有关联小类的大类 THEN Consumable_Type_System SHALL 删除该大类
6. IF 用户尝试删除一个有关联小类的大类 THEN Consumable_Type_System SHALL 拒绝删除并提示用户先删除关联小类

### 需求 2：小类管理

**用户故事：** 作为用户，我希望能够在大类下管理小类，以便更精确地描述耗材的具体类型。

#### 验收标准

1. WHEN 用户在某个大类下创建小类 THEN Consumable_Type_System SHALL 创建该小类并关联到指定大类
2. WHEN 用户创建小类时名称为空或仅包含空白字符 THEN Consumable_Type_System SHALL 拒绝创建并返回错误信息
3. WHEN 用户在同一大类下创建重复名称的小类 THEN Consumable_Type_System SHALL 拒绝创建并返回重复错误
4. WHEN 用户更新小类信息 THEN Consumable_Type_System SHALL 更新该小类数据
5. WHEN 用户将小类移动到另一个大类 THEN Consumable_Type_System SHALL 更新小类的大类关联
6. WHEN 用户删除一个没有被耗材引用的小类 THEN Consumable_Type_System SHALL 删除该小类
7. IF 用户尝试删除一个被耗材引用的小类 THEN Consumable_Type_System SHALL 拒绝删除并提示存在关联耗材

### 需求 3：级联选择器

**用户故事：** 作为用户，我希望在选择耗材类型时能够先选大类再选小类，以便更快速准确地定位目标类型。

#### 验收标准

1. WHEN 用户打开类型选择器 THEN Cascade_Selector SHALL 显示所有可用的大类列表
2. WHEN 用户选择一个大类 THEN Cascade_Selector SHALL 显示该大类下的所有小类
3. WHEN 用户选择一个小类 THEN Cascade_Selector SHALL 返回完整的类型选择结果（大类+小类）
4. WHEN 大类下没有小类 THEN Cascade_Selector SHALL 允许用户直接选择大类作为类型
5. WHEN 用户清空选择 THEN Cascade_Selector SHALL 重置为初始状态

### 需求 4：数据迁移

**用户故事：** 作为系统管理员，我希望现有的单级分类数据能够自动迁移到两级分类结构，以便用户无需手动重新录入数据。

#### 验收标准

1. WHEN 迁移服务处理格式为 "大类 小类" 的数据（如 "PETG Matte"）THEN Migration_Service SHALL 按第一个空格拆分，前面作为大类，后面作为小类
2. WHEN 迁移服务处理不包含空格的数据 THEN Migration_Service SHALL 将整个名称作为小类，大类设为 "未分类"
3. WHEN 迁移服务处理包含多个空格的数据（如 "PETG High Speed"）THEN Migration_Service SHALL 按第一个空格拆分，"PETG" 为大类，"High Speed" 为小类
4. WHEN 迁移过程中遇到重复的大类名称 THEN Migration_Service SHALL 复用已存在的大类
5. WHEN 迁移完成后 THEN Migration_Service SHALL 保持所有 Consumable 和 BrandType 的关联关系不变
6. WHEN 迁移服务执行 THEN Migration_Service SHALL 记录迁移日志，包括成功和失败的记录数

### 需求 5：PC 端界面适配

**用户故事：** 作为 PC 端用户，我希望在现有界面上能够方便地管理两级分类的耗材类型。

#### 验收标准

1. WHEN 用户访问类型管理页面 THEN Consumable_Type_System SHALL 以树形结构展示大类和小类
2. WHEN 用户在类型管理页面点击新增 THEN Consumable_Type_System SHALL 提供选择创建大类或小类的选项
3. WHEN 用户在耗材表单中选择类型 THEN Consumable_Type_System SHALL 显示级联选择器
4. WHEN 用户编辑现有耗材 THEN Consumable_Type_System SHALL 正确显示当前的大类和小类选择

### 需求 6：移动端界面适配

**用户故事：** 作为移动端用户，我希望在手机上也能方便地使用两级分类功能。

#### 验收标准

1. WHEN 用户在移动端访问类型管理 THEN Consumable_Type_System SHALL 以分组列表形式展示大类和小类
2. WHEN 用户在移动端选择耗材类型 THEN Consumable_Type_System SHALL 使用 Vant 的 Cascader 组件实现级联选择
3. WHEN 用户在移动端创建类型 THEN Consumable_Type_System SHALL 提供选择创建大类或小类的界面

### 需求 7：向后兼容

**用户故事：** 作为系统用户，我希望升级后现有的耗材数据和品牌类型配置能够正常工作。

#### 验收标准

1. WHEN 系统升级后 THEN Consumable_Type_System SHALL 保持所有现有 Consumable 记录的类型关联有效
2. WHEN 系统升级后 THEN Consumable_Type_System SHALL 保持所有现有 BrandType 配置的类型关联有效
3. WHEN API 返回类型数据 THEN Consumable_Type_System SHALL 同时返回大类和小类信息以及完整显示名称
