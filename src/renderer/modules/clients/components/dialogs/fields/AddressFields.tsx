import React, { useEffect, useState } from "react";
import { Box, TextField, MenuItem } from "@mui/material";
import { clientApi } from "../../../client.api";

interface AddressFieldsProps {
  client_address?: string;
  client_postal_code?: string;
  client_city: string;
  client_province: string;
  client_country: string;
  addressError?: string;
  cityError?: string;
  provinceError?: string;
  countryError?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

const AddressFields: React.FC<AddressFieldsProps> = ({
  client_address,
  client_postal_code,
  client_city,
  client_province,
  client_country,
  addressError,
  cityError,
  provinceError,
  countryError,
  onChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [city, setCity] = useState(client_city);
  const [province, setProvince] = useState(client_province);
  const [country, setCountry] = useState(client_country);

  const [provinces, setProvinces] = useState<string[]>([]);
  const [citiesByProvince, setCitiesByProvince] = useState<
    Record<string, string[]>
  >({});

  // fetch cities and provinces
  useEffect(() => {
    let active = true;

    const fetchCities = async () => {
      try {
        const data = await clientApi.loadCities();
        if (!active) return;

        setProvinces(data.provinces);
        setCitiesByProvince(data.citiesByProvince);

        const hasProvince = data.provinces.includes(province);
        const nextProvince = hasProvince
          ? province
          : data.provinces.includes("Saskatchewan")
            ? "Saskatchewan"
            : data.provinces[0] || "";

        if (nextProvince && nextProvince !== province) {
          setProvince(nextProvince);
        }

        const available = data.citiesByProvince[nextProvince] || [];
        const hasCity = available.includes(city);
        const nextCity = hasCity
          ? city
          : available.includes("Saskatoon")
            ? "Saskatoon"
            : available[0] || "";

        if (nextCity && nextCity !== city) {
          setCity(nextCity);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to load cities", err);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load cities.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchCities();

    return () => {
      active = false;
    };
  }, []);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
    onChange(e);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProvince(e.target.value);
    onChange(e);
    const cities = citiesByProvince[e.target.value] || [];
    setCity(cities[0] || "");
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountry(e.target.value);
    onChange(e);
  };

  const availableCities = province ? citiesByProvince[province] || [] : [];

  return (
    <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          required
          fullWidth
          name="address"
          label="Address"
          value={client_address || ""}
          onChange={onChange}
          size="small"
          error={Boolean(addressError)}
          helperText={addressError || " "}
        />
        <TextField
          fullWidth
          name="postal_code"
          label="Postal code"
          sx={{ "& input": { textTransform: "uppercase" } }}
          value={client_postal_code || ""}
          onChange={onChange}
          size="small"
          inputProps={{ maxLength: 7 }}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          select
          required
          fullWidth
          name="city"
          label="City"
          value={loading ? "" : city}
          onChange={handleCityChange}
          size="small"
          disabled={!province}
          error={Boolean(cityError || loadError)}
          helperText={cityError || loadError || " "}
        >
          {availableCities.length === 0 ? (
            <MenuItem disabled>Loading cities...</MenuItem>
          ) : (
            availableCities.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))
          )}
        </TextField>

        <TextField
          select
          required
          fullWidth
          name="province"
          label="Province"
          value={loading ? "" : province}
          onChange={handleProvinceChange}
          size="small"
          disabled={!country}
          error={Boolean(provinceError || loadError)}
          helperText={provinceError || loadError || " "}
        >
          {provinces.length === 0 ? (
            <MenuItem disabled>Loading provinces...</MenuItem>
          ) : (
            provinces.map((prov) => (
              <MenuItem key={prov} value={prov}>
                {prov}
              </MenuItem>
            ))
          )}
        </TextField>

        <TextField
          select
          required
          fullWidth
          name="country"
          label="Country"
          value={loading ? "" : country}
          onChange={handleCountryChange}
          size="small"
          error={Boolean(countryError)}
          helperText={countryError || " "}
        >
          <MenuItem value="Canada">Canada</MenuItem>
        </TextField>
      </Box>
    </Box>
  );
};

export default AddressFields;
