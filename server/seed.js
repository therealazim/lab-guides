import { neon } from '@neondatabase/serverless'
import equipments from '../src/data/equipments.json' with { type: 'json' }

const sql = neon('postgresql://neondb_owner:npg_IZnPOM41DiLd@ep-little-lab-axjdyfei-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')

async function seed() {
  // Create tables first
  await sql`
    CREATE TABLE IF NOT EXISTS equipment (
      slug TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}',
      hidden BOOLEAN DEFAULT false, override BOOLEAN DEFAULT false
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL,
      url TEXT NOT NULL, image TEXT, sort_order INTEGER DEFAULT 0
    )
  `
  console.log('Tables created')
  for (const eq of equipments) {
    const { slug, ...data } = eq
    await sql`INSERT INTO equipment (slug, data, override) VALUES (${slug}, ${JSON.stringify(data)}, false) ON CONFLICT (slug) DO NOTHING`
  }
  console.log(`Seeded ${equipments.length} equipment items`)

  // Seed default partners
  const defaults = [
    { name: 'KMI', url: 'https://kkmi.uz/en/', image: null },
    { name: 'Korea University', url: 'https://hes.korea.ac.kr/eng/main/main.html#HOME', image: null },
    { name: 'Ministry of Education', url: 'https://www.moe.go.kr/main.do?s=moe', image: null },
    { name: 'NRF', url: 'https://www.nrf.re.kr/index', image: null },
  ]
  for (const p of defaults) {
    await sql`INSERT INTO partners (name, url, image) VALUES (${p.name}, ${p.url}, ${p.image}) ON CONFLICT DO NOTHING`
  }
  console.log('Seeded default partners')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })