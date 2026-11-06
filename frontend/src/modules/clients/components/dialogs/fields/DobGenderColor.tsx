import DateField from "../../../../../shared/components/DateField";
import React, { useEffect, useState } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import { formatClientOption } from "../../../utils/clientDisplay.ts";
import {
  formatLocalIsoDatePart,
  resolveDate,
} from "../../../../../shared/utils/formatters";
import { referenceApi } from "../../../../reference/reference.api";

interface DobGenderColorProps {
  date_of_birth?: Date | string;
  gender?: string;
  hair_color?: string;
  eye_color?: string;
  dateOfBirthError?: string;
  genderError?: string;
  hairColorError?: string;
  eyeColorError?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onDateOfBirthChange: (value: string) => void;
  onDateOfBirthBlur?: () => void;
}

const DobGenderColor: React.FC<DobGenderColorProps> = ({
  date_of_birth,
  gender,
  hair_color,
  eye_color,
  dateOfBirthError,
  genderError,
  hairColorError,
  eyeColorError,
  onChange,
  onDateOfBirthBlur,
  onDateOfBirthChange,
}) => {
  const [hairColors, setHairColors] = useState<string[]>([]);
  const [eyeColors, setEyeColors] = useState<string[]>([]);
  const [colorLoadError, setColorLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchColors = async () => {
      try {
        const [hair, eye] = await Promise.all([
          referenceApi.loadHairColors(),
          referenceApi.loadEyeColors(),
        ]);
        if (!active) return;
        setHairColors(hair);
        setEyeColors(eye);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load client colors", err);
        setColorLoadError(
          err instanceof Error ? err.message : "Unable to load colors.",
        );
      }
    };

    void fetchColors();

    return () => {
      active = false;
    };
  }, []);

  const selectedHairColor =
    hairColors.find(
      (color) =>
        color.trim().toUpperCase() === hair_color?.trim().toUpperCase(),
    ) ??
    hair_color ??
    "";
  const selectedEyeColor =
    eyeColors.find(
      (color) => color.trim().toUpperCase() === eye_color?.trim().toUpperCase(),
    ) ??
    eye_color ??
    "";

  const isValidDate = (d: unknown) =>
    d instanceof Date && !Number.isNaN(d.getTime());

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <DateField
        fullWidth
        required
        name="date_of_birth"
        label="DoB (MM-DD-YYYY)"
        value={
          typeof date_of_birth === "string"
            ? date_of_birth
            : date_of_birth && isValidDate(resolveDate(date_of_birth))
              ? formatLocalIsoDatePart(resolveDate(date_of_birth) as Date)
              : ""
        }
        onValueChange={onDateOfBirthChange}
        onBlur={onDateOfBirthBlur}
        size="small"
        error={Boolean(dateOfBirthError)}
        helperText={dateOfBirthError || " "}
      />

      <TextField
        select
        fullWidth
        required
        name="gender"
        label="Gender"
        value={gender?.trim().toUpperCase() ?? ""}
        onChange={onChange}
        size="small"
        error={Boolean(genderError)}
        helperText={genderError || " "}
      >
        <MenuItem value=""></MenuItem>
        <MenuItem value="MALE">Male</MenuItem>
        <MenuItem value="FEMALE">Female</MenuItem>
        <MenuItem value="OTHER">Other</MenuItem>
      </TextField>

      <TextField
        select
        fullWidth
        required
        name="hair_color"
        label="Hair color"
        value={selectedHairColor}
        onChange={onChange}
        size="small"
        error={Boolean(hairColorError || colorLoadError)}
        helperText={hairColorError || colorLoadError || " "}
      >
        <MenuItem value=""></MenuItem>
        {selectedHairColor && !hairColors.includes(selectedHairColor) && (
          <MenuItem value={selectedHairColor} disabled>
            {formatClientOption(hair_color)} (unavailable for new selections)
          </MenuItem>
        )}
        {hairColors.map((color) => (
          <MenuItem key={color} value={color}>
            {formatClientOption(color)}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        required
        name="eye_color"
        label="Eye color"
        value={selectedEyeColor}
        onChange={onChange}
        size="small"
        error={Boolean(eyeColorError || colorLoadError)}
        helperText={eyeColorError || colorLoadError || " "}
      >
        <MenuItem value=""></MenuItem>
        {selectedEyeColor && !eyeColors.includes(selectedEyeColor) && (
          <MenuItem value={selectedEyeColor} disabled>
            {formatClientOption(eye_color)} (unavailable for new selections)
          </MenuItem>
        )}
        {eyeColors.map((color) => (
          <MenuItem key={color} value={color}>
            {formatClientOption(color)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
};

export default DobGenderColor;
