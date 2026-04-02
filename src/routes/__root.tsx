import { lazy, Suspense } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer from '../components/Footer'
import Header from '../components/Header'
import ErrorBoundary from '../components/ErrorBoundary'

// Devtools are lazy-loaded and only rendered in dev. The dynamic import is
// inside the true branch of the compile-time constant so Vite/Rollup strips
// the entire chunk from production builds.
const DevTools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }] = await Promise.all([
        import('@tanstack/react-devtools'),
        import('@tanstack/react-router-devtools'),
      ])
      return {
        default: function DevToolsPanel() {
          return (
            <TanStackDevtools
              config={{ position: 'bottom-right' }}
              plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
            />
          )
        },
      }
    })
  : () => null

import appCss from '../styles.css?url'

const queryClient = new QueryClient()

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Heavenlist',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <Header />
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </QueryClientProvider>
        <Footer />
        <Suspense>{import.meta.env.DEV && <DevTools />}</Suspense>
        <Scripts />
      </body>
    </html>
  )
}
