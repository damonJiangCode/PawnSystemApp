import React, { useEffect, useState } from "react";
import { Box, TextField } from "@mui/material";

interface HeightWeightFieldsProps {
  height_cm?: number;
  weight_kg?: number;
  heightError?: string;
  weightError?: string;
  onHeightCmChange: (value: number | undefined) => void;
  onWeightKgChange: (value: number | undefined) => void;
  onHeightInputChange?: () => void;
  onWeightInputChange?: () => void;
}

const cmToFt = (cm: number) => cm / 30.48;
const ftToCm = (ft: number) => ft * 30.48;
const kgToLb = (kg: number) => kg * 2.20462;
const lbToKg = (lb: number) => lb / 2.20462;

const HeightWeightFields: React.FC<HeightWeightFieldsProps> = ({
  height_cm,
  weight_kg,
  heightError,
  weightError,
  onHeightCmChange,
  onWeightKgChange,
  onHeightInputChange,
  onWeightInputChange,
}) => {
  const [heightCmInput, setHeightCmInput] = useState<string>("");
  const [heightFtInput, setHeightFtInput] = useState<string>("");
  const [weightKgInput, setWeightKgInput] = useState<string>("");
  const [weightLbInput, setWeightLbInput] = useState<string>("");

  useEffect(() => {
    setHeightCmInput(
      height_cm !== undefined ? String(Number(height_cm).toFixed(1)) : ""
    );
    setHeightFtInput(
      height_cm !== undefined
        ? String(Number(cmToFt(height_cm)).toFixed(1))
        : ""
    );
  }, [height_cm]);

  useEffect(() => {
    setWeightKgInput(
      weight_kg !== undefined ? String(Number(weight_kg).toFixed(1)) : ""
    );
    setWeightLbInput(
      weight_kg !== undefined
        ? String(Number(kgToLb(weight_kg)).toFixed(1))
        : ""
    );
  }, [weight_kg]);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <TextField
        fullWidth
        required
        type="text"
        name="height_cm"
        label="Height (cm)"
        value={heightCmInput}
        onChange={(e) => {
          onHeightInputChange?.();
          let value = e.target.value;
          value = value.replace(/[^\d.]/g, "");
          value = value.replace(/^(\d*\.\d*?)\..*$/, "$1");
          value = value.replace(/^0+(\d)/, "$1");
          setHeightCmInput(value);
        }}
        onBlur={() => {
          const num = Number(heightCmInput);
          if (heightCmInput === "" || Number.isNaN(num) || num < 0) {
            onHeightCmChange(undefined);
            setHeightFtInput("");
            return;
          }
          onHeightCmChange(num);
          setHeightFtInput(String(Number(cmToFt(num)).toFixed(1)));
        }}
        size="small"
        error={Boolean(heightError)}
        helperText={heightError || " "}
      />
      <TextField
        fullWidth
        required
        type="text"
        name="height_ft"
        label="Height (ft)"
        value={heightFtInput}
        onChange={(e) => {
          onHeightInputChange?.();
          let value = e.target.value;
          value = value.replace(/[^\d.]/g, "");
          value = value.replace(/^(\d*\.\d*?)\..*$/, "$1");
          value = value.replace(/^0+(\d)/, "$1");
          setHeightFtInput(value);
        }}
        onBlur={() => {
          const num = Number(heightFtInput);
          if (heightFtInput === "" || Number.isNaN(num) || num < 0) {
            onHeightCmChange(undefined);
            setHeightCmInput("");
            return;
          }
          const cm = Number(ftToCm(num).toFixed(1));
          onHeightCmChange(cm);
          setHeightCmInput(String(cm));
        }}
        size="small"
        error={Boolean(heightError)}
        helperText={heightError || " "}
      />
      <TextField
        fullWidth
        required
        type="text"
        name="weight_kg"
        label="Weight (kg)"
        value={weightKgInput}
        onChange={(e) => {
          onWeightInputChange?.();
          let value = e.target.value;
          value = value.replace(/[^\d.]/g, "");
          value = value.replace(/^(\d*\.\d*?)\..*$/, "$1");
          value = value.replace(/^0+(\d)/, "$1");
          setWeightKgInput(value);
        }}
        onBlur={() => {
          const num = Number(weightKgInput);
          if (weightKgInput === "" || Number.isNaN(num) || num < 0) {
            onWeightKgChange(undefined);
            setWeightLbInput("");
            return;
          }
          onWeightKgChange(num);
          setWeightLbInput(String(Number(kgToLb(num)).toFixed(1)));
        }}
        size="small"
        error={Boolean(weightError)}
        helperText={weightError || " "}
      />
      <TextField
        fullWidth
        required
        type="text"
        name="weight_lb"
        label="Weight (lb)"
        value={weightLbInput}
        onChange={(e) => {
          onWeightInputChange?.();
          let value = e.target.value;
          value = value.replace(/[^\d.]/g, "");
          value = value.replace(/^(\d*\.\d*?)\..*$/, "$1");
          value = value.replace(/^0+(\d)/, "$1");
          setWeightLbInput(value);
        }}
        onBlur={() => {
          const num = Number(weightLbInput);
          if (weightLbInput === "" || Number.isNaN(num) || num < 0) {
            onWeightKgChange(undefined);
            setWeightKgInput("");
            return;
          }
          const kg = Number(lbToKg(num).toFixed(2));
          onWeightKgChange(kg);
          setWeightKgInput(String(kg));
        }}
        size="small"
        error={Boolean(weightError)}
        helperText={weightError || " "}
      />
    </Box>
  );
};

export default HeightWeightFields;
