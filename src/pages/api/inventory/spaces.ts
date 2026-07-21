import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase'; // Ajusta la ruta a tu cliente

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  
  const zone_id = formData.get('zone_id');
  const name = formData.get('name');
  const type = formData.get('type');
  const responsible_name = formData.get('responsible_name'); // 👈 Capturar nuevo campo

  if (!zone_id || !name || !type) {
    return new Response('Campos requeridos faltantes', { status: 400 });
  }

  const { error } = await supabase
    .from('physical_spaces')
    .insert([
      {
        zone_id: parseInt(zone_id.toString(), 10),
        name: name.toString().trim(),
        type: type.toString().trim(),
        responsible_name: responsible_name ? responsible_name.toString().trim() : null // 👈 Insertar en DB
      }
    ]);

  if (error) {
    console.error('Error guardando el espacio físico:', error);
    return new Response(error.message, { status: 500 });
  }

  return redirect('/'); // Redirige a tu vista principal
};