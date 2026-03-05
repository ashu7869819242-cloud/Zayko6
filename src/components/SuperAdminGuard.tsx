/**
 * SuperAdminGuard — Server-Verified Super Admin Route Protection
 * Mirrors StockManagerGuard.tsx pattern.
 */

"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("superAdminToken");

        if (!token) {
            router.push("/executive");
            setChecking(false);
            return;
        }

        fetch("/api/executive/verify", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.valid) {
                    setAuthorized(true);
                } else {
                    localStorage.removeItem("superAdminToken");
                    router.push("/executive");
                }
            })
            .catch(() => {
                localStorage.removeItem("superAdminToken");
                router.push("/executive");
            })
            .finally(() => setChecking(false));
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zayko-900">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!authorized) return null;

    return <>{children}</>;
}
