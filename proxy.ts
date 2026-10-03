import { NextResponse, type NextRequest } from "next/server";

/**
 * Pemeriksaan cepat: tanpa cookie sesi, /admin langsung dialihkan ke halaman masuk.
 * Keabsahan sesi tetap diperiksa di server oleh `requireAdmin` dan setiap server action.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/admin/login" && !request.cookies.has("tl_admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
