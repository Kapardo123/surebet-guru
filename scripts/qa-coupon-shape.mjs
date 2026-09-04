import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const token = env.match(/SUPABASE_ACCESS_TOKEN="([^"]+)"/)[1];
const ref = "omcmnbtkvitrgjqstrrl";
const runSql = async (sql) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
};

console.log("=== archived coupon payload");
const rows = await runSql(`SELECT source_id, result_status, payload FROM public.match_results WHERE source_type = 'coupon' ORDER BY settled_at DESC LIMIT 3;`);
for (const r of rows) {
  console.log(JSON.stringify({ id: r.source_id, status: r.result_status, matches: r.payload?.matches, totalOdds: r.payload?.totalOdds }, null, 1));
}

console.log("=== live coupons (coupons table) - matches JSON shape");
const live = await runSql(`SELECT id, name, status, queued, matches FROM public.coupons ORDER BY created_at DESC LIMIT 3;`);
for (const c of live) {
  console.log(JSON.stringify({ id: c.id, name: c.name, status: c.status, queued: c.queued, matches: typeof c.matches === "string" ? c.matches.slice(0, 300) : c.matches }, null, 1));
}