import { E } from "./ec3";
import type { Check, Section } from "./types";

// ── AISC 360 (LRFD) member verification ──────────────────────────────────────
// The same deterministic engine, expressed in the US specification's format:
// LRFD load combinations and φ-resistance factors instead of Eurocode γ-factors.
// Demonstrated on the same section properties to make the point that the code is
// a pluggable layer — swapping a W-shape catalogue is a data change, not a rewrite.
// Beams are taken as compact and continuously braced (Lb ≤ Lp), consistent with
// the EC3 "laterally restrained" assumption.

const PHI_B = 0.90; // flexure
const PHI_V = 1.00; // shear (rolled I webs, Cv = 1)
const PHI_C = 0.90; // compression
const SQRT3 = Math.sqrt(3);

/** LRFD basic combination 1.2D + 1.6L (ASCE 7). */
export function aiscDesignUDL(gk: number, qk: number): number {
  return 1.2 * gk + 1.6 * qk; // kN/m
}

/** Flexure (AISC 360 F2). Compact section. Plateau (F2.1) when braced; when the
 *  beam is laterally unbraced over its span, the LTB branch (F2.2) applies. */
export function aiscBendingCheck(
  s: Section, fy: number, MEd: number, L: number, restrained: boolean, Cb = 1.14,
): Check {
  const Zx = s.Wply * 1e3; // mm³
  const Sx = s.Wely * 1e3; // mm³
  const Mp = fy * Zx; // N·mm

  let Mn = Mp; // N·mm
  let clause = "AISC F2.1";
  let note = "compact, braced (L_b ≤ L_p)";

  if (!restrained) {
    const A = s.A * 100; // mm²
    const Iz = s.Iz * 1e4; // mm⁴ (weak axis)
    const J = s.It * 1e4; // mm⁴
    const Cw = s.Iw * 1e6; // mm⁶
    const ho = s.h - s.tf; // mm
    const ry = Math.sqrt(Iz / A);
    const rts = Math.sqrt(Math.sqrt(Iz * Cw) / Sx);
    const Lb = L * 1000;
    const Lp = 1.76 * ry * Math.sqrt(E / fy);
    const term = (J * 1) / (Sx * ho); // J·c/(Sx·ho), c = 1
    const Lr = 1.95 * rts * (E / (0.7 * fy)) *
      Math.sqrt(term + Math.sqrt(term * term + 6.76 * Math.pow((0.7 * fy) / E, 2)));

    if (Lb <= Lp) {
      Mn = Mp;
    } else if (Lb <= Lr) {
      clause = "AISC F2.2";
      note = "inelastic LTB";
      Mn = Math.min(Cb * (Mp - (Mp - 0.7 * fy * Sx) * ((Lb - Lp) / (Lr - Lp))), Mp);
    } else {
      clause = "AISC F2.2";
      note = "elastic LTB";
      const lbrts = Lb / rts;
      const Fcr = ((Cb * Math.PI * Math.PI * E) / (lbrts * lbrts)) *
        Math.sqrt(1 + 0.078 * term * lbrts * lbrts);
      Mn = Math.min(Fcr * Sx, Mp);
    }
  }

  const phiMn = (PHI_B * Mn) / 1e6; // kNm
  return {
    id: "bending",
    label: restrained ? "Flexural strength" : "Flexural strength (LTB)",
    clause,
    formula: `φM_n = φ_b·M_n;  ${note}`,
    demand: MEd,
    resistance: phiMn,
    unit: "kNm",
    utilization: MEd / phiMn,
    pass: MEd <= phiMn,
  };
}

/** Shear (AISC 360 G2.1): φVn = φv·0.6·Fy·Aw·Cv, Aw = d·tw, Cv = 1. */
export function aiscShearCheck(s: Section, fy: number, VEd: number): Check {
  const Aw = s.h * s.tw; // mm²
  const phiVn = (PHI_V * 0.6 * fy * Aw) / 1000; // kN
  return {
    id: "shear",
    label: "Shear strength",
    clause: "AISC G2.1",
    formula: `φV_n = φ_v·0.6·F_y·A_w = 1.0·0.6·${fy}·${Aw.toFixed(0)}`,
    demand: VEd,
    resistance: phiVn,
    unit: "kN",
    utilization: VEd / phiVn,
    pass: VEd <= phiVn,
  };
}

