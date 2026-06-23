import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import type { TranscriptChunk } from "../services/apiClient";

interface TranscriptViewProps {
  transcripts: TranscriptChunk[];
  autoScroll?: boolean;
}

export const TranscriptView = component$<TranscriptViewProps>((props) => {
  const containerRef = useSignal<HTMLElement>();

  useVisibleTask$(({ track }) => {
    track(() => props.transcripts.length);
    if (props.autoScroll !== false && containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
  });

  return (
    <div class="glass-panel flex flex-col h-full overflow-hidden">
      <div class="px-6 py-4 border-b border-border/60 bg-surface/40 flex justify-between items-center shrink-0">
        <h3 class="font-bold text-lg flex items-center gap-2 tracking-tight">
          <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light border border-primary/20">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          Live Telemetry
        </h3>
        <div class="flex items-center gap-2">
          <span class="relative flex h-2 w-2 mr-1">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span class="font-mono text-xs text-primary-light font-medium tracking-widest uppercase">
            {props.transcripts.length} packets
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        class="flex-1 overflow-y-auto p-6 space-y-5 scroll-smooth"
      >
        {props.transcripts.length === 0 ? (
          <div class="h-full flex flex-col items-center justify-center text-text-dim space-y-4">
            <div class="w-16 h-16 rounded-full border border-dashed border-border flex items-center justify-center">
              <svg class="w-6 h-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div class="text-center">
              <p class="font-medium text-text-muted">Awaiting Audio Stream</p>
              <p class="text-sm mt-1">Whisper nodes standing by...</p>
            </div>
          </div>
        ) : (
          props.transcripts.map((chunk) => (
            <div key={chunk.id} class="animate-in group relative pl-4 border-l-2 border-primary/20 hover:border-primary transition-colors">
              <div class="flex items-baseline gap-2 mb-1.5">
                <span class="text-sm font-bold text-primary-light uppercase tracking-wider">{chunk.speaker}</span>
                <span class="text-xs font-mono text-text-dim">
                  {new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {chunk.confidence && (
                  <span class="text-[10px] font-mono text-success/70 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    C:{(chunk.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <p class="text-white leading-relaxed text-[15px] font-light">
                {chunk.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
