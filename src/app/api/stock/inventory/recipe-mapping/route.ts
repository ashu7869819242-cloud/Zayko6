/**
 * /api/stock/inventory/recipe-mapping — Recipe mapping for Stock Manager
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import {
    getRecipeMappings,
    setRecipeMappings,
    deleteRecipeMapping,
} from "@/services/inventoryService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const menuItemId = searchParams.get("menuItemId") || undefined;
        const mappings = await getRecipeMappings(menuItemId);
        return NextResponse.json({ success: true, mappings });
    } catch (err) {
        console.error("[Stock/RecipeMapping] GET error:", err);
        return NextResponse.json({ error: "Failed to load mappings" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { menuItemId, menuItemName, ingredients } = body;

        if (!menuItemId || !menuItemName || !Array.isArray(ingredients)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await setRecipeMappings(menuItemId, menuItemName, ingredients);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Stock/RecipeMapping] POST error:", err);
        return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const mappingId = searchParams.get("id");
        if (!mappingId) {
            return NextResponse.json({ error: "Mapping ID required" }, { status: 400 });
        }
        await deleteRecipeMapping(mappingId);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Stock/RecipeMapping] DELETE error:", err);
        return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
    }
}
