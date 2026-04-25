import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/missions')({ component: MissionsPage })

function parsePct(progress: string): number {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(progress)
  return m ? Math.round((Number.parseInt(m[1]) / Number.parseInt(m[2])) * 100) : 0
}

const missions = [
  {
    title: 'Ace Protocol',
    reward: '+250 VP',
    progress: '2 / 5 mains gagnantes consécutives',
    hint: 'Pas de défaite entre deux — Jett speed non incluse',
  },
  {
    title: 'Eco Round',
    reward: '+180 RP',
    progress: '4 / 10 mises low risk validées',
    hint: 'Frenzy ou Ghost seulement — sauvegarde ta bankroll comme un pro',
  },
  {
    title: '1v4 Overtime',
    reward: '+1 Radianite Chest',
    progress: '1 / 3 jackpots critiques en overtime',
    hint: "Active le mode Empress de Reyna pour maximiser tes chances",
  },
  {
    title: 'Full 5-Stack',
    reward: '+15% cashback',
    progress: 'Activer en squad de 5 agents',
    hint: 'Queue together ou rien — solo queue disqualifié',
  },
  {
    title: 'Spike Rush',
    reward: '+500 VP',
    progress: '3 / 5 sessions Spike Rush gagnées',
    hint: 'Le format le plus rapide du casino — no eco, no mercy',
  },
  {
    title: 'Vandal Flush',
    reward: '+200 VP',
    progress: '2 / 4 jackpots avec mise Vandal active',
    hint: 'La mise Vandal débloque le bonus headshot ×1.5 sur chaque spin',
  },
]

function MissionsPage() {
  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Battlepass Casino · Kingdom Corp</p>
        <h1 className="display-title mt-2 text-5xl text-white">Missions quotidiennes</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Complétez vos objectifs de protocole pour débloquer VP, Radianite Points et caisses Kingdom Corp.
          Reset à chaque minuit — heure de Venise.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {missions.map((mission) => {
          const pct = parsePct(mission.progress)
          return (
            <article key={mission.title} className="val-card p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="display-title text-3xl text-white">{mission.title}</h2>
                <span className="val-badge val-badge-red shrink-0">{mission.reward}</span>
              </div>

              <p className="mt-3 text-sm text-[#a8b0b8]">{mission.progress}</p>
              <p className="mt-1 text-[0.7rem] italic text-[#768079]">{mission.hint}</p>

              {pct > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="val-progress">
                    <div className="val-progress-inner" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#ff4655]/60">
                      Progression
                    </span>
                    <span className="text-[0.62rem] font-bold tracking-[0.12em] text-[#768079]">{pct}%</span>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
