// User types
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Brand types
export interface Brand {
  id: string;
  userId: string;
  name: string;
  description?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Consumable Type types
export interface ConsumableType {
  id: string;
  userId: string;
  name: string;
  description?: string;
  printTempMin?: number;
  printTempMax?: number;
  bedTempMin?: number;
  bedTempMax?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Consumable types
export interface Consumable {
  id: string;
  userId: string;
  brandId: string;
  typeId: string;
  color: string;
  colorHex?: string;
  weight: number;
  remainingWeight: number;
  price: number;
  purchaseDate: Date;
  openedAt?: Date;
  isOpened: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Usage Record types
export interface UsageRecord {
  id: string;
  userId: string;
  consumableId: string;
  amountUsed: number;
  usageDate: Date;
  projectName?: string;
  notes?: string;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
