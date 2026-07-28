import os
import json
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://neondb_owner:npg_hDg20lCiSJme@ep-silent-brook-asbj63i2-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require')

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
        result.append(data)
    return jsonify(result)

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
    return jsonify(data)

@app.route('/api/equipment', methods=['POST'])
def save_equipment():
    body = request.get_json()
    slug = body.pop('slug', None)
    if not slug:
        return jsonify({'error': 'No slug'}), 400
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
    cur.execute('UPDATE equipment SET hidden = true WHERE slug = %s', (slug,))
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

# ─── Frontend ───
@app.route('/', defaults={'path': None})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    
    # Serve static files
    if path:
        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                return f.read()
    
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
        cur.close()
        conn.close()
        
        equipment = []
        for r in rows:
            data = r['data'] if r['data'] else {}
            data['slug'] = r['slug']
            data['_overridden'] = r['override']
            equipment.append(data)
        
        inject = f'<script>window.__INITIAL_DATA__ = {json.dumps({"equipment": equipment, "partners": partners})}</script>'
        html = html.replace('</head>', inject + '</head>')
    except Exception as e:
        print(f'Data injection error: {e}')
    
    return html

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)