/**
 * /api/executive/auth — Super Admin Login
 * POST — Validates username/password, returns signed JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { signSuperAdminToken } from "@/lib/super-admin-auth";

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();

        const validUsername = process.env.SUPER_ADMIN_USERNAME;
        const validPassword = process.env.SUPER_ADMIN_PASSWORD;

        if (!validUsername || !validPassword) {
            console.error("[ExecutiveAuth] SUPER_ADMIN credentials not configured");
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (username !== validUsername || password !== validPassword) {
            return NextResponse.json(
                { success: false, error: "Invalid credentials" },
                { status: 401 }
            );
        }

        const token = signSuperAdminToken(username);

        return NextResponse.json({
            success: true,
            token,
            message: "Super Admin authenticated",
        });
    } catch (err) {
        console.error("[ExecutiveAuth] Login error:", err);
        return NextResponse.json(
            { success: false, error: "Authentication failed" },
            { status: 500 }
        );
    }
}
