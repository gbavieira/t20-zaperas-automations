# Changelog

Todas as mudanças notáveis do módulo são documentadas aqui.

---

## [0.1.5] — 2026-04-14

### Adicionado

- **Configuração persistente de Dreno de Vida** — magias e poderes que ativam o Dreno de Vida agora são configuráveis pelo GM via Settings → "Configurar" ao lado de "Dreno de Vida". A janela CRUD permite adicionar, editar e remover magias/poderes. Para cada entrada, o GM configura o nome (via drag-drop de item do tipo magia ou poder), percentual de cura (0–100), e se concede PV temporário ou cura normal. As configurações persistem entre sessões com botão "Restaurar Padrão".

- **Configuração de atores para Travel Ruler** — o cálculo de "menor deslocamento" no Mapa de Viagem agora permite escolher quais atores (personagens de jogador) devem ser considerados. Novo sistema CRUD em Settings → "Mapa de Viagem Interativo" → "Configurar". Arraste personagens via drag-drop para adicioná-los à lista. Se nenhum ator estiver configurado, o sistema usa automaticamente todos os PCs (fallback inteligente).

### Corrigido

- **Macro Relógio de Tibares — cálculo de desconto por período** — os descontos eram multiplicados incorretamente quando o período era "mês", resultando em 30× o custo esperado. Agora usa o valor correto do período selecionado (mensal ou diário) para cada ator individualmente.

- **Verificador de Defesa — sobreposição visual** — o banner de resultado (acertou/errou) estava sendo renderizado dentro do bloco de rolagem de dados, ficando sobreposto ao dado de dano. Agora é inserido corretamente abaixo do bloco de rolagem completo.

- **Verificador de Defesa — regras críticas** — implementadas regras de crítico e falha crítica: Nat 20 agora é acerto automático e Nat 1 é falha automática, independente da defesa do alvo.

### Alterado

- **Dreno de Vida agora aceita poderes além de magias** — o sistema detecta tanto itens do tipo `magia` quanto `poder` ao processar ataques com efeito de drenagem.

- **PV Temporário como alternativa de cura no Dreno de Vida** — cada magia/poder configurado pode conceder PV temporário (aditivo) em vez de curar PV normal, permitindo poder à prova de dano sem inflar os pontos de vida máximos.

### Removido

- **Campo "Efeito Sequencer" removido da configuração de Dreno de Vida** — integração com animações JB2A foi descontinuada. Foco da feature é apenas na mecânica de cura/dano.

---

## [0.1.4] — 2026-04-12

### Corrigido

- **Botão "Configurar Testes Opostos" não funcionava** — o botão não aparecia ou não abria a janela de configuração. Problema era um `await import()` dinâmico dentro do hook `init` (que não é awaited pelo Foundry), causando timing incorreto. Convertido para static import no topo do arquivo.

### Alterado

- **ID de regras agora é derivado automaticamente** — em vez de digitar manualmente o ID ao criar uma regra, o sistema deriva automaticamente do campo "Perícia de Ataque" (sempre 4 letras: `"enga"` de Enganação, `"furt"` de Furtividade, etc.). O campo ID foi removido do editor de regras.

- **Emojis removidos de toda a automação** — os emojis (`🎭`, `🔍`, `😤`) que apareciam nas regras padrão e nos headers das tabelas de chat foram removidos. O campo "Emoji" foi excluído do editor de regras, dos dados padrão e das mensagens de chat.

### Visual

- **Interface de seleção de perícias de defesa redesenhada** — removido o scroll vertical (max-height com overflow); agora exibe **todas** as perícias em uma grid de 2 colunas fixas. A janela de edição ajusta o tamanho automaticamente para mostrar tudo sem sobrecarga.

- **Comportamento inteligente de checkboxes** — nos modos `auto` e `fixed`, ao marcar 1 perícia de defesa, as demais ficam desabilitadas (cinzas e não-clicáveis); desmarcar a selecionada reabilita todas. No modo `choice`, todas permanecem habilitadas sempre (permite selecionar 2 ou mais).

- **Botão "Configurar" posicionado corretamente** — o botão agora aparece indentado e imediatamente abaixo do toggle "Testes Opostos" no menu de configurações do módulo, refletindo que é uma ação relacionada.

---

## [0.1.3] — 2026-04-09

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
