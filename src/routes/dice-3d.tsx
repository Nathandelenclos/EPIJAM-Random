import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'

import { prisma } from '#/db'

export const Route = createFileRoute('/dice-3d')({
  loader: () => getDiceLeaderboard(),
  component: Dice3DPage,
})

const getDiceLeaderboard = createServerFn({ method: 'GET' }).handler(async () => {
  return prisma.diceLeaderboard.findMany({
    orderBy: [{ bestStreak: 'desc' }, { bestBankroll: 'desc' }, { updatedAt: 'asc' }],
    take: 10,
    select: {
      nickname: true,
      bestStreak: true,
      bestBankroll: true,
      totalRolls: true,
      totalWins: true,
    },
  })
})

const saveDiceScore = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { nickname: string; bestStreak: number; bestBankroll: number; totalRolls: number; totalWins: number }) =>
      data,
  )
  .handler(async ({ data }) => {
    const nickname = data.nickname.trim().slice(0, 20)

    if (!nickname) {
      return { ok: false as const, message: 'Pseudo requis.' }
    }

    const existing = await prisma.diceLeaderboard.findUnique({ where: { nickname } })

    if (!existing) {
      await prisma.diceLeaderboard.create({
        data: {
          nickname,
          bestStreak: Math.max(0, data.bestStreak),
          bestBankroll: Math.max(0, data.bestBankroll),
          totalRolls: Math.max(0, data.totalRolls),
          totalWins: Math.max(0, data.totalWins),
        },
      })

      return { ok: true as const, message: 'Score enregistre dans le classement.' }
    }

    await prisma.diceLeaderboard.update({
      where: { nickname },
      data: {
        bestStreak: Math.max(existing.bestStreak, data.bestStreak),
        bestBankroll: Math.max(existing.bestBankroll, data.bestBankroll),
        totalRolls: existing.totalRolls + Math.max(0, data.totalRolls),
        totalWins: existing.totalWins + Math.max(0, data.totalWins),
      },
    })

    return { ok: true as const, message: 'Progression fusionnee dans le classement.' }
  })

const FACE_ROTATIONS = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(-90deg) rotateY(0deg)',
  3: 'rotateX(0deg) rotateY(90deg)',
  4: 'rotateX(0deg) rotateY(-90deg)',
  5: 'rotateX(90deg) rotateY(0deg)',
  6: 'rotateX(180deg) rotateY(0deg)',
} as const

type DiceFace = keyof typeof FACE_ROTATIONS
type BetSide = 'high' | 'low'

const STARTING_BANKROLL = 1000

function randomFace(): DiceFace {
  return (Math.floor(Math.random() * 6) + 1) as DiceFace
}

function playRollSound(result: DiceFace, won: boolean) {
  try {
    const context = new AudioContext()
    const now = context.currentTime

    const beep = (frequency: number, offset: number, duration: number, volume: number) => {
      const osc = context.createOscillator()
      const gain = context.createGain()

      osc.type = 'triangle'
      osc.frequency.value = frequency

      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)

      osc.connect(gain)
      gain.connect(context.destination)

      osc.start(now + offset)
      osc.stop(now + offset + duration)
    }

    beep(160 + result * 28, 0, 0.12, 0.06)
    beep(won ? 480 : 220, 0.1, 0.13, won ? 0.05 : 0.035)
    if (won && result >= 5) {
      beep(760, 0.2, 0.16, 0.05)
    }

    globalThis.setTimeout(() => {
      void context.close()
    }, 450)
  } catch {
    // Ignore audio failures (unsupported API or blocked autoplay context)
  }
}

function getBurstOffsets(seed: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((index + seed * 2.7) * 37) % 360
    const radius = 46 + (((index * 17 + seed * 13) % 100) / 100) * 84
    const duration = 640 + ((index * 61 + seed * 11) % 520)

    return {
      angle,
      radius,
      duration,
      delay: index * 10,
    }
  })
}

