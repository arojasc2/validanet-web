/**
 * vn-precios.js v2 — Sincronización dinámica de precios/features/tiers/packs.
 * Source of truth: /api/public/precios (DB validanet_addons_catalog + validanet_plans).
 *
 * Tags soportados:
 *   Básicos (campo: precio | nombre | desc | tokens):
 *     <span data-vn-plan="starter" data-vn-campo="precio">...</span>
 *     <span data-vn-addon="certificados" data-vn-campo="precio">...</span>
 *     <span data-vn-connect="pro" data-vn-campo="precio">...</span>
 *     <span data-vn-relator="pro" data-vn-campo="precio">...</span>
 *
 *   Avanzados (v2):
 *     <span data-vn-addon-tier="creador_cursos:express" data-vn-campo="price_neto">...</span>
 *       campos: price_neto | price_total | label | credits_value | hours_range
 *     <span data-vn-addon-pack="creador_cursos:decena" data-vn-campo="price_total">...</span>
 *       campos: credits | price_neto | price_total | discount_pct | label
 *     <ul data-vn-addon-features="certificados"></ul>     ← se llena con <li> por feature
 *     <ul data-vn-plan-features="pro"></ul>
 *
 *   Visibilidad condicional:
 *     <div data-vn-addon-tier-recommended="creador_cursos">visible solo si hay tier recommended</div>
 *
 * Cache: sessionStorage 1h. Cambios admin se ven al cerrar/abrir pestaña o tras
 * 1h. Para forzar refresh inmediato: sessionStorage.removeItem('vn_precios_cache').
 */
