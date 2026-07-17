// src/pages/api/inventory/products.ts
import type { APIRoute } from "astro";
import { ProductsService } from "../../../services/products.service";
import { MovementsService } from "../../../services/movements.service";
import { supabase } from "../../../lib/supabase";

// 1. CREAR PRODUCTO (POST)
export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() || "";
  const sku = formData.get("barcode")?.toString() || ""; 
  const stock = Number(formData.get("stock") || 0);
  const spaceId = Number(formData.get("space_id"));
  const categoryId = Number(formData.get("category_id"));

  if (!name || !spaceId || !categoryId) {
    return new Response("Campos obligatorios faltantes", { status: 400 });
  }

  const accessToken = cookies.get("sb-access-token")?.value;
  if (!accessToken) {
    return new Response("No autorizado: Debes iniciar sesión.", { status: 401 });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response("Sesión inválida o expirada.", { status: 401 });
    }

    const userId = user.id;
    const newProduct = await ProductsService.createProduct(name, description, sku, stock, spaceId, categoryId);

    // ⚡ REGISTRO EN LA BITÁCORA CORREGIDO: Enviando explícitamente el espacio físico asignado
    await MovementsService.logAuditableAction(
      newProduct.id,
      userId,
      spaceId, 
      'create', // 👈 ¡Cambiado a 'create' para solucionar el error de TypeScript!
      stock,
      `Se registró el activo "${name}" en el inventario con un stock de apertura de ${stock} unidades.`
    );

    return redirect(request.headers.get("referer") || "/dashboard");
  } catch (error: any) {
    console.error("Error crítico en creación de producto:", error.message);
    return new Response(error.message, { status: 500 });
  }
};

// 2. ACTUALIZAR PRODUCTO (PUT)
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, description, sku, categoryId } = body;

    if (!id || !name || !categoryId) {
      return new Response("Campos obligatorios faltantes", { status: 400 });
    }

    await ProductsService.updateProduct(Number(id), name, description, sku, Number(categoryId));
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error al actualizar producto:", error.message);
    return new Response(error.message, { status: 500 });
  }
};

// 3. ELIMINAR PRODUCTO LÓGICAMENTE (DELETE)
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const { id, reason } = await request.json();

    if (!id) {
      return new Response("ID del producto faltante.", { status: 400 });
    }

    const accessToken = cookies.get("sb-access-token")?.value;
    if (!accessToken) {
      return new Response("No autorizado.", { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response("Sesión inválida.", { status: 401 });
    }

    const userId = user.id;
    const inactiveProduct = await ProductsService.deleteProductLogically(Number(id));

    await MovementsService.logAuditableAction(
      inactiveProduct.id,
      userId,
      inactiveProduct.space_id,
      'delete', // 👈 ¡Cambiado a 'delete' para solucionar el error de TypeScript!
      0, 
      reason || 'Producto dado de baja del sistema.'
    );

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error al dar de baja el producto:", error.message);
    return new Response(error.message, { status: 500 });
  }
};