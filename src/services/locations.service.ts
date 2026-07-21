// src/services/locations.service.ts
import { supabase } from "../lib/supabase";

export const LocationsService = {
  // --- CAMPUSES ---
  async getCampuses(userId: string, role: string) {
    try {
      const { data, error } = await supabase
        .from("campuses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error en getCampuses:", error);
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
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCampus(id: number) {
    const { error } = await supabase.from("campuses").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // --- ZONES ---
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

      // Consulta relacional directa para operarios
      const { data, error } = await supabase
        .from("user_zone_permissions")
        .select("zone_id, zones!inner(*)")
        .eq("user_id", userId)
        .eq("zones.campus_id", campusId);

      if (error) throw error;
      return data ? data.map((p: any) => p.zones) : [];

    } catch (error) {
      console.error("Error obteniendo zonas por permisos:", error);
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
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteZone(id: number) {
    const { error } = await supabase.from("zones").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // --- PHYSICAL SPACES ---
  async getSpacesByZone(zoneId: number) {
    try {
      const { data, error } = await supabase
        .from("physical_spaces")
        .select("*")
        .eq("zone_id", zoneId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error en getSpacesByZone:", err);
      return [];
    }
  },

  async createSpace(name: string, zoneId: number, type: string) {
    const { data, error } = await supabase
      .from("physical_spaces")
      .insert([{ name, zone_id: zoneId, type }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSpace(id: number, name: string, type: string) {
    const { data, error } = await supabase
      .from("physical_spaces")
      .update({ name, type })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSpace(id: number) {
    const { error } = await supabase.from("physical_spaces").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};