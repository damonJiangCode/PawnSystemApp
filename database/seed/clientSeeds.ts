import fs from "fs";
import path from "path";
import csv from "csv-parser";
import type { DbClient } from "../connection.ts";

const HAIR_COLORS = [
  "BLACK",
  "BROWN",
  "BLONDE",
  "RED",
  "GRAY",
  "WHITE",
  "BALD",
  "BLUE",
  "PINK",
  "PURPLE",
  "GREEN",
  "OTHER",
];

const EYE_COLORS = [
  "BLACK",
  "BROWN",
  "HAZEL",
  "AMBER",
  "GREEN",
  "BLUE",
  "GRAY",
  "VIOLET",
  "RED",
  "HETEROCHROMIA",
  "OTHER",
];

const seedColors = async (
  client: DbClient,
  tableName: "hair_color" | "eye_color",
  colors: string[],
) => {
  await client.query(
    `
      INSERT INTO ${tableName} (color, is_active)
      SELECT seed.color, TRUE
      FROM UNNEST($1::text[]) AS seed(color)
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${tableName} existing
        WHERE UPPER(existing.color) = seed.color
      )
    `,
    [colors],
  );
};

export const seedCities = async (client: DbClient) => {
  const filePath = path.join(__dirname, "canadacities.csv");
  const stream = fs.createReadStream(filePath).pipe(csv());
  const cities = new Map<
    string,
    { city: string; province: string; country: string }
  >();

  for await (const row of stream) {
    const city = row.city_ascii?.trim();
    const province = row.province_name?.trim();
    const country = row.country?.trim() || "Canada";

    if (!city || !province || !country) {
      continue;
    }

    cities.set(`${city}\u0000${province}\u0000${country}`, {
      city,
      province,
      country,
    });
  }

  const values = [...cities.values()];
  await client.query(
    `
      INSERT INTO city (city, province, country)
      SELECT seed.city, seed.province, seed.country
      FROM UNNEST($1::text[], $2::text[], $3::text[]) AS seed(city, province, country)
      ON CONFLICT (city, province, country) DO NOTHING
    `,
    [
      values.map((value) => value.city),
      values.map((value) => value.province),
      values.map((value) => value.country),
    ],
  );
};

export const seedHairColors = async (client: DbClient) => {
  await seedColors(client, "hair_color", HAIR_COLORS);
};

export const seedEyeColors = async (client: DbClient) => {
  await seedColors(client, "eye_color", EYE_COLORS);
};

export const seedIdTypes = async (client: DbClient) => {
  const { loadIdTypeMapping } =
    require("../migration/scripts/id-type-mapping.cjs") as {
      loadIdTypeMapping: () => {
        targetTypes: { type: string; is_active: boolean }[];
      };
    };
  const { targetTypes } = loadIdTypeMapping();
  await client.query(
    `INSERT INTO id_type (type, is_active)
     SELECT seed.type, seed.is_active
     FROM UNNEST($1::text[], $2::boolean[]) AS seed(type, is_active)
     ON CONFLICT (type) DO NOTHING`,
    [
      targetTypes.map((target) => target.type),
      targetTypes.map((target) => target.is_active),
    ],
  );
};
