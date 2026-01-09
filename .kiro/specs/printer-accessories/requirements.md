# Requirements Document

## Introduction

本功能为 3D 打印耗材管理系统添加打印机配件管理模块，允许用户管理打印机的各类配件，如打印板（热床板、PEI 板）、润滑油、润滑脂、喷嘴、皮带、轴承等。用户可以记录配件的购买信息、使用状态、更换周期，并在配件需要更换时获得提醒。

## Glossary

- **Printer_Accessory**: 打印机配件实体，包含配件名称、类型、购买信息、使用状态等
- **Accessory_Category**: 配件分类，如打印板、润滑剂、喷嘴、传动部件等
- **Accessory_Service**: 负责配件管理业务逻辑的服务组件
- **User**: 系统的注册用户，拥有配件的所有权
- **Replacement_Cycle**: 配件的建议更换周期（天数）

## Requirements

### Requirement 1: 配件分类管理

**User Story:** 作为用户，我希望能够管理配件分类，以便对不同类型的配件进行归类管理。

#### Acceptance Criteria

1. THE System SHALL 提供预设的配件分类（打印板、润滑剂、喷嘴、传动部件、电子元件、其他）
2. WHEN 用户添加自定义分类时 THEN THE Accessory_Service SHALL 创建新分类并保存到数据库
3. WHEN 用户查看分类列表 THEN THE System SHALL 显示所有可用分类（预设+自定义）
4. WHEN 用户删除自定义分类时 THEN THE System SHALL 检查是否有配件使用该分类
5. IF 分类下存在配件 THEN THE System SHALL 拒绝删除并提示用户

### Requirement 2: 添加配件

**User Story:** 作为用户，我希望能够添加打印机配件，以便记录和管理我的配件库存。

#### Acceptance Criteria

1. WHEN 用户填写配件信息并点击保存按钮 THEN THE Accessory_Service SHALL 创建配件记录并保存到数据库
2. WHEN 用户添加配件时 THEN THE System SHALL 要求填写配件名称（必填）
3. WHEN 用户添加配件时 THEN THE System SHALL 要求选择配件分类（必填）
4. WHEN 用户添加配件时 THEN THE System SHALL 允许填写以下可选信息：
   - 品牌/制造商
   - 规格型号
   - 购买价格
   - 购买日期
   - 数量
   - 建议更换周期（天数）
   - 备注（用于记录配件的使用说明、适用范围、商家确认信息等）
5. WHEN 配件创建成功 THEN THE System SHALL 返回记录的完整信息

### Requirement 9: 配件备注管理

**User Story:** 作为用户，我希望能够为配件添加详细备注，以便记录配件的使用说明、适用范围、商家确认信息等重要信息。

#### Acceptance Criteria

1. WHEN 用户添加或编辑配件时 THEN THE System SHALL 提供多行文本输入框用于填写备注
2. WHEN 用户查看配件详情 THEN THE System SHALL 完整显示备注内容
3. WHEN 用户在配件列表中 THEN THE System SHALL 显示备注的摘要（前 50 个字符）
4. WHEN 备注内容较长 THEN THE System SHALL 支持展开/收起显示

### Requirement 3: 查看配件列表

**User Story:** 作为用户，我希望能够查看所有配件，以便了解我的配件库存情况。

#### Acceptance Criteria

1. WHEN 用户访问配件管理页面 THEN THE System SHALL 显示该用户的所有配件列表
2. WHEN 显示配件列表 THEN THE System SHALL 按分类分组显示
3. WHEN 显示配件 THEN THE System SHALL 展示配件名称、分类、数量、状态
4. WHEN 用户筛选配件 THEN THE System SHALL 支持按分类、状态筛选
5. WHEN 用户没有配件 THEN THE System SHALL 显示空状态提示

### Requirement 4: 编辑配件

**User Story:** 作为用户，我希望能够编辑已有的配件信息，以便修正或更新信息。

#### Acceptance Criteria

1. WHEN 用户点击编辑按钮 THEN THE System SHALL 显示编辑表单并填充现有数据
2. WHEN 用户修改信息并保存 THEN THE Accessory_Service SHALL 更新数据库中的记录
3. WHEN 编辑成功 THEN THE System SHALL 更新列表显示

### Requirement 5: 删除配件

**User Story:** 作为用户，我希望能够删除不需要的配件记录，以便保持记录整洁。

#### Acceptance Criteria

1. WHEN 用户点击删除按钮 THEN THE System SHALL 显示确认对话框
2. WHEN 用户确认删除 THEN THE Accessory_Service SHALL 从数据库中移除该记录
3. WHEN 删除成功 THEN THE System SHALL 更新列表显示

### Requirement 6: 配件使用记录

**User Story:** 作为用户，我希望能够记录配件的使用情况，以便追踪配件的消耗和更换历史。

#### Acceptance Criteria

1. WHEN 用户记录配件使用 THEN THE System SHALL 允许填写使用日期、使用数量、用途说明
2. WHEN 记录使用后 THEN THE Accessory_Service SHALL 自动更新配件的剩余数量
3. WHEN 配件数量为 0 THEN THE System SHALL 将配件状态标记为"已用完"
4. WHEN 用户查看配件详情 THEN THE System SHALL 显示该配件的使用历史记录

### Requirement 7: 配件更换提醒

**User Story:** 作为用户，我希望系统能提醒我需要更换的配件，以便及时维护打印机。

#### Acceptance Criteria

1. WHEN 配件设置了更换周期且距离上次更换已超过周期 THEN THE System SHALL 在仪表盘显示提醒
2. WHEN 配件数量低于设定阈值 THEN THE System SHALL 在仪表盘显示库存不足提醒
3. WHEN 用户查看提醒 THEN THE System SHALL 显示配件名称和建议操作

### Requirement 8: 数据隔离与安全

**User Story:** 作为用户，我希望我的配件数据只有我自己能访问，以保护我的数据安全。

#### Acceptance Criteria

1. THE System SHALL 确保每个用户只能访问自己的配件数据
2. WHEN 用户尝试访问其他用户的配件 THEN THE System SHALL 拒绝访问并返回 403 错误
3. WHEN 用户账户被删除 THEN THE System SHALL 同时删除该用户的所有配件数据
