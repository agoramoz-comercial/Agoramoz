import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mapaLeque, contextoDoItem } from './aeos-mapa';
import { AGENTES, TIPOS_ACCAO, estadoInicial, podeDecidir, precisaAprovacao, propostasValidas } from './agentes';
import { lerRespostaAgente, perguntarAoKimi } from './agentes-ia';

const JSON_AGENTES = JSON.parse(readFileSync('.claude/skills/zabataina-3000/data/agents.json', 'utf-8')).agents as {
  agent_id: string;
  role: string;
  modules: string[];
  prohibited_actions: string[];
}[];
const MIG = readFileSync('supabase/migrations/0024_agentes_accoes.sql', 'utf-8');
const APLICAR = readFileSync('supabase/aplicar-0024.sql', 'utf-8');
const FIM = '-- ===== fim do cabeçalho: daqui para baixo é a migração 0024, sem alterações =====\n';
const TODAS = { inqueritos: true, news: true, energia: true, direcao: true, admin: true };

describe('agentes ZABATAINA', () => {
  it('são os 24 contratos do documento, copiados sem alteração', () => {
    expect(AGENTES).toHaveLength(24);
    for (const [i, a] of JSON_AGENTES.entries()) {
      expect(AGENTES[i]!.id).toBe(a.agent_id);
      expect(AGENTES[i]!.papel).toBe(a.role);
      expect(AGENTES[i]!.modulos).toEqual(a.modules);
      expect(AGENTES[i]!.proibidas).toEqual(a.prohibited_actions);
    }
  });

  it('só tarefas e rascunhos internos dispensam aprovação', () => {
    const livres = TIPOS_ACCAO.filter((t) => !precisaAprovacao(t));
    expect(livres).toEqual(['tarefa_interna', 'rascunho_interno']);
    expect(estadoInicial('publicacao')).toBe('precisa_aprovacao');
    expect(estadoInicial('accao_financeira')).toBe('precisa_aprovacao');
  });

  it('comercial e colaborador não decidem; só admin', () => {
    expect(podeDecidir('admin')).toBe(true);
    expect(podeDecidir('comercial')).toBe(false);
    expect(podeDecidir('colaborador')).toBe(false);
    expect(podeDecidir(undefined)).toBe(false);
  });

  it('propostas do modelo: tipo desconhecido é retirado e há no máximo 3', () => {
    const r = propostasValidas([
      { tipo: 'executar_pagamento', titulo: 'Pagar fornecedor' },
      ...Array.from({ length: 4 }, (_, i) => ({ tipo: 'tarefa_interna', titulo: `Tarefa ${i}` })),
    ]);
    expect(r.propostas).toHaveLength(3);
    expect(r.retiradas).toBe(2);
  });

  it('a resposta tem de ser JSON no formato; o modelo não escolhe o estado', () => {
    expect(lerRespostaAgente('olá').ok).toBe(false);
    const r = lerRespostaAgente(
      '{"resposta":"ok","propostas":[{"tipo":"publicacao","titulo":"Publicar","estado":"aprovada"}]}',
    );
    expect(r.ok && r.propostas[0]).toEqual({ tipo: 'publicacao', titulo: 'Publicar', descricao: '' });
  });

  it('sem saldo no Kimi, diz saldo e não repete', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { type: 'exceeded_current_quota_error' } }), { status: 429 }));
    const r = await perguntarAoKimi(
      { chave: 'k'.repeat(30), modelo: 'm', baseUrl: 'https://api.moonshot.ai/v1', fetch: f as unknown as typeof fetch, dormir: async () => {} },
      AGENTES[0]!,
      '{}',
      'Qual o estado?',
    );
    expect(r.ok).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('mapa em leque', () => {
  it('sem acções registadas, os números dos agentes ficam em «—» (null), não em zero', () => {
    const m = mapaLeque(TODAS, null);
    const ag = m.categorias.find((c) => c.id === 'agentes')!;
    expect(ag.itens).toHaveLength(24);
    expect(ag.itens[0]!.estado).toBeNull();
    expect(ag.itens[0]!.kpis[3].valor).toBeNull();
    const fases = m.categorias.find((c) => c.id === 'fases')!;
    expect(fases.itens.every((i) => i.kpis.every((k) => k.valor === null))).toBe(true);
  });

  it('o contexto do modelo é só o item pedido', () => {
    const m = mapaLeque(TODAS, []);
    expect(contextoDoItem(m, 'bloco-2')).toContain('Growth, Marketing e Receita');
    expect(contextoDoItem(m, 'inexistente')).toBeNull();
  });
});

