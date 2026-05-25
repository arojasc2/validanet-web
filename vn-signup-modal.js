/**
 * vn-signup-modal.js — Modal compartido de signup/compra para landings Validanet.
 *
 * Uso:
 *   <script src="/vn-signup-modal.js" defer></script>
 *   Luego desde un botón:
 *     <button onclick="vnOpenSignup({plan_slug:'pro'})">Comprar Pro</button>
 *     <button onclick="vnOpenSignup({tier_slug:'express'})">Comprar crédito Express</button>
 *     <button onclick="vnOpenSignup({pack_slug:'decena_standard'})">Comprar pack</button>
 *
 *   Compat retro: vnOpenSignup('pro') equivale a vnOpenSignup({plan_slug:'pro'}).
 *
 * Backend: POST https://app.validanet.cl/api/public/signup/start
 *   body: {email, password, contact_name, plan_slug|tier_slug|pack_slug, payment_method}
 *
 * Si #vn-signup-modal ya existe en la página (ej. index.html lo tiene inline),
 * el componente NO inyecta el HTML duplicado — solo registra window.vnOpenSignup.
 */
(function(){
  if (window.__vnSignupModalLoaded) return;
  window.__vnSignupModalLoaded = true;

  var API_BASE = 'https://app.validanet.cl';

  function injectStyles(){
    if (document.getElementById('vn-signup-modal-styles')) return;
    var css = ''
      + '#vn-signup-modal{position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:9999;'
      + '  display:none;align-items:center;justify-content:center;padding:16px;}'
      + '#vn-signup-modal.open{display:flex;}'
      + '#vn-signup-modal .box{background:white;max-width:480px;width:100%;border-radius:16px;'
      + '  padding:32px 28px;box-shadow:0 16px 64px rgba(0,0,0,.3);max-height:92vh;overflow-y:auto;position:relative;}'
      + '#vn-signup-modal h3{margin:0 0 4px;color:#0f172a;font-size:22px;font-weight:800;}'
      + '#vn-signup-modal .plan-pill{display:inline-block;background:#f0fdf4;color:#166534;'
      + '  border-radius:99px;padding:4px 12px;font-size:12px;font-weight:700;margin-bottom:18px;}'
      + '#vn-signup-modal label{display:block;font-size:13px;font-weight:600;color:#475569;'
      + '  margin-bottom:6px;margin-top:14px;}'
      + '#vn-signup-modal input[type=text],#vn-signup-modal input[type=email],'
      + '#vn-signup-modal input[type=password]{width:100%;border:1.5px solid #e2e8f0;'
      + '  border-radius:8px;padding:10px 12px;font-size:14px;box-sizing:border-box;}'
      + '#vn-signup-modal input:focus{outline:none;border-color:#7ab31a;}'
      + '#vn-signup-modal .pay-options{display:flex;gap:8px;margin-top:8px;}'
      + '#vn-signup-modal .pay-options label{flex:1;border:1.5px solid #e2e8f0;border-radius:10px;'
      + '  padding:12px;cursor:pointer;margin:0;text-align:center;display:flex;flex-direction:column;'
      + '  align-items:center;gap:4px;}'
      + '#vn-signup-modal .pay-options input{display:none;}'
      + '#vn-signup-modal .pay-options label.sel{border-color:#7ab31a;background:#f0fdf4;}'
      + '#vn-signup-modal .pay-icon{font-size:22px;}'
      + '#vn-signup-modal .submit{margin-top:24px;width:100%;background:#7ab31a;color:white;'
      + '  border:0;border-radius:10px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;}'
      + '#vn-signup-modal .submit:disabled{background:#94a3b8;cursor:not-allowed;}'
      + '#vn-signup-modal .close{position:absolute;top:14px;right:18px;background:none;border:0;'
      + '  font-size:24px;color:#64748b;cursor:pointer;line-height:1;}'
      + '#vn-signup-modal .err{color:#b91c1c;font-size:13px;margin-top:10px;display:none;'
      + '  background:#fef2f2;padding:8px 12px;border-radius:8px;}'
      + '#vn-signup-modal .legal{font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.5;}'
      + '#vn-signup-modal .success{text-align:center;}'
      + '#vn-signup-modal .success .check{font-size:54px;color:#7ab31a;}'
      + '#vn-signup-modal .bank-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;'
      + '  padding:14px;margin-top:14px;font-size:13px;}'
      + '#vn-signup-modal .bank-info b{color:#0f172a;}'
      + '#vn-signup-modal .ref-box{background:#f0fdf4;border:1px dashed #7ab31a;border-radius:8px;'
      + '  padding:8px 12px;text-align:center;margin:10px 0;font-family:monospace;font-size:16px;'
      + '  font-weight:700;color:#166534;}';
    var s = document.createElement('style');
    s.id = 'vn-signup-modal-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function injectHtml(){
    if (document.getElementById('vn-signup-modal')) return;
    var html = ''
      + '<div id="vn-signup-modal">'
      + '  <div class="box">'
      + '    <button class="close" onclick="vnCloseSignup()">×</button>'
      + '    <div id="vn-signup-form-wrap">'
      + '      <h3>Crea tu cuenta Validanet</h3>'
      + '      <div class="plan-pill" id="vn-plan-pill">—</div>'
      + '      <label>Email</label>'
      + '      <input type="email" id="vn-su-email" autocomplete="email" placeholder="tucorreo@ejemplo.cl">'
      + '      <label>Contraseña</label>'
      + '      <input type="password" id="vn-su-pw" autocomplete="new-password" placeholder="Mínimo 8 caracteres">'
      + '      <label>Tu nombre</label>'
      + '      <input type="text" id="vn-su-name" autocomplete="name" placeholder="Nombre y apellido">'
      + '      <div id="vn-su-pay-wrap">'
      + '        <label style="margin-top:18px;">Método de pago</label>'
      + '        <div class="pay-options">'
      + '          <label id="vn-pay-flow"><input type="radio" name="vn-pay" value="flow" checked>'
      + '            <div class="pay-icon">💳</div><div style="font-size:12px;font-weight:700;">Flow</div>'
      + '            <div style="font-size:10px;color:#94a3b8;">Tarjeta · WebPay</div></label>'
      + '          <label id="vn-pay-transfer"><input type="radio" name="vn-pay" value="transfer">'
      + '            <div class="pay-icon">🏦</div><div style="font-size:12px;font-weight:700;">Transferencia</div>'
      + '            <div style="font-size:10px;color:#94a3b8;">Espera 24h</div></label>'
      + '        </div>'
      + '      </div>'
      + '      <div class="err" id="vn-su-err"></div>'
      + '      <button class="submit" id="vn-su-submit" onclick="vnSubmitSignup()">Continuar →</button>'
      + '      <p class="legal">Al continuar aceptas los <a href="/terminos" style="color:#7ab31a;">Términos</a> y la <a href="/privacidad" style="color:#7ab31a;">Política de Privacidad</a>.</p>'
      + '    </div>'
      + '    <div id="vn-signup-result-wrap" style="display:none;"></div>'
      + '  </div>'
      + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // CURRENT_PURCHASE guarda los slugs efectivos a enviar al backend.
  // Forma: {plan_slug?, tier_slug?, pack_slug?}.
  var CURRENT_PURCHASE = {};

  function normalizeOpts(arg){
    if (!arg) return {plan_slug: null};
    if (typeof arg === 'string') return {plan_slug: arg};
    return {
      plan_slug: arg.plan_slug || null,
      tier_slug: arg.tier_slug || null,
      pack_slug: arg.pack_slug || null,
      label:     arg.label     || null
    };
  }

  function deriveLabel(opts){
    if (opts.label) return opts.label;
    if (opts.plan_slug){
      var planLabels = {
        free:'Plan Free — Gratis', starter:'Plan Starter', pro:'Plan Pro',
        enterprise:'Plan Enterprise', universidad:'Plan Universidad — Bajo cotización'
      };
      return planLabels[opts.plan_slug] || ('Plan ' + opts.plan_slug);
    }
    if (opts.tier_slug){
      var tierLabels = {express:'Crédito Express', standard:'Crédito Standard', pro:'Crédito Pro'};
      return tierLabels[opts.tier_slug] || ('Crédito ' + opts.tier_slug);
    }
    if (opts.pack_slug){
      return 'Pack ' + opts.pack_slug.replace(/_/g, ' ');
    }
    return '—';
  }

  function isFreePlan(opts){
    return opts.plan_slug === 'free';
  }

  window.vnOpenSignup = function(arg){
    injectStyles(); injectHtml();
    var opts = normalizeOpts(arg);
    CURRENT_PURCHASE = opts;
    var isFree = isFreePlan(opts);
    var label = deriveLabel(opts);

    document.getElementById('vn-plan-pill').textContent = label;
    document.getElementById('vn-su-pay-wrap').style.display = isFree ? 'none' : '';
    document.getElementById('vn-signup-form-wrap').style.display = '';
    document.getElementById('vn-signup-result-wrap').style.display = 'none';
    document.getElementById('vn-su-err').style.display = 'none';
    var btn = document.getElementById('vn-su-submit');
    btn.disabled = false;
    btn.textContent = isFree ? 'Crear cuenta gratis →' : 'Continuar →';
    document.getElementById('vn-signup-modal').classList.add('open');
    setTimeout(function(){ var em = document.getElementById('vn-su-email'); if (em) em.focus(); }, 80);

    if (window.gtag) gtag('event','signup_modal_open', opts);
  };

  window.vnCloseSignup = function(){
    var m = document.getElementById('vn-signup-modal');
    if (m) m.classList.remove('open');
  };

  function bindGlobalHandlers(){
    if (window.__vnSignupHandlersBound) return;
    window.__vnSignupHandlersBound = true;
    document.addEventListener('click', function(e){
      // Selección visual de método de pago
      var r = e.target.closest && e.target.closest('#vn-signup-modal .pay-options label');
      if (r){
        document.querySelectorAll('#vn-signup-modal .pay-options label').forEach(function(l){ l.classList.remove('sel'); });
        r.classList.add('sel');
        return;
      }
      // Click en backdrop cierra el modal
      if (e.target && e.target.id === 'vn-signup-modal') vnCloseSignup();
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') vnCloseSignup(); });
  }

  function showErr(msg){
    var el = document.getElementById('vn-su-err');
    if (!el) return;
    el.textContent = msg; el.style.display = 'block';
  }

  window.vnSubmitSignup = async function(){
    var email = document.getElementById('vn-su-email').value.trim();
    var pw    = document.getElementById('vn-su-pw').value;
    var name  = document.getElementById('vn-su-name').value.trim();
    var payRadio = document.querySelector('#vn-signup-modal .pay-options input:checked');
    var pmethod  = isFreePlan(CURRENT_PURCHASE) ? 'free' : (payRadio ? payRadio.value : 'flow');

    if (!email || !email.includes('@')) return showErr('Ingresá un email válido.');
    if (!pw || pw.length < 8)           return showErr('La contraseña debe tener al menos 8 caracteres.');
    if (!name)                           return showErr('Ingresá tu nombre.');

    var btn = document.getElementById('vn-su-submit');
    btn.disabled = true; btn.textContent = 'Procesando…';

    var body = {email: email, password: pw, contact_name: name, payment_method: pmethod};
    if (CURRENT_PURCHASE.plan_slug) body.plan_slug = CURRENT_PURCHASE.plan_slug;
    if (CURRENT_PURCHASE.tier_slug) body.tier_slug = CURRENT_PURCHASE.tier_slug;
    if (CURRENT_PURCHASE.pack_slug) body.pack_slug = CURRENT_PURCHASE.pack_slug;

    try {
      var r = await fetch(API_BASE + '/api/public/signup/start', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      var d = await r.json();
      if (!r.ok){
        btn.disabled = false; btn.textContent = isFreePlan(CURRENT_PURCHASE) ? 'Crear cuenta gratis →' : 'Continuar →';
        var msg = (d && d.detail) ? (typeof d.detail === 'string' ? d.detail : (d.detail[0] && d.detail[0].msg) || 'Error al procesar.') : 'Error al procesar. Intentá de nuevo.';
        return showErr(msg);
      }
      if (window.gtag) gtag('event','signup_started', Object.assign({method: pmethod}, CURRENT_PURCHASE));

      if (d.next === 'redirect' && d.redirect_url){
        window.location.href = d.redirect_url;
        return;
      }
      showResult(d, pmethod);
    } catch(e){
      btn.disabled = false; btn.textContent = 'Continuar →';
      showErr('Error de conexión: ' + e.message);
    }
  };

  function showResult(d, pmethod){
    document.getElementById('vn-signup-form-wrap').style.display = 'none';
    var w = document.getElementById('vn-signup-result-wrap');
    w.style.display = 'block';
    var html;
    if (pmethod === 'free'){
      html = '<div class="success">'
        + '<div class="check">✓</div>'
        + '<h3>¡Cuenta creada!</h3>'
        + '<p style="color:#64748b;margin:8px 0 18px;">' + (d.message || 'Iniciá sesión con tu email y contraseña.') + '</p>'
        + '<a href="' + (d.login_url || (API_BASE + '/api/validanet/dashboard/#login')) + '" class="submit" style="display:inline-block;text-decoration:none;max-width:280px;">Ir al login →</a>'
        + '</div>';
    } else if (pmethod === 'transfer'){
      var b = d.bank || {};
      var email = document.getElementById('vn-su-email').value;
      html = '<h3>📋 Datos para transferencia</h3>'
        + '<p style="color:#64748b;margin:8px 0 14px;">Realiza la transferencia con esta referencia. Una vez confirmada (24h hábiles), te enviaremos un email con tus credenciales y el ítem comprado quedará activo en tu cuenta.</p>'
        + '<div class="ref-box">Glosa/Asunto: ' + (d.transfer_ref || '—') + '</div>'
        + '<div class="bank-info">'
          + '<div><b>Banco:</b> ' + (b.banco || '') + '</div>'
          + '<div><b>Titular:</b> ' + (b.titular || '') + '</div>'
          + '<div><b>RUT:</b> ' + (b.rut || '') + '</div>'
          + '<div><b>Tipo:</b> ' + (b.cuenta_tipo || '') + '</div>'
          + '<div><b>N° Cuenta:</b> ' + (b.cuenta_numero || '') + '</div>'
          + '<div><b>Email comprobante:</b> ' + (b.email || 'contacto@norteduc.cl') + '</div>'
          + '<div style="margin-top:10px;font-size:16px;"><b>Monto:</b> $' + (d.amount_clp || 0).toLocaleString('es-CL') + ' CLP</div>'
        + '</div>'
        + '<p class="legal">Reenviamos estos datos por email a <b>' + email + '</b>. Guárdalos.</p>'
        + '<button class="submit" onclick="vnCloseSignup()">Entendido</button>';
    }
    w.innerHTML = html;
  }

  // Bind handlers cuando el DOM esté listo
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindGlobalHandlers);
  } else {
    bindGlobalHandlers();
  }
})();
