/* ==========================================================
   LUCIMAR — ESTOQUE DE CONFECÇÃO
   script.js completo — sem Node, sem dependências obrigatórias
   Funciona com HTML/CSS/JS puro + localStorage
   ========================================================== */

const STORAGE_KEY = "estoque_lucimar";
const CONFIG_ETIQUETA_KEY = "configEtiquetaTermica";
const IMPRESSORA_KEY = "impressoraTermica";
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbz-FKumfrxYo4LFHgXSdtK0EbHzwCB46Ty6UTrXTZ-dFzVE1xaBREHQhWiK8mfPuxA2fw/exec";

const RESPONSAVEL_LEGAL = "LUCIMAR MARIA RODRIGUES";
const CNPJ_RESPONSAVEL = "CNPJ 31.567.085/0001-18";

/* ==========================================================
   UTILITÁRIOS BÁSICOS
   ========================================================== */

function $(seletor, escopo = document) {
  return escopo.querySelector(seletor);
}

function $$(seletor, escopo = document) {
  return Array.from(escopo.querySelectorAll(seletor));
}

function hojeISO() {
  return new Date().toISOString();
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(texto) {
  return escaparHtml(texto);
}

function normalizarTextoCodigo(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function normalizarCodigoBusca(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function pad3(numero) {
  return String(numero).padStart(3, "0");
}

function textoParaArray(texto) {
  if (!texto) return [];
  if (Array.isArray(texto)) return texto;

  return String(texto)
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function arrayParaTexto(valor) {
  if (!valor) return "";
  if (Array.isArray(valor)) return valor.join(", ");
  return String(valor);
}

function numeroSeguro(valor, padrao = 0) {
  const n = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(n) ? n : padrao;
}

function dinheiroParaNumero(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;

  let texto = String(valor || "0").replace(/[^\d,.-]/g, "");

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = texto.split(".");
    if (partes.length > 2) {
      texto = partes.join("");
    } else if (partes.length === 2 && partes[1].length > 2) {
      texto = partes.join("");
    }
  }

  return Number(texto) || 0;
}

function formatarMoedaBR(valor) {
  const n = dinheiroParaNumero(valor);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarMoeda(valor) {
  return formatarMoedaBR(valor);
}

function normalizarPrecoVenda(item = {}) {
  return (
    item.precoVenda ||
    item.preco ||
    item.valorVenda ||
    item.valor ||
    ""
  );
}

function precoVendaItem(item = {}) {
  return normalizarPrecoVenda(item);
}

function formatarPrecoEstoque(item = {}) {
  const preco = precoVendaItem(item);
  return preco === "" || preco === null || preco === undefined
    ? "não informado"
    : formatarMoedaBR(preco);
}

/* ==========================================================
   LOCALSTORAGE
   ========================================================== */

function carregarEstoque() {
  try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(dados) ? dados.map(normalizarItem) : [];
  } catch (erro) {
    console.error("Erro ao carregar estoque:", erro);
    return [];
  }
}

function salvarEstoque(itens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(itens.map(normalizarItem)));
}

function adicionarItensEstoque(novosItens) {
  const estoque = carregarEstoque();
  const atualizados = [...estoque, ...novosItens.map(normalizarItem)];
  salvarEstoque(atualizados);
  return atualizados;
}

function atualizarItemEstoque(codigo, novosDados) {
  const estoque = carregarEstoque();
  const codigoLimpo = String(codigo || "").trim();

  const atualizados = estoque.map(item => {
    if (String(item.codigo || "").trim() !== codigoLimpo) return item;

    const historico = normalizarHistorico(item.historico);
    historico.push({
      data: hojeISO(),
      tipo: "alteracao",
      usuario: "Sistema",
      descricao: "Cadastro alterado manualmente."
    });

    return normalizarItem({
      ...item,
      ...novosDados,
      codigo: item.codigo,
      dataAtualizacao: hojeISO(),
      historico
    });
  });

  salvarEstoque(atualizados);
  return atualizados.find(item => item.codigo === codigoLimpo);
}

function excluirItemEstoque(codigo) {
  const estoque = carregarEstoque();
  const codigoLimpo = String(codigo || "").trim();
  const atualizados = estoque.filter(item => String(item.codigo || "").trim() !== codigoLimpo);
  salvarEstoque(atualizados);
}

/* ==========================================================
   GOOGLE SHEETS
   ========================================================== */

async function enviarItemParaGoogleSheets(item) {
  if (!URL_WEB_APP || URL_WEB_APP.includes("COLE_AQUI")) {
    throw new Error("URL_WEB_APP nao configurada.");
  }

  const resposta = await fetch(URL_WEB_APP, {
    method: "POST",
    body: JSON.stringify({
      action: "criar",
      ...item
    })
  });

  const texto = await resposta.text();

  try {
    return JSON.parse(texto);
  } catch (erro) {
    console.error("Resposta nao JSON do Apps Script:", texto);
    throw erro;
  }
}

function marcarItemSincronizado(codigo, sincronizado = true) {
  const estoque = carregarEstoque();
  const codigoNormalizado = normalizarCodigoBusca(codigo);

  const atualizado = estoque.map(item => {
    const mesmoItem =
      normalizarCodigoBusca(item.codigo) === codigoNormalizado ||
      normalizarCodigoBusca(item.codigoLeitura) === codigoNormalizado;

    return mesmoItem
      ? normalizarItem({
          ...item,
          sincronizado,
          dataAtualizacao: hojeISO()
        })
      : item;
  });

  salvarEstoque(atualizado);
}

async function sincronizarItensComGoogleSheets(itens) {
  const resultados = [];

  for (const item of itens) {
    try {
      const resposta = await enviarItemParaGoogleSheets(item);

      console.log("Google Sheets:", resposta);

      if (resposta && resposta.ok) {
        marcarItemSincronizado(item.codigo, true);
        resultados.push({ codigo: item.codigo, ok: true });
      } else {
        marcarItemSincronizado(item.codigo, false);
        resultados.push({
          codigo: item.codigo,
          ok: false,
          erro: resposta && resposta.erro ? resposta.erro : "Resposta sem confirmacao."
        });
      }
    } catch (erro) {
      console.error("Falha ao enviar item para Google Sheets:", item.codigo, erro);
      marcarItemSincronizado(item.codigo, false);
      resultados.push({
        codigo: item.codigo,
        ok: false,
        erro: String(erro)
      });
    }
  }

  return resultados;
}

function buscarItemPorCodigo(valor) {
  const busca = normalizarCodigoBusca(valor);

  if (!busca) return null;

  const estoque = carregarEstoque();

  const exato = estoque.find(item => {
    const codigoInterno = normalizarCodigoBusca(item.codigo);
    const codigoLeitura = normalizarCodigoBusca(item.codigoLeitura);

    return (
      codigoInterno === busca ||
      codigoLeitura === busca
    );
  });

  if (exato) return exato;

  return estoque.find(item => {
    const codigoInterno = normalizarCodigoBusca(item.codigo);
    const codigoLeitura = normalizarCodigoBusca(item.codigoLeitura);

    return (
      codigoInterno.endsWith(busca) ||
      codigoLeitura.endsWith(busca) ||
      (codigoLeitura && busca.endsWith(codigoLeitura))
    );
  }) || null;
}

function buscarItemPorCodigoLeitura(valor) {
  const busca = normalizarCodigoBusca(valor);
  if (!busca) return null;

  return carregarEstoque().find(item => normalizarCodigoBusca(item.codigoLeitura) === busca) || null;
}

function atribuirCodigoLeitura(codigoItem, codigoEtiqueta) {
  const item = buscarItemPorCodigo(codigoItem);
  const codigoLeitura = normalizarCodigoBusca(codigoEtiqueta);

  if (!item) {
    return { ok: false, mensagem: "Mercadoria/material nao encontrado." };
  }

  if (!codigoLeitura) {
    return { ok: false, mensagem: "Informe um codigo de etiqueta valido." };
  }

  const emUso = buscarItemPorCodigoLeitura(codigoLeitura);
  if (emUso && emUso.codigo !== item.codigo) {
    return {
      ok: false,
      mensagem: `O codigo ${codigoLeitura} ja esta atribuido a ${emUso.codigo}.`
    };
  }

  const atualizado = atualizarItemEstoque(item.codigo, { codigoLeitura });
  return {
    ok: true,
    item: atualizado,
    mensagem: `Codigo ${codigoLeitura} atribuido a ${item.codigo}.`
  };
}

function preencherCampo(id, valor) {
  const campo = document.getElementById(id);
  if (campo) campo.value = valor ?? "";
}

function valorCampo(id, padrao = "") {
  const campo = document.getElementById(id);
  return campo ? campo.value : padrao;
}

function abrirEdicaoItem(codigo) {
  const item = buscarItemPorCodigo(codigo);

  if (!item) {
    alert("Item nao encontrado para edicao.");
    return;
  }

  const form = document.getElementById("formEdicao");

  if (!form) {
    alert("Formulario de edicao nao encontrado.");
    return;
  }

  form.classList.remove("escondido");

  preencherCampo("editarCodigo", item.codigo);
  preencherCampo("editarCodigoLeitura", item.codigoLeitura);
  preencherCampo("editarNome", item.nome);
  preencherCampo("editarTipoRegistro", item.tipoRegistro);
  preencherCampo("editarCategoria", item.categoria);
  preencherCampo("editarStatus", item.status);
  preencherCampo("editarEtapa", item.etapa);
  preencherCampo("editarQuantidade", item.quantidade);
  preencherCampo("editarUnidade", item.unidade);
  preencherCampo("editarPrecoVenda", item.precoVenda || item.preco);
  preencherCampo("editarCusto", item.custo);
  preencherCampo("editarLote", item.lote);
  preencherCampo("editarResponsavel", item.responsavel);
  preencherCampo("editarObservacoesInternas", item.observacoesInternas);

  form.dataset.codigoOriginal = item.codigo;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function salvarItemEditado(codigoOriginal, itemAtualizado) {
  const estoque = carregarEstoque();
  const normalizadoOriginal = normalizarCodigoBusca(codigoOriginal);

  const novoEstoque = estoque.map(item => {
    const mesmoCodigo =
      normalizarCodigoBusca(item.codigo) === normalizadoOriginal ||
      normalizarCodigoBusca(item.codigoLeitura) === normalizadoOriginal;

    return mesmoCodigo ? normalizarItem(itemAtualizado) : item;
  });

  salvarEstoque(novoEstoque);
}

function limparFormularioEdicao() {
  const form = document.getElementById("formEdicao");
  if (!form) return;

  form.reset();
  form.classList.add("escondido");
  delete form.dataset.codigoOriginal;
}

/* ==========================================================
   NORMALIZAÇÃO
   ========================================================== */

function normalizarHistorico(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;

  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizarTipo(tipo) {
  const t = String(tipo || "").toLowerCase().trim();

  if (t === "produto") return "mercadoria";
  if (t === "mercadoria") return "mercadoria";
  if (t === "material") return "material";

  return "mercadoria";
}

function gerarCodigoLeitura(item) {
  const codigo = String(item.codigo || "").trim().toUpperCase();

  if (!codigo) return "";

  const matchCoraCurto = codigo.match(/^CORA-(\d{3})$/);
  if (matchCoraCurto) return "C" + matchCoraCurto[1];

  const matchCoraLote = codigo.match(/^CORA-\d{3}-(\d{3})$/);
  if (matchCoraLote) return "C" + matchCoraLote[1];

  const matchMaterial = codigo.match(/^MAT-[A-Z0-9]+-(\d{3})$/);
  if (matchMaterial) return "M" + matchMaterial[1];

  return normalizarCodigoBusca(codigo).slice(0, 12);
}

function normalizarItem(item = {}) {
  const tipoRegistro = normalizarTipo(item.tipoRegistro);
  const codigo = item.codigo || "";
  const codigoLeitura = item.codigoLeitura || gerarCodigoLeitura({ ...item, codigo });
  const precoVenda = normalizarPrecoVenda(item);

  return {
    idInterno: item.idInterno || cryptoRandomId(),
    tipoRegistro,
    codigo,
    codigoLeitura,
    nome: item.nome || "",
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    status: item.status || statusPadrao(tipoRegistro),
    etapa: item.etapa || etapaPadrao(tipoRegistro),
    quantidade: Number(item.quantidade || 1),
    unidade: item.unidade || "",
    precoVenda,
    preco: precoVenda,
    custo: item.custo || item.custoEstimado || "",
    lote: item.lote || "",
    responsavel: item.responsavel || "",
    colaboradores: textoParaArray(item.colaboradores),
    origemMaterial: item.origemMaterial || "",
    destinoPrevisto: item.destinoPrevisto || "",
    composicaoTextil: item.composicaoTextil || "",
    tamanhoProduto: item.tamanhoProduto || "",
    paisOrigem: item.paisOrigem || "Brasil",
    cuidadoLavagem: item.cuidadoLavagem || "Limpeza manual com pano úmido",
    cuidadoAlvejamento: item.cuidadoAlvejamento || "Não alvejar",
    cuidadoSecagem: item.cuidadoSecagem || "Secar à sombra",
    cuidadoPassadoria: item.cuidadoPassadoria || "Não passar sobre áreas pintadas",
    cuidadoProfissional: item.cuidadoProfissional || "Não lavar a seco",
    observacaoEtiqueta: item.observacaoEtiqueta || "",
    observacoesInternas: item.observacoesInternas || "",
    fotoLocal: item.fotoLocal || "",
    fotoUrl: item.fotoUrl || item.foto || "",
    pastaFotoSugerida: item.pastaFotoSugerida || pastaFotoPadrao(tipoRegistro, item.codigo),
    dataRegistro: item.dataRegistro || item.dataEntrada || hojeISO(),
    dataAtualizacao: item.dataAtualizacao || hojeISO(),
    historico: normalizarHistorico(item.historico || item.historicoJson),
    sincronizado: Boolean(item.sincronizado)
  };
}

function statusPadrao(tipo) {
  return tipo === "material" ? "Disponível" : "Em estoque";
}

function etapaPadrao(tipo) {
  return tipo === "material" ? "Recebido" : "Finalizado";
}

function pastaFotoPadrao(tipo, codigo = "") {
  if (!codigo) return tipo === "material" ? "fotos_materiais/" : "fotos_produtos/";

  if (tipo === "material") return `fotos_materiais/${codigo}.jpg`;
  return `fotos_produtos/${codigo}.jpg`;
}

function cryptoRandomId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `ID-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ==========================================================
   GERAÇÃO DE CÓDIGOS — SEM NODE
   ========================================================== */

function prefixoPorNome(nome, fallback = "ITEM") {
  const texto = normalizarTextoCodigo(nome || fallback);
  const partes = texto.split("-").filter(Boolean);

  if (!partes.length) return fallback;

  if (partes[0] === "BOLSA" && partes[1]) return partes[1].slice(0, 10);
  return partes[0].slice(0, 12);
}

function numeroDoLote(lote) {
  const normalizado = normalizarTextoCodigo(lote);
  const match = normalizado.match(/(\d{1,4})$/);
  return match ? pad3(Number(match[1])) : "001";
}

function baseCodigoManual(valor) {
  const base = normalizarTextoCodigo(valor || "");
  if (!base) return "";

  return base
    .replace(/-\d{1,4}$/g, "")
    .replace(/^-+|-+$/g, "");
}

function maiorSequenciaExistente(base, estoque) {
  const baseLimpa = normalizarTextoCodigo(base);
  let maior = 0;

  estoque.forEach(item => {
    const codigo = normalizarTextoCodigo(item.codigo || "");

    if (codigo === baseLimpa) {
      maior = Math.max(maior, 1);
      return;
    }

    if (codigo.startsWith(baseLimpa + "-")) {
      const resto = codigo.slice(baseLimpa.length + 1);
      const match = resto.match(/^(\d{1,5})$/);
      if (match) {
        maior = Math.max(maior, Number(match[1]));
      }
    }
  });

  return maior;
}

function criarBaseCodigo(item) {
  const tipo = normalizarTipo(item.tipoRegistro);

  const referenciaManual =
    item.referenciaCodigo ||
    item.referenciaManual ||
    item.codigoReferencia ||
    item.codigoBase ||
    item.referencia ||
    "";

  const manual = baseCodigoManual(referenciaManual);

  if (manual) return manual;

  if (tipo === "material") {
    const categoria = prefixoPorNome(item.categoria || item.nome, "MATERIAL");
    return `MAT-${categoria}`;
  }

  const nome = prefixoPorNome(item.nome || item.categoria, "MERC");
  const loteNumero = numeroDoLote(item.lote || "");

  if (item.lote) {
    return `${nome}-${loteNumero}`;
  }

  return nome || "MERC";
}

function gerarCodigoUnico(item, indiceNoLote = 1, estoque = carregarEstoque()) {
  const base = criarBaseCodigo(item);
  const baseLimpa = normalizarTextoCodigo(base);

  let sequencia = indiceNoLote;

  const maiorExistente = maiorSequenciaExistente(baseLimpa, estoque);
  if (maiorExistente >= sequencia) {
    sequencia = maiorExistente + indiceNoLote;
  }

  let codigo = `${baseLimpa}-${pad3(sequencia)}`;

  while (estoque.some(itemEstoque => itemEstoque.codigo === codigo)) {
    sequencia += 1;
    codigo = `${baseLimpa}-${pad3(sequencia)}`;
  }

  return codigo;
}

function gerarItensPorQuantidade(dadosBase) {
  const estoque = carregarEstoque();
  const quantidade = Math.max(1, Number(dadosBase.quantidade || 1));
  const itens = [];

  for (let i = 1; i <= quantidade; i++) {
    const itemBase = {
      ...dadosBase,
      quantidade: 1
    };

    const codigo = gerarCodigoUnico(itemBase, i, [...estoque, ...itens]);

    const item = normalizarItem({
      ...itemBase,
      codigo,
      pastaFotoSugerida: pastaFotoPadrao(normalizarTipo(itemBase.tipoRegistro), codigo),
      dataRegistro: hojeISO(),
      dataAtualizacao: hojeISO(),
      historico: [
        {
          data: hojeISO(),
          tipo: itemBase.tipoRegistro === "material" ? "entrada_material" : "entrada_mercadoria",
          usuario: itemBase.responsavel || "Sistema",
          descricao: itemBase.tipoRegistro === "material"
            ? "Entrada de material no estoque."
            : "Entrada de mercadoria no estoque."
        }
      ]
    });

    itens.push(item);
  }

  return itens;
}

/* ==========================================================
   FORMULÁRIOS
   ========================================================== */

function lerValorCampo(form, nomes) {
  for (const nome of nomes) {
    const campo =
      form.elements[nome] ||
      form.querySelector(`#${nome}`) ||
      form.querySelector(`[name="${nome}"]`);

    if (campo) {
      if (campo.type === "checkbox") return campo.checked;
      return campo.value;
    }
  }

  return "";
}

async function arquivoParaBase64(inputFile) {
  const arquivo = inputFile?.files?.[0];
  if (!arquivo) return "";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });
}

