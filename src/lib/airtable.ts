export const AIRTABLE_API_URL = "https://api.airtable.com/v0";

function envOrThrow(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
}

// read base/env at runtime (Node)
export const BASE_ID = envOrThrow("AIRTABLE_BASE_ID");
export const API_KEY = envOrThrow("AIRTABLE_API_KEY");

export async function listRecords(
  table: string,
  params: Record<string, string> = {}
) {
  const qs = new URLSearchParams(params).toString();
  const url = `${AIRTABLE_API_URL}/${BASE_ID}/${encodeURIComponent(table)}${
    qs ? `?${qs}` : ""
  }`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Airtable list ${table} ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.records as Array<{ id: string; fields: Record<string, any> }>;
}

export async function createRecord(table: string, fields: Record<string, any>) {
  const url = `${AIRTABLE_API_URL}/${BASE_ID}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Airtable create ${table} ${res.status}: ${txt}`);
  }
  return res.json();
}

// small helper used in products route
export function stripPercent(x: any): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") return Number(String(x).replace("%", "")) || 0;
  return 0;
}
