import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import api from '../api/client';
import { Button } from './ui/Button';

// Record / preview / upload a short voice note for an announcement.
// Uses the browser MediaRecorder API — no external libraries, works in all
// modern Chromium + Firefox. Safari is partial but our audience is Android-first.
//
// Props: onUploaded(url, durationMs) called when upload completes; onCleared
// when the user removes the recording. Parent owns the state.

const MAX_DURATION_MS = 120_000; // 2 minutes — parish voice notes, not sermons

interface Props {
  initialUrl?: string | null;
  initialDurationMs?: number | null;
  onUploaded: (url: string, durationMs: number) => void;
  onCleared: () => void;
}

type Phase = 'idle' | 'recording' | 'reviewing' | 'uploading' | 'uploaded';

export function VoiceRecorder({ initialUrl, initialDurationMs, onUploaded, onCleared }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>(initialUrl ? 'uploaded' : 'idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl ?? null);
  const [uploadedDuration, setUploadedDuration] = useState<number | null>(initialDurationMs ?? null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up any active recording stream if the component unmounts mid-record.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (): Promise<void> => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a MIME the browser supports. Chromium prefers webm; Safari/iOS m4a.
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const supported = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      chunksRef.current = [];

      recorder.addEventListener('dataavailable', (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      });
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPhase('reviewing');
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      });

      mediaRecorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setPhase('recording');

      tickRef.current = window.setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= MAX_DURATION_MS) stop();
      }, 100);
    } catch (err) {
      console.error('[VoiceRecorder] start failed', err);
      setError(t('voice_mic_denied'));
      setPhase('idle');
    }
  };

  const stop = (): void => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const discard = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setUploadedDuration(null);
    setPhase('idle');
    setElapsedMs(0);
    setPlaying(false);
    onCleared();
  };

  const upload = async (): Promise<void> => {
    if (!chunksRef.current.length) return;
    setPhase('uploading');
    setError(null);
    try {
      const blob = new Blob(chunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm',
      });
      const form = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('webm') ? 'webm' : 'audio';
      form.append('audio', blob, `voice.${ext}`);
      form.append('duration_ms', String(elapsedMs));

      const res = await api.post<{ url: string; duration_ms: number }>(
        '/admin/announcements/voice',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setUploadedUrl(res.data.url);
      setUploadedDuration(res.data.duration_ms ?? elapsedMs);
      setPhase('uploaded');
      onUploaded(res.data.url, res.data.duration_ms ?? elapsedMs);
    } catch (err) {
      console.error('[VoiceRecorder] upload failed', err);
      setError(t('voice_upload_failed'));
      setPhase('reviewing');
    }
  };

  const togglePlay = (): void => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setPlaying(true);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  };

  const displayUrl = uploadedUrl || previewUrl;
  const displayDurationMs =
    phase === 'recording' ? elapsedMs : uploadedDuration ?? elapsedMs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
        }}
      >
        {phase === 'idle' && (
          <Button leadingIcon={Mic} onClick={start} variant="secondary" size="md">
            {t('voice_record')}
          </Button>
        )}

        {phase === 'recording' && (
          <>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--color-error-soft)',
                color: 'var(--color-error)',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: 'var(--color-error)',
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
              {t('voice_recording')} · {formatMs(elapsedMs)}
            </div>
            <Button leadingIcon={Square} onClick={stop} variant="destructive" size="md">
              {t('voice_stop')}
            </Button>
          </>
        )}

        {(phase === 'reviewing' || phase === 'uploaded') && displayUrl && (
          <>
            <Button
              leadingIcon={playing ? Pause : Play}
              onClick={togglePlay}
              variant="secondary"
              size="md"
            >
              {playing ? t('voice_pause') : t('voice_play')} · {formatMs(displayDurationMs)}
            </Button>
            {phase === 'reviewing' && (
              <Button leadingIcon={Mic} onClick={upload} variant="primary" size="md">
                {t('voice_upload')}
              </Button>
            )}
            <Button
              leadingIcon={Trash2}
              onClick={discard}
              variant="ghost"
              size="md"
              ariaLabel={t('voice_discard')}
            >
              {t('voice_discard')}
            </Button>
          </>
        )}

        {phase === 'uploading' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--color-ink-muted)',
              fontSize: 13,
            }}
          >
            <Loader2 size={16} className="spin" />
            {t('voice_uploading')}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            color: 'var(--color-error)',
            fontSize: 13,
            background: 'var(--color-error-soft)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {error}
        </div>
      )}

      {displayUrl && (
        <audio
          ref={audioRef}
          src={displayUrl}
          onEnded={() => setPlaying(false)}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
