import tailwindcss from '@tailwindcss/vite';

const apiProxyTarget = process.env.NUXT_API_PROXY_TARGET || 'http://localhost:4000';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  components: [{ path: '~/components', pathPrefix: false }],

  imports: {
    dirs: ['stores'],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Server-side base URL used during SSR to reach the API directly.
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:4000/api',
    public: {
      // Browser-side base URL. `/api` is proxied by Nitro (dev + prod) or Nginx.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: 'GeeksforGeeks',
    },
  },

  routeRules: {
    // Same-origin API access from the browser: Nitro proxies /api/** to the backend.
    '/api/**': { proxy: `${apiProxyTarget}/api/**` },
    // Authenticated areas render client-side only.
    '/dashboard': { ssr: false },
    '/profile': { ssr: false },
    '/settings': { ssr: false },
    '/bookmarks': { ssr: false },
    '/submissions': { ssr: false },
    '/admin/**': { ssr: false },
    '/quizzes/**/attempt/**': { ssr: false },
    '/quizzes/**/result/**': { ssr: false },
    '/courses/**/learn/**': { ssr: false },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s | GeeksforGeeks',
      title: 'Your All-in-One Learning Portal',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#2f8d46' },
        { name: 'color-scheme', content: 'light dark' },
      ],
      script: [
        {
          // Apply the stored (or OS) colour scheme before first paint so dark mode does not flash white.
          innerHTML:
            "(function(){try{var t=localStorage.getItem('gfg-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();",
          tagPosition: 'head',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap' },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },
});
