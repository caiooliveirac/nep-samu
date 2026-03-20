import { auth } from "@/server/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth as { user?: { role: string } } | null;

  // pathname includes basePath in Next.js 16 (e.g. "/NEP/painel")
  const basePath = "/NEP";
  const path = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname;

  // Public paths (check against stripped path)
  const publicPaths = ["/login", "/convite", "/api/auth", "/api/health"];
  if (publicPaths.some((p) => path.startsWith(p))) return NextResponse.next();

  // Not authenticated -> redirect to /NEP/login
  if (!session?.user) {
    const loginUrl = new URL(`${basePath}/login`, req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
