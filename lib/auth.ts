export function checkApiKey(request: Request): boolean {
  const key = request.headers.get('x-api-key')
  return !!key && key === process.env.MISSION_CONTROL_API_KEY
}

export function isBrowserRequest(request: Request): boolean {
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/html')
}
