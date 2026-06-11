import fs from "node:fs";
import path from "node:path";

const csvPath = "C:/Users/karol/Downloads/Supabase Snippet List Calendar Events in Sorted Order.csv";
const outPath = "C:/great-org/greatorg/supabase/restore_calendar_events_from_csv.sql";

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

const csv = fs.readFileSync(csvPath, "utf8");
const rows = parseCsv(csv);
const header = rows.shift();

if (!header || header.join(",") !== "id,sort_order,data") {
  throw new Error("Unexpected CSV header");
}

const escapeSql = (value) => value.replaceAll("'", "''");

const sql = [];
sql.push("-- Great Organico");
sql.push("-- Restore calendar_events from CSV without Cypress rows.");
sql.push("-- Safe: inserts only the records present in the CSV and skips existing IDs.");
sql.push("");
sql.push("begin;");
sql.push("");

for (const [id, sortOrder, data] of rows) {
  if ((data ?? "").includes("Cypress")) continue;
  const encoded = Buffer.from(data ?? "", "utf8").toString("base64");
  sql.push("insert into public.calendar_events (id, sort_order, data)");
  sql.push(
    `values (${Number(id)}, ${Number(sortOrder)}, convert_from(decode('${encoded}', 'base64'), 'UTF8')::jsonb)`
  );
  sql.push("on conflict (id) do nothing;");
  sql.push("");
}

sql.push("commit;");
sql.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql.join("\n"), "utf8");
console.log(outPath);
