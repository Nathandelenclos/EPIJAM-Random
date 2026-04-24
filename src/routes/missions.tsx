import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/missions')({ component: MissionsPage })

function parsePct(progress: string): number {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(progress)
  return m ? Math.round((Number.parseInt(m[1]) / Number.parseInt(m[2])) * 100) : 0
}

function MissionsPage() {
  const missions = [
    { title: 'Win Streak', reward: '+250 VP', progress: '2 / 5 sessions gagnantes' },
    { title: 'Eco Master', reward: '+180 VP', progress: '4 / 10 mises low risk' },
    { title: 'Clutch Bonus', reward: '+1 coffre rare', progress: '1 / 3 jackpots critiques' },
    { title: 'Team Queue', reward: '+15% cashback', progress: 'Activer en groupe de 3' },
  ]

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Battlepass Casino</p>
        <h1 className="display-title mt-2 text-5xl text-white">Missions quotidiennes</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Complétez des objectifs pour débloquer bonus, spins gratuits et boosters de bankroll.
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

              <p className="mt-4 text-sm text-[#a8b0b8]">{mission.progress}</p>

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
