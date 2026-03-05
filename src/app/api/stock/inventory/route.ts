/**
 * /api/stock/inventory — Inventory Items CRUD for Stock Manager
 *
 * GET  — List all inventory items (with filters: search, category, lowStock)
 * POST — Add a new inventory item
 *
 * Protected by Stock Manager JWT verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import {
    getInventoryItems,
    addInventoryItem,
    getLowStockAlerts,
} from "@/services/inventoryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category") || undefined;
        const search = searchParams.get("search") || undefined;
        const lowStockOnly = searchParams.get("lowStock") === "true";
        const alertsOnly = searchParams.get("alerts") === "true";

        if (alertsOnly) {
            const alerts = await getLowStockAlerts();
            return NextResponse.json({ success: true, alerts });
        }

        const items = await getInventoryItems({ category, search, lowStockOnly });

        const totalValue = items.reduce(
            (sum, item) => sum + item.currentStock * item.costPerUnit,
            0
        );
        const lowStockCount = items.filter(
            (i) => i.currentStock > 0 && i.currentStock <= i.reorderLevel
        ).length;
        const outOfStockCount = items.filter((i) => i.currentStock <= 0).length;

        return NextResponse.json({
            success: true,
            items,
            summary: {
                totalItems: items.length,
                totalValue,
                lowStockCount,
                outOfStockCount,
            },
        });
    } catch (err) {
        console.error("[Stock/Inventory] GET error:", err);
        return NextResponse.json(
            { error: "Failed to fetch inventory" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, category, currentStock, unit, reorderLevel, supplierName, costPerUnit } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }
        if (currentStock === undefined || currentStock < 0) {
            return NextResponse.json({ error: "Invalid stock quantity" }, { status: 400 });
        }
        if (!unit) {
            return NextResponse.json({ error: "Unit is required" }, { status: 400 });
        }
        if (reorderLevel === undefined || reorderLevel < 0) {
            return NextResponse.json({ error: "Invalid reorder level" }, { status: 400 });
        }
        if (costPerUnit === undefined || costPerUnit < 0) {
            return NextResponse.json({ error: "Invalid cost per unit" }, { status: 400 });
        }

        const item = await addInventoryItem(
            {
                name,
                category: category || "other",
                currentStock: Number(currentStock),
                unit,
                reorderLevel: Number(reorderLevel),
                supplierName: supplierName || "",
                costPerUnit: Number(costPerUnit),
            },
            `stock_manager:${manager.username}`
        );

        return NextResponse.json({ success: true, item }, { status: 201 });
    } catch (err) {
        console.error("[Stock/Inventory] POST error:", err);
        return NextResponse.json(
            { error: "Failed to add inventory item" },
            { status: 500 }
        );
    }
}
