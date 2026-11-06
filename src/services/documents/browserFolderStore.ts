import { KIND_FOLDER, documentFileName, safeSegment, type DocFormat, type DocumentStore, type StoredDocument } from './types'

/**
 * Saves documents straight into a folder on THIS computer, e.g. C:\Quotation and Billing, using the
 * browser's File System Access API (Chrome / Edge on Windows). A website cannot write to C:\ by
 * itself: the user picks the folder once and grants permission; the handle is remembered in
 * IndexedDB, and the browser may ask again after a restart. Creates Quotations / Billing / <Client>.
 * Cloud backup (e.g. Google Drive) needs a backend that keeps the OAuth secret — not part of this build.
 */
type PermissionMode = { mode: 'readwrite' }
interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(d: PermissionMode): Promise<PermissionState>
  requestPermission(d: PermissionMode): Promise<PermissionState>
}
declare global { interface Window { showDirectoryPicker?: (o?: { id?: string; mode?: 'readwrite'; startIn?: string }) => Promise<DirHandle> } }

const DB = 'baba-solars-documents'
const STORE = 'handles'
const INDEX_FILE = '.baba-solars-index.json'

function idb<T>(fn: (s: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode = 'readonly') {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }
  })
}

export const folderAccessSupported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && window.isSecureContext

async function savedHandle(): Promise<DirHandle | null> {
  try { return ((await idb((s) => s.get('root'))) as DirHandle | undefined) ?? null } catch { return null }
}

/** Ask the user to choose the folder (must run from a click). Suggests "Quotation and Billing". */
export async function chooseDocumentsFolder(): Promise<string> {
  if (!folderAccessSupported()) throw new Error('This browser cannot save to a folder. Use Google Chrome or Microsoft Edge on the office computer, or run the Baba Solars server.')
  const picked = await window.showDirectoryPicker!({ id: 'baba-solars-docs', mode: 'readwrite', startIn: 'documents' })
  // If the user picked C:\ (or any parent), create "Quotation and Billing" inside it.
  const root = picked.name === 'Quotation and Billing' ? picked : ((await picked.getDirectoryHandle('Quotation and Billing', { create: true })) as DirHandle)
  for (const f of Object.values(KIND_FOLDER)) await root.getDirectoryHandle(f, { create: true })
  await idb((s) => s.put(root, 'root'), 'readwrite')
  return root.name
}

export async function forgetDocumentsFolder() { await idb((s) => s.delete('root'), 'readwrite') }

async function rootWithPermission(ask: boolean): Promise<DirHandle | null> {
  const h = await savedHandle()
  if (!h) return null
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return h
  if (ask && (await h.requestPermission({ mode: 'readwrite' })) === 'granted') return h
  return null
}

async function readIndex(root: DirHandle): Promise<StoredDocument[]> {
  try { return JSON.parse(await (await (await root.getFileHandle(INDEX_FILE)).getFile()).text()) as StoredDocument[] } catch { return [] }
}
async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable()
  await w.write(data)
  await w.close()
}
async function dirFor(root: DirHandle, parts: string[]) {
  let d: FileSystemDirectoryHandle = root
  for (const p of parts) d = await d.getDirectoryHandle(p, { create: true })
  return d
}

export const browserFolderStore: DocumentStore = {
  kind: 'browser-folder',
  label: 'Folder on this computer',
  async status() {
    if (!folderAccessSupported()) return { ready: false, location: '', message: 'This browser cannot write to a folder (use Chrome or Edge).' }
    const h = await savedHandle()
    if (!h) return { ready: false, location: '', message: 'Choose the “Quotation and Billing” folder (for example on C:\\) once to start saving files.', needsPermission: true }
    const ok = (await h.queryPermission({ mode: 'readwrite' })) === 'granted'
    return { ready: ok, location: h.name, needsPermission: !ok, message: ok ? `Saving into the “${h.name}” folder on this computer.` : `Allow access to the “${h.name}” folder again to keep saving files.` }
  },
  async save(meta, files) {
    const root = await rootWithPermission(true)
    if (!root) throw new Error('No folder access. Open Documents and choose the “Quotation and Billing” folder.')
    const client = safeSegment(meta.clientName, 'Client', 80)
    const dir = await dirFor(root, [KIND_FOLDER[meta.kind], client])
    const index = await readIndex(root)
    const now = new Date().toISOString()
    const saved: StoredDocument[] = []
    for (const format of Object.keys(files) as DocFormat[]) {
      const blob = files[format]
      if (!blob) continue
      const fileName = documentFileName(meta.docNumber, meta.clientName, format)
      const key = `${meta.kind}:${meta.docNumber}:${format}`
      const prev = index.find((d) => `${d.kind}:${d.docNumber}:${d.format}` === key)
      await writeFile(dir, fileName, blob)
      // Client renamed → remove the old copy so there is never a duplicate.
      if (prev && prev.relativePath !== `${KIND_FOLDER[meta.kind]}/${client}/${fileName}`) {
        try {
          const [k, c, f] = prev.relativePath.split('/')
          await (await dirFor(root, [k, c])).removeEntry(f)
        } catch { /* already gone */ }
      }
      const doc: StoredDocument = {
        id: prev?.id ?? `local_${crypto.randomUUID()}`, kind: meta.kind, format, recordId: meta.recordId, docNumber: meta.docNumber, clientName: meta.clientName,
        docDate: meta.docDate, amount: meta.amount, fileName, relativePath: `${KIND_FOLDER[meta.kind]}/${client}/${fileName}`, size: blob.size,
        version: (prev?.version ?? 0) + 1, createdAt: prev?.createdAt ?? now, updatedAt: now, drive: null,
      }
      const i = index.indexOf(prev!)
      if (i >= 0) index[i] = doc
      else index.push(doc)
      saved.push(doc)
    }
    await writeFile(root, INDEX_FILE, JSON.stringify(index, null, 2))
    return { documents: saved, location: root.name }
  },
  async list(f = {}) {
    const root = await rootWithPermission(false)
    if (!root) return []
    const q = (f.q ?? '').toLowerCase()
    return (await readIndex(root))
      .filter((d) => (!f.kind || d.kind === f.kind) && (!f.recordId || d.recordId === f.recordId) && (!q || `${d.docNumber} ${d.clientName}`.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async download(d) {
    const root = await rootWithPermission(true)
    if (!root) throw new Error('No folder access.')
    const [k, c, f] = d.relativePath.split('/')
    return (await (await (await dirFor(root, [k, c])).getFileHandle(f)).getFile())
  },
}
