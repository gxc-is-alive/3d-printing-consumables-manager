/**
 * Property-Based Tests for Type Hierarchy Feature
 * Feature: consumable-type-hierarchy
 *
 * Tests the following properties:
 * - Property 1: 类型名称解析一致性
 * - Property 2: 名称验证规则
 * - Property 3: 唯一性约束
 * - Property 6: 迁移后关联完整性
 */

import * as fc from 'fast-check';
import { TypeMigrationService } from '../services/typeMigration.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { AuthService } from '../services/auth.service';

// ============ Arbitraries ============

// 生成包含空格的类型名称（如 "PETG Matte"）
const typeNameWithSpaceArb = fc
  .tuple(
    fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,10}$/), // 大类部分
    fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{1,15}$/) // 小类部分
  )
  .map(([category, subtype]) => `${category} ${subtype}`);

// 生成不包含空格的类型名称
const typeNameWithoutSpaceArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,20}$/);

// 生成有效的类型名称（可能有空格也可能没有）
const validTypeNameArb = fc.oneof(typeNameWithSpaceArb, typeNameWithoutSpaceArb);

// 生成空白字符串变体
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
  fc.constant('\n'),
  fc.constant('  \t  \n  ')
);

// 生成有效的大类名称
const validCategoryNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,15}$/);

// 生成有效的小类名称
const validSubtypeNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{1,20}$/);

// ============ Helper Functions ============

async function createTestUser(): Promise<{ userId: string; email: string }> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  return { userId: result.user.id, email };
}

// ============ Property 1: 类型名称解析一致性 ============

