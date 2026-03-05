/**
 * /api/stock/inventory/export — CSV export for Stock Manager
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import { getInventoryCSVData } from "@/services/inventoryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const csv = await getInventoryCSVData();
        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="inventory_${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });
    } catch (err) {
        console.error("[Stock/Inventory] export error:", err);
        return NextResponse.json({ error: "Failed to export" }, { status: 500 });
    }
}