function Dice3DPage() {
  const initialLeaderboard = Route.useLoaderData()
  const saveDiceScoreFn = useServerFn(saveDiceScore)

  const [nickname, setNickname] = useState('')
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard)
  const [face, setFace] = useState<DiceFace>(1)
  const [spin, setSpin] = useState(0)
  const [bet, setBet] = useState(50)
  const [betSide, setBetSide] = useState<BetSide>('high')
  const [bankroll, setBankroll] = useState(STARTING_BANKROLL)
  const [lastDelta, setLastDelta] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalRolls, setTotalRolls] = useState(0)
  const [totalWins, setTotalWins] = useState(0)
  const [feedback, setFeedback] = useState('Placez une mise et lancez le de.')
  const [saveMessage, setSaveMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [burstSeed, setBurstSeed] = useState(0)

  const transform = useMemo(() => {
    const extraX = 720 + spin * 110
    const extraY = 720 + spin * 90
    return `rotateX(${extraX}deg) rotateY(${extraY}deg) ${FACE_ROTATIONS[face]}`
  }, [face, spin])

  const winRate = totalRolls === 0 ? 0 : Math.round((totalWins / totalRolls) * 100)
  const burstPieces = useMemo(() => getBurstOffsets(burstSeed, 20), [burstSeed])

  const rollDice = () => {
    const cleanBet = Math.floor(Number.isFinite(bet) ? bet : 0)
    if (cleanBet <= 0) {
      setFeedback('Mise invalide. Choisissez une valeur positive.')
      return
    }

    if (cleanBet > bankroll) {
      setFeedback('Fonds insuffisants pour cette mise.')
      return
    }

    const result = randomFace()
    const won = betSide === 'high' ? result >= 4 : result <= 3
    const clutch = won && result >= 5

    let gain = -cleanBet
    if (won) {
      const multiplier = clutch ? 1.6 : 1
      gain = Math.round(cleanBet * multiplier)
    }

    const nextBankroll = Math.max(0, bankroll + gain)
    const nextStreak = won ? streak + 1 : 0

    setFace(result)
    setSpin((value) => value + 1)
    setBankroll(nextBankroll)
    setLastDelta(gain)
    setStreak(nextStreak)
    setBestStreak((previous) => Math.max(previous, nextStreak))
    setTotalRolls((value) => value + 1)
    setTotalWins((value) => value + (won ? 1 : 0))

    let message = `Perdu. ${result} sorti, vous perdez ${Math.abs(gain)} VP.`
    if (won) {
      message = clutch
        ? `Clutch! ${result} sorti, vous gagnez ${gain} VP.`
        : `Gagne! ${result} sorti, vous gagnez ${gain} VP.`
    }

    setFeedback(message)

    if (won) {
      setBurstSeed((value) => value + 1)
    }

    playRollSound(result, won)
  }

  const resetSession = () => {
    setBankroll(STARTING_BANKROLL)
    setLastDelta(0)
    setStreak(0)
    setBestStreak(0)
    setTotalRolls(0)
    setTotalWins(0)
    setFeedback('Session reinitialisee. Placez une mise.')
    setSaveMessage('')
  }

  const saveScore = async () => {
    const trimmed = nickname.trim().slice(0, 20)

    if (!trimmed) {
      setSaveMessage('Entrez un pseudo pour sauvegarder votre score.')
      return
    }

    setIsSaving(true)

    try {
      const result = await saveDiceScoreFn({
        data: {
          nickname: trimmed,
          bestStreak,
          bestBankroll: bankroll,
          totalRolls,
          totalWins,
        },
      })

      setSaveMessage(result.message)

      if (result.ok) {
        const refreshed = await getDiceLeaderboard()
        setLeaderboard(refreshed)
      }
    } catch {
      setSaveMessage('Echec de sauvegarde. Reessayez.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="val-section-header p-7">
        <p className="val-kicker">Nouveau mini-jeu</p>
        <h1 className="display-title mt-2 text-5xl text-white">Dice 3D Showdown</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Lancez un de 3D inspire des rounds tactiques. Objectif simple: faites 5 ou 6 pour activer le bonus clutch.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="val-card dice-stage relative overflow-hidden p-8">
          <div className="dice-particles" key={burstSeed} aria-hidden="true">
            {burstPieces.map((piece, index) => (
              <span
                key={`${burstSeed}-${index}`}
                className="dice-particle"
                style={{
                  '--particle-angle': `${piece.angle}deg`,
                  '--particle-distance': `${piece.radius}px`,
                  '--particle-delay': `${piece.delay}ms`,
                  '--particle-duration': `${piece.duration}ms`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className="dice-scene">
            <div className="dice-cube" style={{ transform }} aria-label={`Resultat du de: ${face}`}>
              <div className="dice-face dice-face-1">1</div>
              <div className="dice-face dice-face-2">2</div>
              <div className="dice-face dice-face-3">3</div>
              <div className="dice-face dice-face-4">4</div>
              <div className="dice-face dice-face-5">5</div>
              <div className="dice-face dice-face-6">6</div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Round actuel</p>
            <p className="display-title mt-2 text-6xl text-white">{face}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={face >= 5 ? 'val-badge val-badge-green' : 'val-badge val-badge-grey'}>
                {face >= 5 ? 'Bonus clutch actif' : 'Pas de bonus'}
              </span>
              <span className={lastDelta >= 0 ? 'val-badge val-badge-teal' : 'val-badge val-badge-red'}>
                {lastDelta >= 0 ? `+${lastDelta} VP` : `${lastDelta} VP`}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#a8b0b8]">{feedback}</p>
          </article>

          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Mode pari</p>

            <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]" htmlFor="bet">
              Mise (VP)
            </label>
            <input
              id="bet"
              type="number"
              min={1}
              step={10}
              value={bet}
              onChange={(event) => setBet(Number(event.target.value))}
              className="val-input mt-2 w-full px-3 py-2 text-base"
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBetSide('low')}
                className={`val-toggle ${betSide === 'low' ? 'val-toggle-active' : ''}`}
              >
                Low (1-3)
              </button>
              <button
                type="button"
                onClick={() => setBetSide('high')}
                className={`val-toggle ${betSide === 'high' ? 'val-toggle-active' : ''}`}
              >
                High (4-6)
              </button>
            </div>

            <button
              type="button"
              onClick={rollDice}
              className="mt-5 w-full bg-[#ff4655] px-4 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#ff5a66] hover:shadow-[0_0_20px_rgba(255,70,85,0.4)]"
            >
              Lancer le de
            </button>

            <button
              type="button"
              onClick={resetSession}
              className="mt-2 w-full border border-white/18 px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d7dde4] transition hover:border-white/35 hover:bg-white/5"
            >
              Reinitialiser session
            </button>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Bankroll</p>
                <p className="mt-1 text-xl font-bold text-white">{bankroll} VP</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Streak</p>
                <p className="mt-1 text-xl font-bold text-white">{streak}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Best</p>
                <p className="mt-1 text-xl font-bold text-white">{bestStreak}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] p-3">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#768079]">Win rate</p>
                <p className="mt-1 text-xl font-bold text-white">{winRate}%</p>
              </div>
            </div>
          </article>

          <article className="val-card p-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">Classement</p>

            <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-[#a8b0b8]" htmlFor="nickname">
              Pseudo
            </label>
            <input
              id="nickname"
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Ton pseudo"
              className="val-input mt-2 w-full px-3 py-2 text-base"
            />

            <button
              type="button"
              onClick={saveScore}
              disabled={isSaving}
              className="mt-4 w-full border border-[rgba(0,196,176,0.45)] bg-[rgba(0,196,176,0.08)] px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#aef2eb] transition hover:bg-[rgba(0,196,176,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder mon score'}
            </button>

            {saveMessage ? <p className="mt-3 text-sm text-[#a8b0b8]">{saveMessage}</p> : null}

            <div className="mt-5 space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-[#a8b0b8]">Aucun score enregistre.</p>
              ) : (
                leaderboard.map((row, index) => (
                  <div
                    key={row.nickname}
                    className="flex items-center justify-between rounded-sm border border-white/10 bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm"
                  >
                    <p className="font-bold text-white">
                      #{index + 1} {row.nickname}
                    </p>
                    <p className="text-[#a8b0b8]">Streak {row.bestStreak}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}
