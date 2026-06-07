import type { MemberInput } from "./types";

// ── Auto-layout ──────────────────────────────────────────────────────────────
// Uploaded schedules carry no drawing geometry. To still render a verification
// diagram, lay beams out as stacked horizontal members (length ∝ span) and
// columns / beam-columns as a row of nodes along the base.

export function autoLayout(members: MemberInput[]): MemberInput[] {
  const hasGeometry = members.every((m) => m.plan);
  if (hasGeometry) return members;

  const beams = members.filter((m) => m.kind === "beam");
  const verticals = members.filter((m) => m.kind !== "beam");
  const rowH = 1.4; // m between stacked beams
  const baseGap = 0; // beams start at y = rowH

  return members.map((m) => {
    if (m.plan) return m;
    if (m.kind === "beam") {
      const i = beams.indexOf(m);
      const y = baseGap + (i + 1) * rowH;
      return { ...m, plan: { x1: 0, y1: y, x2: m.L, y2: y } };
    }
    const j = verticals.indexOf(m);
    return { ...m, plan: { x: j * 2.2 + 0.5, y: 0 } };
  });
}

/** Bounding extent (metres) of the laid-out members, for the SVG viewport. */
export function planExtent(members: MemberInput[]): { w: number; h: number } {
  let w = 4;
  let h = 4;
  for (const m of members) {
    if (!m.plan) continue;
    if ("x1" in m.plan) {
      w = Math.max(w, m.plan.x1, m.plan.x2);
      h = Math.max(h, m.plan.y1, m.plan.y2);
    } else {
      w = Math.max(w, m.plan.x);
      h = Math.max(h, m.plan.y);
    }
  }
  return { w: w + 1, h: h + 1 };
}
