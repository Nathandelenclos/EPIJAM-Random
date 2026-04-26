import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/crate-rush')({ component: CrateRushPage })

// ============================================================
// Server functions
// ============================================================

const playCrateRush = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string; bet: number; chosenIndex: number }) => data)
  .handler(async ({ data }) => {
    const { nickname, bet, chosenIndex } = data

    if (bet <= 0) return { ok: false as const, message: 'Mise invalide.' }

    const player = await prisma.player.findUnique({ where: { nickname } })
    if (!player) return { ok: false as const, message: 'Joueur introuvable.' }
    if (player.balance < bet) return { ok: false as const, message: 'Solde insuffisant.' }

    const NUM_CRATES = 5
    const winningIndex = Math.floor(Math.random() * NUM_CRATES)
    const won = chosenIndex === winningIndex
    const multiplier = won ? NUM_CRATES : 0
    const payout = won ? bet * multiplier : 0
    const delta = payout - bet

    await prisma.player.update({
      where: { nickname },
      data: {
        balance: { increment: delta },
        totalWagered: { increment: bet },
      },
    })

    await prisma.crateRushGame.create({
      data: {
        player: { connect: { nickname } },
        bet,
        won,
        multiplier: won ? multiplier : 0,
      },
    })

    // Update missions
    await updateMissions(player.id, { won, bet, multiplier: won ? multiplier : 0 })

    const newBalance = player.balance + delta

    return {
      ok: true as const,
      won,
      winningIndex,
      multiplier,
      payout,
      delta,
      newBalance,
      message: won
        ? `Caisse ouverte ! Vous gagnez ${payout} VP (x${multiplier}).`
        : `Mauvaise caisse. Vous perdez ${bet} VP.`,
    }
  })

async function updateMissions(playerId: number, result: { won: boolean; bet: number; multiplier: number }) {
  const upsertProgress = async (key: string, increment: number, goal: number) => {
    const existing = await prisma.playerMission.findUnique({
      where: { playerId_missionKey: { playerId, missionKey: key } },
    })
    if (existing?.completed) return
    const newProgress = (existing?.progress ?? 0) + increment
    await prisma.playerMission.upsert({
      where: { playerId_missionKey: { playerId, missionKey: key } },
      update: { progress: Math.min(newProgress, goal), completed: newProgress >= goal },
      create: { playerId, missionKey: key, progress: Math.min(increment, goal), completed: increment >= goal },
    })
  }

  // total_games_20: any game played
  await upsertProgress('total_games_20', 1, 20)
  // wins_5: any win
  if (result.won) await upsertProgress('wins_5', 1, 5)
  // low_bets_10: bet <= 50
  if (result.bet <= 50) await upsertProgress('low_bets_10', 1, 10)
  // big_win_4: multiplier >= 4
  if (result.won && result.multiplier >= 4) await upsertProgress('big_win_4', 1, 4)
  // spike_rush_5: crate rush specific
  await upsertProgress('spike_rush_5', 1, 5)
}

// ============================================================
// Component
// ============================================================

const NUM_CRATES = 5

