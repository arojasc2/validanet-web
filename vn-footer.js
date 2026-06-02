/**
 * vn-footer.js — Footer unificado para todas las páginas públicas de
 * ValidaNet (validanet.cl, app.validanet.cl) y ValidaNet Connect.
 *
 * Uso:
 *   <script src="/vn-footer.js" defer></script>
 *
 * Comportamiento:
 *   - Si existe un <footer> en la página → lo reemplaza por el footer unificado
 *   - Si no existe → lo agrega al final del <body>
 *
 * Para opt-out (alguna página no quiere footer): poner data-vn-no-footer="1"
 *   en el <body> o el <html>.
 *
 * Cambios al footer se reflejan automáticamente en TODAS las páginas
 * que carguen este script.
 */
(function(){
  function buildFooter(){
    var f = document.createElement('footer');
    f.setAttribute('data-vn-footer','1');
    f.style.cssText = 'background:#0f172a;color:rgba(255,255,255,.75);padding:36px 24px 28px;text-align:center;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin-top:auto;';
    f.innerHTML =
      '<div style="max-width:1100px;margin:0 auto;">'+
        '<div style="margin-bottom:16px;">'+
          '<img src="https://app.validanet.cl/static/logo-validanet.png" alt="ValidaNet" '+
               'style="height:32px;display:inline-block;vertical-align:middle;" loading="lazy">'+
        '</div>'+
        '<nav style="margin-bottom:14px;line-height:2;">'+
          link('https://validanet.cl/', 'Inicio')+sep()+
          link('https://app.validanet.cl/api/validanet/dashboard/', 'Dashboard')+sep()+
          link('https://connect.validanet.cl/portal/connect', 'Connect')+sep()+
          link('https://validanet.cl/para-empresas', 'Empresas')+sep()+
          link('https://validanet.cl/para-relatores', 'Relatores')+sep()+
          link('https://validanet.cl/partners', 'Partners')+sep()+
          link('https://validanet.cl/#pricing', 'Precios')+sep()+
          link('mailto:contacto@validanet.cl', 'Contacto')+sep()+
          link('https://validanet.cl/privacidad', 'Privacidad')+sep()+
          link('https://validanet.cl/terminos', 'Términos')+sep()+
          link('https://validanet.cl/accesibilidad', 'Accesibilidad')+
        '</nav>'+
        '<div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.55);">'+
          '© ' + new Date().getFullYear() + ' Norteduc Edtech SpA · RUT 76.624.932-9 · Antofagasta, Chile'+
        '</div>'+
        '<div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,.4);">'+
          'Desarrollado con ❤️ en Antofagasta para toda Latinoamérica'+
        '</div>'+
      '</div>';
    return f;
  }
  function link(href, label){
    return '<a href="'+href+'" style="color:rgba(255,255,255,.75);text-decoration:none;margin:0 4px;padding:2px 6px;border-radius:4px;transition:color .15s,background .15s;" '+
      'onmouseover="this.style.color=\'#7ab31a\';this.style.background=\'rgba(122,179,26,.08)\';" '+
      'onmouseout="this.style.color=\'\';this.style.background=\'\';">'+label+'</a>';
  }
  function sep(){
    return '<span style="color:rgba(255,255,255,.25);margin:0 2px;">·</span>';
  }
  function init(){
    var html = document.documentElement;
    var body = document.body;
    if (!body) return;
    if (html.getAttribute('data-vn-no-footer') || body.getAttribute('data-vn-no-footer')) return;
    var existing = document.querySelector('footer');
    var f = buildFooter();
    if (existing && !existing.hasAttribute('data-vn-footer')) {
      existing.replaceWith(f);
    } else if (existing && existing.hasAttribute('data-vn-footer')) {
      // ya está, no hacer nada
      return;
    } else {
      body.appendChild(f);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
