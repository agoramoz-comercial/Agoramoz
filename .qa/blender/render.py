"""Renders ilustrativos (Blender Cycles) da fazenda fictícia 001, na fase final.

Constrói a fazenda inteira a partir de `cena.json` (os mesmos dados do site),
com os modelos de `modelos.py`, e grava duas vistas em WebP para o site:
uma aérea a três quartos e uma de drone sobre o pátio. São imagens
ilustrativas de dados fictícios, e o site di-lo junto de cada uma.

Uso:  python render.py <cena.json> <pasta-tex> <pasta-saida> [amostras]
Testado com bpy 5.0.1 em CPU (4 núcleos): cerca de 2 a 4 minutos por vista.
"""

import json
import math
import random
import sys
from pathlib import Path

import bpy  # antes de modelos (que importa bmesh)
import addon_utils
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).parent))
import modelos as M  # noqa: E402

EXAGERO = 2.0  # o mesmo do site, para o relevo se ler


class Terreno:
    def __init__(self, t):
        self.L, self.H, self.passo = t['largura'], t['profundidade'], t['passo']
        self.nx, self.ny = t['nx'], t['ny']
        self.h = np.array(t['alturas'], dtype=float).reshape(self.ny + 1, self.nx + 1)

    def cota(self, x, y):
        """Altura (exagerada) em coordenadas do terreno, bilinear na grelha."""
        u = min(max(x / self.passo, 0), self.nx - 1e-6)
        v = min(max(y / self.passo, 0), self.ny - 1e-6)
        i, j = int(u), int(v)
        fu, fv = u - i, v - j
        h = self.h
        a = h[j, i] * (1 - fu) + h[j, i + 1] * fu
        b = h[j + 1, i] * (1 - fu) + h[j + 1, i + 1] * fu
        return (a * (1 - fv) + b * fv) * EXAGERO

    def mundo(self, x, y, acima=0.0):
        return Vector((x - self.L / 2, y - self.H / 2, self.cota(x, y) + acima))


def material_textura(nome, tex, img, cor=(1, 1, 1), normal=None, rug=1.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Roughness'].default_value = rug
    b.inputs['Base Color'].default_value = (*M.linear(cor), 1)
    if img:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(str(tex / f'{img}.webp'), check_existing=True)
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs['B'].default_value = (*M.linear(cor), 1)
        nt.links.new(t.outputs['Color'], mix.inputs['A'])
        nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(str(tex / f'{normal}.webp'), check_existing=True)
        t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m


def objeto_malha(nome, verts, faces, mat, uv_escala, colecao):
    me = bpy.data.meshes.new(nome)
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='UVMap')
    idx = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', idx)
    v = np.array(verts, dtype=float)
    uv.data.foreach_set('uv', (v[idx][:, :2] / uv_escala).astype(np.float32).ravel())
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nome, me)
    colecao.objects.link(ob)
    return ob


def grelha_assente(T, x0, y0, x1, y1, passo, acima):
    nu = max(1, math.ceil((x1 - x0) / passo))
    nv = max(1, math.ceil((y1 - y0) / passo))
    verts = [tuple(T.mundo(x0 + (x1 - x0) * i / nu, y0 + (y1 - y0) * j / nv, acima)) for j in range(nv + 1) for i in range(nu + 1)]
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    return verts, faces


def faixa(T, pontos, largura, acima, passo=4.0):
    """Estrada assente no relevo: secções a cada `passo` m ao longo da linha."""
    amostras = []
    for (ax, ay), (bx, by) in zip(pontos, pontos[1:]):
        n = max(1, math.ceil(math.hypot(bx - ax, by - ay) / passo))
        dx, dy = (bx - ax), (by - ay)
        comp = math.hypot(dx, dy)
        nx, ny = -dy / comp, dx / comp
        for k in range(n + 1):
            t = k / n
            amostras.append((ax + dx * t, ay + dy * t, nx, ny))
    verts, faces = [], []
    for k, (x, y, nx, ny) in enumerate(amostras):
        for s in (1, -1):
            verts.append(tuple(T.mundo(x + s * nx * largura / 2, y + s * ny * largura / 2, acima)))
        if k:
            a = 2 * (k - 1)
            faces.append((a, a + 1, a + 3, a + 2))
    return verts, faces


