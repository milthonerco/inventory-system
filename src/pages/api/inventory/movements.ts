// src/pages/api/inventory/movements.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { MovementsService } from "../../../services/movements.service";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { user } = locals;
    if (!user) {
      return new Response(JSON.stringify({ message: "No autorizado" }), { status: 401 });
    }

    const body = await request.json();
    const { productId, spaceId, type, quantity, reason } = body;

    if (!productId || !spaceId || !type || !quantity) {
      return new Response(JSON.stringify({ message: "Faltan campos obligatorios" }), { status: 400 });
    }

    // 1. Obtener la cantidad actual en inventario para aplicar el cambio
    const { data: product, error: findError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", productId)
      .single();

    if (findError || !product) {
      return new Response(JSON.stringify({ message: "Producto no encontrado" }), { status: 404 });
    }

    // 2. Calcular el nuevo stock
    let newStock = product.stock;
    if (type === "input") {
      newStock += Number(quantity);
    } else if (type === "output") {
      if (product.stock < quantity) {
        return new Response(JSON.stringify({ message: "Stock insuficiente para realizar la salida" }), { status: 400 });
      }
      newStock -= Number(quantity);
    } else if (type === "adjustment") {
      newStock = Number(quantity);
    }

    // 3. Actualizar el stock del producto
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);

    if (updateError) throw updateError;

    // 4. Registrar el movimiento de stock en la bitácora
    await MovementsService.registerMovement(
      Number(productId),
      user.id,
      Number(spaceId),
      type,
      Number(quantity),
      reason
    );

    return new Response(JSON.stringify({ message: "Movimiento registrado con éxito", newStock }), { status: 200 });

  } catch (error: any) {
    console.error("Error en API de movimientos:", error);
    return new Response(JSON.stringify({ message: error.message || "Error interno del servidor" }), { status: 500 });
  }
};