import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)

const forbiddenPatterns = [
  {
    name: 'committed service-role env value',
    pattern: /NUXT_SUPABASE_SERVICE_ROLE_KEY=(?!$|your-|.*placeholder)/i,
  },
  {
    name: 'Supabase JWT-like secret',
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: 'generic private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/,
  },
  {
    name: 'GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  },
]

const ignoredExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.lock',
])

const isIgnoredFile = (file) => {
  return [...ignoredExtensions].some((extension) => file.endsWith(extension))
}

const findings = []

for (const file of files) {
  if (isIgnoredFile(file)) {
    continue
  }

  if (!existsSync(file)) {
    continue
  }

  const content = readFileSync(file, 'utf8')

  for (const { name, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: ${name}`)
    }
  }
}

if (findings.length > 0) {
  console.error('Potential committed secrets detected:')
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log('No committed secrets detected.')
