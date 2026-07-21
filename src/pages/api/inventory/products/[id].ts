import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase'; // Ajusta la ruta a tu cliente de Supabase

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ message: 'ID de producto requerido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Convertimos el ID a número ya que en tu DB es "integer"
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return new Response(JSON.stringify({ message: 'El ID debe ser un número válido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Consulta con los nombres reales de tus tablas: products -> physical_spaces -> zones -> campuses
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      stock,
      description,
      categories (
        id,
        name
      ),
      physical_spaces!products_space_id_fkey (
        id,
        name,
        type,
        responsible_name,
        zones!physical_spaces_zone_id_fkey (
          id,
          name,
          campuses!zones_campus_id_fkey (
            id,
            name
          )
        )
      )
    `)
    .eq('id', numericId)
    .single();

  if (error || !product) {
    console.error("Error Supabase Query:", error);
    return new Response(JSON.stringify({ message: 'Producto no encontrado' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(product), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};