"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface MenuItem { name: string; revenue: number; qty: number; }

export default function MenuPerformancePage() {
    const [topItems, setTopItems] = useState<MenuItem[]>([]);
    const [bottomItems, setBottomItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/executive/analytics", {
            headers: { Authorization: `Bearer ${localStorage.getItem("superAdminToken")}` },
        })
            .then((r) => r.json())
            .then((d) => {
                if (d.success) {
                    setTopItems(d.menu?.topItems || []);
                    setBottomItems(d.menu?.bottomItems || []);
                }
            })
            .catch(() => toast.error("Failed to load"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-zayko-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const allItems = [...topItems];
    const totalRevenue = allItems.reduce((s, i) => s + i.revenue, 0);
    const totalQty = allItems.reduce((s, i) => s + i.qty, 0);

    return (
        <div className="min-h-screen bg-zayko-900 pb-12">
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">🍽️</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Menu Performance</h1>
                        <p className="text-xs text-indigo-400">Item Sales & Revenue Analysis</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in">
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                        <p className="text-[10px] text-zayko-400 uppercase tracking-wider font-bold mb-1">Total Menu Revenue</p>
                        <p className="text-xl font-display font-bold text-indigo-400">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                        <p className="text-[10px] text-zayko-400 uppercase tracking-wider font-bold mb-1">Total Items Sold</p>
                        <p className="text-xl font-display font-bold text-emerald-400">{totalQty.toLocaleString()}</p>
                    </div>
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                        <p className="text-[10px] text-zayko-400 uppercase tracking-wider font-bold mb-1">Unique Items</p>
                        <p className="text-xl font-display font-bold text-violet-400">{allItems.length}</p>
                    </div>
                </div>

                {/* Top Items Chart */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 mb-8 animate-slide-up">
                    <h3 className="text-sm font-display font-bold text-white mb-4">🔥 Top Selling Items (by Revenue)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems.slice(0, 10)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={120} />
                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} name="Revenue (₹)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Items List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performers */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl p-6 animate-slide-up">
                        <h3 className="text-sm font-display font-bold text-white mb-4">🏆 Top Performers</h3>
                        <div className="space-y-3">
                            {topItems.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                                        <span className="text-sm text-white font-semibold truncate">{item.name}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-emerald-400">₹{item.revenue.toLocaleString()}</p>
                                        <p className="text-[10px] text-zayko-500">{item.qty} sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Low Performers */}
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6 animate-slide-up">
                        <h3 className="text-sm font-display font-bold text-white mb-4">⚠️ Low Performers</h3>
                        {bottomItems.length === 0 ? (
                            <div className="text-center py-8 text-zayko-500 text-sm">Not enough data</div>
                        ) : (
                            <div className="space-y-3">
                                {bottomItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                                        <span className="text-sm text-white font-semibold truncate">{item.name}</span>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-amber-400">₹{item.revenue.toLocaleString()}</p>
                                            <p className="text-[10px] text-zayko-500">{item.qty} sold</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
