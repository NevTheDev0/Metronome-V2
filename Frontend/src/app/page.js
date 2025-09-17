"use client";
import { useRef, useState } from "react";
import PoseWebcam from "./components/Pose";
import MIDIThing from "./components/Midi";
import Metronome from "./components/Metronome";
import Feedback from "./components/Feedback";

export default function Home() {
  // --- References & Session State ---
  const poseFramesRef = useRef([]);
  const metronomeTicksRef = useRef([]);
  const audioContextRef = useRef(null);

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
  const [subdivision, setSubdivision] = useState(1);
  const [hits, setHits] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

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

  // --- UI ---
  return (
    <main className="min-h-screen bg-neutral-950 text-gray-200 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Music Trainer</h1>

      {/* --- Main Layout: Controls + Webcam + Feedback --- */}
      <section className="flex justify-center items-start gap-8 mb-8">
        {/* Left Side - Controls */}
        <div className="w-72 bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-4">
          {/* Start/Stop */}
          <button
            onClick={async () => {
              if (!audioInitialized) await initializeAudio();
              setIsPlaying((prev) => {
                const next = !prev;
                if (!next && sessionLogRef.current.sessionActive) {
                  sessionLogRef.current.sessionActive = false;
                  sessionLogRef.current.endTime = performance.now();
                }
                return next;
              });
            }}
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

          {/* Metronome Component */}
          <div className="pt-4 border-t border-gray-700">
            <Metronome
              bpm={bpm}
              subdivision={subdivision}
              isPlaying={isPlaying}
              metronomeTicksRef={metronomeTicksRef}
              onTick={handleMetronomeTick}
              audioContextRef={audioContextRef}
              sessionLogRef={sessionLogRef}
            />
          </div>
        </div>

        {/* Center - Webcam */}
        <div className="flex-shrink-0">
          <PoseWebcam poseFramesRef={poseFramesRef} />
        </div>

        {/* Right Side - Feedback */}
        <div className="w-72 bg-neutral-900 p-6 rounded-2xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold mb-4 text-center">Live Feedback</h2>
          <Feedback hits={hits} sessionLogRef={sessionLogRef} isPlaying={isPlaying} />
        </div>
      </section>

      {/* --- MIDI Thing (below webcam) --- */}
      <section className="flex justify-center mt-4">
        <MIDIThing
          sessionLogRef={sessionLogRef}
          poseFramesRef={poseFramesRef}
          metronomeTicksRef={metronomeTicksRef}
          audioContextRef={audioContextRef}
          subdivision={subdivision}
          bpm={bpm}
          onHit={(hit) => setHits((prev) => [...prev, hit])}
        />
      </section>
    </main>
  );
}