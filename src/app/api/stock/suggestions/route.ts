/**
 * /api/stock/suggestions — Item suggestions management for Stock Manager
 *
 * GET   — List all suggestions with vote data, support %, and demand badges
 * PATCH — Update suggestion status (approve/reject)
 *
 * Protected by Stock Manager JWT verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyStockManager } from "@/lib/stock-manager-auth";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function getDemandBadge(totalYes: number, totalNo: number): { label: string; type: "high" | "low" | "neutral" } {
    const total = totalYes + totalNo;
    if (total === 0) return { label: "No Votes Yet", type: "neutral" };
    const pct = (totalYes / total) * 100;
    if (pct > 60 && total > 50) return { label: "🔥 High Demand", type: "high" };
    if (pct < 40) return { label: "⚠ Low Interest", type: "low" };
    return { label: "📊 Moderate", type: "neutral" };
}

export async function GET(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const snap = await adminDb
            .collection("itemSuggestions")
            .orderBy("createdAt", "desc")
            .get();

        const suggestions = snap.docs.map((doc) => {
            const data = doc.data();
            const totalYes = data.totalYesVotes || 0;
            const totalNo = data.totalNoVotes || 0;
            const totalVotes = totalYes + totalNo;
            const supportPercentage = totalVotes > 0
                ? Math.round((totalYes / totalVotes) * 100)
                : 0;
            const demandBadge = getDemandBadge(totalYes, totalNo);

            return {
                id: doc.id,
                itemName: data.itemName,
                normalizedName: data.normalizedName,
                category: data.category || null,
                description: data.description || null,
                expectedPrice: data.expectedPrice || null,
                totalRequests: data.totalRequests || 0,
                uniqueUsers: data.requestedBy?.length || 0,
                totalYesVotes: totalYes,
                totalNoVotes: totalNo,
                totalVotes,
                supportPercentage,
                demandBadge,
                status: data.status || "pending",
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            };
        });

        // Summary stats
        const total = suggestions.length;
        const pending = suggestions.filter((s) => s.status === "pending").length;
        const approved = suggestions.filter((s) => s.status === "approved").length;
        const rejected = suggestions.filter((s) => s.status === "rejected").length;
        const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

        let mostRequested = "—";
        let mostRequestedCount = 0;
        let highDemandCount = 0;
        for (const s of suggestions) {
            if (s.totalYesVotes > mostRequestedCount) {
                mostRequestedCount = s.totalYesVotes;
                mostRequested = s.itemName;
            }
            if (s.demandBadge.type === "high") highDemandCount++;
        }

        const summary = {
            total,
            pending,
            approved,
            rejected,
            conversionRate,
            mostRequested,
            mostRequestedCount,
            highDemandCount,
        };

        return NextResponse.json({ success: true, suggestions, summary });
    } catch (err) {
        console.error("[Stock/Suggestions] GET error:", err);
        return NextResponse.json({ error: "Failed to load suggestions" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const manager = verifyStockManager(req);
    if (!manager) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Suggestion ID required" }, { status: 400 });
        }

        const body = await req.json();
        const { status } = body;

        if (!["approved", "rejected"].includes(status)) {
            return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
        }

        const docRef = adminDb.collection("itemSuggestions").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
        }

        await docRef.update({
            status,
            reviewedBy: `stock_manager:${manager.username}`,
            reviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const updated = await docRef.get();
        const data = updated.data()!;

        return NextResponse.json({
            success: true,
            suggestion: {
                id: updated.id,
                itemName: data.itemName,
                category: data.category,
                description: data.description,
                expectedPrice: data.expectedPrice,
                totalYesVotes: data.totalYesVotes || 0,
                totalNoVotes: data.totalNoVotes || 0,
                status: data.status,
            },
        });
    } catch (err) {
        console.error("[Stock/Suggestions] PATCH error:", err);
        return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }
}
