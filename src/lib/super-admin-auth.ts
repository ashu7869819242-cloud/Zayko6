/**
 * Super Admin authentication helpers.
 * 
 * SECURITY: Uses properly signed JWTs with SUPER_ADMIN_SECRET (8h expiry).
 * Mirrors stock-manager-auth.ts / admin-auth.ts pattern.
 */

import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface SuperAdminPayload {
    role: "super_admin";
    username: string;
}

export function signSuperAdminToken(username: string): string {
    const secret = process.env.SUPER_ADMIN_SECRET;
    if (!secret) throw new Error("SUPER_ADMIN_SECRET not configured");

    return jwt.sign(
        { role: "super_admin", username } as SuperAdminPayload,
        secret,
        { expiresIn: "8h" }
    );
}

export function verifySuperAdmin(req: NextRequest): SuperAdminPayload | null {
    const secret = process.env.SUPER_ADMIN_SECRET;
    if (!secret) return null;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, secret) as SuperAdminPayload;
        if (decoded.role !== "super_admin") return null;
        return decoded;
    } catch {
        return null;
    }
}
