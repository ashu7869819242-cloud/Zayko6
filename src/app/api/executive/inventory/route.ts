/**
 * /api/executive/inventory — Read-only inventory data for executive dashboard
 * GET — Returns inventory items list
 * Protected by Super Admin JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const admin = verifySuperAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const snap = await adminDb
            .collection("inventory_items")
            .where("isDeleted", "!=", true)
            .get();

        const items = snap.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || "Unknown",
            currentStock: doc.data().currentStock || 0,
            unit: doc.data().unit || "units",
            category: doc.data().category || "General",
            reorderLevel: doc.data().reorderLevel || 10,
        }));

        return NextResponse.json({ success: true, items });
    } catch (err) {
        console.error("[Executive/Inventory] Error:", err);
        return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
    }
}
