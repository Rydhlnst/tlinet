import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { isAiConfigured, streamChatTurn } from "@/lib/ai/chat";
import type { ApiMessage } from "@/lib/ai/chat-types";

export const dynamic = "force-dynamic";

/** Status ringan untuk panel: apakah AI sudah dikonfigurasi (kunci MiMo terpasang). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  return NextResponse.json({ configured: isAiConfigured() });
}

/**
 * Satu giliran percakapan asisten AI, DIALIRKAN sebagai SSE. Hanya untuk admin yang masuk. Tool penulis tidak dijalankan
 * di sini (perlu konfirmasi lewat /confirm). Header `X-Accel-Buffering: no` mencegah nginx menahan aliran.
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? (body.messages as ApiMessage[]).slice(-40) : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamChatTurn(messages, admin)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Kesalahan tak terduga." })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
