import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/vip')({ component: VipPage })

// ============================================================
// VIP tier definitions
// ============================================================

interface VipTier {
  level: string
  badge: string
  lore: string
  benefit: string
  perks: string[]
  threshold: number
  label: string
  cardClass: string
  accentColor: string
  badgeClass: string
}

const TIERS: VipTier[] = [
  {
    level: 'Radianite',
    badge: 'Tier I',
    lore: "Accès au réseau Kingdom Corp niveau Initié. Cypher surveille vos mises.",
    benefit: 'Cashback 5%, support prioritaire, 1 ticket tournoi / semaine',
    perks: ['Spike Rush access illimité', 'Caisses Kingdom Corp x2 / semaine', 'Chat vocal squad activé'],
    threshold: 10_000,
    label: '10 000 VP misés',
    cardClass: 'val-rank-card val-rank-radianite',
    accentColor: '#3fb8d4',
    badgeClass: 'val-badge val-badge-teal',
  },
  {
    level: 'Immortal',
    badge: 'Tier II',
    lore: "Autorisation Kingdom Corp niveau Opérateur. Chamber vous reçoit en salon privé.",
    benefit: 'Cashback 10%, bonus dépôt ×1.2, accès Boutique de Chamber',
    perks: ['Table Haven Privé débloquée', 'Tokens Reyna Devour ×3 / jour', 'Anti-cheat Cypher inclus'],
    threshold: 40_000,
    label: '40 000 VP misés',
    cardClass: 'val-rank-card val-rank-immortal',
    accentColor: '#d4344a',
    badgeClass: 'val-badge val-badge-red',
  },
  {
    level: 'Radiant',
    badge: 'Tier III',
    lore: "Protocole Radiant actif. Jett vous escorte — limite relevée, retraits en vitesse Tailwind.",
    benefit: 'Cashback 15%, limite relevée, manager dédié, retraits instantanés',
    perks: ['Jett High-Roll Suite exclusive', 'Omen Black Market access', 'Tour de Force jackpot ×3', 'Retrait Tailwind — 0 délai'],
    threshold: 120_000,
    label: '120 000 VP misés',
    cardClass: 'val-rank-card val-rank-radiant',
    accentColor: '#ffe072',
    badgeClass: 'val-badge val-badge-gold',
  },
]

// ============================================================
// Server function
// ============================================================

const getVipStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string }) => data)
  .handler(async ({ data }) => {
    const player = await prisma.player.findUnique({
      where: { nickname: data.nickname },
      select: { totalWagered: true },
    })
    return { totalWagered: player?.totalWagered ?? 0 }
  })

function getCurrentTier(totalWagered: number): { tier: VipTier | null; nextTier: VipTier | null; progress: number } {
  let current: VipTier | null = null
  let next: VipTier | null = null

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalWagered >= TIERS[i].threshold) {
      current = TIERS[i]
      next = TIERS[i + 1] ?? null
      break
    }
  }

  if (!current) {
    next = TIERS[0]
    const progress = Math.min(100, Math.round((totalWagered / TIERS[0].threshold) * 100))
    return { tier: null, nextTier: next, progress }
  }

  if (!next) {
    return { tier: current, nextTier: null, progress: 100 }
  }

  const fromPrev = current.threshold
  const span = next.threshold - fromPrev
  const progress = Math.min(100, Math.round(((totalWagered - fromPrev) / span) * 100))
  return { tier: current, nextTier: next, progress }
}

// ============================================================
// Component
// ============================================================

function VipPage() {
  const { nickname } = usePlayer()
  const [totalWagered, setTotalWagered] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nickname) return
    setLoading(true)
    getVipStatus({ data: { nickname } })
      .then((r) => setTotalWagered(r.totalWagered))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [nickname])

  const { tier, nextTier, progress } = getCurrentTier(totalWagered)

  return (
    <section className="space-y-5">
      <header
        className="relative overflow-hidden border border-[rgba(255,224,114,0.18)] bg-[linear-gradient(130deg,#1e1900_0%,#0f1923_100%)] p-7"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)',
          borderTop: '2px solid #ffe072',
        }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-6 w-6"
          style={{ background: 'linear-gradient(-45deg, transparent 50%, rgba(255,224,114,0.5) 50%)' }}
        />
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#ffe072]">
          Elite Access · Kingdom Corp
        </p>
        <h1 className="display-title mt-2 text-5xl text-white">Club VIP Valorant Casino</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Trois niveaux de clearance Kingdom Corp. Plus vous jouez, plus votre rang grimpe — jusqu'au protocole
          Radiant où Jett herself gère vos retraits.
        </p>

        {nickname && !loading && (
          <div className="mt-5 border border-[rgba(255,224,114,0.2)] bg-[rgba(255,224,114,0.05)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#ffe072]/70]">
                  Votre rang actuel
                </p>
                <p className="display-title text-2xl text-white">
                  {tier ? tier.level : 'Non classé'}
                </p>
                <p className="mt-1 text-xs text-[#768079]">
                  {totalWagered.toLocaleString()} VP misés au total
                </p>
              </div>
              {nextTier && (
                <div className="text-right">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#768079]">
                    Prochain palier
                  </p>
                  <p className="display-title text-xl" style={{ color: nextTier.accentColor }}>
                    {nextTier.level}
                  </p>
                  <p className="text-xs text-[#768079]">
                    {Math.max(0, nextTier.threshold - totalWagered).toLocaleString()} VP restants
                  </p>
                </div>
              )}
            </div>
            {nextTier && (
              <div className="mt-3 space-y-1">
                <div className="val-progress">
                  <div className="val-progress-inner" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${nextTier.accentColor}80, ${nextTier.accentColor})` }} />
                </div>
                <p className="text-right text-[0.62rem] font-bold tracking-[0.12em] text-[#768079]">{progress}%</p>
              </div>
            )}
            {!nextTier && tier && (
              <p className="mt-3 text-sm font-bold text-[#ffe072]">Rang maximum atteint — Protocole Radiant actif.</p>
            )}
          </div>
        )}

        {!nickname && (
          <p className="mt-4 text-sm font-bold text-[#ff4655]">Connectez-vous pour voir votre progression VIP.</p>
        )}
      </header>

      <div className="space-y-4">
        {TIERS.map(({ level, badge, lore, benefit, perks, label, cardClass, accentColor, badgeClass }) => {
          const isUnlocked = totalWagered >= TIERS.find((t) => t.level === level)!.threshold
          return (
            <article key={level} className={`${cardClass} p-6 ${isUnlocked && nickname ? 'ring-1 ring-current ring-offset-1 ring-offset-[#0f1923]' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 shrink-0" style={{ color: accentColor }} />
                    <h2 className="display-title text-3xl text-white">{level}</h2>
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em]" style={{ color: accentColor + '99' }}>
                      {badge}
                    </span>
                    {isUnlocked && nickname && (
                      <span className="val-badge val-badge-teal text-[0.58rem]">Débloqué</span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.72rem] italic text-[#768079]">{lore}</p>
                </div>
                <span className={badgeClass}>{label}</span>
              </div>

              <p className="mt-4 leading-relaxed text-[#a8b0b8]">{benefit}</p>

              <ul className="mt-4 space-y-1.5">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-[#a8b0b8]">
                    <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-current" style={{ color: accentColor }} />
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
