# Requirements Document

## Introduction

3D 打印耗材管理系统是一个 Web 应用，用于帮助用户管理 3D 打印耗材的完整生命周期，包括品牌/类型管理、采购记录、使用记录、库存追踪等功能。系统支持多用户，每个用户可以独立管理自己的耗材数据。

## Glossary

- **System**: 3D 打印耗材管理系统
- **User**: 系统的注册用户
- **Consumable**: 3D 打印耗材（如 PLA、ABS、PETG 等材料）
- **Brand**: 耗材品牌（如 Bambu Lab、eSUN 等）
- **Consumable_Type**: 耗材类型（如 PLA、ABS、PETG、TPU 等）
- **Purchase_Record**: 采购记录，记录耗材的购买信息
- **Usage_Record**: 使用记录，记录耗材的消耗情况
- **Inventory**: 库存，当前可用的耗材数量和状态

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to register and login to the system, so that I can securely manage my personal consumables data.

#### Acceptance Criteria

1. WHEN a visitor provides valid email and password, THE System SHALL create a new user account
2. WHEN a registered user provides correct credentials, THE System SHALL authenticate and grant access
3. WHEN a user provides incorrect credentials, THE System SHALL deny access and display an error message
4. WHEN a user is authenticated, THE System SHALL maintain the session until logout or timeout
5. WHEN a user requests logout, THE System SHALL terminate the session and redirect to login page

### Requirement 2: Brand Management

**User Story:** As a user, I want to manage consumable brands, so that I can categorize my consumables by manufacturer.

#### Acceptance Criteria

1. WHEN a user creates a new brand with a unique name, THE System SHALL add the brand to the user's brand list
2. WHEN a user views the brand list, THE System SHALL display all brands created by that user
3. WHEN a user updates a brand's information, THE System SHALL persist the changes
4. WHEN a user deletes a brand that has no associated consumables, THE System SHALL remove the brand
5. IF a user attempts to delete a brand with associated consumables, THEN THE System SHALL prevent deletion and display a warning

### Requirement 3: Consumable Type Management

**User Story:** As a user, I want to manage consumable types, so that I can categorize my consumables by material type.

#### Acceptance Criteria

1. WHEN a user creates a new consumable type with name and properties, THE System SHALL add the type to the user's type list
2. WHEN a user views the type list, THE System SHALL display all consumable types with their properties
3. WHEN a user updates a consumable type, THE System SHALL persist the changes
4. WHEN a user deletes a type that has no associated consumables, THE System SHALL remove the type
5. IF a user attempts to delete a type with associated consumables, THEN THE System SHALL prevent deletion and display a warning

### Requirement 4: Purchase Record Management

**User Story:** As a user, I want to record my consumable purchases, so that I can track spending and inventory sources.

#### Acceptance Criteria

1. WHEN a user creates a purchase record with brand, type, quantity, price, color, and purchase date, THE System SHALL add the record and update inventory
2. WHEN a user views purchase records, THE System SHALL display all records with filtering and sorting options
3. WHEN a user updates a purchase record, THE System SHALL persist changes and recalculate inventory
4. WHEN a user deletes a purchase record, THE System SHALL remove the record and adjust inventory accordingly
5. THE System SHALL calculate and display total spending per brand, type, and time period

### Requirement 5: Usage Record Management

**User Story:** As a user, I want to record consumable usage, so that I can track consumption patterns and remaining inventory.

#### Acceptance Criteria

1. WHEN a user creates a usage record with consumable reference, amount used, and usage date, THE System SHALL add the record and deduct from inventory
2. WHEN a user views usage records, THE System SHALL display all records with filtering and sorting options
3. WHEN a user updates a usage record, THE System SHALL persist changes and recalculate inventory
4. WHEN a user deletes a usage record, THE System SHALL remove the record and restore inventory
5. IF a user attempts to record usage exceeding available inventory, THEN THE System SHALL display a warning but allow the record

### Requirement 6: Consumable Opening Status

**User Story:** As a user, I want to track whether consumables are opened, so that I can prioritize using opened materials first.

#### Acceptance Criteria

1. WHEN a user marks a consumable as opened with opening date, THE System SHALL update the consumable status
2. WHEN a user views inventory, THE System SHALL clearly distinguish between opened and unopened consumables
3. WHEN a user filters inventory by opening status, THE System SHALL display only matching consumables
4. THE System SHALL display the duration since opening for opened consumables

### Requirement 7: Inventory Dashboard

**User Story:** As a user, I want to view my current inventory at a glance, so that I can quickly assess what consumables I have available.

#### Acceptance Criteria

1. WHEN a user views the inventory dashboard, THE System SHALL display current stock grouped by brand, type, and color
2. WHEN a user filters inventory by brand, type, color, or status, THE System SHALL display only matching items
3. THE System SHALL display total weight or quantity for each consumable category
4. THE System SHALL highlight low-stock items based on user-defined thresholds
5. WHEN inventory data changes, THE System SHALL update the dashboard in real-time

### Requirement 8: Color Management

**User Story:** As a user, I want to manage consumable colors, so that I can track inventory by color and find specific colors quickly.

#### Acceptance Criteria

1. WHEN a user adds a consumable with a color, THE System SHALL store the color information with hex code or name
2. WHEN a user views inventory by color, THE System SHALL display color swatches alongside consumable information
3. WHEN a user searches by color, THE System SHALL return all consumables matching the color criteria
4. THE System SHALL support both predefined color names and custom hex codes

### Requirement 9: Data Persistence

**User Story:** As a user, I want my data to be safely stored, so that I don't lose my consumable management records.

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes any record, THE System SHALL persist changes to the database immediately
2. WHEN a user logs in, THE System SHALL retrieve and display all their previously saved data
3. THE System SHALL ensure data isolation between different users
