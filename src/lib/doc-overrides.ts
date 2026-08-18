export type DocOverrides = Record<string, string>;

function key(dealId: string): string {
  return `solo-doc-overrides-${dealId}`;
}

export function getDocOverrides(dealId: string): DocOverrides {
  try {
    const raw = localStorage.getItem(key(dealId));
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDocOverride(dealId: string, docId: string, html: string): void {
  const overrides = getDocOverrides(dealId);
  overrides[docId] = html;
  localStorage.setItem(key(dealId), JSON.stringify(overrides));
}

export function clearDocOverride(dealId: string, docId: string): void {
  const overrides = getDocOverrides(dealId);
  delete overrides[docId];
  if (Object.keys(overrides).length === 0) localStorage.removeItem(key(dealId));
  else localStorage.setItem(key(dealId), JSON.stringify(overrides));
}
