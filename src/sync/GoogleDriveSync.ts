/**
 * Google Drive API wrapper — drive.file scope only.
 */

declare const google: any

const FOLDER_NAME = 'TripBudget'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPES = 'https://www.googleapis.com/auth/drive email'

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string; hint?: string }) => void
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null

export function initGoogleAuth(onToken: (token: string) => void): void {
  if (typeof google === 'undefined') return
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: { access_token?: string; error?: string }) => {
      if (resp.access_token) {
        accessToken = resp.access_token
        onToken(resp.access_token)
      }
    },
  })
}

export function requestSignIn(onConnected?: () => void): void {
  if (typeof google === 'undefined') return
  // Always re-initialize so the callback is fresh and the GIS script is guaranteed loaded
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: { access_token?: string; error?: string }) => {
      if (resp.access_token) {
        accessToken = resp.access_token
        onConnected?.()
      }
    },
  })
  tokenClient?.requestAccessToken({ prompt: 'select_account' })
}

/** Re-acquire a token silently (no consent screen if already granted). Used on app restart. */
export function requestTokenQuiet(onSuccess: () => void, onFail?: () => void, loginHint?: string): void {
  if (typeof google === 'undefined') { onFail?.(); return }
  const client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: { access_token?: string; error?: string }) => {
      if (resp.access_token) { accessToken = resp.access_token; onSuccess() }
      else onFail?.()
    },
  })
  tokenClient = client
  client.requestAccessToken({ prompt: '', hint: loginHint })
}

/** Fetch the signed-in user's email via tokeninfo (works with drive scope, no extra scopes needed). */
export async function fetchUserEmail(): Promise<string | null> {
  if (!accessToken) return null
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
    if (!res.ok) return null
    const data = await res.json()
    return (data.email as string) ?? null
  } catch {
    return null
  }
}

export function signOut(): void {
  if (accessToken && typeof google !== 'undefined') google.accounts.oauth2.revoke(accessToken, () => {})
  accessToken = null
}

export function isSignedIn(): boolean {
  return !!accessToken
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) throw new Error('Not authenticated')
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers ?? {}) },
  })
}

async function findOrCreateFolder(): Promise<string> {
  const res = await driveRequest(
    `/files?q=name%3D'${FOLDER_NAME}'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id)`
  )
  const data = await res.json()
  if (data.files?.length) return data.files[0].id as string
  const createRes = await driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const created = await createRes.json()
  return created.id as string
}

async function findFile(folderId: string, filename: string): Promise<string | null> {
  const res = await driveRequest(
    `/files?q=name%3D'${filename}'+and+'${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(id)`
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function uploadFile(filename: string, content: string): Promise<void> {
  const folderId = await findOrCreateFolder()
  const existingId = await findFile(folderId, filename)
  const blob = new Blob([content], { type: 'application/json' })
  const metadata = { name: filename, mimeType: 'application/json', ...(existingId ? {} : { parents: [folderId] }) }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)
  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`)
}

export async function downloadFile(filename: string): Promise<string | null> {
  const folderId = await findOrCreateFolder()
  const fileId = await findFile(folderId, filename)
  if (!fileId) return null
  const res = await driveRequest(`/files/${fileId}?alt=media`)
  if (!res.ok) return null
  return res.text()
}

export async function listTripFiles(): Promise<string[]> {
  const folderId = await findOrCreateFolder()
  const res = await driveRequest(
    `/files?q='${folderId}'+in+parents+and+trashed%3Dfalse&fields=files(name)`
  )
  const data = await res.json()
  return (data.files ?? []).map((f: { name: string }) => f.name) as string[]
}
