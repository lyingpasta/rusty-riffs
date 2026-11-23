const REPOSITORY = 'lyingpasta/rusty-riffs'
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPOSITORY}/releases/latest`
const RELEASES_PAGE_URL = `https://github.com/${REPOSITORY}/releases`
const README_SETUP_URL = `https://github.com/${REPOSITORY}#setup`
const NOT_FOUND = 404
const BYTES_PER_MEGABYTE = 1024 * 1024

const PLATFORMS = {
  linux: {
    name: 'Linux',
    assets: [
      { suffix: '.AppImage', label: 'AppImage', detail: 'any distro' },
      { suffix: '.deb', label: '.deb', detail: 'Debian, Ubuntu' },
      { suffix: '.rpm', label: '.rpm', detail: 'Fedora, openSUSE' },
    ],
  },
  windows: {
    name: 'Windows',
    assets: [
      { suffix: '-setup.exe', label: 'Installer', detail: '.exe' },
      { suffix: '.msi', label: 'MSI package', detail: '.msi' },
    ],
  },
  mac: {
    name: 'macOS',
    assets: [{ suffix: '.dmg', label: 'Disk image', detail: 'Apple Silicon' }],
  },
}

function detectPlatform() {
  const platform = (navigator.userAgentData?.platform || navigator.userAgent).toLowerCase()
  if (platform.includes('win')) return 'windows'
  if (platform.includes('mac')) return 'mac'
  if (platform.includes('linux') && !platform.includes('android')) return 'linux'
  return null
}

async function fetchLatestRelease() {
  const response = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } })
  if (response.status === NOT_FOUND) return null
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for the latest release`)
  return response.json()
}

function findAsset(release, suffix) {
  return release.assets.find((asset) => asset.name.endsWith(suffix))
}

function formatSize(bytes) {
  return `${Math.round(bytes / BYTES_PER_MEGABYTE)} MB`
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function createAssetItem(asset, kind) {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = asset.browser_download_url
  link.textContent = kind.label
  const detail = document.createElement('small')
  detail.textContent = `${kind.detail} · ${formatSize(asset.size)}`
  link.append(detail)
  item.append(link)
  return item
}

function createMessageItem(text) {
  const item = document.createElement('li')
  const message = document.createElement('small')
  message.textContent = text
  item.append(message)
  return item
}

function renderPlatformAssets(release, platformKey) {
  const list = document.querySelector(`[data-assets="${platformKey}"]`)
  const items = PLATFORMS[platformKey].assets
    .map((kind) => ({ kind, asset: findAsset(release, kind.suffix) }))
    .filter(({ asset }) => asset)
    .map(({ kind, asset }) => createAssetItem(asset, kind))
  list.replaceChildren(...(items.length ? items : [createMessageItem('No build in this release.')]))
}

function renderUnavailable(message) {
  document.querySelectorAll('[data-assets]').forEach((list) => {
    list.replaceChildren(createMessageItem('Not available yet.'))
  })
  document.getElementById('download-status').innerHTML = message
}

function pointPrimaryButtonAtPlatform(release, platformKey) {
  const platform = PLATFORMS[platformKey]
  const asset = findAsset(release, platform.assets[0].suffix)
  if (!asset) return
  const button = document.getElementById('primary-download')
  button.href = asset.browser_download_url
  button.textContent = `Download for ${platform.name}`
}

function highlightPlatform(platformKey) {
  document.querySelector(`[data-platform="${platformKey}"]`)?.classList.add('is-current')
}

function renderRelease(release, platformKey) {
  const version = release.tag_name
  document.getElementById('download-status').textContent =
    `Version ${version}, released ${formatDate(release.published_at)}.`
  document.getElementById('release-note').textContent =
    `${version} · Free and open source · Linux, Windows and macOS`
  Object.keys(PLATFORMS).forEach((key) => renderPlatformAssets(release, key))
  if (platformKey) pointPrimaryButtonAtPlatform(release, platformKey)
}

async function showDownloads() {
  const platformKey = detectPlatform()
  if (platformKey) highlightPlatform(platformKey)
  try {
    const release = await fetchLatestRelease()
    if (!release) {
      renderUnavailable(`No release has been published yet. You can <a href="${README_SETUP_URL}">build it from source</a> in the meantime.`)
      return
    }
    renderRelease(release, platformKey)
  } catch (error) {
    console.error(error)
    renderUnavailable(`Couldn't reach GitHub to find the latest version. Grab it from the <a href="${RELEASES_PAGE_URL}">releases page</a>.`)
  }
}

showDownloads()
