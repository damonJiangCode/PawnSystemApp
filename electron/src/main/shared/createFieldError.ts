const FIELD_ERROR_PREFIX = "[field-error]";

export type FieldErrorDetails = {
  field: string;
  message: string;
};

export const createFieldError = (field: string, message: string) => {
  return new Error(`${FIELD_ERROR_PREFIX}${field}:${message}`);
};

export const extractFieldError = (error: unknown): FieldErrorDetails | null => {
  if (
    !(error instanceof Error) ||
    !error.message.startsWith(FIELD_ERROR_PREFIX)
  ) {
    return null;
  }

  const payload = error.message.slice(FIELD_ERROR_PREFIX.length);
  const separatorIndex = payload.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const field = payload.slice(0, separatorIndex).trim();
  const message = payload.slice(separatorIndex + 1).trim();

  if (!field || !message) {
    return null;
  }

  return { field, message };
};
