"use client";

import { useEffect, useState } from "react";

export default function Feedback({ hits, sessionLogRef }) {
    const [streak, setStreak] = useState(0);
    const [accuracy, setAccuracy] = useState(0);

    useEffect(() => {
        if (!hits.length) return;

        const latestHit = hits[hits.length - 1];
        if (latestHit.timing === "no-metronome") return;

        // --- Streak update ---
        const newStreak = latestHit.timing === "on-time" ? streak + 1 : 0;
        setStreak(newStreak);

        // Record completed streaks
        if (latestHit.timing !== "on-time" && sessionLogRef?.current && newStreak === 0 && streak > 0) {
            if (!Array.isArray(sessionLogRef.current.streakHistory)) {
                sessionLogRef.current.streakHistory = [];
            }
            sessionLogRef.current.streakHistory.push(streak);
        }

        // --- Accuracy update ---
        const hitsWithTiming = hits.filter(h => h.timing !== "no-metronome");
        const onTimeHits = hitsWithTiming.filter(h => h.timing === "on-time").length;
        const newAccuracy = hitsWithTiming.length > 0 ? (onTimeHits / hitsWithTiming.length) * 100 : 0;
        setAccuracy(newAccuracy);

        if (sessionLogRef?.current) {
            sessionLogRef.current.accuracy = newAccuracy;
        }
    }, [hits, sessionLogRef]); // ⚡ remove streak from dependencies


    // Update current streak in session log
    useEffect(() => {
        if (sessionLogRef?.current) {
            sessionLogRef.current.streakCount = streak;
        }
    }, [streak, sessionLogRef]);

    return (
        <div style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#595959",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold"
        }}>
            <div>Current Streak: {streak}</div>
            <div>Accuracy: {accuracy.toFixed(1)}%</div>
        </div>
    );
}
