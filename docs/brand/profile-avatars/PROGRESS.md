# Avatares: progreso por modelo del juego

Archivo generado con `node scripts/sync-avatar-progress.mjs` a partir de `game-looks.json` y los retratos verificados del manifiesto. Volver a extraer el inventario con `python scripts/extract-avatar-looks.py` cuando cambie el cliente.

**Orden acordado:** rostros y peinados primero, con el traje habitual. Después los trajes alternativos. El estilo artístico sigue siendo tinta y acuarela.

**Rostros:** 190/600 terminados; 410 pendientes. **Trajes alternativos:** 0/38 terminados, reservados para después.

La posición del rostro empieza en 1 y sigue el orden del cliente. Cada entrada conserva el id y la textura del juego; no confundir la etiqueta interna con la posición de la galería. Un retrato solo se tacha cuando existe su archivo, coincide su hash y están guardados su prompt y su pose.

## Resumen de los rostros producidos

| Clase | Sexo | Rostro 1 | Rostro 2 | Rostro 3 | Rostro 4 | Rostro 5 | Otros rostros pendientes |
|---|---|---|---|---|---|---|---|
| Ocra | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Ocra | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Zurcarák | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Zurcarák | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Aniripsa | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Aniripsa | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Anutrof | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Anutrof | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Selotrop | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Selotrop | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Feca | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Feca | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Steamer | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Steamer | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Forjalanza | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Forjalanza | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Hipermago | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Hipermago | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Yopuka | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Yopuka | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Zobal | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Zobal | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Osamodas | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Osamodas | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Uginak | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Uginak | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Pandawa | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Pandawa | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Tymador | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Tymador | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Sacrógrito | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Sacrógrito | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Sadida | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Sadida | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Sram | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Sram | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 |
| Xelor | Masculino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |
| Xelor | Femenino | Hecho | Hecho | Hecho | Hecho | Hecho | 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 |

## Rostros y peinados: lista completa

### Ocra · Masculino

Traje habitual: id 21, textura 90.

- [x] Rostro 1 · id 129 · textura 2140 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/cra-m.webp)
- [x] Rostro 2 · id 130 · textura 2141 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-2-m.webp)
- [x] Rostro 3 · id 131 · textura 2142 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-3-m.webp)
- [x] Rostro 4 · id 132 · textura 2143 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-4-m.webp)
- [x] Rostro 5 · id 133 · textura 2144 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-5-m.webp)
- [ ] Rostro 6 · id 134 · textura 2145 · etiqueta 2.2
- [ ] Rostro 7 · id 135 · textura 2146 · etiqueta 3.2
- [ ] Rostro 8 · id 136 · textura 2147 · etiqueta 4.2
- [ ] Rostro 9 · id 334 · textura 5189 · etiqueta 1.3
- [ ] Rostro 10 · id 335 · textura 5194 · etiqueta 2.3
- [ ] Rostro 11 · id 336 · textura 5195 · etiqueta 3.3
- [ ] Rostro 12 · id 337 · textura 5196 · etiqueta 4.3
- [ ] Rostro 13 · id 363 · textura 5193 · etiqueta 1.4
- [ ] Rostro 14 · id 364 · textura 5190 · etiqueta 2.4
- [ ] Rostro 15 · id 365 · textura 5191 · etiqueta 3.4
- [ ] Rostro 16 · id 366 · textura 5192 · etiqueta 4.4
- [ ] Rostro 17 · id 654 · textura 5917 · etiqueta retro

### Ocra · Femenino

Traje habitual: id 22, textura 91.

- [x] Rostro 1 · id 137 · textura 2148 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/cra-f.webp)
- [x] Rostro 2 · id 138 · textura 2149 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-2-f.webp)
- [x] Rostro 3 · id 139 · textura 2150 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-3-f.webp)
- [x] Rostro 4 · id 140 · textura 2151 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-4-f.webp)
- [x] Rostro 5 · id 141 · textura 2152 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/cra-look-5-f.webp)
- [ ] Rostro 6 · id 142 · textura 2153 · etiqueta 2.2
- [ ] Rostro 7 · id 143 · textura 2154 · etiqueta 3.2
- [ ] Rostro 8 · id 144 · textura 2155 · etiqueta 4.2
- [ ] Rostro 9 · id 338 · textura 5197 · etiqueta 1.3
- [ ] Rostro 10 · id 339 · textura 5198 · etiqueta 2.3
- [ ] Rostro 11 · id 340 · textura 5240 · etiqueta 3.3
- [ ] Rostro 12 · id 341 · textura 5237 · etiqueta 4.3
- [ ] Rostro 13 · id 367 · textura 5238 · etiqueta 1.4
- [ ] Rostro 14 · id 368 · textura 5239 · etiqueta 2.4
- [ ] Rostro 15 · id 369 · textura 5199 · etiqueta 3.4
- [ ] Rostro 16 · id 370 · textura 5241 · etiqueta 4.4
- [ ] Rostro 17 · id 655 · textura 5918 · etiqueta retro

### Zurcarák · Masculino

Traje habitual: id 14, textura 60.

- [x] Rostro 1 · id 81 · textura 2092 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-m.webp)
- [x] Rostro 2 · id 82 · textura 2093 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-2-m.webp)
- [x] Rostro 3 · id 83 · textura 2094 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-3-m.webp)
- [x] Rostro 4 · id 84 · textura 2095 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-4-m.webp)
- [x] Rostro 5 · id 85 · textura 2096 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-5-m.webp)
- [ ] Rostro 6 · id 86 · textura 2097 · etiqueta 2.1
- [ ] Rostro 7 · id 87 · textura 2098 · etiqueta 3.1
- [ ] Rostro 8 · id 88 · textura 2099 · etiqueta 4.1
- [ ] Rostro 9 · id 449 · textura 5377 · etiqueta 1.2
- [ ] Rostro 10 · id 451 · textura 5382 · etiqueta 2.2
- [ ] Rostro 11 · id 453 · textura 5379 · etiqueta 3.2
- [ ] Rostro 12 · id 455 · textura 5384 · etiqueta 4.2
- [ ] Rostro 13 · id 450 · textura 5381 · etiqueta 1.3
- [ ] Rostro 14 · id 452 · textura 5378 · etiqueta 2.3
- [ ] Rostro 15 · id 454 · textura 5383 · etiqueta 3.3
- [ ] Rostro 16 · id 456 · textura 5380 · etiqueta 4.3
- [ ] Rostro 17 · id 648 · textura 5911 · etiqueta retro

### Zurcarák · Femenino

Traje habitual: id 16, textura 61.

- [x] Rostro 1 · id 89 · textura 2100 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-f.webp)
- [x] Rostro 2 · id 90 · textura 2101 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-2-f.webp)
- [x] Rostro 3 · id 91 · textura 2102 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-3-f.webp)
- [x] Rostro 4 · id 92 · textura 2103 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-4-f.webp)
- [x] Rostro 5 · id 93 · textura 2104 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/ecaflip-look-5-f.webp)
- [ ] Rostro 6 · id 94 · textura 2105 · etiqueta 2.1
- [ ] Rostro 7 · id 95 · textura 2106 · etiqueta 3.1
- [ ] Rostro 8 · id 96 · textura 2107 · etiqueta 4.1
- [ ] Rostro 9 · id 441 · textura 5385 · etiqueta 1.2
- [ ] Rostro 10 · id 443 · textura 5390 · etiqueta 2.2
- [ ] Rostro 11 · id 445 · textura 5387 · etiqueta 3.2
- [ ] Rostro 12 · id 447 · textura 5392 · etiqueta 4.2
- [ ] Rostro 13 · id 442 · textura 5389 · etiqueta 1.3
- [ ] Rostro 14 · id 444 · textura 5386 · etiqueta 2.3
- [ ] Rostro 15 · id 446 · textura 5391 · etiqueta 3.3
- [ ] Rostro 16 · id 448 · textura 5388 · etiqueta 4.3
- [ ] Rostro 17 · id 649 · textura 5912 · etiqueta retro

