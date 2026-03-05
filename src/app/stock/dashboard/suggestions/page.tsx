"use client";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface SuggestionVote {
    id: string;
    itemName: string;
    category: string | null;
    description: string | null;
    expectedPrice: number | null;
    totalRequests: number;
    uniqueUsers: number;
    totalYesVotes: number;
    totalNoVotes: number;
    totalVotes: number;
    supportPercentage: number;
    demandBadge: { label: string; type: "high" | "low" | "neutral" };
    status: "pending" | "approved" | "rejected";
    createdAt: string;
}

interface Summary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    conversionRate: number;
    mostRequested: string;
    mostRequestedCount: number;
    highDemandCount: number;
}

type SortMode = "votes" | "support" | "newest";
type FilterStatus = "all" | "pending" | "approved" | "rejected";

function getDemandBadge(totalYes: number, totalNo: number): { label: string; type: "high" | "low" | "neutral" } {
    const total = totalYes + totalNo;
    if (total === 0) return { label: "No Votes Yet", type: "neutral" };
    const pct = (totalYes / total) * 100;
    if (pct > 60 && total > 50) return { label: "🔥 High Demand", type: "high" };
    if (pct < 40) return { label: "⚠ Low Interest", type: "low" };
    return { label: "📊 Moderate", type: "neutral" };
}