async function dadosDoFormulario(form) {
  const tipoUrl = new URLSearchParams(window.location.search).get("tipo");

  const tipoRegistro = normalizarTipo(
    lerValorCampo(form, ["tipoRegistro", "tipo", "tipoItem"]) ||
    tipoUrl ||
    "mercadoria"
  );

  const inputFoto =
    form.querySelector('input[type="file"][name="foto"]') ||
    form.querySelector('input[type="file"]');

  const fotoUrl = await arquivoParaBase64(inputFoto);
  const precoVenda = lerValorCampo(form, ["precoVenda", "preco", "preço", "valorVenda", "valor"]);

  const dados = {
    tipoRegistro,
    referenciaCodigo: lerValorCampo(form, ["codigo", "referenciaCodigo", "referenciaManual", "codigoReferencia", "codigoBase", "referencia"]),
    nome: lerValorCampo(form, ["nome", "nomeProduto", "nomeMercadoria", "nomeMaterial"]),
    descricao: lerValorCampo(form, ["descricao", "descrição"]),
    categoria: lerValorCampo(form, ["categoria"]),
    status: lerValorCampo(form, ["status"]) || statusPadrao(tipoRegistro),
    etapa: lerValorCampo(form, ["etapa"]) || etapaPadrao(tipoRegistro),
    quantidade: Number(lerValorCampo(form, ["quantidade", "qtd"]) || 1),
    unidade: lerValorCampo(form, ["unidade"]),
    precoVenda,
    preco: precoVenda,
    custo: lerValorCampo(form, ["custo", "custoEstimado"]),
    lote: lerValorCampo(form, ["lote"]),
    responsavel: lerValorCampo(form, ["responsavel", "responsável"]),
    colaboradores: textoParaArray(lerValorCampo(form, ["colaboradores"])),
    origemMaterial: lerValorCampo(form, ["origemMaterial", "origem"]),
    destinoPrevisto: lerValorCampo(form, ["destinoPrevisto", "destino"]),
    composicaoTextil: lerValorCampo(form, ["composicaoTextil", "composiçãoTextil"]),
    tamanhoProduto: lerValorCampo(form, ["tamanhoProduto", "tamanho"]),
    paisOrigem: lerValorCampo(form, ["paisOrigem"]) || "Brasil",
    cuidadoLavagem: lerValorCampo(form, ["cuidadoLavagem"]) || "Limpeza manual com pano úmido",
    cuidadoAlvejamento: lerValorCampo(form, ["cuidadoAlvejamento"]) || "Não alvejar",
    cuidadoSecagem: lerValorCampo(form, ["cuidadoSecagem"]) || "Secar à sombra",
    cuidadoPassadoria: lerValorCampo(form, ["cuidadoPassadoria"]) || "Não passar sobre áreas pintadas",
    cuidadoProfissional: lerValorCampo(form, ["cuidadoProfissional"]) || "Não lavar a seco",
    observacaoEtiqueta: lerValorCampo(form, ["observacaoEtiqueta", "observaçãoEtiqueta"]),
    observacoesInternas: lerValorCampo(form, ["observacoesInternas", "observaçõesInternas"]),
    fotoUrl
  };

  if (dados.nome.toLowerCase().includes("cora")) {
    dados.composicaoTextil ||= "Fibras diversas / composição não determinada";
    dados.origemMaterial ||= "Produto confeccionado com reaproveitamento de resíduos têxteis e refugos de confecção.";
    dados.tamanhoProduto ||= "Único";
    dados.observacaoEtiqueta ||= "Peça única feita com tecidos variados e técnicas artesanais de pintura.";
  }

  return dados;
}

