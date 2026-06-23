import { component$, useSignal } from "@builder.io/qwik";
import type { AnalysisResult } from "../services/apiClient";

interface ActionItemsListProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
}

export const ActionItemsList = component$<ActionItemsListProps>((props) => {
  // Local state to track checked items (would sync to backend in full app)
  const checkedItems = useSignal<Record<number, boolean>>({});

  return (
    <div class="glass-card flex flex-col h-full overflow-hidden">
      <div class="p-4 border-b border-border bg-surface-light/50 flex justify-between items-center">
        <h3 class="font-semibold text-lg flex items-center gap-2">
          <svg class="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Action Items
        </h3>
        <span class="bg-primary/20 text-primary-light text-xs font-bold px-2 py-1 rounded-full">
          {props.analysis?.actionItems.length || 0}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        {!props.analysis && !props.isLoading ? (
          <div class="h-full flex flex-col items-center justify-center text-text-muted space-y-3">
            <svg class="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No action items yet.</p>
          </div>
        ) : props.isLoading && (!props.analysis?.actionItems || props.analysis.actionItems.length === 0) ? (
          <div class="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} class="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                <div class="w-5 h-5 rounded border border-border shrink-0"></div>
                <div class="skeleton h-4 w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <ul class="space-y-2">
            {props.analysis?.actionItems.map((item, i) => (
              <li
                key={i}
                class={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group ${checkedItems.value[i]
                  ? 'bg-surface-light border-border/50 opacity-60'
                  : 'bg-surface hover:bg-surface-light border-border'
                  }`}
                onClick$={() => {
                  checkedItems.value = {
                    ...checkedItems.value,
                    [i]: !checkedItems.value[i]
                  };
                }}
              >
                <div class="mt-0.5 shrink-0 relative">
                  <input
                    type="checkbox"
                    checked={checkedItems.value[i] || false}
                    class="appearance-none w-5 h-5 rounded border-2 border-primary-light/50 checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                  />
                  {checkedItems.value[i] && (
                    <svg class="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span class={`text-sm leading-snug transition-all ${checkedItems.value[i] ? 'line-through text-text-muted' : 'text-text group-hover:text-white'}`}>
                  {item}
                </span>
              </li>
            ))}
            {props.analysis?.actionItems.length === 0 && (
              <li class="text-sm text-text-dim text-center py-8 italic">No actionable tasks identified in the discussion yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
});
