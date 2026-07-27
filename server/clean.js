import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IZnPOM41DiLd@ep-little-lab-axjdyfei-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')

async function clean() {
  // Delete junk entries (single chars, numbers)
  await sql`DELETE FROM equipment WHERE slug ~ '^[0-9A-Za-z]$'`
  await sql`DELETE FROM partners WHERE name ~ '^[0-9A-Za-z]?$' OR name IS NULL OR name = ''`
  // Reset override flag to false for static items
  await sql`UPDATE equipment SET override = false`
  console.log('Cleaned up junk data')
  process.exit(0)
}
clean().catch(e => { console.error(e); process.exit(1) })