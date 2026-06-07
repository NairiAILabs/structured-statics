import type { Check, Section } from "./types";

// ── EN 1993-1-1 (Eurocode 3) member verification ────────────────────────────
// Deterministic, auditable. Every check returns demand, resistance, the clause,
// and the formula actually evaluated — the same "what / where / how-to-fix"
// contract Structured AI already ships, but for the physics.

export const E = 210_000; // N/mm²  Young's modulus, steel
export const G = 80_770; // N/mm²  shear modulus, steel (ν = 0.3)
export const GAMMA_M0 = 1.0; // cross-section resistance
export const GAMMA_M1 = 1.0; // member (buckling) resistance

const SQRT3 = Math.sqrt(3);

/** Partial-factor combination, EN 1990 eq. 6.10 (persistent/transient). */
export function designUDL(gk: number, qk: number): number {
  return 1.35 * gk + 1.5 * qk; // kN/m
}

/** Material yield strength is carried in by the caller (S235/S275/S355). */
export function epsilon(fy: number): number {
  return Math.sqrt(235 / fy);
}

// ── Cross-section classification (EN 1993-1-1 Table 5.2) ─────────────────────
// Returns 1..4 for the worst of flange (outstand, compression) and web.
export function classifyBending(s: Section, fy: number): number {
  const eps = epsilon(fy);
  // Outstand flange in compression
  const cFlange = (s.b - s.tw - 2 * s.r) / 2;
  const flangeRatio = cFlange / s.tf;
  const flangeClass =
    flangeRatio <= 9 * eps ? 1 : flangeRatio <= 10 * eps ? 2 : flangeRatio <= 14 * eps ? 3 : 4;
  // Web in bending (internal element)
  const cWeb = s.h - 2 * s.tf - 2 * s.r;
  const webRatio = cWeb / s.tw;
  const webClass =
    webRatio <= 72 * eps ? 1 : webRatio <= 83 * eps ? 2 : webRatio <= 124 * eps ? 3 : 4;
  return Math.max(flangeClass, webClass);
}

export function classifyCompression(s: Section, fy: number): number {
  const eps = epsilon(fy);
  const cFlange = (s.b - s.tw - 2 * s.r) / 2;
  const flangeRatio = cFlange / s.tf;
  const flangeClass =
    flangeRatio <= 9 * eps ? 1 : flangeRatio <= 10 * eps ? 2 : flangeRatio <= 14 * eps ? 3 : 4;
  const cWeb = s.h - 2 * s.tf - 2 * s.r;
  const webRatio = cWeb / s.tw;
  const webClass =
    webRatio <= 33 * eps ? 1 : webRatio <= 38 * eps ? 2 : webRatio <= 42 * eps ? 3 : 4;
  return Math.max(flangeClass, webClass);
}

// ── Shear area (EN 1993-1-1 §6.2.6(3), rolled I/H, load ∥ web) ───────────────
export function shearArea(s: Section): number {
  const A = s.A * 100; // cm² → mm²
  const av = A - 2 * s.b * s.tf + (s.tw + 2 * s.r) * s.tf;
  const hw = s.h - 2 * s.tf;
  const min = 1.0 * hw * s.tw; // η·hw·tw, η = 1.0
  return Math.max(av, min); // mm²
}

// ── Beam checks (simply supported, uniformly loaded) ─────────────────────────

/** Bending: M_Ed vs M_c,Rd. §6.2.5 */
export function bendingCheck(s: Section, fy: number, sectionClass: number, MEd: number): Check {
  const plastic = sectionClass <= 2;
  const W = plastic ? s.Wply : s.Wely; // cm³
  const McRd = (W * fy) / 1000 / GAMMA_M0; // kNm
  return {
    id: "bending",
    label: "Bending resistance",
    clause: "EC3 §6.2.5",
    formula: `M_c,Rd = ${plastic ? "W_pl,y" : "W_el,y"}·f_y/γ_M0 = ${W}·${fy}/1000`,
    demand: MEd,
    resistance: McRd,
    unit: "kNm",
    utilization: MEd / McRd,
    pass: MEd <= McRd,
  };
}