(function(){
  var API = 'https://app.validanet.cl/api/public/precios';
  var IVA_RATE = 0.19;

  function fmtClp(n, suffix){
    if(n == null) return 'Cotización';
    n = parseInt(n);
    if(!n || n === 0) return 'Gratis';
    return '$' + n.toLocaleString('es-CL') + (suffix || '');
  }
  function withIva(neto){
    if(neto == null) return null;
    return Math.round(neto * (1 + IVA_RATE));
  }

  function findInList(list, slug){
    return (list || []).find(function(x){ return x.slug === slug; });
  }

  // Planes que NUNCA muestran precio público — siempre bajo cotización.
  // Mantener sincronizado con el HTML (label CTA "Solicitar demo" / mailto).
  var COTIZACION_PLANS = { universidad: true };

  function aplicarPrecios(data){
    // ── Planes ValidaNet ──────────────────────────────────────────────
    (data.planes || []).forEach(function(plan){
      var esCotizacion = COTIZACION_PLANS[plan.slug] === true;
      document.querySelectorAll('[data-vn-plan="'+plan.slug+'"]').forEach(function(el){
        var campo = el.getAttribute('data-vn-campo') || 'precio';
        if(campo === 'precio')       el.textContent = esCotizacion ? 'Cotizar' : fmtClp(plan.price_clp);
        else if(campo === 'nombre')  el.textContent = plan.nombre;
        else if(campo === 'tokens')  el.textContent = parseInt(plan.tokens||0).toLocaleString('es-CL');
        else if(campo === 'desc')    el.textContent = plan.descripcion || '';
      });
    });
    document.querySelectorAll('[data-vn-plan-features]').forEach(function(el){
      var slug = el.getAttribute('data-vn-plan-features');
      var plan = findInList(data.planes, slug);
      if(!plan || !plan.features || !plan.features.length) return;
      el.innerHTML = plan.features.map(function(f){ return '<li>' + escapeHtml(f) + '</li>'; }).join('');
    });

    // ── Addons (precio base + nombre + desc) ──────────────────────────
    (data.addons || []).forEach(function(addon){
      document.querySelectorAll('[data-vn-addon="'+addon.slug+'"]').forEach(function(el){
        var campo = el.getAttribute('data-vn-campo') || 'precio';
        // No agregamos '/mes' al textContent: todos los HTML que usan
        // data-vn-campo="precio" ya tienen un <small>/mes</small> adyacente.
        // Si se duplicaba aparecía "$14.990/mes/mes". Consistente con planes (línea 55).
        if(campo === 'precio')       el.textContent = addon.gratis ? 'Gratis' : fmtClp(addon.price_clp);
        else if(campo === 'precio_desde') {
          // "desde $X" — útil para addons con varios tiers (toma el menor)
          var tiers = addon.pricing_tiers || [];
          var prices = tiers.map(function(t){ return t.price_clp_neto || t.price_clp; })
                            .filter(function(p){ return p && p > 0; });
          el.textContent = prices.length ? 'desde $' + Math.min.apply(null, prices).toLocaleString('es-CL') : fmtClp(addon.price_clp);
        }
        else if(campo === 'nombre')  el.textContent = addon.nombre;
        else if(campo === 'desc')    el.textContent = addon.descripcion || '';
        else if(campo === 'icon')    el.textContent = addon.icon || '🔧';
      });
    });

    // ── Addon features (lista) ────────────────────────────────────────
    document.querySelectorAll('[data-vn-addon-features]').forEach(function(el){
      var slug = el.getAttribute('data-vn-addon-features');
      var addon = findInList(data.addons, slug);
      if(!addon || !addon.features || !addon.features.length) return;
      el.innerHTML = addon.features.map(function(f){ return '<li>' + escapeHtml(f) + '</li>'; }).join('');
    });

    // ── Addon tiers (Creador de Cursos, Aula Virtual, etc.) ───────────
    document.querySelectorAll('[data-vn-addon-tier]').forEach(function(el){
      var ref = (el.getAttribute('data-vn-addon-tier')||'').split(':');
      if(ref.length !== 2) return;
      var addon = findInList(data.addons, ref[0]);
      if(!addon) return;
      var tier = findInList(addon.pricing_tiers, ref[1]);
      if(!tier) return;
      var campo = el.getAttribute('data-vn-campo') || 'price_neto';
      if(campo === 'price_neto')         el.textContent = fmtClp(tier.price_clp_neto);
      else if(campo === 'price_total')   el.textContent = fmtClp(withIva(tier.price_clp_neto));
      else if(campo === 'label')         el.textContent = tier.label || tier.slug;
      else if(campo === 'credits_value') el.textContent = tier.credits_value || 1;
      else if(campo === 'hours_range') {
        var hi = tier.hours_max==null ? '+' : ('-' + tier.hours_max);
        el.textContent = (tier.hours_min||0) + (tier.hours_max==null ? '+ h' : ('-' + tier.hours_max + ' h'));
      }
      else if(campo === 'modules_range') {
        el.textContent = (tier.modules_min||0) + (tier.modules_max==null ? '+ módulos' : ('-' + tier.modules_max + ' módulos'));
      }
    });

    // ── Addon packs (Creador de Cursos prepago) ───────────────────────
    // Soporta slugs compound (trio_express, decena_pro, etc.) y aliases
    // legacy cortos (trio → trio_express) por compat con HTML viejo.
    document.querySelectorAll('[data-vn-addon-pack]').forEach(function(el){
      var ref = (el.getAttribute('data-vn-addon-pack')||'').split(':');
      if(ref.length !== 2) return;
      var addon = findInList(data.addons, ref[0]);
      if(!addon) return;
      var pack = findInList(addon.pack_options, ref[1]);
      if(!pack){
        // Fallback legacy: 'trio' → 'trio_express', etc.
        pack = findInList(addon.pack_options, ref[1] + '_express');
      }
      if(!pack) return;
      var campo = el.getAttribute('data-vn-campo') || 'price_neto';
      // 'n_cursos' (nuevo) o 'credits' (compat) — la UI muestra cursos del tier
      var n = pack.n_cursos != null ? pack.n_cursos : (pack.credits || 0);
      if(campo === 'credits')           el.textContent = n;
      else if(campo === 'n_cursos')     el.textContent = n;
      else if(campo === 'price_neto')   el.textContent = fmtClp(pack.price_clp_neto);
      else if(campo === 'price_total')  el.textContent = fmtClp(withIva(pack.price_clp_neto));
      else if(campo === 'discount_pct') el.textContent = (pack.discount_pct||0) + '%';
      else if(campo === 'label')        el.textContent = pack.label || pack.slug;
      else if(campo === 'tier_slug')    el.textContent = pack.tier_slug || 'express';
    });

    // ── Addon packs por tier: auto-render grid completa ──────────────
    // Markup:  <div data-vn-addon-packs-grid="creador_cursos:express"></div>
    // Renderiza los 4 packs (Trío/Quinteto/Decena/Volumen) de ese tier como
    // cards con su CTA "Comprar pack". El admin agrega/quita packs desde DB
    // y la landing se actualiza sola.
    document.querySelectorAll('[data-vn-addon-packs-grid]').forEach(function(el){
      var ref = (el.getAttribute('data-vn-addon-packs-grid')||'').split(':');
      if(ref.length !== 2) return;
      var addon = findInList(data.addons, ref[0]);
      if(!addon || !Array.isArray(addon.pack_options)) return;
      var tierSlug = ref[1].toLowerCase();
      var packs = addon.pack_options.filter(function(p){
        return (p.tier_slug||'express').toLowerCase() === tierSlug;
      });
      // Orden estable: por n_cursos ascendente
      packs.sort(function(a,b){
        return (a.n_cursos||a.credits||0) - (b.n_cursos||b.credits||0);
      });
      if(!packs.length){ el.innerHTML = ''; return; }
      el.innerHTML = packs.map(function(p){
        var label = escapeHtml(p.label || p.slug);
        var n = p.n_cursos != null ? p.n_cursos : (p.credits || 0);
        var price = fmtClp(p.price_clp_neto);
        var disc = (p.discount_pct||0) + '%';
        var rec = p.recommended;
        // Si la landing cargó vn-signup-modal.js, abrimos el modal de compra pública
        // (crea cuenta + paga). Si no, fallback al dashboard interno (requiere login previo).
        var safeSlug = (p.slug || '').replace(/'/g, "\\'");
        var safeLabel = (p.label || p.slug || '').replace(/'/g, "\\'");
        var hrefAttr = 'href="https://app.validanet.cl/api/validanet/dashboard/?next=buy-pack-' + encodeURIComponent(p.slug) + '"';
        var onclickAttr = 'onclick="if(window.vnOpenSignup){event.preventDefault(); window.vnOpenSignup({pack_slug:\''+safeSlug+'\', label:\'Pack '+safeLabel+'\'}); return false;}"';
        var cardStyle = rec
          ? 'border-color:#7ab31a;background:#f0fdf4;cursor:pointer;transition:transform .15s,box-shadow .15s;'
          : 'cursor:pointer;transition:transform .15s,box-shadow .15s;';
        var ctaColor = rec ? '#166534' : '#92400e';
        var nLabel = (n === 1 ? 'curso' : 'cursos');
        return ''
          + '<a '+hrefAttr+' '+onclickAttr+' style="text-decoration:none;color:inherit;">'
          +   '<div class="pack" style="'+cardStyle+'" '
          +        'onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 22px rgba(0,0,0,.10)\';" '
          +        'onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';">'
          +     '<div class="pack-name">'+label+(rec?' ⭐':'')+'</div>'
          +     '<div class="pack-n">'+n+' '+nLabel+'</div>'
          +     '<div class="pack-price">'+price+'<span class="pack-iva">+ IVA</span></div>'
          +     '<div class="pack-saving">'+disc+' OFF</div>'
          +     '<div style="margin-top:12px;font-size:12px;color:'+ctaColor+';font-weight:700;">🛒 Comprar pack →</div>'
          +   '</div>'
          + '</a>';
      }).join('');
    });

    // ── Connect Empresas (cn_empresa_planes, heredados de validanet_plans) ──
    (data.connect_empresas || []).forEach(function(p){
      document.querySelectorAll('[data-vn-connect="'+p.slug+'"]').forEach(function(el){
        var campo = el.getAttribute('data-vn-campo') || 'precio';
        if(campo === 'precio')      el.textContent = fmtClp(p.price_clp);
        else if(campo === 'nombre') el.textContent = p.nombre;
      });
    });
    // ── Empresas Cliente Connect (cn_empresa_cliente_planes) ────────
    // Planes para empresas que SOLO usan Connect para buscar capacitación
    // (sin Validanet). Buscador/Conecta/Empresa Pro a $0/$9.990/$19.990.
    // Campos soportados: precio | nombre | solicitudes_semana | propuestas
    //   | match_ia | contratos | firma | calculadora_sence | historial | soporte
    (data.connect_empresas_cliente || []).forEach(function(p){
      document.querySelectorAll('[data-vn-empresa-cliente="'+p.slug+'"]').forEach(function(el){
        var campo = el.getAttribute('data-vn-campo') || 'precio';
        if     (campo === 'precio')              el.textContent = fmtClp(p.price_clp);
        else if(campo === 'nombre')              el.textContent = p.nombre;
        else if(campo === 'solicitudes_semana') el.textContent = fmtCuota(p.max_solicitudes_semana);
        else if(campo === 'propuestas')          el.textContent = fmtCuota(p.max_propuestas_ver);
        else if(campo === 'match_ia')            el.textContent = fmtBool(p.match_ia);
        else if(campo === 'contratos')           el.textContent = fmtBool(p.permite_contratos);
        else if(campo === 'firma')               el.textContent = fmtBool(p.permite_firma);
        else if(campo === 'calculadora_sence')   el.textContent = fmtBool(p.calculadora_sence);
        else if(campo === 'historial')           el.textContent = fmtBool(p.historial);
        else if(campo === 'soporte')             el.textContent = fmtBool(p.soporte_prioritario);
      });
    });
    // ── Relatores ────────────────────────────────────────────────────
    // Campos soportados:
    //   precio | nombre — básico
    //   postulaciones | contactos | chat — cuotas mensuales (número o "Ilimitado" si -1)
    //   contratos | firma | badge_validado | badge_experto | notif_whatsapp | notif_email
    //     | stats | historial | soporte | match_ia — booleanos (✓/—)
    function fmtCuota(n){
      if(n == null) return '—';
      n = parseInt(n);
      if(n === -1) return 'Ilimitado';
      return n.toLocaleString('es-CL');
    }
    function fmtBool(b){ return b ? '✓' : '—'; }
    (data.connect_relatores || []).forEach(function(p){
      document.querySelectorAll('[data-vn-relator="'+p.slug+'"]').forEach(function(el){
        var campo = el.getAttribute('data-vn-campo') || 'precio';
        if     (campo === 'precio')        el.textContent = fmtClp(p.price_clp);
        else if(campo === 'nombre')        el.textContent = p.nombre;
        else if(campo === 'postulaciones') el.textContent = fmtCuota(p.max_postulaciones_mes);
        else if(campo === 'contactos')     el.textContent = fmtCuota(p.max_contactos_mes);
        else if(campo === 'chat')          el.textContent = fmtCuota(p.max_chat_mes);
        else if(campo === 'contratos')     el.textContent = fmtBool(p.permite_contratos);
        else if(campo === 'firma')         el.textContent = fmtBool(p.permite_firma);
        else if(campo === 'badge_validado')el.textContent = fmtBool(p.badge_validado);
        else if(campo === 'badge_experto') el.textContent = fmtBool(p.badge_experto);
        else if(campo === 'notif_whatsapp')el.textContent = fmtBool(p.notif_whatsapp);
        else if(campo === 'notif_email')   el.textContent = fmtBool(p.notif_email);
        else if(campo === 'stats')         el.textContent = fmtBool(p.stats_perfil);
        else if(campo === 'historial')     el.textContent = fmtBool(p.historial_contratos);
        else if(campo === 'soporte')       el.textContent = fmtBool(p.soporte_prioritario);
        else if(campo === 'match_ia')      el.textContent = fmtBool(p.match_ia);
      });
    });

    // ── Sufijos /mes automáticos ─────────────────────────────────────
    document.querySelectorAll('[data-vn-sufijo]').forEach(function(el){
      el.textContent = el.getAttribute('data-vn-sufijo');
    });

    // ── Auto-hide: cards/secciones cuyos addons fueron ocultados o
    // desactivados desde el admin. Markup esperado:
    //   <div data-vn-addon-card="firma_electronica">…</div>
    // Si el addon NO está en la respuesta (porque show_in_marketplace=false o
    // active=false), el elemento se oculta con display:none. Si reaparece
    // (admin lo vuelve a marcar visible), se muestra al recargar.
    var visibleSlugs = {};
    (data.addons||[]).forEach(function(a){ visibleSlugs[a.slug] = true; });
    document.querySelectorAll('[data-vn-addon-card]').forEach(function(el){
      var slug = el.getAttribute('data-vn-addon-card');
      el.style.display = visibleSlugs[slug] ? '' : 'none';
    });
    // Mismo principio para planes: data-vn-plan-card="starter"
    var visiblePlans = {};
    (data.planes||[]).forEach(function(p){ visiblePlans[p.slug] = true; });
    document.querySelectorAll('[data-vn-plan-card]').forEach(function(el){
      var slug = el.getAttribute('data-vn-plan-card');
      el.style.display = visiblePlans[slug] ? '' : 'none';
    });

    console.log('[ValidaNet] Precios + features + tiers + packs sincronizados desde BD');
  }

  function escapeHtml(s){
    return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Cache stale-while-revalidate: pinta cacheado instantáneo + refetch background.
  // TTL hard: 5min. Si el cache es más viejo, no se pinta cached — sólo fetch fresh.
  // Si admin acaba de cambiar precios: máximo 5min de delay (o instantáneo si SWR
  // alcanza a aplicar antes de que el usuario mire). Para refresh manual:
  //   sessionStorage.removeItem('vn_precios_cache_v2')
  var cacheKey = 'vn_precios_cache_v2';
  var cacheTs  = 'vn_precios_ts_v2';
  var ahora    = Date.now();
  var TTL_MS   = 5 * 60 * 1000;
  var cached   = sessionStorage.getItem(cacheKey);
  var ts       = parseInt(sessionStorage.getItem(cacheTs)||0);
  var cacheFresh = cached && (ahora - ts) < TTL_MS;
  if(cacheFresh){
    try { aplicarPrecios(JSON.parse(cached)); } catch(_) { /* fetch igual abajo */ }
  }
  // Siempre fetch en background — SWR: si la respuesta difiere del cache,
  // sobreescribe lo que está pintado en pantalla.
  fetchFresh();
  function fetchFresh(){
    fetch(API, {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data.ok) return;
        var serialized = JSON.stringify(data);
        // Solo re-aplicar si el contenido cambió respecto al cache (evita reflow innecesario)
        if(serialized !== cached){
          aplicarPrecios(data);
        }
        sessionStorage.setItem(cacheKey, serialized);
        sessionStorage.setItem(cacheTs, Date.now().toString());
      })
      .catch(function(e){ console.warn('[ValidaNet] Error cargando precios:', e); });
  }
})();
