# Supabase CLI Setup

This project is wired to use Supabase CLI migrations.

## Commands

```bash
npm run supabase:login
npm run supabase:link
npm run supabase:push
```

## Migration order

The automated flow pushes only the safe migration chain:

1. `schema.sql`
2. `shared_state_user_scope.sql`
3. `stories_persistence_fix.sql`
4. `relational_persistence_foundation.sql`
5. `monthly_cycle.sql`

Avoid pushing deprecated permissive scripts such as:

- `operation_data.sql`
- `shared_state.sql`
- `sql_editor_all_tabs.sql`
- `sql_editor_shared_sync.sql`

## Notes

- `supabase:link` is preconfigured for project ref `tyutrxxoziewturcoclz`.
- Demo accounts are created on demand by the `bootstrap_demo_account` RPC instead of being inserted directly during `db push`.
- The `.env` file connects the frontend. The CLI setup here is what links the repository and migrations to Supabase.
