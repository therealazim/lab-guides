import os
import json
import mimetypes
import hmac
import secrets
import time
from datetime import date, timedelta
from functools import wraps
from flask import Flask, request, jsonify, session
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
except ImportError:
    pass

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('FLASK_SECRET_KEY') or os.environ.get('SESSION_SECRET') or os.urandom(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    MAX_CONTENT_LENGTH=20 * 1024 * 1024,
)

ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
LOGIN_WINDOW_SECONDS = 600
LOGIN_MAX_ATTEMPTS = 5
ADMIN_IDLE_SECONDS = int(os.environ.get('ADMIN_IDLE_SECONDS', '3600'))
MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_PDF_BYTES = 8 * 1024 * 1024
CSRF_HEADER = 'X-CSRF-Token'
CSRF_EXEMPT_PATHS = {'/api/auth/login', '/api/auth/logout'}
VALID_STATUSES = {'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'UNKNOWN', 'UNAVAILABLE'}
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://unpkg.com https://lottie.host; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
    "img-src 'self' data: blob:; "
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
    "media-src 'self'; "
    "connect-src 'self' https://lottie.host https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://unpkg.com; "
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)


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


def client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    parts = [part.strip() for part in forwarded.split(',') if part.strip()]
    return parts[-1] if parts else (request.remote_addr or 'unknown')


def log_audit(action, entity='', entity_id='', details=None):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO audit_log (actor, action, entity, entity_id, details, ip) VALUES (%s, %s, %s, %s, %s, %s)',
            ('admin', action, entity, str(entity_id or ''), json.dumps(details or {}), client_ip()),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f'Audit log error: {exc}')


def validate_upload_data_url(value, allowed_mimes, max_bytes, label):
    if not value:
        return value
    if not isinstance(value, str) or not value.startswith('data:'):
        raise ValueError(f'{label} must be an uploaded file')
    header, separator, payload = value.partition(',')
    if not separator:
        raise ValueError(f'{label} is invalid')
    mime = header[5:].split(';')[0].strip().lower()
    if mime not in allowed_mimes:
        raise ValueError(f'Unsupported {label} file type')
    if (len(payload) * 3) // 4 > max_bytes:
        raise ValueError(f'{label} exceeds the {max_bytes // (1024 * 1024)} MB limit')
    return value


def recent_login_attempts(ip, username):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM login_attempts WHERE attempted_at > NOW() - (%s * INTERVAL '1 second') AND (ip = %s OR username = %s)",
            (LOGIN_WINDOW_SECONDS, ip, username),
        )
        count = cur.fetchone()[0]
        cur.close()
        conn.close()
        return count
    except Exception as exc:
        print(f'Login attempt lookup error: {exc}')
        return 0


def record_login_attempt(ip, username):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('INSERT INTO login_attempts (ip, username) VALUES (%s, %s)', (ip, username))
        cur.execute("DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'")
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f'Login attempt record error: {exc}')


def clear_login_attempts(ip, username):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('DELETE FROM login_attempts WHERE ip = %s OR username = %s', (ip, username))
        conn.commit()
        cur.close()
        conn.close()
    except Exception as exc:
        print(f'Login attempt clear error: {exc}')


@app.before_request
def enforce_session_and_csrf():
    if not request.path.startswith('/api/'):
        return None

    if session.get('admin_authenticated'):
        last_seen = session.get('last_seen')
        if last_seen and time.time() - last_seen > ADMIN_IDLE_SECONDS:
            session.clear()
        else:
            session['last_seen'] = time.time()

    if (
        request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
        and request.path not in CSRF_EXEMPT_PATHS
    ):
        expected = session.get('csrf_token', '')
        provided = request.headers.get(CSRF_HEADER, '')
        if not expected or not provided or not hmac.compare_digest(expected, provided):
            return jsonify({'error': 'Invalid or missing CSRF token'}), 403
    return None


