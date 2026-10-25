// Display labels only. Never use these mappings to rewrite request values.
const optionLabels: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  BLACK: "Black",
  BROWN: "Brown",
  BLONDE: "Blonde",
  RED: "Red",
  GRAY: "Gray",
  WHITE: "White",
  BALD: "Bald",
  BLUE: "Blue",
  PINK: "Pink",
  PURPLE: "Purple",
  GREEN: "Green",
  HAZEL: "Hazel",
  AMBER: "Amber",
  VIOLET: "Violet",
  HETEROCHROMIA: "Heterochromia",
};

const idLabels: Record<string, string> = {
  "DRIVER'S LICENSE": "Driver’s license",
  "HEALTH CARD": "Health card",
  "INDIAN STATUS CARD": "Indian Status Card",
  "BIRTH CERTIFICATE": "Birth certificate",
  "SOCIAL INSURANCE NUMBER": "Social Insurance Number",
  "FIREARMS LICENSE": "Firearms license",
  "CANADIAN PASSPORT": "Canadian passport",
  "CITIZENSHIP CARD": "Citizenship card",
  "PERMANENT RESIDENT CARD": "Permanent Resident Card",
  "PROVINCIAL ID": "Provincial ID",
  "MILITARY ID": "Military ID",
  OTHER: "Other",
};

export const formatClientOption = (value?: string | null): string => {
  if (!value?.trim()) return "—";
  const key = value.trim().toUpperCase();
  return Object.hasOwn(optionLabels, key) ? optionLabels[key] : value;
};

export const formatClientIdType = (value: string): string => {
  const key = value.trim().replaceAll("’", "'").toUpperCase();
  return Object.hasOwn(idLabels, key) ? idLabels[key] : value;
};
