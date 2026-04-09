# Changelog

Todas as mudanças notáveis do módulo são documentadas aqui.

---

## [0.1.4] — 2026-04-09

### Adicionado

- **Configuração persistente de Testes Opostos** — as regras de testes opostos (Enganação, Furtividade, Intimidação) agora são configuráveis pelo GM via Settings → "Configurar" ao lado de "Testes Opostos". A janela CRUD permite adicionar, editar e excluir regras. Cada regra define triggers de chat, perícia de ataque, modo (`auto`/`fixed`/`choice`) e perícias de defesa. As configurações persistem como world setting entre sessões e há botão "Restaurar Padrão" para voltar às 3 regras originais.

---

## [0.1.3] — 2026-04-09

### Adicionado

- **Nat 1 é falha automática nos testes opostos** — tanto o atacante quanto o defensor tirar 1 natural no d20 resulta em falha imediata, independente de bônus ou do valor total do oponente. A regra tem precedência sobre nat 20.

- **Resize no dialog de testes opostos** — o dialog de seleção de atores agora tem o handle de redimensionamento padrão do Foundry.

### Corrigido

- **Clique em nomes de atores no chat não abre mais a ficha** — links de token no chat (`.t20-contest-token` e `.t20-perc-token`) agora apenas fazem pan e selecionam o token, sem abrir a ficha do ator.
- **Cálculo de deslocamento no Mapa de Viagem** — `movement.walk` é um objeto `{ base, bonus[], value }` no sistema T20; o módulo agora lê `.value` (com modificadores) ou `.base` como fallback, em vez de tentar ler o campo como número simples.
- **Duplicidade no card do Sortudo** — o nome da perícia aparecia duas vezes no card de reroll (no flavor e no header do card). O header foi removido, mantendo apenas o flavor "Perícia (Sortudo)".
- **Duplicidade no cabeçalho dos testes opostos** — o flavor da mensagem de chat ("Furtividade de X vs Percepção") aparecia junto com o header do card ("🔍 Percepção vs Furtividade"). O flavor redundante foi removido.

### Visual

- **Tabela de testes opostos adaptada ao card do sistema** — o template `result-table.hbs` agora usa a estrutura `.tormenta20.chat-card.item-card` com `.card-header.flexrow`, integrando visualmente com os demais cards do sistema Tormenta20.
- **Fonte da tabela de resultados reduzida** — de `0.9em` para `0.78em` com `white-space: nowrap` nos cabeçalhos, evitando quebra de linha nas colunas "Percepção" e "Resultado".

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
