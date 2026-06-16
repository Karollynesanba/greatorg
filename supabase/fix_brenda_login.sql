-- Fix da conta da Brenda no Supabase
-- Execute este script no SQL Editor do projeto novo.

create extension if not exists pgcrypto;

do $$
declare
  v_email text := 'brendarayssa2706@gmail.com';
  v_password text := 'Great2026!';
  v_name text := 'Brenda';
  v_role text := 'Video Maker';
  v_user_id uuid := '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101';
begin
  select id
    into v_user_id
    from auth.users
   where lower(email) = lower(v_email)
   limit 1;

  if v_user_id is null then
    v_user_id := '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101';

    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name),
      now(),
      now()
    );
  else
    update auth.users
       set encrypted_password = crypt(v_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
           raw_user_meta_data = jsonb_build_object('name', v_name),
           updated_at = now()
     where id = v_user_id;
  end if;

  insert into public.team_profiles (
    id,
    user_id,
    name,
    role,
    avatar,
    specialty,
    color,
    stats,
    radar,
    monthly_posts,
    email,
    avatar_url,
    bio
  )
  values (
    1,
    v_user_id,
    v_name,
    v_role,
    'B',
    'Gravação, edição e reels',
    '#833AB4',
    '{"postsCreated":42,"avgEngagement":7.8,"goalsCompleted":5,"performance":91,"punctuality":94}'::jsonb,
    '[{"subject":"Criatividade","value":92},{"subject":"Pontualidade","value":94},{"subject":"Qualidade","value":90},{"subject":"Engajamento","value":88},{"subject":"Produtividade","value":86}]'::jsonb,
    '[{"month":"Jan","posts":8},{"month":"Fev","posts":9},{"month":"Mar","posts":11},{"month":"Abr","posts":14}]'::jsonb,
    v_email,
    '',
    'Gravação, edição e reels'
  )
  on conflict (email) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    role = excluded.role,
    avatar = excluded.avatar,
    specialty = excluded.specialty,
    color = excluded.color,
    stats = excluded.stats,
    radar = excluded.radar,
    monthly_posts = excluded.monthly_posts,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio;
end $$;

