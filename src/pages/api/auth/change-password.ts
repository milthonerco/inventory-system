// src/pages/api/auth/change-password.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();

    if (!password) {
      return new Response(JSON.stringify({ message: "La contraseña es obligatoria." }), { status: 400 });
    }

    // 1. Obtener los tokens actuales del usuario desde las cookies
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ message: "Sesión no válida o expirada." }), { status: 401 });
    }

    // 2. Establecer la sesión en el cliente de Supabase del servidor
    const { data: { user }, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !user) {
      return new Response(JSON.stringify({ message: "No se pudo validar la sesión actual." }), { status: 401 });
    }

    // 3. Actualizar la contraseña del usuario en Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      return new Response(JSON.stringify({ message: updateError.message }), { status: 400 });
    }

    // 4. Actualizar el estado 'must_change_password' a false en el perfil
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (profileError) {
      return new Response(JSON.stringify({ message: "Contraseña cambiada, pero falló actualizar el perfil." }), { status: 500 });
    }

    // 5. Cerrar sesión y limpiar las cookies para forzar un re-login limpio
    await supabase.auth.signOut();
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });

    return new Response(JSON.stringify({ message: "Contraseña actualizada correctamente." }), { status: 200 });

  } catch (error: any) {
    console.error("Error en change-password API:", error);
    return new Response(JSON.stringify({ message: "Error interno del servidor." }), { status: 500 });
  }
};