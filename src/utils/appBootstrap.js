export const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export const redirectHttpToHttps = ({ location = window.location, replace = window.location.replace.bind(window.location) } = {}) => {
  if (location.protocol !== 'http:' || LOCAL_HTTP_HOSTS.has(location.hostname)) {
    return false
  }
  const httpsUrl = new URL(location.href)
  httpsUrl.protocol = 'https:'
  replace(httpsUrl.toString())
  return true
}

export const buildLoginRedirectUrl = (loginPageUrl, currentUrl, origin) => {
  const redirectUrl = new URL(loginPageUrl, origin)
  redirectUrl.searchParams.set('redirect', currentUrl)
  return redirectUrl
}

export const redirectToLogin = (
  loginPageUrl,
  { location = window.location, replace = window.location.replace.bind(window.location) } = {}
) => {
  replace(buildLoginRedirectUrl(loginPageUrl, location.href, location.origin).toString())
}
