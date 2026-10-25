import { connect } from "../../database/connection.ts";
import type { EyeColor } from "../../../shared/models/eye-color.model.ts";
import type { HairColor } from "../../../shared/models/hair-color.model.ts";

type ColorOption = EyeColor | HairColor;

const mapColorOptionRow = (row: Record<string, unknown>): ColorOption => ({
  color: String(row.color),
  is_active: Boolean(row.is_active),
});

const loadColorsForAdmin = async (
  tableName: "eye_color" | "hair_color",
): Promise<ColorOption[]> => {
  const client = await connect();
  const query = `
    SELECT UPPER(color) AS color, is_active
    FROM ${tableName}
    ORDER BY is_active DESC, color ASC
  `;

  try {
    const result = await client.query(query);
    return result.rows.map(mapColorOptionRow);
  } finally {
    client.release();
  }
};

const addColor = async (
  tableName: "eye_color" | "hair_color",
  color: string,
) => {
  const client = await connect();
  const query = `
    INSERT INTO ${tableName} (color, is_active)
    SELECT $1, TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM ${tableName} WHERE LOWER(color) = LOWER($1)
    )
    RETURNING color
  `;

  try {
    const result = await client.query(query, [color]);
    return result.rows[0] ? String(result.rows[0].color) : null;
  } finally {
    client.release();
  }
};

const setColorActive = async (
  tableName: "eye_color" | "hair_color",
  color: string,
  isActive: boolean,
): Promise<ColorOption | null> => {
  const client = await connect();
  const query = `
    UPDATE ${tableName}
    SET is_active = $1
    WHERE UPPER(color) = $2 AND is_active = $3
    RETURNING UPPER(color) AS color, is_active
  `;

  try {
    const result = await client.query(query, [isActive, color, !isActive]);
    const row = result.rows[0];
    return row ? mapColorOptionRow(row) : null;
  } finally {
    client.release();
  }
};

export const clientReferenceRepo = {
  loadHairColorsForAdmin: (): Promise<HairColor[]> =>
    loadColorsForAdmin("hair_color") as Promise<HairColor[]>,

  addHairColor: (color: string): Promise<string | null> =>
    addColor("hair_color", color),

  deactivateHairColor: (color: string): Promise<HairColor | null> =>
    setColorActive("hair_color", color, false) as Promise<HairColor | null>,

  activateHairColor: (color: string): Promise<HairColor | null> =>
    setColorActive("hair_color", color, true) as Promise<HairColor | null>,

  loadEyeColorsForAdmin: (): Promise<EyeColor[]> =>
    loadColorsForAdmin("eye_color") as Promise<EyeColor[]>,

  addEyeColor: (color: string): Promise<string | null> =>
    addColor("eye_color", color),

  deactivateEyeColor: (color: string): Promise<EyeColor | null> =>
    setColorActive("eye_color", color, false) as Promise<EyeColor | null>,

  activateEyeColor: (color: string): Promise<EyeColor | null> =>
    setColorActive("eye_color", color, true) as Promise<EyeColor | null>,
};
