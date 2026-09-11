import { useTranslation } from 'react-i18next'
import { usePvpStore, type PvpElement } from '@/store/pvpStore.ts'
import { statIconUrl } from '../equipment/statDisplay.ts'

const COLS = '18px 1fr 58px 58px'

const ELEMENTS: { key: PvpElement; icon: string; color: string; tKey: string }[] = [
  { key: 'neutral', icon: 'neutral_resistance', color: 'var(--neutral)', tKey: 'elem_neutral' },
  { key: 'earth',   icon: 'earth_resistance',   color: 'var(--earth)',   tKey: 'elem_earth'   },
  { key: 'fire',    icon: 'fire_resistance',    color: 'var(--fire)',    tKey: 'elem_fire'    },
  { key: 'water',   icon: 'water_resistance',   color: 'var(--water)',   tKey: 'elem_water'   },
  { key: 'air',     icon: 'air_resistance',     color: 'var(--air)',     tKey: 'elem_air'     },
]

/**
 * PvP dummy simulator — lets the user type a target's fixed + % resistance
 * per element. When enabled, WeaponCard and each spell's Σ total show an
 * extra "vs Dummy" line with the real damage after those resistances.
 */
export function DummyPanel() {
  const { t }       = useTranslation()
  const enabled     = usePvpStore(s => s.enabled)
  const resist      = usePvpStore(s => s.resist)
  const setEnabled  = usePvpStore(s => s.setEnabled)
  const setResist   = usePvpStore(s => s.setResist)
  const reset       = usePvpStore(s => s.reset)

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-void)', border: '1px solid var(--metal-edge)' }}>
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: enabled ? '1px solid var(--metal-edge)' : 'none', background: 'var(--surface-stone)' }}
      >
        <input
          type="checkbox"
          id="pvp-dummy-toggle"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="flex-shrink-0 cursor-pointer"
          style={{ width: 13, height: 13, accentColor: 'var(--gold)' }}
        />
        <label
          htmlFor="pvp-dummy-toggle"
          className="text-[11px] font-semibold flex-1 cursor-pointer"
          style={{ color: enabled ? 'var(--gold)' : 'var(--ink-faint)' }}
        >
          {t('pvp_dummy_title')}
        </label>
        {enabled && (
          <button onClick={reset} className="text-[9px] hover:underline" style={{ color: 'var(--ink-faint)' }}>
            {t('pvp_dummy_reset')}
          </button>
        )}
      </div>

      {enabled && (
        <div className="px-3 py-2 space-y-1">
          <div className="grid items-center gap-2 mb-1" style={{ gridTemplateColumns: COLS }}>
            <span />
            <span />
            <span className="text-[9px] uppercase tracking-wider text-right" style={{ color: 'var(--ink-faint)' }}>
              {t('pvp_dummy_fixed')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-right" style={{ color: 'var(--ink-faint)' }}>%</span>
          </div>
          {ELEMENTS.map(el => (
            <div key={el.key} className="grid items-center gap-2" style={{ gridTemplateColumns: COLS }}>
              <img src={statIconUrl(el.icon)} alt="" width={16} height={16} className="object-contain flex-shrink-0" />
              <span className="text-[11px] truncate" style={{ color: el.color }}>{t(el.tKey)}</span>
              <input
                type="number"
                min={0}
                value={resist[el.key].fixed}
                onChange={e => setResist(el.key, 'fixed', Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-center text-[11px] font-mono rounded px-1 py-0.5 focus:outline-none border"
                style={{ background: 'var(--surface-panel)', borderColor: 'var(--metal-edge)', color: 'var(--ink)' }}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={resist[el.key].percent}
                onChange={e => setResist(el.key, 'percent', Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-full text-center text-[11px] font-mono rounded px-1 py-0.5 focus:outline-none border"
                style={{ background: 'var(--surface-panel)', borderColor: 'var(--metal-edge)', color: 'var(--ink)' }}
              />
            </div>
          ))}
          <p className="text-[9px] pt-1" style={{ color: 'var(--ink-faint)' }}>{t('pvp_dummy_hint')}</p>
        </div>
      )}
    </div>
  )
}
