# Auditoria de Persistencia

Data: 2026-06-11

## Resumo

O sistema ja usa Supabase em boa parte dos CRUDs operacionais, mas a persistencia ainda esta fragmentada entre:

- tabelas JSONB genericas (`goals`, `ideas`, `calendar_events`, `history_events`, `story_logs`, `posts`);
- `app_preferences` para preferencias por usuario;
- `shared_state` para estados agregados e relatorios;
- `useState` e `localStorage` como camada de espelho/fallback;
- seeds e mocks em `mockData.ts` usados como `fallback`.

Os principais riscos encontrados:

- `shared_state` era global, sem `user_id`, violando isolamento por usuario;
- varias tabelas operacionais nao tinham `user_id`, `created_at` e `updated_at` na modelagem-base;
- havia policies antigas com acesso global em scripts legados (`using (true)` / `with check (true)`);
- Dashboard, Calendario, Stories e Relatorios misturavam fonte agregada local/shared_state com tabelas operacionais;
- Meta Insights e Relatorios ainda persistem snapshots agregados, nao eventos normalizados.

## O que foi corrigido nesta rodada

- Autenticacao local alinhada com sessao real do Supabase em [src/app/auth.ts](/C:/great-organico/greatorg/src/app/auth.ts).
- `useSupabaseSyncedListState` passou a filtrar e gravar com `user_id` em [src/app/data/supabaseSync.ts](/C:/great-organico/greatorg/src/app/data/supabaseSync.ts).
- `useSupabaseSharedState` passou a operar por `user_id` em [src/app/data/supabaseSync.ts](/C:/great-organico/greatorg/src/app/data/supabaseSync.ts).
- Repositorio explicito de Stories criado em [src/app/data/storiesRepository.ts](/C:/great-organico/greatorg/src/app/data/storiesRepository.ts).
- Stories passou a usar CRUD com `await`, erro real e refetch em [src/app/pages/Stories.tsx](/C:/great-organico/greatorg/src/app/pages/Stories.tsx).
- Dashboard deixou de ler `storyLogs` apenas do mock e passou a usar a mesma fonte operacional em [src/app/pages/Dashboard.tsx](/C:/great-organico/greatorg/src/app/pages/Dashboard.tsx).
- Migration de endurecimento para Stories criada em [supabase/stories_persistence_fix.sql](/C:/great-organico/greatorg/supabase/stories_persistence_fix.sql).
- Migration de isolamento por usuario para `shared_state` criada em [supabase/shared_state_user_scope.sql](/C:/great-organico/greatorg/supabase/shared_state_user_scope.sql).
- Base relacional por `user_id`, `reference_month`, `metric_date` e sincronizacao legada criada em [supabase/relational_persistence_foundation.sql](/C:/great-organico/greatorg/supabase/relational_persistence_foundation.sql).
- O ciclo mensal destrutivo foi substituido por snapshot nao-destrutivo em [supabase/monthly_cycle.sql](/C:/great-organico/greatorg/supabase/monthly_cycle.sql).

## Auditoria por modulo

### Dashboard

Estado atual:
- usa `posts`, `goals`, `story_logs`, `calendar_events`;
- usa `shared_state` para `calendar-day-views`, `calendar-day-reach`, `calendar-monthly-views-goal`, metas de comparacao e seguidores diarios.

Risco:
- agregados ainda estao em `shared_state`, nao em tabela relacional de metricas diarias.

Alvo de banco:
- `daily_account_metrics`
- `daily_story_metrics`
- views materializadas ou views por mes para cards de dashboard

### Meta Insights

Estado atual:
- busca `/api/meta-insights`;
- salva snapshot em `shared_state` com chave `meta-insights-latest`.

Risco:
- cache agregado sem historico relacional por usuario/conta;
- sem tabela de snapshots/versionamento no banco.

Alvo de banco:
- `meta_accounts`
- `meta_insights_snapshots`
- `meta_media_snapshots`
- `meta_daily_metrics`

### Calendario

Estado atual:
- CRUD operacional em `calendar_events`;
- metricas de visualizacao/alcance e meta mensal ainda em `shared_state`.

Risco:
- `visualizacoes` e `alcance` por dia nao possuem tabela propria;
- cards e calendario leem agregado sem trilha transacional.

Alvo de banco:
- `calendar_events`
- `calendar_event_assignees`
- `calendar_daily_metrics`
- `calendar_event_metrics`

### Metas

Estado atual:
- CRUD operacional em `goals` com JSONB.

Risco:
- sem normalizacao de historico de lancamentos;
- metas, progresso atual e historico coexistem num blob.

