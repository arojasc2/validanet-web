/**
 * vn-ref-capture.js — Captura ?ref=<code> de cualquier landing y lo persiste
 * en localStorage para que vn-signup-modal.js lo arrastre al body del signup.
 *
 * Carga: incluir tan pronto como sea posible (defer está OK, lo que importa es
 * antes de cualquier click al modal). Sin dependencias.
 *
 * Reemplaza la lógica de captura por-landing que antes vivía sólo en /r/.
 */
(function(){
  try {
    var qs = new URLSearchParams(window.location.search);
    var ref = (qs.get('ref') || qs.get('partner_ref') || '').trim().toLowerCase();
    if (ref && /^[a-z0-9_-]{1,32}$/.test(ref)) {
      localStorage.setItem('vn_partner_ref', ref);
      localStorage.setItem('vn_partner_ref_date', String(Date.now()));
    }
  } catch(e) {}
})();
