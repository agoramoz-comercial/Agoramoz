"""Texturas sem costura do TerraBuild (demo), geradas por código.

Porquê gerar em vez de descarregar: a rede desta máquina bloqueia o Poly Haven,
e assim cada textura é reprodutível (sementes fixas), é nossa (sem licença de
terceiros) e tem o tamanho controlado. As mesmas imagens servem o Cycles
(renders) e o site (cena em tempo real), para os dois terem o mesmo aspecto.

Uso:  python texturas.py <pasta-de-saida>
Precisa do `bpy` 5.0.x (grava WebP sem Pillow) e do numpy que vem com ele.
"""

import sys
from pathlib import Path

import bpy
import numpy as np


# ── Ruído periódico (repete sem costura em n×n) ────────────────────────────


def ruido(n, px, py=None, rng=None):
    """Value noise: grelha aleatória px×py, interpolada com smoothstep."""
    py = py or px
    g = rng.random((py, px))

    def eixo(p):
        t = np.arange(n) * p / n
        i0 = np.floor(t).astype(int)
        f = t - i0
        return i0, (i0 + 1) % p, f * f * (3 - 2 * f)

    x0, x1, fx = eixo(px)
    y0, y1, fy = eixo(py)
    fx, fy = fx[None, :], fy[:, None]
    a, b = g[y0][:, x0], g[y0][:, x1]
    c, d = g[y1][:, x0], g[y1][:, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(n, base, oitavas, rng, ganho=0.5):
    soma, amp, total = np.zeros((n, n)), 1.0, 0.0
    for k in range(oitavas):
        p = base * 2**k
        if p > n:
            break
        soma += amp * ruido(n, p, rng=rng)
        total += amp
        amp *= ganho
    return soma / total


def worley(n, k, rng):
    """Células de Voronoi periódicas: distância ao 1.º e 2.º ponto e a célula."""
    pts = rng.random((k, k, 2))
    t = (np.arange(n) + 0.5) * k / n
    c = np.floor(t).astype(int)
    X, Y = t[None, :], t[:, None]
    CX, CY = c[None, :], c[:, None]
    d1 = np.full((n, n), 9.0)
    d2 = np.full((n, n), 9.0)
    ident = np.zeros((n, n), dtype=int)
    for oy in (-1, 0, 1):
        for ox in (-1, 0, 1):
            gx, gy = CX + ox, CY + oy
            p = pts[gy % k, gx % k]
            d = np.hypot(X - (gx + p[..., 0]), Y - (gy + p[..., 1]))
            mais_perto = d < d1
            d2 = np.where(mais_perto, d1, np.minimum(d2, d))
            ident = np.where(mais_perto, (gy % k) * k + (gx % k), ident)
            d1 = np.minimum(d1, d)
    return d1, d2, ident


def norm01(x):
    return (x - x.min()) / (x.max() - x.min() + 1e-9)


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cor(*rgb):
    return np.array(rgb, dtype=float)


def mistura(c1, c2, t):
    c1 = np.broadcast_to(c1, t.shape + (3,)) if np.ndim(c1) == 1 else c1
    c2 = np.broadcast_to(c2, t.shape + (3,)) if np.ndim(c2) == 1 else c2
    return c1 + (c2 - c1) * t[..., None]


def normal_de(h, forca):
    """Mapa de normais (convenção OpenGL, a do glTF): verde = para cima.
    No bpy a linha 0 é a de baixo, por isso +y do array é «cima»."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * forca
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * forca
    v = np.stack([-dx, -dy, np.ones_like(h)], -1)
    v /= np.linalg.norm(v, axis=-1, keepdims=True)
    return v * 0.5 + 0.5


def gravar(pasta, nome, rgb, qualidade=80):
    n = rgb.shape[0]
    img = bpy.data.images.new(nome, n, n, alpha=False)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((n, n, 1))], -1)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    caminho = pasta / f'{nome}.webp'
    img.filepath_raw = str(caminho)
    img.file_format = 'WEBP'
    try:
        img.save(quality=qualidade)
    except TypeError:  # API sem `quality`: grava com a qualidade por omissão
        img.save()
    bpy.data.images.remove(img)
    print(f'{nome:13s} {n}px  {caminho.stat().st_size / 1024:6.1f} KB')


# ── Texturas ───────────────────────────────────────────────────────────────


def savana(n=512):
    """Capim seco do planalto: palha e oliva, com clareiras de terra."""
    rng = np.random.default_rng(11)
    manchas = fbm(n, 4, 4, rng)
    clareiras = fbm(n, 6, 4, rng)
    erva = norm01(fbm(n, 64, 3, rng))
    tufos = ruido(n, 160, rng=rng)
    base = mistura(cor(0.50, 0.42, 0.26), cor(0.71, 0.61, 0.39), erva)
    base = mistura(base, cor(0.52, 0.52, 0.33), suave(0.45, 0.72, manchas) * 0.45)
    base = mistura(base, cor(0.52, 0.38, 0.25), suave(0.62, 0.78, 1 - clareiras) * 0.65)
    base *= (0.86 + 0.22 * tufos)[..., None]
    return base


def solo(n=512):
    """Solo lavrado: sulcos regulares (32 por textura) com torrões."""
    rng = np.random.default_rng(23)
    x = np.arange(n)[None, :] / n
    torcao = fbm(n, 4, 3, rng) * 1.2
    sulco = 0.5 + 0.5 * np.sin(2 * np.pi * (x * 32 + torcao))
    torroes = fbm(n, 48, 3, rng)
    h = 0.75 * sulco + 0.25 * torroes
    base = mistura(cor(0.33, 0.23, 0.16), cor(0.56, 0.41, 0.29), suave(0.2, 0.9, h))
    base *= (0.9 + 0.2 * fbm(n, 8, 3, rng))[..., None]
    return base, normal_de(h, n / 48)


def gravilha(n=512):
    """Gravilha de estrada: pedras arredondadas sobre areia grossa."""
    rng = np.random.default_rng(37)
    d1, d2, ident = worley(n, 44, rng)
    tom = rng.random(44 * 44)[ident]
    pedra = mistura(cor(0.42, 0.40, 0.37), cor(0.70, 0.67, 0.61), tom)
    pedra *= (1.08 - 0.55 * d1)[..., None]
    areia = mistura(cor(0.40, 0.36, 0.31), cor(0.55, 0.50, 0.43), fbm(n, 128, 2, rng))
    junta = suave(0.04, 0.12, d2 - d1)
    return mistura(areia, pedra, junta)


def reboco(n=256):
    """Reboco pintado, quente, com manchas de chuva leves."""
    rng = np.random.default_rng(41)
    base = np.broadcast_to(cor(0.86, 0.83, 0.77), (n, n, 3)).copy()
    base *= (0.94 + 0.1 * fbm(n, 4, 4, rng))[..., None]
    base *= (0.96 + 0.06 * fbm(n, 64, 2, rng))[..., None]
    return base


def zinco(n=256):
    """Chapa de zinco ondulada (16 ondas), com escorridos e pontos de ferrugem."""
    rng = np.random.default_rng(53)
    x = np.arange(n)[None, :] / n
    h = np.broadcast_to(0.5 + 0.5 * np.sin(2 * np.pi * x * 16), (n, n))
    escorridos = ruido(n, 64, 4, rng)
    base = np.broadcast_to(cor(0.64, 0.66, 0.68), (n, n, 3)).copy()
    base *= (0.86 + 0.18 * escorridos)[..., None]
    base *= (0.94 + 0.06 * h)[..., None]
    ferrugem = suave(0.70, 0.82, fbm(n, 8, 3, rng)) * 0.55
    base = mistura(base, cor(0.52, 0.36, 0.24), ferrugem)
    return base, normal_de(h, n / 32)


def telha(n=256):
    """Telha de barro: 8 fiadas × 8 canais, cada telha com o seu tom."""
    rng = np.random.default_rng(67)
    k = 8
    u = np.arange(n)[None, :] * k / n
    v = np.arange(n)[:, None] * k / n
    col, fila = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - col, v - fila
    tom = rng.random(k * k)[(fila % k) * k + (col % k)]
    base = mistura(cor(0.56, 0.27, 0.18), cor(0.72, 0.38, 0.25), tom)
    canal = 0.82 + 0.18 * np.sin(np.pi * fu)
    sobreposicao = 0.72 + 0.28 * suave(0.0, 0.85, fv)
    base *= (canal * sobreposicao)[..., None]
    base *= (0.9 + 0.14 * fbm(n, 8, 3, rng))[..., None]
    return base


def betao(n=256):
    """Betão à vista: manchado, com poros escuros."""
    rng = np.random.default_rng(71)
    base = np.broadcast_to(cor(0.63, 0.62, 0.59), (n, n, 3)).copy()
    base *= (0.9 + 0.16 * fbm(n, 6, 4, rng))[..., None]
    poros = suave(0.80, 0.88, ruido(n, 96, rng=rng))
    base *= (1 - 0.3 * poros)[..., None]
    return base


def solar(n=256):
    """Módulo fotovoltaico: 8×8 células azul-escuras, juntas claras, 2 barramentos."""
    rng = np.random.default_rng(83)
    k = 8
    u = np.arange(n)[None, :] * k / n
    v = np.arange(n)[:, None] * k / n
    fu, fv = u % 1, v % 1
    ident = (np.floor(v).astype(int) % k) * k + (np.floor(u).astype(int) % k)
    celula = mistura(cor(0.05, 0.08, 0.17), cor(0.09, 0.13, 0.25), rng.random(k * k)[ident])
    celula *= (0.9 + 0.2 * fbm(n, 64, 2, rng))[..., None]
    barramento = (np.abs(fu - 1 / 3) < 0.012) | (np.abs(fu - 2 / 3) < 0.012)
    celula = np.where(barramento[..., None], cor(0.42, 0.44, 0.48), celula)
    junta = (fu < 0.04) | (fu > 0.96) | (fv < 0.04) | (fv > 0.96)
    return np.where(junta[..., None], cor(0.74, 0.76, 0.80), celula)


def main():
    if len(sys.argv) < 2:
        sys.exit('uso: python texturas.py <pasta-de-saida>')
    pasta = Path(sys.argv[-1]).resolve()
    pasta.mkdir(parents=True, exist_ok=True)
    gravar(pasta, 'savana', savana())
    cor_solo, normal_solo = solo()
    gravar(pasta, 'solo', cor_solo)
    gravar(pasta, 'solo-normal', normal_solo, 85)
    gravar(pasta, 'gravilha', gravilha())
    gravar(pasta, 'reboco', reboco())
    cor_zinco, normal_zinco = zinco()
    gravar(pasta, 'zinco', cor_zinco)
    gravar(pasta, 'zinco-normal', normal_zinco, 85)
    gravar(pasta, 'telha', telha())
    gravar(pasta, 'betao', betao())
    gravar(pasta, 'solar', solar())


if __name__ == '__main__':
    main()