### Aniripsa · Masculino

Traje habitual: id 17, textura 70.

- [x] Rostro 1 · id 97 · textura 2108 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-m.webp)
- [x] Rostro 2 · id 98 · textura 2109 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-2-m.webp)
- [x] Rostro 3 · id 99 · textura 2110 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-3-m.webp)
- [x] Rostro 4 · id 100 · textura 2111 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-4-m.webp)
- [x] Rostro 5 · id 101 · textura 2112 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-5-m.webp)
- [ ] Rostro 6 · id 102 · textura 2113 · etiqueta 2.2
- [ ] Rostro 7 · id 103 · textura 2114 · etiqueta 3.2
- [ ] Rostro 8 · id 104 · textura 2115 · etiqueta 4.2
- [ ] Rostro 9 · id 413 · textura 5343 · etiqueta 1.3
- [ ] Rostro 10 · id 415 · textura 5340 · etiqueta 2.3
- [ ] Rostro 11 · id 417 · textura 5341 · etiqueta 3.3
- [ ] Rostro 12 · id 419 · textura 5342 · etiqueta 4.3
- [ ] Rostro 13 · id 414 · textura 5339 · etiqueta 1.4
- [ ] Rostro 14 · id 416 · textura 5344 · etiqueta 2.4
- [ ] Rostro 15 · id 418 · textura 5345 · etiqueta 3.4
- [ ] Rostro 16 · id 420 · textura 5346 · etiqueta 4.4
- [ ] Rostro 17 · id 650 · textura 5913 · etiqueta retro

### Aniripsa · Femenino

Traje habitual: id 18, textura 71.

- [x] Rostro 1 · id 105 · textura 2116 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-f.webp)
- [x] Rostro 2 · id 106 · textura 2117 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-2-f.webp)
- [x] Rostro 3 · id 107 · textura 2118 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-3-f.webp)
- [x] Rostro 4 · id 108 · textura 2119 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-4-f.webp)
- [x] Rostro 5 · id 109 · textura 2120 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/eniripsa-look-5-f.webp)
- [ ] Rostro 6 · id 110 · textura 2121 · etiqueta 2.2
- [ ] Rostro 7 · id 111 · textura 2122 · etiqueta 3.2
- [ ] Rostro 8 · id 112 · textura 2123 · etiqueta 4.2
- [ ] Rostro 9 · id 404 · textura 5351 · etiqueta 1.3
- [ ] Rostro 10 · id 406 · textura 5352 · etiqueta 2.3
- [ ] Rostro 11 · id 408 · textura 5349 · etiqueta 3.3
- [ ] Rostro 12 · id 411 · textura 5350 · etiqueta 4.3
- [ ] Rostro 13 · id 405 · textura 5347 · etiqueta 1.4
- [ ] Rostro 14 · id 407 · textura 5348 · etiqueta 2.4
- [ ] Rostro 15 · id 410 · textura 5353 · etiqueta 3.4
- [ ] Rostro 16 · id 412 · textura 5354 · etiqueta 4.4
- [ ] Rostro 17 · id 651 · textura 5914 · etiqueta retro

### Anutrof · Masculino

Traje habitual: id 8, textura 30.

- [x] Rostro 1 · id 33 · textura 2044 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-m.webp)
- [x] Rostro 2 · id 34 · textura 2045 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-2-m.webp)
- [x] Rostro 3 · id 35 · textura 2046 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-3-m.webp)
- [x] Rostro 4 · id 36 · textura 2047 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-4-m.webp)
- [x] Rostro 5 · id 37 · textura 2048 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-5-m.webp)
- [ ] Rostro 6 · id 38 · textura 2049 · etiqueta 2.2
- [ ] Rostro 7 · id 39 · textura 2050 · etiqueta 3.2
- [ ] Rostro 8 · id 40 · textura 2051 · etiqueta 4.2
- [ ] Rostro 9 · id 497 · textura 5439 · etiqueta 1.3
- [ ] Rostro 10 · id 498 · textura 5442 · etiqueta 2.3
- [ ] Rostro 11 · id 499 · textura 5440 · etiqueta 3.3
- [ ] Rostro 12 · id 501 · textura 5441 · etiqueta 4.3
- [ ] Rostro 13 · id 500 · textura 5443 · etiqueta 3.4
- [ ] Rostro 14 · id 502 · textura 5444 · etiqueta 4.4
- [ ] Rostro 15 · id 642 · textura 5905 · etiqueta retro

### Anutrof · Femenino

Traje habitual: id 9, textura 31.

- [x] Rostro 1 · id 41 · textura 2052 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-f.webp)
- [x] Rostro 2 · id 42 · textura 2053 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-2-f.webp)
- [x] Rostro 3 · id 43 · textura 2054 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-3-f.webp)
- [x] Rostro 4 · id 44 · textura 2055 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-4-f.webp)
- [x] Rostro 5 · id 45 · textura 2056 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/enutrof-look-5-f.webp)
- [ ] Rostro 6 · id 46 · textura 2057 · etiqueta 2.2
- [ ] Rostro 7 · id 47 · textura 2058 · etiqueta 3.2
- [ ] Rostro 8 · id 48 · textura 2059 · etiqueta 4.2
- [ ] Rostro 9 · id 506 · textura 5445 · etiqueta 1.3
- [ ] Rostro 10 · id 507 · textura 5446 · etiqueta 2.3
- [ ] Rostro 11 · id 509 · textura 5447 · etiqueta 3.3
- [ ] Rostro 12 · id 510 · textura 5448 · etiqueta 4.3
- [ ] Rostro 13 · id 508 · textura 5449 · etiqueta 2.4
- [ ] Rostro 14 · id 511 · textura 5450 · etiqueta 4.4
- [ ] Rostro 15 · id 643 · textura 5906 · etiqueta retro

### Selotrop · Masculino

Traje habitual: id 36, textura 3179.

- [x] Rostro 1 · id 241 · textura 3183 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-m.webp)
- [x] Rostro 2 · id 242 · textura 3184 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-2-m.webp)
- [x] Rostro 3 · id 243 · textura 3185 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-3-m.webp)
- [x] Rostro 4 · id 244 · textura 3186 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-4-m.webp)
- [x] Rostro 5 · id 245 · textura 3187 · etiqueta 5 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-5-m.webp)
- [ ] Rostro 6 · id 246 · textura 3188 · etiqueta 2.1
- [ ] Rostro 7 · id 247 · textura 3189 · etiqueta 3.1
- [ ] Rostro 8 · id 248 · textura 3190 · etiqueta 4.1
- [ ] Rostro 9 · id 342 · textura 5171 · etiqueta 1.3
- [ ] Rostro 10 · id 345 · textura 5172 · etiqueta 2.2
- [ ] Rostro 11 · id 346 · textura 5174 · etiqueta 3.2
- [ ] Rostro 12 · id 347 · textura 5175 · etiqueta 4.2
- [ ] Rostro 13 · id 379 · textura 5176 · etiqueta 5.1
- [ ] Rostro 14 · id 380 · textura 5177 · etiqueta 2.3
- [ ] Rostro 15 · id 381 · textura 5178 · etiqueta 3.3
- [ ] Rostro 16 · id 382 · textura 5179 · etiqueta 4.3
- [ ] Rostro 17 · id 668 · textura 5931 · etiqueta retro

