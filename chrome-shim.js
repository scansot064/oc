(function () {
  var P = 'ext:';
  var ev = {
    addListener: function () {},
    removeListener: function () {},
    hasListener: function () { return false; }
  };
  function ret(v, cb) {
    if (typeof cb === 'function') { cb(v); return; }
    return Promise.resolve(v);
  }
  function put(target, defs) {
    Object.keys(defs).forEach(function (k) {
      try { target[k] = defs[k]; } catch (e) {}
      if (target[k] !== defs[k]) {
        try {
          Object.defineProperty(target, k, { value: defs[k], configurable: true, writable: true });
        } catch (e) {}
      }
    });
    return target;
  }
  function ensure(obj, key) {
    if (!obj[key] || typeof obj[key] !== 'object') {
      var o = {};
      o[key] = {};
      put(obj, o);
    }
    return obj[key];
  }

  var area = {
    get: function (keys, cb) {
      var defaults = keys && typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
      var list;
      if (keys == null) {
        list = Object.keys(localStorage)
          .filter(function (k) { return k.indexOf(P) === 0; })
          .map(function (k) { return k.slice(P.length); });
      } else if (typeof keys === 'string') {
        list = [keys];
      } else if (Array.isArray(keys)) {
        list = keys;
      } else {
        list = Object.keys(keys);
      }
      var out = {};
      list.forEach(function (k) {
        var v = localStorage.getItem(P + k);
        if (v !== null) out[k] = JSON.parse(v);
        else if (k in defaults) out[k] = defaults[k];
      });
      return ret(out, cb);
    },
    set: function (items, cb) {
      Object.keys(items).forEach(function (k) {
        localStorage.setItem(P + k, JSON.stringify(items[k]));
      });
      return ret(undefined, cb);
    },
    remove: function (keys, cb) {
      [].concat(keys).forEach(function (k) { localStorage.removeItem(P + k); });
      return ret(undefined, cb);
    },
    clear: function (cb) {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf(P) === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
      return ret(undefined, cb);
    },
    onChanged: ev
  };

  var c = window.chrome || (window.chrome = {});

  put(ensure(c, 'storage'), { local: area, sync: area, onChanged: ev });

  put(ensure(c, 'runtime'), {
    getURL: function (p) { return String(p).replace(/^\//, ''); },
    getManifest: function () { return { version: '0' }; },
    getPlatformInfo: function (cb) {
      var ua = navigator.userAgent;
      var os = /Windows/.test(ua) ? 'win'
        : /Android/.test(ua) ? 'android'
        : /Mac/.test(ua) ? 'mac'
        : /CrOS/.test(ua) ? 'cros' : 'linux';
      return ret({ os: os, arch: 'x86-64', nacl_arch: 'x86-64' }, cb);
    },
    sendMessage: function (m, r, cb) {
      return ret(undefined, typeof r === 'function' ? r : cb);
    },
    connect: function () {
      return { postMessage: function () {}, disconnect: function () {}, onMessage: ev, onDisconnect: ev };
    },
    onMessage: ev,
    lastError: undefined
  });

  function loadMessages(lang) {
    try {
      var x = new XMLHttpRequest();
      x.open('GET', '_locales/' + lang + '/messages.json', false);
      x.send();
      if (x.status === 200 || (x.status === 0 && x.responseText)) return JSON.parse(x.responseText);
    } catch (e) {}
    return null;
  }
  var lang = (navigator.language || 'en').replace('-', '_');
  var messages = loadMessages(lang) || loadMessages(lang.split('_')[0]) || loadMessages('en') || {};

  put(ensure(c, 'i18n'), {
    getMessage: function (key, subs) {
      var m = messages[key];
      if (!m) return '';
      var s = m.message || '';
      if (m.placeholders) {
        Object.keys(m.placeholders).forEach(function (n) {
          s = s.replace(new RegExp('\\$' + n + '\\$', 'gi'), m.placeholders[n].content);
        });
      }
      [].concat(subs == null ? [] : subs).forEach(function (v, i) {
        s = s.replace(new RegExp('\\$' + (i + 1), 'g'), v);
      });
      return s;
    },
    getUILanguage: function () { return navigator.language; }
  });

  if (!navigator.webkitPersistentStorage) {
    var store = {
      requestQuota: function (bytes, ok) { if (ok) ok(bytes || 1073741824); },
      queryUsageAndQuota: function (ok) { if (ok) ok(0, 1073741824); }
    };
    navigator.webkitPersistentStorage = store;
    navigator.webkitTemporaryStorage = store;
  }
})();
