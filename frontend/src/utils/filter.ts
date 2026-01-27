/**
 * 筛选工具函数
 */

export interface FilterValues {
  brandId?: string;
  typeId?: string;
  color?: string;
  isOpened?: string;
}

export interface FilterableItem {
  brandId?: string;
  typeId?: string;
  color?: string;
  isOpened?: boolean;
}

/**
 * 应用筛选条件
 * @param items 待筛选的数据列表
 * @param filter 筛选条件
 * @returns 筛选后的数据列表
 */
export function applyFilter<T extends FilterableItem>(
  items: T[],
  filter: FilterValues
): T[] {
  return items.filter((item) => {
    // 品牌筛选
    if (filter.brandId && item.brandId !== filter.brandId) {
      return false;
    }

    // 类型筛选
    if (filter.typeId && item.typeId !== filter.typeId) {
      return false;
    }

    // 颜色筛选（模糊匹配）
    if (filter.color && item.color) {
      const searchColor = filter.color.toLowerCase();
      const itemColor = item.color.toLowerCase();
      if (!itemColor.includes(searchColor)) {
        return false;
      }
    }

    // 开封状态筛选
    if (filter.isOpened !== undefined && filter.isOpened !== "") {
      const isOpenedFilter = filter.isOpened === "true";
      if (item.isOpened !== isOpenedFilter) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 检查项目是否匹配筛选条件
 * @param item 待检查的项目
 * @param filter 筛选条件
 * @returns 是否匹配
 */
export function matchesFilter<T extends FilterableItem>(
  item: T,
  filter: FilterValues
): boolean {
  if (filter.brandId && item.brandId !== filter.brandId) {
    return false;
  }

  if (filter.typeId && item.typeId !== filter.typeId) {
    return false;
  }

  if (filter.color && item.color) {
    const searchColor = filter.color.toLowerCase();
    const itemColor = item.color.toLowerCase();
    if (!itemColor.includes(searchColor)) {
      return false;
    }
  }

  if (filter.isOpened !== undefined && filter.isOpened !== "") {
    const isOpenedFilter = filter.isOpened === "true";
    if (item.isOpened !== isOpenedFilter) {
      return false;
    }
  }

  return true;
}

/**
 * 计算活跃筛选条件数量
 * @param filter 筛选条件
 * @returns 活跃筛选条件数量
 */
export function countActiveFilters(filter: FilterValues): number {
  let count = 0;

  if (filter.brandId) count++;
  if (filter.typeId) count++;
  if (filter.color) count++;
  if (filter.isOpened !== undefined && filter.isOpened !== "") count++;

  return count;
}

/**
 * 重置筛选条件
 * @returns 空的筛选条件对象
 */
export function resetFilter(): FilterValues {
  return {
    brandId: "",
    typeId: "",
    color: "",
    isOpened: "",
  };
}