### Selotrop · Femenino

Traje habitual: id 37, textura 3180.

- [x] Rostro 1 · id 249 · textura 3191 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-f.webp)
- [x] Rostro 2 · id 250 · textura 3192 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-2-f.webp)
- [x] Rostro 3 · id 251 · textura 3193 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-3-f.webp)
- [x] Rostro 4 · id 252 · textura 3194 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-4-f.webp)
- [x] Rostro 5 · id 253 · textura 3195 · etiqueta 5 · [Ver retrato](../../../public/avatars/classes/v1/eliotrope-look-5-f.webp)
- [ ] Rostro 6 · id 254 · textura 3196 · etiqueta 2.1
- [ ] Rostro 7 · id 255 · textura 3197 · etiqueta 3.1
- [ ] Rostro 8 · id 256 · textura 3198 · etiqueta 4.1
- [ ] Rostro 9 · id 348 · textura 5180 · etiqueta 1.3
- [ ] Rostro 10 · id 350 · textura 5181 · etiqueta 2.2
- [ ] Rostro 11 · id 351 · textura 5182 · etiqueta 3.2
- [ ] Rostro 12 · id 352 · textura 5183 · etiqueta 4.2
- [ ] Rostro 13 · id 383 · textura 5185 · etiqueta 5.1
- [ ] Rostro 14 · id 384 · textura 5186 · etiqueta 2.3
- [ ] Rostro 15 · id 385 · textura 5187 · etiqueta 3.3
- [ ] Rostro 16 · id 386 · textura 5188 · etiqueta 4.3
- [ ] Rostro 17 · id 669 · textura 5932 · etiqueta retro

### Feca · Masculino

Traje habitual: id 2, textura 10.

- [x] Rostro 1 · id 1 · textura 2012 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/feca-m.webp)
- [x] Rostro 2 · id 2 · textura 2013 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-2-m.webp)
- [x] Rostro 3 · id 3 · textura 2014 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-3-m.webp)
- [x] Rostro 4 · id 4 · textura 2015 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-4-m.webp)
- [x] Rostro 5 · id 5 · textura 2016 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-5-m.webp)
- [ ] Rostro 6 · id 6 · textura 2017 · etiqueta 2.1
- [ ] Rostro 7 · id 7 · textura 2018 · etiqueta 3.1
- [ ] Rostro 8 · id 8 · textura 2019 · etiqueta 4.1
- [ ] Rostro 9 · id 358 · textura 5242 · etiqueta 1.2
- [ ] Rostro 10 · id 359 · textura 5247 · etiqueta 2.2
- [ ] Rostro 11 · id 360 · textura 5244 · etiqueta 3.2
- [ ] Rostro 12 · id 361 · textura 5249 · etiqueta 4.2
- [ ] Rostro 13 · id 375 · textura 5246 · etiqueta 1.3
- [ ] Rostro 14 · id 376 · textura 5243 · etiqueta 2.3
- [ ] Rostro 15 · id 377 · textura 5248 · etiqueta 3.3
- [ ] Rostro 16 · id 378 · textura 5245 · etiqueta 4.3
- [ ] Rostro 17 · id 638 · textura 5901 · etiqueta retro

### Feca · Femenino

Traje habitual: id 3, textura 11.

- [x] Rostro 1 · id 9 · textura 2020 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/feca-f.webp)
- [x] Rostro 2 · id 10 · textura 2021 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-2-f.webp)
- [x] Rostro 3 · id 11 · textura 2022 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-3-f.webp)
- [x] Rostro 4 · id 12 · textura 2023 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-4-f.webp)
- [x] Rostro 5 · id 13 · textura 2024 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/feca-look-5-f.webp)
- [ ] Rostro 6 · id 14 · textura 2025 · etiqueta 2.1
- [ ] Rostro 7 · id 15 · textura 2026 · etiqueta 3.1
- [ ] Rostro 8 · id 16 · textura 2027 · etiqueta 4.1
- [ ] Rostro 9 · id 353 · textura 5254 · etiqueta 1.2
- [ ] Rostro 10 · id 354 · textura 5251 · etiqueta 2.2
- [ ] Rostro 11 · id 356 · textura 5252 · etiqueta 3.2
- [ ] Rostro 12 · id 357 · textura 5253 · etiqueta 4.2
- [ ] Rostro 13 · id 371 · textura 5250 · etiqueta 1.3
- [ ] Rostro 14 · id 372 · textura 5255 · etiqueta 2.3
- [ ] Rostro 15 · id 373 · textura 5256 · etiqueta 3.3
- [ ] Rostro 16 · id 374 · textura 5257 · etiqueta 4.3
- [ ] Rostro 17 · id 639 · textura 5902 · etiqueta retro

### Steamer · Masculino

Traje habitual: id 34, textura 1663.

- [x] Rostro 1 · id 225 · textura 2236 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-m.webp)
- [x] Rostro 2 · id 226 · textura 2237 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-2-m.webp)
- [x] Rostro 3 · id 227 · textura 2238 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-3-m.webp)
- [x] Rostro 4 · id 228 · textura 2239 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-4-m.webp)
- [x] Rostro 5 · id 229 · textura 2240 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-5-m.webp)
- [ ] Rostro 6 · id 230 · textura 2241 · etiqueta 2.1
- [ ] Rostro 7 · id 231 · textura 2242 · etiqueta 3.1
- [ ] Rostro 8 · id 232 · textura 2243 · etiqueta 4.1
- [ ] Rostro 9 · id 464 · textura 5396 · etiqueta 1.2
- [ ] Rostro 10 · id 466 · textura 5397 · etiqueta 2.2
- [ ] Rostro 11 · id 467 · textura 5398 · etiqueta 3.2
- [ ] Rostro 12 · id 469 · textura 5401 · etiqueta 4.2
- [ ] Rostro 13 · id 465 · textura 5399 · etiqueta 1.3
- [ ] Rostro 14 · id 468 · textura 5400 · etiqueta 3.3
- [ ] Rostro 15 · id 666 · textura 5929 · etiqueta retro

### Steamer · Femenino

Traje habitual: id 35, textura 1664.

- [x] Rostro 1 · id 233 · textura 2244 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-f.webp)
- [x] Rostro 2 · id 234 · textura 2245 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-2-f.webp)
- [x] Rostro 3 · id 235 · textura 2246 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-3-f.webp)
- [x] Rostro 4 · id 236 · textura 2247 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-4-f.webp)
- [x] Rostro 5 · id 237 · textura 2248 · etiqueta 1.1 · [Ver retrato](../../../public/avatars/classes/v1/foggernaut-look-5-f.webp)
- [ ] Rostro 6 · id 238 · textura 2249 · etiqueta 2.1
- [ ] Rostro 7 · id 239 · textura 2250 · etiqueta 3.1
- [ ] Rostro 8 · id 240 · textura 2251 · etiqueta 4.1
- [ ] Rostro 9 · id 457 · textura 5402 · etiqueta 1.2
- [ ] Rostro 10 · id 459 · textura 5403 · etiqueta 2.2
- [ ] Rostro 11 · id 461 · textura 5406 · etiqueta 3.2
- [ ] Rostro 12 · id 463 · textura 5407 · etiqueta 4.2
- [ ] Rostro 13 · id 458 · textura 5405 · etiqueta 1.3
- [ ] Rostro 14 · id 462 · textura 5404 · etiqueta 3.3
- [ ] Rostro 15 · id 667 · textura 5930 · etiqueta retro

