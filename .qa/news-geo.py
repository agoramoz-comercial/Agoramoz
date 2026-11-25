"""Gera content/news/geo/{regioes,paises}.json a partir do Natural Earth (domínio público).

Uso: python3 -I .qa/news-geo.py <ne_10m_admin_1_states_provinces.geojson> <ne_110m_admin_0_countries.geojson> <saida>
Fonte: https://github.com/nvkelso/natural-earth-vector (geojson/). Só nomes e pontos de rótulo:
nenhuma geometria, nenhum número estatístico.
"""
import json, sys

PAISES = {'mz': 'MZ', 'pt': 'PT', 'br': 'BR', 'ch': 'CH', 'sg': 'SG', 'us': 'US', 'uk': 'GB',
          'de': 'DE', 'fr': 'FR', 'ae': 'AE', 'sa': 'SA', 'za': 'ZA', 'ca': 'CA'}

a1, a0, saida = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(a1, encoding='utf-8'))
reg = {}
for k, iso in PAISES.items():
    lst = []
    for f in d['features']:
        p = f['properties']
        if p.get('iso_a2') != iso or p.get('latitude') is None:
            continue
        nomes = sorted({n.strip() for n in (p.get('name'), p.get('name_pt'), p.get('name_en')) if n and len(n.strip()) >= 4})
        if not nomes:
            continue
        lst.append({'nome': p.get('name_pt') or p.get('name'), 'nomes': nomes,
                    'lon': round(p['longitude'], 3), 'lat': round(p['latitude'], 3)})
    reg[k] = sorted(lst, key=lambda r: r['nome'])
json.dump(reg, open(f'{saida}/regioes.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

a = json.load(open(a0, encoding='utf-8'))
paises = []
for f in a['features']:
    p = f['properties']
    iso2 = p.get('ISO_A2_EH') if p.get('ISO_A2') in (None, '-99') else p.get('ISO_A2')
    if not iso2 or iso2 == '-99':
        continue
    nomes = sorted({n for n in (p.get('NAME'), p.get('NAME_EN'), p.get('NAME_PT')) if n and len(n) >= 4})
    paises.append({'iso2': iso2.lower(), 'pt': p.get('NAME_PT') or p['NAME'], 'en': p.get('NAME_EN') or p['NAME'],
                   'nomes': nomes, 'lon': round(p['LABEL_X'], 2), 'lat': round(p['LABEL_Y'], 2)})
json.dump(sorted(paises, key=lambda x: x['iso2']), open(f'{saida}/paises.json', 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print(sum(len(v) for v in reg.values()), 'regiões;', len(paises), 'países')
