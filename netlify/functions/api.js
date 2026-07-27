import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_IZnPOM41DiLd@ep-little-lab-axjdyfei-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')

export async function handler(event) {
  const { path, httpMethod, body } = event
  const parts = path.replace('/.netlify/functions/api', '').split('/').filter(Boolean)
  const slug = parts[1]

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  try {
    // Initialize tables on first run
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

    // ── Equipment routes ──
    if (parts[0] === 'equipment') {
      if (httpMethod === 'GET' && !slug) {
        const rows = await sql`SELECT * FROM equipment WHERE hidden = false ORDER BY slug`
        return { statusCode: 200, headers, body: JSON.stringify(rows.map(r => ({ slug: r.slug, ...r.data, _overridden: r.override }))) }
      }
      if (httpMethod === 'GET' && slug) {
        const [row] = await sql`SELECT * FROM equipment WHERE slug = ${slug} AND hidden = false`
        return { statusCode: 200, headers, body: JSON.stringify(row ? { slug: row.slug, ...row.data, _overridden: row.override } : null) }
      }
      if (httpMethod === 'POST') {
        const { slug: s, ...data } = JSON.parse(body)
        await sql`INSERT INTO equipment (slug, data) VALUES (${s}, ${JSON.stringify(data)}) ON CONFLICT (slug) DO UPDATE SET data = ${JSON.stringify(data)}, override = true`
        return { statusCode: 200, headers, body: '{"ok":true}' }
      }
      if (httpMethod === 'DELETE' && slug) {
        await sql`UPDATE equipment SET hidden = true WHERE slug = ${slug}`
        return { statusCode: 200, headers, body: '{"ok":true}' }
      }
    }

    // ── Partner routes ──
    if (parts[0] === 'partners') {
      if (httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM partners ORDER BY sort_order`
        return { statusCode: 200, headers, body: JSON.stringify(rows) }
      }
      if (httpMethod === 'POST') {
        const { name, url, image } = JSON.parse(body)
        const [{ id }] = await sql`INSERT INTO partners (name, url, image) VALUES (${name}, ${url}, ${image || null}) RETURNING id`
        return { statusCode: 200, headers, body: JSON.stringify({ id }) }
      }
      if (httpMethod === 'PUT' && slug) {
        const { name, url, image } = JSON.parse(body)
        await sql`UPDATE partners SET name = ${name}, url = ${url}, image = ${image || null} WHERE id = ${parseInt(slug)}`
        return { statusCode: 200, headers, body: '{"ok":true}' }
      }
      if (httpMethod === 'DELETE' && slug) {
        await sql`DELETE FROM partners WHERE id = ${parseInt(slug)}`
        return { statusCode: 200, headers, body: '{"ok":true}' }
      }
    }

    // ── Seed route ──
    if (parts[0] === 'seed' && httpMethod === 'POST') {
      const equipments = JSON.parse(body)
      for (const eq of equipments) {
        const { slug: s, ...data } = eq
        await sql`INSERT INTO equipment (slug, data) VALUES (${s}, ${JSON.stringify(data)}) ON CONFLICT (slug) DO NOTHING`
      }
      return { statusCode: 200, headers, body: JSON.stringify({ seeded: equipments.length }) }
    }

    return { statusCode: 404, headers, body: '{"error":"Not found"}' }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}