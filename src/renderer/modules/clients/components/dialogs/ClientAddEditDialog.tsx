import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
} from "@mui/material";
import type { Client } from "../../../../../shared/models/client.model";
import type { ClientPhotoInput } from "../../../../../shared/payload-contracts/client.contract";
import ClientPhotoCapture from "./fields/ClientPhotoCapture";
import HeightWeightFields from "./fields/HeightWeightFields";
import NameFields from "./fields/NameFields";
import DobGenderColor from "./fields/DobGenderColor";
import AddressFields from "./fields/AddressFields";
import ContactNotesFields from "./fields/ContactNotesFields";
import IDFields from "./fields/IDFields";
import type { IDFieldsRef } from "./fields/IDFields";
import defaultClient from "../../data/defaultClient";
import {
  clientApi,
  type ClientFormError,
  type SaveClientInput,
} from "../../client.api";
import { resolveFormFieldError } from "../../../../shared/utils/formError";
import EmployeePasswordDialog from "./EmployeePasswordDialog";
import {
  buildPendingClientUpdate,
  emptyValidationErrors,
  getDateOfBirthError,
  type ClientValidationErrors,
  type PendingClientUpdate,
} from "./clientDialogValidation";

interface ClientAddEditDialogProps {
  clientExisted?: Client;
  open: boolean;
  onSave: (clientUpdated: Client) => void;
  onClose: () => void;
}

