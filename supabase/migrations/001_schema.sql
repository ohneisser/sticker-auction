-- Sticker auction schema. Run once in the Supabase SQL editor (or apply as a migration).

create extension if not exists pgcrypto;

-- ---------- profiles: one per signed up bidder (your lead list) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company text,
  website text,
  role text,
  stripe_customer_id text unique,
  marketing_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company, website, role, marketing_opt_in)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'website',
    new.raw_user_meta_data->>'role',
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, true)
  ) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- slots ----------
create table if not exists public.slots (
  key text primary key,
  label text not null,
  format text not null,              -- '1:1', '4:3', '16:9'
  width_cm numeric not null,
  height_cm numeric not null,
  x_mm numeric not null,
  y_mm numeric not null,
  min_bid_cents integer not null,
  current_bid_cents integer,
  current_bidder uuid references public.profiles(id),
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open','prize','closed','paid','failed')),
  kind text not null default 'auction' check (kind in ('auction','prize')),
  sort_order integer not null default 0
);

-- ---------- bids ----------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null references public.slots(key),
  user_id uuid not null references public.profiles(id),
  amount_cents integer not null,
  design_option text not null default 'as_is' check (design_option in ('as_is','custom')),
  design_fee_cents integer not null default 0,
  design_brief text,
  logo_path text,
  status text not null default 'leading' check (status in ('leading','outbid','won','paid','failed')),
  stripe_payment_method_id text not null,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);
create index if not exists bids_slot_idx on public.bids(slot_key, created_at desc);
create index if not exists bids_user_idx on public.bids(user_id, created_at desc);

-- ---------- prime raffle tickets ----------
create table if not exists public.prime_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  quantity integer not null check (quantity > 0),
  amount_cents integer not null default 0,        -- 0 for free / manual entries
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists prime_tickets_user_idx on public.prime_tickets(user_id);
alter table public.prime_tickets enable row level security;
drop policy if exists "own tickets read" on public.prime_tickets;
create policy "own tickets read" on public.prime_tickets for select using (auth.uid() = user_id);

-- ---------- public view: amounts and counts only, never who is bidding ----------
create or replace view public.slots_public as
select
  s.key, s.label, s.format, s.width_cm, s.height_cm, s.x_mm, s.y_mm,
  s.min_bid_cents, s.current_bid_cents, s.ends_at, s.status, s.kind, s.sort_order,
  (select count(*) from public.bids b where b.slot_key = s.key) as bid_count
from public.slots s;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.slots enable row level security;
alter table public.bids enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "slots public read" on public.slots;
create policy "slots public read" on public.slots for select using (true);
drop policy if exists "own bids read" on public.bids;
create policy "own bids read" on public.bids for select using (auth.uid() = user_id);
grant select on public.slots_public to anon, authenticated;

