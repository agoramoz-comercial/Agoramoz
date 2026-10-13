"""Modelos 3D do TerraBuild (demo), construídos em Blender sem interface.

Cada construção é feita com as MEDIDAS do elemento em `cena.json` (as mesmas
da planta 2D e das interferências), com a origem no centro da base, ao nível
do terreno, e um soco de betão de 1 m enterrado para assentar em declive.
O site coloca, roda e corta (em obra) cada nó `el-<id>`; aqui só se dá forma.

Orçamento: poucos triângulos e materiais partilhados por nome (o site reutiliza
`reboco`, `zinco`, `telha`… na casa paramétrica). A oclusão junto ao chão vai
cozida em cor de vértice: realismo sem custo nenhum no browser.

Uso:  python modelos.py <cena.json> <pasta-tex> <pasta-saida>
Escreve fazenda-001.glb (nós el-*) e instancias.glb (veg-*, adr-*).
Escrito e testado contra o `bpy` 5.0.1 (PyPI), em headless.
"""

import json
import math
import random
import sys
from pathlib import Path

import bpy  # tem de vir antes do bmesh: é o bpy que o regista no módulo
import bmesh
import numpy as np
from mathutils import Matrix, Vector

# Metros por repetição da textura (mapeamento por projecção em caixa).
ESCALA_UV = {'reboco': 3.0, 'zinco': 2.0, 'telha': 2.4, 'betao': 2.0, 'solar': 2.0}

# nome: (cor sRGB, rugosidade, metálico, textura, normal, alfa, dupla face)
MATERIAIS = {
    'reboco': ((1, 1, 1), 0.9, 0.0, 'reboco', None, 1.0, False),
    'zinco': ((1, 1, 1), 0.5, 0.35, 'zinco', 'zinco-normal', 1.0, False),
    'telha': ((1, 1, 1), 0.75, 0.0, 'telha', None, 1.0, False),
    'betao': ((1, 1, 1), 0.9, 0.0, 'betao', None, 1.0, False),
    'solar': ((1, 1, 1), 0.3, 0.0, 'solar', None, 1.0, False),
    'vidro': ((0.10, 0.13, 0.16), 0.08, 0.0, None, None, 1.0, False),
    'madeira': ((0.45, 0.30, 0.18), 0.7, 0.0, None, None, 1.0, False),
    'metal': ((0.62, 0.63, 0.65), 0.4, 0.8, None, None, 1.0, False),
    'metal-escuro': ((0.20, 0.21, 0.23), 0.5, 0.6, None, None, 1.0, False),
    'branco': ((0.88, 0.88, 0.86), 0.6, 0.0, None, None, 1.0, False),
    'pintura': ((0.72, 0.13, 0.10), 0.5, 0.0, None, None, 1.0, False),
    'filme': ((0.88, 0.93, 0.93), 0.25, 0.0, None, None, 0.4, True),
    'rede': ((0.10, 0.16, 0.10), 0.9, 0.0, None, None, 0.7, True),
    'rede-arame': ((0.72, 0.72, 0.70), 0.5, 0.5, None, None, 0.35, True),
    'agua': ((0.10, 0.20, 0.21), 0.04, 0.0, None, None, 1.0, False),
    'composto': ((0.27, 0.18, 0.11), 1.0, 0.0, None, None, 1.0, False),
    'folha': ((0.20, 0.36, 0.13), 0.7, 0.0, None, None, 1.0, True),
    'folha-clara': ((0.45, 0.58, 0.28), 0.6, 0.0, None, None, 1.0, True),
    'folha-milho': ((0.40, 0.50, 0.20), 0.7, 0.0, None, None, 1.0, True),
    'folha-arvore': ((0.17, 0.30, 0.12), 0.8, 0.0, None, None, 1.0, False),
    'tronco': ((0.33, 0.24, 0.16), 0.9, 0.0, None, None, 1.0, False),
}


def linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def criar_materiais(tex):
    for nome, (cor, rug, met, img, nrm, alfa, dupla) in MATERIAIS.items():
        if nome in bpy.data.materials:
            continue
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b is None:
            b = nt.nodes.new('ShaderNodeBsdfPrincipled')
            saida = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None) or nt.nodes.new('ShaderNodeOutputMaterial')
            nt.links.new(b.outputs['BSDF'], saida.inputs['Surface'])
        b.inputs['Base Color'].default_value = (*linear(cor), 1.0)
        b.inputs['Roughness'].default_value = rug
        b.inputs['Metallic'].default_value = met
        if img:
            t = nt.nodes.new('ShaderNodeTexImage')
            t.image = bpy.data.images.load(str(tex / f'{img}.webp'), check_existing=True)
            nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if nrm:
            t = nt.nodes.new('ShaderNodeTexImage')
            t.image = bpy.data.images.load(str(tex / f'{nrm}.webp'), check_existing=True)
            t.image.colorspace_settings.name = 'Non-Color'
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(t.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
        if alfa < 1:
            b.inputs['Alpha'].default_value = alfa
            if hasattr(m, 'surface_render_method'):
                m.surface_render_method = 'BLENDED'
        m.use_backface_culling = not dupla


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Modelo:
    """Uma malha construída por primitivas, com UV por projecção e materiais por nome."""

    def __init__(self, nome):
        self.nome = nome
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.mats = []

    def _mat(self, nome):
        if nome not in self.mats:
            self.mats.append(nome)
        return self.mats.index(nome)

    @staticmethod
    def _faces(verts):
        return list({f for v in verts for f in v.link_faces})

    def acabar(self, faces, mat, modo='caixa', centro=(0, 0), raio=1.0, liso=False):
        idx, s = self._mat(mat), ESCALA_UV.get(mat, 1.0)
        for f in faces:
            f.material_index = idx
            f.normal_update()
            f.smooth = liso
            n = f.normal
            if modo == 'cilindro' and abs(n.z) < 0.7:
                angs = [math.atan2(l.vert.co.y - centro[1], l.vert.co.x - centro[0]) for l in f.loops]
                if max(angs) - min(angs) > math.pi:
                    angs = [a + 2 * math.pi if a < 0 else a for a in angs]
                for l, a in zip(f.loops, angs):
                    l[self.uv].uv = (a * raio / s, l.vert.co.z / s)
                continue
            ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
            for l in f.loops:
                c = l.vert.co
                uv = (c.x, c.y) if az >= ax and az >= ay else (c.y, c.z) if ax >= ay else (c.x, c.z)
                l[self.uv].uv = (uv[0] / s, uv[1] / s)
        return faces

    def caixa(self, c, t, mat, rz=0.0, rx=0.0, sem=()):
        """Caixa centrada em c, tamanho t; `sem` retira faces ('cima', 'baixo')."""
        m = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Diagonal((*t, 1))
        faces = self._faces(bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)['verts'])
        fora = []
        for f in faces:
            f.normal_update()
            if ('cima' in sem and f.normal.z > 0.9) or ('baixo' in sem and f.normal.z < -0.9):
                fora.append(f)
        if fora:
            faces = [f for f in faces if f not in fora]
            bmesh.ops.delete(self.bm, geom=fora, context='FACES_ONLY')
        return self.acabar(faces, mat)

    def cilindro(self, c, r, h, mat, seg=12, tampas=True, r2=None, liso=True, inverter=False):
        m = Matrix.Translation((c[0], c[1], c[2] + h / 2))
        res = bmesh.ops.create_cone(
            self.bm, cap_ends=tampas, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=m
        )
        faces = self._faces(res['verts'])
        if inverter:
            bmesh.ops.reverse_faces(self.bm, faces=faces)
        for f in faces:
            f.normal_update()
        lados = [f for f in faces if abs(f.normal.z) < 0.7]
        topos = [f for f in faces if abs(f.normal.z) >= 0.7]
        self.acabar(lados, mat, 'cilindro', c[:2], r, liso)
        self.acabar(topos, mat)
        for f in topos:
            for e in f.edges:
                e.smooth = False
        return faces

    def esfera(self, c, r, mat, escala=(1, 1, 1), jitter=0.0, rng=None, liso=True):
        m = Matrix.Translation(c) @ Matrix.Diagonal((*escala, 1))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=2, radius=r, matrix=m)
        if jitter and rng:
            centro = Vector(c)
            for v in res['verts']:
                v.co += (v.co - centro) * rng.uniform(-jitter, jitter)
        return self.acabar(self._faces(res['verts']), mat, liso=liso)

    def face(self, pts, mat):
        f = self.bm.faces.new([self.bm.verts.new(p) for p in pts])
        return self.acabar([f], mat)

    def disco(self, c, r, seg, mat):
        res = bmesh.ops.create_circle(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius=r, matrix=Matrix.Translation(c))
        return self.acabar(self._faces(res['verts']), mat)

    def anel(self, c, r0, r1, z, seg, mat):
        def roda(r):
            return [self.bm.verts.new((c[0] + r * math.cos(2 * math.pi * k / seg), c[1] + r * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)]

        dentro, fora = roda(r0), roda(r1)
        faces = [self.bm.faces.new([dentro[k], fora[k], fora[(k + 1) % seg], dentro[(k + 1) % seg]]) for k in range(seg)]
        return self.acabar(faces, mat)

    def extrudir(self, perfil, x0, x1, mat, liso=False):
        """Perfil (y, z) puxado ao longo de X."""
        a = [self.bm.verts.new((x0, y, z)) for y, z in perfil]
        b = [self.bm.verts.new((x1, y, z)) for y, z in perfil]
        faces = [self.bm.faces.new([a[j], b[j], b[j + 1], a[j + 1]]) for j in range(len(perfil) - 1)]
        return self.acabar(faces, mat, liso=liso)

    def tira(self, secoes, mat):
        """Faixa por secções de 1 ou 2 pontos (folhas): triângulo nas pontas."""
        vs = [[self.bm.verts.new(p) for p in s] for s in secoes]
        faces = []
        for a, b in zip(vs, vs[1:]):
            if len(a) == 1:
                faces.append(self.bm.faces.new([a[0], b[0], b[1]]))
            elif len(b) == 1:
                faces.append(self.bm.faces.new([a[0], b[0], a[1]]))
            else:
                faces.append(self.bm.faces.new([a[0], b[0], b[1], a[1]]))
        return self.acabar(faces, mat)

    def objeto(self, ao=(0.6, 0.9)):
        """Passa para malha; cor de vértice = oclusão aproximada pela altura ao chão."""
        me = bpy.data.meshes.new(self.nome)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for n in self.mats:
            me.materials.append(bpy.data.materials[n])
        co = np.empty(len(me.vertices) * 3, dtype=np.float32)
        me.vertices.foreach_get('co', co)
        base, altura = ao
        v = base + (1 - base) * suave(0.0, altura, co[2::3])
        cor = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        cor.data.foreach_set('color', np.stack([v, v, v, np.ones_like(v)], 1).astype(np.float32).ravel())
        me.color_attributes.active_color = cor
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        ob = bpy.data.objects.new(self.nome, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


# ── Peças de construção ────────────────────────────────────────────────────


def soco(m, w, d, alt, folga=0.05):
    """1 m enterrado + rodapé de betão até `alt`: assenta em terreno inclinado."""
    m.caixa((0, 0, -0.5), (w + 2 * folga, d + 2 * folga, 1.0), 'betao', sem=('baixo',))
    m.caixa((0, 0, alt / 2), (w + 2 * folga, d + 2 * folga, alt), 'betao', sem=('baixo',))


def paredes(m, w, d, z0, h, mat):
    m.caixa((0, 0, z0 + (h - z0) / 2), (w, d, h - z0), mat, sem=('baixo',))


def telhado(m, w, d, h, inc, mat, empena, beiral=0.5, esp=0.08):
    """Duas águas com a cumeeira ao longo de X, como no site. Devolve a cota da cumeeira."""
    a = math.radians(inc)
    meia = d / 2 + beiral
    topo = h + (d / 2) * math.tan(a)
    for s in (1, -1):
        zc = topo - (meia / 2) * math.tan(a) + esp / 2 / math.cos(a)
        m.caixa((0, s * meia / 2, zc), (w + 2 * beiral, meia / math.cos(a), esp), mat, rx=-s * a)
    for sx in (1, -1):
        pts = [(sx * w / 2, -d / 2, h), (sx * w / 2, d / 2, h), (sx * w / 2, 0, topo)]
        m.face(pts if sx > 0 else pts[::-1], empena)
    m.caixa((0, 0, topo + esp), (w + 2 * beiral, 0.35, 0.1), 'metal')
    return topo


def abertura(m, w, d, lado, pos, z0, larg, alt, mat, moldura='branco', sai=0.03, x0=0.0):
    """Porta ou janela saliente numa parede: S/N em y=∓d/2, E/O em x=x0±w/2."""
    if lado in 'SN':
        s = -1 if lado == 'S' else 1
        y = s * d / 2
        if moldura:
            m.caixa((x0 + pos, y + s * 0.01, z0 + alt / 2), (larg + 0.12, 0.04, alt + 0.12), moldura)
        m.caixa((x0 + pos, y + s * sai, z0 + alt / 2), (larg, 0.06, alt), mat)
    else:
        s = 1 if lado == 'E' else -1
        x = x0 + s * w / 2
        if moldura:
            m.caixa((x + s * 0.01, pos, z0 + alt / 2), (0.04, larg + 0.12, alt + 0.12), moldura)
        m.caixa((x + s * sai, pos, z0 + alt / 2), (0.06, larg, alt), mat)


# ── Elementos (medidas de cena.json) ───────────────────────────────────────


def posto(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    soco(m, w, d, 0.3)
    paredes(m, w, d, 0.3, h, 'reboco')
    m.caixa((0, 0, h + 0.12), (w + 0.8, d + 0.8, 0.24), 'betao')
    abertura(m, w, d, 'S', 0.6, 1.1, 3.4, 1.2, 'vidro')
    abertura(m, w, d, 'O', 0.0, 1.1, 3.0, 1.2, 'vidro')
    abertura(m, w, d, 'N', 0.0, 1.1, 2.0, 1.0, 'vidro')
    abertura(m, w, d, 'E', -1.0, 0.3, 0.9, 2.1, 'madeira')
    # Cancela: pilar e braço às riscas, sobre a estrada de acesso (a oeste).
    m.caixa((-w / 2 - 0.6, -d / 2 - 0.7, 0.55), (0.3, 0.3, 1.1), 'pintura')
    for k in range(7):
        m.caixa((-w / 2 - 1.25 - k, -d / 2 - 0.7, 1.0), (1.0, 0.09, 0.09), 'pintura' if k % 2 == 0 else 'branco')


def armazem(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    soco(m, w, d, 0.6)
    paredes(m, w, d, 0.6, h, 'zinco')
    a = math.radians(12)
    topo = telhado(m, w, d, h, 12, 'zinco', 'zinco', beiral=0.6)
    # Clarabóias translúcidas nas duas águas.
    meia = d / 2 + 0.6
    for s in (1, -1):
        zc = topo - (meia / 2) * math.tan(a) + 0.09 / math.cos(a)
        for x in (-7.5, 0.0, 7.5):
            m.caixa((x, s * meia / 2, zc), (1.2, meia / math.cos(a) * 0.7, 0.03), 'filme', rx=-s * a)
    for x in (-6.5, 6.5):
        abertura(m, w, d, 'S', x, 0.0, 5.0, 5.0, 'metal-escuro', moldura='metal', sai=0.09)
        m.caixa((x, -d / 2 - 0.25, 5.25), (5.6, 0.4, 0.15), 'metal')
    abertura(m, w, d, 'E', 4.0, 0.0, 1.0, 2.2, 'metal-escuro', moldura='metal', sai=0.06)
    for x in (-8.0, 0.0, 8.0):
        m.cilindro((x, 0, topo + 0.05), 0.3, 0.5, 'metal', seg=8)


def processamento(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    soco(m, w, d, 0.5)
    paredes(m, w, d, 0.5, h, 'reboco')
    telhado(m, w, d, h, 12, 'zinco', 'reboco', beiral=0.6)
    for x in (-6.0, -3.2, 3.2, 6.0):
        abertura(m, w, d, 'S', x, 2.0, 1.8, 1.2, 'vidro')
    for x in (-6.0, -2.0, 2.0, 6.0):
        abertura(m, w, d, 'N', x, 2.0, 1.8, 1.2, 'vidro')
    abertura(m, w, d, 'S', 0.0, 0.0, 3.0, 3.5, 'metal-escuro', moldura='metal', sai=0.08)
    abertura(m, w, d, 'E', 2.5, 0.5, 1.0, 2.2, 'metal-escuro', moldura='metal')
    # Alpendre de carga sobre o portão.
    m.caixa((0, -d / 2 - 1.0, 4.0), (4.6, 2.2, 0.08), 'zinco', rx=math.radians(8))
    for x in (-2.1, 2.1):
        m.caixa((x, -d / 2 - 1.9, 1.9), (0.1, 0.1, 3.8), 'metal')


def casa_trabalhadores(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    soco(m, w, d, 0.3)
    paredes(m, w, d, 0.3, h, 'reboco')
    telhado(m, w, d, h, 22, 'telha', 'reboco', beiral=0.45)
    abertura(m, w, d, 'S', -1.6, 0.3, 0.9, 2.1, 'madeira')
    m.caixa((-1.6, -d / 2 - 0.35, 0.15), (1.3, 0.6, 0.3), 'betao')
    abertura(m, w, d, 'S', 1.5, 1.2, 1.0, 1.0, 'vidro')
    for x in (-1.6, 1.6):
        abertura(m, w, d, 'N', x, 1.2, 1.0, 1.0, 'vidro')
    abertura(m, w, d, 'E', 0.0, 1.3, 0.8, 0.8, 'vidro')
    abertura(m, w, d, 'O', 0.0, 1.3, 0.8, 0.8, 'vidro')


def estufa(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    hs, w2, n = 1.6, d / 2, 12
    perfil = [(-w2, 0.1), (-w2, hs)]
    perfil += [(-w2 * math.cos(math.pi * k / n), hs + (h - hs) * math.sin(math.pi * k / n)) for k in range(1, n)]
    perfil += [(w2, hs), (w2, 0.1)]
    m.caixa((0, 0, -0.45), (w + 0.3, d + 0.3, 1.1), 'betao', sem=('baixo',))
    m.extrudir(perfil, -w / 2, w / 2, 'filme', liso=True)
    for x in (-w / 2, w / 2):
        m.face([(x, y, z) for y, z in perfil], 'filme')
    # Arcos de aço a cada 5 m, e madres na cumeeira e nos ombros.
    for x in np.linspace(-w / 2, w / 2, 11):
        for (y0, z0), (y1, z1) in zip(perfil, perfil[1:]):
            comp = math.hypot(y1 - y0, z1 - z0)
            m.caixa((x, (y0 + y1) / 2, (z0 + z1) / 2), (0.06, comp, 0.06), 'metal', rx=math.atan2(z1 - z0, y1 - y0))
    for y, z in ((0, h), (-w2, hs), (w2, hs)):
        m.caixa((0, y, z), (w, 0.06, 0.06), 'metal')
    # Canteiros com tomate em linhas (vê-se através do filme).
    comp = w - 4
    for y in (-7.5, -4.5, -1.5, 1.5, 4.5, 7.5):
        m.caixa((0, y, 0.25), (comp, 1.0, 0.3), 'composto')
        for k in range(8):
            hk = rng.uniform(0.9, 1.4)
            m.caixa((-comp / 2 + comp / 16 + k * comp / 8, y, 0.4 + hk / 2), (comp / 8 - 0.3, 0.5, hk), 'folha')


def viveiro(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    m.caixa((0, 0, -0.45), (w, d, 1.0), 'betao', sem=('baixo',))
    for x in np.linspace(-w / 2, w / 2, 5):
        for y in (-d / 2, -d / 6, d / 6, d / 2):
            m.caixa((x, y, h / 2 + 0.05), (0.08, 0.08, h), 'metal')
    m.caixa((0, 0, h / 2 + 0.05), (w + 0.05, d + 0.05, h), 'rede', sem=('baixo',))
    for y in (-3.5, 0.0, 3.5):
        m.caixa((0, y, 0.8), (16, 1.4, 0.06), 'madeira')
        m.caixa((0, y, 0.87), (15.6, 1.2, 0.08), 'folha')
        for x in (-7.6, 7.6):
            for dy in (-0.6, 0.6):
                m.caixa((x, y + dy, 0.42), (0.05, 0.05, 0.75), 'metal')


def reservatorio(m, f, rng):
    r, h = f['raio'], f['altura']
    m.cilindro((0, 0, -1), r + 0.5, 1.4, 'betao', seg=32, liso=False)
    m.cilindro((0, 0, 0.4), r, h - 0.4, 'zinco', seg=32, tampas=False)
    m.cilindro((0, 0, 0.4), r - 0.1, h - 0.4, 'zinco', seg=32, tampas=False, inverter=True)
    m.anel((0, 0), r - 0.1, r + 0.06, h, 32, 'metal')
    m.disco((0, 0, h - 0.6), r - 0.1, 32, 'agua')
    for y in (-0.25, 0.25):
        m.caixa((r + 0.25, y, (h + 0.8) / 2), (0.06, 0.06, h + 0.8), 'metal')
    for z in np.arange(0.6, h + 0.6, 0.35):
        m.caixa((r + 0.25, 0, z), (0.05, 0.5, 0.04), 'metal')
    m.cilindro((-r - 0.25, 0, 0), 0.08, h + 0.3, 'metal', seg=6)


def furo(m, f, rng):
    m.caixa((0, 0, -0.4), (3, 3, 1.0), 'betao', sem=('baixo',))
    m.cilindro((0, 0, 0.1), 0.1, 0.5, 'metal', seg=8)
    m.caixa((0, 0, 0.75), (0.35, 0.35, 0.3), 'metal-escuro')
    m.caixa((0.6, 0, 0.75), (1.0, 0.08, 0.08), 'metal')
    m.caixa((-1.0, -1.0, 1.15), (0.08, 0.08, 2.1), 'metal')
    m.caixa((-1.0, -0.85, 1.4), (0.5, 0.22, 0.65), 'metal-escuro')
    m.caixa((-1.0, -1.0, 2.3), (1.0, 0.7, 0.04), 'solar', rx=math.radians(-20))


def solar(m, f, rng):
    """Filas de mesas inclinadas 20° viradas a norte (hemisfério sul), como no site."""
    w, d, filas = f['r']['w'], f['r']['d'], f['filas']
    fila = d / filas
    prof, a, folga = fila * 0.75, math.radians(20), 0.6
    tw = (w - 3 * folga) / 4
    meio = prof / 2 * 0.8
    for i in range(filas):
        yc = d / 2 - fila * (i + 0.5)
        for k in range(4):
            xc = -w / 2 + tw / 2 + k * (tw + folga)
            m.caixa((xc, yc, 1.4), (tw, prof, 0.05), 'solar', rx=-a)
            for xp in np.linspace(xc - tw / 2 + 0.4, xc + tw / 2 - 0.4, 4):
                for s in (1, -1):
                    alt = 1.4 - s * meio * math.sin(a)
                    m.caixa((xp, yc + s * meio * math.cos(a), alt / 2), (0.07, 0.07, alt), 'metal')


def compostagem(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    m.caixa((0, 0, -0.4), (w, d, 1.0), 'betao', sem=('baixo',))
    m.caixa((0, d / 2 - 0.1, 0.1 + h / 2), (w, 0.2, h), 'betao')
    xs = np.linspace(-w / 2 + 0.1, w / 2 - 0.1, 5)
    for x in xs:
        m.caixa((x, 0, 0.1 + h / 2), (0.2, d, h), 'betao')
    for x0, x1 in zip(xs, xs[1:]):
        xb = (x0 + x1) / 2
        m.cilindro((xb, 0.8, 0.1), 1.4, 0.9, 'composto', seg=8, r2=0.25)
        m.cilindro((xb, -2.0, 0.1), 1.0, 0.6, 'composto', seg=8, r2=0.2)


def galinheiro(m, f, rng):
    w, d, h = f['r']['w'], f['r']['d'], f['altura']
    soco(m, w, d, 0.2)
    fechado = 4.0  # ninhos e poleiros, em alvenaria, a oeste
    xf = -w / 2 + fechado / 2
    m.caixa((xf, 0, 0.2 + (h - 0.2) / 2), (fechado, d, h - 0.2), 'reboco', sem=('baixo',))
    abertura(m, fechado, d, 'S', 0.0, 0.2, 0.9, 1.9, 'madeira', x0=xf)
    lc, xc = w - fechado, fechado / 2
    for y in (-d / 2 + 0.075, d / 2 - 0.075):
        m.caixa((xc, y, 0.55), (lc, 0.15, 0.7), 'reboco')
    m.caixa((w / 2 - 0.075, 0, 0.55), (0.15, d, 0.7), 'reboco')
    m.caixa((xc, 0, 0.9 + (h - 0.9) / 2), (lc, d, h - 0.9), 'rede-arame', sem=('cima', 'baixo'))
    for x in np.linspace(-w / 2 + fechado, w / 2, 4):
        for y in (-d / 2, d / 2):
            m.caixa((x, y, 0.2 + (h - 0.2) / 2), (0.1, 0.1, h - 0.2), 'madeira')
    telhado(m, w, d, h, 15, 'zinco', 'zinco', beiral=0.4)


CONSTRUTORES = {
    'posto': posto,
    'armazem': armazem,
    'processamento': processamento,
    'casa-trabalhadores-1': casa_trabalhadores,
    'casa-trabalhadores-2': casa_trabalhadores,
    'estufa': estufa,
    'viveiro': viveiro,
    'reservatorio': reservatorio,
    'furo': furo,
    'solar': solar,
    'compostagem': compostagem,
    'galinheiro': galinheiro,
}


# ── Vegetação e adereços (instanciados no site) ────────────────────────────


def folha_curva(m, base, az, comp, larg, subida, queda, mat, seg=3):
    dx, dy = math.cos(az), math.sin(az)
    px, py = -dy, dx
    secoes = []
    for i in range(seg + 1):
        t = i / seg
        x, y = base[0] + dx * comp * t, base[1] + dy * comp * t
        z = base[2] + subida * math.sin(math.pi * t * 0.6) - queda * t * t
        meia = larg * 2 * t * (1 - t)
        secoes.append([(x, y, z)] if meia < 1e-6 else [(x + px * meia, y + py * meia, z), (x - px * meia, y - py * meia, z)])
    m.tira(secoes, mat)


def milho(m, rng):
    m.cilindro((0, 0, 0), 0.025, 2.0, 'folha-milho', seg=4, tampas=False)
    for i in range(8):
        az = i * math.pi + rng.uniform(-0.5, 0.5)
        folha_curva(m, (0, 0, 0.35 + i * 0.2), az, rng.uniform(0.6, 0.85), 0.09, 0.3, 0.45, 'folha-milho')
    m.cilindro((0, 0, 2.0), 0.04, 0.25, 'folha-milho', seg=4, r2=0.0)


def feijao(m, rng):
    m.esfera((0, 0, 0.22), 0.25, 'folha', escala=(1, 1, 0.75), jitter=0.18, rng=rng)


def horticolas(m, rng):
    m.esfera((0, 0, 0.15), 0.17, 'folha-clara', escala=(1, 1, 0.85), jitter=0.1, rng=rng)
    for i in range(5):
        folha_curva(m, (0, 0, 0.05), i * 2 * math.pi / 5 + rng.uniform(-0.2, 0.2), 0.32, 0.2, 0.12, 0.1, 'folha', seg=2)


def bananeira(m, rng):
    m.cilindro((0, 0, 0), 0.14, 2.3, 'folha-milho', seg=6, r2=0.1, tampas=False)
    for i in range(8):
        az = i * 2 * math.pi / 8 + rng.uniform(-0.3, 0.3)
        folha_curva(m, (0, 0, 2.2), az, rng.uniform(1.5, 1.9), 0.5, 0.6, 1.4, 'folha', seg=4)


def arvore(m, rng):
    m.cilindro((0, 0, 0), 0.22, 3.4, 'tronco', seg=6, r2=0.12, tampas=False)
    for c, r in (((0, 0, 4.6), 1.9), ((0.9, 0.4, 4.0), 1.5), ((-0.7, -0.6, 4.2), 1.4)):
        m.esfera(c, r, 'folha-arvore', escala=(1, 1, 0.85), jitter=0.15, rng=rng)


def poste(m, rng):
    m.cilindro((0, 0, 0), 0.13, 8.0, 'madeira', seg=6, r2=0.1)
    m.caixa((0, 0, 7.6), (1.8, 0.1, 0.1), 'madeira')
    for x in (-0.75, 0.0, 0.75):
        m.cilindro((x, 0, 7.65), 0.05, 0.15, 'branco', seg=6)


def estaca(m, rng):
    m.caixa((0, 0, 0.7), (0.1, 0.1, 1.4), 'madeira')


INSTANCIAS = {
    'veg-milho': milho,
    'veg-feijao': feijao,
    'veg-horticolas': horticolas,
    'veg-bananeira': bananeira,
    'veg-arvore': arvore,
    'adr-poste': poste,
    'adr-estaca': estaca,
}


# ── Construção e exportação ────────────────────────────────────────────────


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def construir_elementos(cena):
    feitos = {}
    for e in cena['elementos']:
        fazer = CONSTRUTORES.get(e['id'])
        if fazer:
            m = Modelo(f"el-{e['id']}")
            fazer(m, e['forma'], random.Random(e['id']))
            feitos[e['id']] = m.objeto()
    return feitos


def construir_instancias():
    feitos = {}
    for nome, fazer in INSTANCIAS.items():
        m = Modelo(nome)
        fazer(m, random.Random(nome))
        feitos[nome] = m.objeto(ao=(0.55, 0.8) if nome.startswith('veg-') else (0.7, 0.6))
    return feitos


def triangulos(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def exportar(objs, caminho):
    for o in bpy.context.scene.objects:
        o.select_set(o in objs)
    pedido = dict(
        filepath=str(caminho),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_image_format='WEBP',
        export_image_quality=85,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_normals=True,
        export_texcoords=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
        export_draco_mesh_compression_enable=False,
    )
    validos = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    ignorados = sorted(set(pedido) - set(validos))
    if ignorados:
        print('aviso: opções do exportador inexistentes nesta versão:', ignorados)
    bpy.ops.export_scene.gltf(**{k: v for k, v in pedido.items() if k in validos})
    print(f'{caminho.name}: {caminho.stat().st_size / 1024:.0f} KB')


def main():
    if len(sys.argv) < 4:
        sys.exit('uso: python modelos.py <cena.json> <pasta-tex> <pasta-saida>')
    cena = json.loads(Path(sys.argv[-3]).read_text(encoding='utf-8'))
    tex, saida = Path(sys.argv[-2]).resolve(), Path(sys.argv[-1]).resolve()
    saida.mkdir(parents=True, exist_ok=True)
    print('blender', bpy.app.version_string)
    limpar()
    criar_materiais(tex)
    elementos = construir_elementos(cena)
    instancias = construir_instancias()
    for grupo in (elementos, instancias):
        for nome, ob in grupo.items():
            print(f'  {nome:22s} {triangulos(ob):6d} triângulos  {len(ob.data.materials)} materiais')
    print('total elementos:', sum(triangulos(o) for o in elementos.values()), 'triângulos')
    exportar(list(elementos.values()), saida / 'fazenda-001.glb')
    exportar(list(instancias.values()), saida / 'instancias.glb')


if __name__ == '__main__':
    main()
