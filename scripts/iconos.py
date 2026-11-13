#!/usr/bin/env python3
"""Íconos de la app Claraboya: la claraboya hecha vúmetro, sobre negro.

Los cuatro cuadros del logo, apenas separados, y cada columna partida en segmentos como el medidor
de una consola: izquierda y derecha prendidas hasta distinta altura, con el pico más claro.
Dibuja todo desde polígonos (bordes nítidos en cualquier tamaño) y escribe:
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

# Los cuatro cuadros (arriba izq., arriba der., abajo izq., abajo der.), en unidades del dibujo original.
CUADROS = [
    [(22, 7), (59, 4), (74, 91), (26, 91)],
    [(64, 4), (105, 0), (132, 91), (79, 91)],
    [(26, 96), (74, 96), (87, 175), (31, 170)],
    [(80, 96), (133, 96), (158, 179), (93, 175)],
]
SEPARAR = 1.25       # cuánto se aleja cada cuadro del centro (la rendija pasa de 5 a 7,5)
SEGMENTOS = 6        # segmentos del vúmetro en cada cuadro (12 por columna)
CORTE = 3.8          # ancho de la rendija entre segmentos, en las mismas unidades
PICO = {0: 2, 1: 4}  # en qué segmento (de 12, contando desde arriba) está el pico de cada columna

APAGADO = (77, 10, 12)      # #4D0A0C  segmentos de arriba del pico
PRENDIDO = (116, 2, 3)      # #740203  bordó de siempre
CALIENTE = (142, 10, 12)    # #8E0A0C  el segmento justo debajo del pico
COLOR_PICO = (217, 58, 60)  # #D93A3C

# Alto del logo como parte del alto del ícono.
# Android adaptable: el sistema muestra el 66,7 % del centro y lo recorta en círculo o squircle;
# 0,51 es lo más grande que entra en el círculo sin cortar las puntas.
ALTO = {
    'adaptable': 0.51,
    'cuadrado': 0.74,     # ícono que se ve entero (iPhone, Android viejos)
    'maskable': 0.60,     # zona segura: círculo del 80 % del centro
}
SS = 4  # submuestreo para bordes suaves


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def piezas():
    """Lista de (cuadrilátero, color) en unidades del dibujo: los segmentos de los cuatro cuadros."""
    salida = []
    for i, q in enumerate(CUADROS):
        dx = SEPARAR if i in (1, 3) else -SEPARAR
        dy = SEPARAR if i in (2, 3) else -SEPARAR
        tl, tr, br, bl = [(x + dx, y + dy) for x, y in q]
        alto = ((bl[1] - tl[1]) + (br[1] - tr[1])) / 2
        col, fila = i % 2, i // 2
        for j in range(SEGMENTOS):
            t0, t1 = j / SEGMENTOS, (j + 1) / SEGMENTOS
            if j > 0:
                t0 += CORTE / 2 / alto
            if j < SEGMENTOS - 1:
                t1 -= CORTE / 2 / alto
            n = fila * SEGMENTOS + j  # número de segmento en la columna, desde arriba
            p = PICO[col]
            color = APAGADO if n < p else COLOR_PICO if n == p else CALIENTE if n == p + 1 else PRENDIDO
            salida.append(([lerp(tl, bl, t0), lerp(tr, br, t0), lerp(tr, br, t1), lerp(tl, bl, t1)], color))
    return salida


def dibujar(lado, alto_rel, fondo):
    """Devuelve una imagen RGBA de lado x lado con el logo centrado."""
    formas = piezas()
    pts = [p for q, _ in formas for p in q]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    escala = alto_rel * lado / (y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    n = lado * SS
    rgb = np.zeros((n, n, 3))
    alfa = np.zeros((n, n))
    for q, color in formas:
        px = np.array([((x - cx) * escala + lado / 2) * SS for x, _ in q])
        py = np.array([((y - cy) * escala + lado / 2) * SS for _, y in q])
        bx0, bx1 = int(max(0, px.min() - 2)), int(min(n, px.max() + 3))
        by0, by1 = int(max(0, py.min() - 2)), int(min(n, py.max() + 3))
        yy, xx = np.mgrid[by0:by1, bx0:bx1] + 0.5
        # orientación del polígono para que "adentro" sea positivo
        area = sum(px[i] * py[(i + 1) % 4] - px[(i + 1) % 4] * py[i] for i in range(4))
        sgn = 1 if area > 0 else -1
        dentro = np.ones(xx.shape, bool)
        for i in range(4):
            ax, ay, bx, by = px[i], py[i], px[(i + 1) % 4], py[(i + 1) % 4]
            dentro &= sgn * ((bx - ax) * (yy - ay) - (by - ay) * (xx - ax)) >= 0
        rgb[by0:by1, bx0:bx1][dentro] = color
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
