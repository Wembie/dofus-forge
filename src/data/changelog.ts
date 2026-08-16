export const DOFUS_GAME_VERSION = __DOFUS_VERSION__  // auto desde public/data/version.json

export type ChangelogEntry = {
  version: string
  date:    string
  notes:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.48',
    date: '2026-08-16',
    notes: [
      'Comparar: rediseño completo — hero cards con portrait + badges (AP/MP/PV/Alcance/Crítico)',
      'Equipment diff: filas por slot alineadas, mismos items atenuados, diferentes resaltados',
      'Tabla de stats: secciones agrupadas con colores verde/rojo por comparación',
      'Botón Compartir: codifica ambos builds en URL #/?b=A&c=B',
      'Auto-carga Build B desde parámetro c= de la URL',
      'Modal overlay para cambiar Build B',
    ],
  },
  {
    version: '0.2.47',
    date: '2026-08-16',
    notes: [
      'Catálogo: armas muestran "Ataque de Arma" separado de "Efectos" (como en el tooltip del slot)',
      'Clasificación por effect_id igual que en el tooltip — consistente en toda la UI',
    ],
  },
  {
    version: '0.2.46',
    date: '2026-08-16',
    notes: [
      'Brand "Dofus Forge": click derecho / botón medio abre nueva pestaña con el build actual',
      'Click izquierdo sigue reseteando el build',
    ],
  },
  {
    version: '0.2.45',
    date: '2026-08-16',
    notes: [
      'Comparar: clic en ⚖ hace auto-scroll al panel de comparación',
      'Comparar: campo para pegar URL compartida — carga Build B sin guardar localmente',
    ],
  },
  {
    version: '0.2.44',
    date: '2026-08-16',
    notes: [
      'Fix: Montura/Compañero muestran ítems en todos los idiomas (ES/FR/PT/DE)',
      'Causa: ETL guardaba tipo localizado ("Dragopavo", "Mascota") en vez del nombre EN canónico',
      'Fix: ETL obtiene tipos EN primero y los aplica como type+slot canónico en todos los idiomas',
    ],
  },
  {
    version: '0.2.43',
    date: '2026-08-16',
    notes: [
      'Modo Comparar: botón ⚖ en header activa comparación de dos builds en paralelo',
      'Panel muestra equipo de Build A vs Build B lado a lado con iconos y nombres',
      'Tabla de stats A vs B con columna Δ — verde = B mejor, rojo = A mejor',
      'Build B se carga desde builds guardados, stats recalculadas con el mismo engine',
    ],
  },
  {
    version: '0.2.42',
    date: '2026-08-16',
    notes: [
      'Hechizos validados: robo vs ganancia de PA/PM correctamente distinguidos (effectIds 84/111/127/128/169)',
      'Nuevos efectos renderizados: +PA ganado, +PM ganado, % Erosión, Curas ×%, buffs de hechizo apilables (⭐ Hechizo: +N base)',
      'ETL regenerado: 19 clases + hechizos comunes con mappings de effectId correctos en ES/EN/FR/PT',
    ],
  },
  {
    version: '0.2.41',
    date: '2026-08-15',
    notes: [
      'Tooltip equipado: ability especial (caja dorada) + descripción de lore al pasar el mouse',
      'i18n ability/description: los textos de habilidades y lore ahora respetan el idioma seleccionado',
      'Efectos basura filtrados: "-special spell-" y "Actitud" ya no aparecen en el tooltip',
    ],
  },
  {
    version: '0.2.40',
    date: '2026-08-15',
    notes: [
      'Layout full-width: ya no hay márgenes vacíos a los lados en pantallas grandes',
      'Sidebar derecha ampliada de 300px a 360px — más espacio para stats y características',
    ],
  },
  {
    version: '0.2.39',
    date: '2026-08-15',
    notes: [
      'Fix: "Ataque de Arma" solo muestra daños reales del arma — stats pasivos van a "Efectos"',
      'Misma stat "Air damage" tenía dos IDs: 189 = ataque del arma, 47 = bonus pasivo — ahora se distinguen por ID',
      'Stats panel: bonuses pasivos de daño en armas ya no se excluyen del cálculo',
    ],
  },
  {
    version: '0.2.38',
    date: '2026-08-15',
    notes: [
      'Forjamagia deshabilitada para Dofus (1–6) y Montura — el botón ✦ no aparece en esos slots',
    ],
  },
  {
    version: '0.2.37',
    date: '2026-08-15',
    notes: [
      'Toast al equipar: notificación "Slot: Item" aparece abajo a la derecha por 2.8s',
      'Dofus sin duplicados: equipar uno ya equipado en otro slot lo mueve automáticamente',
      'Slot labels con número: "Dofus 1"–"Dofus 6", "Anillo 1"/"Anillo 2" en todos los idiomas',
    ],
  },
  {
    version: '0.2.36',
    date: '2026-08-15',
    notes: [
      'Fix: efectos de ataque de armas (Arco, Espada, etc.) ahora aparecen en "Ataque de Arma" correctamente en todos los idiomas',
      'ETL normalizeItem usa is_weapon del API para asignar slot:weapon — no depende del nombre del tipo que varía por idioma',
    ],
  },
  {
    version: '0.2.35',
    date: '2026-08-15',
    notes: [
      'Modal de set: items divididos en "Ya tienes" y "Te falta" con colores diferenciados',
      'Items faltantes muestran badge del slot (ej. 🎩 Sombrero) para saber qué hay que liberar',
      'Bonificaciones del set con colores e íconos iguales al panel de sets activos',
    ],
  },
  {
    version: '0.2.34',
    date: '2026-08-15',
    notes: [
      'Sets activos: 3 columnas para 3+ sets, 2 columnas para 2 sets',
      'Stats panel: títulos "Elementos" y "Combate" más grandes',
    ],
  },
  {
    version: '0.2.33',
    date: '2026-08-15',
    notes: [
      'Panel de hechizos ampliado: ícono 52px, textos de nombre, stats y daños más grandes',
      'Panel de sets activos ampliado: puntos, texto, badge de tier y cuadrícula más grandes',
    ],
  },
  {
    version: '0.2.32',
    date: '2026-08-15',
    notes: [
      'Stats panel — sección combate en una columna: nombres completos visibles sin truncar',
    ],
  },
  {
    version: '0.2.31',
    date: '2026-08-15',
    notes: [
      'Stats panel — íconos de elementos e filas de combate más grandes',
    ],
  },
  {
    version: '0.2.30',
    date: '2026-08-15',
    notes: [
      'Badge HP: eliminado truncate que mostraba "4,..." — número ahora visible completo',
    ],
  },
  {
    version: '0.2.29',
    date: '2026-08-14',
    notes: [
      'Layout desktop: 3 columnas → 2 columnas (equipment + hechizos a la izquierda, sidebar derecha con clase + características + stats)',
      'Badge HP/PV: eliminado clip overflow, números escalan mejor en espacio reducido',
    ],
  },
  {
    version: '0.2.27',
    date: '2026-08-14',
    notes: [
      'i18n completo: todos los strings traducidos en EN / ES / FR / PT',
      'Undo/Redo, modal close, sort labels, SpellsPanel, LanguageSwitcher — todo localizado',
    ],
  },
  {
    version: '0.2.26',
    date: '2026-08-14',
    notes: [
      'i18n: Modal, ClassPicker, CharacteristicsPanel, SetDetailModal, ItemCatalog, EquipmentGrid',
      'Firma de Forjamago se guarda en la URL al compartir',
    ],
  },
  {
    version: '0.2.25',
    date: '2026-08-13',
    notes: [
      'Tooltip: efectos de ataque de arma separados de los stats del item',
    ],
  },
  {
    version: '0.2.24',
    date: '2026-08-13',
    notes: [
      'Catálogo: filtro de stats multi-selección para todo el equipo',
      'Dofus deja el catálogo abierto para equipar el siguiente slot automáticamente',
    ],
  },
  {
    version: '0.2.23',
    date: '2026-08-12',
    notes: [
      'Componente StatFilter reutilizable con grupos de stats categorizados',
      'Filtro de stats incluye todos los stats no ignorados',
    ],
  },
  {
    version: '0.2.22',
    date: '2026-08-11',
    notes: [
      'Sets activos: panel con bonificaciones por nivel de set',
      'Tooltip del arma muestra tabla de daño con/sin crítico',
    ],
  },
  {
    version: '0.2.20',
    date: '2026-08-10',
    notes: [
      'Exportar build como imagen PNG',
      'Compartir build por URL',
    ],
  },
  {
    version: '0.2.15',
    date: '2026-08-05',
    notes: [
      'Forjamagia: agregar runas a items equipados',
      'Panel de hechizos con cálculo de daño según stats del personaje',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-07-20',
    notes: [
      'Catálogo de items con búsqueda, filtros y ordenamiento',
      'Stats panel con cálculo completo del personaje',
      'Soporte multilenguaje: ES / EN / FR / PT',
    ],
  },
]
