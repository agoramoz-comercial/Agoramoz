import { Fragment } from 'react';
import { agrupar } from '@/lib/propostas/modelo';
import {
  aulasDoCurso,
  AVISO_FONTE_IA,
  duracao,
  minutosDoCurso,
  ROTULO_NIVEL,
  ROTULO_ORIGEM,
  temFonteIA,
  type Bloco,
  type Curso,
} from '@/lib/cursos/modelo';
import s from './curso.module.css';
import { Esquema, ExercicioDoc, GraficoColunas } from './Visuais';

/**
 * O documento do curso (D-49), pronto para «Guardar como PDF».
 *
 * Tudo o que aqui aparece vem do curso verificado: os números da capa e da
 * visão geral são contas sobre o próprio curso, cada bloco leva as etiquetas
 * das passagens que o sustentam, e o relatório de verificação diz o que foi
 * retirado. Nada é acrescentado à mão.
 */

const n2 = (n: number) => String(n).padStart(2, '0');
const LETRAS = ['A', 'B', 'C', 'D'] as const;
const inteiro = (n: number) => agrupar(n).replace(/,00$/, '');

function Fontes({ ids }: { ids: readonly string[] }) {
  return (
    <p className={s.fontes} aria-label="Fontes">
      {ids.map((id) => (
        <span key={id} className={s.tag}>
          {id}
        </span>
      ))}
    </p>
  );
}

function BlocoDoc({ b }: { b: Bloco }) {
  if (b.tipo === 'citacao')
    return (
      <div className={`${s.bloco} ${s.citacao}`}>
        <blockquote>«{b.citacao}»</blockquote>
        <p className={`${s.corpo} ${s.mt1}`}>{b.texto}</p>
        <Fontes ids={b.fontes} />
      </div>
    );
  if (b.tipo === 'grafico' && b.grafico)
    return (
      <div className={s.bloco}>
        <p className={s.corpo}>{b.texto}</p>
        <GraficoColunas g={b.grafico} />
        <Fontes ids={b.fontes} />
      </div>
    );
  if (b.tipo === 'esquema' && b.itens?.length)
    return (
      <div className={s.bloco}>
        <p className={s.corpo}>{b.texto}</p>
        <Esquema itens={b.itens} titulo={b.texto.split(/[.:]/)[0]!.slice(0, 60)} />
        <Fontes ids={b.fontes} />
      </div>
    );
  if (b.tipo === 'exemplo')
    return (
      <div className={`${s.bloco} ${s.exemplo}`}>
        <p className={s.lab}>Exemplo das fontes</p>
        <p className={`${s.corpo} ${s.mt1}`}>{b.texto}</p>
        <Fontes ids={b.fontes} />
      </div>
    );
  return (
    <div className={s.bloco}>
      {b.texto.split(/\n+/).map((p, i) => (
        <p key={i} className={s.corpo}>
          {p}
        </p>
      ))}
      {b.itens && b.itens.length > 0 && (
        <ol className={s.passos}>
          {b.itens.map((x, i) => (
            <li key={i} className={s.corpo}>
              <span>{x}</span>
            </li>
          ))}
        </ol>
      )}
      <Fontes ids={b.fontes} />
    </div>
  );
}

function Barra({ esquerda, direita }: { esquerda: string; direita: string }) {
  return (
    <div className={s.barra}>
      <span className={s.lab}>{esquerda}</span>
      <span className={`${s.lab} ${s.tnum}`}>{direita}</span>
    </div>
  );
}

function Cabecalho({ curso, seccao }: { curso: Curso; seccao: string }) {
  return (
    <div className={s.cabecalho}>
      <span className={s.lab}>{seccao}</span>
      <span className={s.lab}>{curso.titulo}</span>
    </div>
  );
}

