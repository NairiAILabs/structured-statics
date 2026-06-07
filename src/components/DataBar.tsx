import { useRef, useState } from "react";
import { parseSchedule, TEMPLATE_CSV } from "../engine/parseSchedule";
import type { MemberInput } from "../engine/types";

export function DataBar({
  source,
  count,
  onLoad,
  onReset,
}: {
  source: string;
  count: number;
  onLoad: (members: MemberInput[], label: string) => void;
  onReset: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function apply(text: string, label: string) {
    const { members, errors } = parseSchedule(text);
    if (members.length === 0) {
      setErrors(errors.length ? errors : ["No members found in the file."]);
      return;
    }
    setErrors(errors); // may be non-fatal row skips
    onLoad(members, label);
    setShowPaste(false);
    setPasteText("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => apply(t, f.name));
    e.target.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="databar">
      <div className="databar-row">
        <div className="databar-src">
          <span className="eyebrow">Input schedule</span>
          <div className="src-line">
            <b>{source}</b> · {count} members
            <span className="src-hint"> — in production this is the schedule Structured&nbsp;AI extracts from the drawing</span>
          </div>
        </div>
        <div className="databar-actions">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.json,.txt" onChange={onFile} style={{ display: "none" }} />
          <button className="btn primary" onClick={() => fileRef.current?.click()}>↑ Upload schedule</button>
          <button className="btn" onClick={() => setShowPaste((s) => !s)}>Paste from Excel</button>
          <button className="btn ghost" onClick={downloadTemplate}>Download template</button>
          <button className="btn ghost" onClick={() => { setErrors([]); onReset(); }}>Reset to demo</button>
        </div>
      </div>

      {showPaste && (
        <div className="paste">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Paste rows copied from Excel/CSV (header first):\nid,kind,section,grade,L,gk,qk,NEd,MyEd,restrained,note\nB-101,beam,IPE 300,S235,7.0,8,12,,,true,..."}
            spellCheck={false}
          />
          <button className="btn primary" onClick={() => apply(pasteText, "pasted schedule")} disabled={!pasteText.trim()}>
            Verify pasted schedule
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="parse-errors">
          {errors.slice(0, 6).map((e, i) => <div key={i}>⚠ {e}</div>)}
          {errors.length > 6 && <div>…and {errors.length - 6} more</div>}
        </div>
      )}
    </div>
  );
}
