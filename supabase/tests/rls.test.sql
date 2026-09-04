begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

-- Test identities. Supabase's local Auth schema allows minimal users for RLS tests.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

-- Seed rows as the database owner so assertions can focus on RLS behavior.
insert into public.vehicles (id, user_id, plate, make, model)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'AA111AA', 'Fiat', 'Panda'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'BB222BB', 'Ford', 'Focus');

insert into public.vehicle_documents (id, user_id, vehicle_id, type, expires_on)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Bollo', '2027-01-31'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Revisione', '2027-06-30');

-- Grants: signed-out callers get no table access; signed-in callers get CRUD.
select ok(
  not has_table_privilege('anon', 'public.vehicles', 'select,insert,update,delete'),
  'anon has no CRUD privileges on vehicles'
);
select ok(
  not has_table_privilege('anon', 'public.vehicle_documents', 'select,insert,update,delete'),
  'anon has no CRUD privileges on vehicle_documents'
);
select ok(
  has_table_privilege('authenticated', 'public.vehicles', 'select,insert,update,delete'),
  'authenticated has CRUD privileges on vehicles'
);
select ok(
  has_table_privilege('authenticated', 'public.vehicle_documents', 'select,insert,update,delete'),
  'authenticated has CRUD privileges on vehicle_documents'
);

-- Anonymous role is denied before RLS is evaluated.
set local role anon;
select throws_ok($$select * from public.vehicles$$, '42501', null, 'anon cannot select vehicles');
select throws_ok($$select * from public.vehicle_documents$$, '42501', null, 'anon cannot select documents');

-- Owner identity.
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select count(*) from public.vehicles$$,
  array[1::bigint],
  'owner sees only their vehicle'
);
select results_eq(
  $$select count(*) from public.vehicle_documents$$,
  array[1::bigint],
  'owner sees only their document'
);

-- Defaults must derive ownership from auth.uid().
select results_eq(
  $$insert into public.vehicles (plate, make) values ('CC333CC', 'Toyota') returning user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'vehicle insert defaults user_id to auth.uid()'
);
select results_eq(
  $$insert into public.vehicle_documents (vehicle_id, type, expires_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Assicurazione', '2027-02-15') returning user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'document insert defaults user_id to auth.uid()'
);

-- An owner can mutate their own rows.
select results_eq(
  $$update public.vehicles set make = 'Fiat Updated' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning make$$,
  array['Fiat Updated'::text],
  'owner can update own vehicle'
);
select results_eq(
  $$update public.vehicle_documents set notes = 'updated' where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning notes$$,
  array['updated'::text],
  'owner can update own document'
);

-- Another user's rows are invisible to USING policies: no error, zero rows affected.
select is_empty(
  $$update public.vehicles set make = 'Hacked' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id$$,
  'owner cannot update another user vehicle'
);
select is_empty(
  $$delete from public.vehicles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id$$,
  'owner cannot delete another user vehicle'
);
select is_empty(
  $$update public.vehicle_documents set notes = 'Hacked' where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' returning id$$,
  'owner cannot update another user document'
);
select is_empty(
  $$delete from public.vehicle_documents where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' returning id$$,
  'owner cannot delete another user document'
);

-- WITH CHECK rejects forged ownership explicitly.
select throws_ok(
  $$insert into public.vehicles (user_id, plate) values ('22222222-2222-2222-2222-222222222222', 'DD444DD')$$,
  '42501',
  null,
  'owner cannot forge another user_id on vehicle insert'
);
select throws_ok(
  $$insert into public.vehicle_documents (user_id, vehicle_id, type, expires_on)
    values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bollo', '2027-03-31')$$,
  '42501',
  null,
  'owner cannot forge another user_id on document insert'
);

-- Composite parent FK prevents attaching an owned document row to someone else's vehicle.
select throws_ok(
  $$insert into public.vehicle_documents (vehicle_id, type, expires_on)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bollo', '2027-04-30')$$,
  '23503',
  null,
  'document cannot reference another user vehicle'
);

-- Data integrity constraints.
select throws_ok(
  $$insert into public.vehicles (plate) values ('lower01')$$,
  '23514',
  null,
  'database rejects lowercase plates'
);
select throws_ok(
  $$insert into public.vehicles (plate) values ('AA111AA')$$,
  '23505',
  null,
  'plate is unique per user'
);
select throws_ok(
  $$insert into public.vehicle_documents (vehicle_id, type, expires_on)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Patente', '2027-04-30')$$,
  '23514',
  null,
  'database rejects unsupported document types'
);

-- A second user can use the same plate because uniqueness is scoped by user_id.
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$insert into public.vehicles (plate) values ('AA111AA') returning user_id$$,
  array['22222222-2222-2222-2222-222222222222'::uuid],
  'different users may store the same plate'
);

select * from finish();
rollback;
