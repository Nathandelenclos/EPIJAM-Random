import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const liveStats = [
  { label: 'Agents en jeu', value: '847' },
  { label: 'VP misés / 24h', value: '2.4M' },
  { label: 'Jackpots defused', value: '13' },
] as const

const stats = [
  { name: 'Dés 3D', path: '/dice-3d', value: 'roll interactif', tag: 'New' },
  { name: 'Crate Rush', path: '/games', value: 'x32 max', tag: 'Games' },
  { name: 'Tables Live', path: '/tables', value: '6 salons', tag: 'Live' },
  { name: 'Missions', path: '/missions', value: '6 challenges', tag: 'Daily' },
  { name: 'VIP Club', path: '/vip', value: '3 tiers', tag: 'Rank' },
] as const

function Home() {
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
        {/* Corner triangle accent */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-7 w-7"
          style={{ background: 'linear-gradient(-45deg, transparent 50%, rgba(255,70,85,0.55) 50%)' }}
        />
        {/* Decorative vertical lines */}
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

        {/* Live protocol stats */}
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
        {stats.map((item) => (
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
