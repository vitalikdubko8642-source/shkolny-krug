// Recordings are stored separately from the small localStorage app state.
const DB = 'shkolny-krug-media-v1'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('recordings')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Хранилище занято'))
  })
}

async function transaction(mode, action) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('recordings', mode)
      const request = action(tx.objectStore('recordings'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('Не удалось сохранить запись'))
    })
  } finally { db.close() }
}

export const saveRecording = (id, blob) => transaction('readwrite', store => store.put(blob, id))
export const getRecording = id => transaction('readonly', store => store.get(id))
export const deleteRecording = id => transaction('readwrite', store => store.delete(id))
export const clearRecordings = () => transaction('readwrite', store => store.clear())
