#!/usr/bin/env python3
"""Íconos de la app Claraboya: los cuatro cuadros sobre negro.

Dibuja el logo desde sus cuatro polígonos (bordes nítidos en cualquier tamaño) y escribe:
  app/assets/icon-foreground.png   frente del ícono adaptable de Android (fondo transparente)
  app/assets/icon-only.png         ícono para Android viejos (fondo negro)
  web/img/app-180.png, app-192.png, app-512.png   iPhone (pantalla de inicio) y web instalada
  web/img/app-maskable-512.png     web instalada en Android (el sistema le recorta la forma)

Para agrandar o achicar el logo, cambiar ALTO (qué parte del alto del ícono ocupa).
Uso: python3 scripts/iconos.py   (necesita Pillow y numpy)
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Los cuatro cuadros (de arriba a la izquierda a abajo a la derecha), en unidades del dibujo original.
CUADROS = [
    [(22, 7), (59, 4), (74, 91), (26, 91)],
    [(64, 4), (105, 0), (132, 91), (79, 91)],
    [(26, 96), (74, 96), (87, 175), (31, 170)],
    [(80, 96), (133, 96), (158, 179), (93, 175)],
]
BORDO = np.array([116, 2, 3], float)   # #740203
SOMBRA = 15                            # cuánto se oscurece el borde de cada cuadro
SOMBRA_ANCHO = 0.056                   # ancho de esa sombra, en proporción al alto del logo

# Alto del logo como parte del alto del ícono.
# Android adaptable: el sistema muestra el 66,7 % del centro y lo recorta en círculo o squircle;
# 0,51 es lo más grande que entra en el círculo sin cortar las puntas.
ALTO = {
    'adaptable': 0.51,
    'cuadrado': 0.74,     # ícono que se ve entero (iPhone, Android viejos)
    'maskable': 0.60,     # zona segura: círculo del 80 % del centro
}
SS = 4  # submuestreo para bordes suaves


def dibujar(lado, alto_rel, fondo):
    """Devuelve una imagen RGBA de lado x lado con el logo centrado."""
    pts = [p for q in CUADROS for p in q]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    escala = alto_rel * lado / (y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    n = lado * SS
    rgb = np.zeros((n, n, 3))
    alfa = np.zeros((n, n))
    ancho_sombra = SOMBRA_ANCHO * alto_rel * lado * SS
    for q in CUADROS:
        poly = [((x - cx) * escala + lado / 2) * SS for x, _ in q], [((y - cy) * escala + lado / 2) * SS for _, y in q]
        px, py = np.array(poly[0]), np.array(poly[1])
        bx0, bx1 = int(max(0, px.min() - 2)), int(min(n, px.max() + 3))
        by0, by1 = int(max(0, py.min() - 2)), int(min(n, py.max() + 3))
        yy, xx = np.mgrid[by0:by1, bx0:bx1] + 0.5
        # orientación del polígono para que "adentro" sea positivo
        area = sum(px[i] * py[(i + 1) % 4] - px[(i + 1) % 4] * py[i] for i in range(4))
        sgn = 1 if area > 0 else -1
        d = np.full(xx.shape, np.inf)
        for i in range(4):
            ax, ay, bx, by = px[i], py[i], px[(i + 1) % 4], py[(i + 1) % 4]
            ex, ey = bx - ax, by - ay
            s = sgn * (ex * (yy - ay) - ey * (xx - ax)) / np.hypot(ex, ey)
            d = np.minimum(d, s)
        dentro = d >= 0
        t = np.clip(1 - d / ancho_sombra, 0, 1)
        color = BORDO[None, None, :] - (SOMBRA * t * t)[:, :, None] * np.array([1, 0, 0])[None, None, :]
        sub_rgb = rgb[by0:by1, bx0:bx1]
        sub_rgb[dentro] = color[dentro]
        alfa[by0:by1, bx0:bx1][dentro] = 1
    # bajar a tamaño final promediando (con alfa premultiplicado)
    pre = (rgb * alfa[:, :, None]).reshape(lado, SS, lado, SS, 3).mean(axis=(1, 3))
    a = alfa.reshape(lado, SS, lado, SS).mean(axis=(1, 3))
    if fondo is None:
        col = np.where(a[:, :, None] > 0, pre / np.maximum(a[:, :, None], 1e-6), 0)
        out = np.dstack([col, a * 255])
    else:
        f = np.array(fondo, float)
        col = pre + f[None, None, :] * (1 - a[:, :, None])
        out = np.dstack([col, np.full(a.shape, 255.0)])
    return Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8), 'RGBA')


def guardar(img, ruta, rgb=False):
    ruta = os.path.join(ROOT, ruta)
    (img.convert('RGB') if rgb else img).save(ruta, optimize=True)
    print('  ' + os.path.relpath(ruta, ROOT), img.size[0], 'px')


if __name__ == '__main__':
    NEGRO = (0, 0, 0)
    print('Íconos de Claraboya:')
    guardar(dibujar(1024, ALTO['adaptable'], None), 'app/assets/icon-foreground.png')
    guardar(dibujar(1024, ALTO['cuadrado'], NEGRO), 'app/assets/icon-only.png', rgb=True)
    for lado in (180, 192, 512):
        guardar(dibujar(lado, ALTO['cuadrado'], NEGRO), f'web/img/app-{lado}.png', rgb=True)
    guardar(dibujar(512, ALTO['maskable'], NEGRO), 'web/img/app-maskable-512.png', rgb=True)
