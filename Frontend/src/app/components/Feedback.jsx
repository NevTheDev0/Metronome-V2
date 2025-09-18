"use client";

import { useEffect, useState } from "react";

export default function Feedback({ hits, sessionLogRef, lastAdjustment }) {
    const [streak, setStreak] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [flashMessage, setFlashMessage] = useState(null);

    function average(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    // --- Main feedback calculation ---
    useEffect(() => {
        if (!hits.length) return;

        const latestHit = hits[hits.length - 1];
        if (latestHit.timing === "no-metronome") return;

        // --- Streak update ---
        const newStreak = latestHit.timing === "on-time" ? streak + 1 : 0;
        setStreak(newStreak);

        // Record completed streaks
        if (
            latestHit.timing !== "on-time" &&
            sessionLogRef?.current &&
            newStreak === 0 &&
            streak > 0
        ) {
            if (!Array.isArray(sessionLogRef.current.streakHistory)) {
                sessionLogRef.current.streakHistory = [];
            }
            sessionLogRef.current.streakHistory.push(streak);
        }

        // --- Accuracy update ---
        const hitsWithTiming = hits.filter((h) => h.timing !== "no-metronome");
        const onTimeHits = hitsWithTiming.filter((h) => h.timing === "on-time").length;
        const newAccuracy = hitsWithTiming.length > 0 ? (onTimeHits / hitsWithTiming.length) * 100 : 0;
        setAccuracy(newAccuracy);

        // --- Consistency (derived, no state) ---
        const deltas = hits.filter((h) => h.delta_ms != null).map((h) => h.delta_ms);
        let consistency = 0;
        if (deltas.length > 1) {
            const mean = average(deltas);
            const variance = average(deltas.map((d) => (d - mean) ** 2));
            consistency = Math.sqrt(variance);
        }

        // --- Store in session log ---
        if (sessionLogRef?.current) {
            sessionLogRef.current.accuracy = newAccuracy;
            sessionLogRef.current.consistency = consistency;
        }
    }, [hits, sessionLogRef]); // ⚡ don't include streak here

    // --- Update streak count in session log ---
    useEffect(() => {
        if (sessionLogRef?.current) {
            sessionLogRef.current.streakCount = streak;
        }
    }, [streak, sessionLogRef]);

    // --- Compute consistency on render ---
    const deltas = hits.filter((h) => h.delta_ms != null).map((h) => h.delta_ms);
    let consistency = 0;
    if (deltas.length > 1) {
        const mean = average(deltas);
        const variance = average(deltas.map((d) => (d - mean) ** 2));
        consistency = Math.sqrt(variance);
    }

    useEffect(() => {
        if (!lastAdjustment) return;

        setFlashMessage(null); // reset first
        const timeout = setTimeout(() => setFlashMessage(lastAdjustment.type), 50);
        const hide = setTimeout(() => setFlashMessage(null), 2000);

        return () => {
            clearTimeout(timeout);
            clearTimeout(hide);
        };
    }, [lastAdjustment]);




    return (
        <div className="w-full max-w-md mx-auto bg-neutral-800 text-white p-4 rounded-2xl shadow-lg">
            <h2 className="text-lg font-bold text-center mb-4">Session Feedback</h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
                {/* Accuracy */}
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-green-400">{accuracy.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400">Accuracy</div>
                    <div className="w-full bg-gray-700 h-2 rounded mt-1">
                        <div
                            className="bg-green-500 h-2 rounded"
                            style={{ width: `${accuracy}%` }}
                        />
                    </div>
                </div>

                {/* Streak */}
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-400">{streak}</div>
                    <div className="text-sm text-gray-400">Streak</div>
                </div>

                {/* Consistency */}
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-yellow-400">
                        {consistency.toFixed(1)}ms
                    </div>
                    <div className="text-sm text-gray-400">Consistency</div>
                </div>
            </div>

            {/* Flash Tempo Adjustment */}
            {flashMessage && (
                <div
                    className={`mt-4 text-center text-sm transition-opacity duration-500 ${flashMessage ? "opacity-100" : "opacity-0"
                        }`}
                >
                    {flashMessage === "up" && (
                        <span className="text-green-400">⬆️ Tempo increased</span>
                    )}
                    {flashMessage === "down" && (
                        <span className="text-red-400">⬇️ Tempo decreased</span>
                    )}
                    {flashMessage === "none" && (
                        <span className="text-gray-400">➖ No change</span>
                    )}
                </div>
            )}
        </div>
    );

}
