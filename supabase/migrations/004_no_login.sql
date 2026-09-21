-- Buyers no longer need an account. Orders carry the buyer details themselves.
alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists email text;
alter table public.orders add column if not exists full_name text;
alter table public.orders add column if not exists company text;
alter table public.orders add column if not exists website text;
alter table public.orders add column if not exists terms_accepted_at timestamptz;
alter table public.slots add column if not exists reserved_key text;
alter table public.slots add column if not exists buyer_company text;

create or replace function public.reserve_slot(p_slot_key text, p_reserved_key text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.slots%rowtype; v_price integer;
begin
  select * into v from public.slots where key = p_slot_key for update;
  if not found then raise exception 'slot_not_found'; end if;
  if v.status <> 'open' then raise exception 'slot_sold'; end if;
  if p_slot_key = 'prime' and exists (select 1 from public.slots o where o.key <> 'prime' and o.status <> 'sold') then
    raise exception 'prime_locked';
  end if;
  if v.reserved_until is not null and v.reserved_until > now() and v.reserved_key is distinct from p_reserved_key then
    raise exception 'slot_reserved';
  end if;
  v_price := public.ladder_price(v.min_bid_cents, p_slot_key);
  update public.slots set reserved_key = p_reserved_key, reserved_until = now() + interval '15 minutes' where key = p_slot_key;
  return json_build_object('price_cents', v_price, 'label', v.label);
end $$;
drop function if exists public.reserve_slot(text, uuid);
revoke all on function public.reserve_slot(text, text) from public, anon, authenticated;
