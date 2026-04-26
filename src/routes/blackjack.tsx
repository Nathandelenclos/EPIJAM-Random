import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/blackjack')({ component: BlackjackPage })

// ============================================================
// Card types & helpers
// ============================================================

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

interface Card {
  suit: Suit
  rank: Rank
  hidden: boolean
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function rankValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

function handValue(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const card of cards.filter((c) => !c.hidden)) {
    const v = rankValue(card.rank)
    total += v
    if (card.rank === 'A') aces++
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

function dealCard(hidden = false): Card {
  const suit = SUITS[Math.floor(Math.random() * 4)]
  const rank = RANKS[Math.floor(Math.random() * 13)]
  return { suit, rank, hidden }
}

// ============================================================
// Server functions
// ============================================================

const startBlackjack = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string; bet: number }) => data)
  .handler(async ({ data }) => {
    const { nickname, bet } = data
    if (bet <= 0) return { ok: false as const, message: 'Mise invalide.' }

    const player = await prisma.player.findUnique({ where: { nickname } })
    if (!player) return { ok: false as const, message: 'Joueur introuvable.' }
    if (player.balance < bet) return { ok: false as const, message: 'Solde insuffisant.' }

    const playerCards: Card[] = [dealCard(), dealCard()]
    const dealerCards: Card[] = [dealCard(), dealCard(true)]

    const playerScore = handValue(playerCards)

    // Natural blackjack check
    if (playerScore === 21) {
      const payout = Math.floor(bet * 2.5)
      const delta = payout - bet
      await prisma.player.update({
        where: { nickname },
        data: { balance: { increment: delta }, totalWagered: { increment: bet } },
      })
      const revealedDealer = dealerCards.map((c) => ({ ...c, hidden: false }))
      const dealerScore = handValue(revealedDealer)
      await prisma.blackjackGame.create({
        data: { player: { connect: { nickname } }, bet, won: true, playerScore: 21, dealerScore },
      })
      const p = await prisma.player.findUnique({ where: { nickname }, select: { id: true } })
      if (p) await updateMissions(p.id, { won: true, bet })
      return {
        ok: true as const,
        status: 'blackjack' as const,
        playerCards,
        dealerCards: revealedDealer,
        playerScore: 21,
        dealerScore,
        delta,
        newBalance: player.balance + delta,
        message: 'Blackjack naturel ! ×2.5',
      }
    }

    return {
      ok: true as const,
      status: 'playing' as const,
      playerCards,
      dealerCards,
      playerScore,
      dealerScore: 0,
      delta: 0,
      newBalance: player.balance,
      message: `Score: ${playerScore}. Hit ou Stand ?`,
    }
  })

const hitBlackjack = createServerFn({ method: 'POST' })
  .inputValidator((data: { playerCards: Card[]; dealerCards: Card[] }) => data)
  .handler(async ({ data }) => {
    const newCard = dealCard()
    const playerCards = [...data.playerCards, newCard]
    const playerScore = handValue(playerCards)

    if (playerScore > 21) {
      return {
        ok: true as const,
        status: 'bust' as const,
        playerCards,
        dealerCards: data.dealerCards,
        playerScore,
        message: `Bust ! Score: ${playerScore}. Vous perdez.`,
      }
    }

    if (playerScore === 21) {
      return {
        ok: true as const,
        status: 'stand_forced' as const,
        playerCards,
        dealerCards: data.dealerCards,
        playerScore,
        message: `21 ! Stand automatique.`,
      }
    }

    return {
      ok: true as const,
      status: 'playing' as const,
      playerCards,
      dealerCards: data.dealerCards,
      playerScore,
      message: `Score: ${playerScore}. Hit ou Stand ?`,
    }
  })

