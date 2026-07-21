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

  async createCampus(name: string, address?: string, responsible?: string) {
    const { data, error } = await supabase
      .from("campuses")
      .insert([{ name, address, responsible }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 👈 AHORA RECIBE 'responsible'
  async updateCampus(id: number, name: string, address?: string, responsible_name?: string) {
    const { data, error } = await supabase
      .from("campuses")
      .update({ name, address, responsible_name })
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

  async createZone(name: string, campusId: number, description?: string, responsible?: string) {
    const { data, error } = await supabase
      .from("zones")
      .insert([{ name, campus_id: campusId, description, responsible }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 👈 AHORA RECIBE 'responsible'
  async updateZone(id: number, name: string, description?: string, responsible_name?: string) {
    const { data, error } = await supabase
      .from("zones")
      .update({ name, description, responsible_name })
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

  async createSpace(name: string, zoneId: number, type: string, responsible?: string) {
    const { data, error } = await supabase
      .from("physical_spaces")
      .insert([{ name, zone_id: zoneId, type, responsible }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 👈 AHORA RECIBE 'responsible'
 async updateSpace(id: number, name: string, type?: string, responsible_name?: string | null) {
  const { data, error } = await supabase
    .from("physical_spaces")
    .update({ 
      name, 
      type, 
      responsible_name 
    })
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