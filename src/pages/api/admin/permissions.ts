// src/pages/api/admin/permissions.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const userId = formData.get("user_id")?.toString();
  const zoneIdStr = formData.get("zone_id")?.toString();
  const action = formData.get("action")?.toString();

  if (!userId || !zoneIdStr || !action) {
    return new Response("Faltan parámetros obligatorios en la petición.", { status: 400 });
  }

  const zoneId = Number(zoneIdStr);

  try {
    if (action === "assign") {
      // ⬇️ CORREGIDO AQUÍ: user_zone_permissions (singular)
      const { data: existing } = await supabase
        .from("user_zone_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("zone_id", zoneId)
        .maybeSingle();

      if (!existing) {
        // ⬇️ CORREGIDO AQUÍ: user_zone_permissions (singular)
        const { error: insertError } = await supabase
          .from("user_zone_permissions")
          .insert([{ user_id: userId, zone_id: zoneId }]);

        if (insertError) throw insertError;
      }
    } 
    
    else if (action === "revoke") {
      // ⬇️ CORREGIDO AQUÍ: user_zone_permissions (singular)
      const { error: deleteError } = await supabase
        .from("user_zone_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("zone_id", zoneId);

      if (deleteError) throw deleteError;
    }

    return redirect("/dashboard?toast=success_permissions");

  } catch (error: any) {
    console.error("Error modificando permisos de zona:", error.message);
    return new Response(`Error interno del servidor: ${error.message}`, { status: 500 });
  }
};