### Forjalanza · Masculino

Traje habitual: id 5, textura 3221.

- [x] Rostro 1 · id 294 · textura 3090 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-m.webp)
- [x] Rostro 2 · id 295 · textura 3091 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-2-m.webp)
- [x] Rostro 3 · id 296 · textura 3095 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-3-m.webp)
- [x] Rostro 4 · id 297 · textura 3098 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-4-m.webp)
- [x] Rostro 5 · id 298 · textura 3103 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-5-m.webp)
- [ ] Rostro 6 · id 299 · textura 3104 · etiqueta 2.2
- [ ] Rostro 7 · id 300 · textura 3105 · etiqueta 3.2
- [ ] Rostro 8 · id 301 · textura 3124 · etiqueta 4.2
- [ ] Rostro 9 · id 550 · textura 5505 · etiqueta 1.3
- [ ] Rostro 10 · id 551 · textura 5506 · etiqueta 2.3
- [ ] Rostro 11 · id 553 · textura 5509 · etiqueta 3.3
- [ ] Rostro 12 · id 554 · textura 5507 · etiqueta 4.3
- [ ] Rostro 13 · id 552 · textura 5508 · etiqueta 2.4
- [ ] Rostro 14 · id 555 · textura 5515 · etiqueta 4.4
- [ ] Rostro 15 · id 674 · textura 5937 · etiqueta retro

### Forjalanza · Femenino

Traje habitual: id 4, textura 3633.

- [x] Rostro 1 · id 302 · textura 3106 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-f.webp)
- [x] Rostro 2 · id 303 · textura 3108 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-2-f.webp)
- [x] Rostro 3 · id 304 · textura 3112 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-3-f.webp)
- [x] Rostro 4 · id 305 · textura 3115 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-4-f.webp)
- [x] Rostro 5 · id 306 · textura 3143 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/forgelance-look-5-f.webp)
- [ ] Rostro 6 · id 307 · textura 3121 · etiqueta 2.2
- [ ] Rostro 7 · id 308 · textura 3122 · etiqueta 3.2
- [ ] Rostro 8 · id 309 · textura 3123 · etiqueta 4.1
- [ ] Rostro 9 · id 556 · textura 5510 · etiqueta 1.3
- [ ] Rostro 10 · id 558 · textura 5516 · etiqueta 2.3
- [ ] Rostro 11 · id 560 · textura 5512 · etiqueta 3.3
- [ ] Rostro 12 · id 561 · textura 5514 · etiqueta 4.3
- [ ] Rostro 13 · id 557 · textura 5511 · etiqueta 1.4
- [ ] Rostro 14 · id 559 · textura 5513 · etiqueta 2.4
- [ ] Rostro 15 · id 675 · textura 5938 · etiqueta retro

### Hipermago · Masculino

Traje habitual: id 38, textura 3285.

- [x] Rostro 1 · id 257 · textura 3289 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-m.webp)
- [x] Rostro 2 · id 258 · textura 3290 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-2-m.webp)
- [x] Rostro 3 · id 259 · textura 3291 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-3-m.webp)
- [x] Rostro 4 · id 260 · textura 3292 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-4-m.webp)
- [x] Rostro 5 · id 261 · textura 3293 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-5-m.webp)
- [ ] Rostro 6 · id 262 · textura 3294 · etiqueta 2.2
- [ ] Rostro 7 · id 263 · textura 3295 · etiqueta 3.2
- [ ] Rostro 8 · id 264 · textura 3296 · etiqueta 4.2
- [ ] Rostro 9 · id 431 · textura 5359 · etiqueta 1.3
- [ ] Rostro 10 · id 434 · textura 5360 · etiqueta 2.3
- [ ] Rostro 11 · id 437 · textura 5357 · etiqueta 3.3
- [ ] Rostro 12 · id 439 · textura 5362 · etiqueta 4.3
- [ ] Rostro 13 · id 432 · textura 5355 · etiqueta 1.4
- [ ] Rostro 14 · id 435 · textura 5356 · etiqueta 2.4
- [ ] Rostro 15 · id 438 · textura 5361 · etiqueta 3.4
- [ ] Rostro 16 · id 440 · textura 5358 · etiqueta 4.4
- [ ] Rostro 17 · id 670 · textura 5933 · etiqueta retro

### Hipermago · Femenino

Traje habitual: id 39, textura 3286.

- [x] Rostro 1 · id 265 · textura 3297 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-f.webp)
- [x] Rostro 2 · id 266 · textura 3298 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-2-f.webp)
- [x] Rostro 3 · id 267 · textura 3299 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-3-f.webp)
- [x] Rostro 4 · id 268 · textura 3300 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-4-f.webp)
- [x] Rostro 5 · id 269 · textura 3301 · etiqueta 2.2 · [Ver retrato](../../../public/avatars/classes/v1/huppermage-look-5-f.webp)
- [ ] Rostro 6 · id 270 · textura 3302 · etiqueta 1.2
- [ ] Rostro 7 · id 271 · textura 3303 · etiqueta 3.2
- [ ] Rostro 8 · id 272 · textura 3304 · etiqueta 4.2
- [ ] Rostro 9 · id 421 · textura 5363 · etiqueta 1.3
- [ ] Rostro 10 · id 423 · textura 5368 · etiqueta 2.3
- [ ] Rostro 11 · id 426 · textura 5369 · etiqueta 3.3
- [ ] Rostro 12 · id 428 · textura 5366 · etiqueta 4.3
- [ ] Rostro 13 · id 422 · textura 5367 · etiqueta 1.4
- [ ] Rostro 14 · id 424 · textura 5364 · etiqueta 2.4
- [ ] Rostro 15 · id 427 · textura 5365 · etiqueta 3.4
- [ ] Rostro 16 · id 430 · textura 5370 · etiqueta 4.4
- [ ] Rostro 17 · id 671 · textura 5934 · etiqueta retro

### Yopuka · Masculino

Traje habitual: id 19, textura 80.

- [x] Rostro 1 · id 113 · textura 2124 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/iop-m.webp)
- [x] Rostro 2 · id 114 · textura 2125 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-2-m.webp)
- [x] Rostro 3 · id 115 · textura 2126 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-3-m.webp)
- [x] Rostro 4 · id 116 · textura 2127 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-4-m.webp)
- [x] Rostro 5 · id 117 · textura 2128 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-5-m.webp)
- [ ] Rostro 6 · id 118 · textura 2129 · etiqueta 2.2
- [ ] Rostro 7 · id 119 · textura 2130 · etiqueta 3.2
- [ ] Rostro 8 · id 120 · textura 2131 · etiqueta 4.2
- [ ] Rostro 9 · id 310 · textura 5228 · etiqueta 1.3
- [ ] Rostro 10 · id 317 · textura 5229 · etiqueta 2.3
- [ ] Rostro 11 · id 315 · textura 5230 · etiqueta 3.3
- [ ] Rostro 12 · id 311 · textura 5231 · etiqueta 4.3
- [ ] Rostro 13 · id 503 · textura 5451 · etiqueta 1.4
- [ ] Rostro 14 · id 504 · textura 5452 · etiqueta 4.4
- [ ] Rostro 15 · id 652 · textura 5915 · etiqueta retro

### Yopuka · Femenino

Traje habitual: id 20, textura 81.

