// El WhatsApp de MyM Soluciones (11 3366-2080) siempre abre el chat con un toque (pedido de Matías, 21/11/2026).
// Recorre los textos de la página, también los que aparecen después (avisos, carteles de error), y convierte el
// número en un link a wa.me. No toca lo que ya está adentro de un link, de un campo o de un script.
(() => {
  const NUMERO = /11 3366-2080/;
  const URL = 'https://wa.me/5491133662080';
  const SALTEAR = new Set(['A', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'CODE']);
  const enlazar = (raiz) => {
    if (!raiz) return;
    const recorrer = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!NUMERO.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        for (let p = n.parentElement; p; p = p.parentElement) if (SALTEAR.has(p.tagName) || p.isContentEditable) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodos = [];
    while (recorrer.nextNode()) nodos.push(recorrer.currentNode);
    for (const n of nodos) {
      const [antes, ...resto] = n.nodeValue.split(NUMERO);
      const a = document.createElement('a');
      a.href = URL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '11 3366-2080';
      const frag = document.createDocumentFragment();
      frag.append(antes, a, resto.join('11 3366-2080'));
      n.replaceWith(frag);
    }
  };
  const arrancar = () => {
    enlazar(document.body);
    new MutationObserver((cambios) => { for (const c of cambios) for (const n of c.addedNodes) enlazar(n.nodeType === 3 ? n.parentElement : n); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