def duplicar(base, colecao, posicoes):
    """Cópias ligadas (a malha é partilhada): baratas no Cycles."""
    for k, (loc, rot, esc) in enumerate(posicoes):
        o = bpy.data.objects.new(f'{base.name}.{k}', base.data)
        o.location, o.rotation_euler.z, o.scale = loc, rot, (esc, esc, esc)
        colecao.objects.link(o)


def perto(x, y, pontos, m):
    for (ax, ay), (bx, by) in zip(pontos, pontos[1:]):
        l2 = (bx - ax) ** 2 + (by - ay) ** 2
        t = 0 if l2 == 0 else max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2))
        if math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) < m:
            return True
    return False


def ao_longo(pontos, passo):
    for (ax, ay), (bx, by) in zip(pontos, pontos[1:]):
        comp = math.hypot(bx - ax, by - ay)
        rot = math.atan2(by - ay, bx - ax) + math.pi / 2
        d = 0.0
        while d < comp:
            yield ax + (bx - ax) * d / comp, ay + (by - ay) * d / comp, rot
            d += passo


def casa_principal(casa):
    m = M.Modelo('el-casa-principal')
    w, d, h = casa['comprimento'], casa['largura'], casa['peDireito']
    telha = casa['cobertura'] == 'telha-ceramica'
    inc = {'chapa-zinco': 10, 'telha-ceramica': 30, 'painel-sanduiche': 8}.get(casa['cobertura'], 10)
    M.soco(m, w, d, 0.4)
    M.paredes(m, w, d, 0.4, h, 'reboco')
    M.telhado(m, w, d, h, inc, 'telha' if telha else 'zinco', 'reboco', beiral=0.7)
    M.abertura(m, w, d, 'S', -2.0, 0.4, 1.0, 2.1, 'madeira')
    for x in (1.0, 3.2):
        M.abertura(m, w, d, 'S', x, 1.2, 1.2, 1.1, 'vidro')
    for x in (-3.0, 0.0, 3.0):
        M.abertura(m, w, d, 'N', x, 1.2, 1.2, 1.1, 'vidro')
    for lado in 'EO':
        M.abertura(m, w, d, lado, 0.0, 1.2, 1.2, 1.1, 'vidro')
    m.caixa((0, -d / 2 - 1.2, 0.2), (w * 0.6, 2.4, 0.4), 'betao')  # alpendre
    return m.objeto()


