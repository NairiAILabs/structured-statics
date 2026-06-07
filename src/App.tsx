import { useMemo, useState } from "react";
import { Header } from "./components/Header";
import { FramingPlan } from "./components/FramingPlan";
import { MemberTable } from "./components/MemberTable";
import { MemberDetail } from "./components/MemberDetail";
import { SummaryStats, DeterminismCallout, ImpactPanel } from "./components/Panels";
import { SAMPLE_MEMBERS } from "./engine/sampleProject";
import { projectImpact, verifyProject } from "./engine/verify";
import type { CodeName, MemberInput } from "./engine/types";

export default function App() {
  // members are mutable so the detail panel can re-verify live
  const [members, setMembers] = useState<MemberInput[]>(SAMPLE_MEMBERS);
  const [activeId, setActiveId] = useState<string>("B-04");
  const [code, setCode] = useState<CodeName>("EC3");

  const results = useMemo(() => verifyProject(members, code), [members, code]);
  const impact = useMemo(() => projectImpact(results), [results]);

  const active = results.find((r) => r.input.id === activeId) ?? results[0];

  // the member used for the determinism narrative: the failing member that fails
  // by the *smallest* margin — the strongest case for why symbolic review can't
  // catch quantitative overstress (a few-percent failure is invisible by eye).
  const failExemplar = useMemo(() => {
    const fails = results.filter((r) => r.status === "FAIL");
    if (fails.length === 0) return results[0];
    return fails.reduce((a, b) => (b.utilization < a.utilization ? b : a));
  }, [results]);

  function editActive(patch: Partial<MemberInput>) {
    setMembers((prev) =>
      prev.map((m) => (m.id === active.input.id ? { ...m, ...patch } : m)),
    );
  }

  return (
    <div className="app">
      <Header code={code} onCode={setCode} />

      {code === "AISC" && (
        <div className="codebanner">
          <b>AISC 360 (LRFD)</b> active — same engine, US methodology: LRFD combos (1.2D+1.6L), φ-resistance
          factors (φ<sub>b</sub>=0.90) and IBC serviceability (L/240). Resistance factors make AISC ~10% stricter
          on flexure than EC3's γ<sub>M0</sub>=1.0, so members borderline under EC3 can govern here — a real
          jurisdictional difference, applied deterministically.
        </div>
      )}

      <SummaryStats impact={impact} />

      <DeterminismCallout member={failExemplar} />

      <div className="grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <FramingPlan results={results} activeId={activeId} onSelect={setActiveId} />
          <MemberTable results={results} activeId={activeId} onSelect={setActiveId} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <MemberDetail result={active} onEdit={editActive} />
          <ImpactPanel impact={impact} />
        </div>
      </div>

      <div className="footer">
        <b>Statics</b> is a proof-of-concept verification layer designed to sit on top of Structured&nbsp;AI's
        extraction. It consumes the member schedule Structured already reads off a drawing (IDs, sections, grades,
        spans, loads) and runs deterministic checks — returning a per-member audit trail with the exact clause, the
        utilization, and a suggested fix. <b>EN&nbsp;1993-1-1</b>: cross-section classification, bending, shear,
        deflection, <b>lateral-torsional buckling (§6.3.2)</b>, flexural buckling (§6.3.1) and
        <b> combined bending + axial (§6.2.9)</b>. The same engine also runs <b>AISC&nbsp;360 (LRFD)</b> — flexure
        (F2, incl. LTB), shear (G2), compression (E3) and the beam-column interaction (H1.1) — toggled top-right, to
        show the code is a pluggable layer, not a rewrite (swapping in a W-shape catalogue is a data change). Section
        properties are real EN&nbsp;10365 values. AISC beams assume compact sections; a full ACI concrete module and
        member-level §6.3.3 interaction are the next steps. Built by a civil-engineering student as the "physics"
        complement to symbolic drawing QA.
      </div>
    </div>
  );
}
