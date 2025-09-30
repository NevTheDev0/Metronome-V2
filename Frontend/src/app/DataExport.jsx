"use client";
import { useState } from "react";

export default function DataExport({ sessionLogRef }) {
    const [isExporting, setIsExporting] = useState(false);
    const [lastExportStats, setLastExportStats] = useState(null);

    function exportSessionData() {
        if (!sessionLogRef.current?.hits || sessionLogRef.current.hits.length === 0) {
            alert("No session data to export!");
            return;
        }

        setIsExporting(true);

        try {
            // Combine hit frames and non-hit frames
            const allFrames = [];

            // Add hit frames
            sessionLogRef.current.hits.forEach(hit => {
                if (hit.pose) {
                    allFrames.push({
                        timestamp_ms_relative: hit.timestamp_ms_relative,
                        frame_type: "hit",
                        left_wrist_x: hit.pose.leftWrist?.x || null,
                        left_wrist_y: hit.pose.leftWrist?.y || null,
                        left_wrist_z: hit.pose.leftWrist?.z || null,
                        left_wrist_velocity: hit.pose.leftWrist?.velocity || null,
                        left_wrist_height: hit.pose.leftWrist?.height || null,
                        left_wrist_acceleration: hit.pose.leftWrist?.acceleration || null,
                        right_wrist_x: hit.pose.rightWrist?.x || null,
                        right_wrist_y: hit.pose.rightWrist?.y || null,
                        right_wrist_z: hit.pose.rightWrist?.z || null,
                        right_wrist_velocity: hit.pose.rightWrist?.velocity || null,
                        right_wrist_height: hit.pose.rightWrist?.height || null,
                        right_wrist_acceleration: hit.pose.rightWrist?.acceleration || null,
                        hand: hit.hand,
                        pad_zone: hit.note, // MIDI note number as pad zone
                        hit_velocity: hit.velocity,
                        target: 1 // This is a hit frame
                    });
                }
            });

            // Add non-hit frames from sessionLogRef
            if (sessionLogRef.current.frames) {
                sessionLogRef.current.frames.forEach(frame => {
                    if (frame.frame_type === "non-hit") {
                        allFrames.push({
                            timestamp_ms_relative: frame.timestamp_ms_relative,
                            frame_type: "non-hit",
                            left_wrist_x: frame.left_wrist?.x || null,
                            left_wrist_y: frame.left_wrist?.y || null,
                            left_wrist_z: frame.left_wrist?.z || null,
                            left_wrist_velocity: frame.left_wrist?.velocity || null,
                            left_wrist_height: frame.left_wrist?.height || null,
                            left_wrist_acceleration: frame.left_wrist?.acceleration || null,
                            right_wrist_x: frame.right_wrist?.x || null,
                            right_wrist_y: frame.right_wrist?.y || null,
                            right_wrist_z: frame.right_wrist?.z || null,
                            right_wrist_velocity: frame.right_wrist?.velocity || null,
                            right_wrist_height: frame.right_wrist?.height || null,
                            right_wrist_acceleration: frame.right_wrist?.acceleration || null,
                            hand: null,
                            pad_zone: null,
                            hit_velocity: null,
                            target: 0 // This is a non-hit frame
                        });
                    }
                });
            }

            // Sort by timestamp
            allFrames.sort((a, b) => a.timestamp_ms_relative - b.timestamp_ms_relative);

            // Convert to CSV
            const headers = [
                'timestamp_ms_relative', 'frame_type', 'left_wrist_x', 'left_wrist_y', 'left_wrist_z',
                'left_wrist_velocity', 'left_wrist_height', 'left_wrist_acceleration',
                'right_wrist_x', 'right_wrist_y', 'right_wrist_z', 'right_wrist_velocity',
                'right_wrist_height', 'right_wrist_acceleration', 'hand', 'pad_zone',
                'hit_velocity', 'target'
            ];

            const csvContent = [
                headers.join(','),
                ...allFrames.map(frame => headers.map(header => frame[header] ?? '').join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `drumming_session_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            const hitCount = allFrames.filter(f => f.target === 1).length;
            const nonHitCount = allFrames.filter(f => f.target === 0).length;

            setLastExportStats({
                totalFrames: allFrames.length,
                hitFrames: hitCount,
                nonHitFrames: nonHitCount,
                timestamp: new Date().toLocaleTimeString()
            });

            console.log(`Exported ${allFrames.length} frames (${hitCount} hits, ${nonHitCount} non-hits)`);

        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed. Check console for details.");
        } finally {
            setIsExporting(false);
        }
    }

    const hasData = sessionLogRef.current?.hits?.length > 0;

    return (
        <div className="space-y-3">
            <button
                onClick={exportSessionData}
                disabled={!hasData || isExporting}
                className={`w-full py-3 rounded-xl font-semibold transition-colors duration-200 ${!hasData || isExporting
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                    }`}
            >
                {isExporting ? "Exporting..." : "Export Training Data"}
            </button>

            {lastExportStats && (
                <div className="text-xs text-gray-400 bg-neutral-800 p-2 rounded-lg">
                    <div>Last export ({lastExportStats.timestamp}):</div>
                    <div>{lastExportStats.totalFrames} total frames</div>
                    <div className="flex justify-between">
                        <span>{lastExportStats.hitFrames} hits</span>
                        <span>{lastExportStats.nonHitFrames} non-hits</span>
                    </div>
                </div>
            )}
        </div>
    );
}