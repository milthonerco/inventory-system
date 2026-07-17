import { supabase } from "../lib/supabase";
import { supabaseAdmin } from "../lib/supabaseadmin";

export const AdminService = {
  // OBTENER TODOS LOS OPERARIOS ACTIVOS
  async getAllOperators() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "operario")
        .eq("is_active", true) // Filtramos para traer solo los activos
        .order("full_name", { ascending: true }); // <-- CORREGIDO: Usamos 'full_name' para ordenar

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error en getAllOperators:", error);
      return [];
    }
  },

  // ELIMINAR OPERARIO (BORRADO LÓGICO)
  async deleteOperator(id: string) {
    try {
      // 1. Desactivamos el perfil en nuestra tabla de base de datos
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: false })
        .eq("id", id);

      if (profileError) throw profileError;

      // 2. Deshabilitamos al usuario en Supabase Auth usando el Admin SDK
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { ban_duration: "87660h" } // Baneo por 10 años
      );

      if (authError) throw authError;

      // 3. Opcional: Si quieres quitarle los accesos de zonas inmediatamente al suspenderlo
      await supabaseAdmin.from("operator_zones").delete().eq("user_id", id);

      return true;
    } catch (error) {
      console.error("Error en deleteOperator (Borrado Lógico):", error);
      throw error;
    }
  },

  
  // CREAR NUEVO OPERARIO con contraseña temporal obligatoria
  async createOperator(operatorData: { email: string; password?: string; name: string; zoneIds?: number[] }) {
    // Si el admin no define contraseña, usamos una genérica por defecto
    const password = operatorData.password || "Temp12345*";

    // 1. Crear el usuario directamente en el módulo Auth de Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: operatorData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: operatorData.name,
        role: "operario"
      }
    });

    if (authError) {
      console.error("Error al crear credenciales de Auth:", authError);
      throw authError;
    }

    const newUser = authData.user;
    if (!newUser) {
      throw new Error("No se pudo obtener la información del usuario creado.");
    }

    try {
      // 2. Insertar los detalles directamente en la tabla personalizada 'profiles'
      // Guardamos 'must_change_password: true' para obligar el cambio en el primer login
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert([
          {
            id: newUser.id,
            email: operatorData.email,
            full_name: operatorData.name,
            role: "operario",
            must_change_password: true // <-- CLAVE: Forzará la redirección en el primer inicio de sesión
          }
        ]);

      if (profileError) {
        throw profileError;
      }

      // 3. Guardar zonas asignadas si existen
      if (operatorData.zoneIds && operatorData.zoneIds.length > 0) {
        const relations = operatorData.zoneIds.map(zoneId => ({
          user_id: newUser.id,
          zone_id: zoneId
        }));
        
        const { error: relError } = await supabaseAdmin
          .from("operator_zones")
          .insert(relations);

        if (relError) throw relError;
      }

      return newUser;

    } catch (error: any) {
      console.error("Fallo al sincronizar perfiles. Revirtiendo creación de usuario en Auth...", error);
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      throw error;
    }
  },

  // ACTUALIZAR OPERARIO
  async updateOperator(id: string, name: string, email: string) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: name, email }) // <-- CORREGIDO: Apunta a 'full_name' en la base de datos
      .eq("id", id);

    if (error) throw error;
    return data;
  },
  // RESTABLECER CONTRASEÑA DESDE EL PANEL DE ADMINISTRACIÓN
  async resetOperatorPassword(id: string, tempPassword: string) {
    try {
      // 1. Forzamos la actualización de la contraseña en Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password: tempPassword }
      );

      if (authError) throw authError;

      // 2. Activamos el flag para obligarlo a cambiarla al entrar
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", id);

      if (profileError) throw profileError;

      return true;
    } catch (error) {
      console.error("Error al restablecer contraseña:", error);
      throw error;
    }
  },
  // OBTENER TODOS LOS OPERARIOS INACTIVOS (DESHABILITADOS)
  async getInactiveOperators() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "operario")
        .eq("is_active", false) // Filtramos para traer solo los inactivos
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error en getInactiveOperators:", error);
      return [];
    }
  },

  // REACTIVAR OPERARIO (HABILITACIÓN LÓGICA)
  async reactivateOperator(id: string) {
    try {
      // 1. Activamos de nuevo el perfil en la tabla de la base de datos
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: true })
        .eq("id", id);

      if (profileError) throw profileError;

      // 2. Quitamos el baneo definitivamente enviando "none"
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { ban_duration: "none" } // 👈 "none" es la instrucción oficial de GoTrue/Supabase para limpiar el baneo
      );

      if (authError) throw authError;

      // 3. Opcional pero altamente recomendado: Invalidar cualquier sesión activa/fantasma en Supabase
      await supabaseAdmin.auth.admin.signOut(id, "global");

      return true;
    } catch (error) {
      console.error("Error en reactivateOperator:", error);
      throw error;
    }
  },
};