import { FY, SECTIONS_BY_NAME } from "./sections";
import type { MemberInput, MemberKind, SteelGrade } from "./types";

// ── Schedule import ──────────────────────────────────────────────────────────
// Accepts the member schedule a tool like Structured AI extracts from a drawing,
// as CSV, tab-separated (paste straight from Excel), or a JSON array. Validates
// against the section catalogue and returns members + per-row issues.

export interface ParseResult {
  members: MemberInput[];
  errors: string[];
}

const KINDS: MemberKind[] = ["beam", "column", "beam-column"];

export const TEMPLATE_HEADERS =
  "id,kind,section,grade,L,gk,qk,NEd,MyEd,restrained,note";

export const TEMPLATE_CSV = `${TEMPLATE_HEADERS}
B-101,beam,IPE 300,S235,7.0,8,12,,,true,Primary floor beam
B-102,beam,IPE 200,S235,6.0,6,9,,,true,Secondary beam
B-103,beam,IPE 360,S235,6.5,10,14,,,false,Unrestrained roof beam
C-101,column,HEA 200,S235,3.5,,,850,,,Internal column
C-102,beam-column,HEA 240,S235,4.0,,,700,90,,Perimeter column + moment`;

function num(v: string | undefined): number | undefined {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: string | undefined): boolean | undefined {
  if (v == null || v.trim() === "") return undefined;
  const t = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "restrained"].includes(t)) return true;
  if (["false", "0", "no", "n", "unrestrained"].includes(t)) return false;
  return undefined;
}

function normaliseSection(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (SECTIONS_BY_NAME[s]) return s;
  // tolerate "IPE300" → "IPE 300"
  const m = s.match(/^(IPE|HEA|HEB)\s*([0-9]+)$/);
  if (m && SECTIONS_BY_NAME[`${m[1]} ${m[2]}`]) return `${m[1]} ${m[2]}`;
  return null;
}

function rowToMember(row: Record<string, string>, i: number, errors: string[]): MemberInput | null {
  const id = (row.id || row.mark || `M-${i + 1}`).trim();
  const kindRaw = (row.kind || "beam").trim().toLowerCase() as MemberKind;
  const kind = KINDS.includes(kindRaw) ? kindRaw : "beam";

  const section = normaliseSection(row.section || "");
  if (!section) {
    errors.push(`Row ${i + 1} (${id}): unknown section "${row.section ?? ""}". Use IPE/HEA catalogue, e.g. "IPE 300".`);
    return null;
  }

  const gradeRaw = (row.grade || "S235").trim().toUpperCase();
  const grade = (FY[gradeRaw] ? gradeRaw : "S235") as SteelGrade;

  const L = num(row.l ?? row.length);
  if (!L || L <= 0) {
    errors.push(`Row ${i + 1} (${id}): missing or invalid length L.`);
    return null;
  }

  const m: MemberInput = { id, kind, sheet: row.sheet?.trim() || "imported", sectionName: section, grade, L, note: row.note?.trim() };

  if (kind === "beam") {
    m.gk = num(row.gk) ?? 0;
    m.qk = num(row.qk) ?? 0;
    m.restrained = bool(row.restrained) ?? true;
  } else {
    m.NEd = num(row.ned) ?? num(row.n) ?? 0;
    if (kind === "beam-column") m.MyEd = num(row.myed) ?? num(row.m) ?? 0;
  }
  return m;
}

function parseDelimited(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  const errors: string[] = [];
  if (lines.length < 2) return { members: [], errors: ["Need a header row plus at least one member."] };
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const members: MemberInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim);
    const row: Record<string, string> = {};
    headers.forEach((h, k) => (row[h] = (cells[k] ?? "").trim()));
    const m = rowToMember(row, i - 1, errors);
    if (m) members.push(m);
  }
  return { members, errors };
}

function parseJson(text: string): ParseResult {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { members: [], errors: ["Invalid JSON."] };
  }
  const arr = Array.isArray(data) ? data : [data];
  const members: MemberInput[] = [];
  arr.forEach((raw, i) => {
    const row: Record<string, string> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => (row[k.toLowerCase()] = String(v)));
    const m = rowToMember(row, i, errors);
    if (m) members.push(m);
  });
  return { members, errors };
}

export function parseSchedule(text: string): ParseResult {
  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) return parseJson(t);
  return parseDelimited(t);
}
