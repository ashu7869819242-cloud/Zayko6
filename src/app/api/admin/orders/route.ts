/**
 * Admin Orders API — View all orders + Update order status/prepTime
 * 
 * SECURITY CHANGES:
 * - All handlers now require admin JWT verification via verifyAdmin()
 * - Returns 401 Unauthorized if token is missing or invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { FieldValue } from "firebase-admin/firestore";
import { updateCanteenWallet } from "@/lib/canteen-wallet";

export const runtime = "nodejs";

// SECURITY: Centralized auth check for all admin orders operations
function requireAdmin(req: NextRequest): NextResponse | null {
    if (!verifyAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const snapshot = await adminDb
            .collection("orders")
            .orderBy("createdAt", "desc")
            .get();
        const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ orders });
    } catch (error) {
        console.error("Failed to fetch orders:", error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;

    try {
        const { orderId, status, prepTime } = await req.json();
        if (!orderId) {
            return NextResponse.json({ error: "Order ID required" }, { status: 400 });
        }

        const orderRef = adminDb.collection("orders").doc(orderId);

        // 1. PRE-FETCH ORDER DATA to resolve missing item IDs (Standard point-read)
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        const orderData = orderSnap.data()!;
        const items = orderData.items || [];

        // 2. Resolve IDs if missing (Legacy support for orders without IDs)
        if (status === "cancelled") {
            for (const item of items) {
                if (!item.id) {
                    const menuSnap = await adminDb.collection("menuItems").where("name", "==", item.name).limit(1).get();
                    if (!menuSnap.empty) {
                        item.id = menuSnap.docs[0].id;
                    }
                }
            }
        }

        // 3. EXECUTE TRANSACTION
        await adminDb.runTransaction(async (transaction) => {
            const currentOrderDoc = await transaction.get(orderRef);
            if (!currentOrderDoc.exists) throw new Error("Order vanished during transaction");

            const currentOrderData = currentOrderDoc.data()!;
            const oldStatus = currentOrderData.status;

            // --- A. HANDLE CANCELLATION & RESTOCKING ---
            if (status === "cancelled") {
                if (oldStatus === "cancelled") {
                    throw new Error("Order is already cancelled");
                }

                const userId = currentOrderData.userId;
                const total = currentOrderData.total;
                const orderIdDisplay = currentOrderData.orderId;

                // 1. READ/SYNC WALLET FIRST (This has internal transaction.get())
                await updateCanteenWallet(transaction, oldStatus, "cancelled", total, orderIdDisplay);

                // 2. NOW PERFORM ALL UPDATES (Restock, Refund, Order Status)
                for (const item of items) {
                    if (item.id) {
                        const itemRef = adminDb.collection("menuItems").doc(item.id);
                        transaction.update(itemRef, {
                            quantity: FieldValue.increment(item.quantity),
                            available: true,
                            updatedAt: new Date().toISOString(),
                        });
                    }
                }

                // Refund User Wallet
                const userRef = adminDb.collection("users").doc(userId);
                transaction.update(userRef, {
                    walletBalance: FieldValue.increment(total),
                });

                // Record Refund Txn
                const txnRef = adminDb.collection("walletTransactions").doc();
                transaction.set(txnRef, {
                    userId,
                    type: "refund",
                    amount: total,
                    description: `Refund - Order #${orderIdDisplay} Cancelled`,
                    transactionId: txnRef.id,
                    createdAt: new Date().toISOString(),
                });

                // Final Order Update
                transaction.update(orderRef, {
                    status: "cancelled",
                    updatedAt: new Date().toISOString(),
                });

                return;
            }

            // --- B. NORMAL STATUS / PREP TIME UPDATE ---
            const updateData: Record<string, unknown> = {
                updatedAt: new Date().toISOString(),
            };

            let newStatus = status || oldStatus;

            if (newStatus === "ready") {
                updateData.readyAt = null;
                updateData.estimatedReadyAt = null;
            }

            if (prepTime) {
                updateData.prepTime = prepTime;
                const readyAtISO = new Date(Date.now() + prepTime * 60 * 1000).toISOString();
                updateData.estimatedReadyAt = readyAtISO;
                updateData.readyAt = readyAtISO;

                if (!status && oldStatus === "pending") {
                    newStatus = "confirmed";
                }
            }

            if (newStatus !== oldStatus) {
                updateData.status = newStatus;
                await updateCanteenWallet(transaction, oldStatus, newStatus, currentOrderData.total, currentOrderData.orderId);
            }

            transaction.update(orderRef, updateData);
        });

        return NextResponse.json({ success: true, refunded: status === "cancelled" });
    } catch (error) {
        console.error("Failed to update order:", error);
        const message = error instanceof Error ? error.message : "Failed to update order";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
