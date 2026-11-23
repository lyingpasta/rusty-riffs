const THEMES = ['ink-bronze', 'petrol-moonlight', 'aubergine-ember']
const NEXT_THEME_KEY = ';'

function cycleTheme() {
  const current = document.documentElement.dataset.theme ?? THEMES[0]
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
  document.documentElement.dataset.theme = next
}

function isTyping(event) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
}

document.querySelector('.theme-button').addEventListener('click', cycleTheme)

document.addEventListener('keydown', (event) => {
  if (event.key !== NEXT_THEME_KEY || isTyping(event)) return
  cycleTheme()
})
