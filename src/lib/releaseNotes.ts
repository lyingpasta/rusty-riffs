export interface ReleaseSection {
  title: string
  items: string[]
}

export interface Release {
  version: string
  sections: ReleaseSection[]
}

const RELEASE_HEADING = /^## \[?(\d+\.\d+\.\d+)\]?/
const SECTION_HEADING = /^### (.+)$/
const LIST_ITEM = /^[*-] (.+)$/
const TRAILING_LINK = /\s*\(\[[^\]]*\]\([^)]*\)\)\s*$/
const BOLD = /\*\*(.+?)\*\*/g

function cleanItem(markdown: string): string {
  let text = markdown
  while (TRAILING_LINK.test(text)) text = text.replace(TRAILING_LINK, '')
  return text.replace(BOLD, '$1').trim()
}

function addLine(releases: Release[], line: string): void {
  const release = releases[releases.length - 1]
  const section = release?.sections[release.sections.length - 1]
  const releaseMatch = RELEASE_HEADING.exec(line)
  if (releaseMatch) return void releases.push({ version: releaseMatch[1], sections: [] })
  const sectionMatch = SECTION_HEADING.exec(line)
  if (sectionMatch && release) return void release.sections.push({ title: sectionMatch[1].trim(), items: [] })
  const itemMatch = LIST_ITEM.exec(line)
  if (itemMatch && section) section.items.push(cleanItem(itemMatch[1]))
}

export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = []
  for (const line of markdown.split('\n')) addLine(releases, line.trim())
  return releases
}

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export function releasesBetween(releases: Release[], fromVersion: string, toVersion: string): Release[] {
  return releases.filter(
    (release) => compareVersions(release.version, fromVersion) > 0 && compareVersions(release.version, toVersion) <= 0,
  )
}
