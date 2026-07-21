import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase'; // Ajusta según la ruta de tu cliente Supabase

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response('ID de producto requerido', { status: 400 });
  }

  // Consulta con JOINs profundos de Supabase para obtener la jerarquía completa
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      stock,
      categories ( name ),
      spaces (
        name,
        zones (
          name,
          campuses ( name )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !product) {
    return new Response('Producto no encontrado', { status: 404 });
  }

  return new Response(JSON.stringify(product), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};