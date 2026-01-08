/**
 * Property-Based Tests for User Data Isolation
 * Feature: 3d-printing-consumables-manager, Property 6: User Data Isolation
 * Validates: Requirements 9.3
 *
 * Property: For any two different users A and B, user A's API requests should
 * never return data created by user B, and vice versa.
 */

import * as fc from 'fast-check';
import { AuthService } from '../services/auth.service';
import { BrandService } from '../services/brand.service';
import { ConsumableTypeService } from '../services/consumableType.service';
import { ConsumableService } from '../services/consumable.service';
import { UsageRecordService } from '../services/usageRecord.service';

// Arbitrary for generating valid email addresses
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitrary for generating valid passwords
const validPasswordArb = fc.stringMatching(/^[a-zA-Z0-9!@#$%^&*]{6,20}$/);

// Arbitrary for generating valid names
const validNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{1,30}$/);

// Arbitrary for generating brand names
const brandNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{2,20}$/);

// Arbitrary for generating consumable type names
const typeNameArb = fc.constantFrom('PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'HIPS', 'PC');

// Arbitrary for generating color names
const colorNameArb = fc.constantFrom('Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Orange');

// Arbitrary for generating positive weights
const weightArb = fc.integer({ min: 100, max: 2000 });

// Arbitrary for generating positive prices
const priceArb = fc.integer({ min: 10, max: 500 });

// Helper to create two distinct users
async function createTwoUsers(
  email1: string,
  email2: string,
  password: string,
  name1: string,
  name2: string
) {
  const user1 = await AuthService.register({ email: email1, password, name: name1 });
  const user2 = await AuthService.register({ email: email2, password, name: name2 });
  return { user1: user1.user, user2: user2.user };
}

describe('Property 6: User Data Isolation', () => {
  /**
   * Property: User A cannot see User B's brands when listing brands
   */
  it('should isolate brand data between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        brandNameArb,
        async (email1, email2, password, name1, name2, brandName1, brandName2) => {
          // Ensure emails are different
          fc.pre(email1 !== email2);
          fc.pre(brandName1 !== brandName2);

          // Create two users
          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // User 1 creates a brand
          const brand1 = await BrandService.create(user1.id, { name: brandName1 });

          // User 2 creates a brand
          const brand2 = await BrandService.create(user2.id, { name: brandName2 });

          // User 1 should only see their own brand
          const user1Brands = await BrandService.findAllByUser(user1.id);
          expect(user1Brands).toHaveLength(1);
          expect(user1Brands[0].id).toBe(brand1.id);
          expect(user1Brands.some((b) => b.id === brand2.id)).toBe(false);

          // User 2 should only see their own brand
          const user2Brands = await BrandService.findAllByUser(user2.id);
          expect(user2Brands).toHaveLength(1);
          expect(user2Brands[0].id).toBe(brand2.id);
          expect(user2Brands.some((b) => b.id === brand1.id)).toBe(false);

          // User 1 cannot access User 2's brand by ID
          await expect(BrandService.findById(user1.id, brand2.id)).rejects.toThrow(
            'Brand not found'
          );

          // User 2 cannot access User 1's brand by ID
          await expect(BrandService.findById(user2.id, brand1.id)).rejects.toThrow(
            'Brand not found'
          );
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot modify or delete User B's brands
   */
  it('should prevent cross-user brand modification and deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        async (email1, email2, password, name1, name2, brandName) => {
          fc.pre(email1 !== email2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // User 1 creates a brand
          const brand1 = await BrandService.create(user1.id, { name: brandName });

          // User 2 cannot update User 1's brand
          await expect(
            BrandService.update(user2.id, brand1.id, { name: 'Hacked Brand' })
          ).rejects.toThrow('Brand not found');

          // User 2 cannot delete User 1's brand
          await expect(BrandService.delete(user2.id, brand1.id)).rejects.toThrow('Brand not found');

          // Verify brand still exists and unchanged
          const brand = await BrandService.findById(user1.id, brand1.id);
          expect(brand.name).toBe(brandName);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot see User B's consumable types
   */
  it('should isolate consumable type data between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        typeNameArb,
        typeNameArb,
        async (email1, email2, password, name1, name2, typeName1, typeName2) => {
          fc.pre(email1 !== email2);
          fc.pre(typeName1 !== typeName2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // User 1 creates a type
          const type1 = await ConsumableTypeService.create(user1.id, { name: typeName1 });

          // User 2 creates a type
          const type2 = await ConsumableTypeService.create(user2.id, { name: typeName2 });

          // User 1 should only see their own type
          const user1Types = await ConsumableTypeService.findAllByUser(user1.id);
          expect(user1Types).toHaveLength(1);
          expect(user1Types[0].id).toBe(type1.id);
          expect(user1Types.some((t) => t.id === type2.id)).toBe(false);

          // User 2 should only see their own type
          const user2Types = await ConsumableTypeService.findAllByUser(user2.id);
          expect(user2Types).toHaveLength(1);
          expect(user2Types[0].id).toBe(type2.id);
          expect(user2Types.some((t) => t.id === type1.id)).toBe(false);

          // Cross-user access by ID should fail
          await expect(ConsumableTypeService.findById(user1.id, type2.id)).rejects.toThrow(
            'Consumable type not found'
          );
          await expect(ConsumableTypeService.findById(user2.id, type1.id)).rejects.toThrow(
            'Consumable type not found'
          );
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot see User B's consumables
   */
  it('should isolate consumable data between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        brandNameArb,
        colorNameArb,
        weightArb,
        priceArb,
        async (
          email1,
          email2,
          password,
          name1,
          name2,
          brandName1,
          brandName2,
          color,
          weight,
          price
        ) => {
          fc.pre(email1 !== email2);
          fc.pre(brandName1 !== brandName2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // Each user creates their own brand and type
          const brand1 = await BrandService.create(user1.id, { name: brandName1 });
          const brand2 = await BrandService.create(user2.id, { name: brandName2 });
          const type1 = await ConsumableTypeService.create(user1.id, { name: 'PLA' });
          const type2 = await ConsumableTypeService.create(user2.id, { name: 'ABS' });

          // Each user creates a consumable
          const consumable1 = await ConsumableService.create(user1.id, {
            brandId: brand1.id,
            typeId: type1.id,
            color,
            weight,
            price,
            purchaseDate: new Date(),
          });

          const consumable2 = await ConsumableService.create(user2.id, {
            brandId: brand2.id,
            typeId: type2.id,
            color,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // User 1 should only see their own consumable
          const user1Consumables = await ConsumableService.findAllByUser(user1.id);
          expect(user1Consumables).toHaveLength(1);
          expect(user1Consumables[0].id).toBe(consumable1.id);
          expect(user1Consumables.some((c) => c.id === consumable2.id)).toBe(false);

          // User 2 should only see their own consumable
          const user2Consumables = await ConsumableService.findAllByUser(user2.id);
          expect(user2Consumables).toHaveLength(1);
          expect(user2Consumables[0].id).toBe(consumable2.id);
          expect(user2Consumables.some((c) => c.id === consumable1.id)).toBe(false);

          // Cross-user access by ID should fail
          await expect(ConsumableService.findById(user1.id, consumable2.id)).rejects.toThrow(
            'Consumable not found'
          );
          await expect(ConsumableService.findById(user2.id, consumable1.id)).rejects.toThrow(
            'Consumable not found'
          );
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot see User B's usage records
   */
  it('should isolate usage record data between users', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        brandNameArb,
        colorNameArb,
        weightArb,
        priceArb,
        fc.integer({ min: 10, max: 100 }),
        async (
          email1,
          email2,
          password,
          name1,
          name2,
          brandName1,
          brandName2,
          color,
          weight,
          price,
          usageAmount
        ) => {
          fc.pre(email1 !== email2);
          fc.pre(brandName1 !== brandName2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // Setup for user 1
          const brand1 = await BrandService.create(user1.id, { name: brandName1 });
          const type1 = await ConsumableTypeService.create(user1.id, { name: 'PLA' });
          const consumable1 = await ConsumableService.create(user1.id, {
            brandId: brand1.id,
            typeId: type1.id,
            color,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // Setup for user 2
          const brand2 = await BrandService.create(user2.id, { name: brandName2 });
          const type2 = await ConsumableTypeService.create(user2.id, { name: 'ABS' });
          const consumable2 = await ConsumableService.create(user2.id, {
            brandId: brand2.id,
            typeId: type2.id,
            color,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // Each user creates a usage record
          const { record: usage1 } = await UsageRecordService.create(user1.id, {
            consumableId: consumable1.id,
            amountUsed: usageAmount,
            usageDate: new Date(),
          });

          const { record: usage2 } = await UsageRecordService.create(user2.id, {
            consumableId: consumable2.id,
            amountUsed: usageAmount,
            usageDate: new Date(),
          });

          // User 1 should only see their own usage records
          const user1Usages = await UsageRecordService.findAllByUser(user1.id);
          expect(user1Usages).toHaveLength(1);
          expect(user1Usages[0].id).toBe(usage1.id);
          expect(user1Usages.some((u) => u.id === usage2.id)).toBe(false);

          // User 2 should only see their own usage records
          const user2Usages = await UsageRecordService.findAllByUser(user2.id);
          expect(user2Usages).toHaveLength(1);
          expect(user2Usages[0].id).toBe(usage2.id);
          expect(user2Usages.some((u) => u.id === usage1.id)).toBe(false);

          // Cross-user access by ID should fail
          await expect(UsageRecordService.findById(user1.id, usage2.id)).rejects.toThrow(
            'Usage record not found'
          );
          await expect(UsageRecordService.findById(user2.id, usage1.id)).rejects.toThrow(
            'Usage record not found'
          );
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot create consumables using User B's brands or types
   */
  it('should prevent cross-user resource references', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        brandNameArb,
        colorNameArb,
        weightArb,
        priceArb,
        async (
          email1,
          email2,
          password,
          name1,
          name2,
          brandName1,
          brandName2,
          color,
          weight,
          price
        ) => {
          fc.pre(email1 !== email2);
          fc.pre(brandName1 !== brandName2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // User 1 creates brand and type
          const brand1 = await BrandService.create(user1.id, { name: brandName1 });
          const type1 = await ConsumableTypeService.create(user1.id, { name: 'PLA' });

          // User 2 creates their own type
          const type2 = await ConsumableTypeService.create(user2.id, { name: 'ABS' });

          // User 2 cannot create consumable using User 1's brand
          await expect(
            ConsumableService.create(user2.id, {
              brandId: brand1.id,
              typeId: type2.id,
              color,
              weight,
              price,
              purchaseDate: new Date(),
            })
          ).rejects.toThrow('Brand not found');

          // User 2 cannot create consumable using User 1's type
          const brand2 = await BrandService.create(user2.id, { name: brandName2 });
          await expect(
            ConsumableService.create(user2.id, {
              brandId: brand2.id,
              typeId: type1.id,
              color,
              weight,
              price,
              purchaseDate: new Date(),
            })
          ).rejects.toThrow('Consumable type not found');
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: User A cannot create usage records for User B's consumables
   */
  it('should prevent cross-user usage record creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validEmailArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        brandNameArb,
        colorNameArb,
        weightArb,
        priceArb,
        fc.integer({ min: 10, max: 100 }),
        async (
          email1,
          email2,
          password,
          name1,
          name2,
          brandName,
          color,
          weight,
          price,
          usageAmount
        ) => {
          fc.pre(email1 !== email2);

          const { user1, user2 } = await createTwoUsers(email1, email2, password, name1, name2);

          // User 1 creates a consumable
          const brand1 = await BrandService.create(user1.id, { name: brandName });
          const type1 = await ConsumableTypeService.create(user1.id, { name: 'PLA' });
          const consumable1 = await ConsumableService.create(user1.id, {
            brandId: brand1.id,
            typeId: type1.id,
            color,
            weight,
            price,
            purchaseDate: new Date(),
          });

          // User 2 cannot create usage record for User 1's consumable
          await expect(
            UsageRecordService.create(user2.id, {
              consumableId: consumable1.id,
              amountUsed: usageAmount,
              usageDate: new Date(),
            })
          ).rejects.toThrow('Consumable not found');
        }
      ),
      { numRuns: 3 }
    );
  });
});
