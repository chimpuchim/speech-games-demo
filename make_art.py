"""Writes the demo's vector artwork. Run once: python3 make_art.py  (no dependencies)."""
import os

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g stroke="#3b2f2f" stroke-width="4" '
        'stroke-linejoin="round" stroke-linecap="round">')
TAIL = '</g></svg>'
EYES = lambda y, dx=14, r=5: (f'<circle cx="{64-dx}" cy="{y}" r="{r}" fill="#3b2f2f" stroke="none"/>'
                              f'<circle cx="{64+dx}" cy="{y}" r="{r}" fill="#3b2f2f" stroke="none"/>')

ART = {
 'dog': '''<ellipse cx="30" cy="50" rx="16" ry="30" fill="#8a5a3c" transform="rotate(18 30 50)"/>
<ellipse cx="98" cy="50" rx="16" ry="30" fill="#8a5a3c" transform="rotate(-18 98 50)"/>
<circle cx="64" cy="68" r="38" fill="#c98f5b"/><ellipse cx="64" cy="84" rx="20" ry="15" fill="#f4dcc0"/>
<ellipse cx="64" cy="76" rx="8" ry="6" fill="#3b2f2f"/>''' + EYES(60) + '''<path d="M64 82v7M55 92q9 7 18 0" fill="none"/>''',
 'cat': '''<path d="M24 56L22 16 52 36Z" fill="#f2a65a"/><path d="M104 56L106 16 76 36Z" fill="#f2a65a"/>
<path d="M30 46L29 28 42 37Z" fill="#f6c3c3" stroke="none"/><path d="M98 46L99 28 86 37Z" fill="#f6c3c3" stroke="none"/>
<ellipse cx="64" cy="72" rx="42" ry="38" fill="#f6b873"/><path d="M58 38v10M64 36v12M70 38v10" fill="none" stroke="#c9843f"/>''' + EYES(68, 17, 6) +
 '''<path d="M57 80h14l-7 8z" fill="#e58a8a"/><path d="M64 88q-6 9-15 5M64 88q6 9 15 5" fill="none"/>
<path d="M30 80l-14-3M30 88l-14 3M98 80l14-3M98 88l14 3" fill="none" stroke-width="3"/>''',
 'rabbit': '''<ellipse cx="46" cy="30" rx="12" ry="30" fill="#f4f1ee"/><ellipse cx="82" cy="30" rx="12" ry="30" fill="#f4f1ee"/>
<ellipse cx="46" cy="32" rx="5" ry="20" fill="#f6b3c0" stroke="none"/><ellipse cx="82" cy="32" rx="5" ry="20" fill="#f6b3c0" stroke="none"/>
<circle cx="64" cy="80" r="36" fill="#f4f1ee"/>''' + EYES(74, 15) + '''<ellipse cx="64" cy="86" rx="6" ry="4.5" fill="#f08aa0"/>
<path d="M64 90v6M54 98q10 7 20 0" fill="none"/><rect x="59" y="97" width="10" height="10" rx="2" fill="#fff"/>''',
 'fish': '''<path d="M96 64L124 40V88Z" fill="#ff9a3c"/><ellipse cx="58" cy="64" rx="42" ry="30" fill="#ffb347"/>
<path d="M44 38q14-16 28 0" fill="#ff9a3c"/><path d="M52 44q-8 20 0 40M66 42q-8 22 0 44" fill="none" stroke="#e8822a" stroke-width="3"/>
<circle cx="34" cy="58" r="8" fill="#fff"/><circle cx="32" cy="58" r="4" fill="#3b2f2f" stroke="none"/><path d="M22 74q6 5 12 0" fill="none"/>''',
 'lion': '''<circle cx="64" cy="66" r="54" fill="#d98a2b"/><circle cx="64" cy="70" r="36" fill="#f5c46b"/>
<circle cx="36" cy="42" r="10" fill="#f5c46b"/><circle cx="92" cy="42" r="10" fill="#f5c46b"/>''' + EYES(64, 14) +
 '''<path d="M54 76h20l-10 10z" fill="#3b2f2f"/><path d="M64 86v6M52 94q12 8 24 0" fill="none"/>''',
 'elephant': '''<circle cx="30" cy="62" r="26" fill="#9aa5b1"/><circle cx="98" cy="62" r="26" fill="#9aa5b1"/>
<circle cx="64" cy="58" r="36" fill="#b6c0cb"/><path d="M52 76h24v28q0 18-14 18t-10-14q10 6 10-6V92h-10z" fill="#b6c0cb"/>''' + EYES(52, 16) +
 '''<path d="M40 82q-6 14 4 20" fill="none" stroke="#fff" stroke-width="5"/>''',
 'monkey': '''<circle cx="22" cy="62" r="15" fill="#8a5a3c"/><circle cx="106" cy="62" r="15" fill="#8a5a3c"/>
<circle cx="22" cy="62" r="7" fill="#f1c9a0" stroke="none"/><circle cx="106" cy="62" r="7" fill="#f1c9a0" stroke="none"/>
<circle cx="64" cy="60" r="40" fill="#8a5a3c"/><path d="M34 62q0-20 30-14q30-6 30 14q0 34-30 34T34 62z" fill="#f1c9a0"/>''' + EYES(62, 13) +
 '''<ellipse cx="58" cy="76" rx="2.5" ry="3.5" fill="#3b2f2f" stroke="none"/><ellipse cx="70" cy="76" rx="2.5" ry="3.5" fill="#3b2f2f" stroke="none"/>
<path d="M50 84q14 14 28 0" fill="none"/>''',
 'panda': '''<circle cx="32" cy="32" r="15" fill="#2b2b2b"/><circle cx="96" cy="32" r="15" fill="#2b2b2b"/><circle cx="64" cy="68" r="42" fill="#fff"/>
<ellipse cx="46" cy="62" rx="12" ry="16" fill="#2b2b2b" transform="rotate(-20 46 62)"/><ellipse cx="82" cy="62" rx="12" ry="16" fill="#2b2b2b" transform="rotate(20 82 62)"/>
<circle cx="47" cy="62" r="4" fill="#fff" stroke="none"/><circle cx="81" cy="62" r="4" fill="#fff" stroke="none"/>
<ellipse cx="64" cy="80" rx="8" ry="6" fill="#2b2b2b"/><path d="M64 86v5M55 94q9 6 18 0" fill="none"/>''',
 'apple': '''<path d="M64 38C40 22 12 40 18 72c5 28 28 50 46 42 18 8 41-14 46-42 6-32-22-50-46-34z" fill="#e8403f"/>
<path d="M64 38q-2-14 8-24" fill="none" stroke-width="5"/><path d="M68 28q22-14 32 4q-18 14-32-4z" fill="#4caf50"/>
<path d="M32 62q4-14 14-18" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>''',
 'banana': '''<path d="M24 30C22 88 68 116 112 88C117 84 113 76 106 78C78 94 48 74 46 32C46 24 26 22 24 30z" fill="#ffd84a"/>
<path d="M24 30q-2-14 6-18q8 2 16 12" fill="#8a6a3c"/><path d="M60 86q24 8 40-4" fill="none" stroke="#e5b92e" stroke-width="3"/>''',
 'grapes': '''<path d="M64 26q0-12 8-18" fill="none" stroke-width="5"/><path d="M68 18q22-10 34 6q-20 12-34-6z" fill="#4caf50"/>
<circle cx="40" cy="48" r="16" fill="#8e5fd1"/><circle cx="72" cy="46" r="16" fill="#8e5fd1"/><circle cx="56" cy="70" r="16" fill="#8e5fd1"/>
<circle cx="88" cy="70" r="16" fill="#8e5fd1"/><circle cx="40" cy="90" r="16" fill="#8e5fd1"/><circle cx="72" cy="94" r="16" fill="#8e5fd1"/><circle cx="56" cy="114" r="12" fill="#8e5fd1"/>
<circle cx="35" cy="42" r="4" fill="#fff" stroke="none" opacity=".6"/><circle cx="67" cy="40" r="4" fill="#fff" stroke="none" opacity=".6"/>''',
 'strawberry': '''<path d="M64 120C28 98 14 66 20 46c6-18 30-14 44-4c14-10 38-14 44 4c6 20-8 52-44 74z" fill="#ef4a58"/>
<path d="M40 40l24-14 24 14-12 8h-24z" fill="#4caf50"/>
<g fill="#ffe27a" stroke="none"><ellipse cx="44" cy="62" rx="3" ry="5"/><ellipse cx="64" cy="66" rx="3" ry="5"/><ellipse cx="84" cy="62" rx="3" ry="5"/><ellipse cx="54" cy="84" rx="3" ry="5"/><ellipse cx="74" cy="86" rx="3" ry="5"/><ellipse cx="64" cy="102" rx="3" ry="5"/></g>''',
 'pizza': '''<path d="M64 120L12 34Q64 8 116 34Z" fill="#f7c15a"/><path d="M12 34Q64 8 116 34l-6 10Q64 22 18 44z" fill="#e39a3b"/>
<circle cx="52" cy="54" r="9" fill="#d9413a"/><circle cx="78" cy="58" r="9" fill="#d9413a"/><circle cx="64" cy="82" r="9" fill="#d9413a"/>
<circle cx="60" cy="52" r="2" fill="#f7c15a" stroke="none"/>''',
 'cookie': '''<circle cx="64" cy="64" r="48" fill="#e0a45e"/><g fill="#5a3a22" stroke="none"><ellipse cx="46" cy="46" rx="7" ry="5"/><ellipse cx="80" cy="44" rx="6" ry="5"/>
<ellipse cx="64" cy="68" rx="7" ry="5"/><ellipse cx="42" cy="82" rx="6" ry="5"/><ellipse cx="86" cy="84" rx="7" ry="5"/><ellipse cx="66" cy="96" rx="5" ry="4"/></g>
<path d="M104 40q-4-10-12-14" fill="none" stroke="#fff" stroke-width="4" opacity=".5"/>''',
 'donut': '''<path fill-rule="evenodd" d="M64 14a50 50 0 1 0 .1 0zM64 50a14 14 0 1 1-.1 0z" fill="#e5a86a"/>
<path fill-rule="evenodd" d="M64 22c-26 0-42 20-42 42s16 42 42 42 42-20 42-42-16-42-42-42zM64 50a14 14 0 1 1-.1 0z" fill="#ff8fb8"/>
<g stroke="none"><rect x="36" y="42" width="12" height="5" rx="2" fill="#fff" transform="rotate(-30 42 44)"/><rect x="78" y="34" width="12" height="5" rx="2" fill="#ffe27a" transform="rotate(20 84 36)"/>
<rect x="88" y="66" width="12" height="5" rx="2" fill="#7ad3ff" transform="rotate(-10 94 68)"/><rect x="30" y="72" width="12" height="5" rx="2" fill="#7ad3ff" transform="rotate(25 36 74)"/>
<rect x="56" y="92" width="12" height="5" rx="2" fill="#fff" transform="rotate(-15 62 94)"/></g>''',
 'icecream': '''<path d="M38 66h52L64 122z" fill="#e6b06a"/><path d="M48 70l16 36M64 70l-8 38M64 70l8 38M80 70L64 106M42 82h44M52 98h24" fill="none" stroke="#b8803c" stroke-width="2.5"/>
<circle cx="64" cy="54" r="26" fill="#ff9fc4"/><circle cx="46" cy="64" r="16" fill="#8fe3d0"/><circle cx="84" cy="64" r="16" fill="#ffe27a"/>
<circle cx="64" cy="26" r="8" fill="#d9413a"/><path d="M64 20q2-10 10-12" fill="none" stroke-width="3"/>''',
}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'art')
os.makedirs(out, exist_ok=True)
for name, body in ART.items():
    with open(os.path.join(out, name + '.svg'), 'w', encoding='utf-8') as f:
        f.write(HEAD + body + TAIL)
print('wrote', len(ART), 'files to', out)
