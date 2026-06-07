import type { MemberResult } from "../engine/types";
import { util } from "../lib/format";

const BAR_COLOR: Record<string, string> = {
  FAIL: "var(--fail)",
  OVER: "var(--over)",
  PASS: "var(--pass)",
};

function UtilBar({ u, status }: { u: number; status: string }) {
  // bar scaled so that utilization 1.0 sits at ~72% of the track (room to show overshoot)
  const FULL = 1.0;
  const trackMax = 1.4;
  const widthPct = Math.min(u / trackMax, 1) * 100;
  const limitPct = (FULL / trackMax) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div className="ubar" title={`Utilization ${util(u)}`}>
        <div className="fill" style={{ width: `${widthPct}%`, background: BAR_COLOR[status] }} />
        <div className="limit" style={{ left: `${limitPct}%` }} />
      </div>
      <span className="uval" style={{ color: BAR_COLOR[status] }}>{util(u)}</span>
    </div>
  );
}

export function MemberTable({
  results,
  activeId,
  onSelect,
}: {
  results: MemberResult[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-hd">
        <div>
          <div className="eyebrow">Extracted schedule · verified</div>
          <h2 className="h2">{results.length} members checked</h2>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>click a row →</span>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Member</th>
            <th>Section</th>
            <th>Span / L</th>
            <th>Governing check</th>
            <th>Utilization</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.input.id}
              className={`row ${r.input.id === activeId ? "active" : ""}`}
              onClick={() => onSelect(r.input.id)}
            >
              <td>
                <span className="id">{r.input.id}</span>
                <span className="kindtag">{r.input.kind}</span>
              </td>
              <td className="sec">{r.section.name}</td>
              <td className="muted">{r.input.L.toFixed(1)} m</td>
              <td className="muted" style={{ fontSize: 12 }}>
                {r.governing.label}
                <span style={{ color: "var(--ink-faint)", marginLeft: 6, fontFamily: "var(--mono)" }}>
                  {r.governing.clause}
                </span>
              </td>
              <td><UtilBar u={r.utilization} status={r.status} /></td>
              <td><span className={`badge ${r.status}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
