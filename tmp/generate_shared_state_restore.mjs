import fs from "node:fs";
import path from "node:path";

const csvPath = "C:/Users/karol/Downloads/Supabase Snippet List Calendar Events.csv";
const outPath = "C:/great-org/greatorg/supabase/restore_shared_state_from_csv.sql";

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\r") {
      i += 1;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const text = fs.readFileSync(csvPath, "utf8");
const lines = parseCsv(text);
const header = lines.shift();

if (!header || header.join(",") !== "key,value,updated_at") {
  throw new Error("Unexpected CSV header");
}

const escapeSql = (value) => value.replaceAll("'", "''");

const out = [];
out.push("-- Great Organico");
out.push("-- Restore shared_state records from exported CSV.");
out.push("-- Safe: restores only the rows present in the CSV.");
out.push("");
out.push("begin;");
out.push("");

for (const [key, value, updatedAt] of lines) {
  if ((key ?? "").toLowerCase().includes("cypress")) continue;
  const base64Value = Buffer.from(value ?? "", "utf8").toString("base64");
  out.push("insert into public.shared_state (key, value, updated_at)");
  out.push(
    `values ('${escapeSql(key ?? "")}', convert_from(decode('${base64Value}', 'base64'), 'UTF8')::jsonb, '${escapeSql(updatedAt ?? "")}'::timestamptz)`
  );
  out.push("on conflict (key) do update set");
  out.push("  value = excluded.value,");
  out.push("  updated_at = excluded.updated_at;");
  out.push("");
}

out.push("commit;");
out.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out.join("\n"), "utf8");
console.log(outPath);