- [x] Rostro 1 · id 121 · textura 2132 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/iop-f.webp)
- [x] Rostro 2 · id 122 · textura 2133 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-2-f.webp)
- [x] Rostro 3 · id 123 · textura 2134 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-3-f.webp)
- [x] Rostro 4 · id 124 · textura 2135 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-4-f.webp)
- [x] Rostro 5 · id 125 · textura 2136 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/iop-look-5-f.webp)
- [ ] Rostro 6 · id 126 · textura 2137 · etiqueta 2.2
- [ ] Rostro 7 · id 127 · textura 2138 · etiqueta 3.2
- [ ] Rostro 8 · id 128 · textura 2139 · etiqueta 4.2
- [ ] Rostro 9 · id 333 · textura 5232 · etiqueta 1.3
- [ ] Rostro 10 · id 319 · textura 5233 · etiqueta 2.3
- [ ] Rostro 11 · id 328 · textura 5234 · etiqueta 3.3
- [ ] Rostro 12 · id 318 · textura 5235 · etiqueta 4.3
- [ ] Rostro 13 · id 362 · textura 5236 · etiqueta 1.4
- [ ] Rostro 14 · id 505 · textura 5453 · etiqueta 2.4
- [ ] Rostro 15 · id 653 · textura 5916 · etiqueta retro

### Zobal · Masculino

Traje habitual: id 32, textura 1437.

- [x] Rostro 1 · id 209 · textura 2220 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-m.webp)
- [x] Rostro 2 · id 210 · textura 2221 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-2-m.webp)
- [x] Rostro 3 · id 211 · textura 2222 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-3-m.webp)
- [x] Rostro 4 · id 212 · textura 2223 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-4-m.webp)
- [x] Rostro 5 · id 213 · textura 2224 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-5-m.webp)
- [ ] Rostro 6 · id 214 · textura 2225 · etiqueta 2.2
- [ ] Rostro 7 · id 215 · textura 2226 · etiqueta 3.2
- [ ] Rostro 8 · id 216 · textura 2227 · etiqueta 4.2
- [ ] Rostro 9 · id 518 · textura 5454 · etiqueta 1.3
- [ ] Rostro 10 · id 519 · textura 5455 · etiqueta 2.3
- [ ] Rostro 11 · id 521 · textura 5456 · etiqueta 3.3
- [ ] Rostro 12 · id 522 · textura 5457 · etiqueta 4.3
- [ ] Rostro 13 · id 520 · textura 5458 · etiqueta 2.4
- [ ] Rostro 14 · id 523 · textura 5459 · etiqueta 4.4
- [ ] Rostro 15 · id 664 · textura 5927 · etiqueta retro

### Zobal · Femenino

Traje habitual: id 33, textura 1438.

- [x] Rostro 1 · id 217 · textura 2228 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-f.webp)
- [x] Rostro 2 · id 218 · textura 2229 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-2-f.webp)
- [x] Rostro 3 · id 219 · textura 2230 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-3-f.webp)
- [x] Rostro 4 · id 220 · textura 2231 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-4-f.webp)
- [x] Rostro 5 · id 221 · textura 2232 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/masqueraider-look-5-f.webp)
- [ ] Rostro 6 · id 222 · textura 2233 · etiqueta 2.2
- [ ] Rostro 7 · id 223 · textura 2234 · etiqueta 3.2
- [ ] Rostro 8 · id 224 · textura 2235 · etiqueta 4.2
- [ ] Rostro 9 · id 512 · textura 5460 · etiqueta 1.3
- [ ] Rostro 10 · id 514 · textura 5461 · etiqueta 2.3
- [ ] Rostro 11 · id 515 · textura 5464 · etiqueta 3.3
- [ ] Rostro 12 · id 516 · textura 5462 · etiqueta 4.3
- [ ] Rostro 13 · id 513 · textura 5463 · etiqueta 2.4
- [ ] Rostro 14 · id 517 · textura 5465 · etiqueta 4.4
- [ ] Rostro 15 · id 665 · textura 5928 · etiqueta retro

### Osamodas · Masculino

Traje habitual: id 6, textura 20.

- [x] Rostro 1 · id 17 · textura 2028 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-m.webp)
- [x] Rostro 2 · id 18 · textura 2029 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-2-m.webp)
- [x] Rostro 3 · id 19 · textura 2030 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-3-m.webp)
- [x] Rostro 4 · id 20 · textura 2031 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-4-m.webp)
- [x] Rostro 5 · id 21 · textura 2032 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-5-m.webp)
- [ ] Rostro 6 · id 22 · textura 2033 · etiqueta 2.2
- [ ] Rostro 7 · id 23 · textura 2034 · etiqueta 3.2
- [ ] Rostro 8 · id 24 · textura 2035 · etiqueta 4.2
- [ ] Rostro 9 · id 582 · textura 5543 · etiqueta 1.3
- [ ] Rostro 10 · id 584 · textura 5544 · etiqueta 2.3
- [ ] Rostro 11 · id 585 · textura 5547 · etiqueta 3.3
- [ ] Rostro 12 · id 586 · textura 5545 · etiqueta 4.3
- [ ] Rostro 13 · id 583 · textura 5546 · etiqueta 1.4
- [ ] Rostro 14 · id 587 · textura 5548 · etiqueta 4.4
- [ ] Rostro 15 · id 640 · textura 5903 · etiqueta retro

### Osamodas · Femenino

Traje habitual: id 7, textura 21.

- [x] Rostro 1 · id 25 · textura 2036 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-f.webp)
- [x] Rostro 2 · id 26 · textura 2037 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-2-f.webp)
- [x] Rostro 3 · id 27 · textura 2038 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-3-f.webp)
- [x] Rostro 4 · id 28 · textura 2039 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-4-f.webp)
- [x] Rostro 5 · id 29 · textura 2040 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/osamodas-look-5-f.webp)
- [ ] Rostro 6 · id 30 · textura 2041 · etiqueta 2.2
- [ ] Rostro 7 · id 31 · textura 2042 · etiqueta 3.2
- [ ] Rostro 8 · id 32 · textura 2043 · etiqueta 4.2
- [ ] Rostro 9 · id 576 · textura 5549 · etiqueta 1.3
- [ ] Rostro 10 · id 578 · textura 5550 · etiqueta 2.3
- [ ] Rostro 11 · id 581 · textura 5554 · etiqueta 3.3
- [ ] Rostro 12 · id 580 · textura 5551 · etiqueta 4.3
- [ ] Rostro 13 · id 577 · textura 5552 · etiqueta 1.4
- [ ] Rostro 14 · id 579 · textura 5553 · etiqueta 2.4
- [ ] Rostro 15 · id 641 · textura 5904 · etiqueta retro

### Uginak · Masculino

Traje habitual: id 40, textura 3498.

- [x] Rostro 1 · id 273 · textura 3502 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-m.webp)
- [x] Rostro 2 · id 285 · textura 3503 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-2-m.webp)
- [x] Rostro 3 · id 286 · textura 3504 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-3-m.webp)
- [x] Rostro 4 · id 287 · textura 3505 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-4-m.webp)
- [x] Rostro 5 · id 288 · textura 3506 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-5-m.webp)
- [ ] Rostro 6 · id 289 · textura 3507 · etiqueta 2.2
- [ ] Rostro 7 · id 290 · textura 3508 · etiqueta 3.2
- [ ] Rostro 8 · id 291 · textura 3509 · etiqueta 4.2
- [ ] Rostro 9 · id 599 · textura 5536 · etiqueta 1.3
- [ ] Rostro 10 · id 594 · textura 5531 · etiqueta 2.3
- [ ] Rostro 11 · id 596 · textura 5532 · etiqueta 3.3
- [ ] Rostro 12 · id 598 · textura 5533 · etiqueta 4.3
- [ ] Rostro 13 · id 595 · textura 5534 · etiqueta 2.4
- [ ] Rostro 14 · id 597 · textura 5535 · etiqueta 3.4
- [ ] Rostro 15 · id 672 · textura 5935 · etiqueta retro

