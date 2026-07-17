import type { APIRoute } from "astro";
import { LocationsService } from "../../../services/locations.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const address = formData.get("address")?.toString() || "";

  if (!name) {
    return new Response("El nombre es requerido", { status: 400 });
  }

  try {
    await LocationsService.createCampus(name, address);
    return redirect("/dashboard"); // Redirecciona para refrescar los datos
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};