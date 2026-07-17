// src/types/inventory.ts

export interface Campus {
  id: number;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Zone {
  id: number;
  campus_id: number;
  name: string;
  description: string | null;
}

export interface PhysicalSpace {
  id: number;
  zone_id: number;
  responsible_name: string | null;
  name: string;
  type: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  space_id: number;
  category_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  stock: number;
  created_at: string;
  updated_at: string;
  
  // Relaciones pobladas mediante JOINS de Supabase
  physical_spaces?: PhysicalSpace & {
    zones?: Zone & {
      campuses?: Campus;
    };
  };
  categories?: Category;
}
// Añadir al final de src/types/inventory.ts

export interface StockMovement {
  id: number;
  product_id: number;
  user_id: string; // El UUID del profile que hizo el cambio
  type: 'input' | 'output' | 'adjustment';
  quantity: number;
  reason: string | null;
  created_at: string;
  
  // Relaciones opcionales para los JOINS
  products?: Product;
  profiles?: {
    email: string;
    role: string;
  };
}