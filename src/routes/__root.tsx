import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'

import appCss from '../styles.css?url'

// ============================================================
// Player Context
// ============================================================

interface PlayerContextValue {
  nickname: string | null
  balance: number
  setNickname: (nickname: string) => void
  refreshBalance: () => Promise<void>
}

export const PlayerContext = createContext<PlayerContextValue>({
  nickname: null,
  balance: 1000,
  setNickname: () => {},
  refreshBalance: async () => {},
})

export function usePlayer() {
  return useContext(PlayerContext)
}

// ============================================================
// Server functions
// ============================================================

export const getOrCreatePlayer = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string }) => data)
  .handler(async ({ data }) => {
    const nickname = data.nickname.trim().slice(0, 20)
    if (!nickname) return { ok: false as const, message: 'Pseudo requis' }

    const player = await prisma.player.upsert({
      where: { nickname },
      update: {},
      create: { nickname, balance: 1000, totalWagered: 0 },
      select: { nickname: true, balance: true, totalWagered: true },
    })

    // Seed default missions if none exist
    const missionKeys = ['wins_5', 'low_bets_10', 'jackpots_3', 'total_games_20', 'spike_rush_5', 'big_win_4']
    for (const key of missionKeys) {
      await prisma.playerMission.upsert({
        where: { playerId_missionKey: { playerId: (await prisma.player.findUnique({ where: { nickname }, select: { id: true } }))!.id, missionKey: key } },
        update: {},
        create: {
          player: { connect: { nickname } },
          missionKey: key,
          progress: 0,
          completed: false,
        },
      })
    }

    return { ok: true as const, player }
  })

export const getPlayerBalance = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string }) => data)
  .handler(async ({ data }) => {
    const player = await prisma.player.findUnique({
      where: { nickname: data.nickname },
      select: { balance: true },
    })
    return { balance: player?.balance ?? 1000 }
  })

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

// ============================================================
// Nickname modal
// ============================================================

function NicknameModal({ onConfirm }: { onConfirm: (nickname: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim().slice(0, 20)
    if (!trimmed || trimmed.length < 2) {
      setError('Pseudo trop court (2 caractères minimum).')
      return
    }
    setLoading(true)
    try {
      const result = await getOrCreatePlayer({ data: { nickname: trimmed } })
      if (result.ok) {
        onConfirm(trimmed)
      } else {
        setError(result.message)
      }
    } catch {
      setError('Erreur serveur. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,13,20,0.94)] backdrop-blur-md">
      <div
        className="relative w-full max-w-md border border-[rgba(255,70,85,0.25)] bg-[linear-gradient(160deg,#1a2733_0%,#0f1923_100%)] p-8"
        style={{ borderTop: '2px solid #ff4655', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-5 w-5"
          style={{ background: 'linear-gradient(-45deg, transparent 50%, rgba(255,70,85,0.55) 50%)' }}
        />
        <p className="val-kicker mb-2">Kingdom Corporation · Protocole Agent</p>
        <h2 className="display-title text-4xl text-white">Choisissez votre agent</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#a8b0b8]">
          Entrez un pseudo pour accéder au casino. Il sera utilisé pour sauvegarder votre progression.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="modal-nickname" className="block text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#a8b0b8]">
              Votre pseudo
            </label>
            <input
              id="modal-nickname"
              type="text"
              maxLength={20}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              placeholder="Ex: TenZSpikeKing"
              className="val-input mt-2 w-full px-3 py-2.5 text-base"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-[#ff4655]">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Entrer dans le casino'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Root document
// ============================================================

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  const [nickname, setNicknameState] = useState<string | null>(null)
  const [balance, setBalance] = useState(1000)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('vlrnt_nickname')
    if (stored) {
      setNicknameState(stored)
      // Refresh balance from DB
      getPlayerBalance({ data: { nickname: stored } }).then((r) => {
        setBalance(r.balance)
      }).catch(() => {})
    }
  }, [])

  const setNickname = useCallback((newNickname: string) => {
    localStorage.setItem('vlrnt_nickname', newNickname)
    setNicknameState(newNickname)
    getPlayerBalance({ data: { nickname: newNickname } }).then((r) => {
      setBalance(r.balance)
    }).catch(() => {})
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!nickname) return
    try {
      const r = await getPlayerBalance({ data: { nickname } })
      setBalance(r.balance)
    } catch {}
  }, [nickname])

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
        <PlayerContext.Provider value={{ nickname, balance, setNickname, refreshBalance }}>
          {mounted && !nickname && <NicknameModal onConfirm={setNickname} />}

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

              {nickname && (
                <div className="flex items-center gap-3">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#768079]">
                    {nickname}
                  </span>
                  <span className="val-badge val-badge-teal">{balance} VP</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 h-px w-2/5 bg-gradient-to-r from-[#ff4655] to-transparent" />
          </header>

          <main className="mx-auto w-[min(1100px,calc(100%-2rem))] py-10">{children}</main>

          <footer className="site-footer mt-10 py-5 text-center text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
            Kingdom Corporation&nbsp;·&nbsp;Radianite-Powered&nbsp;·&nbsp;Protocol&nbsp;#7&nbsp;·&nbsp;Spike-Secured&nbsp;24/7
          </footer>

          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
        </PlayerContext.Provider>
        <Scripts />
      </body>
    </html>
  )
}
