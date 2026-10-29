import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema auth,storage,public to authenticated;
grant execute on function auth.uid() to authenticated;
grant select,insert,delete on storage.objects to authenticated;`);
const schema = readFileSync(root + "supabase/schema.sql", "utf8").replace(
  "create extension if not exists pgcrypto;",
  "",
);
const seed = readFileSync(root + "supabase/seed.sql", "utf8");
await db.exec(schema);
await db.exec(seed);
await db.exec(schema);
await db.exec(seed);
assert.equal(
  (await db.query("select count(*)::int as n from public.apparel_catalog"))
    .rows[0].n,
  12,
);
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002",
  id = "20000000-0000-4000-8000-000000000001";
await db.query("insert into auth.users values($1),($2)", [a, b]);
assert.equal(
  (await db.query("select count(*)::int as n from public.users")).rows[0].n,
  2,
);
await db.exec("set role authenticated");
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
for (let i = 0; i < 12; i++)
  assert.equal(
    (await db.query("select public.glowrify_consume_quota() as accepted"))
      .rows[0].accepted,
    true,
  );
assert.equal(
  (await db.query("select public.glowrify_consume_quota() as accepted")).rows[0]
    .accepted,
  false,
);
const point = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 },
  vision = {
    silhouette: "balanced",
    shoulder_hip_ratio: 1,
    confidence: 0.95,
    landmarks: Array(33).fill(point),
    world_landmarks: Array(33).fill(point),
  };
const profile = { age: 24, height_cm: 175, weight_kg: 70, occasion: "Casual" };
const args = [
  id,
  `${a}/${id}.png`,
  profile,
  vision,
  { temp: 25, rain: false },
  [
    {
      id: "00000000-0000-4000-8000-000000000001",
      score: 98,
      reasons: ["Casual appropriate"],
    },
  ],
].map((x, i) => (i > 1 ? JSON.stringify(x) : x));
const save =
  "select public.glowrify_save_session($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb)";
await db.query(save, args);
await db.query(save, args);
assert.equal(
  (await db.query("select count(*)::int as n from public.recommendations"))
    .rows[0].n,
  1,
);
assert.equal(
  Number(
    (await db.query("select price_inr from public.recommendations")).rows[0]
      .price_inr,
  ),
  1799,
);
await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
  "glowrify-photos",
  `${a}/${id}.png`,
]);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
assert.equal(
  (await db.query("select * from public.style_sessions")).rows.length,
  0,
);
assert.equal(
  (await db.query("select * from public.recommendations")).rows.length,
  0,
);
assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
assert.equal(
  (
    await db.query(
      "delete from public.style_sessions where id=$1 returning id",
      [id],
    )
  ).rows.length,
  0,
);
let blocked = false;
try {
  await db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
    "glowrify-photos",
    `${a}/intrusion.png`,
  ]);
} catch {
  blocked = true;
}
assert.ok(blocked);
await db.exec("reset role");
blocked = false;
try {
  await db.exec("update public.apparel_catalog set currency='USD'");
} catch {
  blocked = true;
}
assert.ok(blocked);
await db.exec("set role authenticated");
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
await db.query("delete from public.style_sessions where id=$1", [id]);
assert.equal(
  (await db.query("select * from public.recommendations")).rows.length,
  0,
);
console.log(
  "PASS: repeatable SQL, 12 INR catalog records, signup trigger, atomic/idempotent save, price snapshots, quota, RLS user isolation, photo policies, currency constraint, cascading recommendation deletion.",
);
await db.close();
