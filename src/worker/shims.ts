// satori's text-shaping dependency (harfbuzzjs, Emscripten-generated) detects
// a "worker" environment via `typeof WorkerGlobalScope` (true in workerd) and
// then reads `self.location.href` to resolve its own script directory — but
// workerd has no `location` global (it's not a browser), so that throws
// "Cannot read properties of undefined (reading 'href')" before satori ever
// runs. The value itself is never used in our case (we never let it fetch
// hb.wasm relative to a script path), so a stub is enough.
//
// Must be the FIRST import in index.ts — ES module imports are hoisted and
// evaluated depth-first in declaration order, so this only runs before
// satori/harfbuzzjs's own module-level code if nothing else is imported
// ahead of it.
if (typeof (globalThis as Record<string, unknown>).location === 'undefined') {
  ;(globalThis as Record<string, unknown>).location = { href: 'https://workers.dev/' }
}

export {}