-- ---------- logo uploads: private bucket, users write to their own folder ----------
insert into storage.buckets (id, name, public) values ('logos', 'logos', false) on conflict (id) do nothing;
drop policy if exists "logo upload own folder" on storage.objects;
create policy "logo upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "logo read own folder" on storage.objects;
create policy "logo read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- place_bid: atomic, race safe ----------
-- amount >= max(min_bid, current + max($25, 10%)); a bid in the last 10 min extends the slot by 10 min
create or replace function public.place_bid(
  p_slot_key text, p_user_id uuid, p_amount_cents integer, p_payment_method_id text,
  p_design_option text, p_design_fee_cents integer, p_design_brief text, p_logo_path text
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_slot public.slots%rowtype;
  v_prev_bidder uuid;
  v_min integer;
  v_bid_id uuid;
  v_new_ends timestamptz;
begin
  select * into v_slot from public.slots where key = p_slot_key for update;
  if not found then raise exception 'slot_not_found'; end if;
  if v_slot.status <> 'open' or now() >= v_slot.ends_at then raise exception 'slot_closed'; end if;

  if v_slot.current_bid_cents is null then
    v_min := v_slot.min_bid_cents;
  else
    v_min := v_slot.current_bid_cents + greatest(2500, (v_slot.current_bid_cents * 10) / 100);
  end if;
  if p_amount_cents < v_min then raise exception 'bid_too_low:%', v_min; end if;
  if v_slot.current_bidder = p_user_id then raise exception 'already_leading'; end if;

  v_prev_bidder := v_slot.current_bidder;
  update public.bids set status = 'outbid' where slot_key = p_slot_key and status = 'leading';

  insert into public.bids (slot_key, user_id, amount_cents, stripe_payment_method_id, design_option, design_fee_cents, design_brief, logo_path)
  values (p_slot_key, p_user_id, p_amount_cents, p_payment_method_id, p_design_option, p_design_fee_cents, p_design_brief, p_logo_path)
  returning id into v_bid_id;

  v_new_ends := v_slot.ends_at;
  if v_slot.ends_at - now() < interval '10 minutes' then v_new_ends := now() + interval '10 minutes'; end if;

  update public.slots set current_bid_cents = p_amount_cents, current_bidder = p_user_id, ends_at = v_new_ends where key = p_slot_key;

  return json_build_object('bid_id', v_bid_id, 'ends_at', v_new_ends, 'prev_bidder', v_prev_bidder);
end $$;

revoke all on function public.place_bid(text, uuid, integer, text, text, integer, text, text) from public, anon, authenticated;

-- ---------- seed: MacBook Pro 16 lid, 356 x 248 mm, 17 spots (16 sold, 1 raffled), Apple logo in the middle stays free ----------
-- Positions are mm from the top left of the lid. ends_at = 7 days from when you run this.
-- Prime is the 8 x 8 cm square dead center, over the Apple logo. Never sold: unlocked once every other spot is paid, then raffled via tickets.
insert into public.slots (key, label, format, width_cm, height_cm, x_mm, y_mm, min_bid_cents, ends_at, sort_order, kind, status) values
  ('prime','Prime','1:1',8,8,138,84,0,now() + interval '7 days',0,'prize','prize'),
  ('hero','Hero','4:3',12.4,9.3,8,8,150000,now() + interval '7 days',1,'auction','open'),
  ('strip-1','Strip 1','3:1',12.4,4,224,8,60000,now() + interval '7 days',2,'auction','open'),
  ('strip-2','Strip 2','3:1',12.4,4,224,52,60000,now() + interval '7 days',3,'auction','open'),
  ('center-top','Center top','1:1',7.4,7.4,141,8,70000,now() + interval '7 days',4,'auction','open'),
  ('center-bottom','Center bottom','4:3',8.4,6.3,136,177,70000,now() + interval '7 days',5,'auction','open'),
  ('sq-1','Square 1','1:1',6,6,8,105,40000,now() + interval '7 days',6,'auction','open'),
  ('sq-2','Square 2','1:1',6,6,72,181,40000,now() + interval '7 days',7,'auction','open'),
  ('sq-3','Square 3','1:1',6,6,224,96,40000,now() + interval '7 days',8,'auction','open'),
  ('box-1','Box 1','4:3',6,4.5,288,96,35000,now() + interval '7 days',9,'auction','open'),
  ('box-2','Box 2','4:3',6,4.5,288,189,35000,now() + interval '7 days',10,'auction','open'),
  ('wide-1','Wide 1','16:9',6,3.4,72,105,30000,now() + interval '7 days',11,'auction','open'),
  ('wide-2','Wide 2','16:9',6,3.4,72,143,30000,now() + interval '7 days',12,'auction','open'),
  ('wide-3','Wide 3','16:9',6,3.4,8,169,30000,now() + interval '7 days',13,'auction','open'),
  ('wide-4','Wide 4','16:9',6,3.4,8,207,30000,now() + interval '7 days',14,'auction','open'),
  ('wide-5','Wide 5','16:9',6,3.4,224,160,30000,now() + interval '7 days',15,'auction','open'),
  ('wide-6','Wide 6','16:9',6,3.4,224,198,30000,now() + interval '7 days',16,'auction','open')
on conflict (key) do nothing;
