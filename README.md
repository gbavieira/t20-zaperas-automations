# ⚔️ T20 Zapera's Automations

> **Módulo para FoundryVTT que adiciona automações inteligentes para o sistema Tormenta20.**

**Autor:** Zapera | **Versão:** 0.2.2 | **FoundryVTT:** v13+ | **Sistema:** Tormenta20

---

## O que é este projeto?

**T20 Zapera's Automations** é um módulo gratuito que automatiza as situações mais comuns no Tormenta20, economizando tempo do mestre e mantendo o fluxo da sessão. Desde testes de resistência automáticos até cálculos de dano de queda — tudo funciona sem interrupção.

---

## 🎯 Automações

### 1️⃣ Testes de Resistência Automáticos ⚙️ Configurável

**O que faz:** Quando um personagem lança uma magia que exige teste de resistência (Fortitude, Reflexo ou Vontade), o módulo abre automaticamente o prompt de rolagem para cada alvo afetado. Para magias de área, basta posicionar o template no mapa — os alvos dentro da área recebem o prompt automaticamente.

**Configurações:**
- **Testes de Resistência — Ativada?** — Ligue/desligue a automação
- **Testes de Resistência — Mostrar CD no dialog** — Se marcado, exibe a CD do teste no dialog de rolagem e no card de resultado. Desmarque para esconder a dificuldade dos jogadores

**Como usar:**
- Para magias com alvo direto: selecione os tokens como alvo antes de lançar a magia
- Para magias de área: clique em "Colocar Área de Efeito", posicione no mapa, e os testes são enviados automaticamente

---

### 2️⃣ Testes Opostos ⚙️ Configurável

**O que faz:** Automatiza testes opostos como Enganação, Furtividade e Intimidação. O mestre pode configurar quais perícias disparam testes opostos, quem faz a defesa, e como a rolagem funciona.

**Padrão:**

| Perícia usada | Defesa usada | Como funciona |
|---|---|---|
| **Enganação** | Percepção ou Intuição | O mestre escolhe quem defende |
| **Furtividade** | Percepção | Todos no mapa rolam automaticamente |
| **Intimidação** | Vontade | Apenas os alvos selecionados rolam |

**Configurações:**
- **Testes Opostos — Ativada?** — Ligue/desligue a automação
- **Testes Opostos — Resultado apenas para o GM** — Se marcado, o resultado é enviado como whisper apenas para o mestre
- **Testes Opostos — Rolar apenas para alvos selecionados** — Se marcado, a rolagem acontece apenas para tokens marcados como alvo
- **Testes Opostos — Configurar** — Botão para criar regras customizadas (defina quais perícias ativam, qual perícia defende, e modo de funcionamento)

**Como usar:**
- Role a perícia normalmente pela ficha do personagem
- Se a perícia está configurada para teste oposto, o módulo rola a defesa automaticamente
- O resultado aparece no chat mostrando quem venceu e quem perdeu
- Críticos funcionam: nat 20 sempre vence (exceto se o defensor também tirar 20), nat 1 sempre perde

---

### 3️⃣ Condições em 0 PV ⚙️ Configurável

**O que faz:** Quando um personagem chega a 0 pontos de vida, o módulo aplica automaticamente todas as condições previstas pelas regras: **Sangrando, Indefeso, Desprevenido, Caído e Inconsciente**. Quando o personagem recupera pelo menos 1 PV, as condições são removidas automaticamente (exceto Caído, que o personagem precisa se levantar por conta própria).

**Configurações:**
- **Condições em 0 PV — Ativada?** — Ligue/desligue a automação

**Como usar:**
- Apenas atualizar o PV na ficha — o módulo faz o resto automaticamente

---

### 4️⃣ Verificador de Defesa ⚙️ Configurável

**O que faz:** Ao rolar um ataque com um alvo selecionado, o módulo compara automaticamente o total do dado com a Defesa do alvo e exibe no card do chat se o ataque **acertou** ou **errou**, com destaque visual verde ou vermelho.

**Regras críticas:**
- Nat 20 = acerto automático (independente da Defesa)
- Nat 1 = falha automática (independente do total)

