"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const MODEL_BASE_URL = "/models"; // Place models under public/models

export default function Camera({ onEmbedding, autoCapture = true, minFaceRelativeSize = 0.25 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE_URL),
        ]);
        if (!cancelled) setReady(true);
      } catch (e) {
        setError("Failed to load face models. Ensure SSD files exist under public/models");
      }
    }
    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError("Camera access denied. Please allow camera permissions.");
      }
    })();
    return () => {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [ready]);

  const computeEmbedding = useCallback(async () => {
    if (!videoRef.current) return null;
    const input = videoRef.current;
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
    const detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    // Basic quality gate: face must occupy sufficient area
    const { width: vw, height: vh } = input.getBoundingClientRect();
    const box = detection.detection.box;
    const relW = box.width / Math.max(1, vw);
    const relH = box.height / Math.max(1, vh);
    if (Math.min(relW, relH) < minFaceRelativeSize) {
      setError("Move closer to the camera for better recognition.");
      return null;
    }
    const desc = Array.from(detection.descriptor); // Float32Array -> number[]
    return { descriptor: desc, box: detection.detection.box };
  }, []);

  useEffect(() => {
    if (!autoCapture || !ready) return;
    if (startedRef.current) return;
    startedRef.current = true;
    let timer;
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      const result = await computeEmbedding();
      if (result && onEmbedding) {
        onEmbedding(result.descriptor);
        // keep capturing periodically so subsequent attempts still work
        timer = setTimeout(loop, 800);
        return;
      }
      timer = setTimeout(loop, 350);
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      startedRef.current = false;
    };
  }, [autoCapture, ready, computeEmbedding, onEmbedding]);

  async function handleManualCapture() {
    try {
      const result = await computeEmbedding();
      if (!result) {
        setError("No face detected. Please adjust lighting and position.");
        return;
      }
      onEmbedding && onEmbedding(result.descriptor);
      setCaptured(true);
      setTimeout(() => setCaptured(false), 2000);
    } catch (e) {
      setError("Failed to capture face.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-300 bg-black dark:border-zinc-700">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      </div>
      {!autoCapture && (
        <button
          type="button"
          onClick={handleManualCapture}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Capture Face
        </button>
      )}
      {!ready && (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">Loading face models…</div>
      )}
      {captured && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
          Face captured successfully
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}


