"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Suggestion {
    id: string;
    itemName: string;
    category: string | null;
    description: string | null;
    expectedPrice: number | null;
    totalYesVotes: number;
    totalNoVotes: number;
    totalVotes: number;
    supportPercentage: number;
    userVote: "yes" | "no" | null;
    isOwner: boolean;
    createdAt: string;
}

export default function SuggestionsPage() {
    const { user, loading, getIdToken } = useAuth();
    const router = useRouter();

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [userVotes, setUserVotes] = useState<Record<string, "yes" | "no">>({});
    const [sugLoading, setSugLoading] = useState(true);
    const [votingId, setVotingId] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [expectedPrice, setExpectedPrice] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Filter
    const [sortMode, setSortMode] = useState<"popular" | "newest">("popular");

    useEffect(() => {
        if (!loading && !user) router.push("/auth");
    }, [user, loading, router]);

    // Real-time Firestore listener for suggestions
    useEffect(() => {
        const q = query(
            collection(db, "itemSuggestions"),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                const items = snap.docs.map((d) => {
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
                        totalYesVotes: totalYes,
                        totalNoVotes: totalNo,
                        totalVotes,
                        supportPercentage: totalVotes > 0 ? Math.round((totalYes / totalVotes) * 100) : 0,
                        userVote: null,
                        isOwner: data.requestedBy?.[0] === user?.uid,
                        createdAt: data.createdAt,
                    } as Suggestion;
                });
                setSuggestions(items);
                setSugLoading(false);
            },
            (err) => {
                console.error("[Suggestions] onSnapshot error:", err);
                setSugLoading(false);
            }
        );
        return () => unsub();
    }, [user]);

    // Fetch user's votes from API (one-time on mount)
    const fetchUserVotes = useCallback(async () => {
        if (!user) return;
        const token = await getIdToken();
        if (!token) return;
        try {
            const res = await fetch("/api/suggestions", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.success) {
                const votes: Record<string, "yes" | "no"> = {};
                for (const s of json.suggestions) {
                    if (s.userVote) votes[s.id] = s.userVote;
                }
                setUserVotes(votes);
            }
        } catch (err) {
            console.error("[Suggestions] Failed to fetch votes:", err);
        }
    }, [user, getIdToken]);

    useEffect(() => {
        fetchUserVotes();
    }, [fetchUserVotes]);

    // Cast / change vote
    const handleVote = async (suggestionId: string, vote: "yes" | "no") => {
        if (votingId) return;
        const token = await getIdToken();
        if (!token) return;

        setVotingId(suggestionId);

        // Optimistic update
        setUserVotes((prev) => ({ ...prev, [suggestionId]: vote }));

        try {
            const res = await fetch("/api/suggestions/vote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ suggestionId, vote }),
            });
            const json = await res.json();
            if (!json.success) {
                toast.error(json.error || "Failed to vote");
                // Revert
                setUserVotes((prev) => {
                    const copy = { ...prev };
                    delete copy[suggestionId];
                    return copy;
                });
            }
        } catch {
            toast.error("Failed to vote");
            setUserVotes((prev) => {
                const copy = { ...prev };
                delete copy[suggestionId];
                return copy;
            });
        }
        setVotingId(null);
    };

    // Submit new suggestion
    const handleSubmit = async () => {
        if (!itemName.trim() || itemName.trim().length < 2) {
            return toast.error("Item name must be at least 2 characters");
        }

        setSubmitting(true);
        const token = await getIdToken();
        if (!token) { setSubmitting(false); return; }

        try {
            const data: Record<string, unknown> = { itemName: itemName.trim() };
            if (category.trim()) data.category = category.trim();
            if (description.trim()) data.description = description.trim();
            if (expectedPrice && Number(expectedPrice) > 0) data.expectedPrice = Number(expectedPrice);

            const res = await fetch("/api/suggestions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            const json = await res.json();

            if (json.success) {
                toast.success("Suggestion submitted! 💡");
                setItemName("");
                setCategory("");
                setDescription("");
                setExpectedPrice("");
                setShowForm(false);
                // Auto-set user vote for the new suggestion
                if (json.suggestionId) {
                    setUserVotes((prev) => ({ ...prev, [json.suggestionId]: "yes" }));
                }
            } else if (json.existingSuggestionId) {
                toast("This item already exists — vote on it! 👆", { icon: "💡" });
            } else {
                toast.error(json.error || "Failed to submit");
            }
        } catch {
            toast.error("Something went wrong");
        }
        setSubmitting(false);
    };

    // Sort suggestions
    const sorted = [...suggestions].sort((a, b) => {
        if (sortMode === "popular") return b.totalYesVotes - a.totalYesVotes;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-zayko-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zayko-900 pb-24">
            {/* Header */}
            <div className="bg-zayko-800/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-4 sm:px-6 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs hover:bg-white/10 transition-all">←</Link>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl shadow-lg shadow-purple-500/5">🗳️</div>
                        <div>
                            <h1 className="text-lg font-display font-bold text-white uppercase tracking-tight">Student Suggestions</h1>
                            <p className="text-[10px] text-zayko-400 font-bold tracking-widest uppercase">Vote for your favorites</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn-gold text-sm py-2 px-4"
                    >
                        + Suggest
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-3 gap-3"
                >
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-display font-bold text-white">{suggestions.length}</p>
                        <p className="text-[10px] text-zayko-400 font-bold uppercase tracking-wider">Active</p>
                    </div>
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-display font-bold text-emerald-400">
                            {suggestions.reduce((sum, s) => sum + s.totalYesVotes, 0)}
                        </p>
                        <p className="text-[10px] text-zayko-400 font-bold uppercase tracking-wider">Total Votes</p>
                    </div>
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-display font-bold text-gold-400">
                            {Object.keys(userVotes).length}
                        </p>
                        <p className="text-[10px] text-zayko-400 font-bold uppercase tracking-wider">My Votes</p>
                    </div>
                </motion.div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zayko-400 font-semibold">Sort:</span>
                    {(["popular", "newest"] as const).map((mode) => (
                        <button key={mode} onClick={() => setSortMode(mode)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${sortMode === mode
                                ? "bg-gold-500 text-zayko-900"
                                : "bg-white/[0.06] text-zayko-400 border border-white/[0.08] hover:bg-white/[0.1]"}`}>
                            {mode === "popular" ? "🔥 Popular" : "🕐 Newest"}
                        </button>
                    ))}
                </div>

                {/* Suggestion Form Modal */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowForm(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-zayko-800 border border-zayko-700 rounded-2xl p-6 w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-sm">✨</span>
                                    New Suggestion
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-zayko-400 block mb-1">Item Name *</label>
                                        <input
                                            type="text" value={itemName}
                                            onChange={(e) => setItemName(e.target.value)}
                                            placeholder="e.g. Cheese Maggi, Cold Coffee…"
                                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-zayko-400 block mb-1">Category</label>
                                            <input
                                                type="text" value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                placeholder="e.g. Snacks"
                                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-zayko-400 block mb-1">Expected Price</label>
                                            <input
                                                type="number" value={expectedPrice}
                                                onChange={(e) => setExpectedPrice(e.target.value)}
                                                placeholder="₹" min={0}
                                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zayko-400 block mb-1">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Any details about the item…" rows={2}
                                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-5">
                                    <button onClick={() => setShowForm(false)}
                                        className="flex-1 px-4 py-3 bg-zayko-700 text-zayko-300 rounded-xl hover:bg-zayko-600 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleSubmit} disabled={submitting}
                                        className="flex-1 btn-gold py-3">
                                        {submitting ? "Submitting…" : "Submit 🚀"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Suggestions List */}
                {sugLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sorted.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16 bg-white/[0.03] rounded-3xl border border-white/[0.05]"
                    >
                        <div className="text-5xl mb-3">📭</div>
                        <h3 className="text-lg font-display font-bold text-white mb-1">No suggestions yet</h3>
                        <p className="text-sm text-zayko-400">Be the first to suggest an item!</p>
                        <button onClick={() => setShowForm(true)}
                            className="mt-4 btn-gold text-sm py-2 px-6">
                            + Suggest Item
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {sorted.map((s, idx) => {
                            const myVote = userVotes[s.id] || null;
                            const isVoting = votingId === s.id;
                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                                    className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 sm:p-5 hover:border-zayko-600 transition-all"
                                >
                                    {/* Top row: name, category, badge */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-bold text-white text-base">{s.itemName}</span>
                                                {s.category && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{s.category}</span>
                                                )}
                                                {s.isOwner && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-bold">YOU</span>
                                                )}
                                            </div>
                                            {s.description && (
                                                <p className="text-xs text-zayko-400 line-clamp-2">{s.description}</p>
                                            )}
                                            {s.expectedPrice && (
                                                <p className="text-xs text-zayko-500 mt-1">💰 Expected: ₹{s.expectedPrice}</p>
                                            )}
                                        </div>

                                        {/* Support badge */}
                                        <div className="text-center shrink-0">
                                            <div className={`text-2xl font-display font-bold ${s.supportPercentage >= 60 ? "text-emerald-400" : s.supportPercentage < 40 ? "text-red-400" : "text-yellow-400"}`}>
                                                {s.supportPercentage}%
                                            </div>
                                            <p className="text-[9px] text-zayko-500 font-bold uppercase">Support</p>
                                        </div>
                                    </div>

                                    {/* Support bar */}
                                    <div className="w-full h-2 bg-zayko-700 rounded-full overflow-hidden mb-3">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 ease-out"
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

                                    {/* Bottom row: vote counts + vote buttons */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-zayko-500">
                                            <span className="flex items-center gap-1">
                                                👍 <strong className="text-emerald-400">{s.totalYesVotes}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                👎 <strong className="text-red-400">{s.totalNoVotes}</strong>
                                            </span>
                                            <span>{s.totalVotes} total</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVote(s.id, "yes")}
                                                disabled={isVoting}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${myVote === "yes"
                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                    } disabled:opacity-50`}
                                            >
                                                👍 Yes{myVote === "yes" ? "!" : ""}
                                            </button>
                                            <button
                                                onClick={() => handleVote(s.id, "no")}
                                                disabled={isVoting}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${myVote === "no"
                                                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105"
                                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                                    } disabled:opacity-50`}
                                            >
                                                👎 No{myVote === "no" ? "!" : ""}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
