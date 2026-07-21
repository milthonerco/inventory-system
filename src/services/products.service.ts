// src/services/products.service.ts
import { supabase } from "../lib/supabase";

export const ProductsService = {
  async getProductsBySpace(spaceId: number) {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }

    return data || [];
  },

  async createProduct(name: string, description: string, sku: string, stock: number, spaceId: number, categoryId: number) {
    const { data, error } = await supabase
      .from("products")
      .insert([{ 
        name, 
        description, 
        sku, 
        stock, 
        space_id: spaceId, 
        category_id: categoryId,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id: number, name: string, description: string, sku: string, categoryId: number) {
    const { data, error } = await supabase
      .from("products")
      .update({ 
        name, 
        description, 
        sku, 
        category_id: categoryId 
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProductLogically(id: number) {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};