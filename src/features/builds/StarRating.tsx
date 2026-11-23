import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'

export function StarRating({ value, onRate, disabled = false }: { value: number; onRate: (rating: number) => void; disabled?: boolean }) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const restoreFocus = useRef<HTMLInputElement | null>(null)
  const shown = hover ?? value
  const format = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  useEffect(() => {
    if (disabled) return
    const target = restoreFocus.current
    restoreFocus.current = null
    if (!target || document.activeElement !== document.body) return
    const frame = requestAnimationFrame(() => {
      if (target.isConnected && document.activeElement === document.body) target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [disabled])

  return (
    <div className="detail-rating-control">
      <div className="detail-stars" role="radiogroup" aria-label={t('build_detail_your_rating')} aria-busy={disabled}
        onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className="detail-rating-star">
            <span className="detail-rating-glyph" aria-hidden="true">
              <Star size={26} />
              <span className="detail-rating-fill" style={{ width: `${Math.min(1, Math.max(0, shown - star + 1)) * 100}%` }}><Star size={26} /></span>
            </span>
            {[star - 0.5, star].map(option => (
              <label key={option} className={'detail-rating-hit ' + (option === star ? 'is-right' : 'is-left')}
                title={t('build_rating_option', { value: format.format(option) })}
                onMouseEnter={() => { if (!disabled) setHover(option) }}>
                <input type="radio" className="sr-only" name={id} value={option} checked={value === option} disabled={disabled}
                  aria-label={t('build_rating_option', { value: format.format(option) })}
                  onChange={event => { if (disabled) return; restoreFocus.current = event.currentTarget; setHover(null); onRate(option) }} />
              </label>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}
