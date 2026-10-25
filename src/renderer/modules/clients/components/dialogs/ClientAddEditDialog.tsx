import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Switch,
  Typography,
} from "@mui/material";
import type { Client } from "../../../../../shared/models/client.model";
import type {
  ClientPhotoInput,
  UpdateClientInput,
} from "../../../../../shared/payload-contracts/client.contract";
import { formatIsoDate } from "../../../../shared/utils/formatters";
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
  const formId = React.useId();
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

  function handleCapture(fileName: string, base64: string): void {
    // Both create and edit submit a new photo only when the user saves.
    setPendingPhoto({ fileName, base64 });
    setPhotoCaptured(true);
    clearValidationError("photo");
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
        if (!clientExisted?.client_number)
          throw new Error("Select a client to update.");
        const update: UpdateClientInput = {
          client: { client_number: clientExisted.client_number },
          photo: pendingPhoto ?? undefined,
          employee_password: payload.employee_password,
          notes_action: payload.notes_action,
        };
        const fields = [
          "first_name",
          "last_name",
          "middle_name",
          "date_of_birth",
          "gender",
          "hair_color",
          "eye_color",
          "height_cm",
          "weight_kg",
          "address",
          "postal_code",
          "city",
          "province",
          "country",
          "email",
          "phone",
          "notes",
          "pickup_self_only",
          "is_active",
        ] as const;
        for (const field of fields) {
          const next = payload.client[field];
          const previous = clientExisted[field];
          const changed =
            field === "date_of_birth"
              ? formatIsoDate(next as Date) !== formatIsoDate(previous as Date)
              : next !== previous;
          if (changed) Object.assign(update.client, { [field]: next });
        }
        const nextIds = payload.identifications.map((id) => ({
          id_type: id.id_type,
          id_value: id.id_value,
        }));
        const previousIds = (clientExisted.identifications ?? []).map((id) => ({
          id_type: id.id_type,
          id_value: id.id_value,
        }));
        if (JSON.stringify(nextIds) !== JSON.stringify(previousIds))
          update.identifications = payload.identifications;
        savedClient =
          Object.keys(update.client).length === 1 &&
          !update.photo &&
          update.identifications === undefined
            ? clientExisted
            : await clientApi.updateClient(update);
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
    if (savingClient) return;
    setSubmitError("");
    const nextPendingUpdate = buildPendingUpdate();

    if (!nextPendingUpdate) {
      return;
    }

    const requiresEmployeePassword =
      nextPendingUpdate.notes_action === "append_signature" ||
      (isEditMode &&
        nextPendingUpdate.client.is_active !== clientExisted?.is_active);

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
    if (savingClient) return;
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
      <Dialog
        open={open}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            m: 2,
            width: "calc(100% - 32px)",
            maxWidth: 1200,
            maxHeight: "calc(100% - 32px)",
          },
        }}
      >
        <DialogTitle>
          {isEditMode ? "Edit Client" : "Add New Client"}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1.5 }}>
          <form id={formId} onSubmit={handleSave} noValidate>
            {submitError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {submitError}
              </Alert>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "minmax(0, 1fr) 340px",
                },
                gap: 2.5,
                pt: 1,
                pb: 1.5,
              }}
            >
              <Box
                sx={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
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
                  section="contact"
                  email={client.email ?? ""}
                  phone={client.phone ?? ""}
                  notes={client.notes}
                  onChange={handleInputChange}
                />
              </Box>

              <Box
                sx={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
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
                {validationErrors.photo && (
                  <Alert severity="error">{validationErrors.photo}</Alert>
                )}
                <Box
                  sx={{
                    mt: 0.5,
                    pt: 1.5,
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      component="label"
                      htmlFor={`${formId}-active`}
                      variant="body2"
                      fontWeight={600}
                    >
                      Active client
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 70,
                      }}
                    >
                      <Switch
                        inputProps={{ id: `${formId}-active` }}
                        color="primary"
                        checked={client.is_active}
                        disabled={!isEditMode || savingClient}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked.Mui-disabled": {
                            color: "primary.main",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked.Mui-disabled + .MuiSwitch-track":
                            { backgroundColor: "primary.main", opacity: 0.5 },
                        }}
                        onChange={(_event, checked) =>
                          setClient((prev) => ({ ...prev, is_active: checked }))
                        }
                      />
                      <Typography
                        variant="caption"
                        color={
                          client.is_active ? "primary.main" : "text.secondary"
                        }
                      >
                        {client.is_active ? "Active" : "Deactive"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography
                      component="label"
                      htmlFor={`${formId}-pickup`}
                      variant="body2"
                      fontWeight={600}
                    >
                      Client-only pickup
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 70,
                      }}
                    >
                      <Switch
                        inputProps={{ id: `${formId}-pickup` }}
                        color="primary"
                        checked={Boolean(client.pickup_self_only)}
                        disabled={savingClient}
                        onChange={(_event, checked) => {
                          setClient((prev) => ({
                            ...prev,
                            pickup_self_only: checked,
                          }));
                        }}
                      />
                      <Typography
                        variant="caption"
                        color={
                          client.pickup_self_only
                            ? "primary.main"
                            : "text.secondary"
                        }
                      >
                        {client.pickup_self_only ? "Yes" : "No"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ pb: 2 }}>
              <ContactNotesFields
                section="notes"
                email={client.email ?? ""}
                phone={client.phone ?? ""}
                notes={client.notes}
                onChange={handleInputChange}
              />
            </Box>

            <Box>
              <IDFields
                ref={idRef}
                ids={client.identifications ?? []}
                error={validationErrors.identifications}
                onIdsChange={() => clearValidationError("identifications")}
              />
            </Box>
          </form>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            flexShrink: 0,
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
          <Button
            form={formId}
            type="submit"
            variant="contained"
            disabled={savingClient}
          >
            {isEditMode ? "Update" : "Add"}
          </Button>
        </DialogActions>
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
