const verbParam = 'verb'
const qaParam = 'qa'

const getUrl = () => new URL(window.location.href)

export const getVerbIdFromUrl = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return getUrl().searchParams.get(verbParam)
}

export const isQaEnabledFromUrl = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return getUrl().searchParams.get(qaParam) === '1'
}

export const setVerbIdInUrl = (verbId: string | null, mode: 'push' | 'replace' = 'push') => {
  const url = getUrl()
  if (verbId) {
    url.searchParams.set(verbParam, verbId)
  } else {
    url.searchParams.delete(verbParam)
  }

  const next = `${url.pathname}${url.search}${url.hash}`
  if (mode === 'replace') {
    window.history.replaceState(null, '', next)
    return
  }
  window.history.pushState(null, '', next)
}

export const setQaInUrl = (enabled: boolean) => {
  const url = getUrl()
  if (enabled) {
    url.searchParams.set(qaParam, '1')
  } else {
    url.searchParams.delete(qaParam)
  }
  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
