/**
 * RestoNext MX - Appwrite Types
 * TypeScript interfaces for Appwrite Document Store structure
 * Designed for Toast-level menu capabilities with embedded modifiers
 */

// ============================================
// Base Appwrite Document Interface
// ============================================

export interface AppwriteDocument {
  id: string; // Mapped from $id
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}

// ============================================
// Restaurant (Tenant)
// ============================================

export interface FiscalConfig {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  csd_certificate_path?: string;
  csd_key_path?: string;
  pac_provider?: string;
}

export interface Restaurant extends AppwriteDocument {
  name: string;
  slug: string;
  owner_id: string;
  team_id: string;
  fiscal_config?: FiscalConfig;
  timezone: string;
  currency: string;
  is_active: boolean;
  logo_url?: string;
  address?: string;
  phone?: string;
}

// ============================================
// Menu Categories
// ============================================

export interface MenuCategory extends AppwriteDocument {
  restaurant_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  image_url?: string;
}

// ============================================
// Modifiers (Embedded in MenuItems)
// ============================================

export interface ModifierOption {
  id: string;
  name: string;
  price_delta: number;
  is_available?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  options: ModifierOption[];
}

// ============================================
// Menu Items (with embedded modifiers)
// ============================================

export type RouteDestination = 'kitchen' | 'bar' | 'direct';

export interface MenuItem extends AppwriteDocument {
  restaurant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  image_url?: string;
  route_to: RouteDestination;
  prep_time_minutes: number;
  is_available: boolean;
  modifier_groups: ModifierGroup[];
  tags?: string[];
  allergens?: string[];
  calories?: number;
  recipe_count?: number;  // Number of ingredients linked via recipe (escandallo)
}

// ============================================
// Orders (with embedded items)
// ============================================

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'takeout' | 'delivery';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

export interface SelectedModifier {
  group: string;
  option: string;
  option_id: string;
  price_delta: number;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  selected_modifiers: SelectedModifier[];
  line_total: number;
  seat_number?: number;
  status: OrderItemStatus;
  notes?: string;
  route_to: RouteDestination;
}

export interface Order extends AppwriteDocument {
  restaurant_id: string;
  table_id?: string;
  table_number?: number;
  waiter_id: string;
  waiter_name?: string;
  status: OrderStatus;
  order_type: OrderType;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  notes?: string;
  created_at: string;
  completed_at?: string;
  payment_method?: string;
  payment_reference?: string;
}

// ============================================
// Inventory
// ============================================

export type InventoryUnit = 'kg' | 'g' | 'l' | 'ml' | 'pieza' | 'porcion';

export interface InventoryItem extends AppwriteDocument {
  restaurant_id: string;
  name: string;
  sku?: string;
  unit: InventoryUnit;
  quantity_on_hand: number;
  reorder_level: number;
  cost_per_unit: number;
  supplier?: string;
  last_restocked?: string;
  expiry_date?: string;
}

// ============================================
// Recipes (for costing)
// ============================================

export interface RecipeIngredient {
  inventory_id: string;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  cost: number;
}

export interface Recipe extends AppwriteDocument {
  restaurant_id: string;
  menu_item_id: string;
  menu_item_name: string;
  ingredients: RecipeIngredient[];
  total_cost: number;
  yield_quantity?: number;
  prep_instructions?: string;
}

// ============================================
// Tables
// ============================================

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'bill_requested' | 'service_requested';

export interface Table extends AppwriteDocument {
  restaurant_id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  pos_x: number;
  pos_y: number;
  section?: string;
  current_order_id?: string;
}

// ============================================
// Users (Reference - stored in Appwrite Auth)
// ============================================

export type UserRole = 'admin' | 'manager' | 'waiter' | 'chef' | 'cashier' | 'host';

export interface UserProfile extends AppwriteDocument {
  user_id: string;
  restaurant_id: string;
  team_id: string;
  name: string;
  email: string;
  role: UserRole;
  pin?: string; // For quick clock-in
  is_active: boolean;
  avatar_url?: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateOrderRequest {
  restaurant_id: string;
  table_id?: string;
  table_number?: number;
  waiter_id: string;
  waiter_name?: string;
  order_type: OrderType;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_modifiers?: SelectedModifier[];
    seat_number?: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  total?: number;
  items_count?: number;
  inventory_updated?: number;
  error?: string;
}

export interface InventoryDecrementResult {
  inventory_id: string;
  name: string;
  previous_quantity: number;
  new_quantity: number;
  below_reorder: boolean;
}

// ============================================
// Appwrite Collection IDs
// ============================================

export const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  MENU_CATEGORIES: 'menu_categories',
  MENU_ITEMS: 'menu_items',
  MODIFIER_GROUPS: 'modifier_groups',
  ORDERS: 'orders',
  INVENTORY_ITEMS: 'inventory_items',
  RECIPES: 'recipes',
  TABLES: 'tables',
  USER_PROFILES: 'user_profiles',
} as const;

export const DATABASE_ID = 'restonext_db';
