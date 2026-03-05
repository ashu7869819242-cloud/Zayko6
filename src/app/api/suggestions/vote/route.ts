/**
 * /api/suggestions/vote — Vote on a suggestion
 *
 * POST — Cast or change a vote (yes/no) using Firestore transaction.
 *        Guarantees atomic counter updates and one-vote-per-user.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { suggestionId, vote } = body;

        if (!suggestionId || typeof suggestionId !== "string") {
            return NextResponse.json({ error: "suggestionId is required" }, { status: 400 });
        }
        if (!vote || !["yes", "no"].includes(vote)) {
            return NextResponse.json({ error: "vote must be 'yes' or 'no'" }, { status: 400 });
        }

        const suggestionRef = adminDb.collection("itemSuggestions").doc(suggestionId);
        const voteRef = suggestionRef.collection("votes").doc(uid);

        const result = await adminDb.runTransaction(async (tx) => {
            const suggestionDoc = await tx.get(suggestionRef);
            if (!suggestionDoc.exists) {
                throw new Error("SUGGESTION_NOT_FOUND");
            }

            const suggestionData = suggestionDoc.data()!;
            if (suggestionData.status !== "pending") {
                throw new Error("SUGGESTION_NOT_ACTIVE");
            }

            const existingVoteDoc = await tx.get(voteRef);

            if (existingVoteDoc.exists) {
                const existingVote = existingVoteDoc.data()!.vote;

                if (existingVote === vote) {
                    // Same vote — no-op
                    return { action: "no_change", vote };
                }

                // Change vote: decrement old, increment new
                const updates: Record<string, unknown> = {
                    updatedAt: new Date().toISOString(),
                };

                if (existingVote === "yes") {
                    updates.totalYesVotes = FieldValue.increment(-1);
                    updates.totalNoVotes = FieldValue.increment(1);
                } else {
                    updates.totalYesVotes = FieldValue.increment(1);
                    updates.totalNoVotes = FieldValue.increment(-1);
                }

                tx.update(suggestionRef, updates);
                tx.update(voteRef, { vote, votedAt: new Date().toISOString() });

                return { action: "changed", vote };
            }

            // New vote
            const increment: Record<string, unknown> = {
                updatedAt: new Date().toISOString(),
            };

            if (vote === "yes") {
                increment.totalYesVotes = FieldValue.increment(1);
                // Also add to requestedBy for backward compatibility
                increment.requestedBy = FieldValue.arrayUnion(uid);
                increment.totalRequests = FieldValue.increment(1);
            } else {
                increment.totalNoVotes = FieldValue.increment(1);
            }

            tx.update(suggestionRef, increment);
            tx.set(voteRef, { vote, votedAt: new Date().toISOString() });

            return { action: "voted", vote };
        });

        console.log(`[Suggestions/Vote] User ${uid} ${result.action} ${vote} on ${suggestionId}`);

        return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (message === "SUGGESTION_NOT_FOUND") {
            return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
        }
        if (message === "SUGGESTION_NOT_ACTIVE") {
            return NextResponse.json({ error: "This suggestion is no longer active" }, { status: 400 });
        }

        console.error("[Suggestions/Vote] error:", err);
        return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
    }
}
