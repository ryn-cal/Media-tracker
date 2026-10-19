/* =====================================================================
   IndexedDB: videos (files) · media (tracker) · kv (misc); memory fallback if blocked
   ===================================================================== */
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const q = indexedDB.open('video-catalog', 3);
    q.onupgradeneeded = () => {
      const db = q.result;
      if (!db.objectStoreNames.contains('videos')) db.createObjectStore('videos', { keyPath:'id', autoIncrement:true }).createIndex('sig', 'sig', { unique:false });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath:'id', autoIncrement:true });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath:'k' });
    };
    q.onsuccess = () => { q.result.onversionchange = () => q.result.close(); res(q.result); }; q.onerror = () => rej(q.error);
    q.onblocked = () => { const b = $('banner'); b.dataset.blocked = 1; b.textContent = t('t_blocked'); b.classList.add('show'); };   // an older tab still holds the previous database version
    setTimeout(() => rej(new Error('IndexedDB open timed out')), 6000);
  }));
  const tx = async (name, mode, fn) => { const db = await open(); return new Promise((res, rej) => { const x = db.transaction(name, mode); const r = fn(x.objectStore(name)); x.oncomplete = () => res(r && r.result); x.onerror = () => rej(x.error); }); };
  const mem = { videos:new Map(), media:new Map(), kv:new Map() }, seq = { videos:0, media:0, kv:0 }; let useMem = false;
  const guard = (real, fake) => async (...a) => {
    if (!useMem) { try { return await real(...a); } catch (e) { useMem = true; const b = $('banner'); b.dataset.mem = 1; b.textContent = t('t_mem'); b.classList.add('show'); } }
    return fake(...a);
  };
  return {
    isMem: () => useMem,
    all: guard(n => tx(n, 'readonly', s => s.getAll()), n => [...mem[n].values()].map(r => ({ ...r }))),
    put: guard((n, rec) => tx(n, 'readwrite', s => s.put(rec)), (n, rec) => { if (n === 'kv') { mem.kv.set(rec.k, { ...rec }); return; } if (!rec.id) rec.id = ++seq[n]; mem[n].set(rec.id, { ...rec }); }),
    get: guard((n, k) => tx(n, 'readonly', s => s.get(k)), (n, k) => mem[n].get(k)),
    del: guard((n, id) => tx(n, 'readwrite', s => s.delete(id)), (n, id) => { mem[n].delete(id); }),
    clear: guard(n => tx(n, 'readwrite', s => s.clear()), n => { mem[n].clear(); }),
    // batch helpers (one transaction)
    putMany: guard((n, recs) => tx(n, 'readwrite', s => { recs.forEach(r => s.put(r)); }), (n, recs) => { recs.forEach(rec => { if (!rec.id) rec.id = ++seq[n]; mem[n].set(rec.id, { ...rec }); }); }),
    delMany: guard((n, ids) => tx(n, 'readwrite', s => { ids.forEach(id => s.delete(id)); }), (n, ids) => { ids.forEach(id => mem[n].delete(id)); }),
  };
})();

