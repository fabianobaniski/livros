// layout.js — monta cabeçalho e rodapé compartilhados em todas as páginas.
// Lê window.SITE_CONFIG (gerado por gerar_site.py em config.js).

(function () {
  const C = window.SITE_CONFIG || {};

  function bandeira(idioma) {
    const m = C.BANDEIRAS_IDIOMA || {};
    return m[idioma] || C.BANDEIRA_PADRAO || "";
  }
  window.bandeiraIdioma = bandeira;

  const buscaInicial = new URLSearchParams(location.search).get("q") || "";

  // ---- Cabeçalho ----
  const header = document.createElement("header");
  header.className = "cabecalho";
  header.innerHTML = `
    <a class="logo" href="index.html">
      <span class="logo-emoji">${C.SITE_EMOJI || "📚"}</span>
      <span class="logo-nome">${C.SITE_NOME || "Catálogo"}</span>
    </a>
    <div class="cab-busca">
      <input type="search" id="busca" placeholder="Buscar por título ou autor…"
             autocomplete="off" value="${buscaInicial.replace(/"/g, "&quot;")}">
    </div>
    <div class="cab-acoes">
      <a class="btn-scanner-topo" id="btn-scanner-topo" href="scanner.html">📷 Vender livros</a>
      <button class="btn-interesse-topo" id="abrir-interesse">
        ♥ Livros que me interessam <span class="badge" id="badge-interesse" hidden>0</span>
      </button>
    </div>
  `;
  document.body.prepend(header);

  // Na própria página do scanner, os dois botões acima não se aplicam
  // (é a página do "vender", e ela não usa a lista de interesse).
  if (document.body.dataset.pagina === "scanner") {
    const btnScanner = document.getElementById("btn-scanner-topo");
    const btnInteresse = document.getElementById("abrir-interesse");
    if (btnScanner) btnScanner.hidden = true;
    if (btnInteresse) btnInteresse.hidden = true;
  }

  // ---- Rodapé ----
  const footer = document.createElement("footer");
  footer.className = "rodape";
  const zapLink = `https://wa.me/${C.WHATSAPP_NUMERO || ""}`;
  footer.innerHTML = `
    <div class="rodape-col">
      <h3>Sobre mim</h3>
      <p>${C.SOBRE_MIM || ""}</p>
    </div>
    <div class="rodape-col">
      <h3>Contato</h3>
      <p><a href="mailto:${C.EMAIL || ""}">${C.EMAIL || ""}</a></p>
      <p><a href="${zapLink}" target="_blank" rel="noopener">WhatsApp: ${C.WHATSAPP_EXIBICAO || ""}</a></p>
      <p>${C.CIDADE || ""}</p>
    </div>
    <div class="rodape-col">
      <h3>Mais livros</h3>
      <a class="btn-estante" href="${C.ESTANTE_VIRTUAL_URL || "#"}" target="_blank" rel="noopener">
        Meu acervo na Estante Virtual
      </a>
    </div>
  `;
  document.body.appendChild(footer);

  // ---- Busca do cabeçalho fora da listagem leva à index ----
  const naListagem = !!document.getElementById("grade");
  const elBusca = document.getElementById("busca");
  if (elBusca && !naListagem) {
    elBusca.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = elBusca.value.trim();
        location.href = "index.html" + (q ? "?q=" + encodeURIComponent(q) : "");
      }
    });
  }
})();
