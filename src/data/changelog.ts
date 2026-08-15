export const DOFUS_GAME_VERSION = __DOFUS_VERSION__  // auto desde public/data/version.json

export type ChangelogEntry = {
  version: string
  date:    string
  notes:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
