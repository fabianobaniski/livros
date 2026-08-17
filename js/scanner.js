// scanner.js — leitura de código de barras (ISBN) pela câmera do visitante,
// para quem quer vender livros. Usa a biblioteca ZXing (carregada via CDN
// em scanner.html) para decodificar o código; a lista fica só no navegador
// de quem escaneou (localStorage) até ser copiada/enviada por WhatsApp.

(function () {
  const CHAVE = "scanner_codigos";
  const C = window.SITE_CONFIG || {};

  const elVideoWrap  = document.getElementById("scanner-video-wrap");
  const elVideo       = document.getElementById("scanner-video");
  const elStatus       = document.getElementById("scanner-status");
  const elBtnIniciar   = document.getElementById("scanner-iniciar");
  const elBtnParar     = document.getElementById("scanner-parar");
  const elLista        = document.getElementById("scanner-lista");
  const elTotal        = document.getElementById("scanner-total");
  const elAcoes        = document.getElementById("scanner-acoes");
  const elBtnCopiar    = document.getElementById("scanner-copiar");
  const elBtnWhats     = document.getElementById("scanner-whats");
  const elBtnLimpar    = document.getElementById("scanner-limpar");

  if (!elBtnIniciar) return; // script incluído fora da página do scanner

  let leitor = null;
  let lendo = false;

  // ---- armazenamento (localStorage, só neste navegador) ----
  function ler() {
    try {
      const raw = localStorage.getItem(CHAVE);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function salvar(itens) {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (e) {}
  }
  function adicionar(codigo) {
    const itens = ler();
    const existente = itens.find(i => i.codigo === codigo);
    if (existente) existente.quantidade += 1;
    else itens.push({ codigo, quantidade: 1 });
    salvar(itens);
    render();
    return !existente;
  }
  function remover(codigo) {
    salvar(ler().filter(i => i.codigo !== codigo));
    render();
  }
  function limpar() {
    if (ler().length && !confirm("Limpar toda a lista de códigos escaneados?")) return;
    salvar([]);
    render();
  }

  // ---- texto para copiar / WhatsApp ----
  function textoLista() {
    const itens = ler();
    const linhas = ["Olá! Tenho estes livros pra vender (códigos de barras):", ""];
    for (const i of itens) {
      linhas.push(`• ${i.codigo}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`);
    }
    return linhas.join("\n");
  }

  // ---- lista na tela ----
  function render() {
    const itens = ler();

    if (itens.length === 0) {
      elLista.innerHTML = `<p class="vazio">Nenhum código escaneado ainda.</p>`;
      elAcoes.hidden = true;
      elTotal.textContent = "0";
      return;
    }

    elAcoes.hidden = false;
    elTotal.textContent = String(itens.reduce((s, i) => s + i.quantidade, 0));

    elLista.innerHTML = itens.map(i => `
      <div class="item-interesse">
        <div>
          <span class="item-titulo">${i.codigo}</span>
          <span class="item-meta">${i.quantidade}x escaneado</span>
        </div>
        <button class="item-remover" data-codigo="${i.codigo}" aria-label="Remover" title="Remover">&times;</button>
      </div>`).join("");

    elLista.querySelectorAll(".item-remover").forEach(b => {
      b.onclick = () => remover(b.dataset.codigo);
    });

    elBtnWhats.href = `https://wa.me/${C.WHATSAPP_NUMERO || ""}?text=${encodeURIComponent(textoLista())}`;
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

  function vibrar() {
    try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}
  }

  // ---- leitura pela câmera ----
  async function iniciar() {
    if (typeof ZXing === "undefined") {
      elStatus.textContent = "Não foi possível carregar o leitor de código de barras. Verifique sua internet e tente de novo.";
      return;
    }

    elBtnIniciar.hidden = true;
    elVideoWrap.hidden = false;
    elStatus.textContent = "Solicitando acesso à câmera…";

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
    ]);
    leitor = new ZXing.BrowserMultiFormatReader(hints);

    try {
      const dispositivos = await leitor.listVideoInputDevices();
      const traseira = dispositivos.find(d => /back|tras|rear|environment/i.test(d.label));
      const deviceId = (traseira || dispositivos[dispositivos.length - 1] || {}).deviceId || null;

      lendo = true;
      elBtnParar.hidden = false;
      elStatus.textContent = "Aponte a câmera para o código de barras (geralmente na contracapa).";

      leitor.decodeFromVideoDevice(deviceId, elVideo, (resultado) => {
        if (!lendo || !resultado) return;
        const codigo = resultado.getText();
        const novo = adicionar(codigo);
        vibrar();
        elStatus.textContent = novo
          ? `Código ${codigo} adicionado à lista!`
          : `Código ${codigo} já estava na lista.`;
      });
    } catch (e) {
      elStatus.textContent = "Não foi possível acessar a câmera. Verifique se você deu permissão ao navegador.";
      elBtnIniciar.hidden = false;
      elVideoWrap.hidden = true;
      elBtnParar.hidden = true;
    }
  }

  function parar() {
    lendo = false;
    if (leitor) { try { leitor.reset(); } catch (e) {} }
    elVideoWrap.hidden = true;
    elBtnIniciar.hidden = false;
    elBtnParar.hidden = true;
    elStatus.textContent = "";
  }

  elBtnIniciar.addEventListener("click", iniciar);
  elBtnParar.addEventListener("click", parar);
  elBtnCopiar.addEventListener("click", copiar);
  elBtnLimpar.addEventListener("click", limpar);
  window.addEventListener("pagehide", parar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) parar(); });

  render();
})();
