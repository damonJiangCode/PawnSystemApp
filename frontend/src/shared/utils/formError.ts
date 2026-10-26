const FIELD_ERROR_PREFIX = "[field-error]";

export type BackendFieldError = {
  field: string;
  message: string;
};

type FieldMessageResolver = {
  fallback: string;
  rules: Array<{
    pattern: RegExp;
    message: string;
  }>;
};

const FIELD_MESSAGE_RESOLVERS: Record<string, FieldMessageResolver> = {
  description: {
    fallback: "Description is required.",
    rules: [
      {
        pattern: /required/i,
        message: "Description is required.",
      },
    ],
  },
  location: {
    fallback: "Location is required.",
    rules: [
      {
        pattern: /required/i,
        message: "Location is required.",
      },
      {
        pattern: /valid/i,
        message: "Select a valid location from the list.",
      },
    ],
  },
  amount: {
    fallback: "Amount cannot be negative.",
    rules: [
      {
        pattern: /overdue/i,
        message: "This ticket is overdue. Its amount cannot be changed.",
      },
      {
        pattern: /negative|greater than 0|required|valid/i,
        message: "Amount cannot be negative.",
      },
    ],
  },
  onetime_fee: {
    fallback: "One Time Fee cannot be negative.",
    rules: [
      {
        pattern: /negative/i,
        message: "One Time Fee cannot be negative.",
      },
    ],
  },
  employee_password: {
    fallback: "No employee was found for that password.",
    rules: [
      {
        pattern: /required/i,
        message: "Enter employee password.",
      },
      {
        pattern: /incorrect|not found|no employee/i,
        message: "No employee was found for that password.",
      },
    ],
  },
  ticket_number: {
    fallback: "No ticket was found for that ticket number.",
    rules: [
      {
        pattern: /required|valid/i,
        message: "Enter a valid ticket number.",
      },
      {
        pattern: /already belongs/i,
        message: "This ticket already belongs to the selected client.",
      },
      {
        pattern: /only pawned or sold tickets can be transferred/i,
        message: "Only pawned or sold tickets can be transferred.",
      },
      {
        pattern: /only pawned or sold tickets can be expired/i,
        message: "Only pawned or sold tickets can be expired.",
      },
      {
        pattern: /already in the selected target status/i,
        message: "This ticket is already in the selected target status.",
      },
      {
        pattern: /converted/i,
        message: "Only pawned or sold tickets can be converted.",
      },
      {
        pattern: /not found|no ticket/i,
        message: "No ticket was found for that ticket number.",
      },
    ],
  },
};

export const extractBackendFieldError = (
  message: string,
): BackendFieldError | null => {
  const prefixIndex = message.lastIndexOf(FIELD_ERROR_PREFIX);

  if (prefixIndex === -1) {
    return null;
  }

  const payload = message.slice(prefixIndex + FIELD_ERROR_PREFIX.length);
  const separatorIndex = payload.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const field = payload.slice(0, separatorIndex).trim();
  const fieldMessage = payload.slice(separatorIndex + 1).trim();

  if (!field) {
    return null;
  }

  return {
    field,
    message: fieldMessage || message.trim(),
  };
};

export const resolveFormFieldMessage = (
  field: string,
  message: string,
): string => {
  const resolver = FIELD_MESSAGE_RESOLVERS[field];

  if (!resolver) {
    return message.trim();
  }

  for (const rule of resolver.rules) {
    if (rule.pattern.test(message)) {
      return rule.message;
    }
  }

  return message.trim() || resolver.fallback;
};

export const resolveFormFieldError = (
  field: string,
  error: unknown,
): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const backendFieldError = extractBackendFieldError(error.message);

  if (backendFieldError?.field === field) {
    return resolveFormFieldMessage(field, backendFieldError.message);
  }

  if (backendFieldError) {
    return null;
  }

  const normalizedField = field.replace(/_/g, "\\s*");
  const fieldPattern = new RegExp(normalizedField, "i");

  if (!fieldPattern.test(error.message)) {
    return null;
  }

  return resolveFormFieldMessage(field, error.message);
};
