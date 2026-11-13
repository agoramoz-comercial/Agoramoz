"""
Gera os documentos de teste do upload de propostas (TUDO DE EXEMPLO):
  python3 -I .qa/propostas-fixtures.py lib/propostas/__fixtures__
Cria proposta-exemplo.docx (estilos de título do Word, listas, tabela, título
a negrito) e, com o LibreOffice, proposta-exemplo.pdf a partir dele.
"""
import subprocess, sys
from pathlib import Path
from docx import Document

saida = Path(sys.argv[1]); saida.mkdir(parents=True, exist_ok=True)
d = Document()
d.add_heading('Proposta comercial — Portal de pedidos', level=0)
for linha in ['Cliente: Cliente de Exemplo, Lda.', 'Data: 12/11/2026', 'Validade: 45 dias']:
    d.add_paragraph(linha)
d.add_heading('Carta de apresentação', level=1)
d.add_paragraph('Agradecemos a oportunidade de apresentar esta proposta de exemplo.')
d.add_paragraph('Com os melhores cumprimentos,')
d.add_heading('Contexto', level=1)
d.add_paragraph('Pedidos por telefone: os revendedores de exemplo fazem pedidos por telefone.', style='List Bullet')
d.add_paragraph('Sem histórico: ninguém sabe quanto cada revendedor comprou.', style='List Bullet')
d.add_heading('Objectivos', level=1)
d.add_paragraph('Reduzir o tempo de registo de um pedido.', style='List Bullet')
d.add_heading('Investimento', level=1)
t = d.add_table(rows=1, cols=4)
for c, v in zip(t.rows[0].cells, ['Fase', 'Entregáveis', 'Duração', 'Valor']): c.text = v
for linha in [('Diagnóstico', 'Levantamento de processos', '2–3 semanas', '285 000 MZN'),
              ('Implementação', 'Portal em produção', '6 semanas', '1 450 000 MZN')]:
    for c, v in zip(t.add_row().cells, linha): c.text = v
p = d.add_paragraph(); r = p.add_run('Próximos passos'); r.bold = True
d.add_paragraph('Aprovar a proposta de exemplo.', style='List Number')
d.sections[0].header.paragraphs[0].text = 'Cabeçalho de exemplo'
d.save(saida / 'proposta-exemplo.docx')
subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', str(saida), str(saida / 'proposta-exemplo.docx')],
               check=True, capture_output=True, timeout=180)
print('ok', sorted(p.name for p in saida.iterdir()))