**Configurações:**
- **Verificador de Defesa — Ativada?** — Ligue/desligue a automação
- **Verificador de Defesa — Mostrar para os Jogadores?** — Se marcado, todos veem o resultado. Se desativado, apenas o mestre vê

**Como usar:**
- Selecione um token como alvo antes de rolar o ataque
- O resultado aparece automaticamente no chat (✓ verde = ACERTOU | ✗ vermelho = ERROU)

---

### 5️⃣ Dreno de Vida ⚙️ Configurável

**O que faz:** Para magias e poderes que drenam vida (como Toque Vampírico), o módulo substitui os botões normais de dano por botões especiais que simultaneamente aplicam o dano no alvo e curam o atacante por uma porcentagem do dano causado.

**Padrão:** Toque Vampírico cura o atacante em 50% do dano como PV normal (até o máximo da ficha).

**Configurações:**
- **Dreno de Vida — Ativada?** — Ligue/desligue a automação
- **Dreno de Vida — Configurar** — Botão para customizar quais magias/poderes disparam o efeito. Configure o percentual de cura (0–100%) e se é PV temporário ou cura normal

**Como usar:**
- Lance a magia/poder normalmente
- Os botões de dano no chat são substituídos automaticamente
- Clique em um botão para aplicar dano e cura simultaneamente

---

### 6️⃣ Contador de Magia Sustentada ⚙️ Configurável

**O que faz:** Gerencia o ciclo completo de magias sustentadas (magias que custam 1 PM por rodada para manter ativadas). Ao lançar uma magia sustentada, o módulo aplica um efeito no personagem. A cada turno do personagem em combate, o mestre recebe uma pergunta: *"Deseja pagar 1 PM para sustentar [magia]?"*

**Resultado:** Se o mestre confirmar, 1 PM é descontado automaticamente. Se recusar ou não tiver PM suficiente, o efeito é removido.

**Configurações:**
- **Contador de Magia Sustentada — Ativada?** — Ligue/desligue a automação
- **Contador de Magia Sustentada — Mostrar para os Jogadores?** — Se marcado, prompts aparecem no chat público. Se desativado, apenas o mestre vê (whisper)

**Como usar:**
- Lance a magia sustentada normalmente
- No início de cada turno do personagem em combate, o mestre vê uma pergunta no chat
- Responda "Sim" ou "Não" — o PM é descontado ou o efeito é removido automaticamente

---

### 7️⃣ Poder Sortudo

**O que faz:** Para personagens com o poder **Sortudo**, o módulo adiciona automaticamente um botão de rerolar em testes de perícia no chat. O custo é 3 PM (descontado automaticamente ao clicar). Você rola novamente e fica com o resultado que preferir (exatamente como a regra do livro).

**Configurações:**
- **Poder Sortudo — Ativada?** — Ligue/desligue a automação

**Como usar:**
- Role um teste de perícia no chat
- Se o personagem tiver o poder Sortudo, um botão de rerolar aparece na mensagem
- Clique para rolar novamente e escolher qual resultado usar

---

### 8️⃣ Mapa de Viagem Interativo ⚙️ Configurável

**O que faz:** Em cenas marcadas como "Mapa de Viagem", exibe informações de tempo de viagem diretamente na régua de medição do FoundryVTT. Mostra o tempo estimado e rações necessárias para diferentes modos de viagem.

**Modos disponíveis:**

| Modo | Velocidade |
|---|---|
| **A pé** | Caminhada normal (usa o personagem mais lento do grupo) |
| **Carroça** | 9m por rodada (36 km/dia) |

**Configurações:**
- **Mapa de Viagem Interativo — Ativada?** — Ligue/desligue a automação
- **Mapa de Viagem Interativo — Configurar** — Botão para escolher quais atores (personagens de jogador) devem ser considerados no cálculo de velocidade. Se nenhum estiver configurado, o módulo usa todos os PCs automaticamente

**Como usar:**
1. Na aba "Básicos" da configuração da cena, marque "Mapa de Viagem"
2. Use a régua de medição normalmente (clique e arraste no mapa)
3. As informações de viagem aparecem automaticamente no label do último ponto da régua
4. Exemplo: "A pé: 6h 40min (4 rações)" ou "Carroça: 2h 30min (1 ração)"

