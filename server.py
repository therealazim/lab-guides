import os
import json
import mimetypes
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_db():
    return psycopg2.connect(DATABASE_URL, sslmode='require')

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS equipment (
            slug TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}',
            hidden BOOLEAN DEFAULT false, override BOOLEAN DEFAULT false
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS partners (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL,
            url TEXT NOT NULL, image TEXT, sort_order INTEGER DEFAULT 0
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS translations (
            key TEXT NOT NULL, lang TEXT NOT NULL, value TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (key, lang)
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS news (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            image TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            sort_order INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

init_db()

# ─── API Routes ───
@app.route('/api/equipment', methods=['GET'])
def get_equipment():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM equipment WHERE hidden = false ORDER BY slug')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for r in rows:
        data = r['data'] if r['data'] else {}
        data['slug'] = r['slug']
        data['_overridden'] = r['override']
        if data.get('status') == 'AVIABLE': data['status'] = 'AVAILABLE'
        result.append(data)
    return jsonify(result)

@app.route('/api/hidden-equipment', methods=['GET'])
def get_hidden_equipment():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT slug FROM equipment WHERE hidden = true ORDER BY slug')
    slugs = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(slugs)

@app.route('/api/equipment/<slug>', methods=['GET'])
def get_equipment_by_slug(slug):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM equipment WHERE slug = %s AND hidden = false', (slug,))
    r = cur.fetchone()
    cur.close()
    conn.close()
    if not r:
        return jsonify(None)
    data = r['data'] if r['data'] else {}
    data['slug'] = r['slug']
    data['_overridden'] = r['override']
    if data.get('status') == 'AVIABLE': data['status'] = 'AVAILABLE'
    return jsonify(data)

@app.route('/api/equipment', methods=['POST'])
def save_equipment():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    slug = body.pop('slug', None)
    if not slug:
        return jsonify({'error': 'No slug'}), 400
    if body.get('status') == 'AVIABLE': body['status'] = 'AVAILABLE'
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO equipment (slug, data, override) VALUES (%s, %s, true) ON CONFLICT (slug) DO UPDATE SET data = %s, override = true',
        (slug, json.dumps(body), json.dumps(body))
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/equipment/<slug>', methods=['DELETE'])
def delete_equipment(slug):
    conn = get_db()
    cur = conn.cursor()
    # Keep a tombstone even for bundled static equipment that has no existing row.
    cur.execute(
        """
        INSERT INTO equipment (slug, data, hidden, override)
        VALUES (%s, '{}'::jsonb, true, false)
        ON CONFLICT (slug) DO UPDATE SET hidden = true
        """,
        (slug,)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/partners', methods=['GET'])
def get_partners():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM partners ORDER BY sort_order')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)

@app.route('/api/partners', methods=['POST'])
def save_partner():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    name = body.get('name', '')
    url = body.get('url', '')
    image = body.get('image', '')
    if not name:
        return jsonify({'error': 'No name'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO partners (name, url, image) VALUES (%s, %s, %s) RETURNING id',
        (name, url, image)
    )
    partner_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True, 'id': partner_id})

@app.route('/api/partners/<int:partner_id>', methods=['PUT'])
def update_partner(partner_id):
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    name = body.get('name', '')
    url = body.get('url', '')
    image = body.get('image', '')
    if not name:
        return jsonify({'error': 'No name'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'UPDATE partners SET name = %s, url = %s, image = %s WHERE id = %s',
        (name, url, image, partner_id)
    )
    if cur.rowcount == 0:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({'error': 'Partner not found'}), 404
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True, 'id': partner_id})

@app.route('/api/partners/<int:partner_id>', methods=['DELETE'])
def delete_partner(partner_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('DELETE FROM partners WHERE id = %s', (partner_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

# ─── Translations API ───
@app.route('/api/translations', methods=['GET'])
def get_translations():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM translations')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = {}
    for r in rows:
        key = r['key']
        if key not in result:
            result[key] = {}
        result[key][r['lang']] = r['value']
    return jsonify(result)

@app.route('/api/translations', methods=['POST'])
def save_translation():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    key = body.get('key')
    lang = body.get('lang')
    value = body.get('value', '')
    if not key or not lang:
        return jsonify({'error': 'Missing key or lang'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'INSERT INTO translations (key, lang, value) VALUES (%s, %s, %s) ON CONFLICT (key, lang) DO UPDATE SET value = %s',
        (key, lang, value, value)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

# ─── News API ───
@app.route('/api/news', methods=['GET'])
def get_news():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM news ORDER BY sort_order, created_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for r in rows:
        item = dict(r)
        if item.get('image'):
            try:
                item['images'] = json.loads(item['image'])
                item['image'] = item['images'][0] if item['images'] else None
            except:
                pass
        if item.get('created_at'):
            item['created_at'] = item['created_at'].isoformat()
        result.append(item)
    return jsonify(result)

@app.route('/api/news', methods=['POST'])
def save_news():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    news_id = body.get('id')
    title = body.get('title', '')
    description = body.get('description', '')
    images = body.get('images', [])
    image = body.get('image', None)
    if not title:
        return jsonify({'error': 'No title'}), 400
    conn = get_db()
    cur = conn.cursor()
    # Store images as JSON array; also accept legacy single 'image'
    stored_image = json.dumps(images) if images else (json.dumps([image]) if image else None)
    if news_id:
        cur.execute(
            'UPDATE news SET title = %s, description = %s, image = %s WHERE id = %s',
            (title, description, stored_image, news_id)
        )
    else:
        cur.execute(
            'INSERT INTO news (title, description, image) VALUES (%s, %s, %s) RETURNING id',
            (title, description, stored_image)
        )
        news_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True, 'id': news_id})

@app.route('/api/news/<int:news_id>', methods=['DELETE'])
def delete_news(news_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('DELETE FROM news WHERE id = %s', (news_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

# ─── Frontend ───
@app.route('/', defaults={'path': None})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Serve static files with proper MIME types
    if path:
        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            mime = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            return Flask.response_class(content, mimetype=mime)
    
    # HTML pages - serve with injected data
    index_file = os.path.join(DIST_DIR, 'index.html')
    if not os.path.exists(index_file):
        return 'Not found', 404
    
    with open(index_file, 'r') as f:
        html = f.read()
    
    # Inject database data
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM equipment WHERE hidden = false ORDER BY slug')
        rows = cur.fetchall()
        cur.execute('SELECT * FROM partners ORDER BY sort_order')
        partners = cur.fetchall()
        cur.execute('SELECT * FROM translations')
        translation_rows = cur.fetchall()
        cur.execute('SELECT * FROM news ORDER BY sort_order, created_at DESC')
        news_rows = cur.fetchall()
        cur.execute('SELECT slug FROM equipment WHERE hidden = true ORDER BY slug')
        hidden_slugs = [r['slug'] for r in cur.fetchall()]
        cur.close()
        conn.close()
        
        equipment = []
        for r in rows:
            data = r['data'] if r['data'] else {}
            data['slug'] = r['slug']
            data['_overridden'] = r['override']
            if data.get('status') == 'AVIABLE': data['status'] = 'AVAILABLE'
            equipment.append(data)
        
        translations = {}
        for r in translation_rows:
            key = r['key']
            if key not in translations:
                translations[key] = {}
            translations[key][r['lang']] = r['value']

        news = []
        for r in news_rows:
            item = dict(r)
            if item.get('image'):
                try:
                    item['images'] = json.loads(item['image'])
                    item['image'] = item['images'][0] if item['images'] else None
                except (TypeError, json.JSONDecodeError):
                    pass
            if item.get('created_at'):
                item['created_at'] = item['created_at'].isoformat()
            news.append(item)

        inject = f'<script>window.__INITIAL_DATA__ = {json.dumps({"equipment": equipment, "partners": partners, "translations": translations, "news": news, "hiddenEquipment": hidden_slugs})}</script>'
        html = html.replace('</head>', inject + '</head>')
    except Exception as e:
        print(f'Data injection error: {e}')
    
    return html

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)