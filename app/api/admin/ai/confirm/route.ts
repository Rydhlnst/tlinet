import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getTool, runTool } from "@/lib/ai/registry";

export const dynamic = "force-dynamic";

/**
 * Menjalankan SUNGGUHAN satu tool penulis setelah pengguna menekan Konfirmasi di panel. Ini satu-satunya jalur yang
 * memakai `commit: true`, dan hanya untuk tool penulis (bukan hanya-baca). Hanya untuk admin yang masuk.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  let body: { tool?: unknown; args?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const tool = getTool(String(body.tool ?? ""));
  if (!tool) return NextResponse.json({ error: "Tool tidak dikenal." }, { status: 400 });
  if (tool.readOnly) return NextResponse.json({ error: "Tool ini tidak memerlukan konfirmasi." }, { status: 400 });
  const args = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? (body.args as Record<string, unknown>) : {};
  const result = await runTool(tool.name, args, { admin, commit: true });
  return NextResponse.json(result);
}
