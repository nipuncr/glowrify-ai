-- Run once in Supabase SQL Editor to upgrade an existing Glowrify database.
alter table public.apparel_catalog add column if not exists gender text not null default 'Unisex';
alter table public.apparel_catalog drop constraint if exists apparel_catalog_gender_check;
alter table public.apparel_catalog add constraint apparel_catalog_gender_check check (gender in ('Men','Women','Unisex'));
update public.apparel_catalog set gender = case
 when sku in ('GLO-001','GLO-002','GLO-003','GLO-004','GLO-005','GLO-006') then 'Men'
 when sku in ('GLO-007','GLO-008','GLO-009','GLO-010','GLO-011','GLO-012') then 'Women'
 else gender end
where gender = 'Unisex';
create index if not exists apparel_gender_idx on public.apparel_catalog(gender);
