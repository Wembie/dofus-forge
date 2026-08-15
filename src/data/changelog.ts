export const DOFUS_GAME_VERSION = __DOFUS_VERSION__  // auto desde public/data/version.json

export type ChangelogEntry = {
  version: string
  date:    string
  notes:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
