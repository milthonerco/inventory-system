// src/services/movements.service.ts
import { supabase } from "../lib/supabase";

export const MovementsService = {
  
  // 1. Obtener TODO el historial con relaciones para el SUPER ADMIN (incluye mapeo de campus, zona y espacio)
  async getAllMovementsForAdmin(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          type,
          quantity,
          reason,
          created_at,
          user_id,
          products ( id, name, sku ),
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

      // Traer perfiles para acoplar los correos/usuarios que hicieron los cambios
      const { data: profiles } = await supabase.from("profiles").select("id, email, role");
      const profilesMap = profiles || [];

      return (data || []).map(mov => {
        const space = mov.physical_spaces as any;
        const zone = Array.isArray(space?.zones) ? space.zones[0] : space?.zones;
        const campus = Array.isArray(zone?.campuses) ? zone.campuses[0] : zone?.campuses;

        // Corrección de Tipado para productos que vienen como Array u Objeto único
        const productData: any = Array.isArray(mov.products) ? mov.products[0] : mov.products;

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
          user_email: profilesMap.find(p => p.id === mov.user_id)?.email || "Sistema/Desconocido"
        };
      });
    } catch (error: any) {
      console.error("Error al obtener bitácora de administrador:", error.message);
      throw new Error("No se pudo cargar el historial completo de movimientos.");
    }
  },

  // 2. Obtener historial filtrado por un espacio físico específico (Para el Operario / Vista de Espacio)
  async getMovementsBySpace(spaceId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("stock_movements") // 👈 Corregido el nombre de la tabla
        .select(`
          id,
          type,
          quantity,
          reason,
          created_at,
          user_id,
          products ( id, name )
        `)
        .eq("physical_space_id", spaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("id, email");
      const profilesMap = profiles || [];

      return (data || []).map(mov => {
        // Corrección de Tipado para productos que vienen como Array u Objeto único
        const productData: any = Array.isArray(mov.products) ? mov.products[0] : mov.products;

        return {
          id: mov.id,
          product_name: productData?.name || "Producto Eliminado",
          type: mov.type,
          quantity: mov.quantity,
          reason: mov.reason,
          created_at: mov.created_at,
          user_email: profilesMap.find(p => p.id === mov.user_id)?.email || "Sistema"
        };
      });
    } catch (error: any) {
      console.error("Error al obtener movimientos del espacio:", error.message);
      throw new Error("No se pudo cargar el historial de este espacio.");
    }
  },

  // 3. Registrar movimientos comunes (Entradas, salidas, ajustes de stock)
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
      .select();

    if (error) throw error;
    return data;
  },

  // 4. Registrar acciones de auditoría especiales (Creaciones o Eliminaciones directas de producto)
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
      .select();

    if (error) {
      console.error(`Error al registrar auditoría [${type}]:`, error.message);
      throw error;
    }
    return data;
  }
};