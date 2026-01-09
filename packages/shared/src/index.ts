// ============================================
// RestoNext MX - Shared Type Definitions
// ============================================

// -----------------------------
// Tenant / Restaurant Types
// -----------------------------

export interface FiscalConfig {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  csd_certificate_path?: string;
  csd_key_path?: string;
  pac_provider?: 'facturama' | 'finkok' | 'sw_sapien';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  fiscal_config: FiscalConfig;
  created_at: string;
  updated_at: string;
}

// -----------------------------
// Menu Types
// -----------------------------

export interface ModifierOption {
  id: string;
  name: string;
  price_delta: number;
}

export interface ModifierGroup {
  name: string;
  required: boolean;
  min_select?: number;
  max_select?: number;
  options: ModifierOption[];
}

export interface ModifiersSchema {
  groups: ModifierGroup[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  route_to: 'kitchen' | 'bar';
  modifiers_schema?: ModifiersSchema;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  tenant_id: string;
  name: string;
  icon?: string;
  sort_order: number;
  items?: MenuItem[];
}

// -----------------------------
// Order Types
// -----------------------------

export type OrderStatus = 'open' | 'in_progress' | 'ready' | 'delivered' | 'paid' | 'cancelled';
export type TableStatus = 'free' | 'occupied' | 'bill_requested';

export interface Table {
  id: string;
  tenant_id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  pos_x: number;
  pos_y: number;
}

export interface SelectedModifier {
  group_name: string;
  option_id: string;
  option_name: string;
  price_delta: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  selected_modifiers: SelectedModifier[];
  notes?: string;
  seat_number?: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  created_at: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  table_id: string;
  table_number?: number; // Denormalized for display
  waiter_id: string;
  waiter_name?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
}

// -----------------------------
// Bill Split Types
// -----------------------------

export type SplitType = 'by_seat' | 'even' | 'custom';

export interface BillSplit {
  id: string;
  order_id: string;
  split_type: SplitType;
  splits: SplitDetail[];
  created_at: string;
}

export interface SplitDetail {
  split_number: number;
  item_ids: string[];
  amount: number;
  paid: boolean;
  payment_method?: 'cash' | 'card' | 'transfer';
}

// -----------------------------
// Invoice / CFDI Types
// -----------------------------

export type CFDIStatus = 'pending' | 'stamped' | 'cancelled' | 'error';
export type UsoCFDI = 'G01' | 'G02' | 'G03' | 'I01' | 'I02' | 'I03' | 'P01';

export interface Invoice {
  id: string;
  order_id: string;
  tenant_id: string;
  uuid?: string;
  status: CFDIStatus;
  receptor_rfc: string;
  receptor_nombre: string;
  receptor_cp: string;
  uso_cfdi: UsoCFDI;
  total: number;
  pdf_url?: string;
  xml_url?: string;
  sat_response?: Record<string, unknown>;
  created_at: string;
}

// -----------------------------
// User / Auth Types
// -----------------------------

export type UserRole = 'admin' | 'manager' | 'waiter' | 'kitchen' | 'cashier';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

// -----------------------------
// WebSocket Event Types
// -----------------------------

export type WSEventType =
  | 'kitchen:new_order'
  | 'kitchen:order_update'
  | 'kitchen:item_ready'
  | 'table:call_waiter'
  | 'table:status_change';

export interface WSMessage<T = unknown> {
  event: WSEventType;
  payload: T;
  timestamp: string;
}

// -----------------------------
// Analytics Types
// -----------------------------

export interface ForecastResult {
  ingredient: string;
  date: string;
  predicted_demand: number;
  lower_bound: number;
  upper_bound: number;
}

export interface SalesDataPoint {
  date: string;
  ingredient: string;
  quantity_sold: number;
}