/** Shear: V_Ed vs V_pl,Rd. §6.2.6 */
export function shearCheck(s: Section, fy: number, VEd: number): Check {
  const Av = shearArea(s); // mm²
  const VplRd = (Av * (fy / SQRT3)) / 1000 / GAMMA_M0; // kN
  return {
    id: "shear",
    label: "Shear resistance",
    clause: "EC3 §6.2.6",
    formula: `V_pl,Rd = A_v·(f_y/√3)/γ_M0 = ${Av.toFixed(0)}·(${fy}/√3)`,
    demand: VEd,
    resistance: VplRd,
    unit: "kN",
    utilization: VEd / VplRd,
    pass: VEd <= VplRd,
  };
}

/** Serviceability deflection: δ vs L/limit (characteristic load). §7.2 / NA */
export function deflectionCheck(s: Section, wSer: number, L: number, limitDenom: number): Check {
  const Lmm = L * 1000;
  const I = s.Iy * 1e4; // cm⁴ → mm⁴
  const w = wSer; // kN/m == N/mm numerically
  const delta = (5 * w * Math.pow(Lmm, 4)) / (384 * E * I); // mm
  const limit = Lmm / limitDenom;
  return {
    id: "deflection",
    label: "Deflection (SLS)",
    clause: `EC3 §7.2 (L/${limitDenom})`,
    formula: `δ = 5·w·L⁴/(384·E·I_y);  limit = L/${limitDenom}`,
    demand: delta,
    resistance: limit,
    unit: "mm",
    utilization: delta / limit,
    pass: delta <= limit,
  };
}

// ── Lateral-torsional buckling (EN 1993-1-1 §6.3.2) ──────────────────────────
// For a laterally UN-restrained beam. C1 reflects the moment shape (≈1.13 for a
// simply-supported member under uniform load, fork supports, load at shear centre).
export function ltbCheck(
  s: Section, fy: number, sectionClass: number, MEd: number, L: number, C1 = 1.13,
): Check {
  const W = sectionClass <= 2 ? s.Wply : s.Wely; // cm³
  const Mpl = (W * fy) / 1000; // kNm (= Mc,Rd with γ=1)

  const Iz = s.Iz * 1e4; // mm⁴
  const Iw = s.Iw * 1e6; // cm⁶ → mm⁶
  const It = s.It * 1e4; // cm⁴ → mm⁴
  const Lmm = L * 1000;
  const pi2EIz = Math.PI * Math.PI * E * Iz;
  const Mcr = (C1 * (pi2EIz / (Lmm * Lmm)) *
    Math.sqrt(Iw / Iz + (Lmm * Lmm * G * It) / pi2EIz)) / 1e6; // kNm

  const lambdaLT = Math.sqrt(Mpl / Mcr);
  // Curve for rolled sections (§6.3.2.3): h/b ≤ 2 → b (0.34), else c (0.49)
  const alphaLT = s.h / s.b <= 2 ? 0.34 : 0.49;
  const lambdaLT0 = 0.4;
  const beta = 0.75;
  const phiLT = 0.5 * (1 + alphaLT * (lambdaLT - lambdaLT0) + beta * lambdaLT * lambdaLT);
  let chiLT = 1 / (phiLT + Math.sqrt(Math.max(phiLT * phiLT - beta * lambdaLT * lambdaLT, 0)));
  chiLT = Math.min(chiLT, 1.0, 1 / (lambdaLT * lambdaLT));
  const MbRd = chiLT * Mpl;

  return {
    id: "ltb",
    label: "Lateral-torsional buckling",
    clause: "EC3 §6.3.2",
    formula: `M_b,Rd = χ_LT·W·f_y/γ_M1;  χ_LT=${chiLT.toFixed(3)}, λ̄_LT=${lambdaLT.toFixed(2)}, M_cr=${Mcr.toFixed(0)} kNm`,
    demand: MEd,
    resistance: MbRd,
    unit: "kNm",
    utilization: MEd / MbRd,
    pass: MEd <= MbRd,
  };
}

