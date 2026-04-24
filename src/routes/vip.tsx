import { createFileRoute } from '@tanstack/react-router'
import { Crown } from 'lucide-react'

export const Route = createFileRoute('/vip')({ component: VipPage })

interface VipTier {
  level: string
  badge: string
  benefit: string
  requirement: string
  cardClass: string
  accentColor: string
  badgeClass: string
}

const tiers: VipTier[] = [
  {
    level: 'Radianite',
    badge: 'Tier I',
    benefit: 'Cashback 5%, support prioritaire, 1 ticket tournoi/semaine',
    requirement: '10 000 VP / mois',
    cardClass: 'val-rank-card val-rank-radianite',
    accentColor: '#3fb8d4',
    badgeClass: 'val-badge val-badge-teal',
  },
  {
    level: 'Immortal',
    badge: 'Tier II',
    benefit: 'Cashback 10%, bonus dépôt x1.2, accès salon privé',
    requirement: '40 000 VP / mois',
    cardClass: 'val-rank-card val-rank-immortal',
    accentColor: '#d4344a',
    badgeClass: 'val-badge val-badge-red',
  },
  {
    level: 'Radiant',
    badge: 'Tier III',
    benefit: 'Cashback 15%, limite relevée, manager dédié, retraits instantanés',
    requirement: '120 000 VP / mois',
    cardClass: 'val-rank-card val-rank-radiant',
    accentColor: '#ffe072',
    badgeClass: 'val-badge val-badge-gold',
  },
]

function VipPage() {
  return (
    <section className="space-y-5">
      {/* Hero header — gold theme */}
      <header
        className="relative overflow-hidden border border-[rgba(255,224,114,0.18)] bg-[linear-gradient(130deg,#1e1900_0%,#0f1923_100%)] p-7"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)',
          borderTop: '2px solid #ffe072',
        }}
      >
        {/* Gold corner accent */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-6 w-6"
          style={{ background: 'linear-gradient(-45deg, transparent 50%, rgba(255,224,114,0.5) 50%)' }}
        />

        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#ffe072]">Elite Access</p>
        <h1 className="display-title mt-2 text-5xl text-white">Club VIP Valorant Casino</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Plus vous jouez, plus vos avantages montent. Le tier Radiant ouvre les salons ultra high stakes.
        </p>
      </header>

      {/* Tier cards */}
      <div className="space-y-4">
        {tiers.map(({ level, badge, benefit, requirement, cardClass, accentColor, badgeClass }) => (
          <article key={level} className={`${cardClass} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 shrink-0" style={{ color: accentColor }} />
                <h2 className="display-title text-3xl text-white">{level}</h2>
                <span
                  className="text-[0.62rem] font-bold uppercase tracking-[0.18em]"
                  style={{ color: accentColor + '99' }}
                >
                  {badge}
                </span>
              </div>
              <span className={badgeClass}>{requirement}</span>
            </div>
            <p className="mt-4 leading-relaxed text-[#a8b0b8]">{benefit}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
