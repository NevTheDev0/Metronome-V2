"use client";
import { useEffect, useRef, useState } from "react";
import PoseWebcam from "./components/Pose";
import MIDIThing from "./components/Midi";
import Metronome from "./components/Metronome";
import Feedback from "./components/Feedback";
import SummaryScreen from "./components/SummaryScreen";

export default function Home() {
  // --- References & Session State ---
  const poseFramesRef = useRef([]);
  const metronomeTicksRef = useRef([]);
  const audioContextRef = useRef(null);
  const poseWebcamRef = useRef(null);

  const sessionLogRef = useRef({
    startTime: null,
    endTime: null,
    sessionActive: false,
    bpm: 120,
    subdivision: 1,
    hits: [],
    streakCount: 0,
    streakHistory: [],
    accuracy: 0,
  });

  // --- Local State ---
  const [bpm, setBpm] = useState(120);
  const [lastAdjustment, setLastAdjustment] = useState(null);
  const [subdivision, setSubdivision] = useState(1);
  const [hits, setHits] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [summary, setSummary] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);

  // --- Adaptive Tempo Effect ---
  useEffect(() => {
    if (!isPlaying || !adaptiveMode) return;
    const interval = setInterval(() => {
      const accuracy = sessionLogRef.current.accuracy;
      setBpm((prevBpm) => {
        let updated = prevBpm;
        if (accuracy > 80) {
          setLastAdjustment({ type: "up", id: Date.now() });
          updated = Math.min(prevBpm + 2, 240);
        } else if (accuracy < 70) {
          setLastAdjustment({ type: "down", id: Date.now() });
          updated = Math.max(prevBpm - 2, 40);
        } else {
          setLastAdjustment({ type: "none", id: Date.now() });
        }
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, adaptiveMode]);

  // --- Start Session ---
  function handleStartSession() {
    sessionLogRef.current.startTime = performance.now();
    sessionLogRef.current.sessionActive = true;
    setSessionActive(true);
  }

  // --- End Session ---
  function handleEndSession() {
    sessionLogRef.current.sessionActive = false;
    sessionLogRef.current.endTime = performance.now();

    setSummary({
      ...sessionLogRef.current,
      bpmStart: 120,
      bpmEnd: bpm,
      startedAt: sessionLogRef.current.startTime,
      endedAt: performance.now(),
    });

    setSessionActive(false);
    setIsPlaying(false);

    if (poseWebcamRef.current) {
      poseWebcamRef.current.stopCamera();
    }
  }

  // --- Reset Session ---
  function handleResetSession() {
    setIsPlaying(false);

    sessionLogRef.current = {
      startTime: null,
      endTime: null,
      sessionActive: false,
      bpm: 120,
      subdivision: 1,
      hits: [],
      streakCount: 0,
      streakHistory: [],
      accuracy: 0,
      consistency: 0,
    };
    poseFramesRef.current = [];
    metronomeTicksRef.current = [];

    setBpm(120);
    setSubdivision(1);
    setHits([]);
    setLastAdjustment(null);
    setAdaptiveMode(false);
    setSummary(null);
    setSessionId((prev) => prev + 1);
    setSessionActive(true);
  }

  // --- Audio Setup ---
  const initializeAudio = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        setAudioInitialized(true);
      } catch (err) {
        console.error("Audio init failed:", err);
      }
    }
  };

  // --- Tick Management ---
  const tickCount = useRef(0);
  const handleMetronomeTick = () => {
    tickCount.current++;
    if (tickCount.current % 10 === 0) {
      metronomeTicksRef.current = metronomeTicksRef.current.filter(
        (t) => performance.now() - t.timestamp_ms < 5000
      );
    }
  };

  // --- Metronome Toggle ---
  const handleToggleMetronome = async () => {
    if (!audioInitialized) await initializeAudio();
    setIsPlaying((prev) => !prev);
  };

  // --- UI Branching ---
  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Music Trainer</h1>

      {sessionActive ? (
        // --- PRACTICE MODE ---
        <>
          <section className="flex justify-center items-start gap-8 mb-8">
            {/* Left Side - Controls */}
            <div className="w-72 bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-4">
              {/* Metronome Toggle */}
              <button
                onClick={handleToggleMetronome}
                className={`w-full py-3 rounded-xl font-semibold transition-colors duration-200 ${isPlaying
                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                    : "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                  }`}
              >
                {isPlaying ? "Stop Metronome" : "Start Metronome"}
              </button>

              {/* BPM */}
              <label className="flex items-center justify-between text-sm">
                <span>BPM: {bpm}</span>
                <input
                  type="range"
                  min="40"
                  max="240"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-32 accent-sky-400"
                />
              </label>

              {/* Subdivision */}
              <label className="flex items-center justify-between text-sm">
                <span>Subdivision</span>
                <select
                  value={subdivision}
                  onChange={(e) => setSubdivision(Number(e.target.value))}
                  className="ml-2 bg-neutral-800 text-white border border-gray-600 rounded-md px-2 py-1 text-sm"
                >
                  <option value={1}>Quarter</option>
                  <option value={2}>Eighth</option>
                  <option value={4}>Sixteenth</option>
                </select>
              </label>

              {/* Metronome */}
              <div className="pt-4 border-t border-gray-700">
                <Metronome
                  key={sessionId}
                  bpm={bpm}
                  subdivision={subdivision}
                  isPlaying={isPlaying}
                  metronomeTicksRef={metronomeTicksRef}
                  onTick={handleMetronomeTick}
                  audioContextRef={audioContextRef}
                  sessionLogRef={sessionLogRef}
                />
              </div>

              {/* Adaptive Mode */}
              <div>
                <button
                  onClick={() => setAdaptiveMode((prev) => !prev)}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors duration-200 ${adaptiveMode
                      ? "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-red-500/30"
                      : "bg-purple-500 hover:bg-purple-600 shadow-lg shadow-green-500/30"
                    }`}
                >
                  {adaptiveMode ? "Disable Adaptive" : "Enable Adaptive"}
                </button>
              </div>
            </div>

            {/* Center - Webcam */}
            <div className="flex-shrink-0">
              <PoseWebcam poseFramesRef={poseFramesRef} sessionActive={sessionActive} ref={poseWebcamRef} />
            </div>

            {/* Right Side - Feedback + End Session */}
            <div className="w-72 bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-4">
              <h2 className="text-xl font-bold mb-4 text-center">
                Live Feedback
              </h2>
              <Feedback
                hits={hits}
                sessionLogRef={sessionLogRef}
                isPlaying={isPlaying}
                lastAdjustment={lastAdjustment}
                key={sessionId}
              />

              {/* End Session Button (moved here) */}
              <button
                onClick={handleEndSession}
                className="w-full py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-colors duration-200 mt-6"
              >
                End Session
              </button>
            </div>
          </section>

          {/* MIDI */}
          <section className="flex justify-center mt-4">
            <MIDIThing
              key={sessionId}
              sessionLogRef={sessionLogRef}
              poseFramesRef={poseFramesRef}
              metronomeTicksRef={metronomeTicksRef}
              audioContextRef={audioContextRef}
              subdivision={subdivision}
              bpm={bpm}
              onHit={(hit) => setHits((prev) => [...prev, hit])}
            />
          </section>
        </>
      ) : summary ? (
        // --- SUMMARY MODE ---
        <SummaryScreen summary={summary} onRestart={handleResetSession} />
      ) : (
        // --- EMPTY STATE ---
        <div className="flex flex-col items-center justify-center mt-20 space-y-6">
          <p className="text-gray-400 text-lg">Ready to start your practice?</p>
          <button
            onClick={handleStartSession}
            className="px-8 py-4 rounded-2xl font-bold text-lg bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 transition-transform transform hover:scale-105"
          >
            Start Session
          </button>
        </div>
      )}
    </main>
  );
}