function configurarTipoPorUrl() {
  const tipo = new URLSearchParams(window.location.search).get("tipo");
  if (!tipo) return;

  const campoTipo =
    $("#tipoRegistro") ||
    $('[name="tipoRegistro"]') ||
    $('[name="tipo"]');

  if (campoTipo) campoTipo.value = normalizarTipo(tipo);

  document.body.dataset.tipoRegistro = normalizarTipo(tipo);
}

function configurarFormularioCadastro() {
  const form =
    $("#formRegistro") ||
    $("#formCadastro") ||
    $("form[data-form='registro']") ||
    $("form");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const dados = await dadosDoFormulario(form);

      if (!dados.nome) {
        alert("Informe o nome do item.");
        return;
      }

      const itens = gerarItensPorQuantidade(dados).map(item => ({
        ...item,
        sincronizado: false
      }));

      adicionarItensEstoque(itens);

      let mensagem =
        itens.length === 1
          ? `Registro salvo localmente: ${itens[0].codigo}`
          : `${itens.length} registros salvos localmente:\n\n${itens.map(i => i.codigo).join("\n")}`;

      try {
        const resultados = await sincronizarItensComGoogleSheets(itens);
        const enviados = resultados.filter(r => r.ok).length;
        const falhas = resultados.length - enviados;

        if (falhas === 0) {
          mensagem += "\n\nGoogle Sheets atualizado com sucesso.";
        } else {
          mensagem += `\n\n${enviados} enviados ao Google Sheets. ${falhas} ficaram apenas locais. Veja o console.`;
        }
      } catch (erro) {
        console.error("Erro geral na sincronizacao com Google Sheets:", erro);
        mensagem += "\n\nOs registros foram salvos localmente, mas nao foram enviados para a planilha.";
      }

      alert(mensagem);

      form.reset();
      configurarTipoPorUrl();

    } catch (erro) {
      console.error("Erro ao salvar registro:", erro);
      alert("Erro ao salvar registro. Veja o console.");
    }
  });
}

/* ==========================================================
   DASHBOARD
   ========================================================== */

