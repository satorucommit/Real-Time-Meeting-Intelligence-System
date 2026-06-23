import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, DocumentHead } from "@builder.io/qwik-city";
import { getAllSessions, type MeetingSession } from "../../services/apiClient";

export default component$(() => {
  const sessions = useSignal<MeetingSession[]>([]);
  const isLoading = useSignal(true);
  const searchQuery = useSignal("");

  useTask$(async () => {
    try {
      sessions.value = await getAllSessions();
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      isLoading.value = false;
    }
  });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.value.filter(s =>
    s.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );

  return (
    <div class="max-w-6xl mx-auto animate-in">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <h1 class="text-4xl font-black text-white mb-3 tracking-tight">Intelligence <span class="text-gradient-primary">Registry</span></h1>
          <p class="text-text-muted text-lg font-light">Query your historical synaptic records and AI reasoning outputs.</p>
        </div>

        <div class="relative w-full sm:w-80 group">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search telemetry..."
            class="w-full bg-surface-lighter/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-text-dim focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all backdrop-blur-md shadow-inner"
          />
        </div>
      </div>

      <div class="glass-panel overflow-hidden border border-white/5">
        {isLoading.value ? (
          <div class="p-8 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} class="h-20 w-full rounded-2xl bg-surface-light/50 border border-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div class="p-20 text-center flex flex-col items-center">
            <div class="w-20 h-20 rounded-3xl bg-surface-lighter/50 border border-white/5 flex items-center justify-center mb-6 shadow-inner">
              <svg class="w-10 h-10 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Registry Empty</h3>
            <p class="text-text-muted">Initialize a new session from the dashboard to log neural telemetry.</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-lighter/30 border-b border-white/5">
                  <th class="px-8 py-5 text-xs font-bold text-text-muted uppercase tracking-widest w-1/3">System Designation</th>
                  <th class="px-8 py-5 text-xs font-bold text-text-muted uppercase tracking-widest">Timestamp</th>
                  <th class="px-8 py-5 text-xs font-bold text-text-muted uppercase tracking-widest">Uptime</th>
                  <th class="px-8 py-5 text-xs font-bold text-text-muted uppercase tracking-widest">State</th>
                  <th class="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                {filteredSessions.map((session) => (
                  <tr key={session.id} class="hover:bg-surface-light/40 transition-colors group">
                    <td class="px-8 py-5">
                      <div class="font-bold text-white group-hover:text-primary-light transition-colors text-base tracking-tight">
                        {session.title}
                      </div>
                      <div class="text-xs text-text-dim mt-1 font-mono">{session.id.split('-')[0]}</div>
                    </td>
                    <td class="px-8 py-5 text-sm font-medium text-text-muted">
                      {formatDate(session.createdAt)}
                    </td>
                    <td class="px-8 py-5 text-sm font-mono text-text-muted">
                      {formatDuration(session.durationSeconds)}
                    </td>
                    <td class="px-8 py-5">
                      <span class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${session.status === 'active'
                          ? 'bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-surface-lighter text-text-dim border-white/5'
                        }`}>
                        {session.status}
                      </span>
                    </td>
                    <td class="px-8 py-5 text-right">
                      <Link
                        href={`/meeting/${session.id}`}
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-surface-lighter/50 border border-white/5 text-white hover:border-primary/50 hover:text-primary-light hover:bg-primary/5"
                      >
                        {session.status === 'active' ? 'Resume' : 'Analyze'}
                        <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Registry | Kinetic OS",
};
