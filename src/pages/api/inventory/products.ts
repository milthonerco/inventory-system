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
    return new Response("No autorizado: Debes iniciar sesión para realizar esta acción.", { status: 401 });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response("Sesión inválida o expirada.", { status: 401 });
    }

    const userId = user.id;
    const newProduct = await ProductsService.createProduct(name, description, sku, stock, spaceId, categoryId);

    // Registra en el historial como 'create' (internamente se mapea a 'input' en tu BD)
    await MovementsService.logAuditableAction(
  newProduct.id,   // 1. productId
  userId,          // 2. userId
  newProduct.space_id, // 3. spaceId (¡Esto es lo que faltaba colocar aquí!)
  'create',        // 4. type
  stock,           // 5. quantity
  `Se registró el activo "${name}" en el inventario con un stock de apertura de ${stock} unidades.` // 6. reason
);

    return redirect(request.headers.get("referer") || "/dashboard");
  } catch (error: any) {
    console.error("Error crítico en creación de producto:", error.message);
    return new Response(error.message, { status: 500 });
  }
};

// 2. ACTUALIZAR PRODUCTO (PUT) 👈 ESTO ERA LO QUE TE HACÍA FALTA EXPORTAR
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

// 3. ELIMINAR PRODUCTO LÓGICAMENTE (DELETE) 👈 ESTO ERA LO QUE TE HACÍA FALTA EXPORTAR
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

    // Ejecuta el borrado lógico en la base de datos (is_active = false)
    const inactiveProduct = await ProductsService.deleteProductLogically(Number(id));

    // Registra la baja en la bitácora histórica como 'delete' (mapeado a 'output' para respetar el Enum)
    await MovementsService.logAuditableAction(
  inactiveProduct.id,   // 1. productId
  userId,               // 2. userId
  inactiveProduct.space_id, // 3. spaceId
  'delete',             // 4. type
  0,                    // 5. quantity (mandamos 0 porque se está eliminando, no sumando/restando stock)
  reason || 'Producto dado de baja del sistema.' // 6. reason (usa la variable 'reason' que viene del request.json())
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