describe('0024 — agentes', () => {
  it('o ficheiro de aplicar é a migração palavra por palavra', () => {
    expect(APLICAR.slice(APLICAR.indexOf(FIM) + FIM.length)).toBe(MIG);
  });
  it('decidir é só de admin; propor classifica pelo tipo; repetível', () => {
    const decidir = MIG.slice(MIG.indexOf('function public.decidir_accao_agente('));
    expect(decidir).toContain("exigir_papel(array['admin']::public.user_role[])");
    expect(MIG).toContain("when p_tipo in ('tarefa_interna', 'rascunho_interno') then 'registada' else 'precisa_aprovacao'");
    expect(MIG).toMatch(/create table if not exists public\.agentes_accoes/);
    expect(MIG).not.toMatch(/grant (insert|update|delete)/);
  });
});

describe('agentes CODEFORGE e WIE-X', async () => {
  const { AGENTES_CF, AGENTES_WX, TODOS_AGENTES, ID_AGENTE, guardaPropostas, agentePorId } = await import('./agentes');
  const { mensagensAgente } = await import('./agentes-ia');
  const CF = JSON.parse(readFileSync('.claude/skills/codeforge-3000/data/agents.json', 'utf-8')).agents as {
    id: string;
    role: string;
    primary_responsibility: string;
  }[];

  it('os 20 CODEFORGE são cópia fiel do registo da skill (§15.5)', () => {
    expect(AGENTES_CF).toHaveLength(20);
    CF.forEach((a, i) => {
      expect(AGENTES_CF[i]!.id).toBe(a.id);
      expect(AGENTES_CF[i]!.papel).toBe(a.role);
      expect(AGENTES_CF[i]!.objectivo).toBe(a.primary_responsibility);
    });
  });

  it('os 12 WIE-X têm o texto do Módulo 08, palavra por palavra', () => {
    const doc = readFileSync('.claude/skills/wie-x/WIE-X-v4.0-MASTER.md', 'utf-8');
    expect(AGENTES_WX).toHaveLength(12);
    for (const a of AGENTES_WX) {
      expect(doc).toContain(`**${a.papel.toUpperCase()}**`);
      expect(doc).toContain(a.objectivo);
    }
  });

  it('as proibições CODEFORGE vêm da §3 do documento', () => {
    const doc = readFileSync('.claude/skills/codeforge-3000/CODEFORGE-MASTER-v1.0.md', 'utf-8');
    for (const p of AGENTES_CF[0]!.proibidas) expect(doc).toContain(p);
  });

  it('ids únicos e válidos; só os ZABATAINA guardam propostas (CHECK da 0024)', () => {
    expect(new Set(TODOS_AGENTES.map((a) => a.id)).size).toBe(TODOS_AGENTES.length);
    for (const a of TODOS_AGENTES) expect(ID_AGENTE.test(a.id)).toBe(true);
    expect(guardaPropostas(agentePorId('AG-01')!)).toBe(true);
    expect(guardaPropostas(agentePorId('CF01')!)).toBe(false);
    expect(guardaPropostas(agentePorId('WX01')!)).toBe(false);
  });

  it('o pedido leva a regra de cada sistema', () => {
    const wx = mensagensAgente(agentePorId('WX03')!, 'c', 'p')[0]!.content;
    expect(wx).toContain('WIE-X v4.0');
    expect(wx).toContain('L0–L4');
    const cf = mensagensAgente(agentePorId('CF17')!, 'c', 'p')[0]!.content;
    expect(cf).toContain('CODEFORGE');
    expect(cf).toMatch(/gerado, implementado, testado e verificado/);
  });
});
