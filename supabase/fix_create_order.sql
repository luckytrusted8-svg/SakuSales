-- ==============================================================================
-- UPDATE FUNGSI create_order SUPABASE (SINKRONISASI NOTIFIKASI NOMINAL AKURAT)
-- Salin dan jalankan skrip ini di SQL Editor Dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

create or replace function create_order(
  p_slug text,
  p_buyer jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po po_sessions;
  v_order uuid;
  v_size sizes;
  it jsonb;
  v_qty int;
  v_gids uuid[];
  v_tids uuid[];
  v_gcount int;
  v_tx int; v_th int; v_gh int; v_rh int;
  v_gnames text[]; v_tnames text[];
  v_unit_price int; v_unit_hpp int;
  v_total int := 0; v_hpp_total int := 0;
begin
  -- 1. Validasi Sesi PO dan isi keranjang
  select * into v_po from po_sessions
   where slug = p_slug and open = true and (closes_at is null or closes_at > now());
  if not found then raise exception 'PO tidak aktif'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong'; end if;

  -- 2. Pra-hitung total belanja sebelum insert orders agar event Realtime INSERT memuat total akurat (bukan Rp 0)
  for it in select * from jsonb_array_elements(p_items) loop
    select * into v_size from sizes where id = (it->>'size_id')::uuid and active;
    if not found then raise exception 'Ukuran tidak tersedia'; end if;

    v_qty := (it->>'qty')::int;
    if v_qty < 1 then raise exception 'Jumlah tidak valid'; end if;

    v_gids := array(select jsonb_array_elements_text(coalesce(it->'glaze_ids', '[]'::jsonb)))::uuid[];
    v_tids := array(select jsonb_array_elements_text(coalesce(it->'topping_ids', '[]'::jsonb)))::uuid[];
    v_gcount := coalesce(cardinality(v_gids), 0);

    select coalesce(sum(extra_price), 0) into v_tx
      from toppings where id = any(v_tids) and active;

    v_unit_price := v_size.price
                  + greatest(0, v_gcount - v_size.included_glaze) * v_size.extra_glaze_price
                  + v_tx;

    v_total := v_total + (v_unit_price * v_qty);
  end loop;

  -- 3. Insert ke orders LANGSUNG DENGAN TOTAL FINAL
  -- Dengan begini, Supabase Realtime broadcast event INSERT langsung bernilai total harga asli, bukan Rp 0!
  insert into orders (po_id, buyer_name, buyer_wa, address, pickup, payment, note, total, total_hpp)
  values (
    v_po.id,
    p_buyer->>'name',
    p_buyer->>'wa',
    p_buyer->>'address',
    coalesce((p_buyer->>'pickup')::boolean, false),
    (p_buyer->>'payment')::payment_method,
    p_buyer->>'note',
    v_total,
    0
  )
  returning id into v_order;

  -- 4. Insert rincian order_items dan hitung HPP
  for it in select * from jsonb_array_elements(p_items) loop
    select * into v_size from sizes where id = (it->>'size_id')::uuid and active;
    v_qty := (it->>'qty')::int;
    v_gids := array(select jsonb_array_elements_text(coalesce(it->'glaze_ids', '[]'::jsonb)))::uuid[];
    v_tids := array(select jsonb_array_elements_text(coalesce(it->'topping_ids', '[]'::jsonb)))::uuid[];
    v_gcount := coalesce(cardinality(v_gids), 0);

    select coalesce(sum(hpp), 0), coalesce(array_agg(name), '{}')
      into v_gh, v_gnames
      from glazes where id = any(v_gids) and active;

    select coalesce(sum(extra_price), 0), coalesce(sum(hpp), 0), coalesce(array_agg(name), '{}')
      into v_tx, v_th, v_tnames
      from toppings where id = any(v_tids) and active;

    select coalesce(round(sum(r.qty * i.cost_per_unit)), 0)::int
      into v_rh
      from recipes r join ingredients i on i.id = r.ingredient_id
     where r.size_id = v_size.id;

    v_unit_price := v_size.price
                  + greatest(0, v_gcount - v_size.included_glaze) * v_size.extra_glaze_price
                  + v_tx;
    v_unit_hpp := v_rh + v_gh + v_th;

    insert into order_items (order_id, size_id, product_name, size_name, qty,
                             unit_price, unit_hpp, glaze_names, topping_names, note)
    values (
      v_order, v_size.id,
      (select name from products where id = v_size.product_id),
      v_size.name, v_qty, v_unit_price, v_unit_hpp,
      v_gnames, v_tnames, it->>'note'
    );

    v_hpp_total := v_hpp_total + (v_unit_hpp * v_qty);
  end loop;

  -- 5. Update total_hpp order
  update orders set total_hpp = v_hpp_total where id = v_order;
  return v_order;
end;
$$;

revoke all on function create_order(text, jsonb, jsonb) from public;
grant execute on function create_order(text, jsonb, jsonb) to anon, authenticated;

