"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const noop = () => { };

export default function Metronome({
    bpm = 120,
    beatsPerMeasure = 4,
    isPlaying = false,
    accentFirstBeat = true,
    accentColor = "blue",
    beatColor = "lightblue",
    onTick = noop,
    audioContextRef,
    metronomeTicksRef,
    subdivision = 1, // 1 = quarter, 2 = eighth, 4 = sixteenth
    sessionLogRef
}) {
    // --- UI state ---
    const [currentBeat, setCurrentBeat] = useState(1);
    const [isAccentUI, setIsAccentUI] = useState(true);

    // --- Logic refs ---
    const currentBeatRef = useRef(1);
    const currentSubBeatRef = useRef(1);
    const counterRef = useRef(0);
    const timerRef = useRef(null);

    // --- Audio-related refs ---
    const lastClickTimeRef = useRef(0);
    const audioNodesRef = useRef([]);

    // --- Stable tick callback ---
    const handleTick = useCallback((tick) => {
        if (metronomeTicksRef?.current) {
            metronomeTicksRef.current.push(tick);
        }
        onTick(tick);
    }, [onTick, metronomeTicksRef]);

    // Clean up audio nodes
    const cleanupAudioNodes = useCallback(() => {
        audioNodesRef.current.forEach(node => {
            try {
                if (node && node.stop) {
                    node.stop();
                }
            } catch (e) {
                // Node might already be stopped
            }
        });
        audioNodesRef.current = [];
    }, []);

    useEffect(() => {
        if (!isPlaying) {
            cleanupAudioNodes();
            return;
        }

        //Start the Session
        if (sessionLogRef?.current && !sessionLogRef.current.sessionActive) {
            sessionLogRef.current.sessionActive = true;
            sessionLogRef.current.startTime = performance.now();
        }

        const intervalMs = 60000 / bpm / subdivision;

        const tickFunction = () => {
            const now = performance.now();

            // Prevent rapid-fire clicks
            if (now - lastClickTimeRef.current < intervalMs * 0.8) {
                return;
            }
            lastClickTimeRef.current = now;

            const tick = {
                timestamp_ms: now,
                beatNumber: currentBeatRef.current,
                subBeatNumber: currentSubBeatRef.current,
                tickIndex: counterRef.current++,
            };

            // --- Push to shared array + fire callback ---
            handleTick(tick);

            // --- Accent calculation ---
            const isSubBeatStart = currentSubBeatRef.current === 1;
            const isAccent = accentFirstBeat && currentBeatRef.current === 1 && isSubBeatStart;

            setCurrentBeat(currentBeatRef.current);
            setIsAccentUI(isAccent);

            // --- Play click sound with better error handling ---
            try {
                let ctx = audioContextRef?.current;
                if (!ctx || ctx.state === 'closed') {
                    console.log('Audio context not ready, skipping sound');
                    return;
                }

                if (ctx.state === 'suspended') {
                    ctx.resume().then(() => {
                        playClickSound(ctx, isAccent);
                    }).catch(err => {
                        console.warn('Failed to resume audio context:', err);
                    });
                } else {
                    playClickSound(ctx, isAccent);
                }
            } catch (error) {
                console.warn('Audio playback error:', error);
            }

            // --- Increment sub-beat ---
            currentSubBeatRef.current = (currentSubBeatRef.current % subdivision) + 1;

            // --- Increment main beat if sub-beat rolled over ---
            if (currentSubBeatRef.current === 1) {
                currentBeatRef.current = (currentBeatRef.current % beatsPerMeasure) + 1;
            }
        };

        const playClickSound = (ctx, isAccent) => {
            try {
                // Clean up old nodes first
                cleanupAudioNodes();

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.frequency.value = isAccent ? 1200 : 800;
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(isAccent ? 0.3 : 0.2, ctx.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

                osc.connect(gain);
                gain.connect(ctx.destination);

                const stopTime = ctx.currentTime + 0.1;
                osc.start(ctx.currentTime);
                osc.stop(stopTime);

                // Track this node for cleanup
                audioNodesRef.current.push(osc);

                // Auto-cleanup after the sound finishes
                setTimeout(() => {
                    audioNodesRef.current = audioNodesRef.current.filter(node => node !== osc);
                }, 150);

            } catch (audioError) {
                console.warn('Failed to play click sound:', audioError);
            }
        };

        // 🔹 Fire first tick immediately
        tickFunction();

        // 🔹 Start interval loop
        timerRef.current = setInterval(tickFunction, intervalMs);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            cleanupAudioNodes();
        };
    }, [isPlaying, bpm, beatsPerMeasure, subdivision, accentFirstBeat, handleTick, audioContextRef, cleanupAudioNodes]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupAudioNodes();
        };
    }, [cleanupAudioNodes]);

    // --- Render beat indicators ---
    return (
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            {Array.from({ length: beatsPerMeasure }, (_, i) => {
                const beatIndex = i + 1;
                const isActive = beatIndex === currentBeat;
                const isAccent = isActive && isAccentUI;

                return (
                    <div
                        key={beatIndex}
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: isActive
                                ? isAccent
                                    ? accentColor
                                    : beatColor
                                : "#ccc",
                            transform: isActive ? "scale(1.2)" : "scale(1)",
                            transition: "all 0.1s ease",
                        }}
                    />
                );
            })}
        </div>
    );
}