/** Serviceability deflection (IBC live/total): δ vs L/limit. */
export function aiscDeflectionCheck(s: Section, wSer: number, L: number, limitDenom = 360): Check {
  const Lmm = L * 1000;
  const I = s.Iy * 1e4; // mm⁴
  const delta = (5 * wSer * Math.pow(Lmm, 4)) / (384 * E * I); // mm
  const limit = Lmm / limitDenom;
  return {
    id: "deflection",
    label: "Deflection (serviceability)",
    clause: `IBC (L/${limitDenom})`,
    formula: `δ = 5·w·L⁴/(384·E·I_x);  limit = L/${limitDenom}`,
    demand: delta,
    resistance: limit,
    unit: "mm",
    utilization: delta / limit,
    pass: delta <= limit,
  };
}

/** Compression / flexural buckling (AISC 360 E3). */
export function aiscCompressionCheck(s: Section, fy: number, NEd: number, Lcr: number): Check {
  const A = s.A * 100; // mm²
  const I = Math.min(s.Iy, s.Iz) * 1e4; // mm⁴  (governing weak axis)
  const r = Math.sqrt(I / A); // mm
  const Lmm = Lcr * 1000;
  const slender = Lmm / r; // KL/r, K = 1
  const Fe = (Math.PI * Math.PI * E) / (slender * slender); // N/mm²
  const transition = 4.71 * Math.sqrt(E / fy);
  const Fcr = slender <= transition ? Math.pow(0.658, fy / Fe) * fy : 0.877 * Fe;
  const phiPn = (PHI_C * Fcr * A) / 1000; // kN
  return {
    id: "buckling",
    label: "Compression (flexural buckling)",
    clause: "AISC E3",
    formula: `φP_n = φ_c·F_cr·A_g;  KL/r=${slender.toFixed(0)}, F_cr=${Fcr.toFixed(0)} N/mm²`,
    demand: NEd,
    resistance: phiPn,
    unit: "kN",
    utilization: NEd / phiPn,
    pass: NEd <= phiPn,
  };
}

/** Combined axial + flexure interaction (AISC 360 H1.1). */
export function aiscBeamColumnCheck(
  s: Section, fy: number, NEd: number, MyEd: number, Lcr: number,
): Check {
  const A = s.A * 100;
  const I = Math.min(s.Iy, s.Iz) * 1e4;
  const r = Math.sqrt(I / A);
  const Lmm = Lcr * 1000;
  const slender = Lmm / r;
  const Fe = (Math.PI * Math.PI * E) / (slender * slender);
  const transition = 4.71 * Math.sqrt(E / fy);
  const Fcr = slender <= transition ? Math.pow(0.658, fy / Fe) * fy : 0.877 * Fe;
  const Pc = (PHI_C * Fcr * A) / 1000; // kN
  const Mc = (PHI_B * fy * s.Wply) / 1000; // kNm
  const pr = NEd / Pc;
  const ratio = pr >= 0.2 ? pr + (8 / 9) * (MyEd / Mc) : pr / 2 + MyEd / Mc;
  return {
    id: "h11",
    label: "Axial + flexure interaction",
    clause: "AISC H1.1",
    formula: pr >= 0.2
      ? `P_r/P_c + 8/9·(M_r/M_c);  P_r/P_c=${pr.toFixed(2)}`
      : `P_r/2P_c + M_r/M_c;  P_r/P_c=${pr.toFixed(2)}`,
    demand: ratio,
    resistance: 1.0,
    unit: "—",
    utilization: ratio,
    pass: ratio <= 1.0,
  };
}

// (kept for parity with EC3 import surface; AISC shear uses d·tw directly)
export { SQRT3 };
