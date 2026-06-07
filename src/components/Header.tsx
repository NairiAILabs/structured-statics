import { PROJECT_NAME, SHEET } from "../engine/sampleProject";
import type { CodeName } from "../engine/types";

const CODE_LABEL: Record<CodeName, string> = {
  EC3: "EN 1993-1-1",
  AISC: "AISC 360 (LRFD)",
};

export function Header({ code, onCode }: { code: CodeName; onCode: (c: CodeName) => void }) {
  return (
    <header className="hdr">
      <div className="hdr-left">
        <div className="mark">
          <img src="/logo-mark.png" alt="Structured AI" />
        </div>
        <div>
          <div className="brand-title">
            Statics <span className="sub">/ Structural Verification</span>
          </div>
          <div className="brand-sub">
            Deterministic structural checks on extracted drawing data · an integration concept for Structured&nbsp;AI
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="hdr-meta">
          Sheet <b>{SHEET}</b> · {PROJECT_NAME}
          <br />
          Code basis <b>{CODE_LABEL[code]}</b>
        </div>
        <div className="code-toggle" role="group" aria-label="Code basis">
          <button className={code === "EC3" ? "on" : ""} onClick={() => onCode("EC3")}>EC3</button>
          <button className={code === "AISC" ? "on" : ""} onClick={() => onCode("AISC")}>AISC</button>
        </div>
      </div>
    </header>
  );
}
