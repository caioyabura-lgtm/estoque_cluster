/*
  LUCIMAR - complemento para o Apps Script

  Cole/adapte este trecho no projeto do Apps Script que atende a URL_WEB_APP.
  Ele pressupoe que estas constantes ja existam no Apps Script:

  const FOLDER_MATERIAIS_ID = "...";
  const FOLDER_MERCADORIAS_ID = "...";

  A funcao criarItem(data) abaixo mostra o ponto essencial: salvar a foto no
  Drive antes de gravar a linha, preencher item.fotoUrl e retornar fotoUrl.
*/

function salvarFotoSeExistir(data) {
  const foto = data.foto || data.fotoBase64 || "";

  if (!foto || typeof foto !== "string" || !foto.startsWith("data:image")) {
    return "";
  }

  const match = foto.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return "";
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extensao = extensaoPorMimeType(mimeType);
  const tipoRegistro = String(data.tipoRegistro || "item").toLowerCase();
  const codigo = String(data.codigo || "sem-codigo").replace(/[^\w.-]+/g, "-");
  const nomeArquivo = `${tipoRegistro || "item"}_${codigo}_${Date.now()}.${extensao}`;
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, nomeArquivo);
  const pastaId = tipoRegistro === "material"
    ? FOLDER_MATERIAIS_ID
    : FOLDER_MERCADORIAS_ID;
  const arquivo = DriveApp.getFolderById(pastaId).createFile(blob);

  return arquivo.getUrl();
}

function extensaoPorMimeType(mimeType) {
  const mapa = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  return mapa[mimeType] || "jpg";
}

function criarItem(data) {
  const fotoUrl = salvarFotoSeExistir(data);
  const item = {
    ...data,
    fotoUrl: fotoUrl || data.fotoUrl || ""
  };

  /*
    Grave item na planilha aqui, usando a mesma rotina atual do seu Apps Script.
    Importante: a coluna fotoUrl deve receber item.fotoUrl.
    Evite gravar item.foto e item.fotoBase64 como colunas, para nao encher a
    planilha com a imagem em base64.
  */

  return {
    ok: true,
    action: "criar",
    item,
    fotoUrl: item.fotoUrl
  };
}
