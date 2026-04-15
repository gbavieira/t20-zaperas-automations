# T20 Zapera's Automations

> Módulo para FoundryVTT para automações que um mestre sente falta no sistema Tormenta20.

**Autor:** Zapera
**Versão:** 0.2.0
**Última atualização:** 2026-04-15
**Compatibilidade:** FoundryVTT v13 + Sistema Tormenta20

---

## O que é este projeto?

**T20 Zapera's Automations** é um módulo gratuito para o [FoundryVTT](https://foundryvtt.com/) que adiciona automações inteligentes para quem joga **Tormenta20**.

Sabe aquela hora que o mestre lança uma magia de área e precisa pedir para cada jogador rolar a resistência manualmente? Ou quando alguém chega a 0 PV e ninguém lembra quais condições aplicar? Este módulo faz tudo isso automaticamente.

---

## Instalação

1. No FoundryVTT, vá em **Configurações → Módulos → Instalar Módulo**
2. Cole a URL do manifesto do módulo no campo de busca
3. Clique em **Instalar**
4. Após a instalação, vá em **Gerenciar Módulos** e ative **T20 Zapera's Automations**
5. Pronto! As automações já estão funcionando na sua mesa

> Cada automação pode ser ligada ou desligada individualmente nas configurações do módulo.

---

## Automações

### 1. Testes de Resistência Automáticos

**O que faz:** Quando um personagem lança uma magia que exige teste de resistência (como Adaga Mental), o módulo identifica automaticamente qual tipo de resistência é necessária — Fortitude, Reflexo ou Vontade — e abre o prompt de rolagem para cada jogador afetado, sem que o mestre precise pedir nada.

Para magias de área: quando o conjurador coloca o template no mapa, os alvos dentro da área rolam o teste de resistência automaticamente, sem necessidade de selecionar alvos manualmente antes.

**Como usar:** Lance a magia normalmente pelo sistema Tormenta20. Para magias com alvo direto, selecione os tokens como alvo antes. Para magias de área, clique em "Colocar Área de Efeito" e posicione no mapa — os testes são enviados automaticamente.

---

### 2. Testes Opostos (Configurável)

**O que faz:** Automatiza testes opostos como Enganação, Furtividade e Intimidação. O GM pode configurar quais perícias disparam testes opostos, o modo (automático, escolha do GM, ou atores específicos) e qual perícia de defesa é usada.

**Configuração padrão:**
| Perícia usada | Defesa | Modo |
| --- | --- | --- |
| **Enganação** | Percepção ou Intuição | O GM escolhe |
| **Furtividade** | Percepção | Automático para todos no mapa |
| **Intimidação** | Vontade | Automático para alvos |

**Como customizar:** Vá em **Configurações → Testes Opostos → Configurar**. Você pode adicionar novas regras, editar triggers, escolher perícias de defesa e o modo de funcionamento.

**Como usar:** Lance a perícia normalmente pelo sistema. Ao aparecer no chat, o módulo automaticamente rola os testes de defesa.

---

### 3. Condições em 0 PV

**O que faz:** Quando um personagem chega a 0 pontos de vida, o módulo aplica automaticamente todas as condições previstas pelas regras:

- Sangrando
- Indefeso
- Desprevenido
- Caído
- Inconsciente

Quando o personagem recupera pelo menos 1 PV, as condições são removidas automaticamente (exceto Caído, que ele precisa se levantar por conta própria).

**Como usar:** Funciona automaticamente sempre que o PV de qualquer ator for atualizado na ficha.

---

### 4. Verificador de Defesa

**O que faz:** Ao rolar um ataque com um alvo selecionado, o módulo compara automaticamente o total do dado com a Defesa do alvo e mostra no card do chat se o ataque **acertou** ou **errou**, com destaque visual.

**Regras críticas implementadas:**
- **Nat 20** = acerto automático, independente da defesa
- **Nat 1** = falha automática, independente do total
- Resultado normal = total vs defesa do alvo