const standBlackjack = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string; bet: number; playerCards: Card[]; dealerCards: Card[] }) => data)
  .handler(async ({ data }) => {
    const { nickname, bet } = data

    const player = await prisma.player.findUnique({ where: { nickname } })
    if (!player) return { ok: false as const, message: 'Joueur introuvable.' }

    // Reveal dealer hidden card
    let dealerCards = data.dealerCards.map((c) => ({ ...c, hidden: false }))

    // Dealer draws to 17
    while (handValue(dealerCards) < 17) {
      dealerCards = [...dealerCards, dealCard()]
    }

    const playerScore = handValue(data.playerCards)
    const dealerScore = handValue(dealerCards)

    let won = false
    let delta = -bet
    let message = ''

    if (playerScore > 21) {
      message = `Bust ! Vous perdez ${bet} VP.`
    } else if (dealerScore > 21) {
      won = true
      delta = bet
      message = `Dealer bust (${dealerScore}) ! Vous gagnez ${bet} VP.`
    } else if (playerScore > dealerScore) {
      won = true
      delta = bet
      message = `Victoire ! ${playerScore} vs ${dealerScore}. +${bet} VP.`
    } else if (playerScore === dealerScore) {
      delta = 0
      message = `Égalité (${playerScore}). Mise remboursée.`
    } else {
      message = `Défaite. ${playerScore} vs ${dealerScore}. -${bet} VP.`
    }

    await prisma.player.update({
      where: { nickname },
      data: { balance: { increment: delta }, totalWagered: { increment: bet } },
    })

    await prisma.blackjackGame.create({
      data: { player: { connect: { nickname } }, bet, won, playerScore, dealerScore },
    })

    const p = await prisma.player.findUnique({ where: { nickname }, select: { id: true } })
    if (p) await updateMissions(p.id, { won, bet })

    return {
      ok: true as const,
      status: won ? ('win' as const) : ('lose' as const),
      playerCards: data.playerCards,
      dealerCards,
      playerScore,
      dealerScore,
      delta,
      newBalance: player.balance + delta,
      message,
    }
  })

async function updateMissions(playerId: number, opts: { won: boolean; bet: number }) {
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
}

// ============================================================
// Card component
// ============================================================

function CardDisplay({ card }: { card: Card }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <div className={[
      'flex h-16 w-11 flex-col items-start justify-between border p-1.5',
      card.hidden
        ? 'border-[rgba(255,70,85,0.3)] bg-[linear-gradient(135deg,#1a2733_25%,#253342_100%)]'
        : 'border-[rgba(255,255,255,0.2)] bg-[#ece8e1]',
    ].join(' ')}>
      {card.hidden ? (
        <span className="text-[#ff4655] text-xl">?</span>
      ) : (
        <>
          <span className={`text-xs font-bold leading-none ${isRed ? 'text-[#c02030]' : 'text-[#1a1a1a]'}`}>
            {card.rank}
          </span>
          <span className={`self-center text-lg leading-none ${isRed ? 'text-[#c02030]' : 'text-[#1a1a1a]'}`}>
            {card.suit}
          </span>
        </>
      )}
    </div>
  )
}

// ============================================================
// Component
// ============================================================

type GameStatus = 'idle' | 'playing' | 'bust' | 'stand_forced' | 'win' | 'lose' | 'blackjack'

interface GameState {
  playerCards: Card[]
  dealerCards: Card[]
  playerScore: number
  dealerScore: number
  status: GameStatus
  message: string
  delta: number
}

