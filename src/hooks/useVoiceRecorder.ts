import { useState, useRef, useCallback, useEffect, createElement } from "react";
import { usePermissionPrompt } from "@/hooks/usePermissionPrompt";
import { PermissionPrompt } from "@/components/permissions/PermissionPrompt";

export interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  permissionDenied: boolean;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    permissionDenied: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const grantedRef = useRef(false);
  const { request, promptProps } = usePermissionPrompt("microphone");

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      cleanup();

      // Show explanatory rationale before the OS mic prompt (App Store / Play Store requirement).
      if (!grantedRef.current) {
        try {
          const status = await (navigator as any).permissions?.query?.({ name: "microphone" as PermissionName });
          if (status?.state === "granted") {
            grantedRef.current = true;
          }
        } catch {
          /* permissions API unsupported — fall through to rationale */
        }
      }
      if (!grantedRef.current) {
        const allowed = await request();
        if (!allowed) {
          setState((prev) => ({
            ...prev,
            error: "Microphone access required to send voice messages",
            permissionDenied: true,
          }));
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      grantedRef.current = true;
      streamRef.current = stream;

      // Choose best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        }));
      };

      recorder.onerror = () => {
        setState((prev) => ({ ...prev, isRecording: false, error: "Recording failed" }));
        cleanup();
      };

      recorder.start(250); // collect data every 250ms
      startTimeRef.current = Date.now();

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
        permissionDenied: false,
      });

      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 200);
    } catch (err: any) {
      const denied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      setState((prev) => ({
        ...prev,
        error: denied ? "Microphone access required to send voice messages" : "Could not start recording",
        permissionDenied: denied,
      }));
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording" || mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      permissionDenied: false,
    });
  }, [stopRecording]);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      permissionDenied: false,
    });
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  };
}
