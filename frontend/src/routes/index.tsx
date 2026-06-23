import { component$, useSignal, $ } from "@builder.io/qwik";
import { useNavigate, DocumentHead } from "@builder.io/qwik-city";
import { createSession } from "../services/apiClient";

export default component$(() => {
  const nav = useNavigate();
  const isCreating = useSignal(false);
  const meetingTitle = useSignal("");
  const error = useSignal("");

  const handleStartMeeting = $(async () => {
    isCreating.value = true;
    error.value = "";

    try {
      const session = await createSession(meetingTitle.value || "Untitled Meeting");
      nav(`/meeting/${session.sessionId}`);
    } catch (err: any) {
      error.value = err.message || "Failed to create meeting session.";
      isCreating.value = false;
    }
  });

  return (
    <div class="flex flex-col items-center justify-center min-h-[85vh] relative w-full">

      {/* Premium Hero Section */}
      <div class="text-center max-w-4xl mx-auto mb-16 relative z-10 w-full px-4">
        <div class="animate-in flex justify-center mb-8">
          <div class="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-lighter/50 border border-white/10 backdrop-blur-md shadow-xl text-sm font-semibold tracking-wide text-white">
            <span class="w-2.5 h-2.5 rounded-full bg-primary-light animate-pulse shadow-[0_0_10px_rgba(165,180,252,0.8)]"></span>
            Zero-Latency Edge AI Engine Active
          </div>
        </div>

        <h1 class="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-8 animate-in delay-100 text-white drop-shadow-2xl leading-[1.1]">
          Capture Thought.<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-accent-light to-white inline-block mt-2">
            Automate Action.
          </span>
        </h1>

        <p class="text-xl md:text-2xl text-text-muted mb-12 font-light max-w-2xl mx-auto animate-in delay-200 leading-relaxed">
          The first meeting intelligence system built strictly for <span class="text-white font-medium">absolute privacy</span> and <span class="text-white font-medium">instantaneous insights</span> via local LLMs.
        </p>

        {/* Central Glass Control Panel */}
        <div class="glass-panel max-w-lg mx-auto p-2 animate-in delay-300 transform-gpu shadow-2xl shadow-primary/10">
          <div class="glass-panel-inner p-8 relative overflow-hidden">
            {/* Subtle inner glow */}
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full filter blur-[40px] pointer-events-none"></div>

            <form preventdefault:submit onSubmit$={handleStartMeeting} class="flex flex-col gap-6 relative z-10">
              <div class="space-y-3 text-left">
                <label for="title" class="text-sm font-semibold text-text-muted tracking-wide uppercase ml-1">New Intelligence Session</label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-text-dim group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <input
                    id="title"
                    type="text"
                    bind:value={meetingTitle}
                    placeholder="e.g. System Architecture Sync..."
                    class="w-full bg-surface/50 border border-border/80 rounded-xl pl-11 pr-4 py-4 text-white placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all font-medium text-lg shadow-inner"
                    disabled={isCreating.value}
                  />
                </div>
              </div>

              {error.value && (
                <div class="text-sm text-danger bg-danger/10 p-3 rounded-lg border border-danger/20 flex items-center gap-2">
                  <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                  {error.value}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating.value}
                class="btn-premium w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg mt-2"
              >
                {isCreating.value ? (
                  <>
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing Core...
                  </>
                ) : (
                  <>
                    Initialize Meeting
                    <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Feature Architecture Grid */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16 animate-in delay-400 px-4 w-full">
        <div class="glass-panel p-8 group flex flex-col items-start hover:-translate-y-2 transition-transform duration-300">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 flex items-center justify-center mb-6 text-primary-light group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 class="font-bold text-xl mb-3 text-white tracking-tight">Zero-Lag Transcription</h3>
          <p class="text-text-muted leading-relaxed">Direct WebSocket bypass via SSE. Audio buffered and parsed through <span class="text-white font-medium">Whisper-v3</span> locally instantly.</p>
        </div>

        <div class="glass-panel p-8 group flex flex-col items-start hover:-translate-y-2 transition-transform duration-300">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/20 flex items-center justify-center mb-6 text-accent-light group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="font-bold text-xl mb-3 text-white tracking-tight">Kinetic Insights</h3>
          <p class="text-text-muted leading-relaxed">Continuous <span class="text-white font-medium">Llama 3.2</span> reasoning extracts action items, core decisions, and context dynamically.</p>
        </div>

        <div class="glass-panel p-8 group flex flex-col items-start hover:-translate-y-2 transition-transform duration-300">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-transparent border border-success/20 flex items-center justify-center mb-6 text-success group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 class="font-bold text-xl mb-3 text-white tracking-tight">Air-Gapped Privacy</h3>
          <p class="text-text-muted leading-relaxed">100% on-device processing. No telemetry. No cloud APIs. Absolute data sovereignty guaranteed.</p>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Kinetic | Intelligent Meeting OS",
  meta: [
    {
      name: "description",
      content: "Real-time, edge-AI powered meeting intelligence and transcription.",
    },
  ],
};
