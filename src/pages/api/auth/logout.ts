// src/pages/api/auth/signout.ts
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // 1. Eliminamos las cookies de acceso y refresco que conectan con Supabase
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });

  // 2. Redirigimos al usuario a la pantalla de inicio de sesión (Login)
  return redirect("/login"); 
};