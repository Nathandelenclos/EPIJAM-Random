import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState, useRef } from 'react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/roulette')({ component: RoulettePage })

// ============================================================
// Server functions
// ============================================================

type RouletteChoice = 'red' | 'black' | 'green'

const playRoulette = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string; bet: number; choice: RouletteChoice }) => data)
  .handler(async ({ data }) => {
    const { nickname, bet, choice } = data
    if (bet <= 0) return { ok: false as const, message: 'Mise invalide.' }

    const player = await prisma.player.findUnique({ where: { nickname } })
    if (!player) return { ok: false as const, message: 'Joueur introuvable.' }
    if (player.balance < bet) return { ok: false as const, message: 'Solde insuffisant.' }

    // 37 slots: 0=green, 1-18=red, 19-36=black
    const slot = Math.floor(Math.random() * 37)
    const result: RouletteChoice = slot === 0 ? 'green' : slot <= 18 ? 'red' : 'black'
    const won = result === choice

    let multiplier = 0
    if (won) {
      multiplier = choice === 'green' ? 14 : 2
    }

    const payout = won ? bet * multiplier : 0
    const delta = payout - bet

    await prisma.player.update({
      where: { nickname },
      data: { balance: { increment: delta }, totalWagered: { increment: bet } },
    })

    await prisma.rouletteGame.create({
      data: {
        player: { connect: { nickname } },
        bet,
        choice,
        result,
        won,
        payout: won ? payout : 0,
      },
    })

    // missions
    const p = await prisma.player.findUnique({ where: { nickname }, select: { id: true } })
    if (p) {
      await updateMissions(p.id, { won, bet, isJackpot: won && multiplier >= 4 })
    }

    return {
      ok: true as const,
      slot,
      result,
      won,
      multiplier,
      payout,
      delta,
      newBalance: player.balance + delta,
      message: won
        ? `${result.toUpperCase()} sorti ! Vous gagnez ${payout} VP (×${multiplier}).`
        : `${result.toUpperCase()} sorti. Vous perdez ${bet} VP.`,
    }
  })

async function updateMissions(playerId: number, opts: { won: boolean; bet: number; isJackpot: boolean }) {
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
  if (opts.isJackpot) await up('jackpots_3', 1, 3)
  if (opts.isJackpot) await up('big_win_4', 1, 4)
}

// ============================================================
// Roulette wheel CSS animation
// ============================================================

// 37 sectors: 0 green, then alternating red/black
const SECTORS: { label: string; color: RouletteChoice }[] = [
  { label: '0', color: 'green' },
  ...Array.from({ length: 36 }, (_, i) => ({
    label: String(i + 1),
    color: (i + 1 <= 18 ? 'red' as const : 'black' as const),
  })),
]

const RESULT_COLORS: Record<RouletteChoice, string> = {
  red: '#ff4655',
  black: '#ece8e1',
  green: '#00c4b0',
}