Alvo de banco:
- `goals`
- `goal_assignees`
- `goal_entries`
- `goal_metrics`

### Conteudo

Estado atual:
- CRUD operacional em `posts`;
- cruza com `goals`, `story_logs` e `calendar_events`.

Risco:
- `posts` ainda e JSONB generico;
- sem tabela dedicada para curtidas, comentarios, compartilhamentos, alcance e responsaveis.

Alvo de banco:
- `posts`
- `post_metrics_daily`
- `post_assignees`
- `post_media`

### Stories

Estado atual:
- CRUD explicito implementado nesta rodada;
- metas por mes e metricas passaram a ter repositorio dedicado;
- ainda depende de aplicacao das migrations SQL.

Alvo de banco:
- `story_logs`
- `story_goal_metrics`
- `story_metrics`

### Ideias

Estado atual:
- CRUD operacional em `ideas`.

Risco:
- estrutura JSONB unica para status, midia, responsavel e script;
- sem tabela de anexos/ativos.

Alvo de banco:
- `ideas`
- `idea_media`
- `idea_status_history`

### Historico

Estado atual:
- CRUD em `history_events`.

Risco:
- historico e derivado manualmente em varias telas;
- sem trigger central para auditar creates/updates/deletes de outros modulos.

Alvo de banco:
- `history_events`
- triggers de auditoria por tabela operacional

### Relatorios

Estado atual:
- usa `shared_state` para `monthlyArchive`, `reports-history`, `reports-overview`, `reports-rows`;
- `ReportPreview` usa `app_preferences` para estado e blocos manuais.

Risco:
- relatorios nao estao modelados como entidades de negocio;
- parte dos dados e snapshot agregado sem trilha de ownership/versionamento.

Alvo de banco:
- `reports`
- `report_sections`
- `report_cards`
- `report_snapshots`
- `report_filters`
- `report_assets`

## Tabelas faltantes ou insuficientes

Prioridade alta:

- `story_goal_metrics`
- `story_metrics`
- `calendar_daily_metrics`
- `daily_account_metrics`
- `goal_entries`
- `goal_assignees`
- `post_metrics_daily`
- `report_snapshots`
- `report_sections`
- `report_cards`

Prioridade media:

- `meta_accounts`
- `meta_insights_snapshots`
- `meta_media_snapshots`
- `idea_media`
- `post_media`
- `history_audit_queue`

## Problemas de seguranca encontrados

- [supabase/operation_data.sql](/C:/great-organico/greatorg/supabase/operation_data.sql) contem policies inseguras com `using (true)` e `with check (true)`.
- [supabase/shared_state.sql](/C:/great-organico/greatorg/supabase/shared_state.sql) foi desenhado como estado global compartilhado.
- Scripts legados de schema ainda nao refletem a exigencia universal de `user_id`, `created_at`, `updated_at`.

## Recomendacao de arquitetura alvo

Padrao minimo para todas as tabelas operacionais:

- `id`
- `user_id`
- `created_at`
- `updated_at`
- `deleted_at` quando houver soft delete

Padrao de policy:

- `using (auth.role() = 'authenticated' and auth.uid() = user_id)`
- `with check (auth.role() = 'authenticated' and auth.uid() = user_id)`

Padrao de persistencia:

- inserts/updates/delete sempre via tabela operacional;
- `shared_state` apenas para cache derivado por usuario, nunca como unica origem de verdade;
- snapshots agregados devem ter tabela propria quando representarem dado de negocio.

## Proximos passos recomendados

1. Aplicar [supabase/shared_state_user_scope.sql](/C:/great-organico/greatorg/supabase/shared_state_user_scope.sql).
2. Aplicar [supabase/stories_persistence_fix.sql](/C:/great-organico/greatorg/supabase/stories_persistence_fix.sql).
3. Aplicar [supabase/relational_persistence_foundation.sql](/C:/great-organico/greatorg/supabase/relational_persistence_foundation.sql).
4. Aplicar [supabase/monthly_cycle.sql](/C:/great-organico/greatorg/supabase/monthly_cycle.sql).
5. Manter scripts inseguros como [supabase/operation_data.sql](/C:/great-organico/greatorg/supabase/operation_data.sql) e [supabase/shared_state.sql](/C:/great-organico/greatorg/supabase/shared_state.sql) apenas como marcadores deprecados.
6. Migrar o frontend para consumir diretamente as tabelas relacionais novas, reduzindo a dependencia de JSON legado.
7. Modelar Meta Insights com snapshots e metricas diarias por usuario/conta.
8. Substituir fallbacks de mock por cargas vazias controladas e seeds de banco.
