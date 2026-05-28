# organico-plataforma

## Reset da plataforma

Para deixar a plataforma "novinha" para os usuários, rode o script:

`supabase/clear_demo_data.sql`

O que ele limpa:

- Metas
- Ideias
- Eventos do calendário
- Histórico
- Stories
- Posts
- Estado compartilhado salvo no banco
- Estatísticas e campos auxiliares dos perfis

O que ele preserva:

- `team_profiles` base de login, nome e acesso, para o sistema continuar entrando normalmente

Observação:

- Se algum usuário já abriu a plataforma antes, o navegador dele pode guardar estado local em `localStorage` até a próxima carga/sincronização. Em um deploy limpo, normalmente basta recarregar a página ou fazer logout/login.