export default function StockSuggestionsPage() {
    const [suggestions, setSuggestions] = useState<SuggestionVote[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortMode, setSortMode] = useState<SortMode>("votes");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const getHeaders = useCallback(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("stockManagerToken")}`,
    }), []);

    // Real-time Firestore listener
    useEffect(() => {
        const q = query(collection(db, "itemSuggestions"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const items: SuggestionVote[] = snap.docs.map((d) => {
                    const data = d.data();
                    const totalYes = data.totalYesVotes || 0;
                    const totalNo = data.totalNoVotes || 0;
                    const totalVotes = totalYes + totalNo;
                    return {
                        id: d.id,
                        itemName: data.itemName,
                        category: data.category || null,
                        description: data.description || null,
                        expectedPrice: data.expectedPrice || null,
                        totalRequests: data.totalRequests || 0,
                        uniqueUsers: data.requestedBy?.length || 0,
                        totalYesVotes: totalYes,
                        totalNoVotes: totalNo,
                        totalVotes,
                        supportPercentage: totalVotes > 0 ? Math.round((totalYes / totalVotes) * 100) : 0,
                        demandBadge: getDemandBadge(totalYes, totalNo),
                        status: data.status || "pending",
                        createdAt: data.createdAt,
                    };
                });

                setSuggestions(items);

                // Compute summary
                const total = items.length;
                const pending = items.filter((s) => s.status === "pending").length;
                const approved = items.filter((s) => s.status === "approved").length;
                const rejected = items.filter((s) => s.status === "rejected").length;
                const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
                let mostRequested = "—";
                let mostRequestedCount = 0;
                let highDemandCount = 0;
                for (const s of items) {
                    if (s.totalYesVotes > mostRequestedCount) {
                        mostRequestedCount = s.totalYesVotes;
                        mostRequested = s.itemName;
                    }
                    if (s.demandBadge.type === "high") highDemandCount++;
                }
                setSummary({ total, pending, approved, rejected, conversionRate, mostRequested, mostRequestedCount, highDemandCount });
                setLoading(false);
            },
            (err) => {
                console.error("[Stock/Suggestions] snapshot error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
        setUpdatingId(id);
        try {
            const res = await fetch(`/api/stock/suggestions?id=${id}`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({ status }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(
                    status === "approved"
                        ? `"${json.suggestion.itemName}" approved! ✅`
                        : `"${json.suggestion.itemName}" rejected ❌`
                );
            } else {
                toast.error(json.error || "Failed to update");
            }
        } catch {
            toast.error("Something went wrong");
        }
        setUpdatingId(null);
    };

    let displayed = [...suggestions];
    if (filterStatus !== "all") {
        displayed = displayed.filter((s) => s.status === filterStatus);
    }
    if (sortMode === "votes") {
        displayed.sort((a, b) => b.totalYesVotes - a.totalYesVotes);
    } else if (sortMode === "support") {
        displayed.sort((a, b) => b.supportPercentage - a.supportPercentage);
    } else {
        displayed.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }

    return (
        <div className="min-h-screen bg-zayko-900 pb-12">
            {/* Header */}
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">🗳️</div>
                        <div>
                            <h1 className="text-lg font-display font-bold text-white">Student Suggestions</h1>
                            <p className="text-xs text-emerald-400">Real-time voting & demand intelligence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-semibold">LIVE</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        {summary && (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-fade-in">
                                {[
                                    { label: "Total", value: summary.total, icon: "💡", color: "text-blue-400" },
                                    { label: "Most Voted", value: summary.mostRequested, sub: `${summary.mostRequestedCount} yes votes`, icon: "🔥", color: "text-emerald-400" },
                                    { label: "Pending", value: summary.pending, icon: "⏳", color: "text-yellow-400" },
                                    { label: "High Demand", value: summary.highDemandCount, icon: "🔥", color: "text-orange-400" },
                                    { label: "Conversion", value: `${summary.conversionRate}%`, icon: "📈", color: summary.conversionRate > 0 ? "text-emerald-400" : "text-zayko-400" },
                                ].map((card) => (
                                    <div key={card.label} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">{card.icon}</span>
                                            <span className="text-xs text-zayko-400">{card.label}</span>
                                        </div>
                                        <p className={`text-xl font-display font-bold ${card.color} truncate`}>{card.value}</p>
                                        {"sub" in card && card.sub && <p className="text-xs text-zayko-500 mt-0.5">{card.sub}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sort & Filter */}
                        <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 mb-6 animate-slide-up">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs text-zayko-400 font-semibold">Sort:</span>
                                {(["votes", "support", "newest"] as SortMode[]).map((mode) => (
                                    <button key={mode} onClick={() => setSortMode(mode)}
                                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${sortMode === mode ? "bg-emerald-500 text-zayko-900" : "bg-white/5 text-zayko-400 border border-white/10"}`}>
                                        {mode === "votes" ? "👍 Yes Votes" : mode === "support" ? "📊 Support %" : "🕐 Newest"}
                                    </button>
                                ))}

                                <span className="text-xs text-zayko-400 font-semibold ml-2">Filter:</span>
                                {(["all", "pending", "approved", "rejected"] as FilterStatus[]).map((f) => (
                                    <button key={f} onClick={() => setFilterStatus(f)}
                                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterStatus === f ? "bg-emerald-500 text-zayko-900" : "bg-white/5 text-zayko-400 border border-white/10"}`}>
                                        {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Suggestions List */}
                        {displayed.length === 0 ? (
                            <div className="bg-zayko-800/30 border border-zayko-700 rounded-2xl p-8 text-center">
                                <div className="text-4xl mb-3">📭</div>
                                <p className="text-zayko-400">No suggestions match your filters</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {displayed.map((s) => (
                                    <div key={s.id} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-5 animate-slide-up">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            {/* Left: Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="font-bold text-white text-base">{s.itemName}</span>
                                                    {s.category && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{s.category}</span>
                                                    )}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                                                        s.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                                            "bg-yellow-500/20 text-yellow-400"
                                                        }`}>
                                                        {s.status === "approved" ? "✅" : s.status === "rejected" ? "❌" : "⏳"} {s.status}
                                                    </span>
                                                    {/* Demand Badge */}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.demandBadge.type === "high" ? "bg-orange-500/20 text-orange-400" :
                                                        s.demandBadge.type === "low" ? "bg-red-500/10 text-red-400/70" :
                                                            "bg-white/5 text-zayko-400"
                                                        }`}>
                                                        {s.demandBadge.label}
                                                    </span>
                                                </div>

                                                {s.description && (
                                                    <p className="text-xs text-zayko-400 mt-0.5">{s.description}</p>
                                                )}
                                            </div>

                                            {/* Center: Vote Stats */}
                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="text-center">
                                                    <p className="text-lg font-display font-bold text-emerald-400">{s.totalYesVotes}</p>
                                                    <p className="text-[9px] text-zayko-500 font-bold uppercase">Yes</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-display font-bold text-red-400">{s.totalNoVotes}</p>
                                                    <p className="text-[9px] text-zayko-500 font-bold uppercase">No</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className={`text-lg font-display font-bold ${s.supportPercentage >= 60 ? "text-emerald-400" : s.supportPercentage < 40 ? "text-red-400" : "text-yellow-400"}`}>
                                                        {s.supportPercentage}%
                                                    </p>
                                                    <p className="text-[9px] text-zayko-500 font-bold uppercase">Support</p>
                                                </div>

                                                {/* Support bar */}
                                                <div className="w-24 hidden sm:block">
                                                    <div className="w-full h-2 bg-zayko-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${s.supportPercentage}%`,
                                                                background: s.supportPercentage >= 60
                                                                    ? "linear-gradient(90deg, #10b981, #34d399)"
                                                                    : s.supportPercentage < 40
                                                                        ? "linear-gradient(90deg, #ef4444, #f87171)"
                                                                        : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-zayko-500 mt-1 text-center">{s.totalVotes} votes</p>
                                                </div>
                                            </div>

                                            {/* Right: Action buttons */}
                                            {s.status === "pending" && (
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleStatusUpdate(s.id, "approved")}
                                                        disabled={updatingId === s.id}
                                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        {updatingId === s.id ? "…" : "✅ Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(s.id, "rejected")}
                                                        disabled={updatingId === s.id}
                                                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        {updatingId === s.id ? "…" : "❌ Reject"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
