// ── Core domain types ────────────────────────────────────────────────────────
// Everything the verification layer consumes and produces.

export type SteelGrade = "S235" | "S275" | "S355";
export type MemberKind = "beam" | "column" | "beam-column";
export type Status = "FAIL" | "OVER" | "PASS";
export type CodeName = "EC3" | "AISC";

/** A rolled steel section. Dimensions in mm; section properties in cm-based units
 *  (as quoted in European section tables). Conversions happen inside the engine. */
export interface Section {
  name: string;
  family: "IPE" | "HEA" | "HEB";
  mass: number; // kg/m
  h: number;    // mm  overall depth
  b: number;    // mm  flange width
  tw: number;   // mm  web thickness
  tf: number;   // mm  flange thickness
  r: number;    // mm  root radius
  A: number;    // cm²  area
  Iy: number;   // cm⁴  second moment, major axis
  Wely: number; // cm³  elastic modulus, major axis
  Wply: number; // cm³  plastic modulus, major axis
  Iz: number;   // cm⁴  second moment, minor axis
  It: number;   // cm⁴  St-Venant torsion constant
  Iw: number;   // cm⁶  warping constant
}

/** What Structured AI's vision model / Revit add-in already extracts off a sheet.
 *  This layer takes exactly this and adds the physics. */
export interface MemberInput {
  id: string;
  kind: MemberKind;
  sheet: string;       // origin drawing, e.g. "S-201"
  sectionName: string; // as annotated on the drawing
  grade: SteelGrade;
  L: number;           // m — span (beam) or system length (column)
  // Beam loading (characteristic line loads, kN/m)
  gk?: number;         // permanent
  qk?: number;         // variable / imposed
  // Column / beam-column loading
  NEd?: number;        // kN — design axial (already factored)
  MyEd?: number;       // kNm — design major-axis moment (beam-column)
  LcrY?: number;       // m — buckling length, major axis (default L)
  LcrZ?: number;       // m — buckling length, minor axis (default L)
  // Beam lateral restraint. If false, lateral-torsional buckling is checked
  // over the full span. Floor beams with a slab/deck on top are restrained.
  restrained?: boolean;
  // Plan geometry for the framing-plan overlay (normalised grid coords)
  plan: { x1: number; y1: number; x2: number; y2: number } | { x: number; y: number };
  note?: string;
}

/** One Eurocode limit-state check with full audit trail. */
export interface Check {
  id: string;
  label: string;
  clause: string;     // Eurocode reference
  formula: string;    // human-readable formula actually used
  demand: number;     // action effect (Ed)
  resistance: number; // capacity (Rd) or limit
  unit: string;
  utilization: number; // demand / resistance
  pass: boolean;
}

export interface OptimalFix {
  sectionName: string | null; // lightest adequate section in the same family
  utilization: number | null;
  massDelta: number | null;   // kg/m  (current − optimal): +ve = current is heavier
  found: boolean;
}

export interface MemberResult {
  input: MemberInput;
  code: CodeName;
  section: Section;
  fy: number;          // N/mm²
  classBending: number; // cross-section class
  checks: Check[];
  governing: Check;     // the check with the highest utilization
  utilization: number;  // governing utilization
  status: Status;
  optimal: OptimalFix;
  // Material impact (kg of steel for this member's run length)
  steelSavedKg: number; // >0 if over-designed and could be lightened
  steelAddedKg: number; // >0 if unsafe and must be upsized
}

export interface ProjectImpact {
  members: number;
  fail: number;
  over: number;
  pass: number;
  steelSavedKg: number; // from de-rating over-designed members
  steelAddedKg: number; // to fix unsafe members
  costPerKg: number;
  co2PerKg: number;
  netSteelKg: number;
  costSaved: number;
  co2Saved: number;
}