### Uginak · Femenino

Traje habitual: id 42, textura 3499.

- [x] Rostro 1 · id 275 · textura 3510 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-f.webp)
- [x] Rostro 2 · id 276 · textura 3511 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-2-f.webp)
- [x] Rostro 3 · id 277 · textura 3512 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-3-f.webp)
- [x] Rostro 4 · id 280 · textura 3513 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-4-f.webp)
- [x] Rostro 5 · id 281 · textura 3514 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/ouginak-look-5-f.webp)
- [ ] Rostro 6 · id 282 · textura 3515 · etiqueta 2.2
- [ ] Rostro 7 · id 283 · textura 3516 · etiqueta 3.2
- [ ] Rostro 8 · id 284 · textura 3517 · etiqueta 4.2
- [ ] Rostro 9 · id 588 · textura 5540 · etiqueta 1.3
- [ ] Rostro 10 · id 589 · textura 5537 · etiqueta 2.3
- [ ] Rostro 11 · id 591 · textura 5538 · etiqueta 3.3
- [ ] Rostro 12 · id 592 · textura 5539 · etiqueta 4.3
- [ ] Rostro 13 · id 590 · textura 5541 · etiqueta 2.4
- [ ] Rostro 14 · id 593 · textura 5542 · etiqueta 4.4
- [ ] Rostro 15 · id 673 · textura 5936 · etiqueta retro

### Pandawa · Masculino

Traje habitual: id 28, textura 120.

- [x] Rostro 1 · id 177 · textura 2188 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-m.webp)
- [x] Rostro 2 · id 178 · textura 2189 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-2-m.webp)
- [x] Rostro 3 · id 179 · textura 2190 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-3-m.webp)
- [x] Rostro 4 · id 180 · textura 2191 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-4-m.webp)
- [x] Rostro 5 · id 181 · textura 2192 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-5-m.webp)
- [ ] Rostro 6 · id 182 · textura 2193 · etiqueta 2.2
- [ ] Rostro 7 · id 183 · textura 2194 · etiqueta 3.2
- [ ] Rostro 8 · id 184 · textura 2195 · etiqueta 4.2
- [ ] Rostro 9 · id 534 · textura 5467 · etiqueta 1.3
- [ ] Rostro 10 · id 531 · textura 5466 · etiqueta 2.3
- [ ] Rostro 11 · id 536 · textura 5470 · etiqueta 3.3
- [ ] Rostro 12 · id 537 · textura 5468 · etiqueta 4.3
- [ ] Rostro 13 · id 532 · textura 5469 · etiqueta 1.4
- [ ] Rostro 14 · id 535 · textura 5471 · etiqueta 2.4
- [ ] Rostro 15 · id 660 · textura 5923 · etiqueta retro

### Pandawa · Femenino

Traje habitual: id 29, textura 121.

- [x] Rostro 1 · id 185 · textura 2196 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-f.webp)
- [x] Rostro 2 · id 186 · textura 2197 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-2-f.webp)
- [x] Rostro 3 · id 187 · textura 2198 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-3-f.webp)
- [x] Rostro 4 · id 188 · textura 2199 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-4-f.webp)
- [x] Rostro 5 · id 189 · textura 2200 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/pandawa-look-5-f.webp)
- [ ] Rostro 6 · id 190 · textura 2201 · etiqueta 2.2
- [ ] Rostro 7 · id 191 · textura 2202 · etiqueta 3.2
- [ ] Rostro 8 · id 192 · textura 2203 · etiqueta 4.2
- [ ] Rostro 9 · id 524 · textura 5472 · etiqueta 1.3
- [ ] Rostro 10 · id 526 · textura 5476 · etiqueta 2.3
- [ ] Rostro 11 · id 527 · textura 5473 · etiqueta 3.3
- [ ] Rostro 12 · id 529 · textura 5474 · etiqueta 4.3
- [ ] Rostro 13 · id 525 · textura 5475 · etiqueta 1.4
- [ ] Rostro 14 · id 530 · textura 5477 · etiqueta 4.4
- [ ] Rostro 15 · id 661 · textura 5924 · etiqueta retro

### Tymador · Masculino

Traje habitual: id 30, textura 1405.

- [x] Rostro 1 · id 193 · textura 2204 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/rogue-m.webp)
- [x] Rostro 2 · id 194 · textura 2205 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-2-m.webp)
- [x] Rostro 3 · id 195 · textura 2206 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-3-m.webp)
- [x] Rostro 4 · id 196 · textura 2207 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-4-m.webp)
- [x] Rostro 5 · id 197 · textura 2208 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-5-m.webp)
- [ ] Rostro 6 · id 198 · textura 2209 · etiqueta 2.2
- [ ] Rostro 7 · id 199 · textura 2210 · etiqueta 3.2
- [ ] Rostro 8 · id 200 · textura 2211 · etiqueta 4.2
- [ ] Rostro 9 · id 538 · textura 5481 · etiqueta 1.3
- [ ] Rostro 10 · id 539 · textura 5478 · etiqueta 2.3
- [ ] Rostro 11 · id 540 · textura 5479 · etiqueta 3.3
- [ ] Rostro 12 · id 542 · textura 5480 · etiqueta 4.3
- [ ] Rostro 13 · id 541 · textura 5482 · etiqueta 3.4
- [ ] Rostro 14 · id 543 · textura 5483 · etiqueta 4.4
- [ ] Rostro 15 · id 662 · textura 5925 · etiqueta retro

### Tymador · Femenino

Traje habitual: id 31, textura 1407.

- [x] Rostro 1 · id 201 · textura 2212 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/rogue-f.webp)
- [x] Rostro 2 · id 202 · textura 2213 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-2-f.webp)
- [x] Rostro 3 · id 203 · textura 2214 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-3-f.webp)
- [x] Rostro 4 · id 204 · textura 2215 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-4-f.webp)
- [x] Rostro 5 · id 205 · textura 2216 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/rogue-look-5-f.webp)
- [ ] Rostro 6 · id 206 · textura 2217 · etiqueta 2.2
- [ ] Rostro 7 · id 207 · textura 2218 · etiqueta 3.2
- [ ] Rostro 8 · id 208 · textura 2219 · etiqueta 4.2
- [ ] Rostro 9 · id 544 · textura 5484 · etiqueta 1.3
- [ ] Rostro 10 · id 545 · textura 5487 · etiqueta 2.3
- [ ] Rostro 11 · id 546 · textura 5485 · etiqueta 3.3
- [ ] Rostro 12 · id 548 · textura 5486 · etiqueta 4.3
- [ ] Rostro 13 · id 547 · textura 5488 · etiqueta 3.4
- [ ] Rostro 14 · id 549 · textura 5489 · etiqueta 4.4
- [ ] Rostro 15 · id 663 · textura 5926 · etiqueta retro

### Sacrógrito · Masculino

Traje habitual: id 26, textura 110.

