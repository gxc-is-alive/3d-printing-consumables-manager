import { prisma } from '../db';

export interface InventoryGroupByBrand {
  brandId: string;
  brandName: string;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface InventoryGroupByType {
  typeId: string;
  typeName: string;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface InventoryGroupByColor {
  color: string;
  colorHex: string | null;
  totalWeight: number;
  totalRemainingWeight: number;
  count: number;
}

export interface InventoryStats {
  totalConsumables: number;
  totalWeight: number;
  totalRemainingWeight: number;
  totalSpending: number;
  openedCount: number;
  unopenedCount: number;
  lowStockItems: LowStockItem[];
}

export interface LowStockItem {
  id: string;
  color: string;
  brandName: string;
  typeName: string;
  remainingWeight: number;
  weight: number;
  percentRemaining: number;
}

export interface PriceTrendItem {
  date: string;
  price: number;
  brandName: string;
  typeName: string;
  color: string;
}

export interface PriceStats {
  trend: PriceTrendItem[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  totalCount: number;
}

export interface InventoryOverview {
  byBrand: InventoryGroupByBrand[];
  byType: InventoryGroupByType[];
  byColor: InventoryGroupByColor[];
}

// Default low stock threshold (20% remaining)
const DEFAULT_LOW_STOCK_THRESHOLD = 0.2;

export class DashboardService {
  /**
   * Get inventory overview grouped by brand, type, and color
   */
  static async getInventoryOverview(userId: string): Promise<InventoryOverview> {
    const consumables = await prisma.consumable.findMany({
      where: { userId },
      include: {
        brand: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    // Group by brand
    const brandMap = new Map<string, InventoryGroupByBrand>();
    for (const c of consumables) {
      const existing = brandMap.get(c.brandId);
      if (existing) {
        existing.totalWeight += c.weight;
        existing.totalRemainingWeight += c.remainingWeight;
        existing.count += 1;
      } else {
        brandMap.set(c.brandId, {
          brandId: c.brandId,
          brandName: c.brand.name,
          totalWeight: c.weight,
          totalRemainingWeight: c.remainingWeight,
          count: 1,
        });
      }
    }

    // Group by type
    const typeMap = new Map<string, InventoryGroupByType>();
    for (const c of consumables) {
      const existing = typeMap.get(c.typeId);
      if (existing) {
        existing.totalWeight += c.weight;
        existing.totalRemainingWeight += c.remainingWeight;
        existing.count += 1;
      } else {
        typeMap.set(c.typeId, {
          typeId: c.typeId,
          typeName: c.type.name,
          totalWeight: c.weight,
          totalRemainingWeight: c.remainingWeight,
          count: 1,
        });
      }
    }

    // Group by color
    const colorMap = new Map<string, InventoryGroupByColor>();
    for (const c of consumables) {
      const colorKey = c.color.toLowerCase();
      const existing = colorMap.get(colorKey);
      if (existing) {
        existing.totalWeight += c.weight;
        existing.totalRemainingWeight += c.remainingWeight;
        existing.count += 1;
        // Keep the first colorHex found for this color
        if (!existing.colorHex && c.colorHex) {
          existing.colorHex = c.colorHex;
        }
      } else {
        colorMap.set(colorKey, {
          color: c.color,
          colorHex: c.colorHex,
          totalWeight: c.weight,
          totalRemainingWeight: c.remainingWeight,
          count: 1,
        });
      }
    }

    return {
      byBrand: Array.from(brandMap.values()),
      byType: Array.from(typeMap.values()),
      byColor: Array.from(colorMap.values()),
    };
  }

  /**
   * Get inventory statistics
   */
  static async getStats(userId: string, lowStockThreshold?: number): Promise<InventoryStats> {
    const threshold = lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

    const consumables = await prisma.consumable.findMany({
      where: { userId },
      include: {
        brand: { select: { name: true } },
        type: { select: { name: true } },
      },
    });

    let totalWeight = 0;
    let totalRemainingWeight = 0;
    let totalSpending = 0;
    let openedCount = 0;
    let unopenedCount = 0;
    const lowStockItems: LowStockItem[] = [];

    for (const c of consumables) {
      totalWeight += c.weight;
      totalRemainingWeight += c.remainingWeight;
      totalSpending += c.price;

      if (c.isOpened) {
        openedCount += 1;
      } else {
        unopenedCount += 1;
      }

      // Check for low stock
      const percentRemaining = c.weight > 0 ? c.remainingWeight / c.weight : 0;
      if (percentRemaining <= threshold && c.remainingWeight > 0) {
        lowStockItems.push({
          id: c.id,
          color: c.color,
          brandName: c.brand.name,
          typeName: c.type.name,
          remainingWeight: c.remainingWeight,
          weight: c.weight,
          percentRemaining: Math.round(percentRemaining * 100),
        });
      }
    }

    return {
      totalConsumables: consumables.length,
      totalWeight,
      totalRemainingWeight,
      totalSpending,
      openedCount,
      unopenedCount,
      lowStockItems,
    };
  }

  /**
   * Calculate total remaining weight for a specific category
   * Used for property testing
   */
  static async getTotalRemainingByBrand(userId: string, brandId: string): Promise<number> {
    const consumables = await prisma.consumable.findMany({
      where: { userId, brandId },
    });
    return consumables.reduce((sum, c) => sum + c.remainingWeight, 0);
  }

  /**
   * Calculate total remaining weight for a specific type
   * Used for property testing
   */
  static async getTotalRemainingByType(userId: string, typeId: string): Promise<number> {
    const consumables = await prisma.consumable.findMany({
      where: { userId, typeId },
    });
    return consumables.reduce((sum, c) => sum + c.remainingWeight, 0);
  }

  /**
   * Calculate total remaining weight for a specific color
   * Used for property testing
   */
  static async getTotalRemainingByColor(userId: string, color: string): Promise<number> {
    const consumables = await prisma.consumable.findMany({
      where: { userId },
    });
    // Filter case-insensitively in JavaScript since SQLite doesn't support mode: 'insensitive'
    const filtered = consumables.filter((c) => c.color.toLowerCase() === color.toLowerCase());
    return filtered.reduce((sum, c) => sum + c.remainingWeight, 0);
  }

  /**
   * Get price trend statistics
   * Returns price history sorted by purchase date with average, min, max
   */
  static async getPriceStats(userId: string): Promise<PriceStats> {
    const consumables = await prisma.consumable.findMany({
      where: { userId },
      include: {
        brand: { select: { name: true } },
        type: { select: { name: true } },
      },
      orderBy: { purchaseDate: 'asc' },
    });

    if (consumables.length === 0) {
      return {
        trend: [],
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalCount: 0,
      };
    }

    const trend: PriceTrendItem[] = consumables.map((c) => ({
      date: c.purchaseDate.toISOString().split('T')[0],
      price: c.price,
      brandName: c.brand.name,
      typeName: c.type.name,
      color: c.color,
    }));

    const prices = consumables.map((c) => c.price);
    const totalPrice = prices.reduce((sum, p) => sum + p, 0);

    return {
      trend,
      averagePrice: totalPrice / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      totalCount: consumables.length,
    };
  }
}

export default DashboardService;
