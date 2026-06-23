import { component$, useSignal, useTask$, useVisibleTask$, $, noSerialize } from "@builder.io/qwik";
import { useLocation, useNavigate, DocumentHead } from "@builder.io/qwik-city";
import {
  getSession,
  endSession,
  analyzeSession,
  exportSession,
  type TranscriptChunk,
  type AnalysisResult,
  type MeetingSession
} from "../../../services/apiClient";
import { createSSEManager } from "../../../services/sse";
import { AudioRecorder } from "../../../components/AudioRecorder";
import { TranscriptView } from "../../../components/TranscriptView";
import { SummaryPanel } from "../../../components/SummaryPanel";
import { ActionItemsList } from "../../../components/ActionItemsList";

export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const sessionId = loc.params.id;

  // State
  const session = useSignal<MeetingSession | null>(null);
  const transcripts = useSignal<TranscriptChunk[]>([]);
  const analysis = useSignal<AnalysisResult | null>(null);

  const isRecording = useSignal(false);
  const isAnalyzing = useSignal(false);
  const isLoading = useSignal(true);
  const error = useSignal("");
  const duration = useSignal(0);

  const timerRef = useSignal<any>(null);
  const sseManager = useSignal<any>(null);

  useTask$(async ({ track }) => {
    track(() => sessionId);
    if (!sessionId) return;

    try {
      isLoading.value = true;
      const data = await getSession(sessionId);
      session.value = data.session;
      transcripts.value = data.transcripts;
      analysis.value = data.analysis;
      duration.value = data.session.durationSeconds || 0;

      if (data.session.status === 'ended') {
        isRecording.value = false;
      }
    } catch (err: any) {
      error.value = "Failed to load session.";
    } finally {
      isLoading.value = false;
    }
  });

  useVisibleTask$(({ cleanup }) => {
    if (session.value?.status === 'ended') return;

    timerRef.value = setInterval(() => {
      if (isRecording.value) duration.value++;
    }, 1000);

    const manager = createSSEManager();
    sseManager.value = noSerialize(manager);
    manager.connect(sessionId);

    manager.on('transcription', (data: any) => {
      transcripts.value = [...transcripts.value, data as TranscriptChunk];
    });

    manager.on('analysis', (data: any) => {
      analysis.value = data as AnalysisResult;
      isAnalyzing.value = false;
    });

    const analyzeInterval = setInterval(() => {
      if (isRecording.value && transcripts.value.length > 0) triggerAnalysis();
    }, 120000);

    cleanup(() => {
      clearInterval(timerRef.value);
      clearInterval(analyzeInterval);
      if (sseManager.value) sseManager.value.disconnect();
    });
  });

  const toggleRecording = $(() => {
    isRecording.value = !isRecording.value;
  });

  const triggerAnalysis = $(async () => {
    if (transcripts.value.length === 0 || isAnalyzing.value) return;
    isAnalyzing.value = true;
    try {
      await analyzeSession(sessionId);
    } catch (err) {
      isAnalyzing.value = false;
    }
  });

  const handleEndMeeting = $(async () => {
    if (!confirm("Are you sure you want to end this meeting?")) return;

    isRecording.value = false;
    if (timerRef.value) clearInterval(timerRef.value);

    try {
      await endSession(sessionId);
      if (sseManager.value) sseManager.value.disconnect();
      if (transcripts.value.length > 0) {
        isAnalyzing.value = true;
        await analyzeSession(sessionId);
      }
      nav('/history');
    } catch (err) {
      error.value = "Failed to end session.";
    }
  });

  const handleExport = $(async () => {
    try {
      const md = await exportSession(sessionId, 'markdown');
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.value?.title || 'meeting'}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export meeting.");
    }
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading.value) {
    return (
      <div class="flex items-center justify-center h-[80vh]">
        <div class="animate-pulse flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <p class="text-text-muted font-medium">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  if (error.value || !session.value) {
    return (
      <div class="flex flex-col items-center justify-center h-[80vh]">
        <div class="glass-panel p-8 text-center max-w-md">
          <div class="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Connection Error</h3>
          <p class="text-text-muted">{error.value || "Session not found"}</p>
        </div>
      </div>
    );
  }

  const isEnded = session.value.status === 'ended';

  return (
    <div class="h-[calc(100vh-6rem)] flex flex-col gap-5 max-h-[calc(100vh-6rem)] animate-in">

      {/* Control Header */}
      <div class="glass-panel px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 rounded-2xl">
        <div class="flex items-center gap-5">
          <h2 class="text-2xl font-bold text-white tracking-tight">{session.value.title}</h2>

          <div class="flex items-center gap-3">
            <div class={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isEnded ? 'bg-surface border-border text-text-dim' : 'bg-primary/20 border-primary/30 text-primary-light shadow-[0_0_10px_rgba(99,102,241,0.2)]'}`}>
              {isEnded ? 'Terminated' : 'Live'}
            </div>

            <div class="font-mono text-lg font-medium tracking-widest text-primary-light bg-surface-lighter/50 px-4 py-1.5 rounded-xl border border-white/5 shadow-inner">
              {formatTime(duration.value)}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          {!isEnded && (
            <div class="mr-4">
              <AudioRecorder
                sessionId={sessionId}
                isRecording={isRecording.value}
                onTranscriptionChunk$={$(() => { })}
                onError$={$((err) => { error.value = err; isRecording.value = false; })}
              />
            </div>
          )}

          <div class="h-8 w-px bg-border mx-1 hidden sm:block"></div>

          <button
            onClick$={triggerAnalysis}
            disabled={transcripts.value.length === 0 || isAnalyzing.value || isEnded}
            class="btn-outline-premium px-4 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing.value ? (
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            Force Reason
          </button>

          <button
            onClick$={handleExport}
            class="btn-outline-premium px-4 py-2.5 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export.md
          </button>

          {!isEnded && (
            <>
              <button
                onClick$={toggleRecording}
                class={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${isRecording.value
                    ? 'bg-surface border border-warning/50 text-warning hover:bg-warning/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                    : 'btn-premium'
                  }`}
              >
                {isRecording.value ? (
                  <><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg> Pause Intake</>
                ) : (
                  <><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path fill-rule="evenodd" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-18 0a9 9 0 1118 0 9 9 0 01-18 0z" clip-rule="evenodd" /></svg> Resume Intake</>
                )}
              </button>

              <button
                onClick$={handleEndMeeting}
                class="px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 bg-surface border border-danger/40 text-danger hover:bg-danger hover:text-white shadow-[0_0_10px_rgba(248,113,113,0.1)] hover:shadow-[0_0_20px_rgba(248,113,113,0.4)] flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Terminate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tri-Pane Architecture */}
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">

        {/* Console 1: Telemetry (Transcript) */}
        <div class="lg:col-span-5 flex flex-col min-h-0 h-full">
          <TranscriptView transcripts={transcripts.value} />
        </div>

        {/* Console 2: Neural Summary */}
        <div class="lg:col-span-4 flex flex-col min-h-0 h-full">
          <SummaryPanel analysis={analysis.value} isLoading={isAnalyzing.value} />
        </div>

        {/* Console 3: Executable Vectors (Action Items) */}
        <div class="lg:col-span-3 flex flex-col min-h-0 h-full">
          <ActionItemsList analysis={analysis.value} isLoading={isAnalyzing.value} />
        </div>

      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Live Session | Kinetic OS",
};
