-- Pricing psychology: higher base prices, a price ladder (+15% after every 5 sold),
-- Prime locked until the other 17 are gone.

update public.slots set min_bid_cents = 198700 where key = 'hero';
update public.slots set min_bid_cents = 118700 where key in ('strip-1','strip-2');
update public.slots set min_bid_cents = 128700 where key in ('center-top','center-bottom');
update public.slots set min_bid_cents = 68700 where key like 'sq-%';
update public.slots set min_bid_cents = 58700 where key like 'box-%';
update public.slots set min_bid_cents = 48700 where key like 'wide-%';
update public.slots set min_bid_cents = 870000 where key = 'prime';

-- how many normal spots are sold
create or replace function public.sold_count()
returns integer language sql stable as $$
  select count(*)::int from public.slots where status = 'sold' and key <> 'prime';
$$;

-- ladder: +15% for every 5 spots sold, rounded to a price ending in 7
create or replace function public.ladder_price(p_base integer, p_key text)
returns integer language sql stable as $$
  select case
    when p_key = 'prime' then p_base
    else (floor((p_base * (1 + 0.15 * floor(public.sold_count() / 5.0))) / 1000.0) * 1000 + 700)::int
  end;
$$;

drop view if exists public.slots_public;
create view public.slots_public with (security_invoker = false) as
select
  s.key, s.label, s.format, s.width_cm, s.height_cm, s.x_mm, s.y_mm,
  public.ladder_price(s.min_bid_cents, s.key) as price_cents,
  s.status, s.kind, s.sort_order,
  (s.status = 'open' and s.reserved_until is not null and s.reserved_until > now()) as reserved,
  (s.key = 'prime' and exists (select 1 from public.slots o where o.key <> 'prime' and o.status <> 'sold')) as locked,
  public.sold_count() as sold_count
from public.slots s;
grant select on public.slots_public to anon, authenticated;

create or replace function public.reserve_slot(p_slot_key text, p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v public.slots%rowtype; v_price integer;
begin
  select * into v from public.slots where key = p_slot_key for update;
  if not found then raise exception 'slot_not_found'; end if;
  if v.status <> 'open' then raise exception 'slot_sold'; end if;
  if p_slot_key = 'prime' and exists (select 1 from public.slots o where o.key <> 'prime' and o.status <> 'sold') then
    raise exception 'prime_locked';
  end if;
  if v.reserved_until is not null and v.reserved_until > now() and v.reserved_by <> p_user_id then
    raise exception 'slot_reserved';
  end if;
  v_price := public.ladder_price(v.min_bid_cents, p_slot_key);
  update public.slots set reserved_by = p_user_id, reserved_until = now() + interval '10 minutes' where key = p_slot_key;
  return json_build_object('price_cents', v_price, 'label', v.label);
end $$;
revoke all on function public.reserve_slot(text, uuid) from public, anon, authenticated;
