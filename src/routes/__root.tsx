import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Valorant Casino' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  const navItems = [
    { to: '/', label: 'Lobby' },
    { to: '/games', label: 'Jeux' },
    { to: '/dice-3d', label: 'Des 3D' },
    { to: '/tables', label: 'Tables Live' },
    { to: '/missions', label: 'Missions' },
    { to: '/vip', label: 'Club VIP' },
  ] as const

  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[rgba(255,70,85,0.18)] bg-[rgba(8,13,20,0.94)] backdrop-blur-md">
          <div className="relative mx-auto flex w-[min(1100px,calc(100%-2rem))] flex-wrap items-center justify-between gap-4 py-4">
            <Link to="/" className="flex items-center gap-2.5 no-underline" style={{ color: 'inherit' }}>
              <span className="inline-block h-2 w-2 rotate-45 bg-[#ff4655]" />
              <span className="display-title text-[1.35rem] tracking-[0.06em] text-white">
                VLRNT<span className="text-[#ff4655]">·</span>CASINO
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === '/' }}
                  className="val-nav-link pb-0.5 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#768079] no-underline hover:text-[#ece8e1]"
                  activeProps={{ className: 'val-nav-link-active !text-white' }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Red sweep accent on bottom-left */}
          <div className="absolute bottom-0 left-0 h-px w-2/5 bg-gradient-to-r from-[#ff4655] to-transparent" />
        </header>

        <main className="mx-auto w-[min(1100px,calc(100%-2rem))] py-10">{children}</main>

        <footer className="site-footer mt-10 py-5 text-center text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
          Jackpot Protocol Online&nbsp;·&nbsp;Neon District&nbsp;·&nbsp;24/7 Spike-Secured
        </footer>

        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
