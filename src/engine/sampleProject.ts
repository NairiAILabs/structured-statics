import type { MemberInput } from "./types";

// ── Sample input ─────────────────────────────────────────────────────────────
// Represents the member schedule a tool like Structured AI already extracts from
// a structural drawing (sheet S-201): IDs, sections, grades, spans, loads. This
// layer adds the Eurocode verification on top — it does not re-do the extraction.
//
// The set is deliberately a real mix: members that are unsafe (fail), members
// that are wastefully over-sized, and members that are correctly engineered.

export const PROJECT_NAME = "Level 2 Framing Plan";
export const SHEET = "S-201";
export const PLAN_EXTENT = { w: 20, h: 11 }; // metres, for the framing overlay

export const SAMPLE_MEMBERS: MemberInput[] = [
  {
    id: "B-01", kind: "beam", sheet: "S-201", sectionName: "IPE 360", grade: "S235",
    L: 8.0, gk: 15, qk: 20,
    plan: { x1: 12, y1: 0, x2: 20, y2: 0 },
    note: "Primary transfer beam, grid 1/C–D",
  },
  {
    id: "B-02", kind: "beam", sheet: "S-201", sectionName: "IPE 200", grade: "S235",
    L: 6.0, gk: 6, qk: 6,
    plan: { x1: 12, y1: 0, x2: 12, y2: 5.5 },
    note: "Secondary floor beam, grid C/1–2",
  },
  {
    id: "B-03", kind: "beam", sheet: "S-201", sectionName: "IPE 500", grade: "S235",
    L: 5.0, gk: 8, qk: 10,
    plan: { x1: 0, y1: 0, x2: 0, y2: 5.5 },
    note: "Edge beam, grid A/1–2",
  },
  {
    id: "B-04", kind: "beam", sheet: "S-201", sectionName: "IPE 270", grade: "S235",
    L: 5.0, gk: 10, qk: 16,
    plan: { x1: 6.5, y1: 5.5, x2: 12, y2: 5.5 },
    note: "Floor beam, grid 2/B–C",
  },
  {
    id: "B-05", kind: "beam", sheet: "S-201", sectionName: "IPE 240", grade: "S235",
    L: 5.5, gk: 5, qk: 7,
    plan: { x1: 6.5, y1: 0, x2: 6.5, y2: 5.5 },
    note: "Secondary floor beam, grid B/1–2",
  },
  {
    id: "B-06", kind: "beam", sheet: "S-201", sectionName: "IPE 330", grade: "S235",
    L: 7.0, gk: 8, qk: 12,
    plan: { x1: 12, y1: 5.5, x2: 20, y2: 5.5 },
    note: "Primary floor beam, grid 2/C–D",
  },
  {
    id: "B-07", kind: "beam", sheet: "S-201", sectionName: "IPE 400", grade: "S235",
    L: 4.0, gk: 4, qk: 5,
    plan: { x1: 0, y1: 11, x2: 6.5, y2: 11 },
    note: "Roof beam, grid 3/A–B",
  },
  {
    id: "B-08", kind: "beam", sheet: "S-201", sectionName: "IPE 300", grade: "S235",
    L: 6.5, gk: 8, qk: 8.4, restrained: false,
    plan: { x1: 12, y1: 11, x2: 20, y2: 11 },
    note: "Roof beam — laterally UNrestrained, grid 3/C–D",
  },
  {
    id: "C-01", kind: "column", sheet: "S-201", sectionName: "HEA 200", grade: "S235",
    L: 3.5, NEd: 800, plan: { x: 12, y: 5.5 },
    note: "Internal column, grid C/2",
  },
  {
    id: "C-02", kind: "column", sheet: "S-201", sectionName: "HEA 160", grade: "S235",
    L: 4.0, NEd: 600, plan: { x: 0, y: 0 },
    note: "Corner column, grid A/1",
  },
  {
    id: "C-03", kind: "beam-column", sheet: "S-201", sectionName: "HEA 240", grade: "S235",
    L: 4.0, NEd: 900, MyEd: 80, plan: { x: 20, y: 5.5 },
    note: "Perimeter column + wind moment, grid D/2",
  },
];
