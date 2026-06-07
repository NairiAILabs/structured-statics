import {
  aiscBeamColumnCheck,
  aiscBendingCheck,
  aiscCompressionCheck,
  aiscDeflectionCheck,
  aiscDesignUDL,
  aiscShearCheck,
} from "./aisc";
import {
  bendingAxialCheck,
  bendingCheck,
  bucklingCheck,
  classifyBending,
  classifyCompression,
  deflectionCheck,
  designUDL,
  ltbCheck,
  shearCheck,
} from "./ec3";
import { familyAscending, FY, getSection } from "./sections";
import type {
  Check,
  CodeName,
  MemberInput,
  MemberResult,
  OptimalFix,
  ProjectImpact,
  Section,
  Status,
} from "./types";

const EC3_DEFLECTION_LIMIT = 250; // L/250
const OVERDESIGN_BAND = 0.85; // a section ≤85% of current mass that still passes → over-designed

/** Run all relevant checks for one member against one section, under one code. */
function runChecks(
  input: MemberInput,
  section: Section,
  code: CodeName,
): { checks: Check[]; classBending: number } {
  const fy = FY[input.grade];
  const restrained = input.restrained !== false; // default true

  if (input.kind === "beam") {
    const gk = input.gk ?? 0;
    const qk = input.qk ?? 0;
    const wSer = gk + qk; // characteristic, kN/m
    if (code === "AISC") {
      const wu = aiscDesignUDL(gk, qk);
      const Mu = (wu * input.L * input.L) / 8;
      const Vu = (wu * input.L) / 2;
      return {
        classBending: classifyBending(section, fy),
        checks: [
          aiscBendingCheck(section, fy, Mu, input.L, restrained),
          aiscShearCheck(section, fy, Vu),
          aiscDeflectionCheck(section, wSer, input.L, 240), // IBC total-load limit
        ],
      };
    }
    const wEd = designUDL(gk, qk);
    const MEd = (wEd * input.L * input.L) / 8;
    const VEd = (wEd * input.L) / 2;
    const cls = classifyBending(section, fy);
    const checks: Check[] = [
      bendingCheck(section, fy, cls, MEd),
      shearCheck(section, fy, VEd),
      deflectionCheck(section, wSer, input.L, EC3_DEFLECTION_LIMIT),
    ];
    if (!restrained) checks.push(ltbCheck(section, fy, cls, MEd, input.L));
    return { classBending: cls, checks };
  }

  if (input.kind === "beam-column") {
    const NEd = input.NEd ?? 0;
    const MyEd = input.MyEd ?? 0;
    const Lcr = input.LcrZ ?? input.L;
    if (code === "AISC") {
      return {
        classBending: classifyCompression(section, fy),
        checks: [
          aiscCompressionCheck(section, fy, NEd, Lcr),
          aiscBeamColumnCheck(section, fy, NEd, MyEd, Lcr),
        ],
      };
    }
    return {
      classBending: classifyCompression(section, fy),
      checks: [
        bucklingCheck(section, fy, NEd, input.LcrY ?? input.L, Lcr),
        bendingAxialCheck(section, fy, NEd, MyEd),
      ],
    };
  }

  // column
  const NEd = input.NEd ?? 0;
  const LcrY = input.LcrY ?? input.L;
  const LcrZ = input.LcrZ ?? input.L;
  const cls = classifyCompression(section, fy);
  if (code === "AISC") {
    return { classBending: cls, checks: [aiscCompressionCheck(section, fy, NEd, LcrZ)] };
  }
  return { classBending: cls, checks: [bucklingCheck(section, fy, NEd, LcrY, LcrZ)] };
}

function governingUtil(checks: Check[]): number {
  return Math.max(...checks.map((c) => c.utilization));
}

/** Lightest section in the same family that satisfies every check under this code. */
function findOptimal(input: MemberInput, current: Section, code: CodeName): OptimalFix {
  for (const cand of familyAscending(current.family)) {
    const { checks } = runChecks(input, cand, code);
    if (checks.every((c) => c.pass)) {
      return {
        sectionName: cand.name,
        utilization: governingUtil(checks),
        massDelta: round(current.mass - cand.mass, 1),
        found: true,
      };
    }
  }
  return { sectionName: null, utilization: null, massDelta: null, found: false };
}

export function verifyMember(input: MemberInput, code: CodeName): MemberResult {
  const section = getSection(input.sectionName);
  const fy = FY[input.grade];
  const { checks, classBending } = runChecks(input, section, code);
  const governing = checks.reduce((a, b) => (b.utilization > a.utilization ? b : a));
  const utilization = governing.utilization;
  const optimal = findOptimal(input, section, code);

  let status: Status;
  if (utilization > 1.0) status = "FAIL";
  else if (
    optimal.found &&
    optimal.sectionName !== section.name &&
    (optimal.massDelta ?? 0) > 0 &&
    getSection(optimal.sectionName!).mass <= section.mass * OVERDESIGN_BAND
  ) {
    status = "OVER";
  } else status = "PASS";

  let steelSavedKg = 0;
  let steelAddedKg = 0;
  if (status === "OVER" && optimal.massDelta) {
    steelSavedKg = optimal.massDelta * input.L;
  } else if (status === "FAIL" && optimal.found) {
    const upsized = getSection(optimal.sectionName!);
    steelAddedKg = Math.max(0, (upsized.mass - section.mass) * input.L);
  }

  return {
    input,
    code,
    section,
    fy,
    classBending,
    checks,
    governing,
    utilization,
    status,
    optimal,
    steelSavedKg: round(steelSavedKg, 0),
    steelAddedKg: round(steelAddedKg, 0),
  };
}

export function verifyProject(inputs: MemberInput[], code: CodeName = "EC3"): MemberResult[] {
  return inputs.map((m) => verifyMember(m, code));
}

export function projectImpact(
  results: MemberResult[],
  costPerKg = 1.5,
  co2PerKg = 1.85,
): ProjectImpact {
  const fail = results.filter((r) => r.status === "FAIL").length;
  const over = results.filter((r) => r.status === "OVER").length;
  const pass = results.filter((r) => r.status === "PASS").length;
  const steelSavedKg = sum(results.map((r) => r.steelSavedKg));
  const steelAddedKg = sum(results.map((r) => r.steelAddedKg));
  return {
    members: results.length,
    fail,
    over,
    pass,
    steelSavedKg,
    steelAddedKg,
    costPerKg,
    co2PerKg,
    netSteelKg: steelSavedKg - steelAddedKg,
    costSaved: round(steelSavedKg * costPerKg, 0),
    co2Saved: round(steelSavedKg * co2PerKg, 0),
  };
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function round(x: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}
