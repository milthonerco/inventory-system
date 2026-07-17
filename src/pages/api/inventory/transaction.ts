// src/pages/api/inventory/transaction.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  try {
    const formData = await request.formData();
    const productId = formData.get('product_id');
    const spaceId = formData.get('space_id');
    const type = formData.get('type') || 'input'; // "input" u "output"
    const quantityStr = formData.get('quantity');
    const reason = formData.get('concept') || formData.get('reason'); // Captura el texto enviado del formulario

    if (!productId || !quantityStr || !reason) {
      return new Response('Faltan campos obligatorios en el formulario.', { status: 400 });
    }

    const quantity = parseInt(quantityStr.toString(), 10);
    if (isNaN(quantity) || quantity <= 0) {
      return new Response('La cantidad debe ser un número entero mayor a cero.', { status: 400 });
    }

    // ⚡ AUTENTICACIÓN: Saber qué usuario está guardando el cambio rápido
    const accessToken = cookies.get("sb-access-token")?.value;
    let userId = null;
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user) userId = user.id;
    }

    // 1. Obtener el stock actual del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response('No se encontró el producto especificado.', { status: 404 });
    }

    // Calcular el nuevo stock dependiendo del tipo de flujo (entrada o salida)
    const currentStock = product.stock;
    const newStock = (type === 'output') ? (currentStock - quantity) : (currentStock + quantity);

    if (newStock < 0) {
      return new Response('Error: La cantidad a retirar supera el stock actual disponible.', { status: 400 });
    }

    // 2. Actualizar el stock en la tabla de productos
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId);

    if (updateError) {
      console.error('Error al actualizar el stock:', updateError);
      return new Response('Error al actualizar el inventario.', { status: 500 });
    }

    // 3. Registrar el movimiento en la tabla correcta: stock_movements
    const { error: logError } = await supabase
      .from('stock_movements') // 👈 ¡TABLA CORREGIDA!
      .insert([
        {
          product_id: Number(productId),
          user_id: userId, // Guardamos la auditoría de quién lo hizo
          physical_space_id: spaceId ? Number(spaceId) : null, // Mapeado al ID del espacio
          type: type.toString(), 
          quantity: quantity,
          reason: reason.toString(), // Guardamos el texto de justificación
          created_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error('Error al guardar el movimiento en stock_movements:', logError);
    }

    const referer = request.headers.get('referer') || '/dashboard';
    return redirect(referer, 303);

  } catch (error) {
    console.error('Error del servidor en transaction API:', error);
    return new Response('Error interno del servidor.', { status: 500 });
  }
};