import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState, useEffect, useRef } from 'react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/slots')({ component: SlotsPage })

// ============================================================
// Symbols
// ============================================================

const SYMBOLS = ['🔴', '🗡️', '🎯', '💎', '🔫'] as const
type Symbol = typeof SYMBOLS[number]

const SYMBOL_NAMES: Record<Symbol, string> = {
  '🔴': 'Spike',
  '🗡️': 'Knife',
  '🎯': 'Vandal',
  '💎': 'Radianite',
  '🔫': 'Phantom',
}

const SYMBOL_MULTIPLIERS: Record<string, number> = {
  // 3 of a kind
  '🔴🔴🔴': 20,
  '🗡️🗡️🗡️': 15,
  '🎯🎯🎯': 10,
  '💎💎💎': 8,
  '🔫🔫🔫': 6,
  // 2 of a kind
  '🔴🔴': 3,
  '🗡️🗡️': 2.5,
  '🎯🎯': 2,
  '💎💎': 1.5,
  '🔫🔫': 1.5,
}

function spinReels(): [Symbol, Symbol, Symbol] {
  return [
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ]
}

function calculatePayout(reels: [Symbol, Symbol, Symbol], bet: number): { multiplier: number; payout: number } {
  const [a, b, c] = reels
  // 3 of a kind
  if (a === b && b === c) {
    const key = `${a}${b}${c}`
    const mult = SYMBOL_MULTIPLIERS[key] ?? 5
    return { multiplier: mult, payout: bet * mult }
  }
  // 2 of a kind (any pair)
  if (a === b || b === c || a === c) {
    const sym = a === b ? a : b === c ? b : a
    const key = `${sym}${sym}`
    const mult = SYMBOL_MULTIPLIERS[key] ?? 1.5
    return { multiplier: mult, payout: Math.floor(bet * mult) }
  }
  return { multiplier: 0, payout: 0 }
}

// ============================================================
// Server function
// ============================================================

const playSlots = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string; bet: number }) => data)
  .handler(async ({ data }) => {
    const { nickname, bet } = data
    if (bet <= 0) return { ok: false as const, message: 'Mise invalide.' }

    const player = await prisma.player.findUnique({ where: { nickname } })
    if (!player) return { ok: false as const, message: 'Joueur introuvable.' }
    if (player.balance < bet) return { ok: false as const, message: 'Solde insuffisant.' }

    const reels = spinReels()
    const { multiplier, payout } = calculatePayout(reels, bet)
    const won = payout > 0
    const delta = payout - bet

    await prisma.player.update({
      where: { nickname },
      data: { balance: { increment: delta }, totalWagered: { increment: bet } },
    })

    await prisma.slotsGame.create({
      data: {
        player: { connect: { nickname } },
        bet,
        won,
        symbols: reels.join(','),
        payout: won ? payout : 0,
      },
    })

    const p = await prisma.player.findUnique({ where: { nickname }, select: { id: true } })
    if (p) {
      await updateMissions(p.id, { won, bet, multiplier })
    }

    return {
      ok: true as const,
      reels,
      won,
      multiplier,
      payout,
      delta,
      newBalance: player.balance + delta,
      message: won
        ? multiplier >= 10
          ? `JACKPOT ! ${reels.join(' ')} — ×${multiplier} = +${payout} VP !`
          : `Gagné ! ${reels.join(' ')} — ×${multiplier} = +${payout} VP`
        : `Perdu. ${reels.join(' ')} — aucune combinaison.`,
    }
  })

async function updateMissions(playerId: number, opts: { won: boolean; bet: number; multiplier: number }) {
  const up = async (key: string, inc: number, goal: number) => {
    const ex = await prisma.playerMission.findUnique({ where: { playerId_missionKey: { playerId, missionKey: key } } })
    if (ex?.completed) return
    const np = (ex?.progress ?? 0) + inc
    await prisma.playerMission.upsert({
      where: { playerId_missionKey: { playerId, missionKey: key } },
      update: { progress: Math.min(np, goal), completed: np >= goal },
      create: { playerId, missionKey: key, progress: Math.min(inc, goal), completed: inc >= goal },
    })
  }
  await up('total_games_20', 1, 20)
  if (opts.won) await up('wins_5', 1, 5)
  if (opts.bet <= 50) await up('low_bets_10', 1, 10)
  if (opts.multiplier >= 10) await up('jackpots_3', 1, 3)
  if (opts.multiplier >= 4) await up('big_win_4', 1, 4)
}

// ============================================================
// Spinning animation
// ============================================================

function ReelDisplay({ symbol, spinning }: { symbol: Symbol; spinning: boolean }) {
  const [displaySymbol, setDisplaySymbol] = useState<Symbol>(symbol)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setDisplaySymbol(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      }, 80)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setDisplaySymbol(symbol)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [spinning, symbol])

  return (
    <div className={[
      'flex h-20 w-20 items-center justify-center border-2 text-4xl transition-all',
      spinning ? 'border-[rgba(255,70,85,0.5)] bg-[rgba(255,70,85,0.08)] scale-95' : 'border-[rgba(255,70,85,0.25)] bg-[rgba(255,70,85,0.04)]',
    ].join(' ')}>
      <span>{displaySymbol}</span>
    </div>
  )
}

