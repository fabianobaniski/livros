// interesse.js — lista "Livros que me interessam" (localStorage), compartilhada.
// Cuida do armazenamento E do painel (render, total, botões, remoção).
// Usada por listagem.js e detalhes.js. Precisa de um catálogo de referência
// (o índice) para exibir título/autor/preço a partir dos SKUs guardados.

window.Interesse = (function () {
  const CHAVE = "interesse_skus";
  let catalogo = [];   // lista de itens do índice (sku, titulo, autor, preco...)

  // elementos do painel (resolvidos quando o painel é inicializado)
  let elPainel, elLista, elTotal, elBtnCopiar, elBtnWhats, elBtnEmail;

  const C = window.SITE_CONFIG || {};


  // ---- armazenamento ----
  function ler() {
    try {
      const raw = localStorage.getItem(CHAVE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function salvar(skus) {
    try { localStorage.setItem(CHAVE, JSON.stringify(skus)); } catch (e) {}
  }
  function tem(sku) { return ler().includes(sku); }
  function alternar(sku) {
    let skus = ler();
    if (skus.includes(sku)) skus = skus.filter(s => s !== sku);
    else skus.push(sku);
    salvar(skus);
    atualizarBadge();
    if (elPainel && !elPainel.hidden) renderPainel();
    return skus.includes(sku);
  }
  function quantidade() { return ler().length; }


  // ---- badge no cabeçalho ----
  function atualizarBadge() {
    const b = document.getElementById("badge-interesse");
    if (!b) return;
    const n = quantidade();
    b.textContent = n;
    b.hidden = n === 0;
  }


  // ---- catálogo de referência ----
  function definirCatalogo(itens) { catalogo = itens || []; }
  function itensSelecionados() {
    return ler().map(s => catalogo.find(l => l.sku === s)).filter(Boolean);
  }
  function precoBR(v) {
    if (v === null || v === undefined) return "—";
    return "R$ " + Number(v).toFixed(2).replace(".", ",");
  }
  function texto(v) { return (v === null || v === undefined || v === "") ? "—" : String(v); }


  // ---- texto para copiar / mensagens ----
  function totalValor() {
    return itensSelecionados().reduce((s, l) => s + (Number(l.preco_estante_virtual) || 0), 0);
  }
  function textoLista() {
    const itens = itensSelecionados();
    const linhas = ["Olá! Tenho interesse nestes livros:", ""];
    for (const l of itens) {
      linhas.push(`• ${texto(l.titulo)} — ${texto(l.autor)} — ${precoBR(l.preco_estante_virtual)} (SKU ${texto(l.sku)})`);
    }
    linhas.push("");
    linhas.push(`Total: ${precoBR(totalValor())}`);
    return linhas.join("\n");
  }


  // ---- painel ----
  function inicializarPainel() {
    elPainel    = document.getElementById("painel-interesse");
    elLista     = document.getElementById("lista-interesse");
    elTotal     = document.getElementById("interesse-total");
    elBtnCopiar = document.getElementById("copiar-interesse");
    elBtnWhats  = document.getElementById("whats-interesse");
    elBtnEmail  = document.getElementById("email-interesse");

    const abrir  = document.getElementById("abrir-interesse");
    const fechar = document.getElementById("fechar-interesse");
    if (abrir)  abrir.addEventListener("click", abrirPainel);
    if (fechar) fechar.addEventListener("click", fecharPainel);
    if (elPainel) elPainel.addEventListener("click", (e) => { if (e.target === elPainel) fecharPainel(); });
    if (elBtnCopiar) elBtnCopiar.addEventListener("click", copiar);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPainel(); });

    atualizarBadge();
  }

  function abrirPainel() { renderPainel(); if (elPainel) elPainel.hidden = false; }
  function fecharPainel() { if (elPainel) elPainel.hidden = true; }

  function renderPainel() {
    if (!elLista) return;
    const itens = itensSelecionados();

    if (itens.length === 0) {
      elLista.innerHTML = `<p class="vazio">Nenhum livro na lista ainda.</p>`;
      if (elTotal) elTotal.textContent = "";
      if (elBtnCopiar) elBtnCopiar.disabled = true;
      if (elBtnWhats) elBtnWhats.classList.add("desabilitado");
      if (elBtnEmail) elBtnEmail.classList.add("desabilitado");
      return;
    }

    if (elBtnCopiar) elBtnCopiar.disabled = false;
    if (elBtnWhats) elBtnWhats.classList.remove("desabilitado");
    if (elBtnEmail) elBtnEmail.classList.remove("desabilitado");

    elLista.innerHTML = itens.map(l => `
      <div class="item-interesse">
        <div>
          <span class="item-titulo">${texto(l.titulo)}</span>
          <span class="item-meta">${texto(l.autor)} • ${precoBR(l.preco_estante_virtual)} • ${texto(l.sku)}</span>
        </div>
        <button class="item-remover" data-sku="${l.sku}" aria-label="Remover" title="Remover">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6M14 11v6"></path>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
          </svg>
        </button>
      </div>`).join("");

    if (elTotal) {
      elTotal.textContent = `${itens.length} livro${itens.length > 1 ? "s" : ""} • Total: ${precoBR(totalValor())}`;
    }

    elLista.querySelectorAll(".item-remover").forEach(b => {
      b.onclick = () => { alternar(b.dataset.sku); };
    });

    // links de whats e email
    if (elBtnWhats) {
      elBtnWhats.href = `https://wa.me/${C.WHATSAPP_NUMERO || ""}?text=${encodeURIComponent(textoLista())}`;
    }
    if (elBtnEmail) {
      const assunto = encodeURIComponent("Interesse em livros do catálogo");
      elBtnEmail.href = `mailto:${C.EMAIL || ""}?subject=${assunto}&body=${encodeURIComponent(textoLista())}`;
    }
  }

  async function copiar() {
    const txt = textoLista();
    try {
      await navigator.clipboard.writeText(txt);
      elBtnCopiar.textContent = "Copiado!";
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); elBtnCopiar.textContent = "Copiado!"; }
      catch (_) { elBtnCopiar.textContent = "Não foi possível copiar"; }
      document.body.removeChild(ta);
    }
    setTimeout(() => { elBtnCopiar.textContent = "Copiar lista"; }, 1800);
  }

  // animação sutil ao adicionar (pulso no botão do cabeçalho)
  function pulsarBadge() {
    const btn = document.getElementById("abrir-interesse");
    if (!btn) return;
    btn.classList.remove("pulso");
    void btn.offsetWidth; // reinicia animação
    btn.classList.add("pulso");
  }

  return {
    ler, salvar, tem, alternar, quantidade, atualizarBadge,
    definirCatalogo, inicializarPainel, abrirPainel, renderPainel, pulsarBadge,
  };
})();
