#!/usr/bin/env python3
"""
Constrói o corpus do Cívico (content/civico/corpus/*.json) a partir do texto
extraído dos PDF do Boletim da República.

    python3 .qa/civico-corpus.py <pasta com trabalho.md, sucessoes.md, familia.md>

O texto de entrada é a extracção em Markdown de cada PDF (uma por diploma).
Daqui sai um ficheiro por diploma, com um registo por ARTIGO: número, epígrafe
e parágrafos. É este texto — e só este — que a página mostra como «texto
oficial» e contra o qual as citações do motor são conferidas.

Falha fechada, de propósito:
  - um artigo cujo cabeçalho não se lê fica de fora;
  - um número que aparece duas vezes (o artigo 1 da lei de aprovação e o
    artigo 1 do regime) fica de fora nas duas;
  - um artigo sem epígrafe, curto demais ou longo demais fica de fora.
O que fica de fora não pode ser citado: a página diz «por confirmar», em vez
de mostrar um texto de que não há certeza.
"""
import json, re, sys, unicodedata
from pathlib import Path

DIPLOMAS = {
    'trabalho': {
        'nome': 'Lei n.º 13/2023, de 25 de Agosto',
        'titulo': 'Lei do Trabalho',
        'numero': '13/2023',
        'fonte': {'titulo': 'Boletim da República (cópia na FAOLEX)', 'href': 'https://faolex.fao.org/docs/pdf/moz221728.pdf'},
    },
    'sucessoes': {
        'nome': 'Lei n.º 23/2019, de 23 de Dezembro',
        'titulo': 'Lei das Sucessões',
        'numero': '23/2019',
        'fonte': {'titulo': 'Boletim da República (cópia)', 'href': 'https://reformar.co.mz/documentos-diversos/lei-23-2019-lei-das-sucessoes.pdf'},
    },
    'familia': {
        'nome': 'Lei n.º 22/2019, de 11 de Dezembro',
        'titulo': 'Lei da Família',
        'numero': '22/2019',
        'fonte': {'titulo': 'Boletim da República (cópia na FAOLEX)', 'href': 'https://faolex.fao.org/docs/pdf/moz208614.pdf'},
    },
}

CABECALHO = re.compile(r'^[#\s*_]*art(?:igo|\.)\s*(\d{1,3})[\s*_.º°]*$', re.I)
ESTRUTURA = re.compile(r'^[#\s*_]*(livro|t[ií]tulo|cap[ií]tulo|sec[cç][aã]o|subsec[cç][aã]o|divis[aã]o)\b', re.I)
RUIDO = re.compile(r'^(\* \* \*|[-_]{3,}|\d{1,5}\s*[—–-]\s*\(\d+\)|.*boletim da rep[uú]blica.*|.*I\s+S[EÉ]RIE\s*[—–-]\s*N[UÚ]MERO.*|\d{1,2} DE [A-ZÇ]+ DE \d{4}|\d{1,5})$', re.I)
PARAGRAFO = re.compile(r'^(\d{1,2}\.|[a-z]\)|_[a-z]_\))\s')


def limpar(linha: str) -> str:
    linha = re.sub(r'^[#\s]+', '', linha)
    linha = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', linha)
    return re.sub(r'\s+', ' ', linha).strip()


def artigos_de(md: str):
    linhas = md.replace('\r', '').split('\n')
    blocos, actual = [], None
    for bruta in linhas:
        m = CABECALHO.match(bruta.strip())
        if m:
            actual = {'n': int(m.group(1)), 'linhas': []}
            blocos.append(actual)
        elif actual is not None:
            actual['linhas'].append(bruta)
    return blocos


def construir(md: str):
    vistos, saida, rejeitados = {}, [], []
    for b in artigos_de(md):
        linhas = [limpar(l) for l in b['linhas']]
        linhas = [l for l in linhas if l and not RUIDO.match(l)]
        # A epígrafe é a primeira linha, entre parênteses.
        if not linhas or not re.match(r'^\(.{3,160}\)$', linhas[0]):
            rejeitados.append((b['n'], 'sem epígrafe'))
            continue
        epigrafe = linhas[0][1:-1].strip()
        corpo = []
        for l in linhas[1:]:
            if ESTRUTURA.match(l):
                break  # começou outra divisão do diploma: o artigo acabou
            corpo.append(l)
        # Junta as linhas partidas pela paginação; um parágrafo novo começa em «1.», «a)».
        paragrafos = []
        for l in corpo:
            l = re.sub(r'^_([a-z])_\)', r'\1)', l)
            if PARAGRAFO.match(l) or not paragrafos:
                paragrafos.append(l)
            else:
                junto = paragrafos[-1]
                paragrafos[-1] = (junto[:-1] + l) if junto.endswith('-') and l[:1].islower() else f'{junto} {l}'
        texto = ' '.join(paragrafos)
        if not (20 <= len(texto) <= 6000):
            rejeitados.append((b['n'], f'tamanho {len(texto)}'))
            continue
        artigo = {'n': b['n'], 'epigrafe': epigrafe, 'paragrafos': paragrafos}
        if b['n'] in vistos:
            # Dois artigos com o mesmo número: não se sabe qual é qual. Saem os dois.
            vistos[b['n']] = None
            rejeitados.append((b['n'], 'número repetido'))
        else:
            vistos[b['n']] = artigo
    saida = [a for a in vistos.values() if a]
    saida.sort(key=lambda a: a['n'])
    return saida, rejeitados


def main():
    pasta = Path(sys.argv[1])
    destino = Path(__file__).resolve().parent.parent / 'content' / 'civico' / 'corpus'
    destino.mkdir(parents=True, exist_ok=True)
    for chave, meta in DIPLOMAS.items():
        md = (pasta / f'{chave}.md').read_text()
        artigos, rejeitados = construir(md)
        (destino / f'{chave}.json').write_text(
            json.dumps({'id': chave, **meta, 'artigos': artigos}, ensure_ascii=False, indent=1) + '\n'
        )
        maximo = max(a['n'] for a in artigos)
        print(f'{chave}: {len(artigos)} artigos (até ao {maximo}); fora: {len(rejeitados)} {rejeitados[:12]}')


if __name__ == '__main__':
    main()
