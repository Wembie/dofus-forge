import { describe, expect, it } from 'vitest'
import { langPathPrefix, langPathRootSegment } from './langPath.ts'

describe('language paths', () => {
  it('builds localized home paths without trailing slashes', () => {
    expect(`/${langPathRootSegment('es')}`).toBe('/es')
    expect(`/${langPathRootSegment('fr')}`).toBe('/fr')
    expect(`/${langPathRootSegment('pt')}`).toBe('/pt')
    expect(`/${langPathRootSegment('en')}`).toBe('/')
  })

  it('keeps language prefixes for nested routes', () => {
    expect(`/${langPathPrefix('es')}my-builds`).toBe('/es/my-builds')
    expect(`/${langPathPrefix('en')}my-builds`).toBe('/my-builds')
  })
})
