-- Laundry tracking: log what was worn each day; tops go to the wash after one wear,
-- heavier pieces after a few, shoes/outerwear/accessories only when marked by hand.

alter table public.wardrobe_items
  add column if not exists in_laundry boolean not null default false,
  add column if not exists wears_since_wash int not null default 0,
  add column if not exists wears_per_wash int not null default 0;  -- 0 = never goes to the wash automatically

update public.wardrobe_items set wears_per_wash = case category
  when 'Shirts' then 1
  when 'Tees and polos' then 1
  when 'Sweaters and layers' then 3
  when 'Jeans and pants' then case when name ilike '%shorts%' or name ilike '%sweat%' or name ilike '%jogger%' then 2 else 4 end
  else 0 end
where wears_per_wash = 0;

create table if not exists public.wardrobe_wears (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.wardrobe_items (id) on delete cascade,
  worn_on date not null,
  created_at timestamptz not null default now(),
  unique (item_id, worn_on)
);

alter table public.wardrobe_wears enable row level security;
drop policy if exists "allowlisted users" on public.wardrobe_wears;
create policy "allowlisted users" on public.wardrobe_wears for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());

-- Log a day's outfit: records each wear once per day and moves pieces to the laundry
-- once they've hit their wears-per-wash. Runs as the caller, so RLS still applies.
create or replace function public.wear_items(item_ids bigint[], day date) returns void
language plpgsql security invoker as $$
declare new_ids bigint[];
begin
  with ins as (
    insert into public.wardrobe_wears (item_id, worn_on)
    select unnest(item_ids), day
    on conflict (item_id, worn_on) do nothing
    returning item_id
  )
  select coalesce(array_agg(item_id), '{}') into new_ids from ins;

  update public.wardrobe_items
     set wears_since_wash = wears_since_wash + 1,
         in_laundry = in_laundry or (wears_per_wash > 0 and wears_since_wash + 1 >= wears_per_wash),
         updated_at = now()
   where id = any (new_ids);
end $$;
