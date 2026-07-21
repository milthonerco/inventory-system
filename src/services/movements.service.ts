// src/services/movements.service.ts
import { supabase } from "../lib/supabase";

export interface StockMovement {
  id: number;
  type: 'input' | 'output' | 'adjustment';
  quantity: number;
  reason: string;
  created_at: string;
  product_name: string;
  user_email: string;
  space_id?: number | null;
  space_name: string;
  zone_id?: number | null;
  zone_name: string;
  campus_id?: number | null;
  campus_name: string;
}

export const MovementsService = {
  
  // 1. Carga optimizada de la bitácora global (JOIN directo con profiles)
  async getAllMovementsForAdmin(): Promise<StockMovement[]> {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          type,
          quantity,
          reason,
          created_at,
          products ( id, name, sku ),
          profiles ( email ),
          physical_spaces (
            id,
            name,
            zones (
              id,
              name,
              campuses (
                id,
                name
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((mov: any) => {
        const space = mov.physical_spaces;
        const zone = Array.isArray(space?.zones) ? space.zones[0] : space?.zones;
        const campus = Array.isArray(zone?.campuses) ? zone.campuses[0] : zone?.campuses;
        const productData = Array.isArray(mov.products) ? mov.products[0] : mov.products;
        const profileData = Array.isArray(mov.profiles) ? mov.profiles[0] : mov.profiles;

        return {
          id: mov.id,
          product_name: productData?.name || "Producto Eliminado",
          type: mov.type,
          quantity: mov.quantity,
          reason: mov.reason,
          created_at: mov.created_at,
          space_id: space?.id || null,
          space_name: space?.name || "N/A",
          zone_id: zone?.id || null,
          zone_name: zone?.name || "N/A",
          campus_id: campus?.id || null,
          campus_name: campus?.name || "N/A",
          user_email: profileData?.email || "Sistema / Externo"
        };
      });
    } catch (error: any) {
      console.error("Error al obtener bitácora de administrador:", error.message);
      throw new Error("No se pudo cargar el historial completo de movimientos.");
    }
  },

  // 2. Obtener historial por espacio físico (JOIN optimizado)
  async getMovementsBySpace(spaceId: number): Promise<Partial<StockMovement>[]> {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          type,
          quantity,
          reason,
          created_at,
          products ( id, name ),
          profiles ( email )
        `)
        .eq("physical_space_id", spaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((mov: any) => {
        const productData = Array.isArray(mov.products) ? mov.products[0] : mov.products;
        const profileData = Array.isArray(mov.profiles) ? mov.profiles[0] : mov.profiles;

        return {
          id: mov.id,
          product_name: productData?.name || "Producto Eliminado",
          type: mov.type,
          quantity: mov.quantity,
          reason: mov.reason,
          created_at: mov.created_at,
          user_email: profileData?.email || "Sistema"
        };
      });
    } catch (error: any) {
      console.error("Error al obtener movimientos del espacio:", error.message);
      throw new Error("No se pudo cargar el historial de este espacio.");
    }
  },

  // 3. Registrar movimiento estándar
  async registerMovement(
    productId: number, 
    userId: string, 
    spaceId: number, 
    type: 'input' | 'output' | 'adjustment', 
    quantity: number, 
    reason?: string
  ) {
    const { data, error } = await supabase
      .from("stock_movements")
      .insert([{ 
        product_id: productId, 
        user_id: userId, 
        physical_space_id: spaceId, 
        type, 
        quantity, 
        reason: reason || "Movimiento de stock estándar" 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 4. Auditorías para creación / eliminación
  async logAuditableAction(
    productId: number,
    userId: string,
    spaceId: number, 
    type: 'create' | 'delete',
    quantity: number,
    reason: string
  ) {
    const dbType: 'input' | 'output' = type === 'create' ? 'input' : 'output';
    const formattedReason = type === 'create' 
      ? `[CREACIÓN] ${reason}` 
      : `[ELIMINACIÓN] ${reason}`;

    const { data, error } = await supabase
      .from("stock_movements")
      .insert([{
        product_id: productId,
        user_id: userId,
        physical_space_id: spaceId, 
        type: dbType, 
        quantity,
        reason: formattedReason
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};