import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

/** Serves the repo's OpenAPI 3.1 document to signed-in users. */
export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const spec = await readFile(
    path.join(process.cwd(), "openapi.yaml"),
    "utf8"
  );
  return new Response(spec, {
    headers: { "Content-Type": "application/yaml; charset=utf-8" },
  });
}
