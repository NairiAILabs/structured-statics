import { familyAscending } from "../engine/sections";
import type { Check, MemberInput, MemberResult } from "../engine/types";
import { num, util } from "../lib/format";

function CheckCard({ c, governing }: { c: Check; governing: boolean }) {
  return (
    <div className={`check ${governing ? "gov" : ""}`}>
      <div className="ln">
        <span className="label">
          {c.label}{" "}
          <span className={`tick ${c.pass ? "ok" : "no"}`}>{c.pass ? "✓" : "✗"}</span>
        </span>
        <span className="clause">{c.clause}</span>
      </div>
      <div className="formula">{c.formula}</div>
      <div className="nums">
        <span>demand <b>{num(c.demand, c.unit === "mm" ? 1 : 1)} {c.unit}</b></span>
        <span>resistance <b>{num(c.resistance, 1)} {c.unit}</b></span>
        <span>
          utilization{" "}
          <b style={{ color: c.pass ? "var(--pass)" : "var(--fail)" }}>{util(c.utilization)}</b>
        </span>
      </div>
    </div>
  );
}

export function MemberDetail({
  result,
  onEdit,
}: {
  result: MemberResult;
  onEdit: (patch: Partial<MemberInput>) => void;
}) {
  const { input, section, fy, classBending, checks, governing, status, optimal } = result;
  const sections = familyAscending(section.family);

  const fixText = (() => {
    if (status === "FAIL") {
      return optimal.found ? (
        <>
          <b>{input.id}</b> is <b style={{ color: "var(--fail)" }}>unsafe</b> — {governing.label.toLowerCase()} utilization{" "}
          <b>{util(governing.utilization)}</b> ({governing.clause}). Upsize to{" "}
          <b>{optimal.sectionName}</b> → utilization <b>{util(optimal.utilization!)}</b>.
        </>
      ) : (
        <><b>{input.id}</b> fails and no section in the {section.family} range satisfies all checks — revisit the framing.</>
      );
    }
    if (status === "OVER") {
      return (
        <>
          <b>{input.id}</b> is <b style={{ color: "var(--over)" }}>over-designed</b> (utilization{" "}
          <b>{util(result.utilization)}</b>). The lightest adequate section is <b>{optimal.sectionName}</b>{" "}
          → saves <b>{num(optimal.massDelta!, 1)} kg/m</b> ({Math.round(result.steelSavedKg)} kg over {input.L} m).
        </>
      );
    }
    return (
      <>
        <b>{input.id}</b> is <b style={{ color: "var(--pass)" }}>correctly sized</b> — governing utilization{" "}
        <b>{util(result.utilization)}</b> ({governing.label}). {section.name} is the optimal {section.family} section.
      </>
    );
  })();

  return (
    <div className="card detail">
      <div className="card-hd">
        <div>
          <div className="eyebrow">Verification detail · audit trail</div>
          <h2 className="h2">{input.id} — {section.name}</h2>
        </div>
        <span className={`badge ${status}`}>{status}</span>
      </div>
      <div className="card-bd">
        <div className="det-head">
          <div className="note">{input.note}</div>
        </div>

        <div className="kv">
          <div className="row"><span className="lab">Member type</span><span className="val">{input.kind}</span></div>
          <div className="row"><span className="lab">Steel grade</span><span className="val">{input.grade} (f_y={fy})</span></div>
          <div className="row"><span className="lab">Length</span><span className="val">{input.L.toFixed(2)} m</span></div>
          <div className="row"><span className="lab">Section class</span><span className="val">Class {classBending}</span></div>
          {input.kind === "beam" ? (
            <>
              <div className="row"><span className="lab">g_k / q_k</span><span className="val">{input.gk} / {input.qk} kN/m</span></div>
              <div className="row"><span className="lab">w_Ed (1.35g+1.5q)</span><span className="val">{num(1.35 * (input.gk ?? 0) + 1.5 * (input.qk ?? 0), 1)} kN/m</span></div>
              <div className="row"><span className="lab">Lateral restraint</span><span className="val">{input.restrained === false ? "unrestrained" : "restrained"}</span></div>
            </>
          ) : input.kind === "beam-column" ? (
            <>
              <div className="row"><span className="lab">N_Ed (design)</span><span className="val">{input.NEd} kN</span></div>
              <div className="row"><span className="lab">M_y,Ed (design)</span><span className="val">{input.MyEd} kNm</span></div>
              <div className="row"><span className="lab">Buckling length</span><span className="val">{(input.LcrZ ?? input.L).toFixed(1)} m</span></div>
            </>
          ) : (
            <>
              <div className="row"><span className="lab">N_Ed (design)</span><span className="val">{input.NEd} kN</span></div>
              <div className="row"><span className="lab">Buckling length</span><span className="val">{(input.LcrZ ?? input.L).toFixed(1)} m</span></div>
            </>
          )}
        </div>

        <div className="checks">
          {checks.map((c) => (
            <CheckCard key={c.id} c={c} governing={c.id === governing.id} />
          ))}
        </div>

        <div className={`fix ${status}`}>{fixText}</div>

        {/* live editing — change inputs and watch the verdict recompute */}
        <div className="editbar">
          <label>
            Section
            <select value={section.name} onChange={(e) => onEdit({ sectionName: e.target.value })}>
              {sections.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          {input.kind === "beam" ? (
            <>
              <label>
                q_k (kN/m)
                <input type="number" value={input.qk} step={1}
                  onChange={(e) => onEdit({ qk: Number(e.target.value) })} style={{ width: 70 }} />
              </label>
              <label>
                Span (m)
                <input type="number" value={input.L} step={0.5}
                  onChange={(e) => onEdit({ L: Number(e.target.value) })} style={{ width: 70 }} />
              </label>
            </>
          ) : input.kind === "beam-column" ? (
            <>
              <label>
                N_Ed (kN)
                <input type="number" value={input.NEd} step={50}
                  onChange={(e) => onEdit({ NEd: Number(e.target.value) })} style={{ width: 80 }} />
              </label>
              <label>
                M_y,Ed (kNm)
                <input type="number" value={input.MyEd} step={10}
                  onChange={(e) => onEdit({ MyEd: Number(e.target.value) })} style={{ width: 80 }} />
              </label>
            </>
          ) : (
            <label>
              N_Ed (kN)
              <input type="number" value={input.NEd} step={50}
                onChange={(e) => onEdit({ NEd: Number(e.target.value) })} style={{ width: 80 }} />
            </label>
          )}
          <span className="hint">↑ edit to re-verify live</span>
        </div>
      </div>
    </div>
  );
}
