// src/pages/api/inventory/update-structure.ts
import type { APIRoute } from "astro";
import { LocationsService } from "../../../services/locations.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    
    const type = formData.get("type")?.toString();
    const idStr = formData.get("id")?.toString();
    const name = formData.get("name")?.toString();
    const meta = formData.get("meta")?.toString() || "";
    const responsible_name = formData.get("responsible")?.toString()?.trim() || undefined;

    if (!type || !idStr || !name) {
      return new Response("Campos requeridos faltantes", { status: 400 });
    }

    const id = parseInt(idStr, 10);

    if (type === "campus") {
      await LocationsService.updateCampus(id, name, meta, responsible_name);
    } else if (type === "zone") {
      await LocationsService.updateZone(id, name, meta, responsible_name);
    } else if (type === "space") {
      await LocationsService.updateSpace(id, name, meta, responsible_name);
    } else {
      return new Response("Tipo de estructura inválido", { status: 400 });
    }

    const referer = request.headers.get("referer") || "/";
    return redirect(referer);

  } catch (error: any) {
    console.error("Error al actualizar la estructura:", error);
    return new Response(`Error al actualizar: ${error.message}`, { status: 500 });
  }
};