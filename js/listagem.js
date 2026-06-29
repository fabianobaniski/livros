// listagem.js — página de listagem do catálogo.

const POR_PAGINA = (window.SITE_CONFIG && window.SITE_CONFIG.POR_PAGINA) || 24;
const PLACEHOLDER = (window.SITE_CONFIG && window.SITE_CONFIG.PLACEHOLDER) || "";

let TODOS = [];
let filtrados = [];
let paginaAtual = 1;

const elGrade     = document.getElementById("grade");
const elContagem  = document.getElementById("contagem");
const elPaginacao = document.getElementById("paginacao");
const elBusca     = document.getElementById("busca");       // injetado por layout.js
const elCategoria = document.getElementById("filtro-categoria");
const elIdioma    = document.getElementById("filtro-idioma");
const elOrdenar   = document.getElementById("ordenar");
const elPrecoMin  = document.getElementById("preco-min");
const elPrecoMax  = document.getElementById("preco-max");
const elAplicarPreco = document.getElementById("aplicar-preco");
const elLimpar    = document.getElementById("limpar-filtros");


// ---------- Utilidades ----------

function precoBR(v) {
  if (v === null || v === undefined) return "—";
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}
function texto(v) { return (v === null || v === undefined || v === "") ? "—" : String(v); }
function normaliza(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


// ---------- Estado na URL ----------

function lerUrl() {
  const p = new URLSearchParams(location.search);
  if (elBusca) elBusca.value = p.get("q") || "";
  elCategoria.value = p.get("cat") || "";
  elIdioma.value    = p.get("idi") || "";
  elOrdenar.value   = p.get("ord") || "titulo";
  elPrecoMin.value  = p.get("pmin") || "";
  elPrecoMax.value  = p.get("pmax") || "";
  paginaAtual = Math.max(1, parseInt(p.get("pag") || "1", 10) || 1);
}
// Querystring que representa o estado atual (fonte única de verdade).
// Usada tanto para a URL da página quanto para o link "voltar" dos cards.
function querystringEstado() {
  const p = new URLSearchParams();
  if (elBusca && elBusca.value.trim()) p.set("q", elBusca.value.trim());
  if (elCategoria.value) p.set("cat", elCategoria.value);
  if (elIdioma.value)    p.set("idi", elIdioma.value);
  if (elOrdenar.value && elOrdenar.value !== "titulo") p.set("ord", elOrdenar.value);
  if (elPrecoMin.value)  p.set("pmin", elPrecoMin.value);
  if (elPrecoMax.value)  p.set("pmax", elPrecoMax.value);
  if (paginaAtual > 1)   p.set("pag", String(paginaAtual));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

function escreverUrl() {
  const qs = querystringEstado();
  history.replaceState(null, "", qs || location.pathname);
}


// ---------- Carregar ----------

async function carregar() {
  try {
    const resp = await fetch("dados/indice.json");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    TODOS = await resp.json();
  } catch (e) {
    elContagem.textContent = "Não foi possível carregar o catálogo.";
    elGrade.innerHTML = `<p class="vazio">Erro ao carregar os dados (${e.message}).</p>`;
    return;
  }
  popularFiltros();
  Interesse.definirCatalogo(TODOS);
  lerUrl();
  Interesse.atualizarBadge();
  aplicar(true);
}

function popularFiltros() {
  const cats = [...new Set(TODOS.map(l => l.categoria).filter(Boolean))].sort();
  const idis = [...new Set(TODOS.map(l => l.idioma).filter(Boolean))].sort();
  for (const c of cats) {
    const o = document.createElement("option"); o.value = c; o.textContent = c;
    elCategoria.appendChild(o);
  }
  for (const i of idis) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = (window.bandeiraIdioma ? window.bandeiraIdioma(i) + " " : "") + i;
    elIdioma.appendChild(o);
  }
}


// ---------- Filtros ----------

function aplicar(preservarPagina) {
  const termo = normaliza(elBusca ? elBusca.value.trim() : "");
  const cat = elCategoria.value;
  const idi = elIdioma.value;
  const pmin = elPrecoMin.value !== "" ? parseFloat(elPrecoMin.value) : null;
  const pmax = elPrecoMax.value !== "" ? parseFloat(elPrecoMax.value) : null;

  filtrados = TODOS.filter(l => {
    if (cat && l.categoria !== cat) return false;
    if (idi && l.idioma !== idi) return false;
    const preco = l.preco_estante_virtual;
    if (pmin !== null && (preco === null || preco < pmin)) return false;
    if (pmax !== null && (preco === null || preco > pmax)) return false;
    if (termo) {
      const alvo = normaliza(l.titulo) + " " + normaliza(l.autor);
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });

  ordenar(filtrados, elOrdenar.value);
  if (!preservarPagina) paginaAtual = 1;
  render();
}

function ordenar(arr, modo) {
  const cmp = (a, b) => normaliza(a).localeCompare(normaliza(b));
  switch (modo) {
    case "autor":      arr.sort((a, b) => cmp(a.autor, b.autor) || cmp(a.titulo, b.titulo)); break;
    case "preco-asc":  arr.sort((a, b) => (a.preco_estante_virtual ?? Infinity) - (b.preco_estante_virtual ?? Infinity)); break;
    case "preco-desc": arr.sort((a, b) => (b.preco_estante_virtual ?? -Infinity) - (a.preco_estante_virtual ?? -Infinity)); break;
    case "ano-desc":   arr.sort((a, b) => (b.ano ?? -Infinity) - (a.ano ?? -Infinity)); break;
    case "ano-asc":    arr.sort((a, b) => (a.ano ?? Infinity) - (b.ano ?? Infinity)); break;
    default:           arr.sort((a, b) => cmp(a.titulo, b.titulo));
  }
}


// ---------- Render ----------

function render() {
  const total = filtrados.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  if (paginaAtual > paginas) paginaAtual = paginas;

  // A URL é escrita ANTES de montar os cards, já com a página clampada,
  // para o link "voltar" de cada card refletir exatamente onde estamos.
  escreverUrl();

  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const pagina = filtrados.slice(inicio, inicio + POR_PAGINA);

  elContagem.textContent = total === 0
    ? "Nenhum livro encontrado"
    : `${total} livro${total > 1 ? "s" : ""} • página ${paginaAtual} de ${paginas}`;

  elGrade.innerHTML = "";
  if (total === 0) {
    elGrade.innerHTML = `<p class="vazio">Nada encontrado com esses filtros.</p>`;
    elPaginacao.innerHTML = "";
    return;
  }
  for (const livro of pagina) elGrade.appendChild(cartao(livro));
  renderPaginacao(paginas);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cartao(livro) {
  const art = document.createElement("article");
  art.className = "cartao";
  const href = `livro.html?sku=${encodeURIComponent(livro.sku)}&volta=${encodeURIComponent(querystringEstado())}`;
  const capa = livro.capa_thumb || PLACEHOLDER;
  art.innerHTML = `
    <a class="cartao-capa" href="${href}">
      <img src="${capa}" alt="Capa de ${texto(livro.titulo)}" loading="lazy"
           onerror="this.onerror=null; this.src='${PLACEHOLDER}';">
    </a>
    <div class="cartao-info">
      <a class="cartao-titulo" href="${href}">${texto(livro.titulo)}</a>
      <p class="cartao-autor">${texto(livro.autor)}</p>
      <p class="cartao-preco">${precoBR(livro.preco_estante_virtual)}</p>
      <a class="btn-detalhes" href="${href}">Ver detalhes</a>
    </div>`;
  return art;
}

function renderPaginacao(paginas) {
  elPaginacao.innerHTML = "";
  if (paginas <= 1) return;
  const btn = (rotulo, destino, ativo = false, off = false) => {
    const b = document.createElement("button");
    b.textContent = rotulo;
    if (ativo) b.className = "ativo";
    if (off) b.disabled = true;
    else b.onclick = () => { paginaAtual = destino; render(); };
    return b;
  };
  elPaginacao.appendChild(btn("‹", paginaAtual - 1, false, paginaAtual === 1));
  const j = 2;
  let ini = Math.max(1, paginaAtual - j);
  let fim = Math.min(paginas, paginaAtual + j);
  if (ini > 1) {
    elPaginacao.appendChild(btn("1", 1, paginaAtual === 1));
    if (ini > 2) elPaginacao.appendChild(retic());
  }
  for (let p = ini; p <= fim; p++) elPaginacao.appendChild(btn(String(p), p, p === paginaAtual));
  if (fim < paginas) {
    if (fim < paginas - 1) elPaginacao.appendChild(retic());
    elPaginacao.appendChild(btn(String(paginas), paginas, paginaAtual === paginas));
  }
  elPaginacao.appendChild(btn("›", paginaAtual + 1, false, paginaAtual === paginas));
}
function retic() {
  const s = document.createElement("span"); s.className = "reticencias"; s.textContent = "…";
  return s;
}


// ---------- Eventos ----------

let timerBusca;
if (elBusca) {
  elBusca.addEventListener("input", () => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(() => aplicar(false), 200);
  });
}
elCategoria.addEventListener("change", () => aplicar(false));
elIdioma.addEventListener("change", () => aplicar(false));
elOrdenar.addEventListener("change", () => aplicar(false));
elAplicarPreco.addEventListener("click", () => aplicar(false));
elPrecoMin.addEventListener("keydown", e => { if (e.key === "Enter") aplicar(false); });
elPrecoMax.addEventListener("keydown", e => { if (e.key === "Enter") aplicar(false); });

elLimpar.addEventListener("click", () => {
  if (elBusca) elBusca.value = "";
  elCategoria.value = ""; elIdioma.value = "";
  elOrdenar.value = "titulo";
  elPrecoMin.value = ""; elPrecoMax.value = "";
  aplicar(false);
});

Interesse.inicializarPainel();
carregar();