@app.after_request
def add_security_headers(response):
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.headers.setdefault('Content-Security-Policy', CONTENT_SECURITY_POLICY)
    if request.is_secure or app.config.get('SESSION_COOKIE_SECURE'):
        response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return response


@app.errorhandler(413)
def handle_too_large(_error):
    return jsonify({'error': 'Upload is too large'}), 413


@app.errorhandler(500)
def handle_server_error(_error):
    return jsonify({'error': 'Internal server error'}), 500

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, 'dist')

DATABASE_URL = os.environ.get('DATABASE_URL', '')
DATABASE_SSLMODE = os.environ.get('DATABASE_SSLMODE', 'require')

def get_db():
    if DATABASE_SSLMODE:
        return psycopg2.connect(DATABASE_URL, sslmode=DATABASE_SSLMODE)
    return psycopg2.connect(DATABASE_URL)

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
    cur.execute('''
        CREATE TABLE IF NOT EXISTS login_attempts (
            id SERIAL PRIMARY KEY,
            ip TEXT NOT NULL,
            username TEXT NOT NULL,
            attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts (attempted_at)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts (username)')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id SERIAL PRIMARY KEY,
            actor TEXT NOT NULL DEFAULT 'admin',
            action TEXT NOT NULL,
            entity TEXT DEFAULT '',
            entity_id TEXT DEFAULT '',
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            ip TEXT DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC)')
    conn.commit()
    cur.close()
    conn.close()

init_db()

# ─── API Routes ───
@app.route('/api/auth/session', methods=['GET'])
def auth_session():
    authenticated = bool(session.get('admin_authenticated'))
    if authenticated and not session.get('csrf_token'):
        session['csrf_token'] = secrets.token_urlsafe(32)
    return jsonify({
        'authenticated': authenticated,
        'csrfToken': session.get('csrf_token', '') if authenticated else '',
    })


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    body = request.get_json(silent=True) or {}
    username = str(body.get('username', ''))
    password = str(body.get('password', ''))
    ip = client_ip()
    if recent_login_attempts(ip, username) >= LOGIN_MAX_ATTEMPTS:
        response = jsonify({'error': 'Too many login attempts. Try again later.'})
        response.status_code = 429
        response.headers['Retry-After'] = str(LOGIN_WINDOW_SECONDS)
        return response
    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return jsonify({'error': 'Admin authentication is not configured on the server'}), 503
    valid = hmac.compare_digest(username, ADMIN_USERNAME) and hmac.compare_digest(password, ADMIN_PASSWORD)
    if not valid:
        record_login_attempt(ip, username)
        return jsonify({'error': 'Invalid username or password'}), 401
    clear_login_attempts(ip, username)
    session.clear()
    session.permanent = True
    session['admin_authenticated'] = True
    session['last_seen'] = time.time()
    session['csrf_token'] = secrets.token_urlsafe(32)
    log_audit('auth.login', 'session', '', {'ip': ip})
    return jsonify({'ok': True, 'csrfToken': session['csrf_token']})


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    if session.get('admin_authenticated'):
        log_audit('auth.logout', 'session')
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
    try:
        validate_upload_data_url(body.get('image'), {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}, MAX_IMAGE_BYTES, 'Image')
        validate_upload_data_url(body.get('manual'), {'application/pdf'}, MAX_PDF_BYTES, 'Manual')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
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
    log_audit('equipment.save', 'equipment', slug, {'status': body.get('status')})
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
    log_audit('equipment.hide', 'equipment', slug)
    return jsonify({'ok': True})


@app.route('/api/hidden-equipment/details', methods=['GET'])
@admin_required
def get_hidden_equipment_details():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT slug, data FROM equipment WHERE hidden = true ORDER BY slug')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for slug, data in rows:
        payload = data or {}
        localized = payload.get('en') or payload
        name = localized.get('name') if isinstance(localized, dict) else ''
        result.append({'slug': slug, 'name': name or ''})
    return jsonify(result)


@app.route('/api/equipment/<slug>/restore', methods=['POST'])
@admin_required
def restore_equipment(slug):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('UPDATE equipment SET hidden = false WHERE slug = %s', (slug,))
    if cur.rowcount == 0:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({'error': 'Equipment not found'}), 404
    conn.commit()
    cur.close()
    conn.close()
    log_audit('equipment.restore', 'equipment', slug)
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
    try:
        validate_upload_data_url(image, {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}, MAX_IMAGE_BYTES, 'Image')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
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
    log_audit('partner.create', 'partner', partner_id, {'name': name})
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
    try:
        validate_upload_data_url(image, {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}, MAX_IMAGE_BYTES, 'Image')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
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
    log_audit('partner.update', 'partner', partner_id, {'name': name})
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
    log_audit('partner.delete', 'partner', partner_id)
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
    log_audit('translation.save', 'translation', key, {'lang': lang})
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
    if images is None:
        images = []
    if not isinstance(images, list):
        return jsonify({'error': 'Images must be a list'}), 400
    try:
        for candidate in images:
            validate_upload_data_url(candidate, {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}, MAX_IMAGE_BYTES, 'Image')
        validate_upload_data_url(image, {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}, MAX_IMAGE_BYTES, 'Image')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
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
    log_audit('news.update' if body.get('id') else 'news.create', 'news', news_id, {'title': title})
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
    log_audit('news.delete', 'news', news_id)
    return jsonify({'ok': True})

# ─── Audit ───
@app.route('/api/audit', methods=['GET'])
@admin_required
def get_audit_log():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        item = dict(row)
        if item.get('created_at'):
            item['created_at'] = item['created_at'].isoformat()
        result.append(item)
    return jsonify(result)


# ─── SEO ───
def site_base_url():
    configured = os.environ.get('SITE_URL', '').strip()
    return (configured or request.host_url).rstrip('/')


def bundled_equipment_slugs():
    data_file = os.path.join(BASE_DIR, 'src', 'data', 'equipments.json')
    try:
        with open(data_file, 'r', encoding='utf-8') as handle:
            rows = json.load(handle)
        return [row['slug'] for row in rows if isinstance(row, dict) and row.get('slug')]
    except (OSError, ValueError, KeyError):
        return []


def sitemap_equipment_slugs():
    bundled = set(bundled_equipment_slugs())
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT slug, hidden FROM equipment')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        hidden = {row[0] for row in rows if row[1]}
        visible = {row[0] for row in rows if not row[1]}
        return sorted((bundled | visible) - hidden)
    except Exception as exc:
        print(f'Sitemap database error: {exc}')
        return sorted(bundled)


@app.route('/robots.txt')
def robots_txt():
    body = (
        'User-agent: *\n'
        'Allow: /\n'
        'Disallow: /admin\n'
        f'Sitemap: {site_base_url()}/sitemap.xml\n'
    )
    return Flask.response_class(body, mimetype='text/plain')


@app.route('/sitemap.xml')
def sitemap_xml():
    base = site_base_url()
    pages = ['/', '/catalog', '/training', '/sop', '/download', '/certificate', '/faq', '/announcements', '/about', '/privacy', '/terms']
    urls = [f'{base}/' if page == '/' else f'{base}/#{page}' for page in pages]
    urls += [f'{base}/#/catalog/{slug}' for slug in sitemap_equipment_slugs()]
    items = ''.join(f'<url><loc>{url}</loc></url>' for url in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f'{items}</urlset>'
    )
    return Flask.response_class(xml, mimetype='application/xml')


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
            response = Flask.response_class(content, mimetype=mime)
            if path.startswith('assets/'):
                response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
            return response
        # Missing asset or file-like path should 404 instead of returning HTML.
        if path.startswith(('assets/', 'videos/', 'guides/', 'images/', 'logos/', 'flags/')) or '.' in os.path.basename(path):
            return 'Not found', 404
    
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
    
    response = Flask.response_class(html, mimetype='text/html')
    response.headers['Cache-Control'] = 'no-cache, must-revalidate'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)