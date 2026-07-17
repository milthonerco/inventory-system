// src/services/products.service.ts
import { supabase } from "../lib/supabase";

export const ProductsService = {
  // Obtiene solo los productos que están activos (is_active: true)
  async getProductsBySpace(spaceId: number) {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("space_id", spaceId)
      .eq("is_active", true); // 👈 Filtro clave para el borrado lógico

    if (error) {
      console.error("Error al obtener productos:", error);
      return [];
    }

    return data || [];
  },

  // Crear producto usando 'sku' en lugar de 'barcode'
  async createProduct(name: string, description: string, sku: string, stock: number, spaceId: number, categoryId: number) {
    const { data, error } = await supabase
      .from("products")
      .insert([{ 
        name, 
        description, 
        sku, // 👈 Alineado a la base de datos
        stock, 
        space_id: spaceId, 
        category_id: categoryId,
        is_active: true // Forzamos a que inicie activo
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Modificar los atributos de un producto
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

  // Borrado Lógico (Desactivación)
  async deleteProductLogically(id: number) {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: false }) // 👈 Cambia el estado a false
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};