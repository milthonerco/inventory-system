// src/services/categories.service.ts
import { supabase } from "../lib/supabase";

export const CategoriesService = {
  // Obtener todas las categorías
  async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      return [];
    }
  },

  // Crear una nueva categoría
  async createCategory(name: string, description: string) {
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name, description }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Modificar una categoría existente
  async updateCategory(id: number, name: string, description: string) {
    const { data, error } = await supabase
      .from("categories")
      .update({ name, description })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar una categoría
  async deleteCategory(id: number) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};