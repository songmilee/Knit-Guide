export const PROGRESS_SCHEMA_VERSION = 1;

export function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('knit-guide-files', 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('files')) database.createObjectStore('files');
      if (!database.objectStoreNames.contains('patterns')) database.createObjectStore('patterns');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function read(database, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getLastDocument(database) {
  const current = await read(database, 'files', 'current');
  if (current?.kind === 'pdf' && current.hash) {
    return await read(database, 'files', `file:${current.hash}`);
  }
  return current;
}

export function saveLastDocument(database, value, hash = null) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    if (hash) {
      store.put({ blob: value.blob, name: value.name, hash }, `file:${hash}`);
      store.put({ kind: 'pdf', hash, name: value.name }, 'current');
    } else {
      store.put(value, 'current');
    }
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('파일 저장이 중단되었습니다.'));
    transaction.onerror = () => reject(transaction.error || new Error('파일 저장에 실패했습니다.'));
  });
}

export function getProgress(database, hash) {
  return read(database, 'patterns', hash);
}

export function writeProgress(database, hash, expectedRevision, data, force = false) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('patterns', 'readwrite');
    const store = transaction.objectStore('patterns');
    const request = store.get(hash);
    let result;
    request.onsuccess = () => {
      const previous = request.result;
      const revision = previous?.revision || 0;
      if (!force && revision !== expectedRevision) {
        result = { status: 'conflict', record: previous };
        return;
      }
      const record = {
        id: hash,
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
        data,
      };
      store.put(record, hash);
      result = { status: 'saved', record };
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error('진행 상태 저장이 중단되었습니다.'));
    transaction.onerror = () => reject(transaction.error || new Error('진행 상태 저장에 실패했습니다.'));
  });
}

export function listProgress(database) {
  return new Promise((resolve, reject) => {
    const records = [];
    const request = database.transaction('patterns', 'readonly').objectStore('patterns').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(records);
      const value = cursor.value;
      records.push(value?.schemaVersion ? value : {
        id: cursor.key,
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        revision: 0,
        updatedAt: null,
        data: value,
      });
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}
