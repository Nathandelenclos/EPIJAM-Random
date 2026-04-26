import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { prisma } from '#/db'

export const Route = createFileRoute('/')({ component: Home })

// ============================================================
// Server function — live stats
// ============================================================

const getLiveStats = createServerFn({ method: 'GET' }).handler(async () => {
  const [playerCount, wageredResult, jackpotCount] = await Promise.all([
    prisma.player.count(),
    prisma.player.aggregate({ _sum: { totalWagered: true } }),
    Promise.all([
      prisma.slotsGame.count({ where: { won: true, payout: { gte: 1000 } } }),
      prisma.crateRushGame.count({ where: { won: true, multiplier: { gte: 4 } } }),
      prisma.rouletteGame.count({ where: { won: true, payout: { gte: 1000 } } }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
  ])

  const totalVP = wageredResult._sum.totalWagered ?? 0
  const formattedVP = totalVP >= 1_000_000
    ? `${(totalVP / 1_000_000).toFixed(1)}M`
    : totalVP >= 1_000
    ? `${Math.round(totalVP / 1_000)}K`
    : String(totalVP)

  return {
    agents: String(playerCount || 0),
    vp: formattedVP || '0',
    jackpots: String(jackpotCount || 0),
  }
})

// ============================================================
// Component
// ============================================================

const quickAccess = [
  { name: 'Dés 3D', path: '/dice-3d', value: 'roll interactif', tag: 'New' },
  { name: 'Crate Rush', path: '/crate-rush', value: 'x5 max', tag: 'Games' },
  { name: 'Tables Live', path: '/tables', value: '6 salons', tag: 'Live' },
  { name: 'Missions', path: '/missions', value: '6 challenges', tag: 'Daily' },
  { name: 'VIP Club', path: '/vip', value: '3 tiers', tag: 'Rank' },
] as const

function Home() {
  const [stats, setStats] = useState({ agents: '...', vp: '...', jackpots: '...' })

  useEffect(() => {
    getLiveStats().then(setStats).catch(() => {
      setStats({ agents: '0', vp: '0', jackpots: '0' })
    })
  }, [])

  const liveStats = [
    { label: 'Agents en jeu', value: stats.agents },
    { label: 'VP misés au total', value: stats.vp },
    { label: 'Jackpots defused', value: stats.jackpots },
  ]

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div
        className="relative overflow-hidden border border-[rgba(255,70,85,0.22)] bg-[linear-gradient(130deg,#111827_0%,#0b1520_50%,#1d0c13_100%)] p-8 shadow-[0_0_80px_rgba(255,70,85,0.06)]"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)',
          borderTop: '2px solid #ff4655',
        }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-7 w-7"
          style={{ background: 'linear-gradient(-45deg, transparent 50%, rgba(255,70,85,0.55) 50%)' }}
        />
        <div className="pointer-events-none absolute bottom-0 right-14 top-0 w-px bg-gradient-to-b from-[#ff4655]/20 via-[#ff4655]/8 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-22 top-0 w-px bg-gradient-to-b from-[#ff4655]/10 to-transparent" />

        <p className="val-kicker mb-4">Kingdom Corporation · Protocole Casino</p>
        <h1 className="display-title text-5xl leading-none text-white sm:text-6xl">
          Bienvenue au{' '}
          <span className="text-[#ff4655]">Valorant Casino</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#a8b0b8]">
          Misez vos Kingdom Credits entre deux scrims classés. Tables animées par des croupiers agents, caisses
          Radianite et missions quotidiennes. Le Spike n'attend pas — votre bankroll non plus.
        </p>

        {/* Live stats */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-[rgba(255,70,85,0.15)] pt-5">
          {liveStats.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="display-title text-2xl text-[#ff4655]">{value}</span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#768079]">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/games"
            className="inline-block bg-[#ff4655] px-6 py-3 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-white no-underline transition-all hover:bg-[#ff5a66] hover:shadow-[0_0_24px_rgba(255,70,85,0.45)]"
          >
            Lancer les jeux
          </Link>
          <Link
            to="/vip"
            className="inline-block border border-white/20 px-6 py-3 text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#ece8e1] no-underline transition-all hover:border-white/40 hover:bg-white/5"
          >
            Club VIP Radiant
          </Link>
        </div>
      </div>

      {/* Quick-access cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {quickAccess.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="val-card block p-5 no-underline"
            style={{ color: 'inherit' }}
          >
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#ff4655]/65">{item.tag}</p>
            <p className="display-title mt-2 text-2xl text-white">{item.name}</p>
            <p className="mt-1 text-sm font-semibold tracking-wider text-[#768079]">{item.value}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
