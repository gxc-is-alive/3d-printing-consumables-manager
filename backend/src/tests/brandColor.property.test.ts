/**
 * Property-Based Tests for BrandColor Service
 * Feature: brand-color-management
 *
 * Property 1: 颜色创建验证
 * 验证: 需求 1.2, 1.3
 */

import * as fc from 'fast-check';
import { BrandColorService } from '../services/brandColor.service';
import { BrandService } from '../services/brand.service';
import { AuthService } from '../services/auth.service';

// 生成有效的颜色名称
const validColorNameArb = fc.stringMatching(
  /^[A-Za-z\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 ]{0,20}$/
);

// 生成有效的十六进制颜色代码
const validHexColorArb = fc
  .tuple(fc.hexaString({ minLength: 6, maxLength: 6 }))
  .map(([hex]) => `#${hex.toUpperCase()}`);

// 生成无效的十六进制颜色代码
const invalidHexColorArb = fc.oneof(
  fc.constant(''),
  fc.constant('#'),
  fc.constant('#FFF'),
  fc.constant('#GGGGGG'),
  fc.constant('FFFFFF'),
  fc.stringMatching(/^[A-Za-z0-9]{1,10}$/).filter((s) => !s.match(/^#[0-9A-Fa-f]{6}$/))
);

// 生成有效的品牌名称
const validBrandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

// 辅助函数：创建测试用户
async function createTestUser(): Promise<{ userId: string; email: string }> {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const result = await AuthService.register({
    email,
    password: 'testpassword123',
    name: 'Test User',
  });
  return { userId: result.user.id, email };
}

// 辅助函数：创建测试品牌
async function createTestBrand(userId: string, name?: string): Promise<string> {
  const brandName = name || `Brand-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const brand = await BrandService.create(userId, { name: brandName });
  return brand.id;
}

describe('Property 1: 颜色创建验证', () => {
  /**
   * Property: 对于任意有效的颜色名称和颜色代码，创建应该成功
   * **验证: 需求 1.2**
   */
  it('应该接受有效的颜色名称和颜色代码', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, validHexColorArb, async (colorName, colorHex) => {
        const { userId } = await createTestUser();
        const brandId = await createTestBrand(userId);

        const created = await BrandColorService.create(userId, brandId, {
          colorName,
          colorHex,
        });

        expect(created.id).toBeDefined();
        expect(created.colorName).toBe(colorName.trim());
        expect(created.colorHex.toUpperCase()).toBe(colorHex.toUpperCase());
        expect(created.brandId).toBe(brandId);
        expect(created.userId).toBe(userId);
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: 对于空的颜色名称，创建应该失败
   * **验证: 需求 1.2**
   */
  it('应该拒绝空的颜色名称', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n'),
        validHexColorArb,
        async (colorName, colorHex) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          await expect(
            BrandColorService.create(userId, brandId, { colorName, colorHex })
          ).rejects.toThrow('Color name is required');
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 对于无效的颜色代码格式，创建应该失败
   * **验证: 需求 1.2**
   */
  it('应该拒绝无效的颜色代码格式', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, invalidHexColorArb, async (colorName, colorHex) => {
        const { userId } = await createTestUser();
        const brandId = await createTestBrand(userId);

        await expect(
          BrandColorService.create(userId, brandId, { colorName, colorHex })
        ).rejects.toThrow('Invalid color hex format');
      }),
      { numRuns: 5 }
    );
  });

  /**
   * Property: 同一品牌下重复的颜色名称应该被拒绝
   * **验证: 需求 1.3**
   */
  it('应该拒绝同一品牌下重复的颜色名称', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validHexColorArb,
        validHexColorArb,
        async (colorName, colorHex1, colorHex2) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 第一次创建应该成功
          await BrandColorService.create(userId, brandId, {
            colorName,
            colorHex: colorHex1,
          });

          // 第二次创建相同名称应该失败
          await expect(
            BrandColorService.create(userId, brandId, {
              colorName,
              colorHex: colorHex2,
            })
          ).rejects.toThrow('Color name already exists');
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 不同品牌下可以有相同的颜色名称
   * **验证: 需求 1.3**
   */
  it('应该允许不同品牌下有相同的颜色名称', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, validHexColorArb, async (colorName, colorHex) => {
        const { userId } = await createTestUser();
        const brandId1 = await createTestBrand(userId);
        const brandId2 = await createTestBrand(userId);

        // 在品牌1创建颜色
        const color1 = await BrandColorService.create(userId, brandId1, {
          colorName,
          colorHex,
        });

        // 在品牌2创建相同名称的颜色应该成功
        const color2 = await BrandColorService.create(userId, brandId2, {
          colorName,
          colorHex,
        });

        expect(color1.id).not.toBe(color2.id);
        expect(color1.brandId).toBe(brandId1);
        expect(color2.brandId).toBe(brandId2);
        expect(color1.colorName).toBe(color2.colorName);
      }),
      { numRuns: 3 }
    );
  });
});

describe('Property 3: 颜色列表排序', () => {
  /**
   * Property: 对于任意品牌的颜色列表查询，返回的颜色应按 colorName 字母顺序升序排列
   * **验证: 需求 1.5**
   */
  it('应该按颜色名称字母顺序返回颜色列表', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 2, maxLength: 10 }),
        async (colorNames) => {
          // 确保颜色名称唯一
          const uniqueNames = [...new Set(colorNames.map((n) => n.trim()))].filter(
            (n) => n.length > 0
          );
          if (uniqueNames.length < 2) return;

          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 创建多个颜色（随机顺序）
          for (const colorName of uniqueNames) {
            await BrandColorService.create(userId, brandId, {
              colorName,
              colorHex: '#CCCCCC',
            });
          }

          // 获取颜色列表
          const colors = await BrandColorService.findAllByBrand(userId, brandId);

          // 验证返回数量
          expect(colors.length).toBe(uniqueNames.length);

          // 验证排序：每个颜色名称应该 <= 下一个颜色名称
          for (let i = 0; i < colors.length - 1; i++) {
            const current = colors[i].colorName;
            const next = colors[i + 1].colorName;
            // SQLite 默认排序是区分大小写的 (BINARY)，大写字母排在小写字母前面
            expect(current <= next).toBe(true);
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: 空品牌应该返回空列表
   * **验证: 需求 1.5**
   */
  it('空品牌应该返回空颜色列表', async () => {
    const { userId } = await createTestUser();
    const brandId = await createTestBrand(userId);

    const colors = await BrandColorService.findAllByBrand(userId, brandId);
    expect(colors).toEqual([]);
  });
});

describe('Property 4: 权限隔离', () => {
  /**
   * Property: 用户 A 不能查看用户 B 的品牌颜色
   * **验证: 需求 2.5**
   */
  it('用户不能查看其他用户的品牌颜色', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, validHexColorArb, async (colorName, colorHex) => {
        // 创建两个用户
        const userA = await createTestUser();
        const userB = await createTestUser();

        // 用户 A 创建品牌和颜色
        const brandIdA = await createTestBrand(userA.userId);
        await BrandColorService.create(userA.userId, brandIdA, {
          colorName,
          colorHex,
        });

        // 用户 B 尝试查看用户 A 的品牌颜色应该失败
        await expect(BrandColorService.findAllByBrand(userB.userId, brandIdA)).rejects.toThrow(
          'Brand not found'
        );
      }),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 用户 A 不能创建颜色到用户 B 的品牌
   * **验证: 需求 2.5**
   */
  it('用户不能在其他用户的品牌下创建颜色', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, validHexColorArb, async (colorName, colorHex) => {
        // 创建两个用户
        const userA = await createTestUser();
        const userB = await createTestUser();

        // 用户 A 创建品牌
        const brandIdA = await createTestBrand(userA.userId);

        // 用户 B 尝试在用户 A 的品牌下创建颜色应该失败
        await expect(
          BrandColorService.create(userB.userId, brandIdA, {
            colorName,
            colorHex,
          })
        ).rejects.toThrow('Brand not found');
      }),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 用户 A 不能修改用户 B 的品牌颜色
   * **验证: 需求 2.5**
   */
  it('用户不能修改其他用户的品牌颜色', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validColorNameArb,
        validHexColorArb,
        async (colorName, newColorName, colorHex) => {
          // 创建两个用户
          const userA = await createTestUser();
          const userB = await createTestUser();

          // 用户 A 创建品牌和颜色
          const brandIdA = await createTestBrand(userA.userId);
          const color = await BrandColorService.create(userA.userId, brandIdA, {
            colorName,
            colorHex,
          });

          // 用户 B 尝试修改用户 A 的颜色应该失败
          await expect(
            BrandColorService.update(userB.userId, brandIdA, color.id, {
              colorName: newColorName,
            })
          ).rejects.toThrow('Color not found');
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 用户 A 不能删除用户 B 的品牌颜色
   * **验证: 需求 2.5**
   */
  it('用户不能删除其他用户的品牌颜色', async () => {
    await fc.assert(
      fc.asyncProperty(validColorNameArb, validHexColorArb, async (colorName, colorHex) => {
        // 创建两个用户
        const userA = await createTestUser();
        const userB = await createTestUser();

        // 用户 A 创建品牌和颜色
        const brandIdA = await createTestBrand(userA.userId);
        const color = await BrandColorService.create(userA.userId, brandIdA, {
          colorName,
          colorHex,
        });

        // 用户 B 尝试删除用户 A 的颜色应该失败
        await expect(BrandColorService.delete(userB.userId, brandIdA, color.id)).rejects.toThrow(
          'Color not found'
        );

        // 验证颜色仍然存在
        const colors = await BrandColorService.findAllByBrand(userA.userId, brandIdA);
        expect(colors.length).toBe(1);
        expect(colors[0].id).toBe(color.id);
      }),
      { numRuns: 3 }
    );
  });
});

describe('Property 6: 新颜色自动添加幂等性', () => {
  /**
   * Property: 多次创建相同颜色名称的耗材，品牌颜色库中该颜色只有一条记录
   * **验证: 需求 4.1, 4.4**
   */
  it('多次尝试创建相同颜色应该只有一条记录', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validHexColorArb,
        fc.integer({ min: 2, max: 5 }),
        async (colorName, colorHex, attempts) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 第一次创建应该成功
          const firstColor = await BrandColorService.create(userId, brandId, {
            colorName,
            colorHex,
          });
          expect(firstColor).toBeDefined();

          // 后续尝试创建相同颜色应该失败
          for (let i = 1; i < attempts; i++) {
            await expect(
              BrandColorService.create(userId, brandId, {
                colorName,
                colorHex,
              })
            ).rejects.toThrow('Color name already exists');
          }

          // 验证只有一条记录
          const colors = await BrandColorService.findAllByBrand(userId, brandId);
          expect(colors.length).toBe(1);
          expect(colors[0].colorName).toBe(colorName.trim());
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: findByName 可以正确检测颜色是否存在
   * **验证: 需求 4.4**
   */
  it('findByName 应该正确检测颜色存在性', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validColorNameArb,
        validHexColorArb,
        async (existingName, nonExistingName, colorHex) => {
          // 确保两个名称不同
          if (existingName.trim().toLowerCase() === nonExistingName.trim().toLowerCase()) {
            return;
          }

          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 创建一个颜色
          await BrandColorService.create(userId, brandId, {
            colorName: existingName,
            colorHex,
          });

          // 查找存在的颜色
          const found = await BrandColorService.findByName(userId, brandId, existingName);
          expect(found).not.toBeNull();
          expect(found?.colorName).toBe(existingName.trim());

          // 查找不存在的颜色
          const notFound = await BrandColorService.findByName(userId, brandId, nonExistingName);
          expect(notFound).toBeNull();
        }
      ),
      { numRuns: 3 }
    );
  });
});

import { prisma } from '../db';

describe('Property 7: 迁移数据完整性', () => {
  /**
   * Property: 批量创建颜色时，每个唯一的 (brandId, colorName) 组合只有一条记录
   * **验证: 需求 6.2, 6.3**
   */
  it('批量创建应该保证颜色唯一性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validColorNameArb, { minLength: 1, maxLength: 5 }),
        fc.array(validHexColorArb, { minLength: 1, maxLength: 5 }),
        async (colorNames, colorHexes) => {
          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 创建包含重复颜色名称的数据
          const colorsToCreate = colorNames.map((name, i) => ({
            colorName: name,
            colorHex: colorHexes[i % colorHexes.length],
          }));

          // 使用 createMany 批量创建
          const count = await BrandColorService.createMany(userId, brandId, colorsToCreate);

          // 获取创建的颜色
          const colors = await BrandColorService.findAllByBrand(userId, brandId);

          // 验证唯一性：颜色数量应该等于唯一颜色名称数量
          const uniqueNames = new Set(colorNames.map((n) => n.trim()));
          expect(colors.length).toBe(uniqueNames.size);
          expect(count).toBeLessThanOrEqual(uniqueNames.size);

          // 验证每个颜色名称只出现一次
          const colorNameCounts = new Map<string, number>();
          for (const color of colors) {
            const currentCount = colorNameCounts.get(color.colorName) || 0;
            colorNameCounts.set(color.colorName, currentCount + 1);
          }
          for (const [, count] of colorNameCounts) {
            expect(count).toBe(1);
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 迁移时如果耗材有 colorHex 值，应该使用该值；否则使用默认值
   * **验证: 需求 6.4**
   */
  it('批量创建应该正确处理 colorHex 值', async () => {
    await fc.assert(
      fc.asyncProperty(
        validColorNameArb,
        validColorNameArb,
        validHexColorArb,
        async (colorName1, colorName2, colorHex) => {
          // 确保两个颜色名称不同
          if (colorName1.trim() === colorName2.trim()) {
            return;
          }

          const { userId } = await createTestUser();
          const brandId = await createTestBrand(userId);

          // 创建两个颜色：一个有 colorHex，一个没有
          const colorsToCreate = [
            { colorName: colorName1, colorHex: colorHex },
            { colorName: colorName2 }, // 没有 colorHex
          ];

          await BrandColorService.createMany(userId, brandId, colorsToCreate);

          // 获取创建的颜色
          const colors = await BrandColorService.findAllByBrand(userId, brandId);

          // 找到对应的颜色记录
          const color1 = colors.find((c) => c.colorName === colorName1.trim());
          const color2 = colors.find((c) => c.colorName === colorName2.trim());

          // 验证 colorHex 值
          expect(color1).toBeDefined();
          expect(color1?.colorHex.toUpperCase()).toBe(colorHex.toUpperCase());

          expect(color2).toBeDefined();
          expect(color2?.colorHex).toBe('#CCCCCC'); // 默认值
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: 迁移脚本应该正确处理空颜色名称
   * **验证: 需求 6.2**
   */
  it('批量创建应该跳过空颜色名称', async () => {
    const { userId } = await createTestUser();
    const brandId = await createTestBrand(userId);

    // 创建包含空颜色名称的数据
    const colorsToCreate = [
      { colorName: '', colorHex: '#FF0000' },
      { colorName: '   ', colorHex: '#00FF00' },
      { colorName: 'ValidColor', colorHex: '#0000FF' },
    ];

    const count = await BrandColorService.createMany(userId, brandId, colorsToCreate);

    // 只有有效的颜色应该被创建
    expect(count).toBe(1);

    const colors = await BrandColorService.findAllByBrand(userId, brandId);
    expect(colors.length).toBe(1);
    expect(colors[0].colorName).toBe('ValidColor');
  });
});