---

### 9️⃣ Cura Acelerada ⚙️ Configurável

**O que faz:** Para ameaças (NPCs) que possuem "cura acelerada X" no campo de resistências da ficha, o módulo detecta automaticamente quando o NPC entra em combate. A cada turno da ameaça, o mestre recebe um prompt perguntando se deseja regenerar os PV correspondentes.

> **Importante:** Se você tiver dois tokens do mesmo NPC no mapa (ex: dois Trolls), a cura acelerada funciona corretamente para cada um — o prompt identifica qual token está em turno.

**Configurações:**
- **Cura Acelerada — Ativada?** — Ligue/desligue a automação

**Como usar:**
1. Na ficha da ameaça, no campo **Resistências** (aba Detalhes), adicione o texto: `cura acelerada 15` (ou o valor desejado)
2. Inicie combate com a ameaça
3. Quando chegar o turno da ameaça, o mestre vê um prompt no chat
4. Clique **Sim** para regenerar os PV, ou **Não** para não usar naquele turno
5. O prompt aparece novamente a cada turno automaticamente

**Exemplo:** Uma ameaça com "Resistências: imunidade a veneno, cura acelerada 8" regenerará 8 PV a cada turno de combate (se o GM desejar).

---

## 📚 Macros Incluídas

O módulo vem com uma coleção de macros prontas para uso, acessíveis pela biblioteca de macros do FoundryVTT:

| Macro | O que faz |
|---|---|
| **Baú (Item Piles)** | Transforma tokens selecionados em pilhas de loot (baú, corpo ou mantém a imagem original). Requer o módulo Item Piles. |
| **Visão do Token** | Configura rapidamente a visão no escuro e fontes de luz (tocha, luz mágica, escuridão, olho do beholder) para os tokens selecionados. |
| **Dano de Queda** | Calcula e rola o dano de queda conforme as regras do Tormenta20, com suporte a quedas na água e objetos pesados. |
| **Relógio de Tibares** | Aplica a regra de Custo de Vida, descontando moedas automaticamente de cada personagem. O GM seleciona o estilo de vida (Pobre, Médio, Rico, Luxuoso) e o período (dia ou mês) individualmente para cada PJ em uma única tela de configuração. |
| **Ração de Viagem** | Desconta rações automaticamente de cada personagem. Abre um dialog onde o GM seleciona quantas rações consumir, lê a quantidade atual do item em tempo real e desconta individualmente para cada PJ. Suporta múltiplos nomes de campo com fallback inteligente. |
| **Limpar Réguas** | Remove todas as réguas de medição do cenário atual com um clique. |

---

## 🐛 Bugs Conhecidos

### Testes de Resistência Automáticos
- Quando uma magia tem efeitos adicionais (mesmo não utilizados), esses efeitos podem ser aplicados automaticamente no alvo se ele falhar na resistência. Estamos investigando uma solução.

---

## 📦 Instalação

1. No FoundryVTT, vá em **Configurações → Módulos → Instalar Módulo**
2. Cole a URL do manifesto do módulo no campo de busca
3. Clique em **Instalar**
4. Vá em **Gerenciar Módulos** e ative **T20 Zapera's Automations**
5. Pronto! As automações já estão funcionando na sua mesa

**Cada automação pode ser ligada ou desligada individualmente nas configurações do módulo.** Ao alterar uma configuração, o FoundryVTT pedirá para recarregar a página para que as mudanças entrem em efeito.

---

## 🤝 Como contribuir

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

## 🛠️ Desenvolvimento

Este projeto é desenvolvido com o auxílio de **Inteligência Artificial** (Claude, da Anthropic) para revisão de código, otimização de performance e qualidade. Todo o código é revisado e testado em mesa real antes de ser publicado.

---

## 📄 Licença

Este módulo é gratuito e de código aberto. Você é livre para usá-lo, modificá-lo e distribuí-lo conforme necessário.

---

**Feito com carinho para a comunidade Tormenta20.** ⚔️
