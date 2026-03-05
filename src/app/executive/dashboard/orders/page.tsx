"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line,
} from "recharts";

export default function OrdersPage() {
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/executive/analytics", {
            headers: { Authorization: `Bearer ${localStorage.getItem("superAdminToken")}` },
        })
            .then((r) => r.json())
            .then((d) => { if (d.success) setData(d); })
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

    const ord = (data?.orders || {}) as Record<string, unknown>;
    const fin = (data?.financial || {}) as Record<string, unknown>;
    const hourlyData = (ord.hourlyData || []) as Array<{ hour: number; label: string; orders: number }>;
    const dailyTrend = (fin.dailyTrend || []) as Array<{ label: string; orders: number }>;

    // Build day-of-week heatmap from hourly data
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className="min-h-screen bg-zayko-900 pb-12">
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">📦</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Order Analytics</h1>
                        <p className="text-xs text-indigo-400">Volume, Patterns & Customer Behavior</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 animate-fade-in">
                    {[
                        { label: "Total Orders", value: ((ord.totalOrders as number) || 0).toLocaleString(), icon: "📦", color: "text-indigo-400" },
                        { label: "Today", value: ((ord.todayOrders as number) || 0).toLocaleString(), icon: "📅", color: "text-blue-400" },
                        { label: "Avg Value", value: `₹${(ord.avgOrderValue as number) || 0}`, icon: "🎯", color: "text-emerald-400" },
                        { label: "Repeat Rate", value: `${(ord.repeatRate as number) || 0}%`, icon: "🔁", color: "text-purple-400" },
                        { label: "Peak Hour", value: (ord.peakHour as string) || "–", icon: "⏰", color: "text-amber-400" },
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

                {/* Hourly Heatmap */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 mb-8 animate-slide-up">
                    <h3 className="text-sm font-display font-bold text-white mb-4">⏰ Orders per Hour</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 9 }} interval={1} />
                                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                                    {hourlyData.map((entry, i) => {
                                        const maxOrders = Math.max(...hourlyData.map((h) => h.orders), 1);
                                        const intensity = entry.orders / maxOrders;
                                        const r = Math.round(99 + intensity * 0);
                                        const g = Math.round(102 + intensity * 0);
                                        const b = Math.round(241);
                                        const alpha = 0.3 + intensity * 0.7;
                                        return <Bar key={i} dataKey="orders" fill={`rgba(${r}, ${g}, ${b}, ${alpha})`} />;
                                    })}
                                    {hourlyData.map((entry, i) => {
                                        const maxOrders = Math.max(...hourlyData.map((h) => h.orders), 1);
                                        const intensity = entry.orders / maxOrders;
                                        const alpha = 0.3 + intensity * 0.7;
                                        return (
                                            <rect
                                                key={`cell-${i}`}
                                                fill={`rgba(99, 102, 241, ${alpha})`}
                                            />
                                        );
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Orders Trend */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 mb-8 animate-slide-up">
                    <h3 className="text-sm font-display font-bold text-white mb-4">📈 Daily Order Volume (30 Days)</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} name="Orders" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customer Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 rounded-2xl p-6">
                        <h3 className="text-sm font-display font-bold text-white mb-4">👥 Customer Insights</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Total Unique Customers</span>
                                <span className="text-lg font-display font-bold text-indigo-400">{((ord.totalUsers as number) || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Repeat Customers</span>
                                <span className="text-lg font-display font-bold text-violet-400">{((ord.repeatUsers as number) || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Repeat Rate</span>
                                <span className="text-lg font-display font-bold text-emerald-400">{(ord.repeatRate as number) || 0}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-2xl p-6">
                        <h3 className="text-sm font-display font-bold text-white mb-4">🎯 Order Performance</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Average Order Value</span>
                                <span className="text-lg font-display font-bold text-blue-400">₹{(ord.avgOrderValue as number) || 0}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Peak Hour</span>
                                <span className="text-lg font-display font-bold text-cyan-400">{(ord.peakHour as string) || "–"}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-zayko-300">Orders at Peak</span>
                                <span className="text-lg font-display font-bold text-emerald-400">{(ord.peakHourOrders as number) || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
