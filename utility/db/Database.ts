const NUMERIC_FIELDS: Record<string, string[]> = {
  accounts: ["order"],
  transactions: ["time", "value"],
  tags: ["order"],
};

function castRow<T>(store: string, row: any): T {
  if (!row) return row;
  const fields = NUMERIC_FIELDS[store] || [];
  for (let key in row) {
    if (row[key] === null) {
      row[key] = fields.includes(key) ? 0 : "";
    } else if (fields.includes(key)) {
      row[key] = Number(row[key]);
    }
  }
  return row as T;
}

async function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    window.location.href = "/splash";
    throw new Error("Unauthorized");
  }
}

export async function getAll<T>(
  store: string,
  queryString?: string,
): Promise<T[]> {
  const url = queryString ? `/api/${store}?${queryString}` : `/api/${store}`;
  const res = await fetch(url);
  await handleUnauthorized(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `خطا در دریافت اطلاعات ${store}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: any) => castRow<T>(store, row));
}

export async function getItem<T>(
  store: string,
  id: string,
): Promise<T | undefined> {
  const res = await fetch(`/api/${store}/${id}`);
  await handleUnauthorized(res);
  if (!res.ok) return undefined;
  const data = await res.json();
  if (!data) return undefined;
  return castRow<T>(store, data);
}

export async function putItem<T extends { id: string } | { id: string }[]>(
  store: string,
  item: T,
): Promise<void> {
  const res = await fetch(`/api/${store}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  await handleUnauthorized(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "خطا در ذخیره‌سازی اطلاعات");
  }
}

export async function deleteItem(store: string, id: string): Promise<void> {
  const res = await fetch(`/api/${store}/${id}`, { method: "DELETE" });
  await handleUnauthorized(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "خطا در حذف اطلاعات");
  }
}

export async function clearStore(store: string): Promise<void> {
  const res = await fetch(`/api/${store}`, { method: "DELETE" });
  await handleUnauthorized(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "خطا در پاکسازی اطلاعات");
  }
}
