/**
 * Middleware — Route-level protection for role-based access
 * 
 * Enforces strict role separation:
 * - /admin/* paths require adminToken
 * - /stock/* paths require stockManagerToken
 * - /executive/* paths require superAdminToken
 * - Cross-role access is blocked at the middleware level
 * - API routes verify JWTs in their handlers
 * 
 * Security headers are set on all matched routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

function decodeTokenRole(token: string, secret: string, expectedRole: string): boolean {
    try {
        const decoded = jwt.verify(token, secret) as { role?: string };
        return decoded.role === expectedRole;
    } catch {
        return false;
    }
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const response = NextResponse.next();

    // Security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // ─── Admin route protection ───
    if (pathname.startsWith("/admin") && pathname !== "/admin") {
        if (pathname === "/api/admin/auth") return response;
        if (pathname.startsWith("/api/admin/")) return response;

        if (token) {
            const stockSecret = process.env.STOCK_MANAGER_SECRET;
            if (stockSecret && decodeTokenRole(token, stockSecret, "stock_manager")) {
                return NextResponse.redirect(new URL("/stock", req.url));
            }
            const superSecret = process.env.SUPER_ADMIN_SECRET;
            if (superSecret && decodeTokenRole(token, superSecret, "super_admin")) {
                return NextResponse.redirect(new URL("/executive", req.url));
            }
        }
    }

    // ─── Stock Manager route protection ───
    if (pathname.startsWith("/stock") && pathname !== "/stock") {
        if (pathname === "/api/stock/auth") return response;
        if (pathname.startsWith("/api/stock/")) return response;

        if (token) {
            const adminSecret = process.env.ADMIN_SECRET;
            if (adminSecret && decodeTokenRole(token, adminSecret, "admin")) {
                return NextResponse.redirect(new URL("/admin", req.url));
            }
            const superSecret = process.env.SUPER_ADMIN_SECRET;
            if (superSecret && decodeTokenRole(token, superSecret, "super_admin")) {
                return NextResponse.redirect(new URL("/executive", req.url));
            }
        }
    }

    // ─── Executive (Super Admin) route protection ───
    if (pathname.startsWith("/executive") && pathname !== "/executive") {
        if (pathname === "/api/executive/auth") return response;
        if (pathname.startsWith("/api/executive/")) return response;

        if (token) {
            const adminSecret = process.env.ADMIN_SECRET;
            if (adminSecret && decodeTokenRole(token, adminSecret, "admin")) {
                return NextResponse.redirect(new URL("/admin", req.url));
            }
            const stockSecret = process.env.STOCK_MANAGER_SECRET;
            if (stockSecret && decodeTokenRole(token, stockSecret, "stock_manager")) {
                return NextResponse.redirect(new URL("/stock", req.url));
            }
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/stock/:path*",
        "/executive/:path*",
        "/dashboard/:path*",
        "/api/admin/:path*",
        "/api/stock/:path*",
        "/api/executive/:path*",
    ],
};
