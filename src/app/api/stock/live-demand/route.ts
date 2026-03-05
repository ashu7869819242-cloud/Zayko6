/**
 * /api/stock/live-demand — Aggregated Live Demand from dailyDemands
 *
 * GET — Returns item-wise aggregated demand from active dailyDemands documents.
 *       Used for initial data load on the stock manager dashboard.
 *       Real-time updates come via Firestore onSnapshot on the client.
 *
 * Protected by Stock Manager JWT verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyStockManager } from "@/lib/stock-manager-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch all active daily demands
        const snap = await adminDb
            .collection("dailyDemands")
            .where("isActive", "==", true)
            .get();

        // Aggregate: group by itemId, sum quantity, count unique users
        const itemMap: Record<string, {
            itemId: string;
            itemName: string;
            totalDemand: number;
            activeUsers: Set<string>;
        }> = {};

        snap.forEach((doc) => {
            const data = doc.data();
            const key = data.itemId;

            if (!itemMap[key]) {
                itemMap[key] = {
                    itemId: data.itemId,
                    itemName: data.itemName || "Unknown",
                    totalDemand: 0,
                    activeUsers: new Set(),
                };
            }

            itemMap[key].totalDemand += data.quantity || 0;
            itemMap[key].activeUsers.add(data.userId);
        });

        // Convert Sets to counts for JSON serialization
        const items = Object.values(itemMap)
            .map((item) => ({
                itemId: item.itemId,
                itemName: item.itemName,
                totalDemand: item.totalDemand,
                activeUsers: item.activeUsers.size,
            }))
            .sort((a, b) => b.totalDemand - a.totalDemand);

        const totalActiveNeeds = snap.size;
        const totalUniqueUsers = new Set(snap.docs.map((d) => d.data().userId)).size;

        return NextResponse.json({
            success: true,
            items,
            totalActiveNeeds,
            totalUniqueUsers,
        });
    } catch (err) {
        console.error("[Stock/LiveDemand] GET error:", err);
        return NextResponse.json(
            { error: "Failed to load live demand data" },
            { status: 500 }
        );
    }
}
