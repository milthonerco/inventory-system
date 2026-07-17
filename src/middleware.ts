// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { supabase } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  
  // 1. Rutas públicas que no requieren autenticación
  if (
    url.pathname === "/" || 
    url.pathname.startsWith("/api/auth") ||
    url.pathname === "/force-change-password" // Permitimos entrar a la página de cambio de clave
  ) {
    return next();
  }

  // 2. Extraer los tokens de sesión de las cookies de la petición
  const accessToken = context.cookies.get("sb-access-token")?.value;
  const refreshToken = context.cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return context.redirect("/");
  }

  // 3. Validar los tokens con Supabase en el servidor
  const { data: { user }, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !user) {
    context.cookies.delete("sb-access-token", { path: "/" });
    context.cookies.delete("sb-refresh-token", { path: "/" });
    return context.redirect("/");
  }

  // 4. Buscar el rol, estado activo y flag de cambio de contraseña
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, must_change_password") // Añadimos 'must_change_password'
    .eq("id", user.id)
    .single();

  // Si el perfil no existe o está desactivado (Borrado Lógico)
  if (!profile || profile.is_active === false) {
    context.cookies.delete("sb-access-token", { path: "/" });
    context.cookies.delete("sb-refresh-token", { path: "/" });
    return context.redirect("/");
  }

  // INTERCEPCIÓN CLAVE: Si debe cambiar la contraseña, redirigir obligatoriamente
  if (profile.must_change_password === true) {
    return context.redirect("/force-change-password");
  }

  // Guardamos el usuario y su rol en las locales de Astro
  context.locals.user = user;
  context.locals.role = profile.role || "operario";

  // 5. Control de Acceso Basado en Roles (RBAC)
  if (url.pathname.startsWith("/admin") && context.locals.role !== "super_admin") {
    return context.redirect("/dashboard");
  }

  return next();
});