export const createHolidayDateTable = `
  CREATE TABLE IF NOT EXISTS holiday_date (
    holiday_date DATE PRIMARY KEY,
    name TEXT NOT NULL
  );
`;