- [x] Rostro 1 · id 161 · textura 2172 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-m.webp)
- [x] Rostro 2 · id 162 · textura 2173 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-2-m.webp)
- [x] Rostro 3 · id 163 · textura 2174 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-3-m.webp)
- [x] Rostro 4 · id 164 · textura 2175 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-4-m.webp)
- [x] Rostro 5 · id 165 · textura 2176 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-5-m.webp)
- [ ] Rostro 6 · id 166 · textura 2177 · etiqueta 2.2
- [ ] Rostro 7 · id 167 · textura 2178 · etiqueta 3.2
- [ ] Rostro 8 · id 168 · textura 2179 · etiqueta 4.2
- [ ] Rostro 9 · id 396 · textura 5312 · etiqueta 1.3
- [ ] Rostro 10 · id 397 · textura 5313 · etiqueta 2.3
- [ ] Rostro 11 · id 398 · textura 5314 · etiqueta 3.3
- [ ] Rostro 12 · id 399 · textura 5315 · etiqueta 4.3
- [ ] Rostro 13 · id 400 · textura 5316 · etiqueta 1.4
- [ ] Rostro 14 · id 401 · textura 5317 · etiqueta 2.4
- [ ] Rostro 15 · id 402 · textura 5318 · etiqueta 3.4
- [ ] Rostro 16 · id 403 · textura 5319 · etiqueta 4.4
- [ ] Rostro 17 · id 658 · textura 5921 · etiqueta retro

### Sacrógrito · Femenino

Traje habitual: id 27, textura 111.

- [x] Rostro 1 · id 169 · textura 2180 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-f.webp)
- [x] Rostro 2 · id 170 · textura 2181 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-2-f.webp)
- [x] Rostro 3 · id 171 · textura 2182 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-3-f.webp)
- [x] Rostro 4 · id 172 · textura 2183 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-4-f.webp)
- [x] Rostro 5 · id 173 · textura 2184 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sacrier-look-5-f.webp)
- [ ] Rostro 6 · id 174 · textura 2185 · etiqueta 2.2
- [ ] Rostro 7 · id 175 · textura 2186 · etiqueta 3.2
- [ ] Rostro 8 · id 176 · textura 2187 · etiqueta 4.2
- [ ] Rostro 9 · id 387 · textura 5320 · etiqueta 1.3
- [ ] Rostro 10 · id 388 · textura 5325 · etiqueta 2.3
- [ ] Rostro 11 · id 389 · textura 5322 · etiqueta 3.3
- [ ] Rostro 12 · id 390 · textura 5327 · etiqueta 4.3
- [ ] Rostro 13 · id 392 · textura 5324 · etiqueta 1.4
- [ ] Rostro 14 · id 393 · textura 5321 · etiqueta 2.4
- [ ] Rostro 15 · id 394 · textura 5326 · etiqueta 3.4
- [ ] Rostro 16 · id 395 · textura 5323 · etiqueta 4.4
- [ ] Rostro 17 · id 659 · textura 5922 · etiqueta retro

### Sadida · Masculino

Traje habitual: id 23, textura 100.

- [x] Rostro 1 · id 145 · textura 2156 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sadida-m.webp)
- [x] Rostro 2 · id 146 · textura 2157 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-2-m.webp)
- [x] Rostro 3 · id 147 · textura 2158 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-3-m.webp)
- [x] Rostro 4 · id 148 · textura 2159 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-4-m.webp)
- [x] Rostro 5 · id 149 · textura 2160 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-5-m.webp)
- [ ] Rostro 6 · id 150 · textura 2161 · etiqueta 2.2
- [ ] Rostro 7 · id 151 · textura 2162 · etiqueta 3.2
- [ ] Rostro 8 · id 152 · textura 2163 · etiqueta 4.2
- [ ] Rostro 9 · id 477 · textura 5413 · etiqueta 1.3
- [ ] Rostro 10 · id 478 · textura 5414 · etiqueta 2.3
- [ ] Rostro 11 · id 481 · textura 5417 · etiqueta 3.3
- [ ] Rostro 12 · id 482 · textura 5418 · etiqueta 4.3
- [ ] Rostro 13 · id 479 · textura 5416 · etiqueta 1.4
- [ ] Rostro 14 · id 480 · textura 5415 · etiqueta 4.4
- [ ] Rostro 15 · id 656 · textura 5919 · etiqueta retro

### Sadida · Femenino

Traje habitual: id 25, textura 101.

- [x] Rostro 1 · id 153 · textura 2164 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sadida-f.webp)
- [x] Rostro 2 · id 154 · textura 2165 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-2-f.webp)
- [x] Rostro 3 · id 155 · textura 2166 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-3-f.webp)
- [x] Rostro 4 · id 156 · textura 2167 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-4-f.webp)
- [x] Rostro 5 · id 157 · textura 2168 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sadida-look-5-f.webp)
- [ ] Rostro 6 · id 158 · textura 2169 · etiqueta 2.2
- [ ] Rostro 7 · id 159 · textura 2170 · etiqueta 3.2
- [ ] Rostro 8 · id 160 · textura 2171 · etiqueta 4.2
- [ ] Rostro 9 · id 470 · textura 5419 · etiqueta 1.3
- [ ] Rostro 10 · id 471 · textura 5420 · etiqueta 2.3
- [ ] Rostro 11 · id 473 · textura 5423 · etiqueta 3.3
- [ ] Rostro 12 · id 474 · textura 5421 · etiqueta 4.3
- [ ] Rostro 13 · id 475 · textura 5422 · etiqueta 1.4
- [ ] Rostro 14 · id 476 · textura 5424 · etiqueta 4.4
- [ ] Rostro 15 · id 657 · textura 5920 · etiqueta retro

### Sram · Masculino

Traje habitual: id 10, textura 40.

- [x] Rostro 1 · id 49 · textura 2060 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sram-m.webp)
- [x] Rostro 2 · id 50 · textura 2061 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-2-m.webp)
- [x] Rostro 3 · id 51 · textura 2062 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-3-m.webp)
- [x] Rostro 4 · id 52 · textura 2063 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-4-m.webp)
- [x] Rostro 5 · id 53 · textura 2064 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-5-m.webp)
- [ ] Rostro 6 · id 54 · textura 2065 · etiqueta 2.2
- [ ] Rostro 7 · id 55 · textura 2066 · etiqueta 3.2
- [ ] Rostro 8 · id 56 · textura 2067 · etiqueta 4.2
- [ ] Rostro 9 · id 562 · textura 5517 · etiqueta 1.3
- [ ] Rostro 10 · id 564 · textura 5518 · etiqueta 2.3
- [ ] Rostro 11 · id 565 · textura 5521 · etiqueta 3.3
- [ ] Rostro 12 · id 566 · textura 5519 · etiqueta 4.3
- [ ] Rostro 13 · id 563 · textura 5520 · etiqueta 1.4
- [ ] Rostro 14 · id 567 · textura 5522 · etiqueta 4.4
- [ ] Rostro 15 · id 644 · textura 5907 · etiqueta retro

### Sram · Femenino

Traje habitual: id 11, textura 41.

- [x] Rostro 1 · id 57 · textura 2068 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/sram-f.webp)
- [x] Rostro 2 · id 58 · textura 2069 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-2-f.webp)
- [x] Rostro 3 · id 59 · textura 2070 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-3-f.webp)
- [x] Rostro 4 · id 60 · textura 2071 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-4-f.webp)
- [x] Rostro 5 · id 61 · textura 2072 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/sram-look-5-f.webp)
- [ ] Rostro 6 · id 62 · textura 2073 · etiqueta 2.2
- [ ] Rostro 7 · id 63 · textura 2074 · etiqueta 3.2
- [ ] Rostro 8 · id 64 · textura 2075 · etiqueta 4.2
- [ ] Rostro 9 · id 568 · textura 5523 · etiqueta 1.3
- [ ] Rostro 10 · id 570 · textura 5524 · etiqueta 2.3
- [ ] Rostro 11 · id 572 · textura 5525 · etiqueta 3.3
- [ ] Rostro 12 · id 574 · textura 5526 · etiqueta 4.3
- [ ] Rostro 13 · id 569 · textura 5527 · etiqueta 1.4
- [ ] Rostro 14 · id 571 · textura 5528 · etiqueta 2.4
- [ ] Rostro 15 · id 573 · textura 5529 · etiqueta 3.4
- [ ] Rostro 16 · id 575 · textura 5530 · etiqueta 4.4
- [ ] Rostro 17 · id 645 · textura 5908 · etiqueta retro

