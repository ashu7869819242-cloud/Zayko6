/**
 * TTS API — ElevenLabs Text-to-Speech proxy
 * 
 * Keeps the API key server-side. Returns audio/mpeg stream.
 * Falls back gracefully — client uses browser SpeechSynthesis if this fails.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
// Rachel — warm female voice
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string" || text.length > 500) {
            return NextResponse.json({ error: "Invalid text" }, { status: 400 });
        }

        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.3,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            console.error("ElevenLabs error:", response.status, await response.text());
            return NextResponse.json({ error: "TTS failed" }, { status: 502 });
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("TTS API error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
