import type { APIRoute } from "astro";
import { AdminService } from "../../../services/admin.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const name = formData.get("full_name")?.toString().trim();
    const zoneIds = formData.getAll("zone_ids").map(Number);

    if (!email || !password || !name) {
      return new Response("El correo, la contraseña y el nombre son obligatorios.", { status: 400 });
    }

    // Ejecutamos el flujo controlado desde nuestra app
    await AdminService.createOperator({ email, password, name, zoneIds });

    return redirect("/dashboard");
  } catch (error: any) {
    console.error("Error crítico en endpoint al crear operario:", error);
    return new Response(error.message || "Error interno del servidor", { status: 500 });
  }
};