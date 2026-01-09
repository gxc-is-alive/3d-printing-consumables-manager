# Requirements Document

## Introduction

本功能为 3D 打印耗材管理系统添加保养记录模块，允许用户记录打印机的保养时间和保养内容，并可以回看历史保养记录。这有助于用户跟踪设备维护情况，确保打印机保持良好状态。

## Glossary

- **Maintenance_Record**: 保养记录实体，包含保养时间、保养类型、保养内容等信息
- **Maintenance_Service**: 负责保养记录业务逻辑的服务组件
- **User**: 系统的注册用户，拥有保养记录的所有权

## Requirements

### Requirement 1: 添加保养记录

**User Story:** 作为用户，我希望能够添加保养记录，以便记录每次对打印机进行的维护工作。

#### Acceptance Criteria

1. WHEN 用户填写保养信息并点击保存按钮 THEN THE Maintenance_Service SHALL 创建保养记录并保存到数据库
2. WHEN 用户添加保养记录时 THEN THE System SHALL 要求填写保养时间（必填）
3. WHEN 用户添加保养记录时 THEN THE System SHALL 允许选择保养类型（如：清洁、润滑、更换零件、校准等）
4. WHEN 用户添加保养记录时 THEN THE System SHALL 允许填写保养内容描述（可选）
5. WHEN 保养记录创建成功 THEN THE System SHALL 返回记录的完整信息

### Requirement 2: 查看保养记录列表

**User Story:** 作为用户，我希望能够查看所有保养记录，以便回顾历史维护情况。

#### Acceptance Criteria

1. WHEN 用户访问保养记录页面 THEN THE System SHALL 显示该用户的所有保养记录列表
2. WHEN 显示保养记录列表 THEN THE System SHALL 按保养时间倒序排列（最新的在前）
3. WHEN 显示保养记录 THEN THE System SHALL 展示保养时间、保养类型、保养内容
4. WHEN 用户没有保养记录 THEN THE System SHALL 显示空状态提示

### Requirement 3: 编辑保养记录

**User Story:** 作为用户，我希望能够编辑已有的保养记录，以便修正或补充信息。

#### Acceptance Criteria

1. WHEN 用户点击编辑按钮 THEN THE System SHALL 显示编辑表单并填充现有数据
2. WHEN 用户修改信息并保存 THEN THE System SHALL 更新数据库中的记录
3. WHEN 编辑成功 THEN THE System SHALL 更新列表显示

### Requirement 4: 删除保养记录

**User Story:** 作为用户，我希望能够删除不需要的保养记录，以便保持记录整洁。

#### Acceptance Criteria

1. WHEN 用户点击删除按钮 THEN THE System SHALL 显示确认对话框
2. WHEN 用户确认删除 THEN THE System SHALL 从数据库中移除该记录
3. WHEN 删除成功 THEN THE System SHALL 更新列表显示

### Requirement 5: 数据隔离与安全

**User Story:** 作为用户，我希望我的保养记录只有我自己能访问，以保护我的数据安全。

#### Acceptance Criteria

1. THE System SHALL 确保每个用户只能访问自己的保养记录
2. WHEN 用户尝试访问其他用户的记录 THEN THE System SHALL 拒绝访问并返回 403 错误
3. WHEN 用户账户被删除 THEN THE System SHALL 同时删除该用户的所有保养记录
