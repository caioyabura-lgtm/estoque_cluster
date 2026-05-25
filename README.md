# LUCIMAR - Sistema de Estoque

Sistema web simples para organizacao de estoque, mercadorias, materiais, etiquetas e codigos de barras.

Este projeto esta em desenvolvimento e foi pensado para uso local no navegador, com possibilidade de evoluir futuramente para integracoes com Google Drive, Google Sheets, Apps Script e GitHub Pages.

## Objetivo do sistema

O objetivo do sistema e facilitar o controle basico de estoque, permitindo registrar, consultar e identificar itens de forma mais organizada.

A ideia principal e reduzir retrabalho, centralizar informacoes importantes e criar uma base simples para futuras melhorias, como controle de clientes, orcamentos, backups e sincronizacao com planilhas.

## Funcionalidades principais

Funcionalidades atuais:

- Tela inicial com acesso para registro, estoque e operacao/leitura.
- Organizacao de itens de estoque.
- Consulta de materiais e mercadorias cadastradas.
- Identificacao de itens por codigos de barras.
- Visualizacao ou impressao de etiquetas, conforme suporte do navegador e da impressora.
- Uso local em navegador, sem necessidade inicial de servidor.

Funcionalidades planejadas:

- Controle mais completo de clientes.
- Criacao e acompanhamento de orcamentos.
- Integracao com Google Sheets para armazenamento ou sincronizacao de dados.
- Uso do Google Drive para backups e arquivos de apoio.
- Uso de Apps Script para automatizar fluxos com planilhas e arquivos.
- Publicacao como site estatico no GitHub Pages.

## Estrutura de pastas sugerida

Estrutura recomendada para manter o projeto organizado:

```text
projeto-estoque/
|-- index.html
|-- registrar.html
|-- dashboard.html
|-- operacao.html
|-- script.js
|-- README.md
|-- assets/
|   |-- imagens/
|   `-- icones/
|-- dados/
|   `-- exemplos/
`-- docs/
    `-- planejamento/
```

Observacao: esta e uma estrutura sugerida. Nem todas as pastas precisam existir desde o inicio.

## Como rodar localmente no VS Code com Live Server

1. Abra a pasta do projeto no VS Code.
2. Instale a extensao **Live Server**, caso ainda nao esteja instalada.
3. Abra o arquivo `index.html`.
4. Clique com o botao direito no arquivo e escolha **Open with Live Server**.
5. O sistema sera aberto no navegador em um endereco local, geralmente parecido com:

```text
http://127.0.0.1:5500/
```

Depois disso, use os botoes da tela inicial para acessar as paginas de registro, estoque e operacao/leitura.

## Como publicar no GitHub Pages

A publicacao no GitHub Pages esta planejada para uma etapa futura.

Antes de publicar, revise todos os arquivos do projeto e remova qualquer dado privado ou sensivel.

Passos gerais:

1. Criar um repositorio no GitHub.
2. Enviar os arquivos do projeto para o repositorio.
3. No GitHub, acessar **Settings**.
4. Entrar em **Pages**.
5. Em **Build and deployment**, selecionar a branch principal, normalmente `main`.
6. Selecionar a pasta raiz do projeto como origem da publicacao.
7. Salvar a configuracao.

Depois de alguns instantes, o GitHub Pages gera um link publico para acessar o sistema.

## Como Google Drive e Google Sheets entram no fluxo

Essas integracoes estao planejadas e ainda nao devem ser consideradas parte obrigatoria do funcionamento atual.

Fluxo planejado com Google Drive:

- Guardar backups de arquivos importantes.
- Armazenar documentos de apoio.
- Organizar arquivos em pastas com permissoes controladas.

Fluxo planejado com Google Sheets:

- Usar planilhas como uma base de dados simples.
- Registrar itens, movimentacoes, clientes e orcamentos.
- Facilitar conferencia, importacao, exportacao e backup dos dados.

Fluxo planejado com Apps Script:

- Conectar o sistema com planilhas do Google.
- Automatizar gravacao e leitura de dados.
- Criar rotinas de backup e sincronizacao.
- Preparar integracoes sem depender inicialmente de um servidor proprio.

## Cuidados para um repositorio publico

Este projeto pode ser publicado no GitHub, mas o repositorio publico nao deve conter dados reais ou informacoes sensiveis.

Nao publicar:

- Dados reais de clientes.
- Dados reais de fornecedores.
- Orcamentos reais.
- Planilhas com informacoes internas.
- Chaves de API, tokens, senhas ou credenciais.
- Links privados do Google Drive ou Google Sheets.
- Arquivos de backup com dados de producao.
- Documentos pessoais, fiscais ou comerciais.

Tambem e recomendado revisar se informacoes como CNPJ, endereco, telefone, e-mail ou identificadores internos devem aparecer no codigo publico. Se forem necessarias apenas para uso interno, mantenha esses dados fora do repositorio publico.

## Boas praticas de seguranca

- Use somente dados ficticios em exemplos.
- Separe arquivos reais de arquivos de demonstracao.
- Configure corretamente as permissoes de compartilhamento no Google Drive e Google Sheets.
- Nunca deixe uma planilha sensivel com acesso publico por link.
- Evite colocar configuracoes privadas diretamente em arquivos HTML, CSS ou JavaScript.
- Antes de publicar, revise o historico de commits para garantir que dados sensiveis nao foram enviados anteriormente.

## Proximos passos do projeto

- Organizar os arquivos em pastas conforme o crescimento do sistema.
- Revisar o cadastro de mercadorias e materiais.
- Melhorar o fluxo de etiquetas e codigos de barras.
- Definir o modelo de dados para estoque, clientes e orcamentos.
- Criar arquivos de exemplo sem dados sensiveis.
- Planejar a integracao com Google Sheets.
- Planejar backups no Google Drive.
- Preparar o repositorio para publicacao no GitHub Pages.
- Documentar decisoes importantes na pasta `docs/`, quando ela for criada.