describe('Property 1: 类型名称解析一致性', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * 对于任意包含空格的类型名称字符串，parseTypeName 函数按第一个空格拆分后，
   * 大类部分应为第一个空格之前的内容，小类部分应为第一个空格之后的所有内容。
   */
  it('should split type name by first space correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,10}$/), // category
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{1,15}$/), // subtype (may contain spaces)
        async (category, subtype) => {
          const fullName = `${category} ${subtype}`;
          const parsed = TypeMigrationService.parseTypeName(fullName);

          // 大类应为第一个空格之前的内容
          expect(parsed.category).toBe(category);
          // 小类应为第一个空格之后的所有内容
          expect(parsed.subtype).toBe(subtype);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * 对于不包含空格的字符串，大类应为"未分类"，小类应为原始字符串。
   */
  it('should categorize names without space as "未分类"', async () => {
    await fc.assert(
      fc.asyncProperty(typeNameWithoutSpaceArb, async (name) => {
        const parsed = TypeMigrationService.parseTypeName(name);

        expect(parsed.category).toBe('未分类');
        expect(parsed.subtype).toBe(name);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * 空字符串或仅空白字符应返回空小类和"未分类"大类
   */
  it('should handle empty or whitespace-only names', async () => {
    await fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (name) => {
        const parsed = TypeMigrationService.parseTypeName(name);

        expect(parsed.category).toBe('未分类');
        // 空白字符串的小类应为空或原始trim后的值
        expect(parsed.subtype).toBe('');
      }),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 解析结果应该是幂等的 - 多次解析同一名称应得到相同结果
   */
  it('should be idempotent - parsing same name multiple times yields same result', async () => {
    await fc.assert(
      fc.asyncProperty(validTypeNameArb, async (name) => {
        const parsed1 = TypeMigrationService.parseTypeName(name);
        const parsed2 = TypeMigrationService.parseTypeName(name);
        const parsed3 = TypeMigrationService.parseTypeName(name);

        expect(parsed1.category).toBe(parsed2.category);
        expect(parsed1.subtype).toBe(parsed2.subtype);
        expect(parsed2.category).toBe(parsed3.category);
        expect(parsed2.subtype).toBe(parsed3.subtype);
      }),
      { numRuns: 100 }
    );
  });
});

// ============ Property 2: 名称验证规则 ============

describe('Property 2: 名称验证规则', () => {
  /**
   * **Validates: Requirements 1.2, 2.2**
   *
   * 对于任意空字符串或仅包含空白字符的名称，创建大类操作应该被拒绝并返回错误。
   */
  it('should reject empty or whitespace-only category names', async () => {
    const { userId } = await createTestUser();

    await fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (name) => {
        await expect(ConsumableTypeService.createCategory(userId, { name })).rejects.toThrow();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * 对于任意空字符串或仅包含空白字符的名称，创建小类操作应该被拒绝并返回错误。
   */
  it('should reject empty or whitespace-only subtype names', async () => {
    const { userId } = await createTestUser();

    // 先创建一个有效的大类
    const category = await ConsumableTypeService.createCategory(userId, { name: 'TestCategory' });

    await fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (name) => {
        await expect(
          ConsumableTypeService.createSubtype(userId, { name, parentId: category.id })
        ).rejects.toThrow();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.2**
   *
   * 有效的大类名称应该能够成功创建
   */
  it('should accept valid category names', async () => {
    await fc.assert(
      fc.asyncProperty(validCategoryNameArb, async (name) => {
        const { userId } = await createTestUser();

        const category = await ConsumableTypeService.createCategory(userId, { name });

        expect(category).toBeDefined();
        expect(category.id).toBeDefined();
        expect(category.name).toBe(name);
        expect(category.parentId).toBeNull();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * 有效的小类名称应该能够成功创建
   */
  it('should accept valid subtype names', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCategoryNameArb,
        validSubtypeNameArb,
        async (categoryName, subtypeName) => {
          const { userId } = await createTestUser();

          // 创建大类
          const category = await ConsumableTypeService.createCategory(userId, {
            name: categoryName,
          });

          // 创建小类
          const subtype = await ConsumableTypeService.createSubtype(userId, {
            name: subtypeName,
            parentId: category.id,
          });

          expect(subtype).toBeDefined();
          expect(subtype.id).toBeDefined();
          expect(subtype.name).toBe(subtypeName);
          expect(subtype.parentId).toBe(category.id);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============ Property 3: 唯一性约束 ============

describe('Property 3: 唯一性约束', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * 同一用户下的大类名称必须唯一。创建重复名称应返回冲突错误。
   */
  it('should reject duplicate category names for same user', async () => {
    await fc.assert(
      fc.asyncProperty(validCategoryNameArb, async (name) => {
        const { userId } = await createTestUser();

        // 第一次创建应成功
        const category1 = await ConsumableTypeService.createCategory(userId, { name });
        expect(category1).toBeDefined();

        // 第二次创建相同名称应失败
        await expect(ConsumableTypeService.createCategory(userId, { name })).rejects.toThrow();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * 同一大类下的小类名称必须唯一。创建重复名称应返回冲突错误。
   */
  it('should reject duplicate subtype names within same category', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCategoryNameArb,
        validSubtypeNameArb,
        async (categoryName, subtypeName) => {
          const { userId } = await createTestUser();

          // 创建大类
          const category = await ConsumableTypeService.createCategory(userId, {
            name: categoryName,
          });

          // 第一次创建小类应成功
          const subtype1 = await ConsumableTypeService.createSubtype(userId, {
            name: subtypeName,
            parentId: category.id,
          });
          expect(subtype1).toBeDefined();

          // 第二次创建相同名称的小类应失败
          await expect(
            ConsumableTypeService.createSubtype(userId, {
              name: subtypeName,
              parentId: category.id,
            })
          ).rejects.toThrow();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * 不同大类下可以有相同名称的小类
   */
  it('should allow same subtype name in different categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCategoryNameArb,
        validCategoryNameArb,
        validSubtypeNameArb,
        async (categoryName1, categoryName2, subtypeName) => {
          // 确保两个大类名称不同
          if (categoryName1 === categoryName2) return;

          const { userId } = await createTestUser();

          // 创建两个不同的大类
          const category1 = await ConsumableTypeService.createCategory(userId, {
            name: categoryName1,
          });
          const category2 = await ConsumableTypeService.createCategory(userId, {
            name: categoryName2,
          });

          // 在两个大类下创建相同名称的小类，都应成功
          const subtype1 = await ConsumableTypeService.createSubtype(userId, {
            name: subtypeName,
            parentId: category1.id,
          });
          const subtype2 = await ConsumableTypeService.createSubtype(userId, {
            name: subtypeName,
            parentId: category2.id,
          });

          expect(subtype1).toBeDefined();
          expect(subtype2).toBeDefined();
          expect(subtype1.name).toBe(subtypeName);
          expect(subtype2.name).toBe(subtypeName);
          expect(subtype1.parentId).toBe(category1.id);
          expect(subtype2.parentId).toBe(category2.id);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 1.3**
   *
   * 不同用户可以有相同名称的大类
   */
  it('should allow same category name for different users', async () => {
    await fc.assert(
      fc.asyncProperty(validCategoryNameArb, async (name) => {
        const user1 = await createTestUser();
        const user2 = await createTestUser();

        // 两个用户创建相同名称的大类，都应成功
        const category1 = await ConsumableTypeService.createCategory(user1.userId, { name });
        const category2 = await ConsumableTypeService.createCategory(user2.userId, { name });

        expect(category1).toBeDefined();
        expect(category2).toBeDefined();
        expect(category1.name).toBe(name);
        expect(category2.name).toBe(name);
        expect(category1.userId).toBe(user1.userId);
        expect(category2.userId).toBe(user2.userId);
      }),
      { numRuns: 20 }
    );
  });
});

// ============ Property 6: 迁移后关联完整性 ============

describe('Property 6: 迁移后关联完整性', () => {
  /**
   * **Validates: Requirements 4.5, 7.1, 7.2**
   *
   * 对于任意包含空格的类型名称，迁移后应正确拆分为大类和小类
   */
  it('should correctly parse and prepare migration for names with spaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,8}$/), // category part
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{1,10}$/), // subtype part
        async (categoryPart, subtypePart) => {
          const fullName = `${categoryPart} ${subtypePart}`;
          const parsed = TypeMigrationService.parseTypeName(fullName);

          // 验证解析结果
          expect(parsed.category).toBe(categoryPart);
          expect(parsed.subtype).toBe(subtypePart);

          // 验证可以重新组合回原始名称
          const reconstructed = `${parsed.category} ${parsed.subtype}`;
          expect(reconstructed).toBe(fullName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * 迁移预览应该正确识别所有需要创建的大类
   */
  it('should correctly identify categories to create in migration preview', async () => {
    const { userId } = await createTestUser();

    // 创建一些测试类型（模拟旧数据）
    const testTypes = [
      'PETG Matte',
      'PETG Basic',
      'PLA Standard',
      'ABS', // 无空格，应归入"未分类"
    ];

    for (const name of testTypes) {
      await ConsumableTypeService.create(userId, { name });
    }

    // 获取迁移预览
    const preview = await TypeMigrationService.previewMigration(userId);

    // 验证预览结果
    expect(preview.totalTypes).toBe(testTypes.length);
    expect(preview.categoriesWillCreate).toContain('PETG');
    expect(preview.categoriesWillCreate).toContain('PLA');
    expect(preview.categoriesWillCreate).toContain('未分类');

    // 验证每个类型的解析结果
    const petgMattePreview = preview.types.find((t) => t.originalName === 'PETG Matte');
    expect(petgMattePreview?.categoryName).toBe('PETG');
    expect(petgMattePreview?.subtypeName).toBe('Matte');

    const absPreview = preview.types.find((t) => t.originalName === 'ABS');
    expect(absPreview?.categoryName).toBe('未分类');
    expect(absPreview?.subtypeName).toBe('ABS');
  });

  /**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * 解析结果的大类和小类都不应为空（除非原始名称为空）
   */
  it('should ensure parsed results have non-empty category', async () => {
    await fc.assert(
      fc.asyncProperty(validTypeNameArb, async (name) => {
        const parsed = TypeMigrationService.parseTypeName(name);

        // 大类永远不应为空
        expect(parsed.category).toBeTruthy();
        expect(parsed.category.length).toBeGreaterThan(0);

        // 如果原始名称非空，小类也不应为空
        if (name.trim()) {
          expect(parsed.subtype).toBeTruthy();
          expect(parsed.subtype.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * 层级查询应返回完整的树形结构
   */
  it('should return complete hierarchy structure after creating categories and subtypes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validCategoryNameArb, { minLength: 1, maxLength: 3 }),
        fc.array(validSubtypeNameArb, { minLength: 1, maxLength: 3 }),
        async (categoryNames, subtypeNames) => {
          // 确保名称唯一
          const uniqueCategories = [...new Set(categoryNames)];
          const uniqueSubtypes = [...new Set(subtypeNames)];

          if (uniqueCategories.length === 0 || uniqueSubtypes.length === 0) return;

          const { userId } = await createTestUser();

          // 创建大类
          const categories: Array<{ id: string; name: string }> = [];
          for (const name of uniqueCategories) {
            const cat = await ConsumableTypeService.createCategory(userId, { name });
            categories.push({ id: cat.id, name: cat.name });
          }

          // 在第一个大类下创建小类
          const subtypes: Array<{ id: string; name: string; parentId: string }> = [];
          for (const name of uniqueSubtypes) {
            const sub = await ConsumableTypeService.createSubtype(userId, {
              name,
              parentId: categories[0].id,
            });
            subtypes.push({ id: sub.id, name: sub.name, parentId: sub.parentId });
          }

          // 获取层级结构
          const hierarchy = await ConsumableTypeService.findAllHierarchy(userId);

          // 验证层级结构
          expect(hierarchy.categories.length).toBe(uniqueCategories.length);

          // 验证第一个大类包含所有小类
          const firstCategory = hierarchy.categories.find((c) => c.id === categories[0].id);
          expect(firstCategory).toBeDefined();
          expect(firstCategory!.children.length).toBe(uniqueSubtypes.length);

          // 验证每个小类的 parentId 正确
          for (const child of firstCategory!.children) {
            expect(child.parentId).toBe(categories[0].id);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
