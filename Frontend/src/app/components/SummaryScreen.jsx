"use client";

export default function SummaryScreen({ summary, onRestart }) {
    if (!summary) {
        return (
            <div className="w-full max-w-md mx-auto bg-neutral-800 text-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-lg font-bold text-center">No session data yet</h2>
            </div>
        );
    }

    const longestStreak = summary.streakHistory?.length
        ? Math.max(...summary.streakHistory)
        : 0;

    const durationSec = summary.startedAt && summary.endedAt
        ? Math.round((summary.endedAt - summary.startedAt) / 1000)
        : 0;

    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationFormatted = `${minutes}m ${seconds}s`;

    const accuracy = summary.accuracy ?? 0;
    const consistency = summary.consistency ?? 0;

    // Label accuracy qualitatively
    let accuracyLabel = "Needs Work";
    if (accuracy >= 80) accuracyLabel = "Excellent!";
    else if (accuracy >= 60) accuracyLabel = "Solid";

    return (
        <div className="w-full max-w-md mx-auto bg-neutral-800 text-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold text-center mb-4">Session Summary</h2>
            <p className="text-center text-gray-400 mb-6">
                Duration: {durationFormatted}
            </p>

            {/* Hero stat */}
            <div className="flex flex-col items-center mb-8">
                <div className="text-5xl font-bold text-green-400">
                    {accuracy.toFixed(1)}%
                </div>
                <div className="text-lg text-gray-300">{accuracyLabel}</div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-blue-400">
                        {longestStreak}
                    </div>
                    <div className="text-sm text-gray-400">Longest Streak</div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-yellow-400">
                        {consistency.toFixed(1)}ms
                    </div>
                    <div className="text-sm text-gray-400">Consistency</div>
                </div>

                <div className="flex flex-col items-center col-span-2">
                    <div className="text-2xl font-bold text-purple-400">
                        {summary.bpmStart} → {summary.bpmEnd}
                    </div>
                    <div className="text-sm text-gray-400">Tempo Progression</div>
                </div>
            </div>

            {/* Per hand performance */}
            {summary.perHand && (
                <div className="mb-6">
                    <h3 className="text-md font-semibold mb-2 text-center">
                        Per-Hand Performance
                    </h3>
                    <div className="flex justify-between px-4">
                        <div className="text-left">
                            <div className="font-bold text-green-400">
                                {summary.perHand.left.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-400">Left Hand</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-green-400">
                                {summary.perHand.right.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-400">Right Hand</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={onRestart}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
                >
                    Restart Session
                </button>
            </div>
        </div>
    );
}
