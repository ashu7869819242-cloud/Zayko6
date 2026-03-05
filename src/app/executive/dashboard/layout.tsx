"use client";
import React, { useState } from "react";
import SuperAdminGuard from "@/components/SuperAdminGuard";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
    { href: "/executive/dashboard", label: "Overview", icon: "📊", exact: true },
    { href: "/executive/dashboard/financial", label: "Financial", icon: "💰" },
    { href: "/executive/dashboard/orders", label: "Orders", icon: "📦" },
    { href: "/executive/dashboard/menu", label: "Menu Performance", icon: "🍽️" },
    { href: "/executive/dashboard/inventory", label: "Inventory Intel", icon: "📈" },
];

export default function ExecutiveDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.exact) return pathname === item.href;
        return pathname.startsWith(item.href);
    };

    const handleLogout = () => {
        localStorage.removeItem("superAdminToken");
        router.push("/executive");
    };

    return (
        <SuperAdminGuard>
            <div className="min-h-screen bg-zayko-900 flex">
                {/* ─── Sidebar (Desktop) ─── */}
                <aside className="hidden md:flex flex-col w-64 bg-zayko-800 border-r border-zayko-700 fixed h-full z-30">
                    {/* Logo */}
                    <div className="p-6 border-b border-zayko-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl border border-indigo-500/20">👑</div>
                            <div>
                                <h1 className="text-base font-display font-bold text-white">Executive Panel</h1>
                                <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Zayko Analytics</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(item)
                                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5"
                                    : "text-zayko-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Bottom */}
                    <div className="p-4 border-t border-zayko-700 space-y-2">
                        <div className="px-4 py-2 text-[10px] text-zayko-500 uppercase tracking-wider font-bold">
                            🔒 Read-Only Access
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <span className="text-lg">🚪</span>
                            Logout
                        </button>
                    </div>
                </aside>

                {/* ─── Mobile Header ─── */}
                <div className="md:hidden fixed top-0 left-0 right-0 bg-zayko-800 border-b border-zayko-700 z-40">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-white/5 text-white">
                                {sidebarOpen ? "✕" : "☰"}
                            </button>
                            <span className="text-sm font-display font-bold text-white">👑 Executive Panel</span>
                        </div>
                        <button onClick={handleLogout} className="text-xs text-red-400 font-semibold">Logout</button>
                    </div>

                    {sidebarOpen && (
                        <div className="bg-zayko-800 border-t border-zayko-700 p-4 space-y-1 animate-slide-up">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(item)
                                        ? "bg-indigo-500/15 text-indigo-400"
                                        : "text-zayko-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Main Content ─── */}
                <main className="flex-1 md:ml-64 mt-14 md:mt-0">
                    {children}
                </main>
            </div>
        </SuperAdminGuard>
    );
}
