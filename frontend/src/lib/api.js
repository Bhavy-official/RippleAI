const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export function subscribeToState(onState) {
  let socket
  let retry
  let disposed = false
  const connect = () => {
    socket = new WebSocket(API_BASE.replace(/^http/, 'ws') + '/ws')
    socket.onmessage = event => onState(JSON.parse(event.data))
    socket.onclose = () => { if (!disposed) retry = setTimeout(connect, 1000) }
  }
  connect()
  return () => { disposed = true; clearTimeout(retry); socket?.close() }
}

export async function triggerScenario(scenario) {
  const response = await fetch(`${API_BASE}/api/scenarios/${scenario}`, { method: 'POST' })
  if (!response.ok) throw new Error('Unable to start scenario')
}

export async function incidentAction(id, action, payload = {}) {
  const response = await fetch(`${API_BASE}/api/incidents/${id}/${action}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error('Request failed')
  return response.json()
}

export async function getIncident(id) {
  const response = await fetch(`${API_BASE}/api/incidents/${id}`)
  if (!response.ok) throw new Error('Incident not found')
  return response.json()
}
