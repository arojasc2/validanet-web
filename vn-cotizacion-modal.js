/**
 * vn-cotizacion-modal.js — Modal compartido para solicitar cotización (Universidad, Enterprise, etc.)
 *
 * Uso:
 *   <script src="/vn-cotizacion-modal.js" defer></script>
 *   <button onclick="vnOpenCotizacion({tipo:'universidad', titulo:'Plan Universidad'})">Cotizar</button>
 *
 * Opciones (objeto opcional):
 *   tipo:    string identificador (se guarda en metadata + se incluye en origen)
 *            Defaults a 'universidad'.
 *   titulo:  texto del header del modal (default: 'Solicitar cotización')
 *   subtitulo: descripción debajo del titulo
 *   origen:  string que se manda al backend (default: 'cotizacion_' + tipo)
 *
 * POST: https://app.validanet.cl/api/validanet/public/lead
 *   body: {email, origen, nombre, telefono, empresa, mensaje, metadata:{tipo, cargo, tamano}}
 *
 * Los leads aparecen en https://app.validanet.cl/admin/leads (tab del admin UI).
 */
(function(){
  if (window.__vnCotizacionModalLoaded) return;
  window.__vnCotizacionModalLoaded = true;

  var API_BASE = 'https://app.validanet.cl';
  var CURRENT_OPTS = {};

  function injectStyles(){
    if (document.getElementById('vn-cotizacion-modal-styles')) return;
    var css = ''
      + '#vn-cotizacion-modal{position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:9999;'
      + '  display:none;align-items:center;justify-content:center;padding:16px;}'
      + '#vn-cotizacion-modal.open{display:flex;}'
      + '#vn-cotizacion-modal .box{background:white;max-width:520px;width:100%;border-radius:16px;'
      + '  padding:32px 28px;box-shadow:0 16px 64px rgba(0,0,0,.3);max-height:92vh;overflow-y:auto;position:relative;}'
      + '#vn-cotizacion-modal h3{margin:0 0 4px;color:#0f172a;font-size:22px;font-weight:800;}'
      + '#vn-cotizacion-modal .sub{color:#64748b;font-size:14px;margin:0 0 16px;line-height:1.5;}'
      + '#vn-cotizacion-modal label{display:block;font-size:13px;font-weight:600;color:#475569;'
      + '  margin-bottom:6px;margin-top:14px;}'
      + '#vn-cotizacion-modal label .req{color:#dc2626;}'
      + '#vn-cotizacion-modal input,#vn-cotizacion-modal textarea,#vn-cotizacion-modal select{'
      + '  width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;'
      + '  font-size:14px;box-sizing:border-box;font-family:inherit;}'
      + '#vn-cotizacion-modal textarea{min-height:80px;resize:vertical;}'
      + '#vn-cotizacion-modal input:focus,#vn-cotizacion-modal textarea:focus,#vn-cotizacion-modal select:focus{'
      + '  outline:none;border-color:#1e3a5f;}'
      + '#vn-cotizacion-modal .submit{margin-top:22px;width:100%;background:#1e3a5f;color:white;'
      + '  border:0;border-radius:10px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;}'
      + '#vn-cotizacion-modal .submit:disabled{background:#94a3b8;cursor:not-allowed;}'
      + '#vn-cotizacion-modal .close{position:absolute;top:14px;right:18px;background:none;border:0;'
      + '  font-size:24px;color:#64748b;cursor:pointer;line-height:1;}'
      + '#vn-cotizacion-modal .err{color:#b91c1c;font-size:13px;margin-top:10px;display:none;'
      + '  background:#fef2f2;padding:8px 12px;border-radius:8px;}'
      + '#vn-cotizacion-modal .legal{font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.5;}'
      + '#vn-cotizacion-modal .success{text-align:center;padding:18px 0;}'
      + '#vn-cotizacion-modal .success .check{font-size:54px;color:#7ab31a;}'
      + '#vn-cotizacion-modal .row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}'
      + '@media (max-width:480px){#vn-cotizacion-modal .row{grid-template-columns:1fr;}}';
    var s = document.createElement('style');
    s.id = 'vn-cotizacion-modal-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function injectHtml(){
    if (document.getElementById('vn-cotizacion-modal')) return;
    var html = ''
      + '<div id="vn-cotizacion-modal">'
      + '  <div class="box">'
      + '    <button class="close" onclick="vnCloseCotizacion()">×</button>'
      + '    <div id="vn-cot-form-wrap">'
      + '      <h3 id="vn-cot-titulo">Solicitar cotización</h3>'
      + '      <p class="sub" id="vn-cot-subtitulo">Completa el formulario y un ejecutivo te contactará en menos de 24 horas hábiles con una propuesta personalizada.</p>'
      + '      <label>Nombre completo <span class="req">*</span></label>'
      + '      <input type="text" id="vn-cot-nombre" autocomplete="name" placeholder="Nombre y apellido">'
      + '      <label>Email institucional <span class="req">*</span></label>'
      + '      <input type="email" id="vn-cot-email" autocomplete="email" placeholder="tucorreo@universidad.cl">'
      + '      <label>Institución / Universidad <span class="req">*</span></label>'
      + '      <input type="text" id="vn-cot-empresa" autocomplete="organization" placeholder="Universidad de Chile, CFT, IP, etc.">'
      + '      <div class="row">'
      + '        <div>'
      + '          <label>Cargo</label>'
      + '          <input type="text" id="vn-cot-cargo" autocomplete="organization-title" placeholder="Director, Decano, TI...">'
      + '        </div>'
      + '        <div>'
      + '          <label>Teléfono</label>'
      + '          <input type="tel" id="vn-cot-telefono" autocomplete="tel" placeholder="+56 9 1234 5678">'
      + '        </div>'
      + '      </div>'
      + '      <label>Tamaño estimado</label>'
      + '      <select id="vn-cot-tamano">'
      + '        <option value="">— Selecciona —</option>'
      + '        <option value="<500">Menos de 500 alumnos</option>'
      + '        <option value="500-2000">500 a 2.000 alumnos</option>'
      + '        <option value="2000-10000">2.000 a 10.000 alumnos</option>'
      + '        <option value="10000-25000">10.000 a 25.000 alumnos</option>'
      + '        <option value=">25000">Más de 25.000 alumnos</option>'
      + '        <option value="multicampus">Multi-campus / multi-sede</option>'
      + '      </select>'
      + '      <label>¿Qué necesitas resolver?</label>'
      + '      <textarea id="vn-cot-mensaje" placeholder="Ej: integración con sistema académico, multi-campus, acreditación, módulos específicos..."></textarea>'
      + '      <div class="err" id="vn-cot-err"></div>'
      + '      <button class="submit" id="vn-cot-submit" onclick="vnSubmitCotizacion()">Enviar solicitud →</button>'
      + '      <p class="legal">Al enviar aceptas los <a href="/terminos" style="color:#1e3a5f;">Términos</a> y la <a href="/privacidad" style="color:#1e3a5f;">Política de Privacidad</a>. Te contactaremos por email o teléfono.</p>'
      + '    </div>'
      + '    <div id="vn-cot-result-wrap" style="display:none;"></div>'
      + '  </div>'
      + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  window.vnOpenCotizacion = function(opts){
    injectStyles(); injectHtml();
    opts = opts || {};
    CURRENT_OPTS = {
      tipo:      opts.tipo || 'universidad',
      titulo:    opts.titulo || 'Solicitar cotización',
      subtitulo: opts.subtitulo || 'Completa el formulario y un ejecutivo te contactará en menos de 24 horas hábiles con una propuesta personalizada.',
      // 'Completa' (tuteo neutro), no 'Completá' (voseo)
      origen:    opts.origen || ('cotizacion_' + (opts.tipo || 'universidad'))
    };
    document.getElementById('vn-cot-titulo').textContent = CURRENT_OPTS.titulo;
    document.getElementById('vn-cot-subtitulo').textContent = CURRENT_OPTS.subtitulo;
    document.getElementById('vn-cot-form-wrap').style.display = '';
    document.getElementById('vn-cot-result-wrap').style.display = 'none';
    document.getElementById('vn-cot-err').style.display = 'none';
    var btn = document.getElementById('vn-cot-submit');
    btn.disabled = false; btn.textContent = 'Enviar solicitud →';
    document.getElementById('vn-cotizacion-modal').classList.add('open');
    setTimeout(function(){ var n = document.getElementById('vn-cot-nombre'); if (n) n.focus(); }, 80);
    if (window.gtag) gtag('event','cotizacion_modal_open', {tipo: CURRENT_OPTS.tipo});
  };

  window.vnCloseCotizacion = function(){
    var m = document.getElementById('vn-cotizacion-modal');
    if (m) m.classList.remove('open');
  };

  function bindGlobalHandlers(){
    if (window.__vnCotizacionHandlersBound) return;
    window.__vnCotizacionHandlersBound = true;
    document.addEventListener('click', function(e){
      if (e.target && e.target.id === 'vn-cotizacion-modal') vnCloseCotizacion();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        var m = document.getElementById('vn-cotizacion-modal');
        if (m && m.classList.contains('open')) vnCloseCotizacion();
      }
    });
  }

  function showErr(msg){
    var el = document.getElementById('vn-cot-err');
    if (!el) return;
    el.textContent = msg; el.style.display = 'block';
  }

  window.vnSubmitCotizacion = async function(){
    var nombre   = document.getElementById('vn-cot-nombre').value.trim();
    var email    = document.getElementById('vn-cot-email').value.trim();
    var empresa  = document.getElementById('vn-cot-empresa').value.trim();
    var cargo    = document.getElementById('vn-cot-cargo').value.trim();
    var telefono = document.getElementById('vn-cot-telefono').value.trim();
    var tamano   = document.getElementById('vn-cot-tamano').value;
    var mensaje  = document.getElementById('vn-cot-mensaje').value.trim();

    if (!nombre)                     return showErr('Ingresa tu nombre.');
    if (!email || !email.includes('@')) return showErr('Ingresa un email válido.');
    if (!empresa)                    return showErr('Ingresa tu institución.');

    var btn = document.getElementById('vn-cot-submit');
    btn.disabled = true; btn.textContent = 'Enviando…';

    // Atribución a partner: leer localStorage.vn_partner_ref capturado por
    // la landing /r/<ref> o por vn-ref-capture.js en las verticales.
    // El backend lo resuelve a partner_id (FK vn_partners) y graba el
    // snapshot en vn_leads.partner_ref. Sobrevive 30 días vía vn_partner_ref_date.
    var partnerRef = null;
    try {
      var savedRef  = localStorage.getItem('vn_partner_ref');
      var savedDate = parseInt(localStorage.getItem('vn_partner_ref_date') || '0', 10);
      var dias = savedDate ? (Date.now() - savedDate) / 86400000 : 999;
      if (savedRef && dias <= 30) partnerRef = savedRef;
    } catch(e) {}

    var body = {
      email:    email,
      origen:   CURRENT_OPTS.origen,
      nombre:   nombre,
      telefono: telefono || null,
      empresa:  empresa,
      mensaje:  mensaje || null,
      partner_ref: partnerRef,
      metadata: {
        tipo:   CURRENT_OPTS.tipo,
        cargo:  cargo || null,
        tamano: tamano || null,
        url:    location.href,
        // Duplicamos en metadata para auditoría aún si el campo top-level
        // se ignora (defensa contra cambios futuros del schema).
        partner_ref: partnerRef
      }
    };

    try {
      var r = await fetch(API_BASE + '/api/validanet/public/lead', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      var d = await r.json();
      if (!r.ok){
        btn.disabled = false; btn.textContent = 'Enviar solicitud →';
        var msg = (d && d.detail) ? (typeof d.detail === 'string' ? d.detail : 'Error al enviar.') : 'Error al enviar.';
        return showErr(msg);
      }
      if (window.gtag) gtag('event','cotizacion_submitted', {tipo: CURRENT_OPTS.tipo, lead_id: d.lead_id});
      showResult(d);
    } catch(e){
      btn.disabled = false; btn.textContent = 'Enviar solicitud →';
      showErr('Error de conexión: ' + e.message);
    }
  };

  function showResult(d){
    document.getElementById('vn-cot-form-wrap').style.display = 'none';
    var w = document.getElementById('vn-cot-result-wrap');
    w.style.display = 'block';
    w.innerHTML = ''
      + '<div class="success">'
      + '<div class="check">✓</div>'
      + '<h3>¡Solicitud recibida!</h3>'
      + '<p style="color:#64748b;margin:8px 0 18px;line-height:1.5;">Un ejecutivo te contactará en menos de 24 horas hábiles con una propuesta personalizada. También te llegará un correo de confirmación.</p>'
      + '<button class="submit" onclick="vnCloseCotizacion()">Cerrar</button>'
      + '</div>';
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindGlobalHandlers);
  } else {
    bindGlobalHandlers();
  }
})();
