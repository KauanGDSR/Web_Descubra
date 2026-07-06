# Plataforma Descubra (Painel Administrativo)

Esta é a plataforma administrativa do **Programa Descubra**, desenvolvida em grupo durante um Hackathon com o objetivo de melhorar o acompanhamento de jovens em situação de vulnerabilidade social e risco de evasão escolar, conectando-os a oportunidades de capacitação e primeiro emprego.

O painel centraliza a gestão para três frentes principais:
* **Administradores:** Visão macro do programa, relatórios gerais e gerenciamento de acessos.
* **Assistentes Sociais (Técnicos):** Acompanhamento individual, análise de vulnerabilidade (Fila Inteligente) e encaminhamento para vagas.
* **Empresas Parceiras:** Cadastro de vagas e cursos, e triagem de candidatos recomendados.

## 👥 Realização, Parcerias e Equipe

Este projeto foi idealizado e construído como solução para o desafio do **Programa Descubra**, contando com o apoio e colaboração das seguintes instituições:

* **Ministério Público do Estado de Minas Gerais (MPMG)**
* **SEBRAE**
* **Instituto Federal do Norte de Minas Gerais (IFNMG) - Campus Pirapora**
* **Programa Descubra** (Programa de Incentivo à Aprendizagem de Minas Gerais)

### 🚀 Equipe de Desenvolvimento
* [Gildo Alves](https://github.com/gabj1-gildo) - Gerente de Sistemas
* [Kauan Gabriel](https://github.com/KauanGDSR) - Desenvolvedor Full Stack
* **Luiz Eduardo** - Desenvolvedor Back-end
* **Lorena** - Gestora de Projetos
* **Mateus** - Diretor de Comunicações

---

## 🚀 Principais Funcionalidades

* **Fila Inteligente (Priorização Social):** Um painel que ordena os jovens de acordo com o nível de vulnerabilidade e risco de evasão escolar (calculado com base em dados socioeconômicos, moradia, renda e histórico escolar).
* **Matching Inteligente:** Integração com a API do Gemini (via Vercel AI SDK) para cruzar o perfil do jovem com as vagas e cursos cadastrados, sugerindo os melhores encaminhamentos de forma automatizada.
* **Geração de Relatórios:** Relatórios consolidados sobre a trajetória dos jovens, taxas de evasão e impacto do programa.
* **Gestão Multitenant:** Controle de acesso baseado em perfis (Admin, Técnico e Empresa) integrado à autenticação do Supabase.

## 🛠️ Tecnologias Utilizadas

* **Framework:** Next.js (App Router)
* **Linguagem:** TypeScript
* **Estilização:** Tailwind CSS
* **Banco de Dados & Auth:** Supabase (Postgres)
* **Integração de IA:** Vercel AI SDK / Google Gemini API
* **Componentes UI:** Lucide React, Radix UI (Tailwind)

## 📦 Como Executar o Projeto

### Pré-requisitos
* Node.js (v18 ou superior)
* Uma conta no Supabase com o schema configurado
* Chave de API da Google Gemini (opcional, para o matching)

### Configuração
1. Clone o repositório:
   ```bash
   git clone https://github.com/KauanGDSR/Web_Descubra.git
   cd Web_Descubra
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env.local` na raiz do projeto e configure as variáveis de ambiente:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role (opcional, para funções administrativas)
   GEMINI_API_KEY=sua_chave_api_do_gemini
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse no navegador: `http://localhost:3000`

---

## 🔒 Direitos Autorais e Licença

Este projeto foi desenvolvido como parte de um portfólio pessoal e trabalho em equipe acadêmico/hackathon. O código-fonte está disponível publicamente apenas para fins de demonstração técnica e avaliação de habilidades. 

**Não é permitida a redistribuição, cópia integral ou uso comercial deste código sem autorização prévia.**
