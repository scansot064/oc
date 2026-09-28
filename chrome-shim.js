(function () {
  if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) return;
  const P = 'ext:';
  const ev = { addListener(){}, removeListener(){}, hasListener(){ return false; } };
  const ret = (v, cb) => { if (typeof cb === 'function') { cb(v); return; } return Promise.resolve(v); };

  const area = {
    get(keys, cb) {
      const defaults = keys && typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
      const list = keys == null
        ? Object.keys(localStorage).filter(k => k.startsWith(P)).map(k => k.slice(P.length))
        : typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      list.forEach(k => {
        const v = localStorage.getItem(P + k);
        if (v !== null) out[k] = JSON.parse(v);
        else if (k in defaults) out[k] = defaults[k];
      });
      return ret(out, cb);
    },
    set(items, cb) {
      Object.entries(items).forEach(([k, v]) => localStorage.setItem(P + k, JSON.stringify(v)));
      return ret(undefined, cb);
    },
    remove(keys, cb) {
      [].concat(keys).forEach(k => localStorage.removeItem(P + k));
      return ret(undefined, cb);
    },
    clear(cb) {
      Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k));
      return ret(undefined, cb);
    },
    onChanged: ev
  };

  window.chrome = {
    storage: { local: area, sync: area, onChanged: ev },
    runtime: {
      getURL: p => String(p).replace(/^\//, ''),
      getManifest: () => ({ version: '0' }),
      sendMessage: (m, cb) => ret(undefined, typeof cb === 'function' ? cb : undefined),
      onMessage: ev,
      lastError: undefined
    },
    i18n: { getMessage: k => k, getUILanguage: () => navigator.language }
  };
})();
