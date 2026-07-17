import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase'; // Ajusta la ruta a tu cliente de Supabase si es necesario

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const productId = formData.get('product_id');
    const spaceId = formData.get('space_id');
    const type = formData.get('type'); // "entry" (que es el input)
    const quantityStr = formData.get('quantity');
    const concept = formData.get('concept');

    // Validaciones básicas
    if (!productId || !quantityStr || !concept) {
      return new Response('Faltan campos obligatorios en el formulario.', { status: 400 });
    }

    const quantity = parseInt(quantityStr.toString(), 10);
    if (isNaN(quantity) || quantity <= 0) {
      return new Response('La cantidad debe ser un número entero mayor a cero.', { status: 400 });
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

    // Calcular el nuevo stock (en este caso siempre es suma por ser entrada "entry")
    const newStock = product.stock + quantity;

    // 2. Actualizar el stock en la tabla de productos
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId);

    if (updateError) {
      console.error('Error al actualizar el stock:', updateError);
      return new Response('Error al actualizar el inventario.', { status: 500 });
    }

    // 3. Registrar el movimiento en la tabla de movimientos/historial
    // NOTA: Ajusta los nombres de las columnas/tablas según tu esquema exacto (ej. 'movements' o 'inventory_logs')
    const { error: logError } = await supabase
      .from('movements') 
      .insert([
        {
          product_id: productId,
          space_id: spaceId || null,
          type: 'input', // Lo guardamos como 'input' para mantener coherencia con tu base de datos
          quantity: quantity,
          concept: concept.toString(),
          created_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error('Error al guardar el movimiento en la bitácora:', logError);
      // No bloqueamos la experiencia del usuario si el stock ya se actualizó con éxito, pero lo registramos en consola
    }

    // Redireccionar de vuelta a la interfaz de administración (recarga la vista actual)
    const referer = request.headers.get('referer') || '/dashboard';
    return redirect(referer, 303);

  } catch (error) {
    console.error('Error del servidor en transaction API:', error);
    return new Response('Error interno del servidor.', { status: 500 });
  }
};