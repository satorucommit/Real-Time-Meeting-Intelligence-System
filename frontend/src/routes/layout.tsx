import { component$, Slot } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

export default component$(() => {
  const loc = useLocation();
  const isHome = loc.url.pathname === '/';
  const isMeeting = loc.url.pathname.startsWith('/meeting/');
  const isHistory = loc.url.pathname === '/history/';

  return (
    <div class="min-h-screen flex flex-col relative font-sans text-text">
      {/* Animated Background Mesh */}
      <div class="bg-mesh">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      <div class="bg-noise"></div>

      {/* Navigation */}
      <nav class="border-b border-border bg-surface/50 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" class="flex items-center gap-4 group">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-300 border border-white/10 relative overflow-hidden">
                <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg class="w-5 h-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span class="text-xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-primary-light transition-all duration-300 hidden sm:inline">
                Kinetic<span class="text-primary-light font-medium">Intelligence</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div class="flex items-center gap-2 bg-surface-lighter/30 p-1.5 rounded-2xl border border-border/50 backdrop-blur-md">
              <Link
                href="/"
                class={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isHome ? 'bg-primary/20 text-primary-light shadow-sm border border-primary/20' : 'text-text-muted hover:text-white hover:bg-surface-lighter'}`}
              >
                Dashboard
              </Link>
              <Link
                href="/history/"
                class={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isHistory ? 'bg-primary/20 text-primary-light shadow-sm border border-primary/20' : 'text-text-muted hover:text-white hover:bg-surface-lighter'}`}
              >
                Registry
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main class={`flex-1 relative z-10 ${isMeeting ? '' : 'max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10'}`}>
        <Slot />
      </main>
    </div>
  );
});
