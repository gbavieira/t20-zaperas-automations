# Changelog

Todas as mudanças notáveis do módulo são documentadas aqui.

---

## [0.1.2] — 2026-04-08

### Adicionado

- **Prompt de recarga ao alterar configurações** — ao ativar ou desativar qualquer automação nas configurações do módulo, o Foundry agora pergunta se o usuário deseja recarregar a página para aplicar as mudanças (`requiresReload: true`).

### Alterado

- **Templates HTML migrados para Handlebars** — todo o HTML gerado pelos handlers foi extraído de template literals JavaScript para arquivos `.hbs` dedicados em `templates/`. Os arquivos `.mjs` agora apenas preparam os dados e chamam `renderTemplate()`, seguindo o padrão nativo do Foundry.

---

## [0.1.1] — inicial

Versão de lançamento inicial com as automações:

- Testes de Resistência Automáticos
- Testes Opostos (Enganação, Furtividade, Intimidação)
- Verificador de Defesa
- Dreno de Vida
- Contador de Magia Sustentada
- Condições em 0 PV
- Poder Sortudo
- Mapa de Viagem Interativo
