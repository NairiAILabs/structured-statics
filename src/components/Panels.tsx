import type { MemberResult, ProjectImpact } from "../engine/types";
import { eur, kg, num, util } from "../lib/format";

export function SummaryStats({ impact }: { impact: ProjectImpact }) {
  return (
    <div className="stats">
      <div className="stat fail">
        <span className="bar-accent" />
        <div className="k">Unsafe — fail code</div>
        <div className="v">{impact.fail}</div>
        <div className="d">of {impact.members} members · safety-critical</div>
      </div>
      <div className="stat over">
        <span className="bar-accent" />
        <div className="k">Over-designed</div>
        <div className="v">{impact.over}</div>
        <div className="d">material wasted, cost & carbon</div>
      </div>
      <div className="stat pass">
        <span className="bar-accent" />
        <div className="k">Verified OK</div>
        <div className="v">{impact.pass}</div>
        <div className="d">correctly engineered</div>
      </div>
      <div className="stat impact">
        <span className="bar-accent" />
        <div className="k">Recoverable steel</div>
        <div className="v">{kg(impact.steelSavedKg)}</div>
        <div className="d">≈ {eur(impact.costSaved)} · {num(impact.co2Saved, 0)} kg CO₂e</div>
      </div>
    </div>
  );
}

/** The wedge: what symbolic / LLM review reports vs. what computation proves. */
export function DeterminismCallout({ member }: { member: MemberResult }) {
  const g = member.governing;
  return (
    <div className="determinism">
      <div className="top">
        <div className="eyebrow">Why this layer exists</div>
        <h2 className="h2" style={{ marginTop: 6 }}>
          The same member, reviewed two ways — only one catches it
        </h2>
        <p className="det-line" style={{ marginTop: 8 }}>
          Member <b style={{ color: "var(--ink)", fontFamily: "var(--mono)" }}>{member.input.id}</b>{" "}
          ({member.section.name}, {member.input.grade}) on sheet {member.input.sheet}. Symbolic / vision review reads the
          drawing; it cannot evaluate the mechanics.
        </p>
      </div>
      <div className="det-cols">
        <div className="det-col symbolic">
          <span className="det-tag dim">◐ Symbolic / LLM drawing review</span>
          <div className="det-line">
            <span className="ok">✓</span> Section tag present and legible<br />
            <span className="ok">✓</span> Grade annotated, schedule internally consistent<br />
            <span className="ok">✓</span> Code clause referenced on sheet<br />
            <span className="ok">✓</span> No clash with adjacent trades
          </div>
          <div className="det-verdict symbolic">verdict: no issue flagged</div>
        </div>
        <div className="det-col live">
          <span className="det-tag live">▣ Statics — deterministic computation</span>
          <div className="det-line">
            Evaluated {g.label} per {g.clause}:<br />
            <span style={{ fontFamily: "var(--mono)", color: "var(--ink-dim)" }}>{g.formula}</span><br />
            demand <b style={{ color: "var(--ink)" }}>{num(g.demand, 1)} {g.unit}</b> vs resistance{" "}
            <b style={{ color: "var(--ink)" }}>{num(g.resistance, 1)} {g.unit}</b>
          </div>
          <div className="det-verdict live">
            verdict: <span className="no">FAILS — utilization {util(g.utilization)} ({Math.round((g.utilization - 1) * 100)}% over)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImpactPanel({ impact }: { impact: ProjectImpact }) {
  return (
    <div className="card">
      <div className="card-hd">
        <div>
          <div className="eyebrow">Material & carbon impact</div>
          <h2 className="h2">Optimisation on one sheet</h2>
        </div>
      </div>
      <div className="card-bd">
        <div className="impact-rows">
          <div className="impact-row">
            <span className="l">Steel recoverable from over-designed members</span>
            <span className="r sage">{kg(impact.steelSavedKg)}</span>
          </div>
          <div className="impact-row">
            <span className="l">Steel to add to make unsafe members compliant</span>
            <span className="r fail">+{kg(impact.steelAddedKg)}</span>
          </div>
          <div className="impact-row">
            <span className="l">Fabricated cost recoverable</span>
            <span className="r sage">{eur(impact.costSaved)}</span>
          </div>
          <div className="impact-row">
            <span className="l">Embodied carbon avoided</span>
            <span className="r sage">{num(impact.co2Saved, 0)} kg CO₂e</span>
          </div>
        </div>
        <div className="impact-note">
          From <b>one sheet</b>. Rates: {eur(impact.costPerKg)}/kg fabricated steel, {impact.co2PerKg} kg CO₂e/kg
          (editable). The safety fixes and the savings are reported separately and honestly — over-designed members
          carry real cost &amp; carbon; unsafe members must be upsized regardless. Across a full set of dozens of
          sheets, both figures scale by an order of magnitude.
        </div>
      </div>
    </div>
  );
}
