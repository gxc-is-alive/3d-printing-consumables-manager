/**
 * 分组工具函数
 */

export interface GroupableItem {
  categoryId?: string;
  categoryName?: string;
}

export interface GroupedData<T> {
  categoryId: string;
  categoryName: string;
  items: T[];
}

/**
 * 按分类分组
 * @param items 待分组的数据列表
 * @returns 分组后的数据
 */
export function groupByCategory<T extends GroupableItem>(
  items: T[]
): GroupedData<T>[] {
  const groups = new Map<string, GroupedData<T>>();

  for (const item of items) {
    const categoryId = item.categoryId || "uncategorized";
    const categoryName = item.categoryName || "未分类";

    if (!groups.has(categoryId)) {
      groups.set(categoryId, {
        categoryId,
        categoryName,
        items: [],
      });
    }

    groups.get(categoryId)!.items.push(item);
  }

  return Array.from(groups.values());
}

/**
 * 按日期降序排序
 * @param items 待排序的数据列表
 * @param dateField 日期字段名
 * @returns 排序后的数据列表
 */
export function sortByDateDesc<T>(items: T[], dateField: keyof T): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a[dateField] as string).getTime();
    const dateB = new Date(b[dateField] as string).getTime();
    return dateB - dateA;
  });
}
