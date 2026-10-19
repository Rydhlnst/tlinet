import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminApk } from "@/lib/admin-app";
import { getAdmin } from "@/lib/auth";

/** APK aplikasi TLINET Admin, khusus pengguna dashboard yang sudah masuk (owner maupun staf). */
export async function GET(request: Request) {
  if (!(await getAdmin())) return Response.redirect(new URL("/admin/login", request.url), 307);
  const file = await readFile(path.join(process.cwd(), adminApk.file));
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="TLINET-Admin-${adminApk.version}.apk"`,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
