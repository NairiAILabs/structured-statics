import type { Section } from "./types";

// ── European rolled-section database ─────────────────────────────────────────
// Standard tabulated properties (EN 10365 / ArcelorMittal). Dimensions in mm,
// area in cm², second moments in cm⁴, section moduli in cm³, mass in kg/m,
// torsion constant It in cm⁴, warping constant Iw in cm⁶. Real catalogue numbers.

const IPE: Section[] = [
  // name,       mass,  h,   b,   tw,   tf,   r,  A,    Iy,    Wely, Wply,  Iz,   It,    Iw(cm⁶)
  mk("IPE 80",   6.0,   80,  46,  3.8,  5.2,  5,  7.64, 80.1,  20.0, 23.2,  8.49, 0.70,    118),
  mk("IPE 100",  8.1,  100,  55,  4.1,  5.7,  7, 10.3, 171,   34.2, 39.4, 15.9,  1.20,    351),
  mk("IPE 120", 10.4,  120,  64,  4.4,  6.3,  7, 13.2, 318,   53.0, 60.7, 27.7,  1.74,    890),
  mk("IPE 140", 12.9,  140,  73,  4.7,  6.9,  7, 16.4, 541,   77.3, 88.3, 44.9,  2.45,   1981),
  mk("IPE 160", 15.8,  160,  82,  5.0,  7.4,  9, 20.1, 869,  109,  124,   68.3,  3.60,   3960),
  mk("IPE 180", 18.8,  180,  91,  5.3,  8.0,  9, 23.9, 1317, 146,  166,  101,    4.79,   7430),
  mk("IPE 200", 22.4,  200, 100,  5.6,  8.5, 12, 28.5, 1943, 194,  221,  142,    6.98,  13000),
  mk("IPE 220", 26.2,  220, 110,  5.9,  9.2, 12, 33.4, 2772, 252,  285,  205,    9.07,  22700),
  mk("IPE 240", 30.7,  240, 120,  6.2,  9.8, 15, 39.1, 3892, 324,  367,  284,   12.9,   37400),
  mk("IPE 270", 36.1,  270, 135,  6.6, 10.2, 15, 45.9, 5790, 429,  484,  420,   15.9,   70600),
  mk("IPE 300", 42.2,  300, 150,  7.1, 10.7, 15, 53.8, 8356, 557,  628,  604,   20.1,  126000),
  mk("IPE 330", 49.1,  330, 160,  7.5, 11.5, 18, 62.6, 11770, 713, 804,  788,   28.1,  199000),
  mk("IPE 360", 57.1,  360, 170,  8.0, 12.7, 18, 72.7, 16270, 904, 1019, 1043,  37.3,  314000),
  mk("IPE 400", 66.3,  400, 180,  8.6, 13.5, 21, 84.5, 23130, 1156, 1307, 1318, 51.1,  490000),
  mk("IPE 450", 77.6,  450, 190,  9.4, 14.6, 21, 98.8, 33740, 1500, 1702, 1676, 66.9,  791000),
  mk("IPE 500", 90.7,  500, 200, 10.2, 16.0, 21, 116,  48200, 1928, 2194, 2142, 89.3, 1249000),
  mk("IPE 550", 106,   550, 210, 11.1, 17.2, 24, 134,  67120, 2441, 2787, 2668, 123,  1884000),
  mk("IPE 600", 122,   600, 220, 12.0, 19.0, 24, 156,  92080, 3069, 3512, 3387, 165,  2846000),
].map((s) => ({ ...s, family: "IPE" as const }));

const HEA: Section[] = [
  mk("HEA 100", 16.7,  96, 100, 5.0,  8.0, 12, 21.2, 349,   72.8, 83.0, 134,   5.24,    2580),
  mk("HEA 120", 19.9, 114, 120, 5.0,  8.0, 12, 25.3, 606,  106,  120,   231,   5.99,    6470),
  mk("HEA 140", 24.7, 133, 140, 5.5,  8.5, 12, 31.4, 1033, 155,  173,   389,   8.13,   15060),
  mk("HEA 160", 30.4, 152, 160, 6.0,  9.0, 15, 38.8, 1673, 220,  245,   616,  12.19,   31410),
  mk("HEA 180", 35.5, 171, 180, 6.0,  9.5, 15, 45.3, 2510, 294,  325,   925,  14.80,   60210),
  mk("HEA 200", 42.3, 190, 200, 6.5, 10.0, 18, 53.8, 3692, 389,  429,  1336,  21.0,   108000),
  mk("HEA 220", 50.5, 210, 220, 7.0, 11.0, 18, 64.3, 5410, 515,  568,  1955,  28.5,   193300),
  mk("HEA 240", 60.3, 230, 240, 7.5, 12.0, 21, 76.8, 7763, 675,  745,  2769,  41.6,   328500),
  mk("HEA 260", 68.2, 250, 260, 7.5, 12.5, 24, 86.8, 10450, 836, 920,  3668,  52.4,   516400),
  mk("HEA 280", 76.4, 270, 280, 8.0, 13.0, 24, 97.3, 13670, 1010, 1112, 4763, 62.1,   785400),
  mk("HEA 300", 88.3, 290, 300, 8.5, 14.0, 27, 112.5, 18260, 1260, 1383, 6310, 85.2, 1200000),
].map((s) => ({ ...s, family: "HEA" as const }));

/** helper to build a Section literal in column order (family filled in afterwards) */
function mk(
  name: string, mass: number, h: number, b: number, tw: number, tf: number,
  r: number, A: number, Iy: number, Wely: number, Wply: number, Iz: number,
  It: number, Iw: number,
): Section {
  return { name, family: "IPE", mass, h, b, tw, tf, r, A, Iy, Wely, Wply, Iz, It, Iw };
}

export const SECTIONS: Section[] = [...IPE, ...HEA];

export const SECTIONS_BY_NAME: Record<string, Section> = Object.fromEntries(
  SECTIONS.map((s) => [s.name, s]),
);

export function getSection(name: string): Section {
  const s = SECTIONS_BY_NAME[name];
  if (!s) throw new Error(`Unknown section: ${name}`);
  return s;
}

/** Sections of the same family, ordered light → heavy (for optimisation). */
export function familyAscending(family: Section["family"]): Section[] {
  return SECTIONS.filter((s) => s.family === family).sort((a, b) => a.mass - b.mass);
}

export const FY: Record<string, number> = { S235: 235, S275: 275, S355: 355 };
