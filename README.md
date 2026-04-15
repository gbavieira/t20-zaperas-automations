# T20 Zapera's Automations

> Módulo para FoundryVTT para automações que um mestre sente falta no sistema Tormenta20.

**Autor:** Zapera
**Versão:** 0.1
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

### 2. Testes Opostos

**O que faz:** Automatiza os testes opostos mais comuns do Tormenta20:

| Perícia usada | Defesa automática |
| --- | --- |
| **Enganação** | O GM escolhe se a defesa é Percepção ou Intuição |
| **Furtividade** | Rola Percepção automaticamente para todos os tokens no mapa |
| **Intimidação** | Rola Vontade automaticamente para os alvos |

**Como usar:** Basta rolar a perícia normalmente pela ficha do personagem. Ao aparecer o resultado no chat, o módulo exibe os resultados de defesa ao lado, mostrando quem passou e quem falhou. Um 20 natural no ataque é sempre sucesso (a menos que o defensor também tire 20).

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

### 4. Verificador de Defesa (Não funcional ainda)

**O que faz:** Ao rolar um ataque com um alvo selecionado, o módulo compara automaticamente o total do dado com a Defesa do alvo e mostra no card do chat se o ataque **acertou** ou **errou**, com destaque visual.

**Como usar:** Selecione um token como alvo antes de rolar o ataque (usando o botão de alvo no FoundryVTT). O resultado aparece automaticamente no card do ataque no chat.

---

### 5. Dreno de Vida

**O que faz:** Para magias que drenam vida (como o **Toque Vampírico**), o módulo substitui os botões normais de dano por botões especiais que fazem as duas coisas ao mesmo tempo: aplicam o dano no alvo e curam o atacante por uma porcentagem desse dano.

- **Toque Vampírico** cura o atacante em 50% do dano causado

Se o módulo **Sequencer** estiver instalado, um efeito visual de raio de energia é exibido automaticamente.

**Como usar:** Lance a magia normalmente. Os botões de dano no chat serão substituídos pelos botões de dreno. Basta clicar.

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

### 8. Mapa de Viagem Interativo (Em Desenvolvimento)

**O que faz:** Em cenas marcadas como "Mapa de Viagem", exibe informações de tempo de viagem diretamente no label da régua de medição do Foundry (no último waypoint). Mostra o tempo estimado para dois modos de viagem, incluindo rações necessárias:

| Modo | Velocidade |
| --- | --- |
| A pé | Caminhada normal (personagem mais lento do grupo configurado) |
| Carroça | 9m de deslocamento (36 km/dia) |

O módulo usa os personagens configurados em **Configurações → T20 Zapera's Automations → Atores da Régua de Viagem** para calcular a velocidade. Se nenhum personagem estiver configurado, usa todos os personagens controlados por jogadores como fallback.

**Como usar:** Na configuração da cena, ative a opção **"Mapa de Viagem"** (aba Básicos). Configure os atores que devem ser considerados em Configurações do módulo. Depois, ao usar a régua de medição no mapa, as informações de viagem aparecem automaticamente no label do último ponto da régua.

---

## Macros incluídas

O módulo vem com uma coleção de macros prontas para uso, acessíveis pela biblioteca de macros do FoundryVTT:

| Macro | O que faz |
| --- | --- |
| **Baú (Item Piles)** | Transforma tokens selecionados em pilhas de loot (baú, corpo ou mantém a imagem original). Requer o módulo Item Piles. |
| **Visão do Token** | Configura rapidamente a visão no escuro e fontes de luz (tocha, luz mágica, escuridão, olho do beholder) para os tokens selecionados. |
| **Dano de Queda** | Calcula e rola o dano de queda conforme as regras do Tormenta20, com suporte a quedas na água e objetos pesados. |
| **Relógio de Tibares** | Aplica a regra de Custo de Vida diário, descontando moedas automaticamente de cada personagem conforme o estilo de vida escolhido. |
| **Limpar Réguas** | Remove todas as réguas de medição do cenário atual com um clique. |

---

## Bugs Conhecidos

### 1. Testes de Resistência Automáticos
-- Aqui quando um poder/magia tem algum efeito que vai para o chat, mesmo as vezes sendo proveniente de um aprimoramento de magia não usado, o efeito é aplicado automaticamente no token alvo se ele falhar na resistência.

### 4. Verificador de Defesa (Não funcional ainda)
-- Ainda tem bugs, não está identificando um "ataque".

### 8. Mapa de Viagem Interativo
-- O front ainda está em desenvolvimento, com alguns bugs visuais

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
