/* Manejadores de eventos declarativos: reemplazan los atributos onclick/oninput/... para poder
 * quitar 'unsafe-inline' del CSP. El HTML lleva data-on-click="funcion('arg', this)" y este archivo
 * interpreta ese texto con un analizador propio. NO usa eval, new Function ni setTimeout con texto.
 *
 * Gramatica admitida: llamadas con cadena de miembros (a.b.c(x)), literales, this, event, objetos y
 * arreglos literales, funciones flecha, || && ! === ?: , asignacion a propiedades (this.style.color='x'),
 * "return", "if (c) sentencia" y varias sentencias separadas por ;. Lo que no entienda lo deja en
 * consola y no hace nada (falla cerrado).
 */
(function () {
  'use strict';

  // Nombres que nunca se pueden tocar desde un atributo, aunque un atacante lograra inyectar HTML.
  var PROHIBIDOS = {
    constructor: 1, __proto__: 1, prototype: 1, eval: 1, Function: 1, setTimeout: 1, setInterval: 1,
    write: 1, writeln: 1, innerHTML: 1, outerHTML: 1, insertAdjacentHTML: 1, srcdoc: 1, importScripts: 1,
    import: 1, _req: 1, cookie: 1, localStorage: 1, XMLHttpRequest: 1, WebSocket: 1, fetch: 1
  };
  // Globales a las que se permite llegar. Cualquier otra raiz se busca en window (funciones de la pagina).
  // Modelo de lista blanca (2026-10-29): solo se alcanza lo que la pagina define a proposito. Un atacante que
  // inyecte HTML con data-on-* no debe llegar a Reflect, Object, Function ni a funciones nativas arbitrarias.
  var RAICES_OK = { window: 1, document: 1, location: 1, history: 1, navigator: 1, sessionStorage: 1, candela: 1,
    Math: 1, Number: 1, String: 1, parseInt: 1, parseFloat: 1, encodeURIComponent: 1, undefined: 1, NaN: 1, Infinity: 1 };
  var WINDOW_OK = { location: 1, history: 1, scrollTo: 1, scrollY: 1, innerWidth: 1, innerHeight: 1, document: 1,
    navigator: 1, sessionStorage: 1, open: 1, candela: 1 };
  var DOCUMENT_OK = { getElementById: 1, querySelector: 1, querySelectorAll: 1, body: 1, documentElement: 1,
    activeElement: 1, title: 1, location: 1, referrer: 1 };
  // unicas funciones nativas invocables (las que los handlers del sitio usan de verdad)
  var NATIVOS_OK = { stopPropagation: 1, stopImmediatePropagation: 1, preventDefault: 1, setItem: 1, getItem: 1,
    back: 1, forward: 1, reload: 1, getElementById: 1, querySelector: 1, querySelectorAll: 1, scrollTo: 1,
    scrollIntoView: 1, writeText: 1, then: 1, catch: 1, click: 1, focus: 1, blur: 1, select: 1, toggle: 1,
    add: 1, remove: 1, contains: 1, toFixed: 1, round: 1, floor: 1, ceil: 1, max: 1, min: 1, abs: 1, parseInt: 1, parseFloat: 1, encodeURIComponent: 1, open: 1 };
  function esNativa(f) {
    try { return Function.prototype.toString.call(f).indexOf('[native code]') !== -1; } catch (_) { return true; }
  }
  var RAICES_VEDADAS = { eval: 1, Function: 1, setTimeout: 1, setInterval: 1, fetch: 1, XMLHttpRequest: 1, WebSocket: 1, localStorage: 1 };

  function error(msg) { throw new Error('ui-events: ' + msg); }

  // ---------- Tokenizador ----------
  var PUNT = ['===', '!==', '=>', '==', '!=', '<=', '>=', '||', '&&', '(', ')', '{', '}', '[', ']', ',', '.', ';', ':', '?', '!', '=', '<', '>', '+', '-', '*', '/', '%'];

  function tokenizar(s) {
    var t = [], i = 0, n = s.length;
    while (i < n) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"' || c === "'") {
        var q = c, v = ''; i++;
        while (i < n && s[i] !== q) {
          if (s[i] === '\\') {
            i++;
            var e = s[i];
            v += e === 'n' ? '\n' : e === 't' ? '\t' : e;
          } else v += s[i];
          i++;
        }
        if (i >= n) error('cadena sin cerrar');
        i++;
        t.push({ k: 'str', v: v });
        continue;
      }
      var m = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (m) { t.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
      if (m) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
      var p = null;
      for (var j = 0; j < PUNT.length; j++) if (s.substr(i, PUNT[j].length) === PUNT[j]) { p = PUNT[j]; break; }
      if (!p) error('caracter no permitido: ' + c);
      t.push({ k: 'p', v: p }); i += p.length;
    }
    return t;
  }

  // ---------- Analizador (descenso recursivo) ----------
  function parsear(src) {
    var tk = tokenizar(src), pos = 0;
    function ver() { return tk[pos]; }
    function es(v) { var x = tk[pos]; return x && x.k === 'p' && x.v === v; }
    function esId(v) { var x = tk[pos]; return x && x.k === 'id' && x.v === v; }
    function tomar(v) { if (!es(v)) error('se esperaba ' + v); return tk[pos++]; }

    function programa() {
      var out = [];
      while (pos < tk.length) {
        if (es(';')) { pos++; continue; }
        out.push(sentencia());
      }
      return out;
    }
    function sentencia() {
      if (esId('return')) {
        pos++;
        if (!ver() || es(';')) return { t: 'ret', e: null };
        return { t: 'ret', e: expr() };
      }
      if (esId('if')) {
        pos++; tomar('(');
        var c = expr(); tomar(')');
        return { t: 'if', c: c, s: sentencia() };
      }
      return { t: 'ex', e: expr() };
    }
    function expr() { return asignacion(); }
    function asignacion() {
      var l = ternario();
      if (es('=')) {
        if (l.t !== 'mem' && l.t !== 'id') error('asignacion invalida');
        pos++;
        return { t: 'asig', l: l, r: asignacion() };
      }
      return l;
    }
    function ternario() {
      var c = o();
      if (es('?')) {
        pos++;
        var a = asignacion(); tomar(':');
        return { t: 'tern', c: c, a: a, b: asignacion() };
      }
      return c;
    }
    function o() { var l = y(); while (es('||')) { pos++; l = { t: 'bin', op: '||', l: l, r: y() }; } return l; }
    function y() { var l = igual(); while (es('&&')) { pos++; l = { t: 'bin', op: '&&', l: l, r: igual() }; } return l; }
    function igual() {
      var l = rel();
      while (es('===') || es('!==') || es('==') || es('!=')) { var op = tk[pos++].v; l = { t: 'bin', op: op, l: l, r: rel() }; }
      return l;
    }
    function rel() {
      var l = suma();
      while (es('<') || es('>') || es('<=') || es('>=')) { var op = tk[pos++].v; l = { t: 'bin', op: op, l: l, r: suma() }; }
      return l;
    }
    function suma() {
      var l = unario();
      while (es('+') || es('-') || es('*') || es('/') || es('%')) { var op = tk[pos++].v; l = { t: 'bin', op: op, l: l, r: unario() }; }
      return l;
    }
    function unario() {
      if (es('!')) { pos++; return { t: 'no', e: unario() }; }
      if (es('-')) { pos++; return { t: 'neg', e: unario() }; }
      if (esId('void')) { pos++; unario(); return { t: 'lit', v: undefined }; }
      if (esId('typeof')) { pos++; return { t: 'typeof', e: unario() }; }
      return postfijo();
    }
    function postfijo() {
      var e = primario();
      for (;;) {
        if (es('.')) {
          pos++;
          var id = tk[pos++];
          if (!id || id.k !== 'id') error('se esperaba nombre');
          e = { t: 'mem', o: e, p: { t: 'lit', v: id.v } };
        } else if (es('[')) {
          pos++;
          var idx = expr(); tomar(']');
          e = { t: 'mem', o: e, p: idx };
        } else if (es('(')) {
          pos++;
          var args = [];
          while (!es(')')) { args.push(expr()); if (es(',')) pos++; else break; }
          tomar(')');
          e = { t: 'call', f: e, a: args };
        } else break;
      }
      return e;
    }
    function primario() {
      var x = ver();
      if (!x) error('fin inesperado');
      if (x.k === 'num' || x.k === 'str') { pos++; return { t: 'lit', v: x.v }; }
      if (x.k === 'id') {
        // flecha de un parametro: e => ...
        if (tk[pos + 1] && tk[pos + 1].k === 'p' && tk[pos + 1].v === '=>') {
          pos += 2; return { t: 'flecha', ps: [x.v], b: asignacion() };
        }
        pos++;
        if (x.v === 'true') return { t: 'lit', v: true };
        if (x.v === 'false') return { t: 'lit', v: false };
        if (x.v === 'null') return { t: 'lit', v: null };
        if (x.v === 'undefined') return { t: 'lit', v: undefined };
        return { t: 'id', n: x.v };
      }
      if (es('(')) {
        // flecha sin o con varios parametros: () => ..., (a, b) => ...
        var j = pos + 1, ps = [];
        while (tk[j] && tk[j].k === 'id') { ps.push(tk[j].v); j++; if (tk[j] && tk[j].v === ',') j++; else break; }
        if (tk[j] && tk[j].v === ')' && tk[j + 1] && tk[j + 1].v === '=>') {
          pos = j + 2; return { t: 'flecha', ps: ps, b: asignacion() };
        }
        pos++;
        var e = expr(); tomar(')');
        return e;
      }
      if (es('{')) {
        pos++;
        var props = [];
        while (!es('}')) {
          var k = tk[pos++];
          if (!k || (k.k !== 'id' && k.k !== 'str' && k.k !== 'num')) error('clave de objeto invalida');
          tomar(':');
          props.push([String(k.v), asignacion()]);
          if (es(',')) pos++; else break;
        }
        tomar('}');
        return { t: 'obj', p: props };
      }
      if (es('[')) {
        pos++;
        var items = [];
        while (!es(']')) { items.push(asignacion()); if (es(',')) pos++; else break; }
        tomar(']');
        return { t: 'arr', i: items };
      }
      error('token inesperado: ' + x.v);
    }

    var ast = programa();
    return ast;
  }

  // ---------- Evaluador ----------
  function nombreSeguro(n) { if (PROHIBIDOS[n] === 1) error('nombre vedado: ' + n); return n; }

  function comprobarMiembro(o, p) {
    if (o === window) {
      var v = window[p];
      if (WINDOW_OK[p] !== 1 && !(typeof v === 'function' && !esNativa(v))) error('ventana: ' + p);
    } else if (o === document && DOCUMENT_OK[p] !== 1) error('documento: ' + p);
  }

  function evaluar(n, amb) {
    switch (n.t) {
      case 'lit': return n.v;
      case 'id':
        if (n.n === 'this') return amb.este;
        if (n.n === 'event') return amb.evento;
        if (Object.prototype.hasOwnProperty.call(amb.vars, n.n)) return amb.vars[n.n];
        if (RAICES_VEDADAS[n.n] === 1) error('raiz vedada: ' + n.n);
        var val = window[n.n];
        if (RAICES_OK[n.n] === 1 || val === undefined) return val;
        if (typeof val === 'function' && !esNativa(val)) return val; // funcion declarada por la pagina
        return error('raiz no permitida: ' + n.n);
      case 'mem': {
        var o = evaluar(n.o, amb), p = evaluar(n.p, amb);
        nombreSeguro(String(p));
        comprobarMiembro(o, String(p));
        return o == null ? undefined : o[p];
      }
      case 'call': {
        var f, ctx;
        if (n.f.t === 'mem') {
          ctx = evaluar(n.f.o, amb);
          var nm = evaluar(n.f.p, amb); nombreSeguro(String(nm));
          if (ctx == null) error('objeto nulo en llamada a ' + nm);
          comprobarMiembro(ctx, String(nm));
          f = ctx[nm];
        } else {
          f = evaluar(n.f, amb); ctx = window;
        }
        if (typeof f !== 'function') error('no es una funcion');
        if (esNativa(f)) {
          var nomf = n.f.t === 'mem' ? String(nm) : (n.f.n || '');
          if (NATIVOS_OK[nomf] !== 1) error('funcion nativa no permitida: ' + nomf);
        }
        var a = n.a.map(function (x) { return evaluar(x, amb); });
        return f.apply(ctx, a);
      }
      case 'bin': {
        if (n.op === '||') return evaluar(n.l, amb) || evaluar(n.r, amb);
        if (n.op === '&&') return evaluar(n.l, amb) && evaluar(n.r, amb);
        var l = evaluar(n.l, amb), r = evaluar(n.r, amb);
        switch (n.op) {
          case '===': return l === r; case '!==': return l !== r;
          case '==': return l == r; case '!=': return l != r; // eslint-disable-line eqeqeq
          case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r;
          case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return l / r; case '%': return l % r;
        }
        return error('operador');
      }
      case 'no': return !evaluar(n.e, amb);
      case 'neg': return -evaluar(n.e, amb);
      case 'typeof': return n.e.t === 'id' && !(n.e.n in amb.vars) && n.e.n !== 'this' && n.e.n !== 'event' ? typeof window[n.e.n] : typeof evaluar(n.e, amb);
      case 'tern': return evaluar(n.c, amb) ? evaluar(n.a, amb) : evaluar(n.b, amb);
      case 'obj': { var ob = {}; n.p.forEach(function (kv) { nombreSeguro(kv[0]); ob[kv[0]] = evaluar(kv[1], amb); }); return ob; }
      case 'arr': return n.i.map(function (x) { return evaluar(x, amb); });
      case 'flecha': return function () {
        var vars = Object.create(null);
        Object.keys(amb.vars).forEach(function (k) { vars[k] = amb.vars[k]; });
        for (var i = 0; i < n.ps.length; i++) vars[n.ps[i]] = arguments[i];
        return evaluar(n.b, { este: amb.este, evento: amb.evento, vars: vars });
      };
      case 'asig': {
        var v = evaluar(n.r, amb);
        if (n.l.t === 'id') {
          if (n.l.n === 'this' || n.l.n === 'event') error('asignacion invalida');
          nombreSeguro(n.l.n);
          if (Object.prototype.hasOwnProperty.call(amb.vars, n.l.n)) amb.vars[n.l.n] = v; else window[n.l.n] = v;
          return v;
        }
        var obj = evaluar(n.l.o, amb), prop = String(evaluar(n.l.p, amb));
        nombreSeguro(prop);
        if (obj == null) error('objeto nulo en asignacion');
        // no se permite fabricar URLs ejecutables
        if (typeof v === 'string' && /^\s*(javascript|data|vbscript):/i.test(v) && /^(href|src|location|action|formaction)$/i.test(prop)) error('url vedada');
        obj[prop] = v;
        return v;
      }
    }
    return error('nodo desconocido');
  }

  var CACHE = Object.create(null);
  function correr(texto, el, ev) {
    var prog = CACHE[texto] || (CACHE[texto] = parsear(texto));
    var amb = { este: el, evento: ev, vars: Object.create(null) };
    function ejecutar(lista) {
      for (var i = 0; i < lista.length; i++) {
        var s = lista[i];
        if (s.t === 'ret') {
          var v = s.e ? evaluar(s.e, amb) : undefined;
          if (v === false && ev && ev.cancelable) ev.preventDefault();
          return true;
        }
        if (s.t === 'if') { if (evaluar(s.c, amb) && ejecutar([s.s])) return true; continue; }
        evaluar(s.e, amb);
      }
      return false;
    }
    ejecutar(prog);
  }

  // ---------- Delegacion de eventos ----------
  // Los que burbujean se atienden subiendo desde el objetivo, como hacian los atributos en linea.
  var BURBUJEAN = ['click', 'input', 'change', 'submit', 'contextmenu', 'mouseover', 'mouseout', 'keydown', 'keyup'];
  var NO_BURBUJEAN = ['blur', 'focus', 'error', 'load'];

  function manejar(ev, subir) {
    var attr = 'data-on-' + ev.type;
    var el = ev.target;
    if (!(el instanceof Element)) return;
    while (el && el !== document) {
      if (el.hasAttribute && el.hasAttribute(attr)) {
        // en un atributo en linea currentTarget era el elemento; con delegacion seria document
        try { Object.defineProperty(ev, 'currentTarget', { value: el, configurable: true }); } catch (_) {}
        try { correr(el.getAttribute(attr), el, ev); }
        catch (e) { if (window.console) console.error(e.message, '->', el.getAttribute(attr)); }
        try { delete ev.currentTarget; } catch (_) {}
        if (ev.cancelBubble) break;
      }
      if (!subir) break;
      el = el.parentElement;
    }
  }
  BURBUJEAN.forEach(function (t) { document.addEventListener(t, function (e) { manejar(e, true); }); });
  NO_BURBUJEAN.forEach(function (t) { document.addEventListener(t, function (e) { manejar(e, false); }, true); });

  window.__uiEventos = { parsear: parsear };
})();
