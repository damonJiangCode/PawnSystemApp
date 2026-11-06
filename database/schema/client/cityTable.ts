export const createCityTable = `
CREATE TABLE IF NOT EXISTS city (
    id SERIAL PRIMARY KEY,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    country TEXT NOT NULL,
    CONSTRAINT city_location_unique UNIQUE (city, province, country)
);
`;