function BlackjackPage() {
  const { nickname, balance, refreshBalance } = usePlayer()
  const startFn = useServerFn(startBlackjack)
  const hitFn = useServerFn(hitBlackjack)
  const standFn = useServerFn(standBlackjack)

  const [bet, setBet] = useState(100)
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPlaying = game?.status === 'playing' || game?.status === 'stand_forced'

  const handleStart = async () => {
    if (!nickname) { setError('Connectez-vous d\'abord.'); return }
    const cleanBet = Math.floor(bet)
    if (cleanBet <= 0) { setError('Mise invalide.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await startFn({ data: { nickname, bet: cleanBet } })
      if (!res.ok) { setError(res.message); return }
      setGame({
        playerCards: res.playerCards,
        dealerCards: res.dealerCards,
        playerScore: res.playerScore,
        dealerScore: res.dealerScore,
        status: res.status as GameStatus,
        message: res.message,
        delta: res.delta,
      })
      if (res.status === 'blackjack') await refreshBalance()
    } catch {
      setError('Erreur serveur.')
    } finally {
      setLoading(false)
    }
  }

  const handleHit = async () => {
    if (!game) return
    setLoading(true)
    try {
      const res = await hitFn({ data: { playerCards: game.playerCards, dealerCards: game.dealerCards } })
      const newState: GameState = {
        ...game,
        playerCards: res.playerCards,
        playerScore: res.playerScore,
        status: res.status,
        message: res.message,
      }
      setGame(newState)
      // If bust, we need to record it in DB
      if (res.status === 'bust') {
        // finalize via stand
        const finalRes = await standFn({
          data: { nickname: nickname!, bet: Math.floor(bet), playerCards: res.playerCards, dealerCards: res.dealerCards }
        })
        if (finalRes.ok) {
          setGame({
            playerCards: finalRes.playerCards,
            dealerCards: finalRes.dealerCards,
            playerScore: finalRes.playerScore,
            dealerScore: finalRes.dealerScore,
            status: finalRes.status as GameStatus,
            message: finalRes.message,
            delta: finalRes.delta,
          })
          await refreshBalance()
        }
      }
    } catch {
      setError('Erreur serveur.')
    } finally {
      setLoading(false)
    }
  }

  const handleStand = async () => {
    if (!game || !nickname) return
    setLoading(true)
    try {
      const res = await standFn({ data: { nickname, bet: Math.floor(bet), playerCards: game.playerCards, dealerCards: game.dealerCards } })
      if (!res.ok) { setError(res.message); return }
      setGame({
        playerCards: res.playerCards,
        dealerCards: res.dealerCards,
        playerScore: res.playerScore,
        dealerScore: res.dealerScore,
        status: res.status as GameStatus,
        message: res.message,
        delta: res.delta,
      })
      await refreshBalance()
    } catch {
      setError('Erreur serveur.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setGame(null)
    setError('')
  }

  const resultColor = game?.delta && game.delta > 0 ? '#00c4b0' : game?.delta && game.delta < 0 ? '#ff4655' : '#ece8e1'

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Chamber · Tour de Force</p>
        <h1 className="display-title mt-2 text-5xl text-white">Agent Blackjack</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Blackjack classique 1v1 contre le dealer Chamber. Atteignez 21 sans dépasser. Blackjack naturel = ×2.5.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="val-card p-8">
          {!game ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="display-title text-3xl text-white">Prêt pour la table ?</p>
              <p className="mt-2 text-sm text-[#a8b0b8]">Placez votre mise et démarrez la partie.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dealer */}
              <div>
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
                  Chamber (Dealer)
                  {game.dealerScore > 0 && <span className="ml-2 text-white">— {game.dealerScore}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {game.dealerCards.map((card, i) => <CardDisplay key={i} card={card} />)}
                </div>
              </div>

              <div className="h-px bg-[rgba(255,70,85,0.15)]" />

              {/* Player */}
              <div>
                <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
                  Votre main — <span className="text-white">{game.playerScore}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {game.playerCards.map((card, i) => <CardDisplay key={i} card={card} />)}
                </div>
              </div>

              {/* Message */}
              <div className={[
                'border p-4',
                game.status === 'win' || game.status === 'blackjack'
                  ? 'border-[rgba(0,196,176,0.4)] bg-[rgba(0,196,176,0.08)]'
                  : game.status === 'lose' || game.status === 'bust'
                  ? 'border-[rgba(255,70,85,0.4)] bg-[rgba(255,70,85,0.08)]'
                  : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]',
              ].join(' ')}>
                <p className="font-bold" style={{ color: resultColor }}>{game.message}</p>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-[#ff4655]">{error}</p>}
        </article>

        <aside className="space-y-4">
          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Table</p>

            {!game ? (
              <>
                <label htmlFor="bj-bet" className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]">
                  Mise (VP)
                </label>
                <input
                  id="bj-bet"
                  type="number"
                  min={10}
                  step={10}
                  value={bet}
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="val-input mt-2 w-full px-3 py-2 text-base"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {[50, 100, 250, 500].map((v) => (
                    <button key={v} type="button" onClick={() => setBet(v)} className="val-toggle px-3 py-1 text-[0.62rem]">{v}</button>
                  ))}
                </div>
                <div className="mt-4 rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
                  <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
                </div>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={loading}
                  className="mt-5 w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Démarrage...' : 'Distribuer les cartes'}
                </button>
              </>
            ) : isPlaying ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Mise en jeu</p>
                  <p className="mt-1 text-xl font-bold text-white">{Math.floor(bet)} VP</p>
                </div>
                <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
                  <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
                </div>
                <button
                  type="button"
                  onClick={handleHit}
                  disabled={loading}
                  className="w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? '...' : 'Hit'}
                </button>
                <button
                  type="button"
                  onClick={handleStand}
                  disabled={loading}
                  className="w-full border border-white/18 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d7dde4] transition hover:border-white/35 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? '...' : 'Stand'}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Résultat</p>
                  <p className="mt-1 text-xl font-bold" style={{ color: resultColor }}>
                    {game.delta > 0 ? `+${game.delta}` : game.delta} VP
                  </p>
                </div>
                <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Solde</p>
                  <p className="mt-1 text-xl font-bold text-white">{balance} VP</p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full border border-white/18 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d7dde4] transition hover:border-white/35 hover:bg-white/5"
                >
                  Nouvelle partie
                </button>
              </div>
            )}
          </article>

          <article className="val-card p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Règles</p>
            <ul className="mt-3 space-y-1.5">
              {[
                'Atteignez 21 sans dépasser',
                'Dealer tire jusqu\'à 17',
                'Blackjack naturel = ×2.5',
                'Égalité = mise remboursée',
                'RTP théorique: 99.1%',
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
