// src/pages/api/auth/login.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: "El correo electrónico y la contraseña son obligatorios." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Intentar iniciar sesión en Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Control de errores comunes de autenticación
      let userFriendlyMessage = "Credenciales incorrectas. Verifica tu correo y contraseña.";
      
      if (error.message.toLowerCase().includes("banned")) {
        userFriendlyMessage = "Esta cuenta ha sido desactivada por el administrador.";
      } else if (error.message.toLowerCase().includes("invalid grant")) {
        userFriendlyMessage = "Correo o contraseña inválidos. Inténtalo de nuevo.";
      }

      return new Response(
        JSON.stringify({ message: userFriendlyMessage }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { user, session } = data;

    // 2. Validación de seguridad extra: Verificar si su perfil está marcado como inactivo (is_active) en la BD
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.is_active === false) {
      // Si el perfil está inactivo, cerramos de inmediato la sesión que se acaba de abrir en Auth
      await supabase.auth.signOut();

      return new Response(
        JSON.stringify({ message: "Tu usuario se encuentra deshabilitado. Comunícate con soporte." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Guardar los tokens en cookies seguras (HttpOnly) si todo está perfecto
    const { access_token, refresh_token } = session;

    cookies.set("sb-access-token", access_token, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "strict",
    });

    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "strict",
    });

    // Retornamos éxito en formato JSON para que el script cliente maneje la redirección
    return new Response(
      JSON.stringify({ success: true, redirectUrl: "/dashboard" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error en login endpoint:", error);
    return new Response(
      JSON.stringify({ message: "Ocurrió un error inesperado en el servidor." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};