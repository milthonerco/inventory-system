/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    user: import("@supabase/supabase-js").User | null;
    role: "super_admin" | "operario" | null;
  }
}
declare module 'qrcode';