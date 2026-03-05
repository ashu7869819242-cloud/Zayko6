/**
 * /api/stock/inventory/logs — Stock logs for Stock Manager
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import { getStockLogs } from "@/services/inventoryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const itemId = searchParams.get("itemId") || undefined;
        const type = searchParams.get("type") as any || undefined;
        const limit = Number(searchParams.get("limit")) || 50;

        const logs = await getStockLogs({ itemId, type, limit });
        return NextResponse.json({ success: true, logs });
    } catch (err) {
        console.error("[Stock/Inventory] logs error:", err);
        return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
    }
}
