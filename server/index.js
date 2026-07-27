import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IZnPOM41DiLd@ep-little-lab-axjdyfei-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json({ limit: '50mb' }))

// ─── Initialize tables ───
async function init() {
  await sql`CREATE TABLE IF NOT EXISTS equipment (slug TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}', hidden BOOLEAN DEFAULT false, override BOOLEAN DEFAULT false)`
  await sql`CREATE TABLE IF NOT EXISTS partners (id SERIAL PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, image TEXT, sort_order INTEGER DEFAULT 0)`
  console.log('Database tables ready')
}
init()

// ─── API Routes ───
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
  await sql`INSERT INTO equipment (slug, data, override) VALUES (${slug}, ${JSON.stringify(data)}, true) ON CONFLICT (slug) DO UPDATE SET data = ${JSON.stringify(data)}, override = true`
  res.json({ ok: true })
})

app.delete('/api/equipment/:slug', async (req, res) => {
  await sql`UPDATE equipment SET hidden = true WHERE slug = ${req.params.slug}`
  res.json({ ok: true })
})

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
  await sql`UPDATE partners SET name = ${name}, url = ${url}, image = ${image || null} WHERE id = ${parseInt(req.params.id)}`
  res.json({ ok: true })
})

app.delete('/api/partners/:id', async (req, res) => {
  await sql`DELETE FROM partners WHERE id = ${parseInt(req.params.id)}`
  res.json({ ok: true })
})

app.post('/api/seed', async (req, res) => {
  const items = req.body
  for (const item of items) {
    const { slug, ...data } = item
    await sql`INSERT INTO equipment (slug, data, override) VALUES (${slug}, ${JSON.stringify(data)}, false) ON CONFLICT (slug) DO NOTHING`
  }
  res.json({ seeded: items.length })
})

// ─── Serve static frontend ───
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))