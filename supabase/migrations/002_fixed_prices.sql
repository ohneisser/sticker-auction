-- Switch from auction to fixed prices, first come first served.

alter table public.slots add column if not exists reserved_by uuid references public.profiles(id);
alter table public.slots add column if not exists reserved_until timestamptz;
alter table public.slots drop constraint if exists slots_status_check;
alter table public.slots add constraint slots_status_check check (status in ('open','sold','closed','paid','failed','prize'));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null references public.slots(key),
  user_id uuid not null references public.profiles(id),
  amount_cents integer not null,
  design_option text not null default 'as_is' check (design_option in ('as_is','custom')),
  design_fee_cents integer not null default 0,
  design_brief text,
  logo_path text,
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);
create index if not exists orders_slot_idx on public.orders(slot_key, created_at desc);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
alter table public.orders enable row level security;
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders for select using (auth.uid() = user_id);

drop view if exists public.slots_public;
create view public.slots_public with (security_invoker = false) as
select
  s.key, s.label, s.format, s.width_cm, s.height_cm, s.x_mm, s.y_mm,
  s.min_bid_cents as price_cents, s.status, s.kind, s.sort_order,
  (s.status = 'open' and s.reserved_until is not null and s.reserved_until > now()) as reserved
from public.slots s;
grant select on public.slots_public to anon, authenticated;

-- reserve a slot for 15 minutes while the buyer is in checkout. Atomic.
create or replace function public.reserve_slot(p_slot_key text, p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v public.slots%rowtype;
begin
  select * into v from public.slots where key = p_slot_key for update;
  if not found then raise exception 'slot_not_found'; end if;
  if v.status <> 'open' then raise exception 'slot_sold'; end if;
  if v.reserved_until is not null and v.reserved_until > now() and v.reserved_by <> p_user_id then
    raise exception 'slot_reserved';
  end if;
  update public.slots set reserved_by = p_user_id, reserved_until = now() + interval '15 minutes' where key = p_slot_key;
  return json_build_object('price_cents', v.min_bid_cents, 'label', v.label);
end $$;
revoke all on function public.reserve_slot(text, uuid) from public, anon, authenticated;

-- Prime becomes a normal spot with a high fixed price
update public.slots set kind = 'auction', status = 'open', min_bid_cents = 498700 where key = 'prime';
update public.slots set current_bid_cents = null, current_bidder = null, reserved_by = null, reserved_until = null;
