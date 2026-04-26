import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { usePlayer } from './__root'
import { prisma } from '#/db'

export const Route = createFileRoute('/missions')({ component: MissionsPage })

// ============================================================
// Mission definitions
// ============================================================

interface MissionDef {
  key: string
  title: string
  reward: string
  goal: number
  hint: string
  unit: string
}

const MISSION_DEFS: MissionDef[] = [
  {
    key: 'wins_5',
    title: 'Ace Protocol',
    reward: '+250 VP',
    goal: 5,
    hint: 'Remportez des parties sur n\'importe quel jeu du casino.',
    unit: 'victoires',
  },
  {
    key: 'low_bets_10',
    title: 'Eco Round',
    reward: '+180 VP',
    goal: 10,
    hint: 'Misez 50 VP ou moins par partie — jouez serré comme un pro.',
    unit: 'mises eco',
  },
  {
    key: 'jackpots_3',
    title: '1v4 Overtime',
    reward: '+500 VP',
    goal: 3,
    hint: 'Décrochez des jackpots critiques (multiplicateur ×10+).',
    unit: 'jackpots',
  },
  {
    key: 'total_games_20',
    title: 'Full 5-Stack',
    reward: '+15% bonus',
    goal: 20,
    hint: 'Jouez 20 parties au total sur tous les jeux.',
    unit: 'parties jouées',
  },
  {
    key: 'spike_rush_5',
    title: 'Spike Rush',
    reward: '+300 VP',
    goal: 5,
    hint: 'Jouez 5 parties de Crate Rush — le format le plus rapide.',
    unit: 'parties Crate Rush',
  },
  {
    key: 'big_win_4',
    title: 'Vandal Flush',
    reward: '+200 VP',
    goal: 4,
    hint: 'Remportez 4 fois avec un multiplicateur ×4 ou plus.',
    unit: 'big wins',
  },
]

// ============================================================
// Server function
// ============================================================

const getMissions = createServerFn({ method: 'POST' })
  .inputValidator((data: { nickname: string }) => data)
  .handler(async ({ data }) => {
    const player = await prisma.player.findUnique({
      where: { nickname: data.nickname },
      select: { id: true },
    })
    if (!player) return { missions: [] }

    const dbMissions = await prisma.playerMission.findMany({
      where: { playerId: player.id },
      select: { missionKey: true, progress: true, completed: true },
    })

    const map = Object.fromEntries(dbMissions.map((m) => [m.missionKey, m]))

    return {
      missions: MISSION_DEFS.map((def) => ({
        ...def,
        progress: (map[def.key] as { progress: number; completed: boolean } | undefined)?.progress ?? 0,
        completed: (map[def.key] as { progress: number; completed: boolean } | undefined)?.completed ?? false,
      })),
    }
  })

// ============================================================
// Component
// ============================================================

function MissionsPage() {
  const { nickname } = usePlayer()
  const [missions, setMissions] = useState(
    MISSION_DEFS.map((d) => ({ ...d, progress: 0, completed: false }))
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nickname) return
    setLoading(true)
    getMissions({ data: { nickname } })
      .then((res) => { if (res.missions.length > 0) setMissions(res.missions) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [nickname])

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Battlepass Casino · Kingdom Corp</p>
        <h1 className="display-title mt-2 text-5xl text-white">Missions quotidiennes</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Complétez vos objectifs de protocole pour débloquer VP et bonus. La progression est trackée en temps réel.
        </p>
        {!nickname && (
          <p className="mt-3 text-sm font-bold text-[#ff4655]">Connectez-vous pour voir votre progression.</p>
        )}
      </header>

      {loading && (
        <p className="text-center text-sm font-bold uppercase tracking-[0.16em] text-[#768079] animate-pulse">
          Chargement des missions...
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {missions.map((mission) => {
          const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100))
          return (
            <article key={mission.key} className="val-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="display-title text-3xl text-white">{mission.title}</h2>
                  {mission.completed && (
                    <span className="val-badge val-badge-teal">Complété</span>
                  )}
                </div>
                <span className="val-badge val-badge-red shrink-0">{mission.reward}</span>
              </div>

              <p className="mt-3 text-sm text-[#a8b0b8]">
                {mission.progress} / {mission.goal} {mission.unit}
              </p>
              <p className="mt-1 text-[0.7rem] italic text-[#768079]">{mission.hint}</p>

              <div className="mt-4 space-y-1.5">
                <div className="val-progress">
                  <div
                    className={`val-progress-inner ${mission.completed ? 'bg-[#00c4b0]!' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#ff4655]/60">
                    Progression
                  </span>
                  <span className="text-[0.62rem] font-bold tracking-[0.12em] text-[#768079]">{pct}%</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