**Configuração:** O resultado é exibido apenas para o GM por padrão. Vá em **Configurações → Verificador de Defesa → "Mostrar Verificador de Defesa para os Jogadores?"** para tornar o resultado visível a todos.

**Como usar:** Selecione um token como alvo antes de rolar o ataque (usando o botão de alvo no FoundryVTT). O resultado aparece automaticamente no card do ataque no chat, abaixo do bloco de rolagem.

---

### 5. Dreno de Vida (Configurável)

**O que faz:** Para magias e poderes que drenam vida (como **Toque Vampírico**), o módulo substitui os botões normais de dano por botões especiais que simultaneamente aplicam o dano no alvo e curam o atacante por uma porcentagem do dano causado.

Você pode configurar:
- **Quais magias/poderes** disparam o efeito de dreno
- **Percentual de cura** (ex: 50% do dano = 50 pontos de cura para 100 de dano)
- **Tipo de cura**: PV normal (até o máximo) ou PV temporário (aditivo)

**Exemplo padrão:**
- **Toque Vampírico** → cura o atacante em 50% do dano, como PV normal

**Como customizar:** Vá em **Configurações → Dreno de Vida → Configurar**. Arraste magias/poderes do tipo "magia" ou "poder" para adicionar à lista, configure o percentual e se deve ser PV temporário ou normal.

**Como usar:** Lance a magia/poder normalmente. Os botões de dano no chat serão substituídos automaticamente por botões de dreno. Clique para aplicar dano e cura simultaneamente.

---

### 6. Contador de Magia Sustentada

**O que faz:** Gerencia o ciclo completo de magias que precisam ser sustentadas rodada a rodada:

1. Ao lançar uma magia sustentada, um efeito de contador é aplicado automaticamente no personagem
2. No início de cada turno do personagem no combate, o GM recebe uma pergunta: *"Deseja pagar 1 PM para sustentar [nome da magia]?"*
3. Se confirmar, o PM é descontado automaticamente
4. Se recusar, ou se o personagem não tiver PM suficiente, o efeito é removido

**Como usar:** Lance a magia normalmente. A partir daí, o módulo cuida de tudo durante o combate.

---

### 7. Poder Sortudo

**O que faz:** Para personagens com o poder **Sortudo**, adiciona um botão de rerolar em testes de perícia diretamente no chat. Custa 3 PM e funciona exatamente como a regra do livro: você rola novamente e fica com o resultado preferido.

**Como usar:** Após um teste de perícia no chat, se o personagem tiver o poder Sortudo, um botão de rerolar aparece na mensagem. O custo de 3 PM é descontado automaticamente ao clicar.

---

### 8. Mapa de Viagem Interativo

**O que faz:** Em cenas marcadas como "Mapa de Viagem", exibe informações de tempo de viagem diretamente no label da régua de medição do Foundry (no último waypoint). Mostra o tempo estimado e rações necessárias para dois modos de viagem:

| Modo | Velocidade |
| --- | --- |
| **A pé** | Caminhada normal (usa o personagem mais lento do grupo) |
| **Carroça** | 9m de deslocamento por rodada (36 km/dia) |

**Como configurar:** O módulo usa todos os personagens controlados por jogadores para calcular a velocidade do grupo. Se você quiser considerar **apenas alguns personagens** (ex: em uma viagem splitparty), vá em **Configurações → Mapa de Viagem Interativo → Configurar** e arraste os atores que devem entrar no cálculo. O sistema automaticamente usa os atores configurados e faz fallback para "todos os PCs" se nenhum estiver configurado.

**Como usar:**
1. Na configuração da cena, ative a opção **"Mapa de Viagem"** (aba Básicos)
2. Configure os atores (opcional) em **Configurações do módulo**
3. Use a régua de medição no mapa — as informações de viagem aparecem automaticamente no label do último ponto da régua

---

### 9. Cura Acelerada

