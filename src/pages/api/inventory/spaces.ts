import type { APIRoute } from "astro";
import { LocationsService } from "../../../services/locations.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const zoneId = Number(formData.get("zone_id"));
  const type = formData.get("type")?.toString() || "Aula";

  if (!name || !zoneId) {
    return new Response("Datos incompletos", { status: 400 });
  }

  try {
    await LocationsService.createSpace(name, zoneId, type);
    // Intentamos recuperar el campus de la URL de origen o redirigimos al dashboard limpio
    const referer = request.headers.get("referer") || "/dashboard";
    return redirect(referer);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};