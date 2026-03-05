/**
 * /api/stock/inventory/analytics — Inventory analytics for Stock Manager
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import { getInventoryAnalytics } from "@/services/inventoryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const analytics = await getInventoryAnalytics();
        return NextResponse.json({ success: true, analytics });
    } catch (err) {
        console.error("[Stock/Inventory] analytics error:", err);
        return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
    }
}
