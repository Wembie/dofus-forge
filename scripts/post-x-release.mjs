import { createHmac, randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const credentials = {
  consumerKey: process.env.X_API_KEY,
  consumerSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
}

const missing = Object.entries(credentials).filter(([, value]) => !value).map(([name]) => name)
if (missing.length === Object.keys(credentials).length) {
  console.log('X API secrets are not configured; skipping the post.')
  process.exit(0)
}
if (missing.length > 0) {
  throw new Error(`Missing X API secrets: ${missing.join(', ')}`)
}

const version = (await readFile('VERSION', 'utf8')).trim()
const releaseNotes = await readFile('release_notes.txt', 'utf8')
const githubToken = process.env.GITHUB_TOKEN
const githubRepository = process.env.GITHUB_REPOSITORY
if (!githubToken || !githubRepository) {
  throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required to prevent duplicate release posts.')
}

const releaseTag = `v${version}`
const releaseApiUrl = `https://api.github.com/repos/${githubRepository}/releases/tags/${encodeURIComponent(releaseTag)}`
const marker = `<!-- dofusforge-x-release:${version} -->`
const releaseResponse = await fetch(releaseApiUrl, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  },
})
const release = await releaseResponse.json().catch(() => ({}))
if (!releaseResponse.ok) {
  throw new Error(`Could not check the GitHub Release before posting to X (HTTP ${releaseResponse.status}): ${JSON.stringify(release)}`)
}
if (typeof release.body === 'string' && release.body.includes(marker)) {
  console.log(`Release v${version} was already posted to X; skipping duplicate.`)
  process.exit(0)
}

const highlight = releaseNotes
  .split(/\r?\n/)
  .map(line => line.replace(/^\s*[-*]\s+/, '').trim())
  .find(line => line && !line.startsWith('#') && line !== 'No changelog entry found.')

const cleanHighlight = (highlight ?? 'See what is new in the latest release.')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
const shortHighlight = Array.from(cleanHighlight).slice(0, 120).join('')
const text = `⚒️ Dofus Forge v${version} is live!\n\n${shortHighlight}${Array.from(cleanHighlight).length > 120 ? '…' : ''}\n\nhttps://dofusforge.com`

const endpoint = 'https://api.x.com/2/tweets'
const oauth = {
  oauth_consumer_key: credentials.consumerKey,
  oauth_nonce: randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_token: credentials.accessToken,
  oauth_version: '1.0',
}
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
const normalizedParams = Object.entries(oauth)
  .map(([key, value]) => [encode(key), encode(value)])
  .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB))
  .map(([key, value]) => `${key}=${value}`)
  .join('&')
const signatureBase = ['POST', encode(endpoint), encode(normalizedParams)].join('&')
const signingKey = `${encode(credentials.consumerSecret)}&${encode(credentials.accessTokenSecret)}`
oauth.oauth_signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')
const authorization = `OAuth ${Object.entries(oauth)
  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
  .join(', ')}`

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: authorization,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text }),
})
const payload = await response.json().catch(() => ({}))
if (!response.ok) {
  if (response.status === 403 && typeof payload?.type === 'string' && payload.type.endsWith('/oauth1-permissions')) {
    throw new Error(
      'X rejected the OAuth 1.0a app permissions. Set the app permission to Read and write in the X Developer Portal, regenerate the user Access Token and Access Token Secret, update X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET in GitHub Actions, then rerun this job.',
    )
  }
  throw new Error(`X API returned HTTP ${response.status}: ${JSON.stringify(payload)}`)
}

console.log(`Posted release v${version} to X (post id ${payload.data?.id ?? 'unknown'}).`)

const updatedBody = `${release.body ?? ''}${release.body ? '\n\n' : ''}${marker}`
const updateResponse = await fetch(releaseApiUrl.replace(/\/tags\/[^/]+$/, `/${release.id}`), {
  method: 'PATCH',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  body: JSON.stringify({ body: updatedBody }),
})
const updatedRelease = await updateResponse.json().catch(() => ({}))
if (!updateResponse.ok) {
  throw new Error(
    `X accepted post ${payload.data?.id ?? '(unknown id)'}, but GitHub could not save the duplicate-prevention marker (HTTP ${updateResponse.status}): ${JSON.stringify(updatedRelease)}`,
  )
}
