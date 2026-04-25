import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tables')({ component: TablesPage })

type TableStatus = 'open' | 'busy' | 'vip'

interface CasinoTable {
  name: string
  dealer: string
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

const tables: CasinoTable[] = [
  { name: 'A Site Blackjack', dealer: 'Cypher', players: 5, minBet: 25, maxBet: 1_000, status: 'Ouverte', statusType: 'open' },
  { name: 'Bind Roulette', dealer: 'Viper', players: 11, minBet: 10, maxBet: 500, status: 'Haute affluence', statusType: 'busy' },
  { name: 'Ascent Poker', dealer: 'Sova', players: 7, minBet: 50, maxBet: 2_500, status: 'Ouverte', statusType: 'open' },
  { name: 'Split High-Low', dealer: 'Jett', players: 9, minBet: 15, maxBet: 750, status: 'Ouverte', statusType: 'open' },
  { name: 'Lotus Baccarat', dealer: 'Sage', players: 4, minBet: 75, maxBet: 3_000, status: 'Haute affluence', statusType: 'busy' },
  { name: 'Haven Privé', dealer: 'Chamber', players: 3, minBet: 100, maxBet: 5_000, status: 'Privée VIP', statusType: 'vip' },
]

function TablesPage() {
  return (
    <section className="space-y-5">
      <header className="val-section-header p-7">
        <p className="val-kicker">Live Dealers · Agents croupiers</p>
        <h1 className="display-title mt-2 text-5xl text-white">Tables en direct</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#a8b0b8]">
          Chaque salon est tenu par un agent croupier dédié. Rejoignez la map de votre choix en temps réel —
          stream 4K, chat vocal de squad, TP bonus sur les tables Spike.
        </p>
      </header>

      <div
        className="overflow-hidden border border-[rgba(255,70,85,0.16)] bg-[linear-gradient(160deg,#1a2733,#131d27)]"
        style={{ borderTop: '2px solid #ff4655' }}
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.04)]">
            <tr>
              {['Table / Map', 'Dealer', 'Joueurs', 'Mise min', 'Mise max', 'État'].map((h) => (
                <th key={h} className="px-5 py-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#768079]">
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
                <td className="px-5 py-4 font-semibold text-[#00c4b0]">{table.dealer}</td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">{table.players}</td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">
                  {table.minBet} <span className="text-[#ff4655]">VP</span>
                </td>
                <td className="px-5 py-4 font-semibold text-[#a8b0b8]">
                  {table.maxBet.toLocaleString('fr-FR')} <span className="text-[#ff4655]">VP</span>
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
