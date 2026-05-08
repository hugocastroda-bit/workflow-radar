import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  return Response.json(
    { error: "Esta función ya no está disponible." },
    { status: 410 }
  );
});