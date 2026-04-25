import { Link, createFileRoute } from '@tanstack/react-router'
import { Dices, Swords, Target, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/games')({ component: GamesPage })

type RiskLevel = 'low' | 'medium' | 'variable' | 'high'

interface Game {
  name: string
  agent: string
  desc: string
  odds: string
  risk: string
  riskLevel: RiskLevel
  Icon: LucideIcon
  path?: string
}

const RISK_BADGE: Record<RiskLevel, string> = {
  low: 'val-badge val-badge-teal',
  medium: 'val-badge val-badge-gold',
  variable: 'val-badge val-badge-grey',
  high: 'val-badge val-badge-red',
}

const games: Game[] = [
  {
    name: 'Dice 3D Showdown',
    agent: 'Raze',
    desc: "Raze balance ses grenades-dés — 6 faces Radianite chargées. Bonus Showstopper actif sur tout tirage 5 ou 6.",
    odds: 'Hit 33.3%',
    risk: 'Risque variable',
    riskLevel: 'variable',
    Icon: Dices,
    path: '/dice-3d',
  },
  {
    name: 'Crate Rush',
    agent: 'Killjoy',
    desc: "Caisses Kingdom Corp avec orbes Radianite intégrés — skins Vandal, Phantom et Operator au multiplicateur progressif.",
    odds: 'RTP 97.2%',
    risk: 'Risque moyen',
    riskLevel: 'medium',
    Icon: Swords,
  },
  {
    name: 'Spike Roulette',
    agent: 'Omen',
    desc: "Roulette 37 cases en zone de plant. La case Spike déclenche le bonus Defuse ×5 — Shrouded Step entre chaque spin.",
    odds: 'RTP 96.4%',
    risk: 'Risque variable',
    riskLevel: 'variable',
    Icon: Target,
  },
  {
    name: 'Agent Blackjack',
    agent: 'Chamber',
    desc: "Chamber en croupier Tour de Force : table 1v1, double mise sur toute main soft 17+, TP bonus sur blackjack naturel.",
    odds: 'RTP 99.1%',
    risk: 'Risque faible',
    riskLevel: 'low',
    Icon: Users,
  },
  {
    name: 'Ulti Slots',
    agent: 'Reyna',
    desc: "5 rouleaux, 10 agents — aligne Empress, Blade Storm ou Tour de Force pour le jackpot ulti. Devour actif en cascade.",
    odds: 'RTP 95.9%',
    risk: 'Risque élevé',
    riskLevel: 'high',
    Icon: Zap,
  },
]

function GamesPage() {
  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Jeux disponibles · Kingdom Corp</p>
        <h1 className="display-title mt-2 text-5xl text-white">Catalogue des jeux</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Chaque table est animée par un agent croupier. Volatilité agressive, grind stable ou sessions rapides
          entre deux scrims — le choix est tactique.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {games.map(({ name, agent, desc, odds, risk, riskLevel, Icon, path }) => (
          <article key={name} className="val-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(255,70,85,0.28)] bg-[rgba(255,70,85,0.07)]">
                <Icon className="h-5 w-5 text-[#ff4655]" />
              </div>
              <span className="val-badge val-badge-teal">{odds}</span>
            </div>

            <h2 className="display-title mt-4 text-3xl text-white">{name}</h2>

            {/* Agent host */}
            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#00c4b0]/70">
              Animé par {agent}
            </p>

            <p className="mt-3 leading-relaxed text-[#a8b0b8]">{desc}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={RISK_BADGE[riskLevel]}>{risk}</span>
            </div>

            {path ? (
              <Link
                to={path}
                className="mt-5 inline-block bg-[#ff4655] px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white no-underline transition hover:bg-[#ff5a66] hover:shadow-[0_0_16px_rgba(255,70,85,0.4)]"
              >
                Jouer
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