function configurarDashboard() {
  const container =
    $("#listaEstoque") ||
    $("#produtos") ||
    $("#listaProdutos") ||
    $("#estoqueLista");

  const tabelaBody = $("#tabelaBody");

  if (!container && !tabelaBody) return;

  const filtroTipo = $("#filtroTipo");
  const filtroBusca = $("#filtroBusca") || $("#filtroTexto");
  const filtroCategoria = $("#filtroCategoria");
  const filtroStatus = $("#filtroStatus");
  const filtroLote = $("#filtroLote");
  const statusDashboard = $("#statusDashboard");

  function preencherFiltroCategoria(itens) {
    if (!filtroCategoria) return;

    const valorAtual = filtroCategoria.value;
    const categorias = [...new Set(itens.map(item => item.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    filtroCategoria.innerHTML = '<option value="">Todas as categorias</option>';
    categorias.forEach(categoria => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria;
      filtroCategoria.appendChild(option);
    });

    filtroCategoria.value = valorAtual;
  }

  function linhaTabelaHtml(item) {
    const precoExibicao = formatarPrecoEstoque(item);

    return `
      <tr>
        <td>${escaparHtml(item.codigo || "-")}</td>
        <td>${escaparHtml(item.nome || "Sem nome")}</td>
        <td>${escaparHtml(precoExibicao)}</td>
        <td>${escaparHtml(item.status || "-")}</td>
        <td>${escaparHtml(item.categoria || "-")}</td>
        <td>${escaparHtml(item.responsavel || "-")}</td>
        <td>${escaparHtml(arrayParaTexto(item.colaboradores) || "-")}</td>
        <td>${escaparHtml(item.lote || "-")}</td>
        <td>${escaparHtml(item.etapa || "-")}</td>
        <td>${escaparHtml(new Date(item.dataRegistro || item.dataEntrada || hojeISO()).toLocaleString("pt-BR"))}</td>
        <td>${escaparHtml(item.observacoesInternas || item.descricao || "-")}</td>
        <td>
          <button type="button" data-editar="${escaparHtml(item.codigo)}">Editar</button>
          <button type="button" data-imprimir-codigo="${escaparHtml(item.codigo)}">Imprimir etiqueta</button>
          <button type="button" data-excluir="${escaparHtml(item.codigo)}">Excluir</button>
        </td>
      </tr>
    `;
  }

  function render() {
    const itens = carregarEstoque();
    const tipo = filtroTipo?.value || "todos";
    const busca = normalizarTextoCodigo(filtroBusca?.value || "");
    const buscaCodigo = normalizarCodigoBusca(filtroBusca?.value || "");
    const categoria = filtroCategoria?.value || "";
    const status = filtroStatus?.value || "";
    const lote = normalizarTextoCodigo(filtroLote?.value || "");

    preencherFiltroCategoria(itens);

    const filtrados = itens.filter(item => {
      const tipoOk =
        tipo === "todos" ||
        item.tipoRegistro === tipo ||
        (tipo === "mercadoria" && item.tipoRegistro === "produto");

      const categoriaOk = !categoria || item.categoria === categoria;
      const statusOk = !status || item.status === status;
      const loteOk = !lote || normalizarTextoCodigo(item.lote).includes(lote);

      const textoBusca = normalizarTextoCodigo([
        item.codigo,
        item.codigoLeitura,
        normalizarCodigoBusca(item.codigo),
        normalizarCodigoBusca(item.codigoLeitura),
        item.nome,
        item.categoria,
        item.lote,
        item.status,
        item.responsavel,
        item.observacoesInternas,
        item.descricao
      ].join(" "));

      const codigoBuscaOk = !buscaCodigo || [
        normalizarCodigoBusca(item.codigo),
        normalizarCodigoBusca(item.codigoLeitura)
      ].some(codigo => codigo && (
        codigo === buscaCodigo ||
        codigo.endsWith(buscaCodigo) ||
        buscaCodigo.endsWith(codigo)
      ));

      const buscaOk = !busca || textoBusca.includes(busca) || codigoBuscaOk;

      return tipoOk && categoriaOk && statusOk && loteOk && buscaOk;
    });

    window.itensFiltradosDashboard = filtrados;

    renderIndicadores(itens);

    if (container) {
      container.innerHTML = filtrados.map(cardItemHtml).join("") || "<p>Nenhum registro encontrado.</p>";
    }

    if (tabelaBody) {
      tabelaBody.innerHTML = filtrados.length
        ? filtrados.map(linhaTabelaHtml).join("")
        : '<tr><td colspan="12">Nenhum registro encontrado.</td></tr>';
    }

    if (statusDashboard) {
      statusDashboard.textContent = `${filtrados.length} de ${itens.length} itens exibidos.`;
    }
  }

  filtroTipo?.addEventListener("change", render);
  filtroBusca?.addEventListener("input", render);
  filtroCategoria?.addEventListener("change", render);
  filtroStatus?.addEventListener("change", render);
  filtroLote?.addEventListener("input", render);

  $("#buscarCodigoBtn")?.addEventListener("click", () => {
    const codigo = $("#codigoBusca")?.value || "";
    abrirEdicaoItem(codigo);
  });

  $("#cancelarEdicao")?.addEventListener("click", limparFormularioEdicao);

  $("#formEdicao")?.addEventListener("submit", event => {
    event.preventDefault();

    const formEdicao = event.currentTarget;
    const codigoOriginal = formEdicao.dataset.codigoOriginal;

    if (!codigoOriginal) {
      alert("Nenhum item selecionado para edicao.");
      return;
    }

    const itemAtual = buscarItemPorCodigo(codigoOriginal);

    if (!itemAtual) {
      alert("Item original nao encontrado.");
      return;
    }

    const precoVenda = valorCampo("editarPrecoVenda", itemAtual.precoVenda || itemAtual.preco);
    const historico = normalizarHistorico(itemAtual.historico);
    historico.push({
      data: hojeISO(),
      tipo: "edicao",
      usuario: "Sistema",
      descricao: "Item editado manualmente."
    });

    const dadosAtualizados = {
      ...itemAtual,
      nome: valorCampo("editarNome", itemAtual.nome),
      tipoRegistro: valorCampo("editarTipoRegistro", itemAtual.tipoRegistro),
      categoria: valorCampo("editarCategoria", itemAtual.categoria),
      status: valorCampo("editarStatus", itemAtual.status),
      etapa: valorCampo("editarEtapa", itemAtual.etapa),
      quantidade: Number(valorCampo("editarQuantidade", itemAtual.quantidade) || 1),
      unidade: valorCampo("editarUnidade", itemAtual.unidade),
      precoVenda,
      preco: precoVenda,
      custo: valorCampo("editarCusto", itemAtual.custo),
      lote: valorCampo("editarLote", itemAtual.lote),
      responsavel: valorCampo("editarResponsavel", itemAtual.responsavel),
      observacoesInternas: valorCampo("editarObservacoesInternas", itemAtual.observacoesInternas),
      codigo: itemAtual.codigo,
      codigoLeitura: itemAtual.codigoLeitura,
      dataAtualizacao: hojeISO(),
      historico
    };

    salvarItemEditado(codigoOriginal, dadosAtualizados);
    alert("Item atualizado com sucesso.");
    limparFormularioEdicao();
    render();
  });

  document.addEventListener("click", event => {
    const btnEditar = event.target.closest("[data-editar]");
    if (btnEditar) {
      abrirEdicaoItem(btnEditar.dataset.editar);
      return;
    }

    const btnExcluir = event.target.closest("[data-excluir]");
    if (btnExcluir) {
      const codigo = btnExcluir.dataset.excluir;
      if (confirm("Tem certeza que deseja excluir este registro? Esta ação remove o item do estoque local.")) {
        excluirItemEstoque(codigo);
        render();
      }
    }

    const btnEtiqueta = event.target.closest("[data-etiqueta], [data-imprimir-operacao], [data-imprimir-codigo]");
    if (btnEtiqueta) {
      const codigo =
        btnEtiqueta.dataset.etiqueta ||
        btnEtiqueta.dataset.imprimirOperacao ||
        btnEtiqueta.dataset.imprimirCodigo;
      const item = buscarItemPorCodigo(codigo);

      if (!item) {
        alert("Item nao encontrado.");
        return;
      }

      imprimirEtiquetaA4(item);
    }
  });

  render();
}

function renderIndicadores(itens) {
  const total = itens.length;
  const mercadorias = itens.filter(i => i.tipoRegistro === "mercadoria").length;
  const materiais = itens.filter(i => i.tipoRegistro === "material").length;
  const vendidos = itens.filter(i => i.status === "Vendido").length;
  const emProducao = itens.filter(i => ["Em produção", "Corte", "Costura", "Acabamento"].includes(i.status)).length;
  const produtosProntos = itens.filter(i => i.categoria === "produto pronto" || i.status === "Em estoque").length;
  const reservados = itens.filter(i => i.status === "Reservado").length;

  const valorMercadorias = itens
    .filter(i => i.tipoRegistro === "mercadoria" && i.status !== "Vendido")
    .reduce((soma, item) => soma + dinheiroParaNumero(precoVendaItem(item)) * Number(item.quantidade || 1), 0);

  const setText = (id, valor) => {
    const el = $(id);
    if (el) el.textContent = valor;
  };

  setText("#totalRegistros", total);
  setText("#totalProdutos", total);
  setText("#totalMercadorias", mercadorias);
  setText("#totalMateriais", materiais);
  setText("#materiaisEstoque", materiais);
  setText("#emProducao", emProducao);
  setText("#produtosProntos", produtosProntos);
  setText("#reservados", reservados);
  setText("#quantidadeVendida", vendidos);
  setText("#vendidos", vendidos);
  setText("#valorEstoque", formatarMoedaBR(valorMercadorias));
}

function cardItemHtml(item) {
  const tipoLabel = item.tipoRegistro === "material" ? "Material" : "Mercadoria";
  const precoExibicao = formatarPrecoEstoque(item);

  return `
    <article class="card-produto card-${item.tipoRegistro}">
      ${item.fotoUrl ? `<img src="${item.fotoUrl}" alt="${escaparHtml(item.nome)}" class="foto-produto">` : ""}
      <div class="card-conteudo">
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong>
        <p><b>Tipo:</b> ${tipoLabel}</p>
        <p><b>Código interno:</b> ${escaparHtml(item.codigo)}</p>
        <p><b>Código de leitura:</b> ${escaparHtml(item.codigoLeitura || gerarCodigoLeitura(item) || "-")}</p>
        <p><b>Status:</b> ${escaparHtml(item.status)}</p>
        <p><b>Categoria:</b> ${escaparHtml(item.categoria || "-")}</p>
        <p><b>PreÃ§o:</b> ${escaparHtml(precoExibicao)}</p>
        <p><b>Quantidade:</b> ${escaparHtml(item.quantidade)} ${escaparHtml(item.unidade || "")}</p>
        <p><b>Lote:</b> ${escaparHtml(item.lote || "-")}</p>
        <p><b>Etapa:</b> ${escaparHtml(item.etapa || "-")}</p>
        <p><b>Foto sugerida:</b> ${escaparHtml(item.pastaFotoSugerida || "-")}</p>
        <div class="acoes-card">
          <button type="button" data-editar="${escaparHtml(item.codigo)}">Editar</button>
          <button type="button" data-imprimir-codigo="${escaparHtml(item.codigo)}">Imprimir etiqueta</button>
          <button type="button" data-excluir="${escaparHtml(item.codigo)}">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================
   OPERAÇÃO / LEITURA
   ========================================================== */

function gerarCodigoBarrasSvgString(codigo) {
  const codigoLimpo = String(codigo || "").trim();

  if (!codigoLimpo || !window.JsBarcode) {
    return "";
  }

  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    JsBarcode(svg, codigoLimpo, {
      format: "CODE128",
      lineColor: "#000",
      width: 1.6,
      height: 48,
      displayValue: true,
      fontSize: 12,
      margin: 4
    });

    return svg.outerHTML;
  } catch (erro) {
    console.error("Erro ao gerar codigo de barras:", erro);
    return "";
  }
}

function gerarCodigoBarrasPng(codigo) {
  if (!codigo || !window.JsBarcode) {
    return "";
  }

  try {
    const canvas = document.createElement("canvas");

    JsBarcode(canvas, codigo, {
      format: "CODE128",
      lineColor: "#000000",
      background: "#FFFFFF",
      width: 3,
      height: 90,
      displayValue: false,
      margin: 12
    });

    return canvas.toDataURL("image/png");
  } catch (erro) {
    console.error("Erro ao gerar PNG do codigo de barras:", erro);
    return "";
  }
}

function anexarCodigoTextoEtiqueta(texto, codigo = "") {
  const codigoLimpo = String(codigo || "").trim();
  const textoOriginal = String(texto || "");

  if (!codigoLimpo || textoOriginal.includes(codigoLimpo)) {
    return textoOriginal;
  }

  return `${textoOriginal.trimEnd()}\nCOD: ${codigoLimpo}`;
}

function configurarOperacao() {
  const campo =
    $("#codigoOperacao") ||
    $("#leitorCodigo") ||
    $('[name="codigoOperacao"]');

  const resultado =
    $("#resultadoOperacao") ||
    $("#resultadoBusca");

  const campoEtiquetaLivre = $("#codigoEtiquetaLivre");
  const campoItemAtribuir = $("#codigoItemAtribuir");
  const resultadoAtribuicao = $("#resultadoAtribuicaoCodigo");

  if (!campo || !resultado) return;

  const buscar = () => {
    const codigo = campo.value.trim();
    const item = buscarItemPorCodigo(codigo);

    if (!item) {
      resultado.innerHTML = `<p>Produto/material não encontrado para o código informado.</p>`;
      return;
    }

    resultado.innerHTML = renderOperacaoItem(item);
  };

  campo.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      buscar();
    }
  });

  $("#buscarProdutoOperacao")?.addEventListener("click", buscar);

  resultado.addEventListener("click", async event => {
    const statusBtn = event.target.closest("[data-status-rapido]");
    if (statusBtn) {
      const codigo = statusBtn.dataset.codigo;
      const status = statusBtn.dataset.statusRapido;
      alterarStatusRapido(codigo, status);
      const atualizado = buscarItemPorCodigo(codigo);
      resultado.innerHTML = renderOperacaoItem(atualizado);
    }

    const etiquetaBtn = event.target.closest("[data-imprimir-codigo], [data-imprimir-operacao]");
    if (etiquetaBtn) {
      const codigo = etiquetaBtn.dataset.imprimirCodigo || etiquetaBtn.dataset.imprimirOperacao;
      const item = buscarItemPorCodigo(codigo);
      if (!item) {
        alert("Item nao encontrado.");
        return;
      }

      imprimirEtiquetaA4(item);
    }
  });

  $("#atribuirCodigoEtiqueta")?.addEventListener("click", () => {
    const codigoEtiqueta = campoEtiquetaLivre?.value || campo.value;
    const codigoItem = campoItemAtribuir?.value || "";
    const retorno = atribuirCodigoLeitura(codigoItem, codigoEtiqueta);

    if (resultadoAtribuicao) {
      resultadoAtribuicao.innerHTML = `<p>${escaparHtml(retorno.mensagem)}</p>`;
    }

    if (!retorno.ok) {
      alert(retorno.mensagem);
      return;
    }

    if (campoEtiquetaLivre) campoEtiquetaLivre.value = "";
    if (campoItemAtribuir) campoItemAtribuir.value = "";
    resultado.innerHTML = renderOperacaoItem(retorno.item);
  });

  setTimeout(() => campo.focus(), 300);
}

function alterarStatusRapido(codigo, status) {
  const item = buscarItemPorCodigo(codigo);
  if (!item) return;

  const historico = normalizarHistorico(item.historico);
  historico.push({
    data: hojeISO(),
    tipo: "status",
    usuario: "Sistema",
    descricao: `Status alterado para: ${status}`
  });

  atualizarItemEstoque(codigo, {
    status,
    historico,
    dataAtualizacao: hojeISO()
  });
}

function renderOperacaoItem(item) {
  const botoesMercadoria = `
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Em estoque">Em estoque</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Reservado">Reservar</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Vendido">Vendido</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Com ajuste pendente">Ajuste</button>
  `;

  const botoesMaterial = `
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Disponível">Disponível</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Reservado para produção">Reservar</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Em uso">Em uso</button>
    <button type="button" data-codigo="${item.codigo}" data-status-rapido="Consumido">Consumido</button>
  `;

  return `
    <section class="resultado-card">
      ${item.fotoUrl ? `<img src="${item.fotoUrl}" alt="${escaparHtml(item.nome)}" class="foto-produto">` : ""}
      <h3>${escaparHtml(item.nome)}</h3>
      <p><b>Tipo:</b> ${item.tipoRegistro === "material" ? "Material" : "Mercadoria"}</p>
      <p><b>Código interno:</b> ${escaparHtml(item.codigo)}</p>
      <p><b>Código de leitura:</b> ${escaparHtml(item.codigoLeitura || gerarCodigoLeitura(item) || "-")}</p>
      <p><b>Status:</b> ${escaparHtml(item.status)}</p>
      <p><b>Categoria:</b> ${escaparHtml(item.categoria || "-")}</p>
      <p><b>Lote:</b> ${escaparHtml(item.lote || "-")}</p>
      <p><b>Etapa:</b> ${escaparHtml(item.etapa || "-")}</p>
      <p><b>Qtd:</b> ${escaparHtml(item.quantidade)} ${escaparHtml(item.unidade || "")}</p>

      <div class="acoes">
        ${item.tipoRegistro === "material" ? botoesMaterial : botoesMercadoria}
        <button type="button" data-imprimir-codigo="${escaparHtml(item.codigo)}">Imprimir etiqueta</button>
      </div>
    </section>
  `;
}

/* ==========================================================
   ETIQUETAS
   ========================================================== */

function montarEtiquetaMercadoria(item) {
  return `
${RESPONSAVEL_LEGAL}
${CNPJ_RESPONSAVEL}
FEITO NO BRASIL

MERCADORIA:
${item.nome || "Produto"}

COD: ${item.codigo || "-"}
LOTE: ${item.lote || "-"}
TAM: ${item.tamanhoProduto || "Único"}
PRECO: ${precoVendaItem(item) ? formatarMoeda(precoVendaItem(item)) : "A DEFINIR"}

COMP:
${item.composicaoTextil || "Fibras diversas / composição não determinada"}

CUIDADOS:
${item.cuidadoLavagem || "Limpeza manual com pano úmido"}
${item.cuidadoAlvejamento || "Não alvejar"}
${item.cuidadoSecagem || "Secar à sombra"}
${item.cuidadoPassadoria || "Não passar sobre áreas pintadas"}
${item.cuidadoProfissional || "Não lavar a seco"}

${item.observacaoEtiqueta || ""}
`.trim();
}

function montarEtiquetaMaterial(item) {
  return `
LUCIMAR
MATERIAL DE CONFECCAO

MATERIAL:
${item.nome || "Material"}

COD: ${item.codigo || "-"}
QTD: ${item.quantidade || 1} ${item.unidade || ""}
STATUS: ${item.status || "-"}
DESTINO:
${item.destinoPrevisto || "-"}

OBS:
${item.observacoesInternas || ""}
`.trim();
}

function montarEtiquetaCodigo(item) {
  const codigo = item?.codigoLeitura || gerarCodigoLeitura(item || {}) || item?.codigo || "CODIGO-NAO-INFORMADO";
  return codigo;
}

function mostrarPreviewEtiquetaCodigo(codigo) {
  const preview = $("#previewEtiqueta");
  if (!preview) return;

  const codigoSeguro = escaparHtml(codigo);
  preview.innerHTML = `
    <div>
      <p><strong>Codigo:</strong></p>
      <p>${codigoSeguro}</p>
      <svg id="previewCodigoBarras"></svg>
    </div>
  `;

  if (!window.JsBarcode) return;

  try {
    JsBarcode("#previewCodigoBarras", codigo, {
      format: "CODE128",
      lineColor: "#000",
      width: 1.5,
      height: 46,
      displayValue: false,
      margin: 0
    });
  } catch (erro) {
    console.error("Erro ao gerar preview do codigo de barras:", erro);
  }
}

async function imprimirEtiquetaCodigo(item) {
  imprimirEtiquetaA4(item);
}

function imprimirEtiquetaA4(item) {
  if (!item) {
    alert("Item nao encontrado.");
    return;
  }

  const codigo = item.codigoLeitura || gerarCodigoLeitura(item) || item.codigo;

  if (!codigo) {
    alert("Item sem codigo para etiqueta.");
    return;
  }

  const janela = window.open("", "_blank", "width=900,height=700");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups.");
    return;
  }

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta ${escapeHtml(codigo)}</title>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>

      <style>
        @page {
          size: A4;
          margin: 12mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .pagina {
          width: 186mm;
          min-height: 273mm;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 20mm;
        }

        .etiqueta {
          width: 55mm;
          height: 28mm;
          border: 1px dashed #999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3mm;
          page-break-inside: avoid;
        }

        .etiqueta svg {
          width: 48mm;
          height: 16mm;
          display: block;
        }

        .codigo {
          margin-top: 1.5mm;
          font-family: "Courier New", monospace;
          font-size: 13pt;
          font-weight: 700;
          letter-spacing: 1px;
        }

        @media print {
          .etiqueta {
            border: none;
          }
        }
      </style>
    </head>

    <body>
      <div class="pagina">
        <div class="etiqueta">
          <svg id="barcode"></svg>
          <div class="codigo">${escapeHtml(codigo)}</div>
        </div>
      </div>

      <script>
        window.onload = function () {
          JsBarcode("#barcode", ${JSON.stringify(codigo)}, {
            format: "CODE128",
            lineColor: "#000",
            background: "#fff",
            width: 2,
            height: 70,
            displayValue: false,
            margin: 8
          });

          setTimeout(function () {
            window.focus();
            window.print();
          }, 500);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function obterCodigoEtiqueta(item) {
  return (
    item?.codigoLeitura ||
    item?.codigo ||
    ""
  ).toString().trim().toUpperCase();
}

function imprimirFolhaEtiquetasA4(itens) {
  const lista = Array.isArray(itens) ? itens : [];
  const codigos = lista
    .map(obterCodigoEtiqueta)
    .filter(Boolean);

  if (!codigos.length) {
    alert("Nenhum codigo encontrado para imprimir.");
    return;
  }

  const janela = window.open("", "_blank", "width=1000,height=800");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups.");
    return;
  }

  const etiquetasHtml = codigos.map((codigo, index) => `
    <div class="etiqueta">
      <svg id="barcode-${index}"></svg>
      <div class="codigo">${escapeHtml(codigo)}</div>
    </div>
  `).join("");

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Folha de Etiquetas LUCIMAR</title>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>

      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .pagina {
          width: 190mm;
          min-height: 277mm;
          display: grid;
          grid-template-columns: repeat(3, 58mm);
          gap: 5mm 5mm;
          align-content: start;
        }

        .etiqueta {
          width: 58mm;
          height: 25mm;
          border: 1px dashed #cccccc;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2.5mm;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .etiqueta svg {
          width: 50mm;
          height: 14mm;
          display: block;
        }

        .codigo {
          margin-top: 1mm;
          font-family: "Courier New", monospace;
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 1px;
        }

        @media print {
          .etiqueta {
            border: 1px dashed #dddddd;
          }
        }
      </style>
    </head>

    <body>
      <div class="pagina">
        ${etiquetasHtml}
      </div>

      <script>
        const codigos = ${JSON.stringify(codigos)};

        window.onload = function () {
          codigos.forEach(function (codigo, index) {
            JsBarcode("#barcode-" + index, codigo, {
              format: "CODE128",
              lineColor: "#000000",
              background: "#ffffff",
              width: 2,
              height: 55,
              displayValue: false,
              margin: 6
            });
          });

          setTimeout(function () {
            window.focus();
            window.print();
          }, 600);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function gerarCodigosLivres(prefixo = "C", inicio = 1, quantidade = 60) {
  return Array.from({ length: quantidade }, (_, index) => {
    const numero = String(inicio + index).padStart(3, "0");
    return prefixo + numero;
  });
}

function imprimirFolhaCodigosA4(codigos) {
  if (!Array.isArray(codigos) || !codigos.length) {
    alert("Nenhum codigo informado para impressao.");
    return;
  }

  const codigosLimpos = codigos
    .map(codigo => normalizarCodigoBusca(codigo))
    .filter(Boolean);

  if (!codigosLimpos.length) {
    alert("Nenhum codigo valido para impressao.");
    return;
  }

  const janela = window.open("", "_blank", "width=1000,height=800");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups.");
    return;
  }

  const etiquetas = codigosLimpos.map((codigo, index) => `
    <div class="etiqueta">
      <svg id="barcode-${index}"></svg>
      <div class="codigo">${escapeHtml(codigo)}</div>
    </div>
  `).join("");

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Folha de Codigos LUCIMAR</title>

      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>

      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .pagina {
          width: 190mm;
          min-height: 277mm;
          display: grid;
          grid-template-columns: repeat(3, 58mm);
          gap: 5mm 5mm;
          align-content: start;
        }

        .etiqueta {
          width: 58mm;
          height: 25mm;
          border: 1px dashed #999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2.5mm;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .etiqueta svg {
          width: 50mm;
          height: 14mm;
          display: block;
        }

        .codigo {
          margin-top: 1mm;
          font-family: "Courier New", monospace;
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 1px;
        }

        @media print {
          .etiqueta {
            border: 1px dashed #ccc;
          }
        }
      </style>
    </head>

    <body>
      <main class="pagina">
        ${etiquetas}
      </main>

      <script>
        const codigos = ${JSON.stringify(codigosLimpos)};

        window.onload = function () {
          codigos.forEach(function (codigo, index) {
            JsBarcode("#barcode-" + index, codigo, {
              format: "CODE128",
              lineColor: "#000",
              background: "#fff",
              width: 2,
              height: 55,
              displayValue: false,
              margin: 6
            });
          });

          setTimeout(function () {
            window.focus();
            window.print();
          }, 600);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function escposBarcodeCode128(codigo) {
  const texto = String(codigo || "").trim();

  if (!texto) {
    throw new Error("Codigo vazio.");
  }

  const encoder = new TextEncoder();
  const ESC = "\x1B";
  const GS = "\x1D";
  const conteudo = "{B" + texto;
  const bytesConteudo = encoder.encode(conteudo);
  const comandos = [];

  function addString(str) {
    comandos.push(...Array.from(encoder.encode(str)));
  }

  function addBytes(bytes) {
    comandos.push(...Array.from(bytes));
  }

  addString(ESC + "@");
  addString(ESC + "a" + "\x01");
  addString(GS + "h" + String.fromCharCode(80));
  addString(GS + "w" + String.fromCharCode(2));
  addString(GS + "H" + "\x00");
  addString(GS + "k" + String.fromCharCode(73));
  addString(String.fromCharCode(bytesConteudo.length));
  addBytes(bytesConteudo);
  addString("\n");
  addString(texto + "\n");
  addString("\n\n\n\n");

  return new Uint8Array(comandos);
}

function escposBarcodeCode39(codigo) {
  let texto = String(codigo || "").trim();

  if (!texto) {
    throw new Error("Codigo vazio.");
  }

  texto = texto
    .toUpperCase()
    .replace(/[^A-Z0-9\-. $/+%]/g, "");

  const encoder = new TextEncoder();
  const ESC = "\x1B";
  const GS = "\x1D";
  const comandos = [];

  function addString(str) {
    comandos.push(...Array.from(encoder.encode(str)));
  }

  addString(ESC + "@");
  addString(ESC + "a" + "\x01");
  addString(GS + "h" + String.fromCharCode(80));
  addString(GS + "w" + String.fromCharCode(2));
  addString(GS + "H" + "\x00");
  addString(GS + "k" + "\x04");
  addString(texto);
  addString("\x00");
  addString("\n");
  addString(texto + "\n");
  addString("\n\n\n\n");

  return new Uint8Array(comandos);
}

function escolherImpressoraTermica(impressoras) {
  let nomeImpressora = localStorage.getItem(IMPRESSORA_KEY);

  if (!nomeImpressora || !impressoras.includes(nomeImpressora)) {
    nomeImpressora =
      impressoras.find(nome => nome.toLowerCase().includes("58")) ||
      impressoras.find(nome => nome.toLowerCase().includes("thermal")) ||
      impressoras.find(nome => nome.toLowerCase().includes("pos")) ||
      impressoras[0];

    if (nomeImpressora) {
      localStorage.setItem(IMPRESSORA_KEY, nomeImpressora);
    }
  }

  return nomeImpressora;
}

async function imprimirCodigoBarrasQZ(codigo) {
  try {
    if (!codigo) {
      alert("Codigo nao informado.");
      return;
    }

    if (!window.qz) {
      alert("QZ Tray nao encontrado. Abra o QZ Tray para imprimir etiqueta com codigo de barras.");
      return;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const impressoras = await qz.printers.find();
    const nomeImpressora = escolherImpressoraTermica(impressoras);

    if (!nomeImpressora) {
      alert("Nenhuma impressora encontrada pelo QZ Tray.");
      return;
    }

    const bytes = escposBarcodeCode128(codigo);
    const config = qz.configs.create(nomeImpressora);
    const dados = [
      {
        type: "raw",
        format: "command",
        flavor: "bytes",
        data: Array.from(bytes)
      }
    ];

    await qz.print(config, dados);
    console.log("Etiqueta enviada via QZ/ESC-POS:", {
      impressora: nomeImpressora,
      codigo
    });
  } catch (erro) {
    console.error("Erro ao imprimir etiqueta via QZ/ESC-POS:", erro);

    const tentarCode39 = confirm(
      "Nao foi possivel imprimir CODE128. Deseja tentar CODE39?"
    );

    if (tentarCode39) {
      await imprimirCodigoBarrasCode39QZ(codigo);
    }
  }
}

async function imprimirCodigoBarrasCode39QZ(codigo) {
  try {
    if (!window.qz) {
      alert("QZ Tray nao encontrado.");
      return;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const impressoras = await qz.printers.find();
    const nomeImpressora = escolherImpressoraTermica(impressoras);

    if (!nomeImpressora) {
      alert("Nenhuma impressora encontrada pelo QZ Tray.");
      return;
    }

    const bytes = escposBarcodeCode39(codigo);
    const config = qz.configs.create(nomeImpressora);
    const dados = [
      {
        type: "raw",
        format: "command",
        flavor: "bytes",
        data: Array.from(bytes)
      }
    ];

    await qz.print(config, dados);
    console.log("Etiqueta CODE39 enviada via QZ/ESC-POS:", {
      impressora: nomeImpressora,
      codigo
    });
  } catch (erro) {
    console.error("Erro ao imprimir CODE39 via QZ:", erro);
    alert("Nao foi possivel imprimir a etiqueta via QZ Tray. Verifique a impressora e tente novamente.");
  }
}

function imprimirCodigoBarrasNavegador(codigo) {
  if (!codigo) {
    alert("Codigo nao informado.");
    return;
  }

  const barcodePng = gerarCodigoBarrasPng(codigo);

  const janela = window.open("", "_blank", "width=420,height=320");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups para este sistema.");
    return;
  }

  const codigoSeguro = escapeHtml(codigo);

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta Codigo</title>
      <style>
        @page {
          size: 58mm 40mm;
          margin: 2mm;
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 54mm;
          height: 36mm;
          background: #FFFFFF;
          color: #000000;
          overflow: hidden;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .etiqueta {
          width: 54mm;
          height: 36mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2mm 1mm 1mm;
          background: #FFFFFF;
        }

        .barcode-img {
          display: block;
          width: 48mm;
          max-width: 48mm;
          height: 18mm;
          object-fit: contain;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          filter: contrast(200%) brightness(0.9);
        }

        .codigo-texto {
          margin-top: 1.5mm;
          font-family: "Courier New", Courier, monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.8px;
          line-height: 1.1;
          white-space: nowrap;
          color: #000000;
        }

        .fallback {
          padding: 3mm;
          border: 1px solid #000;
          font-family: "Courier New", Courier, monospace;
          font-size: 16px;
          font-weight: 700;
          color: #000;
          background: #fff;
        }

        @media print {
          html, body {
            width: 54mm;
            height: 36mm;
            background: #FFFFFF;
          }

          .etiqueta {
            background: #FFFFFF;
          }
        }
      </style>
    </head>
    <body>
      <div class="etiqueta">
        ${
          barcodePng
            ? `<img class="barcode-img" src="${barcodePng}" alt="Codigo de barras">`
            : `<div class="fallback">${codigoSeguro}</div>`
        }
        <div class="codigo-texto">${codigoSeguro}</div>
      </div>

      <script>
        window.onload = function () {
          window.focus();
          setTimeout(function () {
            window.print();
          }, 800);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function testarEtiquetaCodigo() {
  imprimirCodigoBarrasQZ("CORA-008");
}

function testarEtiquetaCode39() {
  imprimirCodigoBarrasCode39QZ("CORA-008");
}

function imprimirEtiquetasFonteLibreBarcode() {
  const itens = carregarEstoque().filter(item => String(item.codigo || "").trim());

  if (!itens.length) {
    alert("Nenhum item com codigo encontrado para imprimir.");
    return;
  }

  const janela = window.open("", "_blank", "width=900,height=700");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressao. Permita pop-ups para este sistema.");
    return;
  }

  const etiquetas = itens.map(item => {
    const codigo = String(item.codigo || "").trim();
    const codigoSeguro = escapeHtml(codigo);

    return `
      <section class="etiqueta">
        <div class="barcode-font">${codigoSeguro}</div>
        <div class="codigo-texto">${codigoSeguro}</div>
      </section>
    `;
  }).join("");

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiquetas Libre Barcode 128</title>
      <style>
        @page {
          size: 58mm 32mm;
          margin: 2mm;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
        }

        .etiqueta {
          width: 54mm;
          height: 28mm;
          page-break-after: always;
          break-after: page;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          overflow: hidden;
          background: #fff;
        }

        .barcode-font {
          width: 52mm;
          max-width: 52mm;
          overflow: hidden;
          color: #000;
          background: #fff;
          font-family: "Libre Barcode 128", "Libre Barcode 128 Text", monospace;
          font-size: 48px;
          font-weight: 400;
          line-height: 0.9;
          white-space: nowrap;
          transform: scaleX(1.08);
          transform-origin: center;
        }

        .codigo-texto {
          margin-top: 1mm;
          color: #000;
          font-family: "Courier New", Courier, monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.8px;
          line-height: 1;
          white-space: nowrap;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      ${etiquetas}
      <script>
        window.onload = function () {
          window.focus();
          setTimeout(function () {
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

function mostrarOuImprimirEtiqueta(texto, codigo = "") {
  const preview = $("#previewEtiqueta");

  if (preview) {
    preview.textContent = texto;
  }

  const imprimir = confirm("Etiqueta gerada. Deseja imprimir agora?");
  if (imprimir) imprimirTextoTermico(texto, codigo);
}

/* ==========================================================
   IMPRESSÃO TÉRMICA
   ========================================================== */

async function imprimirEtiquetaItem(item, opcoes = {}) {
  await imprimirEtiquetaCodigo(item, opcoes);
}

function carregarConfigEtiquetaTermica() {
  const padrao = {
    larguraLinha: 30,
    fontSize: 10,
    lineHeight: 1.6,
    avancoFinal: 7
  };

  try {
    return {
      ...padrao,
      ...JSON.parse(localStorage.getItem(CONFIG_ETIQUETA_KEY) || "{}")
    };
  } catch {
    return padrao;
  }
}

function quebrarLinhaEtiqueta(texto, largura = 30) {
  return String(texto || "")
    .split("\n")
    .map(linha => {
      if (linha.length <= largura) return linha;

      const palavras = linha.split(" ");
      const linhas = [];
      let atual = "";

      palavras.forEach(palavra => {
        if ((atual + " " + palavra).trim().length > largura) {
          if (atual) linhas.push(atual);
          atual = palavra;
        } else {
          atual = (atual + " " + palavra).trim();
        }
      });

      if (atual) linhas.push(atual);

      return linhas.join("\n");
    })
    .join("\n");
}

function prepararTextoParaTermica(texto) {
  const config = carregarConfigEtiquetaTermica();
  const quebrado = quebrarLinhaEtiqueta(texto, config.larguraLinha);
  return quebrado + "\n".repeat(config.avancoFinal);
}

async function imprimirTextoTermico(texto, codigo = "") {
  const textoPreparado = prepararTextoParaTermica(anexarCodigoTextoEtiqueta(texto, codigo));

  try {
    if (!window.qz) {
      const usarNavegador = confirm("QZ Tray não encontrado. Deseja imprimir pelo navegador?");
      if (usarNavegador) imprimirViaNavegador(textoPreparado, codigo);
      return;
    }

    // QZ Tray RAW imprime texto. O codigo de barras grafico fica mais facil pelo navegador.
    const usarNavegadorComCodigo = confirm(
      "Deseja imprimir codigo de barras visual pelo navegador?"
    );

    if (usarNavegadorComCodigo) {
      imprimirViaNavegador(textoPreparado, codigo);
      return;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const impressoras = await qz.printers.find();

    let nomeImpressora = localStorage.getItem(IMPRESSORA_KEY);

    if (!nomeImpressora || !impressoras.includes(nomeImpressora)) {
      nomeImpressora =
        impressoras.find(nome => nome.toLowerCase().includes("58")) ||
        impressoras.find(nome => nome.toLowerCase().includes("thermal")) ||
        impressoras.find(nome => nome.toLowerCase().includes("pos")) ||
        impressoras[0];

      if (nomeImpressora) {
        localStorage.setItem(IMPRESSORA_KEY, nomeImpressora);
      }
    }

    if (!nomeImpressora) {
      const usarNavegador = confirm("Nenhuma impressora encontrada. Deseja imprimir pelo navegador?");
      if (usarNavegador) imprimirViaNavegador(textoPreparado, codigo);
      return;
    }

    const config = qz.configs.create(nomeImpressora);
    const dados = [
      {
        type: "raw",
        format: "plain",
        data: textoPreparado + "\n\n\n"
      }
    ];

    await qz.print(config, dados);
  } catch (erro) {
    console.error("Erro ao imprimir:", erro);

    const usarNavegador = confirm(
      "Não foi possível imprimir pela impressora térmica. Deseja imprimir pelo navegador?"
    );

    if (usarNavegador) imprimirViaNavegador(textoPreparado, codigo);
  }
}

function imprimirViaNavegador(texto, codigo = "") {
  const config = carregarConfigEtiquetaTermica();
  const janela = window.open("", "_blank", "width=420,height=640");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups.");
    return;
  }

  const textoComCodigo = anexarCodigoTextoEtiqueta(texto, codigo);
  const barcodePng = gerarCodigoBarrasPng(codigo);

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 3mm;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
        }

        body {
          width: 52mm;
          font-family: "Courier New", Courier, monospace;
          font-size: ${Number(config.fontSize || 10)}px;
          line-height: ${Number(config.lineHeight || 1.6)};
        }

        .etiqueta {
          width: 52mm;
          padding: 2mm;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        pre {
          margin: 0;
          padding: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          font-family: "Courier New", Courier, monospace;
          font-size: ${Number(config.fontSize || 10)}px;
          line-height: ${Number(config.lineHeight || 1.6)};
        }

        .barcode {
          margin-top: 8px;
          text-align: center;
          width: 100%;
        }

        .barcode-img {
          display: block;
          max-width: 100%;
          height: auto;
          image-rendering: pixelated;
        }
      </style>
    </head>
    <body>
      <div class="etiqueta">
        <pre>${escaparHtml(textoComCodigo)}</pre>

        ${
          barcodePng
            ? `<div class="barcode"><img class="barcode-img" src="${barcodePng}" alt="Codigo de barras"></div>`
            : ""
        }
      </div>

      <script>
        window.onload = function () {
          window.focus();
          setTimeout(function () {
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `);

  janela.document.close();
}

async function configurarImpressoraTermica() {
  try {
    if (!window.qz) {
      alert("QZ Tray não encontrado.");
      return;
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const impressoras = await qz.printers.find();

    if (!impressoras.length) {
      alert("Nenhuma impressora encontrada.");
      return;
    }

    const lista = impressoras.map((nome, i) => `${i + 1} - ${nome}`).join("\n");
    const escolha = prompt("Escolha a impressora:\n\n" + lista);
    const indice = Number(escolha) - 1;

    if (!impressoras[indice]) {
      alert("Escolha inválida.");
      return;
    }

    localStorage.setItem(IMPRESSORA_KEY, impressoras[indice]);
    alert("Impressora configurada: " + impressoras[indice]);

  } catch (erro) {
    console.error("Erro ao configurar impressora:", erro);
    alert("Erro ao configurar impressora. Verifique o QZ Tray.");
  }
}

async function testeImpressaoSimples() {
  await imprimirTextoTermico("LUCIMAR\nTESTE QZ\n123456");
}

/* ==========================================================
   EXPORTAÇÃO / IMPORTAÇÃO JSON
   ========================================================== */

function exportarJSON() {
  const dados = carregarEstoque();
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: "application/json"
  });

  baixarBlob(blob, `estoque_lucimar_${dataArquivo()}.json`);
}

