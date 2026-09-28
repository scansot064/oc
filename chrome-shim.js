(function () {
  const P = 'ext:';
  const ev = { addListener(){}, removeListener(){}, hasListener(){ return false; } };
  const ret = (v, cb) => { if (typeof cb === 'function') { cb(v); return; } return Promise.resolve(v); };

  // Set props on target, even if a native property is in the way
  function put(target, defs) {
    Object.keys(defs).forEach(k => {
      try { target[k] = defs[k]; } catch (e) {}
      if (target[k] !== defs[k]) {
        try { Object.defineProperty(target, k, { value: defs[k], configurable: true, writable: true }); } catch (e) {}
      }
    });
    return target;
  }
  function ensure(obj, key) {
    if (!obj[key] || typeof obj[key] !== 'object') put(obj, { [key]: {} });
    return obj[key];
  }

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

  const c = window.chrome || (window.chrome = {});

  put(ensure(c, 'storage'), { local: area, sync: area, onChanged: ev });

  put(ensure(c, 'runtime'), {
    getURL: p => String(p).replace(/^\//, ''),
    getManifest: () => ({ version: '0' }),
    getPlatformInfo: cb => {
      const ua = navigator.userAgent;
      const os = /Windows/.test(ua) ? 'win' : /Android/.test(ua) ? 'android'
               : /Mac/.test(ua) ? 'mac' : /CrOS/.test(ua) ? 'cros' : 'linux';
      return ret({ os: os, arch: 'x86-64', nacl_arch: 'x86-64' }, cb);
    },
    sendMessage: (m, r, cb) => { cb = typeof r === 'function' ? r : cb; return ret(undefined, cb); },
    connect: () => ({ postMessage(){}, disconnect(){}, onMessage: ev, onDisconnect: ev }),
    onMessage: ev,
    lastError: undefined
  });

  put(ensure(c, 'i18n'), {
    getMessage: k => k,
    getUILanguage: () => navigator.language
  });

  if (!navigator.webkitPersistentStorage) {
    const q = { quota: 1024 * 1024 * 1024, used: 0 };
    const store = {
      requestQuota(bytes, ok) { if (ok) ok(bytes || q.quota); },
      queryUsageAndQuota(ok) { if (ok) ok(q.used, q.quota); }
    };
    navigator.webkitPersistentStorage = store;
    navigator.webkitTemporaryStorage = store;
  }
})();
    navigator.webkitTemporaryStorage = store;
  }
})();