// ── Combined bending + axial, cross-section (EN 1993-1-1 §6.2.9.1) ────────────
// Reduced plastic moment resistance for Class 1/2 doubly-symmetric I-sections.
export function bendingAxialCheck(s: Section, fy: number, NEd: number, MyEd: number): Check {
  const A = s.A * 100; // mm²
  const NplRd = (A * fy) / 1000; // kN
  const MplyRd = (s.Wply * fy) / 1000; // kNm
  const n = NEd / NplRd;
  const a = Math.min((A - 2 * s.b * s.tf) / A, 0.5);
  const MNyRd = Math.min((MplyRd * (1 - n)) / (1 - 0.5 * a), MplyRd); // kNm
  return {
    id: "mn",
    label: "Bending + axial force",
    clause: "EC3 §6.2.9.1",
    formula: `M_N,y,Rd = M_pl,y,Rd·(1−n)/(1−0.5a);  n=${n.toFixed(2)}, a=${a.toFixed(2)}`,
    demand: MyEd,
    resistance: MNyRd,
    unit: "kNm",
    utilization: MyEd / MNyRd,
    pass: MyEd <= MNyRd,
  };
}

// ── Column flexural buckling (EN 1993-1-1 §6.3.1) ────────────────────────────

/** Imperfection factor α from the buckling curve (rolled I/H, S235–S355). */
function imperfectionAlpha(s: Section, axis: "y" | "z"): number {
  const hOverB = s.h / s.b;
  // Curve → α: a=0.21, b=0.34, c=0.49
  if (hOverB > 1.2) {
    return axis === "y" ? 0.21 : 0.34; // a / b
  }
  return axis === "y" ? 0.34 : 0.49; // b / c
}

interface AxisBuckling {
  axis: "y" | "z";
  Ncr: number;       // kN
  lambdaBar: number;
  chi: number;
  NbRd: number;      // kN
}

function bucklingAxis(s: Section, fy: number, Lcr: number, axis: "y" | "z"): AxisBuckling {
  const A = s.A * 100; // mm²
  const I = (axis === "y" ? s.Iy : s.Iz) * 1e4; // mm⁴
  const Lmm = Lcr * 1000;
  const Ncr = (Math.PI * Math.PI * E * I) / (Lmm * Lmm); // N
  const Npl = A * fy; // N
  const lambdaBar = Math.sqrt(Npl / Ncr);
  const alpha = imperfectionAlpha(s, axis);
  const phi = 0.5 * (1 + alpha * (lambdaBar - 0.2) + lambdaBar * lambdaBar);
  const chi = Math.min(1, 1 / (phi + Math.sqrt(Math.max(phi * phi - lambdaBar * lambdaBar, 0))));
  const NbRd = (chi * A * fy) / 1000 / GAMMA_M1; // kN
  return { axis, Ncr: Ncr / 1000, lambdaBar, chi, NbRd };
}

/** Governing flexural buckling check across both axes. */
export function bucklingCheck(s: Section, fy: number, NEd: number, LcrY: number, LcrZ: number): Check {
  const y = bucklingAxis(s, fy, LcrY, "y");
  const z = bucklingAxis(s, fy, LcrZ, "z");
  const gov = y.NbRd <= z.NbRd ? y : z;
  return {
    id: "buckling",
    label: `Flexural buckling (${gov.axis}-${gov.axis})`,
    clause: "EC3 §6.3.1",
    formula: `N_b,Rd = χ·A·f_y/γ_M1;  χ=${gov.chi.toFixed(3)}, λ̄=${gov.lambdaBar.toFixed(2)}`,
    demand: NEd,
    resistance: gov.NbRd,
    unit: "kN",
    utilization: NEd / gov.NbRd,
    pass: NEd <= gov.NbRd,
  };
}