function importarJSONArquivo(arquivo) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!Array.isArray(dados)) throw new Error("JSON não é uma lista.");

      const atuais = carregarEstoque();
      const codigosAtuais = new Set(atuais.map(i => i.codigo));

      const novos = dados
        .map(normalizarItem)
        .filter(item => item.codigo && !codigosAtuais.has(item.codigo));

      salvarEstoque([...atuais, ...novos]);

      alert(`${novos.length} registros importados.`);
      location.reload();

    } catch (erro) {
      console.error("Erro ao importar JSON:", erro);
      alert("Erro ao importar JSON.");
    }
  };

  reader.readAsText(arquivo);
}

/* ==========================================================
   EXPORTAÇÃO CSV
   ========================================================== */

function exportarCSV() {
  const itens = carregarEstoque();

  const headers = [
    "tipoRegistro",
    "codigo",
    "codigoLeitura",
    "precoVenda",
    "nome",
    "descricao",
    "categoria",
    "status",
    "etapa",
    "quantidade",
    "unidade",
    "preco",
    "custo",
    "lote",
    "responsavel",
    "colaboradores",
    "origemMaterial",
    "destinoPrevisto",
    "composicaoTextil",
    "tamanhoProduto",
    "paisOrigem",
    "cuidadoLavagem",
    "cuidadoAlvejamento",
    "cuidadoSecagem",
    "cuidadoPassadoria",
    "cuidadoProfissional",
    "observacaoEtiqueta",
    "observacoesInternas",
    "fotoLocal",
    "fotoUrl",
    "pastaFotoSugerida",
    "dataRegistro",
    "dataAtualizacao",
    "historicoJson",
    "sincronizado"
  ];

  const linhas = [
    headers.join(";"),
    ...itens.map(item => headers.map(header => {
      let valor = header === "historicoJson"
        ? JSON.stringify(item.historico || [])
        : item[header];

      if (Array.isArray(valor)) valor = valor.join(", ");

      return csvEscape(valor);
    }).join(";"))
  ];

  const blob = new Blob([linhas.join("\n")], {
    type: "text/csv;charset=utf-8"
  });

  baixarBlob(blob, `estoque_lucimar_${dataArquivo()}.csv`);
}

