import type { APIRoute } from "astro";
import { LocationsService } from "../../../services/locations.service";

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const campusId = Number(formData.get("campus_id"));
  const description = formData.get("description")?.toString() || "";

  if (!name || !campusId) {
    return new Response("Datos incompletos", { status: 400 });
  }

  try {
    await LocationsService.createZone(name, campusId, description);
    return redirect(`/dashboard?campus=${campusId}`);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};