import os
import json
import mimetypes
import hmac
import time
from datetime import date
from functools import wraps
from flask import Flask, request, jsonify, session
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('FLASK_SECRET_KEY') or os.environ.get('SESSION_SECRET') or os.urandom(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true',
)

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
LOGIN_WINDOW_SECONDS = 600
LOGIN_MAX_ATTEMPTS = 5
failed_logins = {}
VALID_STATUSES = {'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'UNKNOWN', 'UNAVAILABLE'}


def normalize_status(value):
    status = str(value or 'UNKNOWN').strip().upper().replace(' ', '_')
    if status == 'AVIABLE':
        status = 'AVAILABLE'
    return status if status in VALID_STATUSES else 'UNKNOWN'


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get('admin_authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return view(*args, **kwargs)
    return wrapped


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
            upload_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            sort_order INTEGER DEFAULT 0
        )
    ''')
    cur.execute('ALTER TABLE news ADD COLUMN IF NOT EXISTS upload_date DATE')
    cur.execute('UPDATE news SET upload_date = created_at::date WHERE upload_date IS NULL')
    conn.commit()
    cur.close()
    conn.close()

init_db()

# ─── API Routes ───
@app.route('/api/auth/session', methods=['GET'])
def auth_session():
    return jsonify({'authenticated': bool(session.get('admin_authenticated'))})


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    body = request.get_json(silent=True) or {}
    username = str(body.get('username', ''))
    password = str(body.get('password', ''))
    now = time.time()
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip()
    attempts = [stamp for stamp in failed_logins.get(ip, []) if now - stamp < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        return jsonify({'error': 'Too many login attempts. Try again later.'}), 429
    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return jsonify({'error': 'Admin authentication is not configured on the server'}), 503
    valid = hmac.compare_digest(username, ADMIN_USERNAME) and hmac.compare_digest(password, ADMIN_PASSWORD)
    if not valid:
        attempts.append(now)
        failed_logins[ip] = attempts
        return jsonify({'error': 'Invalid username or password'}), 401
    failed_logins.pop(ip, None)
    session.clear()
    session['admin_authenticated'] = True
    return jsonify({'ok': True})


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'ok': True})


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
        data['status'] = normalize_status(data.get('status'))
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
    data['status'] = normalize_status(data.get('status'))
    return jsonify(data)

@app.route('/api/equipment', methods=['POST'])
@admin_required
def save_equipment():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    slug = body.pop('slug', None)
    if not slug:
        return jsonify({'error': 'No slug'}), 400
    body['status'] = normalize_status(body.get('status'))
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
@admin_required
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
@admin_required
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
@admin_required
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
@admin_required
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
@admin_required
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
        if item.get('upload_date'):
            item['upload_date'] = item['upload_date'].isoformat()
        if item.get('created_at'):
            item['created_at'] = item['created_at'].isoformat()
        result.append(item)
    return jsonify(result)

@app.route('/api/news', methods=['POST'])
@admin_required
def save_news():
    body = request.get_json()
    if not body:
        return jsonify({'error': 'Invalid JSON'}), 400
    news_id = body.get('id')
    title = body.get('title', '')
    description = body.get('description', '')
    images = body.get('images', [])
    image = body.get('image', None)
    upload_date = body.get('upload_date') or None
    if not title:
        return jsonify({'error': 'No title'}), 400
    if upload_date:
        try:
            date.fromisoformat(upload_date)
        except (TypeError, ValueError):
            return jsonify({'error': 'Invalid upload date; expected YYYY-MM-DD'}), 400
    conn = get_db()
    cur = conn.cursor()
    # Store images as JSON array; also accept legacy single 'image'
    stored_image = json.dumps(images) if images else (json.dumps([image]) if image else None)
    if news_id:
        cur.execute(
            'UPDATE news SET title = %s, description = %s, image = %s, upload_date = %s WHERE id = %s',
            (title, description, stored_image, upload_date, news_id)
        )
    else:
        cur.execute(
            'INSERT INTO news (title, description, image, upload_date) VALUES (%s, %s, %s, %s) RETURNING id',
            (title, description, stored_image, upload_date)
        )
        news_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True, 'id': news_id})

@app.route('/api/news/<int:news_id>', methods=['DELETE'])
@admin_required
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
            data['status'] = normalize_status(data.get('status'))
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
            if item.get('upload_date'):
                item['upload_date'] = item['upload_date'].isoformat()
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