/**
 * /api/suggestions — Public Suggestions API (authenticated users)
 *
 * GET  — List all active suggestions with vote counts + current user's vote
 * POST — Create a new suggestion (auto-casts a "yes" vote for the creator)
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/user-auth";

export const runtime = "nodejs";

// ─── GET ────────────────────────────────────────
export async function GET(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Fetch all active (pending) suggestions
        const snap = await adminDb
            .collection("itemSuggestions")
            .where("status", "==", "pending")
            .orderBy("createdAt", "desc")
            .get();

        const suggestions = [];

        for (const doc of snap.docs) {
            const data = doc.data();

            // Check if this user has voted
            const voteDoc = await adminDb
                .collection("itemSuggestions")
                .doc(doc.id)
                .collection("votes")
                .doc(uid)
                .get();

            const totalYes = data.totalYesVotes || 0;
            const totalNo = data.totalNoVotes || 0;
            const totalVotes = totalYes + totalNo;
            const supportPercentage = totalVotes > 0
                ? Math.round((totalYes / totalVotes) * 100)
                : 0;

            suggestions.push({
                id: doc.id,
                itemName: data.itemName,
                category: data.category || null,
                description: data.description || null,
                expectedPrice: data.expectedPrice || null,
                totalYesVotes: totalYes,
                totalNoVotes: totalNo,
                totalVotes,
                supportPercentage,
                userVote: voteDoc.exists ? voteDoc.data()!.vote : null,
                suggestedBy: data.requestedBy?.[0] || null,
                isOwner: data.requestedBy?.[0] === uid,
                createdAt: data.createdAt,
            });
        }

        return NextResponse.json({ success: true, suggestions });
    } catch (err) {
        console.error("[Suggestions] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}

// ─── POST ───────────────────────────────────────
export async function POST(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { itemName, category, description, expectedPrice } = body;

        if (!itemName || typeof itemName !== "string" || itemName.trim().length < 2) {
            return NextResponse.json({ error: "Item name is required (min 2 characters)" }, { status: 400 });
        }

        const normalizedName = itemName.trim().toLowerCase();

        // Check if suggestion already exists
        const existingSnap = await adminDb
            .collection("itemSuggestions")
            .where("normalizedName", "==", normalizedName)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            return NextResponse.json({
                error: "A suggestion with this name already exists. Vote on it instead!",
                existingSuggestionId: existingSnap.docs[0].id,
            }, { status: 409 });
        }

        // Create the suggestion
        const now = new Date().toISOString();
        const suggestionData: Record<string, unknown> = {
            itemName: itemName.trim(),
            normalizedName,
            totalRequests: 1,
            requestedBy: [uid],
            totalYesVotes: 1,
            totalNoVotes: 0,
            status: "pending",
            createdAt: now,
            updatedAt: now,
        };

        if (category && typeof category === "string") suggestionData.category = category.trim();
        if (description && typeof description === "string") suggestionData.description = description.trim();
        if (expectedPrice && typeof expectedPrice === "number" && expectedPrice > 0) {
            suggestionData.expectedPrice = expectedPrice;
        }

        const ref = await adminDb.collection("itemSuggestions").add(suggestionData);

        // Auto-cast a "yes" vote for the creator
        await adminDb
            .collection("itemSuggestions")
            .doc(ref.id)
            .collection("votes")
            .doc(uid)
            .set({
                vote: "yes",
                votedAt: now,
            });

        console.log(`[Suggestions] Created "${itemName}" by ${uid} (doc: ${ref.id})`);

        return NextResponse.json({
            success: true,
            suggestionId: ref.id,
        });
    } catch (err) {
        console.error("[Suggestions] POST error:", err);
        return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
    }
}
