import { appendFile, readFile } from 'node:fs/promises'

const version = process.env.RELEASE_VERSION ?? (await readFile('VERSION', 'utf8')).trim()
const postText = `⚒️ Dofus Forge v${version} is live!

Plan and optimize your next Dofus build with the latest tools and improvements.

Start forging: https://dofusforge.com

#Dofus #DofusForge #MMORPG`

const summary = `## Copy-ready X post (English)\n\nCopy and paste this text:\n\n\`\`\`text\n${postText}\n\`\`\`\n`
const summaryPath = process.env.GITHUB_STEP_SUMMARY

if (summaryPath) {
  await appendFile(summaryPath, summary, 'utf8')
  console.log('Added the English X post draft to the GitHub Actions summary.')
} else {
  console.log(postText)
}
