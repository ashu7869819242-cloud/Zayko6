"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#8b5cf6"];

export default function FinancialPage() {
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

    const fin = (data?.financial || {}) as Record<string, unknown>;
    const dailyTrend = (fin.dailyTrend || []) as Array<{ label: string; total: number; razorpay: number; wallet: number }>;
    const monthlyTrend = (fin.monthlyTrend || []) as Array<{ label: string; total: number }>;

    return (
        <div className="min-h-screen bg-zayko-900 pb-12">
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">💰</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Financial Analytics</h1>
                        <p className="text-xs text-indigo-400">Revenue Breakdown & Trends</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Revenue Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
                    {[
                        { label: "Total Revenue", value: `₹${((fin.totalRevenue as number) || 0).toLocaleString()}`, color: "text-emerald-400" },
                        { label: "Razorpay", value: `₹${((fin.razorpayRevenue as number) || 0).toLocaleString()}`, color: "text-indigo-400" },
                        { label: "Wallet", value: `₹${((fin.walletRevenue as number) || 0).toLocaleString()}`, color: "text-violet-400" },
                        { label: "This Week", value: `₹${((fin.weekRevenue as number) || 0).toLocaleString()}`, color: "text-blue-400" },
                    ].map((c) => (
                        <div key={c.label} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4">
                            <p className="text-[10px] text-zayko-400 uppercase tracking-wider font-bold mb-1">{c.label}</p>
                            <p className={`text-xl font-display font-bold ${c.color}`}>{c.value}</p>
                        </div>
                    ))}
                </div>

                {/* Daily Revenue Trend with Stacked */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 mb-8 animate-slide-up">
                    <h3 className="text-sm font-display font-bold text-white mb-4">📈 Daily Revenue (Razorpay vs Wallet)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrend}>
                                <defs>
                                    <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="walletGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                <Area type="monotone" dataKey="razorpay" stackId="1" stroke="#6366f1" fill="url(#rpGrad)" name="Razorpay (₹)" />
                                <Area type="monotone" dataKey="wallet" stackId="1" stroke="#8b5cf6" fill="url(#walletGrad)" name="Wallet (₹)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly + Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 animate-slide-up">
                        <h3 className="text-sm font-display font-bold text-white mb-4">📊 Monthly Revenue</h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                    <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} name="Revenue (₹)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 animate-slide-up">
                        <h3 className="text-sm font-display font-bold text-white mb-4">💳 Payment Method Distribution</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "Razorpay", value: (fin.razorpayPct as number) || 0 },
                                            { name: "Wallet", value: (fin.walletPct as number) || 0 },
                                        ]}
                                        cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                                        paddingAngle={5} dataKey="value"
                                    >
                                        {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span><span className="text-xs text-zayko-400">Razorpay {(fin.razorpayPct as number) || 0}%</span></div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-500"></span><span className="text-xs text-zayko-400">Wallet {(fin.walletPct as number) || 0}%</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