function CrateRushPage() {
  const { nickname, balance, refreshBalance } = usePlayer()
  const playCrateRushFn = useServerFn(playCrateRush)

  const [bet, setBet] = useState(100)
  const [chosen, setChosen] = useState<number | null>(null)
  const [winningIndex, setWinningIndex] = useState<number | null>(null)
  const [result, setResult] = useState<{ won: boolean; message: string; payout: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setChosen(null)
    setWinningIndex(null)
    setResult(null)
    setRevealed(false)
    setError('')
  }

  const handlePlay = async () => {
    if (!nickname) { setError('Connectez-vous d\'abord.'); return }
    if (chosen === null) { setError('Choisissez une caisse.'); return }
    const cleanBet = Math.floor(bet)
    if (cleanBet <= 0) { setError('Mise invalide.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await playCrateRushFn({ data: { nickname, bet: cleanBet, chosenIndex: chosen } })
      if (!res.ok) { setError(res.message); return }
      setWinningIndex(res.winningIndex)
      setResult({ won: res.won, message: res.message, payout: res.payout })
      setRevealed(true)
      await refreshBalance()
    } catch {
      setError('Erreur serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Killjoy · Kingdom Corp</p>
        <h1 className="display-title mt-2 text-5xl text-white">Crate Rush</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Choisissez 1 caisse parmi {NUM_CRATES}. Une seule contient l'orbe Radianite. Multiplicateur ×{NUM_CRATES} si vous trouvez la bonne.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Crates grid */}
        <article className="val-card p-8">
          <p className="mb-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#768079]">
            Sélectionnez une caisse
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {Array.from({ length: NUM_CRATES }, (_, i) => {
              const isChosen = chosen === i
              const isWinner = revealed && winningIndex === i
              const isLoser = revealed && chosen === i && !isWinner

              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed || loading}
                  onClick={() => setChosen(i)}
                  className={[
                    'relative flex h-28 w-24 flex-col items-center justify-center border-2 transition-all duration-200',
                    'text-4xl',
                    isWinner ? 'border-[#00c4b0] bg-[rgba(0,196,176,0.15)] scale-105' :
                    isLoser ? 'border-[#ff4655] bg-[rgba(255,70,85,0.12)]' :
                    isChosen ? 'border-[#ff4655] bg-[rgba(255,70,85,0.15)] scale-105' :
                    'border-[rgba(255,70,85,0.2)] bg-[rgba(255,70,85,0.04)] hover:border-[rgba(255,70,85,0.5)] hover:bg-[rgba(255,70,85,0.1)]',
                    revealed || loading ? 'cursor-default' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className="text-3xl">
                    {revealed ? (isWinner ? '✨' : '📦') : (isChosen ? '🎯' : '📦')}
                  </span>
                  <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#768079]">
                    Caisse {i + 1}
                  </span>
                  {isWinner && (
                    <span className="absolute -top-2 text-[0.6rem] font-bold uppercase tracking-wide text-[#00c4b0]">
                      Gagnante!
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {result && (
            <div className={[
              'mt-6 border p-4',
              result.won
                ? 'border-[rgba(0,196,176,0.4)] bg-[rgba(0,196,176,0.08)] text-[#80e8df]'
                : 'border-[rgba(255,70,85,0.4)] bg-[rgba(255,70,85,0.08)] text-[#ffcdd1]',
            ].join(' ')}>
              <p className="font-bold">{result.message}</p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-[#ff4655]">{error}</p>}
        </article>

        {/* Controls */}
        <aside className="space-y-4">
          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Mise</p>

            <label htmlFor="crate-bet" className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]">
              Mise (VP)
            </label>
            <input
              id="crate-bet"
              type="number"
              min={10}
              step={10}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="val-input mt-2 w-full px-3 py-2 text-base"
              disabled={revealed || loading}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBet(v)}
                  disabled={revealed || loading}
                  className="val-toggle px-3 py-1 text-[0.62rem]"
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Gain potentiel</p>
              <p className="mt-1 text-xl font-bold text-[#00c4b0]">{bet * NUM_CRATES} VP</p>
              <p className="text-xs text-[#768079]">x{NUM_CRATES} si bonne caisse</p>
            </div>

            <div className="mt-3 rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
              <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
            </div>

            {!revealed ? (
              <button
                type="button"
                onClick={handlePlay}
                disabled={loading || chosen === null}
                className="mt-5 w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Ouverture...' : chosen === null ? 'Choisissez une caisse' : 'Ouvrir la caisse'}
              </button>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="mt-5 w-full border border-white/18 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d7dde4] transition hover:border-white/35 hover:bg-white/5"
              >
                Rejouer
              </button>
            )}
          </article>

          <article className="val-card p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Règles</p>
            <ul className="mt-3 space-y-1.5">
              {[
                `${NUM_CRATES} caisses, 1 gagnante`,
                `Multiplicateur ×${NUM_CRATES} sur la mise`,
                'Chance 1/' + NUM_CRATES + ' = 20%',
                'RTP théorique: 100%',
              ].map((rule) => (
                <li key={rule} className="flex items-center gap-2 text-xs text-[#a8b0b8]">
                  <span className="h-1 w-1 shrink-0 rotate-45 bg-[#ff4655]" />
                  {rule}
                </li>
              ))}
            </ul>
          </article>
        </aside>
      </div>
    </section>
  )
}
