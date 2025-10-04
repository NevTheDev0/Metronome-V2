"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// --- START: Configuration Update ---
// Using the deployed Hugging Face Space URL for the backend API
const API_BASE_URL = 'https://nevthedev7-metronome-v2-api.hf.space';
// --- END: Configuration Update ---

const PoseWebcam = forwardRef(({ poseFramesRef, sessionActive, sessionLogRef }, ref) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const drawingUtilsRef = useRef(null);
    const rAFRef = useRef(null);
    const frameCountRef = useRef(0);

    const MAX_FRAME_AGE_MS = 200;

    const [error, setError] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [stream, setStream] = useState(null);
    const [lastPrediction, setLastPrediction] = useState(null);
    const [backendStatus, setBackendStatus] = useState('checking');

    // Check backend on mount, now using the Hugging Face URL
    useEffect(() => {
        fetch(`${API_BASE_URL}/`)
            .then(res => res.json())
            .then(data => {
                console.log('Backend status:', data);
                // Assuming the backend response structure is correct
                setBackendStatus(data.model_loaded ? 'online' : 'model_error');
            })
            .catch(() => setBackendStatus('offline'));
    }, []);

    async function initPose() {
        try {
            const resolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            poseRef.current = await PoseLandmarker.createFromOptions(resolver, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
                },
                runningMode: "VIDEO",
                numPoses: 1,
                minPoseDetectionConfidence: 0.4,
                minTrackingConfidence: 0.4,
            });

            setIsModelLoaded(true);
            console.log("Pose model loaded!");
        } catch (err) {
            console.error("Failed to load pose model:", err);
            setError(`Failed to load pose model: ${err.message}`);
        }
    }

    async function startCamera() {
        if (!isModelLoaded) return;

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            videoRef.current.srcObject = mediaStream;
            setIsCameraOn(true);
            await videoRef.current.play();

            // Reset backend buffers when starting new session, using the Hugging Face URL
            if (backendStatus === 'online') {
                fetch(`${API_BASE_URL}/reset`, { method: 'POST' })
                    .catch(err => console.warn('Failed to reset backend:', err));
            }
        } catch (err) {
            console.error("Camera error:", err);
            setError(`Camera error: ${err.message}`);
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            poseFramesRef.current = [];
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsCameraOn(false);

        if (rAFRef.current) {
            cancelAnimationFrame(rAFRef.current);
            rAFRef.current = null;
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        drawingUtilsRef.current = null;
    }

    function predictWebcam() {
        if (!isCameraOn || !poseRef.current || !videoRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!drawingUtilsRef.current) drawingUtilsRef.current = new DrawingUtils(ctx);
        const drawingUtils = drawingUtilsRef.current;

        const timestamp = performance.now();

        poseRef.current.detectForVideo(video, timestamp, (result) => {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (result.landmarks && result.landmarks.length > 0) {
                const leftWrist = result.landmarks[0][15];
                const rightWrist = result.landmarks[0][16];

                const prev = poseFramesRef.current.length > 0
                    ? poseFramesRef.current[poseFramesRef.current.length - 1]
                    : null;
                const dt = prev ? (timestamp - prev.timestamp) / 1000 : null;

                const leftShoulder = result.landmarks[0][11];
                const rightShoulder = result.landmarks[0][12];
                const leftHip = result.landmarks[0][23];
                const rightHip = result.landmarks[0][24];

                const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
                const hipY = (leftHip.y + rightHip.y) / 2;
                const torsoLength = hipY - shoulderY;

                function buildWristData(wrist, prevWrist) {
                    if (!wrist) return null;
                    const data = { x: wrist.x, y: wrist.y, z: wrist.z };

                    if (prevWrist && dt && dt > 0) {
                        const dx = wrist.x - prevWrist.x;
                        const dy = wrist.y - prevWrist.y;
                        const dz = wrist.z - prevWrist.z;
                        data.velocity = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;

                        if (prevWrist.velocity !== undefined) {
                            data.acceleration = (data.velocity - prevWrist.velocity) / dt;
                        }
                    }

                    if (shoulderY && hipY && torsoLength > 0) {
                        data.height = (shoulderY - wrist.y) / torsoLength;
                    } else {
                        data.height = 1 - wrist.y;
                    }

                    return data;
                }

                const poseFrame = {
                    timestamp,
                    leftWrist: buildWristData(leftWrist, prev?.leftWrist),
                    rightWrist: buildWristData(rightWrist, prev?.rightWrist),
                };

                poseFramesRef.current.push(poseFrame);

                // Only predict every 2nd frame to reduce load (still ~15fps)
                frameCountRef.current++;
                if (backendStatus === 'online' &&
                    frameCountRef.current % 2 === 0 &&
                    poseFrame.leftWrist?.velocity !== undefined &&
                    poseFrame.leftWrist?.acceleration !== undefined) {

                    // Using the Hugging Face URL for prediction
                    fetch(`${API_BASE_URL}/predict`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            timestamp: poseFrame.timestamp,
                            left_wrist_x: poseFrame.leftWrist.x,
                            left_wrist_y: poseFrame.leftWrist.y,
                            left_wrist_z: poseFrame.leftWrist.z,
                            left_wrist_velocity: poseFrame.leftWrist.velocity,
                            left_wrist_acceleration: poseFrame.leftWrist.acceleration,
                            right_wrist_x: poseFrame.rightWrist.x,
                            right_wrist_y: poseFrame.rightWrist.y,
                            right_wrist_z: poseFrame.rightWrist.z,
                            right_wrist_velocity: poseFrame.rightWrist.velocity,
                            right_wrist_acceleration: poseFrame.rightWrist.acceleration,
                        })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'warming_up') return;

                            // Store ALL predictions (not just hits) for analysis
                            if (sessionLogRef?.current && sessionActive) {
                                if (!sessionLogRef.current.predictions) {
                                    sessionLogRef.current.predictions = [];
                                }
                                sessionLogRef.current.predictions.push({
                                    timestamp_ms: poseFrame.timestamp,
                                    timestamp_ms_relative: poseFrame.timestamp - (sessionLogRef.current.startTime || poseFrame.timestamp),
                                    probability: data.probability,
                                    predicted_class: data.predicted_class,
                                    confidence: data.confidence,
                                    left_wrist: poseFrame.leftWrist,
                                    right_wrist: poseFrame.rightWrist,
                                });
                            }

                            // Visual feedback for predicted hits
                            if (data.predicted_class === 1) {
                                setLastPrediction(data.probability);
                                setTimeout(() => setLastPrediction(null), 200);
                                console.log(`HIT PREDICTED! Prob: ${data.probability.toFixed(3)}, Confidence: ${data.confidence}`);
                            }
                        })
                        .catch(err => console.error('Prediction error:', err));
                }

                // Log pose frames
                if (sessionActive && sessionLogRef?.current) {
                    if (!sessionLogRef.current.frames) {
                        sessionLogRef.current.frames = [];
                    }

                    sessionLogRef.current.frames.push({
                        timestamp_ms_relative: timestamp - (sessionLogRef.current.startTime || timestamp),
                        frame_type: "non-hit",
                        left_wrist: poseFrame.leftWrist,
                        right_wrist: poseFrame.rightWrist,
                    });
                }

                poseFramesRef.current = poseFramesRef.current.filter(
                    frame => timestamp - frame.timestamp < MAX_FRAME_AGE_MS
                );

                drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS);
                drawingUtils.drawLandmarks(result.landmarks[0], { color: "red", lineWidth: 2, radius: 4 });
            }

            ctx.restore();
            rAFRef.current = requestAnimationFrame(predictWebcam);
        });
    }

    useEffect(() => {
        if (!sessionActive) {
            stopCamera();
        }
    }, [sessionActive]);

    useEffect(() => {
        initPose();
        return () => {
            stopCamera();
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (isCameraOn && video && stream) {
            const handleLoadedData = () => {
                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                }
                predictWebcam();
            };
            video.addEventListener("loadeddata", handleLoadedData);
            return () => video.removeEventListener("loadeddata", handleLoadedData);
        }
    }, [isCameraOn, stream]);

    useImperativeHandle(ref, () => ({
        stopCamera
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "4px" }}>
            {/* Minimal CSS for the pulse animation */}
            <style jsx="true">{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <div style={{ position: "relative", width: "640px", height: "480px" }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ opacity: 0, position: 'absolute', top: 0, left: 0 }}
                />
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black" }}
                />

                {/* Backend status indicator */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: backendStatus === 'online' ? 'rgba(0,200,0,0.8)' :
                        backendStatus === 'offline' ? 'rgba(200,0,0,0.8)' :
                            'rgba(200,200,0,0.8)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                }}>
                    ML: {backendStatus === 'online' ? 'READY' : backendStatus === 'offline' ? 'OFFLINE' : 'LOADING'}
                </div>

                {/* Prediction flash */}
                {lastPrediction && (
                    <div style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,255,0,0.9)',
                        color: 'black',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        boxShadow: '0 0 20px rgba(0,255,0,0.6)',
                        animation: 'pulse 0.2s',
                    }}>
                        🎯 HIT! {(lastPrediction * 100).toFixed(0)}%
                    </div>
                )}

                {error && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        color: "red",
                    }}>
                        <p>{error}</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => (isCameraOn ? stopCamera() : startCamera())}
                disabled={!isModelLoaded}
                style={{
                    marginTop: "8px",
                    padding: "8px 16px",
                    backgroundColor: isCameraOn ? "#DC2626" : "#2563EB",
                    color: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                }}
            >
                {isCameraOn ? "Stop Camera" : "Start Camera"}
            </button>
        </div>
    );
});

export default PoseWebcam;
