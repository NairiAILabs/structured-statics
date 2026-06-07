# Statics — a deterministic structural-verification layer for Structured AI

> A proof-of-concept QA/QC check that sits **on top of** Structured AI's drawing
> extraction and answers the one question their pipeline can't: *is this member
> actually adequate for the load it carries?*

![status: proof of concept](https://img.shields.io/badge/status-proof%20of%20concept-c5d9c0)
![code: EN 1993-1-1](https://img.shields.io/badge/code-EN%201993--1--1-9aa89e)
![code: AISC 360](https://img.shields.io/badge/code-AISC%20360-586059)

---

## The gap this fills

Structured AI reads drawings and documents and checks them **symbolically**:
Is the schedule consistent? Does the annotation match the code *text*? Do the
trades clash geometrically? That's hard, valuable work — and it's everything
their current product does.

What no LLM / vision model should be trusted to do is the **physics**: evaluate
whether a beam passes in bending, whether a column buckles, whether deflection
is within limits. That has to be **deterministic and numeric**. It's also where
the most expensive and dangerous errors live:

- **Under-designed members** → unsafe, RFIs, change orders, liability.
- **Over-designed members** → wasted steel, cost, and embodied carbon.

`Statics` is that deterministic layer. It consumes the member schedule Structured
already extracts (IDs, sections, grades, spans, loads) and runs real Eurocode 3
checks, returning the same *"exact location / what's wrong / how to fix"* contract
Structured ships — but for the mechanics.

| Member type | Checks (EC3 & AISC 360) |
|---|---|
| **Beam** | Bending, shear, deflection (SLS), and Lateral-Torsional Buckling (LTB). |
| **Column** | Flexural buckling (both axes). |
| **Beam-Column** | Combined axial + bending interaction. |

## Why it's a true add-on, not a separate tool

It does **not** re-do extraction. It depends on it. The input
([`sampleProject.ts`](src/engine/sampleProject.ts)) is exactly the shape of data
Structured's vision model / Revit add-in already produces. Statics is the
verification stage you bolt onto the end of that pipeline — and it's a check that
their plain-English "custom check" framework structurally cannot express, because
it requires a mechanics engine, not a prompt.

## The demo

- **Framing-plan overlay** — members colour-coded by structural status, so the
  "drawing" reviews itself.
- **Determinism callout** — the same member reviewed two ways: symbolic review
  reports "no issue flagged"; computation proves it fails by a margin no eye can
  catch.
- **Live re-verification** — change a section or load and watch the verdict, the
  plan, and the project-wide impact recompute instantly.
- **Material & carbon impact** — recoverable steel, cost, and CO₂ from
  de-rating over-designed members, reported honestly alongside the steel that
  must be *added* to fix unsafe members.

## Run it

```bash
npm install
npm run dev      # http://localhost:5176
```

## Use it with a real schedule

> **Production Note:** In a real deployment, Statics does not use files. It is an API layer that consumes the structured JSON schema directly from the upstream extraction model in-memory. The CSV/JSON upload interface is provided strictly as a standalone demo adapter.

The landing demo is a fixed sample sheet, but the tool runs on **any** member
schedule. Use the input bar at the top:

- **Upload schedule** — a `.csv` / `.json` file.
- **Paste from Excel** — copy rows straight out of a spreadsheet (tab-separated)
  and paste them in.
- **Download template** — a starter CSV with the exact columns.

Columns (header row required; blanks allowed where not applicable):

```
id,kind,section,grade,L,gk,qk,NEd,MyEd,restrained,note
B-101,beam,IPE 300,S235,7.0,8,12,,,true,Primary floor beam
RB-1,beam,IPE 360,S235,6.5,10,14,,,false,Unrestrained roof beam
C-101,column,HEA 200,S235,3.5,,,850,,,Internal column
C-102,beam-column,HEA 240,S235,4.0,,,700,90,,Perimeter column + moment
```

`kind` ∈ {`beam`, `column`, `beam-column`}; `L` in m; `gk`/`qk` in kN/m;
`NEd` in kN; `MyEd` in kNm; `restrained` true/false (beams). Sections are
validated against the catalogue and unknown ones are flagged. No drawing
geometry is needed — the verification diagram is generated automatically.

**Where this fits the pipeline:** this schedule is exactly what an extraction
tool (e.g. Structured AI's vision model / Revit add-in) produces from a drawing.
Statics is the verification stage that consumes it — it deliberately does *not*
re-do extraction.

## Architecture

```
src/
  engine/
    sections.ts       EN 10365 section database (IPE, HEA) + helpers
    ec3.ts            EN 1993-1-1 checks: classification, bending, shear,
                      deflection, flexural buckling — pure, deterministic
    verify.ts         orchestration: governing check, optimal-section search,
                      status, project-level material/cost/CO₂ impact
    sampleProject.ts  simulated extracted schedule (sheet S-201)
    types.ts          domain types
  components/         React UI (plan overlay, table, audit-trail detail, panels)
```

The engine is framework-free and fully testable in isolation — the UI is just a
view over it.

## Scope & Production Boundaries

This is a proof-of-concept for the *integration architecture* between AI extraction and deterministic physics, not a replacement for full-suite solvers like Tekla or ETABS. 

To isolate the AI-to-Physics bridge, the engine enforces strict boundaries:
- **Assumed Geometry:** Evaluates simply-supported spans and pure compression/interaction based on extracted system lengths.
- **Hardcoded Base Factors:** Uses base code parameters (e.g., EC3 $\gamma_{M0} = 1.0$, AISC basic LRFD 1.2D+1.6L). 
- **Upstreamed Complexity:** It deliberately does not calculate regional National Annexes, fire design, or complex consequence classes. In production, these parameters would be injected into the payload during an upstream load-takedown stage before hitting this verification layer.

The goal is to prove that if the AI accurately structures the data, a pluggable deterministic module (EC3/AISC) can instantly generate a fully auditable safety trace.

---

Built by a civil-engineering student (Centrale Lyon ENISE) as the "physics" complement to symbolic drawing QA. Not affiliated with Structured AI; the logo is used only to illustrate the integration concept.