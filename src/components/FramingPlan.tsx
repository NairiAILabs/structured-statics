import { planExtent } from "../engine/layout";
import type { MemberResult, Status } from "../engine/types";

const COLOR: Record<Status, string> = {
  FAIL: "#ce3b3b",
  OVER: "#b9821a",
  PASS: "#2e8b50",
};

const PAD = 46;

export function FramingPlan({
  results,
  activeId,
  onSelect,
}: {
  results: MemberResult[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const extent = planExtent(results.map((r) => r.input));
  // px per metre — shrink for large schedules so the diagram fits
  const SCALE = Math.max(12, Math.min(30, 560 / Math.max(extent.w, extent.h)));
  const W = extent.w * SCALE + PAD * 2;
  const H = extent.h * SCALE + PAD * 2;
  const mx = (x: number) => PAD + x * SCALE;
  const my = (y: number) => PAD + (extent.h - y) * SCALE;

  // gridlines: sample data uses fixed grid; otherwise none
  const xLines = [0, extent.w - 1];
  const yLines = [0, extent.h - 1];

  return (
    <div className="card">
      <div className="card-hd">
        <div>
          <div className="eyebrow">Drawing overlay</div>
          <h2 className="h2">Framing plan — verification status</h2>
        </div>
      </div>
      <div className="plan-wrap">
        <div className="plan">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Framing plan with verification status">
            {/* grid frame */}
            <rect x={PAD} y={PAD} width={extent.w * SCALE} height={extent.h * SCALE}
              fill="none" stroke="#cfdac9" strokeWidth={1} strokeDasharray="2 5" />
            {/* boundary gridlines */}
            {xLines.map((x) => (
              <line key={`gx${x}`} x1={mx(x)} y1={PAD - 14} x2={mx(x)} y2={H - PAD + 14}
                stroke="#e0e7db" strokeWidth={1} />
            ))}
            {yLines.map((y) => (
              <line key={`gy${y}`} x1={PAD - 14} y1={my(y)} x2={W - PAD + 14} y2={my(y)}
                stroke="#e0e7db" strokeWidth={1} />
            ))}

            {/* members */}
            {results.map((r) => {
              const color = COLOR[r.status];
              const active = r.input.id === activeId;
              if (r.input.kind === "beam" && r.input.plan && "x1" in r.input.plan) {
                const p = r.input.plan;
                const x1 = mx(p.x1), y1 = my(p.y1), x2 = mx(p.x2), y2 = my(p.y2);
                const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
                return (
                  <g key={r.input.id} className="plan-member" style={{ cursor: "pointer" }}
                    onClick={() => onSelect(r.input.id)}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color}
                      strokeWidth={active ? 8 : 5} strokeLinecap="round"
                      opacity={active ? 1 : 0.92} />
                    {active && (
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color}
                        strokeWidth={16} strokeLinecap="round" opacity={0.18} />
                    )}
                    <rect x={cx - 17} y={cy - 9} width={34} height={18} rx={4}
                      fill="#ffffff" stroke={color} strokeWidth={1} opacity={0.98} />
                    <text x={cx} y={cy + 4} fontSize={10.5} fontFamily="monospace"
                      fill={color} textAnchor="middle">{r.input.id}</text>
                  </g>
                );
              }
              if ((r.input.kind === "column" || r.input.kind === "beam-column") && r.input.plan && "x" in r.input.plan) {
                const p = r.input.plan;
                const x = mx(p.x), y = my(p.y);
                return (
                  <g key={r.input.id} style={{ cursor: "pointer" }} onClick={() => onSelect(r.input.id)}>
                    {active && <rect x={x - 14} y={y - 14} width={28} height={28} rx={4} fill={color} opacity={0.18} />}
                    <rect x={x - 9} y={y - 9} width={18} height={18} rx={3}
                      fill={color} stroke="#ffffff" strokeWidth={2} />
                    <text x={x + 14} y={y - 12} fontSize={10.5} fontFamily="monospace"
                      fill={color} textAnchor="start">{r.input.id}</text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
        </div>
        <div className="plan-legend">
          <span className="lg"><span className="dot" style={{ background: COLOR.FAIL }} /> Unsafe — fails code</span>
          <span className="lg"><span className="dot" style={{ background: COLOR.OVER }} /> Over-designed</span>
          <span className="lg"><span className="dot" style={{ background: COLOR.PASS }} /> Verified OK</span>
        </div>
      </div>
    </div>
  );
}
