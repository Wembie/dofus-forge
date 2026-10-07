import satori from 'satori'

export type OgBadge = { iconUri?: string; label: string; value: number; suffix?: string; color: string }
export type OgItemRow = { label: string; name: string; iconUri?: string }
export type OgCharRow = { iconUri?: string; label: string; value: number; color: string }

export type OgBuildData = {
  title:        string   // build name, or the class label when unnamed
  classLabel:   string
  level:        number
  gender:       'male' | 'female'
  portraitUrl:  string
  ownerLabel?:  string    // "by <username>"
  items:        OgItemRow[]
  badges:       OgBadge[]
  chars:        OgCharRow[]
  footerText:   string    // "dofusforge.com"
}

const C = {
  bg:      '#070b12',
  bg2:     '#0d1220',
  border:  '#1c2333',
  gold:    '#c9a84c',
  text:    '#e8eaf0',
  muted:   '#8a93ab',
  dim:     '#4a5268',
}

// satori expects plain VNode objects, not real React elements — no JSX here.
function el(type: string, props: Record<string, unknown> = {}, children?: unknown) {
  return { type, props: children === undefined ? props : { ...props, children } }
}

function fmt(v: number, suffix = ''): string {
  if (v === 0) return '—'
  return `${v > 0 ? '+' : ''}${v}${suffix}`
}

function buildTree(data: OgBuildData) {
  const W = 1200, H = 630

  const header = el('div', {
    style: {
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '28px 40px', borderBottom: `1px solid ${C.border}`,
    },
  }, [
    el('img', { src: data.portraitUrl, width: 84, height: 84, style: { borderRadius: 12, border: `1px solid ${C.border}` } }),
    el('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
      el('div', { style: { fontSize: 34, fontWeight: 700, color: C.text, fontFamily: 'Cinzel', display: 'flex' } }, data.title),
      el('div', { style: { fontSize: 18, color: C.gold, marginTop: 6, display: 'flex', fontFamily: 'Cinzel', fontWeight: 700 } }, data.classLabel),
      el('div', { style: { fontSize: 15, color: C.muted, marginTop: 4, display: 'flex' } },
        `${data.gender === 'female' ? 'F' : 'M'} · Lv. ${data.level}${data.ownerLabel ? ` · ${data.ownerLabel}` : ''}`),
    ]),
    el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, [
      el('div', { style: { fontSize: 20, fontWeight: 700, color: C.gold, letterSpacing: 3, fontFamily: 'Cinzel', display: 'flex' } }, 'DOFUS FORGE'),
      el('div', { style: { fontSize: 12, color: C.dim, marginTop: 4, display: 'flex' } }, 'dofus 3 build planner'),
    ]),
  ])

  const badges = el('div', {
    style: { display: 'flex', gap: 10, padding: '18px 40px', borderBottom: `1px solid ${C.border}` },
  }, data.badges.map(b => el('div', {
    key: b.label,
    style: {
      display: 'flex', alignItems: 'center', gap: 8, flex: 1,
      padding: '10px 16px', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
    },
  }, [
    ...(b.iconUri ? [el('img', { src: b.iconUri, width: 22, height: 22 })] : []),
    el('span', { style: { color: b.color, fontFamily: 'JetBrainsMono', fontWeight: 700, fontSize: 24, display: 'flex' } }, fmt(b.value, b.suffix)),
    el('span', { style: { color: C.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'flex' } }, b.label),
  ])))

  const equipCol = el('div', { style: { width: 440, padding: '20px 28px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}` } }, [
    el('div', { style: { color: C.gold, fontSize: 12, fontFamily: 'Cinzel', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12, display: 'flex' } }, 'Equipment'),
    ...(data.items.length === 0
      ? [el('div', { style: { color: C.dim, fontSize: 13, display: 'flex' } }, 'No items equipped')]
      : data.items.slice(0, 11).map(it => el('div', {
          key: it.label,
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
        }, [
          it.iconUri
            ? el('img', { src: it.iconUri, width: 26, height: 26, style: { borderRadius: 4, flexShrink: 0 } })
            : el('div', { style: { width: 26, height: 26, flexShrink: 0 } }),
          el('span', { style: { color: C.muted, fontSize: 12, width: 62, flexShrink: 0, display: 'flex' } }, it.label),
          el('span', { style: { color: C.text, fontSize: 13, display: 'flex' } }, it.name),
        ]))),
  ])

  const charsCol = el('div', { style: { flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column' } }, [
    el('div', { style: { color: C.gold, fontSize: 12, fontFamily: 'Cinzel', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12, display: 'flex' } }, 'Characteristics'),
    el('div', { style: { display: 'flex', flexWrap: 'wrap' } },
      (data.chars.length === 0
        ? [el('div', { style: { color: C.dim, fontSize: 13, display: 'flex' } }, '—')]
        : data.chars.map(c => el('div', {
            key: c.label,
            style: { display: 'flex', alignItems: 'center', width: '50%', padding: '4px 24px 4px 0' },
          }, [
            ...(c.iconUri ? [el('img', { src: c.iconUri, width: 16, height: 16, style: { marginRight: 8 } })] : []),
            el('span', { style: { color: C.muted, fontSize: 13, flex: 1, display: 'flex' } }, c.label),
            el('span', { style: { color: c.color, fontFamily: 'JetBrainsMono', fontWeight: 700, fontSize: 14, display: 'flex', marginLeft: 12 } }, fmt(c.value)),
          ])))),
  ])

  const body = el('div', { style: { display: 'flex', flex: 1 } }, [equipCol, charsCol])

  const footer = el('div', {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '14px', borderTop: `1px solid ${C.border}`,
    },
  }, el('span', { style: { color: C.dim, fontSize: 13, letterSpacing: 1, display: 'flex' } }, data.footerText))

  return el('div', {
    style: {
      width: W, height: H, display: 'flex', flexDirection: 'column',
      background: `linear-gradient(135deg, ${C.bg} 0%, #0a0f1a 60%, ${C.bg} 100%)`,
      fontFamily: 'Inter',
    },
  }, [header, badges, body, footer])
}

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }

export async function renderBuildSvg(data: OgBuildData, fonts: OgFont[]): Promise<string> {
  const tree = buildTree(data)
  return satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: fonts.map(f => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  })
}