const ClientAddEditDialog: React.FC<ClientAddEditDialogProps> = (props) => {
  const { clientExisted, open, onSave, onClose } = props;
  const isEditMode = Boolean(clientExisted?.client_number);
  const [client, setClient] = useState<Client>(clientExisted || defaultClient);
  const idRef = useRef<IDFieldsRef>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<ClientPhotoInput | null>(
    null,
  );
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [employeePassword, setEmployeePassword] = useState("");
  const [pendingUpdate, setPendingUpdate] =
    useState<PendingClientUpdate | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [employeePasswordError, setEmployeePasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const lastNameInputRef = useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] =
    useState<ClientValidationErrors>(emptyValidationErrors());

  const getSaveErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) {
      return "";
    }

    return error.message
      .replace(/^Error invoking remote method '[^']+':\s*/i, "")
      .replace(/^Error:\s*/i, "")
      .trim();
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setClient(clientExisted || defaultClient);
    setPhotoCaptured(Boolean(clientExisted?.image_path));
    setPendingPhoto(null);
    setCameraActive(true);
    setShowPasswordDialog(false);
    setEmployeePassword("");
    setPendingUpdate(null);
    setSavingClient(false);
    setEmployeePasswordError("");
    setSubmitError("");
    setValidationErrors(emptyValidationErrors());
  }, [open, clientExisted]);

  const clearValidationError = (field: keyof ClientValidationErrors) => {
    setValidationErrors((prev) =>
      prev[field] ? { ...prev, [field]: "" } : prev,
    );
  };

  useEffect(() => {
    if (!showPasswordDialog) {
      return;
    }

    const timer = setTimeout(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    }, 100);

    return () => clearTimeout(timer);
  }, [showPasswordDialog]);

  useEffect(() => {
    if (!open || isEditMode || showPasswordDialog) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      lastNameInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, isEditMode, showPasswordDialog]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === "last_name" || name === "first_name" || name === "middle_name"
        ? value.toUpperCase()
        : value;
    if (submitError) {
      setSubmitError("");
    }
    if (name in emptyValidationErrors()) {
      clearValidationError(name as keyof ClientValidationErrors);
    }
    setClient((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleDateOfBirthBlur = () => {
    setValidationErrors((prev) => ({
      ...prev,
      date_of_birth: getDateOfBirthError(client.date_of_birth),
    }));
  };

  async function handleCapture(
    fileName: string,
    base64: string,
  ): Promise<void> {
    if (!isEditMode) {
      // New clients keep the photo in browser memory until the Add request.
      setPendingPhoto({ fileName, base64 });
      setPhotoCaptured(true);
      clearValidationError("photo");
      return;
    }
    try {
      const relPath = await clientApi.saveClientImage(fileName, base64);
      setClient((prev) => ({
        ...prev,
        image_path: relPath,
        image_updated_at: new Date(),
      }));
      setPhotoCaptured(true);
      clearValidationError("photo");
    } catch (error) {
      setPhotoCaptured(false);
      console.error(
        "Failed to save client image (ClientAddEditDialog.tsx):",
        error,
      );
      setSubmitError("Failed to save client image. Please try again.");
      throw error;
    }
  }

  const buildPendingUpdate = (): PendingClientUpdate | null => {
    const ids = idRef.current?.getIDs() ?? [];
    const { pendingUpdate, validationErrors } = buildPendingClientUpdate({
      client,
      clientExisted,
      isEditMode,
      photoCaptured,
      ids,
    });

    setValidationErrors(validationErrors);
    return pendingUpdate;
  };

  const saveClientRecord = async (
    payload: SaveClientInput,
    options?: { keepPasswordDialogOpen?: boolean },
  ) => {
    try {
      setSavingClient(true);
      setSubmitError("");
      let savedClient: Client;
      if (isEditMode) {
        savedClient = await clientApi.updateClient(payload);
      } else {
        if (!pendingPhoto) {
          throw new Error("Capture a client photo before saving.");
        }
        savedClient = await clientApi.createClient({
          ...payload,
          photo: pendingPhoto,
        });
      }

      setShowPasswordDialog(false);
      setEmployeePassword("");
      setEmployeePasswordError("");
      setPendingUpdate(null);
      setPendingPhoto(null);
      onSave(savedClient);
    } catch (err) {
      const clientError = err as ClientFormError;
      const nextEmployeePasswordError = resolveFormFieldError(
        "employee_password",
        clientError,
      );

      if (nextEmployeePasswordError) {
        setEmployeePasswordError(nextEmployeePasswordError);
        if (!options?.keepPasswordDialogOpen) {
          setShowPasswordDialog(true);
        }
        return;
      }

      console.error(
        isEditMode ? "Failed to update client:" : "Failed to add client:",
        err,
      );
      const errorMessage = getSaveErrorMessage(err);
      setSubmitError(
        errorMessage ||
          (isEditMode
            ? "Couldn't update this client right now. Please try again."
            : "Couldn't add this client right now. Please try again."),
      );
    } finally {
      setSavingClient(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const nextPendingUpdate = buildPendingUpdate();

    if (!nextPendingUpdate) {
      return;
    }

    const requiresEmployeePassword =
      nextPendingUpdate.notes_action === "append_signature";

    if (!requiresEmployeePassword) {
      await saveClientRecord(nextPendingUpdate);
      return;
    }

    setPendingUpdate(nextPendingUpdate);
    setEmployeePassword("");
    setEmployeePasswordError("");
    setSubmitError("");
    setShowPasswordDialog(true);
  };

  const handleConfirmEmployeePassword = async () => {
    if (!pendingUpdate) {
      return;
    }

    if (!employeePassword.trim()) {
      setEmployeePasswordError("Enter employee password.");
      return;
    }

    setSubmitError("");
    setEmployeePasswordError("");
    await saveClientRecord(
      {
        ...pendingUpdate,
        employee_password: employeePassword,
      },
      { keepPasswordDialogOpen: true },
    );
  };

  const handleClose = () => {
    if (savingClient) return;
    setCameraActive(false);
    setPhotoCaptured(false);
    setPendingPhoto(null);
    setShowPasswordDialog(false);
    setEmployeePassword("");
    setPendingUpdate(null);
    setEmployeePasswordError("");
    setSubmitError("");
    onClose();
  };

  return (
    <>
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditMode ? "Edit Client" : "Add New Client"}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSave} noValidate>
            {submitError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {submitError}
              </Alert>
            )}
            <Box sx={{ display: "flex", gap: 2, py: 1 }}>
              <Box
                sx={{
                  flex: 3,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <NameFields
                  lastNameInputRef={lastNameInputRef}
                  lastName={client.last_name ?? ""}
                  firstName={client.first_name ?? ""}
                  middleName={client.middle_name ?? ""}
                  lastNameError={validationErrors.last_name}
                  firstNameError={validationErrors.first_name}
                  onChange={handleInputChange}
                />

                <DobGenderColor
                  date_of_birth={client.date_of_birth}
                  gender={client.gender}
                  hair_color={client.hair_color}
                  eye_color={client.eye_color}
                  dateOfBirthError={validationErrors.date_of_birth}
                  genderError={validationErrors.gender}
                  hairColorError={validationErrors.hair_color}
                  eyeColorError={validationErrors.eye_color}
                  onChange={handleInputChange}
                  onDateOfBirthBlur={handleDateOfBirthBlur}
                />

                <HeightWeightFields
                  height_cm={client.height_cm}
                  weight_kg={client.weight_kg}
                  heightError={validationErrors.height_cm}
                  weightError={validationErrors.weight_kg}
                  onHeightCmChange={(value) => {
                    clearValidationError("height_cm");
                    setClient((prev) => ({ ...prev, height_cm: value }));
                  }}
                  onWeightKgChange={(value) => {
                    clearValidationError("weight_kg");
                    setClient((prev) => ({ ...prev, weight_kg: value }));
                  }}
                  onHeightInputChange={() => clearValidationError("height_cm")}
                  onWeightInputChange={() => clearValidationError("weight_kg")}
                />

                <AddressFields
                  client_address={client.address}
                  client_postal_code={client.postal_code}
                  client_city={client.city ?? ""}
                  client_province={client.province ?? ""}
                  client_country={client.country ?? "Canada"}
                  addressError={validationErrors.address}
                  cityError={validationErrors.city}
                  provinceError={validationErrors.province}
                  countryError={validationErrors.country}
                  onChange={handleInputChange}
                />

                <ContactNotesFields
                  email={client.email ?? ""}
                  phone={client.phone ?? ""}
                  notes={client.notes}
                  onChange={handleInputChange}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(client.pickup_self_only)}
                      onChange={(_event, checked) => {
                        setClient((prev) => ({
                          ...prev,
                          pickup_self_only: checked,
                        }));
                      }}
                      color="error"
                    />
                  }
                  label="Only client can pick up his or her own items"
                  sx={{
                    alignSelf: "flex-start",
                    ml: 0,
                    "& .MuiFormControlLabel-label": {
                      color: "error.main",
                      fontWeight: 700,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ClientPhotoCapture
                  client={client}
                  onCapture={handleCapture}
                  active={cameraActive}
                  previewSrc={
                    pendingPhoto
                      ? `data:image/png;base64,${pendingPhoto.base64}`
                      : undefined
                  }
                  disabled={savingClient}
                />
                <Alert
                  severity="error"
                  sx={{
                    width: "100%",
                    visibility: validationErrors.photo ? "visible" : "hidden",
                  }}
                >
                  {validationErrors.photo || " "}
                </Alert>
              </Box>
            </Box>

            <Box>
              <IDFields
                ref={idRef}
                ids={client.identifications ?? []}
                error={validationErrors.identifications}
                onIdsChange={() => clearValidationError("identifications")}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <Button
                type="button"
                onClick={handleClose}
                disabled={savingClient}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={savingClient}>
                {isEditMode ? "Update" : "Add"}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

      <EmployeePasswordDialog
        open={showPasswordDialog}
        savingClient={savingClient}
        submitError={submitError}
        employeePassword={employeePassword}
        employeePasswordError={employeePasswordError}
        passwordInputRef={passwordInputRef}
        onPasswordChange={(value) => {
          setEmployeePassword(value);
          if (submitError) {
            setSubmitError("");
          }
          if (employeePasswordError) {
            setEmployeePasswordError("");
          }
        }}
        onCancel={() => {
          setShowPasswordDialog(false);
          setEmployeePassword("");
          setEmployeePasswordError("");
          setPendingUpdate(null);
        }}
        onConfirm={() => {
          void handleConfirmEmployeePassword();
        }}
        onClose={() => {
          if (!savingClient) {
            setShowPasswordDialog(false);
            setEmployeePassword("");
            setEmployeePasswordError("");
            setPendingUpdate(null);
          }
        }}
      />
    </>
  );
};

export default ClientAddEditDialog;
