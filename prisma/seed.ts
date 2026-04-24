import { PrismaClient } from '../src/generated/prisma/client.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing todos
  await prisma.todo.deleteMany()
  await prisma.diceLeaderboard.deleteMany()

  // Create example todos
  const todos = await prisma.todo.createMany({
    data: [
      { title: 'Buy groceries' },
      { title: 'Read a book' },
      { title: 'Workout' },
    ],
  })

  const leaderboard = await prisma.diceLeaderboard.createMany({
    data: [
      { nickname: 'NeonAstra', bestStreak: 7, bestBankroll: 2140, totalRolls: 42, totalWins: 23 },
      { nickname: 'SpikeShot', bestStreak: 5, bestBankroll: 1760, totalRolls: 34, totalWins: 18 },
      { nickname: 'CipherBank', bestStreak: 4, bestBankroll: 1510, totalRolls: 29, totalWins: 15 },
    ],
  })

  console.log(`✅ Created ${todos.count} todos`)
  console.log(`✅ Created ${leaderboard.count} leaderboard entries`)
}

try {
  await main()
} catch (e) {
  console.error('❌ Error seeding database:', e)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