function csvEscape(valor) {
  const texto = String(valor ?? "");
  if (/[;"\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = nomeArquivo;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataArquivo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad3(d.getMonth() + 1).slice(-2);
  const dd = pad3(d.getDate()).slice(-2);
  const hh = pad3(d.getHours()).slice(-2);
  const mi = pad3(d.getMinutes()).slice(-2);

  return `${yyyy}-${mm}-${dd}_${hh}${mi}`;
}

/* ==========================================================
   BOTÕES GERAIS
   ========================================================== */

function configurarBotoesGlobais() {
  $("#exportarJson")?.addEventListener("click", exportarJSON);
  $("#exportarJSON")?.addEventListener("click", exportarJSON);
  $("#exportarJsonBtn")?.addEventListener("click", exportarJSON);

  $("#exportarCsv")?.addEventListener("click", exportarCSV);
  $("#exportarCSV")?.addEventListener("click", exportarCSV);

  $("#gerarFolhaCodigosA4")?.addEventListener("click", () => {
    const codigos = gerarCodigosLivres("C", 1, 60);
    imprimirFolhaCodigosA4(codigos);
  });

  $("#imprimirFolhaEtiquetas")?.addEventListener("click", () => {
    const estoque = carregarEstoque();
    const base = Array.isArray(window.itensFiltradosDashboard)
      ? window.itensFiltradosDashboard
      : estoque;

    const mercadorias = base.filter(item => {
      const tipo = String(item.tipoRegistro || "").toLowerCase();
      return tipo === "mercadoria" || tipo === "produto";
    });

    imprimirFolhaEtiquetasA4(mercadorias);
  });

  $("#configurarImpressora")?.addEventListener("click", configurarImpressoraTermica);
  $("#configurarImpressoraTermica")?.addEventListener("click", configurarImpressoraTermica);

  $("#testeImpressaoSimples")?.addEventListener("click", testeImpressaoSimples);
  $("#testeCodigoBarras")?.addEventListener("click", testarEtiquetaCodigo);
  $("#testeCodigoBarrasCode39")?.addEventListener("click", testarEtiquetaCode39);
  $("#imprimirEtiquetasFonte")?.addEventListener("click", imprimirEtiquetasFonteLibreBarcode);

  $("#testarConexaoSheets")?.addEventListener("click", async () => {
    try {
      const resposta = await fetch(URL_WEB_APP + "?action=listar");
      const texto = await resposta.text();
      console.log("Resposta Google Sheets:", texto);
      alert("Conexao testada. Veja o console.");
    } catch (erro) {
      console.error("Erro ao testar Google Sheets:", erro);
      alert("Falha ao conectar com Google Sheets.");
    }
  });

  $("#importarJson")?.addEventListener("change", event => {
    const arquivo = event.target.files?.[0];
    if (arquivo) importarJSONArquivo(arquivo);
  });

  $("#importarJSON")?.addEventListener("change", event => {
    const arquivo = event.target.files?.[0];
    if (arquivo) importarJSONArquivo(arquivo);
  });

  $("#importarJsonInput")?.addEventListener("change", event => {
    const arquivo = event.target.files?.[0];
    if (arquivo) importarJSONArquivo(arquivo);
  });

  $("#importarJsonBtn")?.addEventListener("click", () => {
    $("#importarJsonInput")?.click();
  });

  $("#abrirMercadorias")?.addEventListener("click", () => {
    window.location.href = "./registrar.html?tipo=mercadoria";
  });

  $("#abrirMateriais")?.addEventListener("click", () => {
    window.location.href = "./registrar.html?tipo=material";
  });
}

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  configurarTipoPorUrl();
  configurarFormularioCadastro();
  configurarDashboard();
  configurarOperacao();
  configurarBotoesGlobais();

  console.log("LUCIMAR — Estoque de Confecção carregado.");
});