### Xelor · Masculino

Traje habitual: id 12, textura 50.

- [x] Rostro 1 · id 65 · textura 2076 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/xelor-m.webp)
- [x] Rostro 2 · id 66 · textura 2077 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-2-m.webp)
- [x] Rostro 3 · id 67 · textura 2078 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-3-m.webp)
- [x] Rostro 4 · id 68 · textura 2079 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-4-m.webp)
- [x] Rostro 5 · id 69 · textura 2080 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-5-m.webp)
- [ ] Rostro 6 · id 70 · textura 2081 · etiqueta 2.2
- [ ] Rostro 7 · id 71 · textura 2082 · etiqueta 3.2
- [ ] Rostro 8 · id 72 · textura 2083 · etiqueta 4.2
- [ ] Rostro 9 · id 491 · textura 5427 · etiqueta 1.3
- [ ] Rostro 10 · id 493 · textura 5428 · etiqueta 2.3
- [ ] Rostro 11 · id 494 · textura 5429 · etiqueta 3.3
- [ ] Rostro 12 · id 496 · textura 5432 · etiqueta 4.3
- [ ] Rostro 13 · id 492 · textura 5430 · etiqueta 1.4
- [ ] Rostro 14 · id 495 · textura 5431 · etiqueta 3.4
- [ ] Rostro 15 · id 646 · textura 5909 · etiqueta retro

### Xelor · Femenino

Traje habitual: id 13, textura 51.

- [x] Rostro 1 · id 73 · textura 2084 · etiqueta 1 · [Ver retrato](../../../public/avatars/classes/v1/xelor-f.webp)
- [x] Rostro 2 · id 74 · textura 2085 · etiqueta 2 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-2-f.webp)
- [x] Rostro 3 · id 75 · textura 2086 · etiqueta 3 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-3-f.webp)
- [x] Rostro 4 · id 76 · textura 2087 · etiqueta 4 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-4-f.webp)
- [x] Rostro 5 · id 77 · textura 2088 · etiqueta 1.2 · [Ver retrato](../../../public/avatars/classes/v1/xelor-look-5-f.webp)
- [ ] Rostro 6 · id 78 · textura 2089 · etiqueta 2.2
- [ ] Rostro 7 · id 79 · textura 2090 · etiqueta 3.2
- [ ] Rostro 8 · id 80 · textura 2091 · etiqueta 4.2
- [ ] Rostro 9 · id 483 · textura 5433 · etiqueta 1.3
- [ ] Rostro 10 · id 484 · textura 5437 · etiqueta 2.3
- [ ] Rostro 11 · id 487 · textura 5434 · etiqueta 3.3
- [ ] Rostro 12 · id 490 · textura 5435 · etiqueta 4.3
- [ ] Rostro 13 · id 485 · textura 5436 · etiqueta 1.4
- [ ] Rostro 14 · id 489 · textura 5438 · etiqueta 3.4
- [ ] Rostro 15 · id 647 · textura 5910 · etiqueta retro

## Trajes alternativos: después de los rostros

Inventariados sin generar todavía. No se mezclan con la tanda actual de rostros.

### Ocra · Masculino

- [ ] Traje 2 · id 106 · textura 5877 · etiqueta retro

### Ocra · Femenino

- [ ] Traje 2 · id 107 · textura 5878 · etiqueta retro

### Zurcarák · Masculino

- [ ] Traje 2 · id 100 · textura 5871 · etiqueta retro

### Zurcarák · Femenino

- [ ] Traje 2 · id 101 · textura 5872 · etiqueta retro

### Aniripsa · Masculino

- [ ] Traje 2 · id 102 · textura 5873 · etiqueta retro

### Aniripsa · Femenino

- [ ] Traje 2 · id 103 · textura 5874 · etiqueta retro

### Anutrof · Masculino

- [ ] Traje 2 · id 94 · textura 5865 · etiqueta retro

### Anutrof · Femenino

- [ ] Traje 2 · id 95 · textura 5866 · etiqueta retro

### Selotrop · Masculino

- [ ] Traje 2 · id 120 · textura 5891 · etiqueta retro

### Selotrop · Femenino

- [ ] Traje 2 · id 121 · textura 5892 · etiqueta retro

### Feca · Masculino

- [ ] Traje 2 · id 90 · textura 5861 · etiqueta retro

### Feca · Femenino

- [ ] Traje 2 · id 91 · textura 5862 · etiqueta retro

### Steamer · Masculino

- [ ] Traje 2 · id 118 · textura 5889 · etiqueta retro

### Steamer · Femenino

- [ ] Traje 2 · id 119 · textura 5890 · etiqueta retro

### Forjalanza · Masculino

- [ ] Traje 2 · id 126 · textura 5897 · etiqueta retro

### Forjalanza · Femenino

- [ ] Traje 2 · id 127 · textura 5898 · etiqueta retro

### Hipermago · Masculino

- [ ] Traje 2 · id 122 · textura 5893 · etiqueta retro

### Hipermago · Femenino

- [ ] Traje 2 · id 123 · textura 5894 · etiqueta retro

### Yopuka · Masculino

- [ ] Traje 2 · id 104 · textura 5875 · etiqueta retro

### Yopuka · Femenino

- [ ] Traje 2 · id 105 · textura 5876 · etiqueta retro

### Zobal · Masculino

- [ ] Traje 2 · id 116 · textura 5887 · etiqueta retro

### Zobal · Femenino

- [ ] Traje 2 · id 117 · textura 5888 · etiqueta retro

### Osamodas · Masculino

- [ ] Traje 2 · id 92 · textura 5863 · etiqueta retro

### Osamodas · Femenino

- [ ] Traje 2 · id 93 · textura 5864 · etiqueta retro

### Uginak · Masculino

- [ ] Traje 2 · id 124 · textura 5895 · etiqueta retro

### Uginak · Femenino

- [ ] Traje 2 · id 125 · textura 5896 · etiqueta retro

### Pandawa · Masculino

- [ ] Traje 2 · id 112 · textura 5883 · etiqueta retro

### Pandawa · Femenino

- [ ] Traje 2 · id 113 · textura 5884 · etiqueta retro

### Tymador · Masculino

- [ ] Traje 2 · id 114 · textura 5885 · etiqueta retro

### Tymador · Femenino

- [ ] Traje 2 · id 115 · textura 5886 · etiqueta retro

### Sacrógrito · Masculino

- [ ] Traje 2 · id 110 · textura 5881 · etiqueta retro

### Sacrógrito · Femenino

- [ ] Traje 2 · id 111 · textura 5882 · etiqueta retro

### Sadida · Masculino

- [ ] Traje 2 · id 108 · textura 5879 · etiqueta retro

### Sadida · Femenino

- [ ] Traje 2 · id 109 · textura 5880 · etiqueta retro

### Sram · Masculino

- [ ] Traje 2 · id 96 · textura 5867 · etiqueta retro

### Sram · Femenino

- [ ] Traje 2 · id 97 · textura 5868 · etiqueta retro

### Xelor · Masculino

- [ ] Traje 2 · id 98 · textura 5869 · etiqueta retro

### Xelor · Femenino

- [ ] Traje 2 · id 99 · textura 5870 · etiqueta retro