export function DocumentoCurso({ curso, escala }: { curso: Curso; escala?: number }) {
  const minutos = minutosDoCurso(curso);
  const aulas = aulasDoCurso(curso);
  const perguntas = curso.modulos.reduce((t, m) => t + m.aulas.reduce((a, x) => a + x.perguntas.length, 0), 0);
  const v = curso.verificacao;
  const total = v.aceites + v.retirados;
  const pctAceite = total ? Math.round((v.aceites / total) * 100) : 0;
  const maxMin = Math.max(1, ...curso.modulos.map((m) => m.aulas.reduce((a, x) => a + x.minutos, 0)));
  const data = v.emitidaEm.slice(0, 10).split('-').reverse().join('/');

  return (
    <div
      className={s.doc}
      style={escala ? ({ '--escala': escala } as React.CSSProperties) : undefined}
      data-curso-documento
      data-curso-imprimir
    >
      {/* 1. Capa */}
      <section className={`${s.cheia} ${s.azul}`} aria-label="Capa">
        <div className={s.topo}>
          <span className={s.marca}>AGORAMOZ ACADEMIA</span>
          <span className={s.pill}>{ROTULO_NIVEL[curso.nivel]}</span>
        </div>
        <div className={s.formas} aria-hidden="true" style={{ right: '-62mm', top: '24mm' }}>
          <span style={{ inset: '0 0 auto auto', width: '110mm', height: '110mm', background: 'rgba(255,255,255,.10)' }} />
          <span style={{ left: '10mm', top: '60mm', width: '80mm', height: '80mm', background: 'var(--lavanda)', opacity: 0.9 }} />
          <span style={{ left: '50mm', top: '30mm', width: '46mm', height: '46mm', background: 'var(--tinta)' }} />
        </div>
        <p className={`${s.lab} ${s.mt4}`}>Curso</p>
        <h1
          className={`${s.disp} ${s.mega} ${s.mt2}`}
          style={{ maxWidth: '118mm', position: 'relative', fontSize: curso.titulo.length > 28 ? '44pt' : undefined }}
        >
          {curso.titulo}
        </h1>
        {curso.subtitulo && (
          <p className={`${s.md} ${s.mt3}`} style={{ maxWidth: '105mm', position: 'relative', fontWeight: 400 }}>
            {curso.subtitulo}
          </p>
        )}
        <div className={s.cresce} />
        <div className={`${s.grelha4} ${s.mt4}`} style={{ marginBottom: '10mm', position: 'relative' }}>
          {[
            ['Duração', duracao(minutos)],
            ['Módulos', n2(curso.modulos.length)],
            ['Aulas', n2(aulas)],
            ['Fontes', n2(curso.fontes.length)],
          ].map(([k, x]) => (
            <div key={k} className={s.meta}>
              <span className={s.lab}>{k}</span>
              <span className={`${s.sm} ${s.tnum}`}>{x}</span>
            </div>
          ))}
        </div>
        <Barra esquerda="Gerado das fontes · cada afirmação verificada" direita={`Emitido em ${data}`} />
      </section>

      {/* 2. Visão geral */}
      <section className={`${s.cheia} ${s.lavanda}`} aria-label="Visão geral">
        <div className={s.topo}>
          <span className={s.lab}>01 — Visão geral</span>
          <span className={s.lab}>{curso.titulo}</span>
        </div>
        <h2 className={`${s.disp} ${s.xl} ${s.mt4}`}>
          O curso
          <br />
          em números
        </h2>
        <div className={`${s.grelha2} ${s.mt4}`}>
          {[
            [duracao(minutos), 'de estudo, somando as aulas'],
            [n2(aulas), `aulas em ${curso.modulos.length} módulos`],
            [n2(perguntas), 'perguntas para verificar o que aprendeu'],
            [`${pctAceite}%`, 'das afirmações geradas passaram a verificação'],
          ].map(([x, k]) => (
            <div key={k} className={s.stat}>
              <span className={s.numero}>{x}</span>
              <span className={s.pequeno}>{k}</span>
            </div>
          ))}
        </div>
        <div className={`${s.grelha2} ${s.mt4}`}>
          <div className={s.meta}>
            <span className={s.lab}>Para quem</span>
            <p className={s.corpo}>{curso.publico}</p>
          </div>
          <div className={s.meta}>
            <span className={s.lab}>Antes de começar</span>
            <p className={s.corpo}>
              {curso.prerequisitos.length ? curso.prerequisitos.join(' · ') : 'Sem pré-requisitos indicados nas fontes.'}
            </p>
          </div>
        </div>
        <div className={s.cresce} />
        <p className={s.lab} style={{ marginBottom: '3mm' }}>
          Minutos por módulo
        </p>
        <div className={s.barras} style={{ marginBottom: '10mm' }}>
          {curso.modulos.map((m, i) => {
            const t = m.aulas.reduce((a, x) => a + x.minutos, 0);
            return (
              <div key={i} className={s.barraLinha}>
                <span className={s.pequeno}>
                  {n2(i + 1)} · {m.titulo.slice(0, 26)}
                </span>
                <span className={s.trilho}>
                  <span className={s.enchimento} style={{ width: `${(t / maxMin) * 100}%` }} />
                </span>
                <span className={`${s.pequeno} ${s.tnum}`} style={{ textAlign: 'right' }}>
                  {t} min
                </span>
              </div>
            );
          })}
        </div>
        <Barra esquerda="AGORAMOZ Academia" direita={ROTULO_NIVEL[curso.nivel]} />
      </section>

      {/* 3. O que vai aprender + programa */}
      <section className={s.fluxo} aria-label="O que vai aprender">
        <Cabecalho curso={curso} seccao="02 — O que vai aprender" />
        <h2 className={`${s.disp} ${s.xl}`}>
          O que vai
          <br />
          aprender
        </h2>
        <div className={s.mt3}>
          {curso.resultados.map((r, i) => (
            <div key={i} className={s.linhaLista}>
              <span className={s.idx}>[{n2(i + 1)}]</span>
              <div>
                <p className={s.sm}>{r.texto}</p>
                <Fontes ids={r.fontes} />
              </div>
              <span />
            </div>
          ))}
        </div>
        <h2 className={`${s.disp} ${s.lg} ${s.mt4}`}>Programa</h2>
        <div className={s.mt2}>
          {curso.modulos.map((m, mi) => (
            <Fragment key={mi}>
              {m.aulas.map((a, ai) => (
                <div key={ai} className={s.linhaLista}>
                  <span className={s.idx}>
                    {mi + 1}.{ai + 1}
                  </span>
                  <div>
                    {ai === 0 && <p className={s.lab}>{m.titulo}</p>}
                    <p className={s.corpo} style={{ fontWeight: 600 }}>
                      {a.titulo}
                    </p>
                  </div>
                  <span className={`${s.idx} ${s.tnum}`}>{a.minutos} min</span>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </section>

      {/* 4. Módulos e aulas */}
      {curso.modulos.map((m, mi) => (
        <Fragment key={mi}>
          <section className={`${s.cheia} ${mi % 2 ? s.preta : s.azul}`} aria-label={`Módulo ${mi + 1}`}>
            <div className={s.topo}>
              <span className={s.lab}>Módulo</span>
              <span className={s.lab}>
                {m.aulas.length} aulas · {m.aulas.reduce((a, x) => a + x.minutos, 0)} min
              </span>
            </div>
            <p className={`${s.disp} ${s.mt4}`} style={{ fontSize: '150pt', lineHeight: 0.8 }}>
              {n2(mi + 1)}
            </p>
            <h2 className={`${s.disp} ${s.xl} ${s.mt3}`} style={{ maxWidth: '160mm' }}>
              {m.titulo}
            </h2>
            <p className={`${s.corpo} ${s.mt3}`} style={{ maxWidth: '130mm', fontSize: '11pt' }}>
              {m.resumo}
            </p>
            <div className={s.cresce} />
            <div style={{ marginBottom: '10mm' }}>
              {m.aulas.map((a, ai) => (
                <div key={ai} className={s.meta} style={{ gridTemplateColumns: '12mm 1fr auto', display: 'grid', padding: '2.6mm 0' }}>
                  <span className={s.lab}>
                    {mi + 1}.{ai + 1}
                  </span>
                  <span className={s.sm} style={{ fontWeight: 500 }}>
                    {a.titulo}
                  </span>
                  <span className={s.lab}>{a.minutos} min</span>
                </div>
              ))}
            </div>
            <Barra esquerda="AGORAMOZ Academia" direita={curso.titulo} />
          </section>
          <section className={s.fluxo} aria-label={`Aulas do módulo ${mi + 1}`}>
            {m.aulas.map((a, ai) => (
              <article key={ai} className={s.secao}>
                <Cabecalho curso={curso} seccao={`Módulo ${n2(mi + 1)} — ${m.titulo}`} />
                <p className={s.kicker}>
                  <span className={s.lab} style={{ color: 'var(--azul)' }}>
                    Aula {mi + 1}.{ai + 1}
                  </span>
                  <span className={s.lab}>{a.minutos} min</span>
                </p>
                <h3 className={`${s.disp} ${s.lg} ${s.mt1}`}>{a.titulo}</h3>
                <div className={s.objectivo}>
                  <p className={s.lab}>Objectivo</p>
                  <p className={s.corpo}>{a.objectivo}</p>
                </div>
                {a.blocos.map((b, bi) => (
                  <BlocoDoc key={bi} b={b} />
                ))}
                {a.perguntas.length > 0 && (
                  <div className={s.perguntas}>
                    <p className={s.lab}>Verifique o que aprendeu · respostas no fim</p>
                    {a.perguntas.map((p, pi) => (
                      <div key={pi} className={s.pergunta}>
                        <p className={s.corpo} style={{ fontWeight: 600 }}>
                          {pi + 1}. {p.enunciado}
                        </p>
                        <ol className={s.opcoes}>
                          {p.opcoes.map((o, oi) => (
                            <li key={oi} className={s.corpo}>
                              <span className={s.idx}>{LETRAS[oi]}</span>
                              <span>{o}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
                {a.exercicio && <ExercicioDoc e={a.exercicio} rotulo={`Aula ${mi + 1}.${ai + 1} · solução no fim`} />}
              </article>
            ))}
          </section>
        </Fragment>
      ))}

      {/* 5. Respostas e fontes */}
      <section className={s.fluxo} aria-label="Respostas e fontes">
        <Cabecalho curso={curso} seccao="Respostas e fontes" />
        <h2 className={`${s.disp} ${s.xl}`}>Respostas</h2>
        <div className={s.mt3}>
          {curso.modulos.flatMap((m, mi) =>
            m.aulas.flatMap((a, ai) =>
              a.perguntas.map((p, pi) => (
                <div key={`${mi}.${ai}.${pi}`} className={s.linhaLista}>
                  <span className={s.idx}>
                    {mi + 1}.{ai + 1} · {pi + 1}
                  </span>
                  <div>
                    <p className={s.corpo}>
                      <strong>{LETRAS[p.correcta]}</strong> — {p.opcoes[p.correcta]}
                    </p>
                    <p className={s.pequeno}>{p.justificacao}</p>
                    <Fontes ids={p.fontes} />
                  </div>
                  <span />
                </div>
              )),
            ),
          )}
        </div>
        {curso.modulos.some((m) => m.aulas.some((a) => a.exercicio)) && (
          <>
            <h2 className={`${s.disp} ${s.lg} ${s.mt4}`}>Soluções da prática</h2>
            <div className={s.mt2}>
              {curso.modulos.flatMap((m, mi) =>
                m.aulas.flatMap((a, ai) =>
                  a.exercicio
                    ? [
                        <div key={`e${mi}.${ai}`} className={s.linhaLista}>
                          <span className={s.idx}>
                            {mi + 1}.{ai + 1}
                          </span>
                          <div>
                            <p className={s.corpo} style={{ fontWeight: 600 }}>
                              {a.exercicio.titulo}
                            </p>
                            {a.exercicio.contas?.length ? (
                              <p className={`${s.pequeno} ${s.tnum}`}>Contas: {a.exercicio.contas.join(' · ')}</p>
                            ) : null}
                            <p className={s.pequeno}>{a.exercicio.solucao}</p>
                          </div>
                          <span />
                        </div>,
                      ]
                    : [],
                ),
              )}
            </div>
          </>
        )}
        <h2 className={`${s.disp} ${s.lg} ${s.mt4}`}>Fontes</h2>
        <p className={`${s.pequeno} ${s.mt1}`}>
          Cada etiqueta do curso (por exemplo F1.3) aponta para uma passagem: F1 é a fonte, 3 é a passagem, pela ordem do documento
          original.
        </p>
        <div className={s.mt2}>
          {curso.fontes.map((f) => (
            <div key={f.id} className={s.linhaLista}>
              <span className={s.tag} style={{ justifySelf: 'start' }}>
                {f.id}
              </span>
              <div>
                <p className={s.corpo}>
                  {f.autor ? `${f.autor} — ` : ''}
                  {f.titulo}
                  {f.data ? ` (${f.data})` : ''}
                </p>
                {f.url && <p className={`${s.pequeno} ${s.ligacao}`}>{f.url}</p>}
                {f.lingua === 'en' && <p className={s.pequeno}>Original em inglês; passagens traduzidas pela AGORAMOZ.</p>}
                {f.origem && <p className={s.pequeno}>{ROTULO_ORIGEM[f.origem]}</p>}
              </div>
              <span className={s.idx}>{f.tipo.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Verificação */}
      <section className={`${s.cheia} ${s.preta}`} aria-label="Relatório de verificação">
        <div className={s.topo}>
          <span className={s.lab}>Relatório de verificação</span>
          <span className={s.lab}>Emitido em {data}</span>
        </div>
        <h2 className={`${s.disp} ${s.xl} ${s.mt4}`}>
          Como este curso
          <br />
          foi verificado
        </h2>
        <div className={`${s.grelha2} ${s.mt4}`}>
          {[
            [inteiro(v.aceites), 'afirmações aceites'],
            [inteiro(v.retirados), 'afirmações retiradas por falta de apoio nas fontes'],
          ].map(([x, k]) => (
            <div key={k} className={s.stat} style={{ borderTopColor: '#fff' }}>
              <span className={s.numero}>{x}</span>
              <span className={s.pequeno}>{k}</span>
            </div>
          ))}
        </div>
        <div className={`${s.barras} ${s.mt3}`}>
          <div className={s.barraLinha}>
            <span className={s.pequeno}>Aceites</span>
            <span className={s.trilho}>
              <span className={s.enchimento} style={{ width: `${pctAceite}%` }} />
            </span>
            <span className={`${s.pequeno} ${s.tnum}`} style={{ textAlign: 'right' }}>
              {pctAceite}%
            </span>
          </div>
        </div>
        <div className={`${s.mt4}`} style={{ display: 'grid', gap: '2.4mm', maxWidth: '170mm' }}>
          {[
            'As passagens citadas existem e foram dadas àquela aula.',
            'Uma citação aparece, palavra a palavra, na passagem.',
            'Cada número escrito está nas passagens citadas.',
            'As palavras-chave de cada afirmação estão nas passagens citadas.',
          ].map((t, i) => (
            <p key={i} className={s.corpo}>
              <span className={s.tag} style={{ borderColor: 'var(--lavanda)', color: 'var(--lavanda)', marginRight: '3mm' }}>
                {n2(i + 1)}
              </span>
              {t}
            </p>
          ))}
        </div>
        <p className={`${s.pequeno} ${s.mt3}`} style={{ maxWidth: '170mm' }}>
          {v.tentativas} pedido(s) ao motor, com o ciclo de correcção: o que falhou foi devolvido com a razão e reescrito; o que nunca
          passou foi retirado. A verificação prova que o curso vem das fontes — a exactidão das fontes é de quem as escolheu.
        </p>
        {temFonteIA(curso.fontes) && (
          <p className={`${s.corpo} ${s.mt2}`} style={{ maxWidth: '170mm' }}>
            {AVISO_FONTE_IA}
          </p>
        )}
        {v.notas.length > 0 && (
          <ul className={`${s.mt2}`} style={{ listStyle: 'none', display: 'grid', gap: '1mm', maxWidth: '170mm' }}>
            {v.notas.slice(0, 8).map((n, i) => (
              <li key={i} className={s.pequeno}>
                — {n}
              </li>
            ))}
          </ul>
        )}
        <div className={s.cresce} />
        <Barra esquerda="AGORAMOZ Academia" direita={curso.titulo} />
      </section>

      {/* 7. Contracapa */}
      <section className={`${s.cheia} ${s.azul}`} aria-label="Contracapa">
        <div className={s.formas} aria-hidden="true" style={{ top: '-50mm', right: '-55mm' }}>
          <span style={{ inset: 0, background: 'rgba(255,255,255,.10)' }} />
          <span style={{ left: '30mm', top: '30mm', width: '90mm', height: '90mm', background: 'var(--lavanda)' }} />
        </div>
        <span className={s.marca}>AGORAMOZ ACADEMIA</span>
        <p className={`${s.disp} ${s.xl} ${s.mt4}`} style={{ maxWidth: '98mm', position: 'relative' }}>
          Aprender com o que as fontes dizem.
        </p>
        <div className={s.cresce} />
        <div className={`${s.grelha4}`} style={{ gridTemplateColumns: '1.3fr 1fr 1fr', marginBottom: '10mm', position: 'relative' }}>
          {[
            ['Email', 'comercial@agoramoz.com'],
            ['Telefone', '+258 82 478 0097'],
            ['Local', 'Maputo, Moçambique'],
          ].map(([k, x]) => (
            <div key={k} className={s.meta}>
              <span className={s.lab}>{k}</span>
              <span className={s.sm} style={{ fontWeight: 500 }}>
                {x}
              </span>
            </div>
          ))}
        </div>
        <Barra esquerda="agoramoz.com/cursos" direita={curso.titulo} />
      </section>
    </div>
  );
}
