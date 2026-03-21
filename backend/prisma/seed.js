require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

const pool = new Pool({
  connectionString,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const roles = ['BUYER', 'AUTHOR', 'ADMIN', 'ADMIN_02']

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('Seed completado')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
