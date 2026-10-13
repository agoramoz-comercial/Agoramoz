import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAZENDA_001 as P } from '@/content/projetos/fazenda-inteligente-001';

/**
 * Guarda do critério «nenhuma máquina lenta»: os activos 3D gerados pelo
 * pipeline Blender (.qa/blender/gerar.sh) não podem crescer sem se dar por
 * isso, nem trazer compressões que precisem de WebAssembly (a CSP não deixa).
 */

const PASTA = join(process.cwd(), 'public/terrabuild');
const KB = 1024;

type Gltf = { nodes: { name?: string }[]; materials: { name?: string }[]; extensionsUsed?: string[] };

function gltf(ficheiro: string): Gltf {
  const b = readFileSync(join(PASTA, ficheiro));
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const tamanho = b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8', 20, 20 + tamanho)) as Gltf;
}

function ficheiros(pasta: string): string[] {
  return readdirSync(pasta).flatMap((n) => {
    const c = join(pasta, n);
    return statSync(c).isDirectory() ? ficheiros(c) : [c];
  });
}

describe('activos 3D do TerraBuild', () => {
  it('o nível Normal descarrega no máximo 900 KB, tudo junto', () => {
    const total = ficheiros(PASTA).reduce((s, f) => s + statSync(f).size, 0);
    expect(total).toBeLessThanOrEqual(900 * KB);
  });

  it('cada ficheiro fica dentro do seu tecto', () => {
    expect(statSync(join(PASTA, 'fazenda-001.glb')).size).toBeLessThanOrEqual(450 * KB);
    expect(statSync(join(PASTA, 'instancias.glb')).size).toBeLessThanOrEqual(60 * KB);
    for (const f of ficheiros(join(PASTA, 'tex'))) {
      expect(f).toMatch(/\.webp$/);
      expect(statSync(f).size).toBeLessThanOrEqual(64 * KB);
    }
  });

  it('não usa compressões que precisem de WebAssembly', () => {
    for (const f of ['fazenda-001.glb', 'instancias.glb']) {
      const usadas = gltf(f).extensionsUsed ?? [];
      expect(usadas).not.toContain('KHR_draco_mesh_compression');
      expect(usadas).not.toContain('EXT_meshopt_compression');
      expect(usadas).not.toContain('KHR_texture_basisu');
    }
  });

  it('tem um nó por construção do projecto, com o mesmo id (a casa principal é paramétrica)', () => {
    const nos = new Set(gltf('fazenda-001.glb').nodes.map((n) => n.name));
    const construcoes = P.elementos.filter((e) => ['caixa', 'cilindro', 'painel'].includes(e.forma.tipo) && e.id !== 'casa-principal');
    expect(construcoes.length).toBeGreaterThan(5);
    for (const e of construcoes) expect(nos, e.id).toContain(`el-${e.id}`);
  });

  it('traz os materiais que a casa paramétrica reutiliza, pelo nome', () => {
    const mats = new Set(gltf('fazenda-001.glb').materials.map((m) => m.name));
    for (const m of ['reboco', 'zinco', 'telha', 'betao', 'vidro', 'madeira']) expect(mats).toContain(m);
  });

  it('traz a vegetação e os adereços instanciados', () => {
    const nos = new Set(gltf('instancias.glb').nodes.map((n) => n.name));
    for (const n of ['veg-milho', 'veg-feijao', 'veg-horticolas', 'veg-bananeira', 'veg-arvore', 'adr-poste', 'adr-estaca']) {
      expect(nos).toContain(n);
    }
  });
});
