// src/pages/api/inventory/categories.ts
import type { APIRoute } from "astro";
import { CategoriesService } from "../../../services/categories.service";

// AUXILIAR: Traducción de errores comunes de Postgres a mensajes legibles
function getFriendlyErrorMessage(error: any): string {
  const msg = error.message || "";
  if (msg.includes("duplicate key") || msg.includes("unique constraint") || error.code === "23505") {
    return "Ya existe una categoría registrada con este nombre.";
  }
  if (msg.includes("foreign key") || error.code === "23503") {
    return "No se puede eliminar la categoría porque tiene productos asignados a ella.";
  }
  return msg || "Ocurrió un error inesperado al procesar la categoría.";
}

// CREAR CATEGORÍA
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim() || "";

    if (!name) {
      return new Response(
        JSON.stringify({ message: "El nombre de la categoría es obligatorio." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await CategoriesService.createCategory(name, description);
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en POST category:", error);
    return new Response(
      JSON.stringify({ message: getFriendlyErrorMessage(error) }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
};

// EDITAR CATEGORÍA
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id || !name) {
      return new Response(
        JSON.stringify({ message: "El ID y el nombre son campos obligatorios." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await CategoriesService.updateCategory(Number(id), name.trim(), description?.trim() || "");
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en PUT category:", error);
    return new Response(
      JSON.stringify({ message: getFriendlyErrorMessage(error) }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
};

// ELIMINAR CATEGORÍA
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({ message: "El ID de la categoría es requerido." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await CategoriesService.deleteCategory(Number(id));
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error en DELETE category:", error);
    return new Response(
      JSON.stringify({ message: getFriendlyErrorMessage(error) }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
};