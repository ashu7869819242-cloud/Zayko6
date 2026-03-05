"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ExecutiveLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/executive/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();
            if (data.success) {
                localStorage.setItem("superAdminToken", data.token);
                toast.success("Welcome, Chairman! 👑");
                router.push("/executive/dashboard");
            } else {
                toast.error(data.error || "Invalid credentials");
            }
        } catch {
            toast.error("Login failed. Try again.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-zayko-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="w-20 h-20 bg-indigo-500/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl border border-indigo-500/20">
                        👑
                    </div>
                    <h1 className="text-3xl font-display font-bold text-white">Executive Panel</h1>
                    <p className="text-zayko-400 mt-1">Zayko Business Intelligence</p>
                </div>

                <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4 animate-slide-up">
                    <div>
                        <label className="text-sm font-medium text-zayko-300 mb-1 block">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-zayko-300 mb-1 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 transition-all duration-200 shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>Access Dashboard 👑</>
                        )}
                    </button>
                </form>

                <p className="text-center text-zayko-600 text-xs mt-6">
                    Executive Analytics • Read-Only Access
                </p>
            </div>
        </div>
    );
}
