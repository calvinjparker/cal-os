-- Wardrobe: Calvin's clothes and outfits, used by "what to wear" and the Style picks.
-- Only signed-in, allowlisted users can read or write (RLS).

create table if not exists public.wardrobe_items (
  id bigint generated always as identity primary key,
  category text not null,              -- Shirts, Tees and polos, Outerwear, ...
  name text not null,
  tags text[] not null default '{}',
  notes text not null default '',      -- what it pairs with
  status text not null default 'owned' check (status in ('owned', 'on_order', 'donate')),
  svg text,                            -- flat drawing; uses the shared patterns in wardrobe_assets 'svg_defs'
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wardrobe_outfits (
  id bigint generated always as identity primary key,
  name text not null,
  occasion text not null default '',
  pieces jsonb not null default '[]',  -- [{name, owned, link, price}]
  notes text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wardrobe_assets (
  key text primary key,
  value text not null
);

alter table public.wardrobe_items enable row level security;
alter table public.wardrobe_outfits enable row level security;
alter table public.wardrobe_assets enable row level security;

-- Keep this list in step with ALLOWED_EMAILS.
create or replace function public.is_allowed() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in ('calvin@calvinparker.com')
$$;

do $$
declare t text;
begin
  foreach t in array array['wardrobe_items', 'wardrobe_outfits', 'wardrobe_assets'] loop
    execute format('drop policy if exists "allowlisted users" on public.%I', t);
    execute format(
      'create policy "allowlisted users" on public.%I for all to authenticated using (public.is_allowed()) with check (public.is_allowed())',
      t
    );
  end loop;
end $$;
