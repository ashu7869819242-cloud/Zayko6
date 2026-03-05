/**
 * /api/stock/inventory/[id] — Individual inventory item operations for Stock Manager
 *
 * PUT    — Update an inventory item
 * DELETE — Delete an inventory item
 *
 * Protected by Stock Manager JWT verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import {
    updateInventoryItem,
    deleteInventoryItem,
} from "@/services/inventoryService";

export const runtime = "nodejs";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { name, category, unit, reorderLevel, supplierName, costPerUnit } = body;

        await updateInventoryItem(id, {
            ...(name && { name }),
            ...(category && { category }),
            ...(unit && { unit }),
            ...(reorderLevel !== undefined && { reorderLevel: Number(reorderLevel) }),
            ...(supplierName !== undefined && { supplierName }),
            ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Stock/Inventory] PUT error:", err);
        return NextResponse.json(
            { error: "Failed to update inventory item" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        await deleteInventoryItem(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Stock/Inventory] DELETE error:", err);
        return NextResponse.json(
            { error: "Failed to delete inventory item" },
            { status: 500 }
        );
    }
}