def construir(cena, tex):
    T = Terreno(cena['terreno'])
    col = bpy.context.scene.collection
    M.criar_materiais(tex)
    chao = material_textura('chao', tex, 'savana', cor=(0.80, 0.84, 0.72))
    cultura = material_textura('cultura', tex, None, cor=(0.30, 0.42, 0.14), normal='solo-normal', rug=0.9)
    gravilha = material_textura('gravilha', tex, 'gravilha')

    # Terreno com uma margem de 300 m que desce suave até ao entorno: sem
    # degrau nem sombra na borda. O entorno vai até ao horizonte.
    baixo = float(T.h.min()) * EXAGERO - 0.4
    margem, passo = 300, T.passo

    def chao_em(x, y):
        fora = math.hypot(max(0, -x, x - T.L), max(0, -y, y - T.H))
        k = min(1.0, fora / 250) ** 2 * (3 - 2 * min(1.0, fora / 250))
        return T.cota(x, y) * (1 - k) + baixo * k

    nu, nv = int((T.L + 2 * margem) / passo), int((T.H + 2 * margem) / passo)
    verts = []
    for j in range(nv + 1):
        for i in range(nu + 1):
            x, y = -margem + i * passo, -margem + j * passo
            verts.append((x - T.L / 2, y - T.H / 2, chao_em(x, y)))
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    objeto_malha('terreno', verts, faces, chao, 14.0, col)
    r = 40000
    objeto_malha('entorno', [(-r, -r, baixo - 0.05), (r, -r, baixo - 0.05), (r, r, baixo - 0.05), (-r, r, baixo - 0.05)], [(0, 1, 2, 3)], chao, 14.0, col)

    elementos = {e['id']: e for e in cena['elementos']}
    # Talhões com cultura (fase final) e estradas.
    for e in cena['elementos']:
        f = e['forma']
        if f['tipo'] == 'area' and e['camada'] == 'talhoes' and e['id'] != 't5':
            r = f['r']
            v, fc = grelha_assente(T, r['cx'] - r['w'] / 2, r['cy'] - r['d'] / 2, r['cx'] + r['w'] / 2, r['cy'] + r['d'] / 2, T.passo, 0.15)
            objeto_malha(e['id'], v, fc, cultura, 16.0, col)
        if f['tipo'] == 'linha' and f['largura'] > 1:
            v, fc = faixa(T, f['pontos'], f['largura'], 0.08)
            objeto_malha(e['id'], v, fc, gravilha, 4.0, col)

    # Construções do Blender, cada uma no seu lugar.
    for id_, ob in M.construir_elementos(cena).items():
        f = elementos[id_]['forma']
        cx, cy = (f['cx'], f['cy']) if f['tipo'] == 'cilindro' else (f['r']['cx'], f['r']['cy'])
        ob.location = T.mundo(cx, cy)
        ob.rotation_euler.z = math.radians(f.get('r', {}).get('rot', 0) or 0)
    casa = cena['casa']
    ob = casa_principal(casa)
    ob.location = T.mundo(casa['x'], casa['y'])
    ob.rotation_euler.z = math.radians(casa.get('rotacao', 0))

    # Vegetação e adereços: cópias ligadas.
    inst = M.construir_instancias()
    for o in inst.values():
        o.hide_render = True  # os originais ficam na origem, escondidos
    rnd = random.Random(7)
    vias = [e['forma']['pontos'] for e in cena['elementos'] if e['forma']['tipo'] == 'linha' and e['forma']['largura'] > 1]
    ocup = []
    for e in cena['elementos']:
        f = e['forma']
        if f['tipo'] == 'cilindro':
            ocup.append((f['cx'], f['cy'], 2 * f['raio'], 2 * f['raio']))
        elif 'r' in f:
            ocup.append((f['r']['cx'], f['r']['cy'], f['r']['w'], f['r']['d']))
    livre = lambda x, y: all(abs(x - a) > w / 2 + 6 or abs(y - b) > d / 2 + 6 for a, b, w, d in ocup) and not any(perto(x, y, v, 8) for v in vias)  # noqa: E731
    arvores = []
    for (x0, y0, x1, y1) in ((6, 6, T.L - 6, 6), (T.L - 6, 6, T.L - 6, T.H - 6), (T.L - 6, T.H - 6, 6, T.H - 6), (6, T.H - 6, 6, 6)):
        n = int(math.hypot(x1 - x0, y1 - y0) // 22)
        for k in range(n):
            t = (k + 0.5) / n
            x, y = x0 + (x1 - x0) * t + rnd.uniform(-2, 2), y0 + (y1 - y0) * t + rnd.uniform(-2, 2)
            if livre(x, y):
                arvores.append((T.mundo(x, y), rnd.uniform(0, 6.28), rnd.uniform(0.8, 1.25)))
    # Árvores dispersas do mato à volta, fora da vedação.
    while len(arvores) < 900:
        x, y = rnd.uniform(-700, T.L + 700), rnd.uniform(-500, T.H + 700)
        if -15 < x < T.L + 15 and -15 < y < T.H + 15:
            continue
        arvores.append((Vector((x - T.L / 2, y - T.H / 2, chao_em(x, y))), rnd.uniform(0, 6.28), rnd.uniform(0.7, 1.5)))
    duplicar(inst['veg-arvore'], col, arvores)

    t5 = elementos['t5']['forma']['r']
    bananas = [(T.mundo(t5['cx'] - t5['w'] / 2 + 1.8 + i * 3.5 + rnd.uniform(-0.4, 0.4), t5['cy'] - t5['d'] / 2 + 1.8 + j * 3.5), rnd.uniform(0, 6.28), rnd.uniform(0.85, 1.15))
               for j in range(int(t5['d'] // 3.5)) for i in range(int(t5['w'] // 3.5))]
    duplicar(inst['veg-bananeira'], col, bananas)
    ved = elementos['vedacao']['forma']['pontos']
    duplicar(inst['adr-estaca'], col, [(T.mundo(x, y), r, 1) for x, y, r in ao_longo(ved, 5) if not any(perto(x, y, v, 4) for v in vias)])
    postes = []
    for e in cena['elementos']:
        if e['camada'] == 'eletrica' and e['forma']['tipo'] == 'linha':
            postes += [(T.mundo(x, y), r, 1) for x, y, r in ao_longo(e['forma']['pontos'], 40)]
    duplicar(inst['adr-poste'], col, postes)
    return T


def ceu_e_render(amostras):
    sc = bpy.context.scene
    addon_utils.enable('cycles', default_set=True)
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = amostras
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except TypeError:
        pass
    sc.cycles.max_bounces = 6
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.exposure = -3.4
    w = bpy.data.worlds.new('ceu')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    sky = nt.nodes.new('ShaderNodeTexSky')
    try:
        sky.sky_type = 'MULTIPLE_SCATTERING'
    except TypeError:
        sky.sky_type = 'HOSEK_WILKIE'
    # Tarde de inverno austral: sol a noroeste, 35° de altura.
    sky.sun_elevation = math.radians(35)
    sky.sun_rotation = math.radians(130)
    nt.links.new(sky.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.quality = 78


def fotografar(nome, posicao, alvo, lente, saida):
    sc = bpy.context.scene
    cam = bpy.data.cameras.new(nome)
    cam.lens = lente
    cam.clip_end = 60000
    co = bpy.data.objects.new(nome, cam)
    sc.collection.objects.link(co)
    co.location = posicao
    co.rotation_euler = (Vector(alvo) - Vector(posicao)).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.filepath = str(saida / f'{nome}.webp')
    bpy.ops.render.render(write_still=True)
    print(f'{nome}: {(saida / f"{nome}.webp").stat().st_size / 1024:.0f} KB')


def main():
    if len(sys.argv) < 4:
        sys.exit('uso: python render.py <cena.json> <pasta-tex> <pasta-saida> [amostras]')
    argumentos = [a for a in sys.argv[1:]]
    cena = json.loads(Path(argumentos[0]).read_text(encoding='utf-8'))
    tex, saida = Path(argumentos[1]).resolve(), Path(argumentos[2]).resolve()
    amostras = int(argumentos[3]) if len(argumentos) > 3 else 64
    saida.mkdir(parents=True, exist_ok=True)
    M.limpar()
    T = construir(cena, tex)
    ceu_e_render(amostras)
    # Câmaras quase rasantes: o horizonte e o céu entram no quadro.
    fotografar('render-aerea', (200, -255, 118), (-15, 160, 0), 32, saida)
    junta = T.mundo(200, 150)  # cruzamento das estradas, entre a casa e o armazém
    fotografar('render-patio', (junta.x - 40, junta.y - 75, junta.z + 28), (junta.x + 15, junta.y + 40, junta.z), 28, saida)


if __name__ == '__main__':
    main()