/* ==========================================================
   FUNÇÕES EXPOSTAS PARA TESTE NO CONSOLE
   ========================================================== */

window.lucimarEstoque = {
  carregarEstoque,
  salvarEstoque,
  buscarItemPorCodigo,
  buscarItemPorCodigoLeitura,
  atribuirCodigoLeitura,
  enviarItemParaGoogleSheets,
  sincronizarItensComGoogleSheets,
  marcarItemSincronizado,
  normalizarCodigoBusca,
  normalizarPrecoVenda,
  formatarMoedaBR,
  abrirEdicaoItem,
  salvarItemEditado,
  gerarCodigoLeitura,
  gerarCodigosLivres,
  obterCodigoEtiqueta,
  gerarItensPorQuantidade,
  gerarCodigoUnico,
  imprimirEtiquetaA4,
  imprimirFolhaEtiquetasA4,
  imprimirFolhaCodigosA4,
  imprimirEtiquetaItem,
  imprimirEtiquetaCodigo,
  imprimirCodigoBarrasQZ,
  imprimirCodigoBarrasCode39QZ,
  imprimirCodigoBarrasNavegador,
  montarEtiquetaCodigo,
  escposBarcodeCode128,
  escposBarcodeCode39,
  gerarCodigoBarrasPng,
  testarEtiquetaCodigo,
  testarEtiquetaCode39,
  imprimirEtiquetasFonteLibreBarcode,
  exportarJSON,
  exportarCSV,
  configurarImpressoraTermica,
  testeImpressaoSimples
};