**O que faz:** Para ameaças (NPCs) que possuem "cura acelerada X" no campo de resistências da ficha, o módulo detecta isso automaticamente quando o NPC entra em combate. A cada turno da ameaça, o GM recebe um prompt whisper perguntando se deseja regenerar os PV correspondentes.

**Como usar:**
1. Na ficha da ameaça, no campo **Resistências** (aba Detalhes), adicione o texto `cura acelerada 15` (ou o valor desejado)
2. Inicie combate com a ameaça
3. Quando chegar o turno da ameaça, o GM verá um prompt no chat perguntando se deseja regenerar os PV
4. Clique **Sim** para regenerar, ou **Não** para não usar a cura naquele turno
5. O prompt aparece novamente a cada turno automaticamente

**Exemplo:** Uma ameaça com "Resistências: imunidade a veneno, cura acelerada 8" regenerará 8 PV a cada turno de combate (se o GM desejar).

**Nota importante — múltiplos tokens do mesmo NPC:** Se você tiver dois tokens do mesmo NPC no mapa (ex: dois Trolls), a cura acelerada funciona corretamente para cada um — o prompt identifica qual token específico está em turno e aplica a cura no token correto, não no outro.

---

## Macros incluídas

O módulo vem com uma coleção de macros prontas para uso, acessíveis pela biblioteca de macros do FoundryVTT:

| Macro | O que faz |
| --- | --- |
| **Baú (Item Piles)** | Transforma tokens selecionados em pilhas de loot (baú, corpo ou mantém a imagem original). Requer o módulo Item Piles. |
| **Visão do Token** | Configura rapidamente a visão no escuro e fontes de luz (tocha, luz mágica, escuridão, olho do beholder) para os tokens selecionados. |
| **Dano de Queda** | Calcula e rola o dano de queda conforme as regras do Tormenta20, com suporte a quedas na água e objetos pesados. |
| **Relógio de Tibares** | Aplica a regra de Custo de Vida, descontando moedas automaticamente de cada personagem. O GM seleciona o estilo de vida (Pobre, Médio, Rico, Luxuoso) e o período (dia ou mês) individualmente para cada PJ em uma única tela de configuração. |
| **Ração de Viagem** | Desconta rações automaticamente de cada personagem. Abre um dialog onde o GM seleciona quantas rações consumir, lê a quantidade atual do item em tempo real e desconta individualmente para cada PJ. Suporta múltiplos nomes de campo com fallback inteligente. |
| **Limpar Réguas** | Remove todas as réguas de medição do cenário atual com um clique. |

---

## Bugs Conhecidos

### 1. Testes de Resistência Automáticos
- Quando uma magia tem efeitos adicionais (mesmo não utilizados), esses efeitos são aplicados automaticamente no alvo se ele falhar na resistência.

---

## Como contribuir

Contribuições são bem-vindas! Você não precisa ser programador para ajudar.

**Se você encontrou um bug:**

1. Vá até a aba [Issues](../../issues) do projeto
2. Clique em **New Issue**
3. Descreva o que aconteceu, o que você esperava que acontecesse, e se possível uma imagem ou vídeo do problema

**Se você tem uma ideia de nova automação:**

1. Abra uma [Issue](../../issues) com o título começando por `[Sugestão]`
2. Explique a situação de jogo que seria automatizada e como você imagina que funcionaria

**Se você sabe programar:**

1. Faça um fork do repositório
2. Crie uma branch com o nome da sua feature (`git checkout -b feat/minha-automacao`)
3. Faça suas alterações seguindo a estrutura já existente (um arquivo por handler em `scripts/handlers/`)
4. Abra um Pull Request descrevendo o que foi feito

---

## Sobre o desenvolvimento

Este projeto é desenvolvido com o auxílio de **Inteligência Artificial** (Claude, da Anthropic) para revisão de código, otimização de performance e qualidade. Todo o código é revisado e testado em mesa real antes de ser publicado.

---

*Feito com carinho para a comunidade Tormenta20.*
