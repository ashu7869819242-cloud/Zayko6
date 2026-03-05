"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface IntroScreenProps {
    onComplete: () => void;
}

const TAGLINE = "Smart. Fast. AI Powered Canteen.";
const AUTHOR_NAME = "Shudhanshu Pandey";

export default function IntroScreen({ onComplete }: IntroScreenProps) {
    const [phase, setPhase] = useState(0);
    // 0=mount, 1=bg+zayko, 2=tagline, 3=author, 4=exit

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 300),      // BG fade-in + ZAYKO zoom
            setTimeout(() => setPhase(2), 1800),      // Tagline
            setTimeout(() => setPhase(3), 2800),      // Author name
            setTimeout(() => setPhase(4), 4500),      // Begin exit
            setTimeout(() => onComplete(), 5200),     // Unmount after fade
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {phase < 5 && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={phase >= 4 ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                >
                    {/* ── Blurred ambient background fill ── */}
                    <div className="absolute inset-0">
                        <Image
                            src="/splash-bg.jpg"
                            alt=""
                            fill
                            className="object-cover scale-125 blur-2xl opacity-60"
                            sizes="100vw"
                            quality={30}
                        />
                    </div>

                    {/* ── Main Image (full visible) with Ken Burns ── */}
                    <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 5, ease: "easeOut" }}
                    >
                        <Image
                            src="/splash-bg.jpg"
                            alt="Splash Background"
                            fill
                            priority
                            className="object-contain"
                            sizes="100vw"
                            quality={90}
                        />
                    </motion.div>

                    {/* ── Dark Gradient Overlay ── */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/40 z-[1]" />

                    {/* ── Radial spotlight glow ── */}
                    <div className="absolute inset-0 z-[2] splash-spotlight" />

                    {/* ── Floating Glass Orbs ── */}
                    <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="splash-orb"
                                style={{
                                    width: `${20 + i * 12}px`,
                                    height: `${20 + i * 12}px`,
                                    top: `${10 + i * 15}%`,
                                    left: `${5 + (i * 17) % 80}%`,
                                    animationDelay: `${i * 0.8}s`,
                                    animationDuration: `${8 + i * 2}s`,
                                }}
                            />
                        ))}
                    </div>

                    {/* ── Text Content ── */}
                    <div className="relative z-10 text-center px-6 flex flex-col items-center">
                        {/* ZAYKO Title */}
                        <AnimatePresence>
                            {phase >= 1 && (
                                <motion.h1
                                    className="splash-title font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-wider mb-3 select-none"
                                    initial={{
                                        opacity: 0,
                                        scale: 0.6,
                                        filter: "blur(12px)",
                                        y: 20,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        filter: "blur(0px)",
                                        y: 0,
                                    }}
                                    transition={{
                                        duration: 1,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                >
                                    ZAYKO
                                </motion.h1>
                            )}
                        </AnimatePresence>

                        {/* Tagline */}
                        <AnimatePresence>
                            {phase >= 2 && (
                                <motion.p
                                    className="text-white/60 text-xs sm:text-sm md:text-base font-light tracking-[0.25em] uppercase mb-6"
                                    initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    transition={{
                                        duration: 0.6,
                                        ease: [0.25, 0.46, 0.45, 0.94],
                                    }}
                                >
                                    {TAGLINE}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Divider line */}
                        <AnimatePresence>
                            {phase >= 2 && (
                                <motion.div
                                    className="w-16 h-[1px] bg-gradient-to-r from-transparent via-gold-400/60 to-transparent mb-6"
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Made by + Author */}
                        <AnimatePresence>
                            {phase >= 3 && (
                                <motion.div
                                    className="relative"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <motion.p
                                        className="text-white/40 text-[10px] sm:text-xs tracking-[0.4em] uppercase mb-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        Made by
                                    </motion.p>
                                    <motion.h2
                                        className="splash-author font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-wide"
                                        initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                        transition={{
                                            duration: 0.7,
                                            delay: 0.15,
                                            ease: [0.25, 0.46, 0.45, 0.94],
                                        }}
                                    >
                                        {AUTHOR_NAME.split("").map((char, i) => (
                                            <motion.span
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    delay: 0.2 + i * 0.04,
                                                    ease: "easeOut",
                                                }}
                                            >
                                                {char}
                                            </motion.span>
                                        ))}
                                    </motion.h2>

                                    {/* Glow underline */}
                                    <motion.div
                                        className="splash-glow-underline mt-3"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{
                                            duration: 0.8,
                                            delay: 0.7,
                                            ease: [0.25, 0.46, 0.45, 0.94],
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Bottom Gradient Fade ── */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-[3]" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