// ============================================================
// Component
// ============================================================

function SlotsPage() {
  const { nickname, balance, refreshBalance } = usePlayer()
  const playSlotsFn = useServerFn(playSlots)

  const [bet, setBet] = useState(100)
  const [reels, setReels] = useState<[Symbol, Symbol, Symbol]>(['🔫', '🎯', '💎'])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ won: boolean; message: string; delta: number; multiplier: number } | null>(null)
  const [error, setError] = useState('')

  const handleSpin = async () => {
    if (!nickname) { setError('Connectez-vous d\'abord.'); return }
    const cleanBet = Math.floor(bet)
    if (cleanBet <= 0) { setError('Mise invalide.'); return }

    setError('')
    setResult(null)
    setSpinning(true)

    try {
      const res = await playSlotsFn({ data: { nickname, bet: cleanBet } })
      if (!res.ok) {
        setSpinning(false)
        setError(res.message)
        return
      }

      // Spin for 1.5s, then reveal
      setTimeout(() => {
        setSpinning(false)
        setReels(res.reels)
        setResult({ won: res.won, message: res.message, delta: res.delta, multiplier: res.multiplier })
        refreshBalance()
      }, 1500)
    } catch {
      setSpinning(false)
      setError('Erreur serveur.')
    }
  }

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Reyna · Empress Mode</p>
        <h1 className="display-title mt-2 text-5xl text-white">Ulti Slots</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          3 rouleaux, 5 symboles Valorant. Alignez 2 ou 3 symboles identiques pour gagner. Spike ×3 = JACKPOT ×20.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="val-card p-8">
          {/* Machine */}
          <div
            className="mx-auto max-w-xs border-2 border-[rgba(255,70,85,0.3)] p-6"
            style={{ background: 'linear-gradient(160deg, #1a2733 0%, #0f1923 100%)' }}
          >
            <p className="mb-4 text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
              Ulti Slots · Reyna Casino
            </p>
            <div className="flex justify-center gap-3">
              {reels.map((sym, i) => (
                <ReelDisplay key={i} symbol={sym} spinning={spinning} />
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-3">
              {reels.map((sym, i) => (
                <p key={i} className="w-20 text-center text-[0.55rem] font-bold uppercase tracking-wide text-[#768079]">
                  {spinning ? '...' : SYMBOL_NAMES[sym]}
                </p>
              ))}
            </div>
          </div>

          {result && (
            <div className={[
              'mx-auto mt-6 max-w-sm border p-4 text-center',
              result.won
                ? result.multiplier >= 10
                  ? 'border-[rgba(255,224,114,0.5)] bg-[rgba(255,224,114,0.08)] text-[#ffe072]'
                  : 'border-[rgba(0,196,176,0.4)] bg-[rgba(0,196,176,0.08)] text-[#80e8df]'
                : 'border-[rgba(255,70,85,0.4)] bg-[rgba(255,70,85,0.08)] text-[#ffcdd1]',
            ].join(' ')}>
              <p className="font-bold">{result.message}</p>
              {result.won && (
                <p className="mt-1 text-xs text-[#768079]">
                  Multiplicateur ×{result.multiplier}
                </p>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-center text-sm text-[#ff4655]">{error}</p>}
        </article>

        <aside className="space-y-4">
          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Machine à sous</p>

            <label htmlFor="slots-bet" className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]">
              Mise (VP)
            </label>
            <input
              id="slots-bet"
              type="number"
              min={10}
              step={10}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="val-input mt-2 w-full px-3 py-2 text-base"
              disabled={spinning}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[50, 100, 250, 500].map((v) => (
                <button key={v} type="button" onClick={() => setBet(v)} disabled={spinning} className="val-toggle px-3 py-1 text-[0.62rem]">{v}</button>
              ))}
            </div>

            <div className="mt-4 rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
              <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning}
              className="mt-5 w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {spinning ? 'Spinning...' : 'Lancer les rouleaux'}
            </button>
          </article>

          <article className="val-card p-5">
            <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Gains</p>
            <div className="space-y-1.5">
              {[
                { combo: '🔴🔴🔴', label: 'Spike x3', mult: '×20' },
                { combo: '🗡️🗡️🗡️', label: 'Knife x3', mult: '×15' },
                { combo: '🎯🎯🎯', label: 'Vandal x3', mult: '×10' },
                { combo: '💎💎💎', label: 'Radianite x3', mult: '×8' },
                { combo: '🔫🔫🔫', label: 'Phantom x3', mult: '×6' },
                { combo: 'Paire', label: 'N\'importe quelle paire', mult: '×1.5-3' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#a8b0b8]">{row.label}</span>
                  <span className="font-bold text-[#ff4655]">{row.mult}</span>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}
