/**
 * Post-build script: packages the TanStack Start SSR output for Vercel's
 * Build Output API (v3).  Run automatically as part of `npm run build`.
 *
 * What it does:
 *  1. Copies dist/client/ → .vercel/output/static/  (CDN-served assets)
 *  2. Bundles dist/server/server.js + all npm deps into one self-contained
 *     CJS file using esbuild (CJS avoids "Dynamic require of X" errors from
 *     react-dom/server and other CJS packages; Vercel Node.js handles CJS natively)
 *  3. Writes a tiny Node.js HTTP → Web Fetch bridge as the function entry
 *  4. Writes .vc-config.json and config.json for Vercel
 */

import { build } from 'esbuild'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')
const out = resolve(root, '.vercel/output')

// ── Clean ────────────────────────────────────────────────────────────────────
rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'static'), { recursive: true })
mkdirSync(join(out, 'functions/index.func'), { recursive: true })

// ── 1. Static assets ─────────────────────────────────────────────────────────
cpSync(resolve(root, 'dist/client'), join(out, 'static'), { recursive: true })

// ── 2. Bundle SSR server into a self-contained CJS file ──────────────────────
// CJS format avoids "Dynamic require of 'X' is not supported" errors that
// occur when ESM bundles inline CJS packages (react-dom/server, util, etc.)
// that use require() internally.  Vercel's Node.js runtime handles CJS natively.
await build({
  entryPoints: [resolve(root, 'dist/server/server.js')],
  outfile: join(out, 'functions/index.func/bundle.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  packages: 'bundle',
  splitting: false,
  allowOverwrite: true,
  logLevel: 'warning',
})

// ── 3. Entry wrapper: Node.js HTTP ↔ Web Fetch API bridge ────────────────────
writeFileSync(
  join(out, 'functions/index.func/entry.js'),
  `'use strict'

const serverBundle = require('./bundle.cjs')
const server = serverBundle.default ?? serverBundle

module.exports = async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const url = new URL(req.url, \`\${protocol}://\${host}\`)

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (val === undefined) continue
    if (Array.isArray(val)) val.forEach((v) => headers.append(key, v))
    else headers.set(key, val)
  }

  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length > 0) body = Buffer.concat(chunks)
  }

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers,
    ...(body ? { body, duplex: 'half' } : {}),
  })

  const response = await server.fetch(webRequest)

  res.statusCode = response.status
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === 'set-cookie') {
      const cookies = response.headers.getSetCookie?.() ?? [value]
      res.setHeader(key, cookies)
    } else {
      res.setHeader(key, value)
    }
  }

  if (response.body) {
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}
`,
)

// ── 4. Function metadata ──────────────────────────────────────────────────────
writeFileSync(
  join(out, 'functions/index.func/.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs20.x',
      handler: 'entry.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
)

// ── 5. Route config ───────────────────────────────────────────────────────────
// - Cache immutable hashed assets (/_build/ and /assets/)
// - Serve anything that exists as a static file
// - Fall through to the SSR function for everything else
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '/assets/(.*)',
          headers: { 'cache-control': 'public, immutable, max-age=31536000' },
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '/(.*)', dest: '/index' },
      ],
    },
    null,
    2,
  ),
)

console.log('✓  .vercel/output/ ready')
