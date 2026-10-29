-- Glowrify v2: repeatable initialization for a Supabase PostgreSQL project.
-- Run as the project database owner. No existing v1 tables are dropped.
begin;
create extension if not exists pgcrypto;
create table if not exists public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 age integer check (age between 18 and 100),
 height_cm numeric check (height_cm between 100 and 230),
 weight_kg numeric check (weight_kg between 30 and 250),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create or replace function public.glowrify_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.users(id) values(new.id) on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists glowrify_user_created on auth.users;
create trigger glowrify_user_created after insert on auth.users for each row execute function public.glowrify_new_user();
insert into public.users(id) select id from auth.users on conflict(id) do nothing;

create table if not exists public.apparel_catalog (
 id uuid primary key default gen_random_uuid(),
 sku text not null unique,
 name text not null,
 category text not null,
 gender text not null default 'Unisex' check(gender in ('Men','Women','Unisex')),
 description text not null,
 color text not null,
 material text not null,
 price_inr numeric(10,2) not null check(price_inr >= 0),
 currency text not null default 'INR' check(currency='INR'),
 image_url text not null,
 overlay_url text not null,
 occasions text[] not null check(cardinality(occasions)>0),
 body_shapes text[] not null check(body_shapes <@ array['balanced','shoulder-led','hip-led']::text[] and cardinality(body_shapes)>0),
 min_temp numeric not null,
 max_temp numeric not null check(max_temp>=min_temp),
 water_resistant boolean not null default false,
 sizes text[] not null default array['S','M','L','XL'],
 anchors jsonb not null check(anchors ?& array['left_shoulder','right_shoulder','hip']),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.apparel_catalog add column if not exists gender text not null default 'Unisex';
alter table public.apparel_catalog drop constraint if exists apparel_catalog_gender_check;
alter table public.apparel_catalog add constraint apparel_catalog_gender_check check (gender in ('Men','Women','Unisex'));
update public.apparel_catalog set gender = case
 when sku in ('GLO-001','GLO-002','GLO-003','GLO-004','GLO-005','GLO-006') then 'Men'
 when sku in ('GLO-007','GLO-008','GLO-009','GLO-010','GLO-011','GLO-012') then 'Women'
 else gender end
where gender = 'Unisex';
create index if not exists apparel_gender_idx on public.apparel_catalog(gender);
create index if not exists apparel_occasions_idx on public.apparel_catalog using gin(occasions);
create index if not exists apparel_shapes_idx on public.apparel_catalog using gin(body_shapes);

create table if not exists public.style_sessions (
 id uuid primary key,
 user_id uuid not null references public.users(id) on delete cascade,
 image_path text not null,
 silhouette text not null check(silhouette in ('balanced','shoulder-led','hip-led')),
 shoulder_hip_ratio numeric not null check(shoulder_hip_ratio>0),
 confidence numeric not null check(confidence between 0 and 1),
 landmarks jsonb not null check(jsonb_typeof(landmarks)='array' and jsonb_array_length(landmarks)=33),
 world_landmarks jsonb not null check(jsonb_typeof(world_landmarks)='array' and jsonb_array_length(world_landmarks)=33),
 profile jsonb not null,
 occasion text not null check(occasion in ('Casual','Formal','Party','Work','Travel','Active')),
 weather jsonb not null,
 consent_version text not null,
 created_at timestamptz not null default now(),
 unique(id,user_id),
 check(split_part(image_path,'/',1)=user_id::text)
);
create index if not exists sessions_user_idx on public.style_sessions(user_id,created_at desc);
create table if not exists public.recommendations (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null,
 user_id uuid not null references public.users(id) on delete cascade,
 apparel_id uuid not null references public.apparel_catalog(id) on delete restrict,
 rank integer not null check(rank>0),
 score numeric not null,
 reasons jsonb not null check(jsonb_typeof(reasons)='array'),
 price_inr numeric(10,2) not null check(price_inr>=0),
 currency text not null default 'INR' check(currency='INR'),
 created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.style_sessions(id,user_id) on delete cascade,
 unique(session_id,apparel_id), unique(session_id,rank)
);
create index if not exists recommendations_user_idx on public.recommendations(user_id,session_id);
create table if not exists public.glowrify_quotas (
 user_id uuid not null references public.users(id) on delete cascade,
 day date not null,
 used integer not null check(used between 1 and 12),
 primary key(user_id,day)
);

alter table public.users enable row level security;
alter table public.apparel_catalog enable row level security;
alter table public.style_sessions enable row level security;
alter table public.recommendations enable row level security;
alter table public.glowrify_quotas enable row level security;
drop policy if exists own_user on public.users;
create policy own_user on public.users for select to authenticated using(id=(select auth.uid()));
drop policy if exists catalog_read on public.apparel_catalog;
create policy catalog_read on public.apparel_catalog for select to authenticated using(active);
drop policy if exists own_session_read on public.style_sessions;
create policy own_session_read on public.style_sessions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_session_delete on public.style_sessions;
create policy own_session_delete on public.style_sessions for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists own_recommendations on public.recommendations;
create policy own_recommendations on public.recommendations for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.users,public.apparel_catalog,public.style_sessions,public.recommendations,public.glowrify_quotas from anon,authenticated;
grant select on public.users,public.apparel_catalog,public.style_sessions,public.recommendations to authenticated;
grant delete on public.style_sessions to authenticated;

create or replace function public.glowrify_consume_quota() returns boolean
language plpgsql security definer set search_path='' as $$
declare accepted integer;
begin
 if auth.uid() is null then return false; end if;
 insert into public.glowrify_quotas(user_id,day,used) values(auth.uid(),(now() at time zone 'UTC')::date,1)
 on conflict(user_id,day) do update set used=public.glowrify_quotas.used+1 where public.glowrify_quotas.used<12
 returning used into accepted;
 return accepted is not null;
end $$;
revoke all on function public.glowrify_consume_quota() from public,anon;
grant execute on function public.glowrify_consume_quota() to authenticated;

-- Save profile, analysis, and ranked recommendation records atomically.
create or replace function public.glowrify_save_session(
 p_id uuid,p_image_path text,p_profile jsonb,p_vision jsonb,p_weather jsonb,p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); item jsonb; ordinal bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if split_part(p_image_path,'/',1) <> uid::text then raise exception 'Invalid image ownership'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.style_sessions where id=p_id and user_id=uid) then return p_id; end if;
 update public.users set age=(p_profile->>'age')::int,height_cm=(p_profile->>'height_cm')::numeric,
 weight_kg=(p_profile->>'weight_kg')::numeric,updated_at=now() where id=uid;
 insert into public.style_sessions(id,user_id,image_path,silhouette,shoulder_hip_ratio,confidence,landmarks,world_landmarks,profile,occasion,weather,consent_version)
 values(p_id,uid,p_image_path,p_vision->>'silhouette',(p_vision->>'shoulder_hip_ratio')::numeric,
 (p_vision->>'confidence')::numeric,p_vision->'landmarks',p_vision->'world_landmarks',p_profile,p_profile->>'occasion',p_weather,'2026-10-22');
 for item,ordinal in select value, ordinality from jsonb_array_elements(p_items) with ordinality loop
  insert into public.recommendations(session_id,user_id,apparel_id,rank,score,reasons,price_inr)
  select p_id,uid,c.id,ordinal::int,(item->>'score')::numeric,item->'reasons',c.price_inr
  from public.apparel_catalog c where c.id=(item->>'id')::uuid and c.active;
 end loop;
 return p_id;
end $$;
revoke all on function public.glowrify_save_session(uuid,text,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.glowrify_save_session(uuid,text,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.glowrify_new_user() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('glowrify-photos','glowrify-photos',false,12582912,array['image/png']),
 ('glowrify-garments','glowrify-garments',true,8388608,array['image/png','image/webp','image/svg+xml'])
on conflict(id) do nothing;
drop policy if exists glowrify_photo_read on storage.objects;
create policy glowrify_photo_read on storage.objects for select to authenticated using(bucket_id='glowrify-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists glowrify_photo_write on storage.objects;
create policy glowrify_photo_write on storage.objects for insert to authenticated with check(bucket_id='glowrify-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists glowrify_photo_delete on storage.objects;
create policy glowrify_photo_delete on storage.objects for delete to authenticated using(bucket_id='glowrify-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
