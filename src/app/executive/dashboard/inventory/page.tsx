"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface InventoryItem {
    id: string; name: string; currentStock: number; unit: string;
    category: string; reorderLevel: number;
}

interface DemandItem { itemName: string; totalDemand: number; activeUsers: number; }

export default function InventoryIntelPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [demand, setDemand] = useState<DemandItem[]>([]);
    const [loading, setLoading] = useState(true);

    const getHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("superAdminToken")}`,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch from stock API (inventory) and live demand
            const [invRes, demandRes] = await Promise.all([
                fetch("/api/executive/inventory", { headers: getHeaders() }),
                fetch("/api/stock/live-demand", {
                    headers: { Authorization: `Bearer ${localStorage.getItem("superAdminToken")}` },
                }),
            ]);

            const invData = await invRes.json();
            const demandData = await demandRes.json();

            if (invData.success) setInventory(invData.items || []);
            if (demandData.success) setDemand(demandData.items || []);
        } catch {
            toast.error("Failed to load inventory data");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zayko-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Compute fast/slow movers from demand data
    const sortedDemand = [...demand].sort((a, b) => b.totalDemand - a.totalDemand);
    const fastMovers = sortedDemand.slice(0, 5);
    const slowMovers = sortedDemand.length > 5 ? sortedDemand.slice(-5).reverse() : [];

    // Low stock items
    const lowStock = inventory
        .filter((i) => i.currentStock <= (i.reorderLevel || 10))
        .sort((a, b) => a.currentStock - b.currentStock);

    return (
        <div className="min-h-screen bg-zayko-900 pb-12">
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">📈</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Inventory Intelligence</h1>
                        <p className="text-xs text-indigo-400">Stock Movement & Demand Forecasting</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
                    {[
                        { label: "Inventory Items", value: inventory.length, icon: "📦", color: "text-indigo-400" },
                        { label: "Active Demands", value: demand.reduce((s, d) => s + d.totalDemand, 0), icon: "📊", color: "text-emerald-400" },
                        { label: "Low Stock Items", value: lowStock.length, icon: "⚠️", color: lowStock.length > 0 ? "text-red-400" : "text-emerald-400" },
                        { label: "Demand Items", value: demand.length, icon: "🔥", color: "text-violet-400" },
                    ].map((c) => (
                        <div key={c.label} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{c.icon}</span>
                                <span className="text-[10px] text-zayko-400 uppercase tracking-wider font-bold">{c.label}</span>
                            </div>
                            <p className={`text-xl font-display font-bold ${c.color}`}>{c.value}</p>
                        </div>
                    ))}
                </div>

                {/* Demand Bar Chart */}
                {sortedDemand.length > 0 && (
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 mb-8 animate-slide-up">
                        <h3 className="text-sm font-display font-bold text-white mb-4">📊 Predicted Demand (Active Student Needs)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sortedDemand.slice(0, 10)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                    <YAxis dataKey="itemName" type="category" tick={{ fill: "#9ca3af", fontSize: 10 }} width={120} />
                                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                    <Bar dataKey="totalDemand" fill="#6366f1" radius={[0, 6, 6, 0]} name="Total Demand" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Fast/Slow Movers + Low Stock */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
                    {/* Fast Movers */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl p-6">
                        <h3 className="text-sm font-display font-bold text-white mb-4">🚀 Fast Moving Items</h3>
                        {fastMovers.length === 0 ? (
                            <p className="text-sm text-zayko-500 text-center py-4">No demand data</p>
                        ) : (
                            <div className="space-y-2">
                                {fastMovers.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                                        <span className="text-sm text-white font-semibold truncate">{item.itemName}</span>
                                        <span className="text-sm font-bold text-emerald-400">{item.totalDemand} units</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Slow Movers */}
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6">
                        <h3 className="text-sm font-display font-bold text-white mb-4">🐌 Slow Moving Items</h3>
                        {slowMovers.length === 0 ? (
                            <p className="text-sm text-zayko-500 text-center py-4">Not enough data</p>
                        ) : (
                            <div className="space-y-2">
                                {slowMovers.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                                        <span className="text-sm text-white font-semibold truncate">{item.itemName}</span>
                                        <span className="text-sm font-bold text-amber-400">{item.totalDemand} units</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Low Stock Alert */}
                    <div className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-2xl p-6">
                        <h3 className="text-sm font-display font-bold text-white mb-4">⚠️ Low Stock Alert</h3>
                        {lowStock.length === 0 ? (
                            <p className="text-sm text-emerald-400 text-center py-4">All items well-stocked ✓</p>
                        ) : (
                            <div className="space-y-2">
                                {lowStock.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-xl">
                                        <span className="text-sm text-white font-semibold truncate">{item.name}</span>
                                        <span className="text-sm font-bold text-red-400">{item.currentStock} {item.unit}</span>
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
