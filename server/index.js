import express from 'express'
import cors from 'cors'
import { neon } from '@neondatabase/serverless'

const sql = neon('postgresql://neondb_owner:npg_IZnPOM41DiLd@ep-little-lab-axjdyfei-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require')
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// ─── Initialize tables ───
async function init() {
  await sql`
    CREATE TABLE IF NOT EXISTS equipment (
      slug TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}',
      hidden BOOLEAN DEFAULT false,
      override BOOLEAN DEFAULT false
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      image TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `
  console.log('Database tables ready')
}
init()

// ─── Equipment CRUD ───
app.get('/api/equipment', async (req, res) => {
  const rows = await sql`SELECT * FROM equipment WHERE hidden = false ORDER BY slug`
  res.json(rows.map(r => ({ slug: r.slug, ...r.data, _overridden: r.override })))
})

app.get('/api/equipment/:slug', async (req, res) => {
  const [row] = await sql`SELECT * FROM equipment WHERE slug = ${req.params.slug} AND hidden = false`
  res.json(row ? { slug: row.slug, ...row.data, _overridden: row.override } : null)
})

app.post('/api/equipment', async (req, res) => {
  const { slug, ...data } = req.body
  await sql`INSERT INTO equipment (slug, data) VALUES (${slug}, ${JSON.stringify(data)}) ON CONFLICT (slug) DO UPDATE SET data = ${JSON.stringify(data)}, override = true`
  res.json({ ok: true })
})

app.put('/api/equipment/:slug', async (req, res) => {
  const { slug, ...data } = req.body
  await sql`UPDATE equipment SET data = ${JSON.stringify(data)}, override = true WHERE slug = ${slug}`
  res.json({ ok: true })
})

app.delete('/api/equipment/:slug', async (req, res) => {
  await sql`UPDATE equipment SET hidden = true WHERE slug = ${req.params.slug}`
  res.json({ ok: true })
})

// ─── Partners CRUD ───
app.get('/api/partners', async (req, res) => {
  const rows = await sql`SELECT * FROM partners ORDER BY sort_order`
  res.json(rows)
})

app.post('/api/partners', async (req, res) => {
  const { name, url, image } = req.body
  const [{ id }] = await sql`INSERT INTO partners (name, url, image) VALUES (${name}, ${url}, ${image || null}) RETURNING id`
  res.json({ id })
})

app.put('/api/partners/:id', async (req, res) => {
  const { name, url, image } = req.body
  await sql`UPDATE partners SET name = ${name}, url = ${url}, image = ${image || null} WHERE id = ${req.params.id}`
  res.json({ ok: true })
})

app.delete('/api/partners/:id', async (req, res) => {
  await sql`DELETE FROM partners WHERE id = ${req.params.id}`
  res.json({ ok: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`API running on port ${PORT}`))