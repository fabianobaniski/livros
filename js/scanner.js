// scanner.js — leitura de código de barras (ISBN) pela câmera do visitante,
// para quem quer vender livros. Usa a biblioteca ZXing (carregada via CDN
// em scanner.html) para decodificar o código; a lista fica só no navegador
// de quem escaneou (localStorage) até ser copiada/enviada por WhatsApp.
//
// Fluxo: cada toque em "escanear" faz UMA leitura só (não fica lendo em
// looping o mesmo código). Depois de ler, mostra uma confirmação com
// "escanear mais um" ou "concluir".

(function () {
  const CHAVE = "scanner_codigos";
  const C = window.SITE_CONFIG || {};

  // limite de segurança pro tamanho da URL do wa.me (nem todo navegador/
  // WhatsApp aceita URLs muito longas de forma confiável)
  const LIMITE_URL_WHATS = 2000;

  const elVideoWrap        = document.getElementById("scanner-video-wrap");
  const elVideo             = document.getElementById("scanner-video");
  const elConfirmacao       = document.getElementById("scanner-confirmacao");
  const elConfirmacaoTexto  = document.getElementById("scanner-confirmacao-texto");
  const elBtnMais           = document.getElementById("scanner-mais");
  const elBtnConcluir       = document.getElementById("scanner-concluir");
  const elStatus            = document.getElementById("scanner-status");
  const elBtnIniciar        = document.getElementById("scanner-iniciar");
  const elBtnParar          = document.getElementById("scanner-parar");
  const elListaCaixa        = document.getElementById("scanner-lista-caixa");
  const elLista              = document.getElementById("scanner-lista");
  const elTotal              = document.getElementById("scanner-total");
  const elAcoes              = document.getElementById("scanner-acoes");
  const elBtnCopiar          = document.getElementById("scanner-copiar");
  const elBtnWhats           = document.getElementById("scanner-whats");
  const elAvisoWhats         = document.getElementById("scanner-aviso-whats");
  const elBtnLimpar          = document.getElementById("scanner-limpar");

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
    return existente ? existente.quantidade : 1;
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

    // link do WhatsApp: se a lista deixar a URL grande demais, manda o
    // link "pelado" (sem o texto) e avisa pra colar a lista manualmente.
    const numero = C.WHATSAPP_NUMERO || "";
    const urlComTexto = `https://wa.me/${numero}?text=${encodeURIComponent(textoLista())}`;
    if (urlComTexto.length > LIMITE_URL_WHATS) {
      elBtnWhats.href = `https://wa.me/${numero}`;
      if (elAvisoWhats) elAvisoWhats.hidden = false;
    } else {
      elBtnWhats.href = urlComTexto;
      if (elAvisoWhats) elAvisoWhats.hidden = true;
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

  function vibrar() {
    try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}
  }

  // ---- leitura pela câmera (uma leitura por vez) ----
  async function iniciarLeitura() {
    if (typeof ZXing === "undefined") {
      elStatus.textContent = "Não foi possível carregar o leitor de código de barras. Verifique sua internet e tente de novo.";
      return;
    }

    elConfirmacao.hidden = true;
    elBtnIniciar.hidden = true;
    elVideoWrap.hidden = false;
    elBtnParar.hidden = false;
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
      elStatus.textContent = "Aponte a câmera para o código de barras (geralmente na contracapa).";

      const resultado = await leitor.decodeOnceFromVideoDevice(deviceId, elVideo);
      if (!lendo) return; // usuário cancelou antes de terminar de ler
      onCodigoLido(resultado.getText());
    } catch (e) {
      if (!lendo) return; // cancelado pelo usuário; erro esperado do reset()
      elStatus.textContent = "Não foi possível acessar a câmera. Verifique se você deu permissão ao navegador.";
      elBtnIniciar.hidden = false;
      elVideoWrap.hidden = true;
      elBtnParar.hidden = true;
    }
  }

  function onCodigoLido(codigo) {
    lendo = false;
    pararCamera();
    vibrar();
    const quantidade = adicionar(codigo);

    elVideoWrap.hidden = true;
    elBtnParar.hidden = true;
    elStatus.textContent = "";

    elConfirmacaoTexto.textContent = quantidade > 1
      ? `Código ${codigo} escaneado (já estava na lista, agora ${quantidade}x).`
      : `Código ${codigo} escaneado e adicionado à lista!`;
    elConfirmacao.hidden = false;
  }

  function pararCamera() {
    if (leitor) { try { leitor.reset(); } catch (e) {} }
  }

  function cancelar() {
    lendo = false;
    pararCamera();
    elVideoWrap.hidden = true;
    elBtnParar.hidden = true;
    elBtnIniciar.hidden = false;
    elStatus.textContent = "";
  }

  function concluir() {
    elConfirmacao.hidden = true;
    elBtnIniciar.hidden = false;
    if (elListaCaixa) elListaCaixa.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  elBtnIniciar.addEventListener("click", iniciarLeitura);
  elBtnMais.addEventListener("click", iniciarLeitura);
  elBtnConcluir.addEventListener("click", concluir);
  elBtnParar.addEventListener("click", cancelar);
  elBtnCopiar.addEventListener("click", copiar);
  elBtnLimpar.addEventListener("click", limpar);
  window.addEventListener("pagehide", cancelar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelar(); });

  render();
})();
