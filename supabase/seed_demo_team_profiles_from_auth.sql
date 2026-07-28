-- Run this after creating the three demo users in Supabase Authentication > Users.
-- Recommended remote Auth users:
--   brendarayssa2706@gmail.com
--   hannahleticia13@gmail.com
--   thiagomarquesdev23@hotmail.com
-- Password for all three: Great2026!

do $$
declare
  expected_count integer := 3;
  found_count integer;
begin
  select count(*)
  into found_count
  from auth.users
  where lower(email) in (
    'brendarayssa2706@gmail.com',
    'hannahleticia13@gmail.com',
    'thiagomarquesdev23@hotmail.com'
  );

  if found_count <> expected_count then
    raise exception
      'Expected % demo users in auth.users, but found %. Create them first in Authentication > Users.',
      expected_count,
      found_count;
  end if;
end $$;

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
select
  seed.id,
  users.id as user_id,
  seed.name,
  seed.role,
  seed.avatar,
  seed.specialty,
  seed.color,
  seed.stats,
  seed.radar,
  seed.monthly_posts,
  seed.email,
  seed.avatar_url,
  seed.bio
from (
  values
    (
      1::bigint,
      'brendarayssa2706@gmail.com'::text,
      'Brenda'::text,
      'Video Maker'::text,
      'B'::text,
      'Gravacao, edicao e reels'::text,
      '#833AB4'::text,
      '{"postsCreated":42,"avgEngagement":7.8,"goalsCompleted":5,"performance":91,"punctuality":94}'::jsonb,
      '[{"subject":"Criatividade","value":92},{"subject":"Pontualidade","value":94},{"subject":"Qualidade","value":90},{"subject":"Engajamento","value":88},{"subject":"Produtividade","value":86}]'::jsonb,
      '[{"month":"Jan","posts":8},{"month":"Fev","posts":9},{"month":"Mar","posts":11},{"month":"Abr","posts":14}]'::jsonb,
      ''::text,
      'Gravacao, edicao e reels'::text
    ),
    (
      2::bigint,
      'hannahleticia13@gmail.com'::text,
      'Hannah'::text,
      'Designer de Social'::text,
      'H'::text,
      'Artes estaticas e stories'::text,
      '#E1306C'::text,
      '{"postsCreated":38,"avgEngagement":6.9,"goalsCompleted":4,"performance":88,"punctuality":96}'::jsonb,
      '[{"subject":"Criatividade","value":89},{"subject":"Pontualidade","value":96},{"subject":"Qualidade","value":91},{"subject":"Engajamento","value":82},{"subject":"Produtividade","value":87}]'::jsonb,
      '[{"month":"Jan","posts":10},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
      ''::text,
      'Artes estaticas e stories'::text
    ),
    (
      3::bigint,
      'thiagomarquesdev23@hotmail.com'::text,
      'Thiago'::text,
      'Designer Editorial'::text,
      'T'::text,
      'Carrosseis e capas'::text,
      '#FCAF45'::text,
      '{"postsCreated":35,"avgEngagement":7.2,"goalsCompleted":4,"performance":86,"punctuality":89}'::jsonb,
      '[{"subject":"Criatividade","value":86},{"subject":"Pontualidade","value":89},{"subject":"Qualidade","value":92},{"subject":"Engajamento","value":84},{"subject":"Produtividade","value":83}]'::jsonb,
      '[{"month":"Jan","posts":7},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
      ''::text,
      'Carrosseis e capas'::text
    )
) as seed(
  id,
  email,
  name,
  role,
  avatar,
  specialty,
  color,
  stats,
  radar,
  monthly_posts,
  avatar_url,
  bio
)
join auth.users as users
  on lower(users.email) = lower(seed.email)
on conflict (id) do update
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
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio;
