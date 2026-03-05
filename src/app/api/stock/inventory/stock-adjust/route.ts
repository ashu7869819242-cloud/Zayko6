/**
 * /api/stock/inventory/stock-adjust — Stock adjustment for Stock Manager
 *
 * POST — Adjust stock with reason (ADD, DEDUCT, WASTE)
 *
 * Protected by Stock Manager JWT verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import { adjustStock } from "@/services/inventoryService";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { itemId, type, quantity, reason } = body;

        if (!itemId || !type || !quantity || !reason?.trim()) {
            return NextResponse.json(
                { error: "Missing required fields: itemId, type, quantity, reason" },
                { status: 400 }
            );
        }

        if (!["ADD", "DEDUCT", "WASTE"].includes(type)) {
            return NextResponse.json(
                { error: "Type must be ADD, DEDUCT, or WASTE" },
                { status: 400 }
            );
        }

        if (quantity <= 0) {
            return NextResponse.json(
                { error: "Quantity must be positive" },
                { status: 400 }
            );
        }

        const result = await adjustStock(
            { itemId, type, quantity: Number(quantity), reason },
            `stock_manager:${manager.username}`
        );

        return NextResponse.json({ success: true, newStock: result.newStock });
    } catch (err) {
        console.error("[Stock/Inventory] stock-adjust error:", err);
        return NextResponse.json(
            { error: "Failed to adjust stock" },
            { status: 500 }
        );
    }
}
