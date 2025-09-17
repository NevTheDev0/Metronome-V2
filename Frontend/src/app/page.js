"use client";
import { useRef, useState } from "react";
import PoseWebcam from "./components/Pose";
import MIDIThing from "./components/Midi";
import Metronome from "./components/Metronome";
import Feedback from "./components/Feedback";

export default function Home() {
  const poseFramesRef = useRef([]);

  // Fix 1: Initialize sessionLogRef as an object, not array
  const sessionLogRef = useRef({
    startTime: null,
    endTime: null,
    sessionActive: false,
    bpm: 120,
    subdivision: 1,
    hits: [],
    streakCount: 0,
    streakHistory: [],
    accuracy: 0
  });

  const metronomeTicksRef = useRef([]);
  const [subdivision, setSubdivision] = useState(1);
  const audioContextRef = useRef(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [hits, setHits] = useState([]);

  // Initialize audio context on user interaction
  const initializeAudio = async () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        setAudioInitialized(true);
        console.log('Audio context initialized');
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  };
  const [lastTiming, setLastTiming] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  // Fix 3: Less frequent cleanup - only every 10 ticks
  let tickCount = useRef(0);
  const handleMetronomeTick = () => {
    tickCount.current++;
    if (tickCount.current % 10 === 0) {
      metronomeTicksRef.current = metronomeTicksRef.current.filter(
        t => performance.now() - t.timestamp_ms < 5000
      );
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h1>Music Trainer</h1>

      {/* --- Metronome Controls --- */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={async () => {
            // Ensure audio is ready
            if (!audioInitialized) {
              await initializeAudio();
            }

            // Toggle metronome
            setIsPlaying(prev => {
              const nextIsPlaying = !prev;

              // If stopping, mark session as ended
              if (!nextIsPlaying && sessionLogRef.current.sessionActive) {
                sessionLogRef.current.sessionActive = false;
                sessionLogRef.current.endTime = performance.now();
                console.log("Session ended at", sessionLogRef.current.endTime);
              }

              return nextIsPlaying;
            });
          }}
        >
          {isPlaying ? "Stop Metronome" : "Start Metronome"}
        </button>


        <div style={{ marginTop: "8px" }}>
          <label>
            BPM: {bpm}
            <input
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              style={{ marginLeft: "8px" }}
            />
          </label>
          <div style={{ marginTop: "8px" }}>
            <label>
              Subdivision:
              <select
                value={subdivision}
                onChange={e => setSubdivision(Number(e.target.value))}
                style={{
                  marginLeft: "8px",
                  backgroundColor: "#222",
                  color: "#eee",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  padding: "2px 6px",
                }}
              >
                <option value={1}>Quarter Notes</option>
                <option value={2}>Eighth Notes</option>
                <option value={4}>Sixteenth Notes</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* --- Webcam + Metronome --- */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
        <PoseWebcam poseFramesRef={poseFramesRef} />

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

      {/* --- MIDI Component --- */}
      <MIDIThing
        sessionLogRef={sessionLogRef}
        poseFramesRef={poseFramesRef}
        metronomeTicksRef={metronomeTicksRef}
        audioContextRef={audioContextRef}
        subdivision={subdivision}
        bpm={bpm}
        onHit={hit => setHits(prev => [...prev, hit])}
      />

      <Feedback
        hits={hits}
        sessionLogRef={sessionLogRef}
      />
    </div>
  );
}