"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const PoseWebcam = forwardRef(({ poseFramesRef, sessionActive }, ref) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const drawingUtilsRef = useRef(null);
    const rAFRef = useRef(null);

    const MAX_FRAME_AGE_MS = 200;

    const [error, setError] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [stream, setStream] = useState(null);

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
                minPoseDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
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

                const poseFrame = {
                    timestamp,
                    leftWrist: leftWrist ? { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z } : null,
                    rightWrist: rightWrist ? { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z } : null
                };

                poseFramesRef.current.push(poseFrame);
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

    // --- Force stop camera when session ends ---
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

    // --- Expose stopCamera to parent ---
    useImperativeHandle(ref, () => ({
        stopCamera
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "4px" }}>
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
