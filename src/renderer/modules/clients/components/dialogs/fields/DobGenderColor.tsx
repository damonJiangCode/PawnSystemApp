import React, { useEffect, useState } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import { clientApi } from "../../../client.api";
import { formatClientOption } from "../../../utils/clientDisplay.ts";
import {
  formatLocalIsoDatePart,
  resolveDate,
} from "../../../../../shared/utils/formatters";

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
}) => {
  const [hairColors, setHairColors] = useState<string[]>([]);
  const [eyeColors, setEyeColors] = useState<string[]>([]);
  const [colorLoadError, setColorLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchColors = async () => {
      try {
        const [hair, eye] = await Promise.all([
          clientApi.loadHairColors(),
          clientApi.loadEyeColors(),
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

  const isValidDate = (d: unknown) =>
    d instanceof Date && !Number.isNaN(d.getTime());

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <TextField
        fullWidth
        required
        type="date"
        name="date_of_birth"
        label="Date of birth"
        value={
          typeof date_of_birth === "string"
            ? date_of_birth
            : date_of_birth && isValidDate(resolveDate(date_of_birth))
              ? formatLocalIsoDatePart(resolveDate(date_of_birth) as Date)
              : ""
        }
        onChange={onChange}
        onBlur={onDateOfBirthBlur}
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
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
        value={
          hairColors.some(
            (c) =>
              c.trim().toLowerCase() ===
              (hair_color || "").trim().toLowerCase(),
          )
            ? hair_color
            : ""
        }
        onChange={onChange}
        size="small"
        error={Boolean(hairColorError || colorLoadError)}
        helperText={hairColorError || colorLoadError || " "}
      >
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
        value={
          eyeColors.some(
            (c) =>
              c.trim().toLowerCase() === (eye_color || "").trim().toLowerCase(),
          )
            ? eye_color
            : ""
        }
        onChange={onChange}
        size="small"
        error={Boolean(eyeColorError || colorLoadError)}
        helperText={eyeColorError || colorLoadError || " "}
      >
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
