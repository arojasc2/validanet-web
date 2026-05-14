/**
 * vn-precios.js — Sincronización automática de precios desde BD Validanet
 * Uso: <script src="/vn-precios.js"></script>
 * Tags: data-vn-plan="starter" data-vn-addon="certificados" data-vn-connect="pro" data-vn-relator="pro"
 */
(function(){
  var API = 'https://app.validanet.cl/api/public/precios';

  function fmtClp(n){
    if(!n || n===0) return 'Gratis';
    return '$' + parseInt(n).toLocaleString('es-CL');
  }

  function aplicarPrecios(data){
    // ── Planes ValidaNet ──────────────────────────────
    var planesMap = {};
    (data.planes||[]).forEach(function(p){ planesMap[p.slug]=p; });

    document.querySelectorAll('[data-vn-plan]').forEach(function(el){
      var slug = el.getAttribute('data-vn-plan');
      var campo = el.getAttribute('data-vn-campo') || 'precio';
      var plan = planesMap[slug];
      if(!plan) return;
      if(campo==='precio')      el.textContent = fmtClp(plan.price_clp);
      else if(campo==='nombre') el.textContent = plan.nombre;
      else if(campo==='tokens') el.textContent = parseInt(plan.tokens||0).toLocaleString('es-CL');
      else if(campo==='desc')   el.textContent = plan.descripcion||'';
    });

    // ── Addons ────────────────────────────────────────
    var addonsMap = {};
    (data.addons||[]).forEach(function(a){ addonsMap[a.slug]=a; });

    document.querySelectorAll('[data-vn-addon]').forEach(function(el){
      var slug = el.getAttribute('data-vn-addon');
      var campo = el.getAttribute('data-vn-campo') || 'precio';
      var addon = addonsMap[slug];
      if(!addon) return;
      if(campo==='precio')      el.textContent = addon.gratis ? 'Gratis' : fmtClp(addon.price_clp)+'/mes';
      else if(campo==='nombre') el.textContent = addon.nombre;
      else if(campo==='desc')   el.textContent = addon.descripcion||'';
    });

    // ── Connect Empresas ──────────────────────────────
    var conectMap = {};
    (data.connect_empresas||[]).forEach(function(p){ conectMap[p.slug]=p; });

    document.querySelectorAll('[data-vn-connect]').forEach(function(el){
      var slug = el.getAttribute('data-vn-connect');
      var campo = el.getAttribute('data-vn-campo') || 'precio';
      var plan = conectMap[slug];
      if(!plan) return;
      if(campo==='precio')      el.textContent = fmtClp(plan.price_clp);
      else if(campo==='nombre') el.textContent = plan.nombre;
    });

    // ── Relatores ────────────────────────────────────
    var relMap = {};
    (data.connect_relatores||[]).forEach(function(p){ relMap[p.slug]=p; });

    document.querySelectorAll('[data-vn-relator]').forEach(function(el){
      var slug = el.getAttribute('data-vn-relator');
      var campo = el.getAttribute('data-vn-campo') || 'precio';
      var plan = relMap[slug];
      if(!plan) return;
      if(campo==='precio')      el.textContent = fmtClp(plan.price_clp);
      else if(campo==='nombre') el.textContent = plan.nombre;
    });

    // ── Sufijos /mes automáticos ──────────────────────
    document.querySelectorAll('[data-vn-sufijo]').forEach(function(el){
      el.textContent = el.getAttribute('data-vn-sufijo');
    });

    console.log('[ValidaNet] Precios sincronizados desde BD');
  }

  // Cargar precios con cache 1 hora en sessionStorage
  var cacheKey = 'vn_precios_cache';
  var cacheTs  = 'vn_precios_ts';
  var ahora    = Date.now();
  var cached   = sessionStorage.getItem(cacheKey);
  var ts       = parseInt(sessionStorage.getItem(cacheTs)||0);

  if(cached && (ahora - ts) < 3600000){
    aplicarPrecios(JSON.parse(cached));
  } else {
    fetch(API)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.ok){
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
          sessionStorage.setItem(cacheTs, ahora.toString());
          aplicarPrecios(data);
        }
      })
      .catch(function(e){ console.warn('[ValidaNet] Error cargando precios:', e); });
  }
})();
