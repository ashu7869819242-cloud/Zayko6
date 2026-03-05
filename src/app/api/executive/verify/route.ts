/**
 * /api/executive/verify — Verify Super Admin JWT
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(req: NextRequest) {
    const admin = verifySuperAdmin(req);
    if (!admin) {
        return NextResponse.json({ valid: false }, { status: 401 });
    }
    return NextResponse.json({ valid: true, username: admin.username });
}
