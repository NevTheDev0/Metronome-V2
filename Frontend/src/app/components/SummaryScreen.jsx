"use client";

function analyzePredictions(sessionLog) {
    const predictions = sessionLog.predictions || [];
    const actualHits = sessionLog.hits || [];

    if (predictions.length === 0) {
        return null;
    }

    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const MATCH_WINDOW_MS = 150; // ±150ms tolerance

    // Find true positives and false positives
    const matchedPredictions = new Set();
    predictions.forEach(pred => {
        if (pred.predicted_class !== 1) return; // Only count positive predictions

        const matchingHit = actualHits.find(hit =>
            Math.abs(hit.timestamp - pred.timestamp_ms) < MATCH_WINDOW_MS
        );

        if (matchingHit) {
            truePositives++;
            matchedPredictions.add(pred.timestamp_ms);
        } else {
            falsePositives++;
        }
    });

    // Find false negatives (hits that weren't predicted)
    actualHits.forEach(hit => {
        const matchingPred = predictions.find(pred =>
            pred.predicted_class === 1 &&
            Math.abs(pred.timestamp_ms - hit.timestamp) < MATCH_WINDOW_MS
        );
        if (!matchingPred) {
            falseNegatives++;
        }
    });

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;

    // Calculate average prediction confidence for hits
    const hitPredictions = predictions.filter(p => p.predicted_class === 1);
    const avgConfidence = hitPredictions.length > 0
        ? hitPredictions.reduce((sum, p) => sum + p.probability, 0) / hitPredictions.length
        : 0;

    return {
        truePositives,
        falsePositives,
        falseNegatives,
        precision,
        recall,
        f1,
        totalPredictions: predictions.length,
        totalHitPredictions: hitPredictions.length,
        avgConfidence
    };
}

export default function SummaryScreen({ summary, onRestart }) {
    if (!summary) {
        return (
            <div className="w-full max-w-2xl mx-auto bg-neutral-800 text-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-lg font-bold text-center">No session data yet</h2>
            </div>
        );
    }

    const longestStreak = summary.streakHistory?.length
        ? Math.max(...summary.streakHistory)
        : 0;

    const durationSec =
        summary.startTime && summary.endTime
            ? Math.round((summary.endTime - summary.startTime) / 1000)
            : 0;

    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationFormatted = `${minutes}m ${seconds}s`;

    const accuracy = summary.accuracy ?? 0;
    const consistency = summary.consistency ?? 0;
    const rollingAccuracy = summary.rollingAccuracy ?? 0;

    let accuracyLabel = "Needs Work";
    if (accuracy >= 80) accuracyLabel = "Excellent!";
    else if (accuracy >= 60) accuracyLabel = "Solid";

    // ML Analysis
    const mlAnalysis = analyzePredictions(summary);

    return (
        <div className="w-full max-w-2xl mx-auto bg-neutral-800 text-white p-6 rounded-2xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center mb-2">Session Summary</h2>
            <p className="text-center text-gray-400 mb-6">
                Duration: {durationFormatted}
            </p>

            {/* Drumming Performance */}
            <div className="bg-neutral-900 p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-sky-400">🥁 Drumming Performance</h3>

                <div className="flex flex-col items-center mb-6">
                    <div className="text-5xl font-bold text-green-400">
                        {accuracy.toFixed(1)}%
                    </div>
                    <div className="text-lg text-gray-300">{accuracyLabel}</div>
                    <div className="text-sm text-gray-500 mt-1">
                        Final Accuracy
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-blue-400">{longestStreak}</div>
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

                {summary.perHand && (
                    <div className="mt-6">
                        <h4 className="text-md font-semibold mb-2 text-center text-gray-300">
                            Per-Hand Performance
                        </h4>
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
            </div>

            {/* ML Model Performance */}
            {mlAnalysis && (
                <div className="bg-neutral-900 p-6 rounded-xl border-2 border-orange-500/30">
                    <h3 className="text-lg font-semibold mb-4 text-orange-400">🤖 ML Model Performance</h3>

                    <div className="space-y-4">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-neutral-800 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-green-400">
                                    {(mlAnalysis.precision * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Precision</div>
                                <div className="text-xs text-gray-500">(accuracy of predictions)</div>
                            </div>

                            <div className="bg-neutral-800 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400">
                                    {(mlAnalysis.recall * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-400 mt-1">Recall</div>
                                <div className="text-xs text-gray-500">(hits detected)</div>
                            </div>

                            <div className="bg-neutral-800 p-3 rounded-lg">
                                <div className="text-2xl font-bold text-purple-400">
                                    {(mlAnalysis.f1 * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-400 mt-1">F1 Score</div>
                                <div className="text-xs text-gray-500">(overall quality)</div>
                            </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="bg-neutral-800 p-4 rounded-lg space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">True Positives:</span>
                                <span className="text-green-400 font-semibold">{mlAnalysis.truePositives}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">False Positives:</span>
                                <span className="text-orange-400 font-semibold">{mlAnalysis.falsePositives}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">False Negatives:</span>
                                <span className="text-red-400 font-semibold">{mlAnalysis.falseNegatives}</span>
                            </div>
                            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                                <span className="text-gray-400">Total Predictions:</span>
                                <span className="text-white font-semibold">{mlAnalysis.totalHitPredictions} / {mlAnalysis.totalPredictions} frames</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Avg Confidence:</span>
                                <span className="text-sky-400 font-semibold">{(mlAnalysis.avgConfidence * 100).toFixed(1)}%</span>
                            </div>
                        </div>

                        {/* Interpretation */}
                        <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg text-xs">
                            <p className="text-orange-300 font-semibold mb-1">📊 What this means:</p>
                            <ul className="text-gray-400 space-y-1 list-disc list-inside">
                                <li><strong className="text-white">Precision:</strong> When the model predicts a hit, how often is it correct?</li>
                                <li><strong className="text-white">Recall:</strong> Of all your actual hits, what % did the model catch?</li>
                                <li><strong className="text-white">F1 Score:</strong> Overall model quality (balance of precision/recall)</li>
                            </ul>
                        </div>

                        {/* Performance verdict */}
                        <div className="text-center">
                            {mlAnalysis.f1 >= 0.8 ? (
                                <p className="text-green-400 font-semibold">🎯 Excellent model performance!</p>
                            ) : mlAnalysis.f1 >= 0.6 ? (
                                <p className="text-yellow-400 font-semibold">⚠️ Model needs more training data</p>
                            ) : (
                                <p className="text-red-400 font-semibold">❌ Model struggling - collect more diverse data</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!mlAnalysis && (
                <div className="bg-neutral-900 p-6 rounded-xl border-2 border-gray-700">
                    <h3 className="text-lg font-semibold mb-2 text-gray-400">🤖 ML Model Performance</h3>
                    <p className="text-gray-500 text-sm">No predictions recorded. Make sure the backend is running.</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4">
                <button
                    onClick={onRestart}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg font-semibold transition-colors"
                >
                    Start New Session
                </button>
            </div>

            {/* Debug info */}
            <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-400">Debug Info</summary>
                <div className="mt-2 bg-neutral-900 p-3 rounded font-mono">
                    <p>Hits logged: {summary.hits?.length || 0}</p>
                    <p>Frames logged: {summary.frames?.length || 0}</p>
                    <p>Predictions logged: {summary.predictions?.length || 0}</p>
                </div>
            </details>
        </div>
    );
}