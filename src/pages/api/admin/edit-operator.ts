// src/pages/api/admin/edit-operator.ts
import type { APIRoute } from "astro";
import { AdminService } from "../../../services/admin.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const action = formData.get("action")?.toString(); // "update", "delete" o "reactivate"
    const userId = formData.get("edit_user_id")?.toString() || formData.get("reactivate_user_id")?.toString();
    const email = formData.get("edit_email")?.toString().trim();
    const name = formData.get("edit_full_name")?.toString().trim();
    const tempPassword = formData.get("edit_password")?.toString(); // 👈 Capturamos la contraseña opcional

    if (!userId) {
      return new Response("El ID del operario es obligatorio.", { status: 400 });
    }

    if (action === "delete") {
      await AdminService.deleteOperator(userId);
    } else if (action === "reactivate") {
      await AdminService.reactivateOperator(userId);
    } else if (action === "update") {
      if (!email || !name) {
        return new Response("El nombre y el correo son obligatorios para actualizar.", { status: 400 });
      }
      
      // 1. Actualizamos sus datos principales (nombre y correo)
      await AdminService.updateOperator(userId, name, email);

      // 2. Si se escribió una contraseña temporal, la restablecemos y forzamos cambio de clave
      if (tempPassword && tempPassword.trim().length >= 6) {
        await AdminService.resetOperatorPassword(userId, tempPassword);
      }
    } else {
      return new Response("Acción no válida.", { status: 400 });
    }

    return redirect("/dashboard");
  } catch (error: any) {
    console.error("Error en endpoint edit-operator:", error);
    return new Response(error.message || "Error interno del servidor", { status: 500 });
  }
};