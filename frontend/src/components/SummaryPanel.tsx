import { component$ } from "@builder.io/qwik";
import type { AnalysisResult } from "../services/apiClient";

interface SummaryPanelProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
}

export const SummaryPanel = component$<SummaryPanelProps>((props) => {
  return (
    <div class="glass-panel flex flex-col h-full overflow-hidden">
      <div class="px-6 py-4 border-b border-border/60 bg-surface/40 flex justify-between items-center shrink-0">
        <h3 class="font-bold text-lg flex items-center gap-2 tracking-tight">
          <div class="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent-light border border-accent/20">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Neural Reasoning
        </h3>
        {props.isLoading && (
          <span class="flex h-3 w-3 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
        )}
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-8 relative">
        {!props.analysis && !props.isLoading ? (
          <div class="h-full flex flex-col items-center justify-center text-text-dim space-y-4">
            <div class="w-16 h-16 rounded-full border border-dashed border-border flex items-center justify-center">
              <svg class="w-6 h-6 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div class="text-center">
              <p class="font-medium text-text-muted">Awaiting LLM Output</p>
              <p class="text-sm mt-1">Generate insights to view synthesis.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Executive Summary */}
            <div class="animate-in relative">
              <h4 class="text-xs font-bold text-accent-light uppercase tracking-widest mb-3 flex items-center gap-2">
                Executive Synthesis
              </h4>
              {props.isLoading && !props.analysis?.summary ? (
                <div class="space-y-3">
                  <div class="h-3 w-full bg-surface-lighter rounded-md animate-pulse"></div>
                  <div class="h-3 w-5/6 bg-surface-lighter rounded-md animate-pulse"></div>
                  <div class="h-3 w-4/6 bg-surface-lighter rounded-md animate-pulse"></div>
                </div>
              ) : (
                <p class="text-white leading-relaxed font-light text-[15px]">
                  {props.analysis?.summary}
                </p>
              )}
            </div>

            {/* Key Topics */}
            <div class="animate-in delay-100 relative">
              <h4 class="text-xs font-bold text-success uppercase tracking-widest mb-3 flex items-center gap-2">
                Semantic Clusters
              </h4>
              {props.isLoading && (!props.analysis?.topics || props.analysis.topics.length === 0) ? (
                <div class="flex flex-wrap gap-2">
                  <div class="h-8 w-24 bg-surface-lighter rounded-full animate-pulse"></div>
                  <div class="h-8 w-32 bg-surface-lighter rounded-full animate-pulse"></div>
                </div>
              ) : (
                <div class="flex flex-wrap gap-2">
                  {props.analysis?.topics.map((topic, i) => (
                    <span key={i} class="px-3 py-1.5 bg-success/10 text-success text-sm font-medium rounded-full border border-success/20 shadow-inner">
                      {topic}
                    </span>
                  ))}
                  {props.analysis?.topics.length === 0 && (
                    <span class="text-sm text-text-dim italic font-light">No clusters detected.</span>
                  )}
                </div>
              )}
            </div>

            {/* Key Decisions */}
            <div class="animate-in delay-200 relative">
              <h4 class="text-xs font-bold text-warning uppercase tracking-widest mb-3 flex items-center gap-2">
                Committed Vectors
              </h4>
              {props.isLoading && (!props.analysis?.decisions || props.analysis.decisions.length === 0) ? (
                <div class="space-y-3">
                  <div class="h-14 w-full bg-surface-lighter rounded-xl animate-pulse"></div>
                  <div class="h-14 w-full bg-surface-lighter rounded-xl animate-pulse"></div>
                </div>
              ) : (
                <ul class="space-y-3">
                  {props.analysis?.decisions.map((decision, i) => (
                    <li key={i} class="flex items-start gap-3 bg-surface-lighter/30 p-4 rounded-xl border border-white/5 hover:border-warning/30 transition-colors">
                      <div class="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
                        <svg class="w-3.5 h-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span class="text-sm text-white leading-snug font-medium">{decision}</span>
                    </li>
                  ))}
                  {props.analysis?.decisions.length === 0 && (
                    <li class="text-sm text-text-dim italic font-light">No commitments logged.</li>
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
