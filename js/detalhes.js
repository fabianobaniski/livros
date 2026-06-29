// detalhes.js — página de um livro.

const WHATSAPP_NUMERO = (window.SITE_CONFIG && window.SITE_CONFIG.WHATSAPP_NUMERO) || "";
const PLACEHOLDER = (window.SITE_CONFIG && window.SITE_CONFIG.PLACEHOLDER) || "";

const elDetalhe = document.getElementById("detalhe");
const elLightbox = document.getElementById("lightbox");
const elLightboxImg = document.getElementById("lightbox-img");
const elVoltar = document.getElementById("voltar");


// ---------- Utilidades ----------

function precoBR(v) {
  if (v === null || v === undefined) return "—";
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}
function texto(v) { return (v === null || v === undefined || v === "") ? "—" : String(v); }
function escapar(s) {
  const d = document.createElement("div");
  d.textContent = s === null || s === undefined ? "" : String(s);
  return d.innerHTML;
}
function params() { return new URLSearchParams(location.search); }

function mensagemWhats(l) {
  return [
    "Olá! Tenho interesse neste livro:", "",
    `SKU: ${texto(l.sku)}`,
    `Título: ${texto(l.titulo)}`,
    `Autor: ${texto(l.autor)}`,
    `Preço: ${precoBR(l.preco_estante_virtual)}`,
  ].join("\n");
}
function linkWhats(l) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagemWhats(l))}`;
}
function capaNormal(sku) { return `imagens/capas/${sku}.jpg`; }


// ---------- Conservação ----------

function blocoConservacao(c) {
  if (!c || typeof c !== "object") return "";
  const partes = [];
  if (c.estado_geral) partes.push(linhaCampo("Estado geral", c.estado_geral));
  if (c.descricao_geral) partes.push(linhaCampo("Descrição", c.descricao_geral));
  if (c.partes_livro && typeof c.partes_livro === "object") {
    for (const [nome, info] of Object.entries(c.partes_livro)) {
      if (!info || typeof info !== "object") continue;
      const estado = info.estado || "";
      const defeitos = Array.isArray(info.defeitos) ? info.defeitos : [];
      if (estado || defeitos.length) {
        let v = estado || "—";
        if (defeitos.length) v += " (defeitos: " + defeitos.join(", ") + ")";
        partes.push(linhaCampo(nome.charAt(0).toUpperCase() + nome.slice(1), v));
      }
    }
  }
  return partes.join("");
}
function linhaCampo(rotulo, valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return `<div class="campo"><span class="campo-rotulo">${escapar(rotulo)}</span><span class="campo-valor">${escapar(valor)}</span></div>`;
}


// ---------- Carregar ----------

async function carregar() {
  const sku = params().get("sku");
  const volta = params().get("volta") || "";
  if (elVoltar) elVoltar.href = "index.html" + (volta || "");

  if (!sku) { erro("Livro não especificado."); return; }

  // carrega o índice em paralelo para alimentar o painel de desejos
  carregarIndice();

  let l;
  try {
    const resp = await fetch(`dados/livros/${encodeURIComponent(sku)}.json`);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    l = await resp.json();
  } catch (e) { erro("Livro não encontrado."); return; }

  document.title = `${texto(l.titulo)} — Catálogo`;
  atualizarMetaTags(l, sku);
  render(l, sku);
  Interesse.atualizarBadge();
}
function erro(msg) { elDetalhe.innerHTML = `<p class="vazio">${escapar(msg)}</p>`; }

// Atualiza as meta tags de Open Graph (WhatsApp/Facebook) no cliente,
// para que o link de um livro específico mostre título, descrição e capa.
function definirMeta(seletor, atributo, valor) {
  let el = document.head.querySelector(seletor);
  if (!el) {
    el = document.createElement("meta");
    const [chave, val] = seletor.replace("meta[", "").replace("]", "").split("=");
    el.setAttribute(chave, val.replace(/['"]/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute(atributo, valor);
}
function atualizarMetaTags(l, sku) {
  const C = window.SITE_CONFIG || {};
  const base = (C.SITE_URL || "").replace(/\/$/, "");
  const titulo = l.subtitulo ? `${texto(l.titulo)}: ${texto(l.subtitulo)}` : texto(l.titulo);
  const precoTxt = (l.preco_estante_virtual !== null && l.preco_estante_virtual !== undefined)
    ? " — R$ " + Number(l.preco_estante_virtual).toFixed(2).replace(".", ",") : "";
  const descricao = `${texto(l.autor)}${precoTxt}`;
  const urlLivro = base ? `${base}/livro.html?sku=${encodeURIComponent(sku)}` : "";
  const urlCapa = base ? `${base}/imagens/capas/${sku}.jpg` : "";

  document.querySelector('meta[name="description"]') &&
    document.querySelector('meta[name="description"]').setAttribute("content", descricao);
  definirMeta('meta[property="og:title"]', "content", titulo);
  definirMeta('meta[property="og:description"]', "content", descricao);
  definirMeta('meta[property="og:type"]', "content", "product");
  if (urlLivro) definirMeta('meta[property="og:url"]', "content", urlLivro);
  if (urlCapa)  definirMeta('meta[property="og:image"]', "content", urlCapa);
  definirMeta('meta[name="twitter:card"]', "content", "summary_large_image");
}

async function carregarIndice() {
  try {
    const resp = await fetch("dados/indice.json");
    if (resp.ok) Interesse.definirCatalogo(await resp.json());
  } catch (e) {}
}


// ---------- Render ----------

function render(l, sku) {
  const titulo = l.subtitulo ? `${texto(l.titulo)}: ${texto(l.subtitulo)}` : texto(l.titulo);
  const band = window.bandeiraIdioma ? window.bandeiraIdioma(l.idioma) : "";

  const ficha = [
    linhaCampo("Autor", l.autor),
    linhaCampo("Idioma", (band ? band + " " : "") + texto(l.idioma)),
    linhaCampo("Categoria", l.categoria),
    linhaCampo("Temas", l.temas),
    linhaCampo("Série", l.serie),
    linhaCampo("Volume", l.volume),
    linhaCampo("Editora", l.editora),
    linhaCampo("Nº edição", l.numero_edicao),
    linhaCampo("Ano", l.ano),
    linhaCampo("Encadernação", l.encadernacao),
    linhaCampo("Páginas", l.quantidade_paginas),
    linhaCampo("Peso (g)", l.peso),
    linhaCampo("ISBN", l.isbn),
    linhaCampo("SKU", l.sku),
  ].join("");

  const sinopse = l.sinopse
    ? `<section class="bloco"><h2>Sinopse</h2><p class="texto-longo">${escapar(l.sinopse)}</p></section>` : "";
  const conserv = blocoConservacao(l.conservacao);
  const blocoConserv = conserv
    ? `<section class="bloco"><h2>Conservação</h2><div class="campos">${conserv}</div></section>` : "";

  const naLista = Interesse.tem(sku);

  elDetalhe.innerHTML = `
    <div class="detalhe-grid">
      <div class="detalhe-capa">
        <img id="capa" src="${capaNormal(sku)}" alt="Capa de ${escapar(l.titulo)}"
             onerror="this.onerror=null; this.src='${PLACEHOLDER}'; this.classList.add('sem-img');">
      </div>
      <div class="detalhe-corpo">
        <h1 class="detalhe-titulo">${escapar(titulo)}</h1>
        <p class="detalhe-preco">${precoBR(l.preco_estante_virtual)}</p>
        <div class="detalhe-acoes">
          <button id="btn-interesse" class="btn-interesse ${naLista ? "ativo" : ""}">
            ${naLista ? "✓ Não tenho interesse" : "♡ Tenho interesse"}
          </button>
          <a class="btn-whats btn-whats-grande" href="${linkWhats(l)}" target="_blank" rel="noopener">Pedir no WhatsApp</a>
        </div>
      </div>
    </div>
    ${sinopse}
    ${blocoConserv}
    <section class="bloco"><h2>Ficha técnica</h2><div class="campos">${ficha}</div></section>
  `;

  const capa = document.getElementById("capa");
  if (capa) {
    capa.addEventListener("click", () => {
      if (capa.classList.contains("sem-img")) return;
      elLightboxImg.src = capa.src;
      elLightbox.hidden = false;
    });
  }

  const btn = document.getElementById("btn-interesse");
  btn.addEventListener("click", () => {
    const agora = Interesse.alternar(sku);
    btn.classList.toggle("ativo", agora);
    btn.textContent = agora ? "✓ Não tenho interesse" : "♡ Tenho interesse";
    if (agora) {
      Interesse.pulsarBadge();
      btn.classList.remove("pulso-btn");
      void btn.offsetWidth;
      btn.classList.add("pulso-btn");
    }
  });
}


// ---------- Lightbox ----------

function fecharLightbox() { elLightbox.hidden = true; elLightboxImg.src = ""; }
elLightbox.addEventListener("click", fecharLightbox);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharLightbox(); });


// ---------- Início ----------

Interesse.inicializarPainel();
carregar();
