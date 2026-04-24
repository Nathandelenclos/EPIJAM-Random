import { Link, createFileRoute } from '@tanstack/react-router'
import { Dices, Swords, Target, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/games')({ component: GamesPage })

type RiskLevel = 'low' | 'medium' | 'variable' | 'high'

interface Game {
  name: string
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

function GamesPage() {
  const games: Game[] = [
    {
      name: 'Dice 3D Showdown',
      desc: 'De tridimensionnel interactif, bonus clutch actif sur les tirages 5 ou 6.',
      odds: 'Hit chance 33.3%',
      risk: 'Risque variable',
      riskLevel: 'variable',
      Icon: Dices,
      path: '/dice-3d',
    },
    {
      name: 'Crate Rush',
      desc: "Ouvrez des caisses d'arsenal avec multiplicateurs progressifs et risque de rupture.",
      odds: 'RTP 97.2%',
      risk: 'Risque moyen',
      riskLevel: 'medium',
      Icon: Swords,
    },
    {
      name: 'Spike Roulette',
      desc: 'Roulette néon à 37 cases avec bonus clutch sur les numéros tactiques.',
      odds: 'RTP 96.4%',
      risk: 'Risque variable',
      riskLevel: 'variable',
      Icon: Target,
    },
    {
      name: 'Agent Blackjack',
      desc: 'Table 1v1 contre Chamber Dealer, double mise sur les mains soft.',
      odds: 'RTP 99.1%',
      risk: 'Risque faible',
      riskLevel: 'low',
      Icon: Users,
    },
    {
      name: 'Ulti Slots',
      desc: 'Machines à 5 rouleaux, symboles ulti et free spins overtime.',
      odds: 'RTP 95.9%',
      risk: 'Risque élevé',
      riskLevel: 'high',
      Icon: Zap,
    },
  ]

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Jeux disponibles</p>
        <h1 className="display-title mt-2 text-5xl text-white">Catalogue des jeux</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Choisissez votre style : volatilité agressive, grind stable, ou sessions rapides entre deux scrims.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {games.map(({ name, desc, odds, risk, riskLevel, Icon, path }) => (
          <article key={name} className="val-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(255,70,85,0.28)] bg-[rgba(255,70,85,0.07)]">
                <Icon className="h-5 w-5 text-[#ff4655]" />
              </div>
              <span className="val-badge val-badge-teal">{odds}</span>
            </div>

            <h2 className="display-title mt-4 text-3xl text-white">{name}</h2>
            <p className="mt-2 leading-relaxed text-[#a8b0b8]">{desc}</p>

            <div className="mt-4">
              <span className={RISK_BADGE[riskLevel]}>{risk}</span>
            </div>

            {path ? (
              <Link
                to={path}
                className="mt-5 inline-block bg-[#ff4655] px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white no-underline transition hover:bg-[#ff5a66]"
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
