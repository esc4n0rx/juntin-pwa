# JUNTIN — Contexto Oficial do Projeto

## Visão Geral

**JUNTIN** é um **PWA mobile-first** para gerenciamento financeiro **individual e em casal**, criado para substituir planilhas e oferecer uma experiência moderna, clara e colaborativa.

O app foi projetado para **parecer e se comportar como um app nativo iOS**, utilizando glassmorphism, navegação fluida e componentes mobile.

> ⚠️ **Ponto mais importante:** a **UI/UX do JUNTIN já está madura, validada e bem definida**. Este projeto **NÃO** está em fase de redesign visual.

---

## Finalidade deste documento

Este arquivo é a **base de entendimento obrigatória** para qualquer **agente de IA, desenvolvedor ou automação** que atue no projeto.

Ele existe para garantir que:

* A identidade visual não seja perdida
* A experiência mobile seja preservada
* A evolução do projeto aconteça de forma segura e incremental

---

## Regra de Ouro (OBRIGATÓRIA)

> **A UI NÃO deve ser alterada.**

Todo o trabalho futuro deve seguir este princípio:

* ❌ Não redesenhar telas
* ❌ Não mudar layout
* ❌ Não trocar cores, fontes ou estilos
* ❌ Não simplificar a interface
* ❌ Não transformar o app em site web

Se algo já existe visualmente, ele **deve ser mantido**.

---

## Forma correta de evoluir o projeto

O projeto segue a seguinte lógica:

1. A UI começa com dados mockados
2. A cada task:

   * Um trecho mockado é removido
   * A lógica real é inserida (API, banco, auth)
3. O visual permanece exatamente o mesmo

> ⚠️ Se a task não envolve interface, **nenhuma UI deve ser tocada**.

---

## Stack Tecnológica (IMUTÁVEL)

* **Next.js (App Router)**
* **TypeScript**
* **Tailwind CSS**
* **shadcn/ui**
* **Framer Motion**
* **Configuração PWA**

❌ Não substituir bibliotecas
❌ Não adicionar frameworks visuais alternativos

---

## Design e Tema

### Identidade Visual

* Estilo iOS moderno
* Glassmorphism
* Bordas arredondadas
* Cards flutuantes
* Layout mobile-first

### Temas

#### Tema Claro (padrão)

* Tons claros
* Destaques suaves
* Aparência elegante e limpa

#### Tema Preto & Branco (modo exclusivo)

* Apenas preto, branco e cinzas
* Nenhuma cor de destaque
* Deve afetar TODO o app:

  * Cards
  * Gráficos
  * Botões
  * Ícones
  * Textos

> O tema é global e controlado pelo usuário no Perfil.

---

## Fluxo do Usuário

### 1. Tela Inicial

* Nome do app: **JUNTIN**
* Slogan
* Placeholder de animação Lottie
* Login com Google

### 2. Escolha de Modo

* Sozinho
* Em Casal

### 3. Setup Inicial

#### Modo Sozinho

* Criar categorias
* Definir orçamentos (opcional)
* Definir renda

#### Modo Casal

* Convidar parceiro(a) por email
* Categorias compartilhadas
* Orçamentos conjuntos
* Renda conjunta

---

## Estrutura Principal do App

### Navegação Inferior (fixa)

* Home
* Análise
* Despesas
* Objetivos
* Perfil

Experiência similar a apps iOS nativos.

---

## Responsabilidade de Cada Tela

### Home

* Overview financeiro
* Saldo geral
* Receitas e despesas recentes

### Análise

* Gráficos por categoria
* Insights de gastos

### Despesas

* Lançamento de despesas e receitas
* Organização por categoria e data

### Objetivos

* Criação e acompanhamento de objetivos financeiros

### Perfil

* Personalização do usuário
* Alternância de tema (Claro / Preto & Branco)
* Gerenciamento de categorias e orçamentos
* Sobre
* Encerrar conta

---

## Componentes

* Todos os componentes são:

  * Reutilizáveis
  * Mobile-first
  * Visualmente consistentes

⚠️ Componentes existentes **não devem ser recriados ou alterados visualmente**.

---

## Criação de Novos Componentes ou Telas

Somente permitido quando:

* A funcionalidade não existe
* Não há componente reaproveitável

Nesse caso, o agente deve:

1. Analisar a UI atual
2. Seguir o tema e identidade existentes
3. Replicar padrões de espaçamento, animação e estilo

---

## Estado Atual do Projeto

* UI: Finalizada
* UX: Definida
* Dados: Mockados
* Backend: Não integrado

---

## Objetivo Final

Transformar o **JUNTIN** em um PWA totalmente funcional, conectando:

* API
* Banco de dados
* Autenticação

Sem causar **nenhuma regressão visual**.

---

## Lembrete Final para Agentes de IA

> Se você está lendo este arquivo:
> **Seu trabalho é adicionar lógica, não redesenhar telas.**
> Preserve a UI. Preserve a experiência.
