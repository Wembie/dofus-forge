import { Writable } from 'node:stream'
import type { ReactNode } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { ServerRouter, type EntryContext } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import { createServerI18n } from './i18n/server.ts'
import { langFromPath } from './i18n/langPath.ts'
import { SeoCollectorContext, SeoTagsContext, type SeoTags } from './seo/useSeoMeta.ts'

const RENDER_TIMEOUT_MS = 10_000

/** Renders to a complete HTML string, waiting for every Suspense boundary. */
function renderToHtml(element: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    let failed: unknown = null
    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        const chunks: Buffer[] = []
        pipe(new Writable({
          write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback() },
          final(callback) {
            clearTimeout(timer)
            callback()
            // An error inside a Suspense boundary still produces HTML, with
            // that part left for the client; as a prerender that ships a
            // hole to crawlers, so it fails the build instead.
            if (failed) reject(failed)
            else resolve(Buffer.concat(chunks).toString('utf-8'))
          },
        }))
      },
      onShellError: reject,
      onError(error) { failed ??= error },
    })
    const timer = setTimeout(() => abort(new Error(`Render timed out after ${RENDER_TIMEOUT_MS} ms`)), RENDER_TIMEOUT_MS)
  })
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders })
  }

  const url = new URL(request.url)
  const i18n = createServerI18n(langFromPath(url.pathname))
  const page = (
    <I18nextProvider i18n={i18n}>
      <ServerRouter context={routerContext} url={request.url} />
    </I18nextProvider>
  )

  // <head> renders before the page body, so the page's usePageSeo values are
  // not known yet when it is written. The first pass only collects them; the
  // second renders the document with them in <head>. Both run at build time.
  let tags: SeoTags | null = null
  // The hydration data stream can be read once, so only the real pass gets it.
  const collectPass = (
    <I18nextProvider i18n={i18n}>
      <ServerRouter context={{ ...routerContext, serverHandoffStream: undefined }} url={request.url} />
    </I18nextProvider>
  )
  await renderToHtml(<SeoCollectorContext.Provider value={collected => { tags = collected }}>{collectPass}</SeoCollectorContext.Provider>)
  const html = await renderToHtml(<SeoTagsContext.Provider value={tags}>{page}</SeoTagsContext.Provider>)

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
