import type { DbClient } from "../connection.ts";

const ITEM_SUBCATEGORIES: Record<string, string[]> = {
  JEWELRY: [
    "ring",
    "necklace",
    "bracelet",
    "chain",
    "earrings",
    "pendant",
    "watch",
    "gold scrap",
    "other",
  ],
  ELECTRONICS: [
    "phone",
    "tablet",
    "laptop",
    "desktop",
    "monitor",
    "computer accessory",
    "game system",
    "game",
    "controller",
    "headphone",
    "earbuds",
    "tv",
    "camera accessory",
    "dvd player",
    "dvd",
    "printer",
    "radar detector",
    "other",
  ],
  "AUDIO EQUIPMENT": [
    "speaker",
    "subwoofer",
    "soundbar",
    "receiver",
    "microphone",
    "cd player",
    "stereo",
    "car audio",
    "dj equipment",
    "other",
  ],
  "POWER TOOLS": [
    "drill",
    "impact driver",
    "saw",
    "grinder",
    "sander",
    "nailer",
    "stapler",
    "other",
  ],
  "HAND TOOLS": [
    "hand tool",
    "hammer",
    "ratchet",
    "socket",
    "tool belt",
    "wrench",
    "other",
  ],
  "UTILITY TOOLS": [
    "air compressor",
    "pressure washer",
    "generator",
    "welder",
    "battery charger",
    "jack",
    "ladder",
    "light",
    "lawn mower",
    "snow blower",
    "trimmer",
    "leaf blower",
    "carpet kicker",
    "soldering gun",
    "other",
  ],
  "DRYWALL TOOLS": [
    "screw gun",
    "stilts",
    "pump",
    "tube",
    "handle",
    "flusher",
    "level",
    "router",
    "roller",
    "safety gear",
    "sprayer",
    "taping tool",
    "other",
  ],
  "MUSICAL INSTRUMENTS": [
    "guitar",
    "bass",
    "keyboard",
    "drum",
    "cymbal",
    "harmonica",
    "violin",
    "flute",
    "saxophone",
    "amplifier",
    "audio interface",
    "other",
  ],
  COLLECTIBLES: ["coin", "bill", "painting", "picture", "stamp", "other"],
  "SPORTS & OUTDOOR": [
    "air gun",
    "bike",
    "golf",
    "fitness equipment",
    "punching bag",
    "camping gear",
    "fishing gear",
    "hunting gear",
    "hockey equipment",
    "knife",
    "snowboard",
    "other",
  ],
  APPLIANCE: [
    "vacuum",
    "blender",
    "air fryer",
    "microwave",
    "coffee machine",
    "mixer",
    "fridge",
    "freezer",
    "sewing machine",
    "fan",
    "heater",
    "air conditioner",
    "barbecue",
    "dryer",
    "humidifier",
    "stove",
    "toaster",
    "washer",
    "other",
  ],
  APPAREL: [
    "mukluk",
    "mitten",
    "boots",
    "beadwork",
    "belt",
    "handcuffs",
    "hat",
    "jacket",
    "sunglasses",
    "other",
  ],
  "BABY & KIDS": ["stroller", "baby monitor", "car seat", "toy", "other"],
  OTHER: ["other"],
};

export const seedItemCategories = async (client: DbClient) => {
  await client.query(
    `
      INSERT INTO item_category (name)
      SELECT seed.name
      FROM UNNEST($1::text[]) AS seed(name)
      ON CONFLICT (name) DO NOTHING
    `,
    [Object.keys(ITEM_SUBCATEGORIES)],
  );
};

export const seedItemSubcategories = async (client: DbClient) => {
  for (const [categoryName, subcategories] of Object.entries(
    ITEM_SUBCATEGORIES,
  )) {
    await client.query(
      `
        INSERT INTO item_subcategory (category_id, name)
        SELECT category.id, seed.name
        FROM item_category category
        CROSS JOIN UNNEST($2::text[]) AS seed(name)
        WHERE category.name = $1
        ON CONFLICT (category_id, name) DO NOTHING
      `,
      [categoryName, subcategories],
    );
  }
};
