import type { Client, ID } from "../../../../../../shared/models/client.model";
import { formatLocalIsoDatePart, resolveDate } from "../../../../shared/utils/formatters";
import type { ClientNotesAction } from "../../client.api";

export interface PendingClientUpdate {
  client: Client;
  identifications: ID[];
  notes_action: ClientNotesAction;
}

export type ClientValidationErrors = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  hair_color: string;
  eye_color: string;
  height_cm: string;
  weight_kg: string;
  address: string;
  city: string;
  province: string;
  country: string;
  photo: string;
  identifications: string;
};

export const emptyValidationErrors = (): ClientValidationErrors => ({
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  hair_color: "",
  eye_color: "",
  height_cm: "",
  weight_kg: "",
  address: "",
  city: "",
  province: "",
  country: "",
  photo: "",
  identifications: "",
});

const getAdultCutoffDate = () => {
  const today = new Date();
  return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
};

export const getDateOfBirthError = (dateOfBirth?: Date | string) => {
  if (!dateOfBirth) {
    return "Date of birth is required.";
  }

  if (
    typeof dateOfBirth === "string" &&
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
  ) {
    return "Enter a complete date of birth.";
  }

  const parsedDate = resolveDate(dateOfBirth);

  if (!parsedDate) {
    return "Enter a valid date of birth.";
  }

  if (
    typeof dateOfBirth === "string" &&
    formatLocalIsoDatePart(parsedDate) !== dateOfBirth
  ) {
    return "Enter a valid date of birth.";
  }

  if (
    formatLocalIsoDatePart(parsedDate) >
    formatLocalIsoDatePart(getAdultCutoffDate())
  ) {
    return "Age under 18 is not allowed.";
  }

  return "";
};

type BuildPendingClientUpdateInput = {
  client: Client;
  clientExisted?: Client;
  isEditMode: boolean;
  photoCaptured: boolean;
  ids: ID[];
};

export const buildPendingClientUpdate = ({
  client,
  clientExisted,
  isEditMode,
  photoCaptured,
  ids,
}: BuildPendingClientUpdateInput) => {
  const nextErrors = emptyValidationErrors();

  if (!client.last_name?.trim()) {
    nextErrors.last_name = "Last name is required.";
  }

  if (!client.first_name?.trim()) {
    nextErrors.first_name = "First name is required.";
  }

  nextErrors.date_of_birth = getDateOfBirthError(client.date_of_birth);

  if (!client.gender?.trim()) {
    nextErrors.gender = "Gender is required.";
  }

  if (!client.hair_color?.trim()) {
    nextErrors.hair_color = "Hair color is required.";
  }

  if (!client.eye_color?.trim()) {
    nextErrors.eye_color = "Eye color is required.";
  }

  if (!client.height_cm || client.height_cm <= 0) {
    nextErrors.height_cm = "Height is required.";
  }

  if (!client.weight_kg || client.weight_kg <= 0) {
    nextErrors.weight_kg = "Weight is required.";
  }

  if (!client.address?.trim()) {
    nextErrors.address = "Address is required.";
  }

  if (!client.city?.trim()) {
    nextErrors.city = "City is required.";
  }

  if (!client.province?.trim()) {
    nextErrors.province = "Province is required.";
  }

  if (!client.country?.trim()) {
    nextErrors.country = "Country is required.";
  }

  if (!isEditMode && !photoCaptured && !client.image_path?.trim()) {
    nextErrors.photo = "Client photo is required.";
  }

  const validIds = ids.filter(
    (id) => id.id_type?.trim() && id.id_value?.trim(),
  );

  if (validIds.length < 2) {
    nextErrors.identifications =
      "Please provide at least two valid ID entries.";
  }

  if (Object.values(nextErrors).some(Boolean)) {
    return { pendingUpdate: null, validationErrors: nextErrors };
  }

  const trimmedNotes = client.notes?.trim() ?? "";
  const notesChanged = (clientExisted?.notes ?? "") !== (client.notes ?? "");
  let notes_action: ClientNotesAction = "keep";

  if (!isEditMode && trimmedNotes) {
    notes_action = "append_signature";
  } else if (isEditMode && notesChanged) {
    notes_action = trimmedNotes ? "append_signature" : "clear";
  }

  return {
    pendingUpdate: {
      client: { ...client, identifications: validIds } as Client,
      identifications: validIds,
      notes_action,
    },
    validationErrors: nextErrors,
  };
};