function RouletteWheel({ spinning, finalSlot }: { spinning: boolean; finalSlot: number | null }) {
  // The wheel shows a simple CSS spinner; indicator at top
  const sectorAngle = 360 / 37

  return (
    <div className="relative mx-auto h-64 w-64">
      <div
        className={[
          'relative h-64 w-64 rounded-full border-4 border-[rgba(255,70,85,0.4)] overflow-hidden',
          spinning ? 'animate-[rouletteSpin_0.8s_linear_infinite]' : '',
          'transition-transform',
        ].join(' ')}
        style={
          !spinning && finalSlot !== null
            ? { transform: `rotate(${(finalSlot * sectorAngle + 180) % 360}deg)`, transition: 'transform 1.5s cubic-bezier(0.16,1,0.3,1)' }
            : undefined
        }
      >
        {SECTORS.map((sector, i) => {
          const angle = i * sectorAngle
          return (
            <div
              key={sector.label}
              className="absolute left-1/2 top-0 origin-bottom"
              style={{
                width: '2px',
                height: '50%',
                transform: `rotate(${angle}deg) translateX(-50%)`,
                background: sector.color === 'green' ? '#00c4b0' : sector.color === 'red' ? '#ff4655' : '#253342',
              }}
            />
          )
        })}
        {/* Center */}
        <div className="absolute inset-[35%] rounded-full bg-[#0f1923] border-2 border-[rgba(255,70,85,0.3)] flex items-center justify-center">
          <span className="display-title text-lg text-white">
            {finalSlot !== null ? SECTORS[finalSlot].label : '?'}
          </span>
        </div>
      </div>
      {/* Indicator arrow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 text-[#ff4655] text-xl">▼</div>
    </div>
  )
}

type Choice = RouletteChoice

function RoulettePage() {
  const { nickname, balance, refreshBalance } = usePlayer()
  const playRouletteFn = useServerFn(playRoulette)

  const [bet, setBet] = useState(100)
  const [choice, setChoice] = useState<Choice>('red')
  const [spinning, setSpinning] = useState(false)
  const [finalSlot, setFinalSlot] = useState<number | null>(null)
  const [gameResult, setGameResult] = useState<{ won: boolean; result: Choice; message: string; delta: number } | null>(null)
  const [error, setError] = useState('')

  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSpin = async () => {
    if (!nickname) { setError('Connectez-vous d\'abord.'); return }
    const cleanBet = Math.floor(bet)
    if (cleanBet <= 0) { setError('Mise invalide.'); return }

    setError('')
    setGameResult(null)
    setFinalSlot(null)
    setSpinning(true)

    try {
      const res = await playRouletteFn({ data: { nickname, bet: cleanBet, choice } })
      if (!res.ok) {
        setSpinning(false)
        setError(res.message)
        return
      }

      // Animate for 1.5s then reveal
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
      spinTimeoutRef.current = setTimeout(() => {
        setSpinning(false)
        setFinalSlot(res.slot)
        setGameResult({ won: res.won, result: res.result, message: res.message, delta: res.delta })
        refreshBalance()
      }, 1500)
    } catch {
      setSpinning(false)
      setError('Erreur serveur.')
    }
  }

  const reset = () => {
    setFinalSlot(null)
    setGameResult(null)
    setError('')
  }

  const choiceOptions: { value: Choice; label: string; color: string; odds: string }[] = [
    { value: 'red', label: 'Rouge', color: '#ff4655', odds: '×2' },
    { value: 'black', label: 'Noir', color: '#ece8e1', odds: '×2' },
    { value: 'green', label: 'Vert (Spike)', color: '#00c4b0', odds: '×14' },
  ]

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Omen · Zone de Plant</p>
        <h1 className="display-title mt-2 text-5xl text-white">Spike Roulette</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          37 cases en zone de plant. La case Spike (Vert) déclenche le bonus Defuse ×14. Pariez sur Rouge ou Noir pour ×2.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="val-card p-8">
          <RouletteWheel spinning={spinning} finalSlot={finalSlot} />

          {gameResult && (
            <div className={[
              'mx-auto mt-6 max-w-sm border p-4 text-center',
              gameResult.won
                ? 'border-[rgba(0,196,176,0.4)] bg-[rgba(0,196,176,0.08)] text-[#80e8df]'
                : 'border-[rgba(255,70,85,0.4)] bg-[rgba(255,70,85,0.08)] text-[#ffcdd1]',
            ].join(' ')}>
              <p className="font-bold">{gameResult.message}</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: RESULT_COLORS[gameResult.result] }}>
                {gameResult.result.toUpperCase()}
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-center text-sm text-[#ff4655]">{error}</p>}

          {spinning && (
            <p className="mt-4 text-center text-sm font-bold uppercase tracking-[0.16em] text-[#768079] animate-pulse">
              La roue tourne...
            </p>
          )}
        </article>

        <aside className="space-y-4">
          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Votre pari</p>

            <div className="mt-4 space-y-2">
              {choiceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChoice(opt.value)}
                  disabled={spinning}
                  className={[
                    'w-full flex items-center justify-between border px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.14em] transition',
                    choice === opt.value
                      ? 'border-[rgba(255,70,85,0.6)] bg-[rgba(255,70,85,0.12)] text-white'
                      : 'border-white/14 bg-[#253342] text-[#a8b0b8] hover:border-white/30 hover:text-white',
                    spinning ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: opt.color }} />
                    {opt.label}
                  </span>
                  <span style={{ color: opt.color }}>{opt.odds}</span>
                </button>
              ))}
            </div>

            <label htmlFor="roulette-bet" className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]">
              Mise (VP)
            </label>
            <input
              id="roulette-bet"
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
                <button key={v} type="button" onClick={() => setBet(v)} disabled={spinning} className="val-toggle px-3 py-1 text-[0.62rem]">
                  {v}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
              <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
            </div>

            {!gameResult ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning}
                className="mt-5 w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {spinning ? 'En cours...' : 'Lancer la roulette'}
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="mt-5 w-full border border-white/18 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d7dde4] transition hover:border-white/35 hover:bg-white/5"
              >
                Nouveau spin
              </button>
            )}
          </article>
        </aside>
      </div>
    </section>
  )
}
