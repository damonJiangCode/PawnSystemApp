// SQL for a client's display name, "LAST, FIRST MIDDLE" in uppercase, from the
// client table joined as `alias`. Shared so reports and tickets show the same name.
export const clientNameSql = (alias: string) => `
  CONCAT(
    UPPER(${alias}.last_name), ', ', UPPER(${alias}.first_name),
    CASE WHEN COALESCE(TRIM(${alias}.middle_name), '') = '' THEN ''
         ELSE CONCAT(' ', UPPER(${alias}.middle_name)) END
  )`;
