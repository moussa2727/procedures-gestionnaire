// proxy.ts (à la racine du projet)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes publiques (accessibles sans authentification)
const PUBLIC_PATHS = [
  "/",
  "/services",
  "/contact",
  "/conditions",
  "/politique",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/callback",
];

// Routes protégées (nécessitent une authentification)
const PROTECTED_PATHS = [
  "/admin",
  "/consultant",
  "/etudiant",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token");

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Si route publique → laisser passer (même sans token)
  if (isPublic) {
    return NextResponse.next();
  }

  // Si route protégée et pas de token → rediriger vers login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si route protégée et token présent → laisser passer (le layout vérifiera le rôle)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};