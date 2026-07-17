// src/services/locations.service.ts
import { supabase } from "../lib/supabase";

export const LocationsService = {
  // --- CAMPUSES (SEDES) ---
  async getCampuses(userId: string, role: string) {
    try {
      const { data, error } = await supabase
        .from("campuses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error crítico en getCampuses:", error);
      return [];
    }
  },

  async createCampus(name: string, address?: string) {
    const { data, error } = await supabase
      .from("campuses")
      .insert([{ name, address }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCampus(id: number, name: string, address?: string) {
    const { data, error } = await supabase
      .from("campuses")
      .update({ name, address })
      .eq("id", id);
    if (error) throw error;
    return data;
  },

  async deleteCampus(id: number) {
    const { error } = await supabase.from("campuses").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // --- ZONES (ZONAS) ---
  async getZonesByCampus(campusId: number, userId: string, role: string) {
    try {
      if (role === 'super_admin') {
        const { data, error } = await supabase
          .from("zones")
          .select("*")
          .eq("campus_id", campusId)
          .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // ⬇️ CORREGIDO AQUÍ: user_zone_permissions (singular)
      const { data: allowedPermissions, error: permError } = await supabase
        .from("user_zone_permissions")
        .select("zone_id")
        .eq("user_id", userId);

      if (permError) throw permError;

      if (!allowedPermissions || allowedPermissions.length === 0) {
        return [];
      }

      const allowedZoneIds = allowedPermissions.map(p => p.zone_id);

      const { data: dataZones, error: zonesError } = await supabase
        .from("zones")
        .select("*")
        .eq("campus_id", campusId)
        .in("id", allowedZoneIds)
        .order("name", { ascending: true });

      if (zonesError) throw zonesError;
      return dataZones || [];

    } catch (error) {
      console.error("Error filtrando zones por permisos de usuario:", error);
      return [];
    }
  },

  async createZone(name: string, campusId: number, description?: string) {
    const { data, error } = await supabase
      .from("zones")
      .insert([{ name, campus_id: campusId, description }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateZone(id: number, name: string, description?: string) {
    const { data, error } = await supabase
      .from("zones")
      .update({ name, description })
      .eq("id", id);
    if (error) throw error;
    return data;
  },

  async deleteZone(id: number) {
    const { error } = await supabase.from("zones").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // --- PHYSICAL SPACES (LUGARES FÍSICOS - CORREGIDO) ---
  async getSpacesByZone(zoneId: number) {
    try {
      const { data, error } = await supabase
        .from("physical_spaces") // 👈 ¡Corregido al nombre real de tu tabla!
        .select("*")
        .eq("zone_id", zoneId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error spaces:", error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error("Error inesperado en getSpacesByZone:", err);
      return [];
    }
  },

  async createSpace(name: string, zoneId: number, type: string) {
    const { data, error } = await supabase
      .from("physical_spaces") // 👈 Corregido
      .insert([{ name, zone_id: zoneId, type }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSpace(id: number, name: string, type: string) {
    const { data, error } = await supabase
      .from("physical_spaces") // 👈 Corregido
      .update({ name, type })
      .eq("id", id);
    if (error) throw error;
    return data;
  },

  async deleteSpace(id: number) {
    const { error } = await supabase.from("physical_spaces").delete().eq("id", id); // 👈 Corregido
    if (error) throw error;
    return true;
  }
};