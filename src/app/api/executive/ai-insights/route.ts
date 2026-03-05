/**
 * /api/executive/ai-insights — Auto-Generated Business Insights
 *
 * GET — Analyzes order/demand patterns and generates human-readable insights.
 * Pure algorithmic analysis — no external AI API calls.
 *
 * Protected by Super Admin JWT.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const admin = verifySuperAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const prevWeekStart = new Date(now.getTime() - 14 * 86400000);
        const weekAgoStr = weekAgo.toISOString();
        const prevWeekStr = prevWeekStart.toISOString();

        // Fetch recent orders (last 14 days for trend comparison)
        const ordersSnap = await adminDb
            .collection("orders")
            .where("createdAt", ">=", prevWeekStr)
            .orderBy("createdAt", "desc")
            .get();

        const insights: Array<{ icon: string; text: string; type: "growth" | "warning" | "info" | "trend" }> = [];

        // Split into this week vs last week
        const thisWeek: { total: number; orders: number; items: Record<string, number>; wallet: number; razorpay: number; hours: Record<number, number> } = {
            total: 0, orders: 0, items: {}, wallet: 0, razorpay: 0, hours: {},
        };
        const lastWeek: { total: number; orders: number; items: Record<string, number>; wallet: number; razorpay: number } = {
            total: 0, orders: 0, items: {}, wallet: 0, razorpay: 0,
        };

        ordersSnap.forEach((doc) => {
            const o = doc.data();
            if (o.status === "cancelled") return;
            const createdAt = new Date(o.createdAt);
            const total = o.total || 0;
            const payMode = (o.paymentMode || "").toLowerCase();
            const isRazorpay = payMode.includes("razorpay") || payMode.includes("online");
            const hour = createdAt.getHours();

            const bucket = createdAt >= weekAgo ? thisWeek : lastWeek;
            bucket.total += total;
            bucket.orders++;
            if (isRazorpay) bucket.razorpay += total;
            else bucket.wallet += total;

            // Item popularity
            for (const item of (o.items || [])) {
                const name = item.name || "Unknown";
                bucket.items[name] = (bucket.items[name] || 0) + (item.quantity || 1);
            }

            if (createdAt >= weekAgo) {
                thisWeek.hours[hour] = (thisWeek.hours[hour] || 0) + 1;
            }
        });

        // 1. Revenue trend
        if (lastWeek.total > 0 && thisWeek.total > 0) {
            const pctChange = Math.round(((thisWeek.total - lastWeek.total) / lastWeek.total) * 100);
            if (pctChange > 0) {
                insights.push({
                    icon: "📈",
                    text: `Revenue increased ${pctChange}% this week (₹${Math.round(thisWeek.total).toLocaleString()} vs ₹${Math.round(lastWeek.total).toLocaleString()} last week).`,
                    type: "growth",
                });
            } else if (pctChange < -5) {
                insights.push({
                    icon: "📉",
                    text: `Revenue decreased ${Math.abs(pctChange)}% this week. Consider promotions or menu updates.`,
                    type: "warning",
                });
            }
        }

        // 2. Order volume trend
        if (lastWeek.orders > 0 && thisWeek.orders > 0) {
            const pctChange = Math.round(((thisWeek.orders - lastWeek.orders) / lastWeek.orders) * 100);
            if (Math.abs(pctChange) >= 10) {
                insights.push({
                    icon: pctChange > 0 ? "🚀" : "⚠️",
                    text: `Order volume ${pctChange > 0 ? "up" : "down"} ${Math.abs(pctChange)}% this week (${thisWeek.orders} orders vs ${lastWeek.orders}).`,
                    type: pctChange > 0 ? "growth" : "warning",
                });
            }
        }

        // 3. Payment method trend
        if (thisWeek.total > 0) {
            const walletPct = Math.round((thisWeek.wallet / thisWeek.total) * 100);
            const razorpayPct = 100 - walletPct;
            if (lastWeek.total > 0) {
                const lastWalletPct = Math.round((lastWeek.wallet / lastWeek.total) * 100);
                if (walletPct > lastWalletPct + 5) {
                    insights.push({
                        icon: "💳",
                        text: `Wallet usage growing — now ${walletPct}% of payments vs ${lastWalletPct}% last week.`,
                        type: "trend",
                    });
                } else if (razorpayPct > (100 - lastWalletPct) + 5) {
                    insights.push({
                        icon: "💳",
                        text: `Razorpay usage growing — now ${razorpayPct}% of payments. Wallet at ${walletPct}%.`,
                        type: "trend",
                    });
                }
            }
        }

        // 4. Peak hour
        if (Object.keys(thisWeek.hours).length > 0) {
            const peakHour = Object.entries(thisWeek.hours).sort(([, a], [, b]) => b - a)[0];
            const peakH = parseInt(peakHour[0]);
            const peakLabel = `${peakH.toString().padStart(2, "0")}:00 - ${(peakH + 1).toString().padStart(2, "0")}:00`;
            insights.push({
                icon: "⏰",
                text: `Peak order time: ${peakLabel} with ${peakHour[1]} orders this week.`,
                type: "info",
            });
        }

        // 5. Top trending item
        const thisWeekItems = Object.entries(thisWeek.items).sort(([, a], [, b]) => b - a);
        const lastWeekItems = Object.entries(lastWeek.items).sort(([, a], [, b]) => b - a);
        if (thisWeekItems.length > 0) {
            const topItem = thisWeekItems[0];
            insights.push({
                icon: "🔥",
                text: `"${topItem[0]}" is the most popular item this week with ${topItem[1]} units ordered.`,
                type: "info",
            });

            // Find biggest growth item
            for (const [name, qty] of thisWeekItems) {
                const lastQty = lastWeek.items[name] || 0;
                if (lastQty > 2 && qty > lastQty) {
                    const growth = Math.round(((qty - lastQty) / lastQty) * 100);
                    if (growth >= 20) {
                        insights.push({
                            icon: "📊",
                            text: `"${name}" demand increased ${growth}% this week (${lastQty} → ${qty} units).`,
                            type: "growth",
                        });
                        break;
                    }
                }
            }
        }

        // 6. Declining items
        for (const [name, lastQty] of lastWeekItems) {
            const thisQty = thisWeek.items[name] || 0;
            if (lastQty >= 5 && thisQty < lastQty * 0.5) {
                insights.push({
                    icon: "⬇️",
                    text: `"${name}" orders dropped ${Math.round((1 - thisQty / lastQty) * 100)}% this week. Consider a promotion.`,
                    type: "warning",
                });
                break;
            }
        }

        // 7. Average order value comparison
        if (thisWeek.orders > 0 && lastWeek.orders > 0) {
            const thisAvg = Math.round(thisWeek.total / thisWeek.orders);
            const lastAvg = Math.round(lastWeek.total / lastWeek.orders);
            if (thisAvg > lastAvg + 10) {
                insights.push({
                    icon: "💰",
                    text: `Average order value increased to ₹${thisAvg} from ₹${lastAvg} last week.`,
                    type: "growth",
                });
            }
        }

        // Ensure we always have some insights
        if (insights.length === 0) {
            insights.push({
                icon: "📊",
                text: "Not enough data to generate insights yet. More orders will unlock trend analysis.",
                type: "info",
            });
        }

        return NextResponse.json({ success: true, insights });
    } catch (err) {
        console.error("[Executive/AIInsights] Error:", err);
        return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
    }
}
