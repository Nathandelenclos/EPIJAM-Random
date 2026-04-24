import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tables')({ component: TablesPage })

type TableStatus = 'open' | 'busy' | 'vip'

interface CasinoTable {
  name: string
  players: number
  minBet: number
  maxBet: number
  status: string
  statusType: TableStatus
}

const STATUS_BADGE: Record<TableStatus, string> = {
  open: 'val-badge val-badge-teal',
  busy: 'val-badge val-badge-red',
  vip: 'val-badge val-badge-gold',
}

function TablesPage() {
  const tables: CasinoTable[] = [
    { name: 'A Site Blackjack', players: 5, minBet: 25, maxBet: 1000, status: 'Ouverte', statusType: 'open' },
    { name: 'Bind Roulette', players: 11, minBet: 10, maxBet: 500, status: 'Haute affluence', statusType: 'busy' },
    { name: 'Ascent Poker', players: 7, minBet: 50, maxBet: 2500, status: 'Ouverte', statusType: 'open' },
    { name: 'Haven Baccarat', players: 3, minBet: 100, maxBet: 5000, status: 'Privée VIP', statusType: 'vip' },
  ]

  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Live Dealers</p>
        <h1 className="display-title mt-2 text-5xl text-white">Tables en direct</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Rejoignez des salons en temps réel avec croupiers stream 4K et chat vocal de squad.
        </p>
      </header>

      <div
        className="overflow-hidden border border-[rgba(255,70,85,0.16)] bg-[linear-gradient(160deg,#1a2733,#131d27)]"
        style={{ borderTop: '2px solid #ff4655' }}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.04)]">
            <tr>
              {['Table', 'Joueurs', 'Mise min', 'Mise max', 'État'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr
                key={table.name}
                className="border-t border-[rgba(255,70,85,0.07)] transition-colors hover:bg-[rgba(255,70,85,0.03)]"
              >
                <td className="px-5 py-4 font-bold tracking-wide text-white">{table.name}</td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">{table.players}</td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">
                  {table.minBet} <span className="text-[#ff4655]">VP</span>
                </td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">
                  {table.maxBet} <span className="text-[#ff4655]">VP</span>
                </td>
                <td className="px-5 py-4">
                  <span className={STATUS_BADGE[table.statusType]}>{table.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
