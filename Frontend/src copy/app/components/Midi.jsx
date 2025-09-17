"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export default function MIDIThing({
    sessionLogRef,
    poseFramesRef,
    metronomeTicksRef,
    audioContextRef,
    subdivision = 1,
    bpm = 120,
    onHit
}) {
    const midiInput = useRef(null);
    const [lastTiming, setLastTiming] = useState(null);
    const [flashColor, setFlashColor] = useState(null);
    const sessionStartTime = useRef(performance.now());
    const DEBUG = true;

    const log = (...args) => { if (DEBUG) console.log(...args); };

    const padPositions = {
        36: { x: 0, y: 0, z: 0 },
        38: { x: 0, y: 1, z: 0 },
        42: { x: 1, y: 1, z: 0 },
        46: { x: 1, y: 0, z: 0 },
        50: { x: 0.5, y: 0.5, z: 0 },
    };

    const computeDistance = useCallback((a, b) => {
        if (!a || !b) return Infinity;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z ?? 0) - (b.z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, []);

    const updateUI = (timingString, color) => {
        setLastTiming(timingString);
        setFlashColor(color);
        setTimeout(() => setFlashColor(null), 150);
    };

    useEffect(() => {
        async function initMIDI() {
            try {
                const access = await navigator.requestMIDIAccess();
                if (!access) return log("No MIDI access");
                midiInput.current = access.inputs.values().next().value;
                if (midiInput.current) midiInput.current.onmidimessage = onNoteOn;
            } catch (err) {
                console.error("MIDI init failed:", err);
            }
        }
        initMIDI();
        return () => {
            if (midiInput.current) midiInput.current.onmidimessage = null;
        };
    }, []);

    const onNoteOn = useCallback((message) => {
        const [status, noteNumber, velocity] = message.data;
        if ((status & 0xf0) !== 0x90 || velocity === 0) return;

        const padPosition = padPositions[noteNumber];
        if (!padPosition) return;

        const timestamp = performance.now();

        const HitEvent = {
            timestamp,
            timestamp_ms_relative: timestamp - sessionStartTime.current,
            note: noteNumber,
            velocity,
            hand: null,
            pose: null,
            padPosition,
            timing: "no-metronome",
            closestTick: null,
            delta_ms: null,
            subBeatNumber: null
        };

        // Pose association
        let closestFrame = null;
        let minDiff = Infinity;
        if (poseFramesRef?.current?.length) {
            for (const frame of poseFramesRef.current) {
                const diff = Math.abs(frame.timestamp - timestamp);
                if (diff < minDiff || (diff === minDiff && frame.timestamp > closestFrame?.timestamp)) {
                    minDiff = diff;
                    closestFrame = frame;
                }
            }
            if (closestFrame) {
                const leftDist = computeDistance(closestFrame.leftWrist, padPosition);
                const rightDist = computeDistance(closestFrame.rightWrist, padPosition);
                HitEvent.hand = leftDist < rightDist ? "left" : rightDist < leftDist ? "right" : "unknown";
                HitEvent.pose = { leftWrist: closestFrame.leftWrist, rightWrist: closestFrame.rightWrist };
            }
        }

        // Timing calculation
        const msPerBeat = 60000 / bpm;
        const msPerSubBeat = msPerBeat / subdivision;
        const tolerance = msPerSubBeat * 0.2;

        log(`Hit at ${timestamp.toFixed(1)}ms, msPerSubBeat: ${msPerSubBeat.toFixed(1)}, tolerance: ±${tolerance.toFixed(1)}`);

        if (!Array.isArray(metronomeTicksRef?.current) || metronomeTicksRef.current.length === 0) {
            log("No metronome ticks available");
            HitEvent.timing = "no-metronome";
        } else {
            const timeWindow = msPerBeat * 2;
            const candidateTicks = metronomeTicksRef.current.filter(tick => {
                const timeDiff = Math.abs(timestamp - tick.timestamp_ms);
                return timeDiff <= timeWindow && tick.timestamp_ms && !isNaN(tick.timestamp_ms);
            });
            log(`Found ${candidateTicks.length} candidate ticks`);

            let closestTick = null;
            let smallestDelta = Infinity;

            for (const tick of candidateTicks) {
                const delta = timestamp - tick.timestamp_ms;
                const absDelta = Math.abs(delta);
                log(`Tick ${tick.beatNumber}.${tick.subBeatNumber}: delta=${delta.toFixed(1)}ms`);

                if (absDelta < Math.abs(smallestDelta)) {
                    closestTick = tick;
                    smallestDelta = delta;
                    log("→ New closest tick");
                } else if (Math.abs(smallestDelta) < 15 && absDelta < 15 && tick.timestamp_ms > (closestTick?.timestamp_ms || 0)) {
                    closestTick = tick;
                    smallestDelta = delta;
                    log("→ Anti-jitter: prefer newer tick");
                } else if (Math.abs(absDelta - Math.abs(smallestDelta)) < 50 && tick.timestamp_ms > (closestTick?.timestamp_ms || 0)) {
                    closestTick = tick;
                    smallestDelta = delta;
                    log("→ Similar delta: prefer newer tick");
                }
            }

            if (closestTick) {
                HitEvent.closestTick = closestTick;
                HitEvent.delta_ms = smallestDelta;
                HitEvent.subBeatNumber = closestTick.subBeatNumber;
                HitEvent.timing = Math.abs(smallestDelta) <= tolerance ? "on-time" : smallestDelta < 0 ? "early" : "late";
                log(`Closest tick: ${closestTick.beatNumber}.${closestTick.subBeatNumber}, delta: ${smallestDelta.toFixed(1)}ms`);
                log(`Classification: ${HitEvent.timing}`);
            } else {
                HitEvent.timing = "no-metronome";
                log("No valid closest tick found");
            }
        }

        // --- Fixed safe logging with proper object structure ---
        if (sessionLogRef?.current) {
            // Initialize sessionLogRef structure if needed
            if (!sessionLogRef.current.startTime) {
                sessionLogRef.current.startTime = sessionStartTime.current;
            }
            if (!sessionLogRef.current.bpm) {
                sessionLogRef.current.bpm = bpm;
            }
            if (!sessionLogRef.current.subdivision) {
                sessionLogRef.current.subdivision = subdivision;
            }
            if (!Array.isArray(sessionLogRef.current.hits)) {
                sessionLogRef.current.hits = [];
            }

            // Push the HitEvent
            sessionLogRef.current.hits.push(HitEvent);
        } else {
            console.warn("sessionLogRef not provided, skipping logging");
        }

        if (onHit) {
            onHit(HitEvent);
        }

        // UI feedback
        const deltaDisplay = HitEvent.delta_ms !== null ? HitEvent.delta_ms.toFixed(1) : "N/A";
        const timingString = `${HitEvent.timing} (${deltaDisplay} ms)`;
        const color = HitEvent.timing === "on-time" ? "limegreen" : HitEvent.timing === "early" ? "orange" : HitEvent.timing === "late" ? "red" : "gray";
        updateUI(timingString, color);

        // Audio feedback
        try {
            let ctx = audioContextRef?.current;
            if (!ctx) {
                audioContextRef.current = new AudioContext();
                ctx = audioContextRef.current;
                if (ctx.state === 'suspended') ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = HitEvent.timing === "on-time" ? 1000 : HitEvent.timing === "early" ? 600 : HitEvent.timing === "late" ? 300 : 500;
            gain.gain.value = 0.15;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (audioError) {
            log("Audio feedback failed:", audioError);
        }

    }, [padPositions, bpm, subdivision, computeDistance, poseFramesRef, sessionLogRef, metronomeTicksRef, audioContextRef, onHit]);

    return (
        <div style={{
            marginTop: "16px",
            padding: "12px",
            border: `4px solid ${flashColor || "transparent"}`,
            borderRadius: "8px",
            transition: "border-color 0.15s ease",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: flashColor ? `${flashColor}22` : "transparent"
        }}>
            {lastTiming || "Waiting for hits..."}
        </div>
    );
}