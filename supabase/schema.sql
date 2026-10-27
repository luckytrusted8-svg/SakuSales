-- ENUM
create type payment_method as enum ('qris', 'cash');
create type order_status as enum ('baru', 'menunggu_bayar', 'lunas', 'diproses', 'selesai', 'batal');

-- MASTER PRODUK
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,                              -- contoh: "Isi 8 + 1 glaze"
  pieces int not null check (pieces > 0),
  price int not null check (price >= 0),           -- harga dasar dalam Rupiah
  included_glaze int not null default 1,           -- jumlah glaze yang sudah termasuk harga
  extra_glaze_price int not null default 2000,     -- tambahan per glaze di atas yang termasuk
  active boolean not null default true
);

create table glazes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hpp int not null default 0,                      -- biaya bahan per glaze
  active boolean not null default true
);

create table toppings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  extra_price int not null default 2000,           -- tambahan harga jual
  hpp int not null default 0,                      -- biaya bahan per topping
  active boolean not null default true
);

-- HPP DARI BAHAN BAKU
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,                              -- gram, ml, pcs
  cost_per_unit numeric(12,2) not null check (cost_per_unit >= 0)
);

create table recipes (
  size_id uuid not null references sizes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  qty numeric(12,3) not null check (qty > 0),
  primary key (size_id, ingredient_id)
);

-- PO DAN PESANAN
create table po_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  open boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references po_sessions(id) on delete cascade,
  buyer_name text not null,
  buyer_wa text not null,
  address text,
  pickup boolean not null default false,           -- ambil sendiri
  payment payment_method not null,
  note text,
  status order_status not null default 'baru',
  total int not null default 0,
  total_hpp int not null default 0,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  size_id uuid references sizes(id) on delete set null,
  product_name text not null,                      -- snapshot
  size_name text not null,                         -- snapshot
  qty int not null check (qty > 0),
  unit_price int not null,                         -- snapshot harga satuan
  unit_hpp int not null,                           -- snapshot HPP satuan
  glaze_names text[] not null default '{}',
  topping_names text[] not null default '{}',
  note text
);

-- FUNGSI PEMBUATAN PESANAN (harga dan HPP dihitung di server)
create or replace function create_order(p_slug text, p_buyer jsonb, p_items jsonb)
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
  select * into v_po from po_sessions
   where slug = p_slug and open = true and (closes_at is null or closes_at > now());
  if not found then raise exception 'PO tidak aktif'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong'; end if;

  insert into orders (po_id, buyer_name, buyer_wa, address, pickup, payment, note)
  values (
    v_po.id,
    p_buyer->>'name',
    p_buyer->>'wa',
    p_buyer->>'address',
    coalesce((p_buyer->>'pickup')::boolean, false),
    (p_buyer->>'payment')::payment_method,
    p_buyer->>'note'
  )
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into v_size from sizes where id = (it->>'size_id')::uuid and active;
    if not found then raise exception 'Ukuran tidak tersedia'; end if;

    v_qty := (it->>'qty')::int;
    if v_qty < 1 then raise exception 'Jumlah tidak valid'; end if;

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

    v_total := v_total + v_unit_price * v_qty;
    v_hpp_total := v_hpp_total + v_unit_hpp * v_qty;
  end loop;

  update orders set total = v_total, total_hpp = v_hpp_total where id = v_order;
  return v_order;
end;
$$;

revoke all on function create_order(text, jsonb, jsonb) from public;
grant execute on function create_order(text, jsonb, jsonb) to anon, authenticated;

-- ROW LEVEL SECURITY
alter table products      enable row level security;
alter table sizes         enable row level security;
alter table glazes        enable row level security;
alter table toppings      enable row level security;
alter table ingredients   enable row level security;
alter table recipes       enable row level security;
alter table po_sessions   enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;

-- Pembeli (anon): hanya baca master aktif dan PO
create policy "baca produk aktif" on products for select to anon using (active);
create policy "baca ukuran aktif" on sizes for select to anon using (active);
create policy "baca glaze aktif" on glazes for select to anon using (active);
create policy "baca topping aktif" on toppings for select to anon using (active);
create policy "baca PO" on po_sessions for select to anon using (true);

-- Penjual (authenticated): akses penuh (satu penjual per instalasi)
create policy "penjual kelola produk" on products for all to authenticated using (true) with check (true);
create policy "penjual kelola ukuran" on sizes for all to authenticated using (true) with check (true);
create policy "penjual kelola glaze" on glazes for all to authenticated using (true) with check (true);
create policy "penjual kelola topping" on toppings for all to authenticated using (true) with check (true);
create policy "penjual kelola bahan" on ingredients for all to authenticated using (true) with check (true);
create policy "penjual kelola resep" on recipes for all to authenticated using (true) with check (true);
create policy "penjual kelola PO" on po_sessions for all to authenticated using (true) with check (true);
create policy "penjual kelola pesanan" on orders for all to authenticated using (true) with check (true);
create policy "penjual kelola item" on order_items for all to authenticated using (true) with check (true);

-- Realtime untuk daftar pesanan
alter publication supabase_realtime add table orders;
