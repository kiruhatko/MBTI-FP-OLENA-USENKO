"""Збирає сайт в один файл index.html у корені репо (його роздає GitHub Pages).
    python3 build.py

Усе вшивається в сторінку: стилі, код, шрифти (data:) і еталон Олени з reference.json —
тож сторінка не робить жодного мережевого запиту, а CSP default-src 'none' це гарантує."""
import base64, hashlib, json, os, sys

H = os.path.dirname(os.path.abspath(__file__))
r = lambda *p: open(os.path.join(H, *p), encoding='utf-8').read()
b64 = lambda *p: base64.b64encode(open(os.path.join(H, *p), 'rb').read()).decode()
die = lambda m: sys.exit('✗ ' + m)

# твердження й підрахунок — байт у байт як у kiruhatko/mbti-alone (еталон Олени пораховано саме цим кодом)
PINNED = {
    'src/data.js': '33b0b9c20b375e024967c833cf82b1b2bf3edce329e35db12c80daf6746b2f4b',
    'src/core.js': '9eeb0bdf94456f88cf119da36bc0d1430b125e224a0d98c2546d58427d9eac3f',
}
for f, h in PINNED.items():
    if hashlib.sha256(open(os.path.join(H, f), 'rb').read()).hexdigest() != h:
        die(f'{f} змінено — твердження й підрахунок мають лишатися як у mbti-alone')

# еталон Олени: лише дозволені поля, нічого зайвого
ref = json.loads(r('reference.json'))
TOP = {'schema', 'test', 'type', 'identity', 'full', 'type_name', 'axes', 'facets', 'answers'}
if set(ref) - TOP: die('зайві поля в reference.json: ' + ', '.join(sorted(set(ref) - TOP)))
if set(ref['test']) - {'name', 'question_count', 'question_set_hash'}: die('зайві поля в reference.json → test')
if ref['test']['question_set_hash'] != 8547: die('QH еталона не 8547')
for k, v in ref['axes'].items():
    if set(v) - {'pct_first', 'dominant', 'dominant_pct'}: die('зайві поля в шкалі ' + k)
for k, v in ref['facets'].items():
    if set(v) - {'pct_first'}: die('зайві поля в грані ' + k)
if 'answers' in ref and not (isinstance(ref['answers'], list) and len(ref['answers']) == 91 and all(isinstance(x, int) and -3 <= x <= 3 for x in ref['answers'])):
    die('answers у reference.json мають бути 91 числом від −3 до 3 (і лише за згодою Олени)')

css = (r('src', 'style.css')
       .replace('__FONT_DISPLAY__', b64('fonts', 'fp-display.woff'))
       .replace('__FONT_MONO4__', b64('fonts', 'fp-mono-400.woff'))
       .replace('__FONT_MONO6__', b64('fonts', 'fp-mono-600.woff')))
js = '\n'.join([r('src', 'data.js'), r('src', 'core.js'),
                '/* еталон Олени — з reference.json */\nconst REF = ' + json.dumps(ref, ensure_ascii=False, separators=(',', ':')) + ';',
                r('src', 'compare.js'), r('src', 'app.js')])
html = r('src', 'page.html').replace('__CSS__', css).replace('__JS__', js)

# запобіжник: у зібраній сторінці не має бути слідів сирого файлу
for bad in ('time_sec', 'user_agent', 'started_at', 'finished_at', 'answering_time', 'answers_sha256', 'integrity',
            'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'googleapis', 'gstatic'):
    if bad in html: die('у сторінці знайдено заборонене: ' + bad)
# адреси: лише простір імен SVG, посилання-переходи на канали й og:image (його бачать лише прев'ю в месенджерах)
ALLOWED_URLS = ('http://www.w3.org/2000/svg', 'https://t.me/olenausenko_fan', 'https://www.instagram.com/fan_olena.usenko/',
                'https://kiruhatko.github.io/MBTI-FP-OLENA-USENKO/og.png')
rest = html
for u in ALLOWED_URLS: rest = rest.replace(u, '')
if 'http://' in rest or 'https://' in rest:
    i = rest.find('http'); die('у сторінці знайдено сторонню адресу: ' + rest[i:i + 60])
open(os.path.join(H, 'index.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(H, '.nojekyll'), 'w').close()
print(f"index.html {len(html.encode()) // 1024} КБ · еталон {ref['full']} · відповіді Олени по твердженнях: {'ТАК' if 'answers' in ref else 'немає'}")
