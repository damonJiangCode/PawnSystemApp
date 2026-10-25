import {
  Alert,
  Box,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { ClientNotesAction } from "../../../../../shared/payload-contracts/client.contract";
import InfoRow from "./InfoRow";
import statColors from "../../styles/statColors";
import type { Client, ID } from "../../../../../shared/models/client.model";
import { resolveFormFieldError } from "../../../../shared/utils/formError";
import {
  clientProfilePanelSx,
  createClientProfileDisplay,
} from "./clientProfileDisplay";
import { formatClientIdType } from "../../utils/clientDisplay.ts";

interface ClientProfileProps {
  client: Client;
  onSaveNotes: (input: {
    client: Client;
    identifications: ID[];
    notes: string;
    employeePassword: string;
    notesAction: ClientNotesAction;
  }) => Promise<Client>;
  placeholder?: boolean;
}

const ClientProfile: React.FC<ClientProfileProps> = ({
  client,
  onSaveNotes,
  placeholder = false,
}) => {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [employeePasswordError, setEmployeePasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const identifications: ID[] = client.identifications || [];
  const display = createClientProfileDisplay(placeholder);

  useEffect(() => {
    if (!showNoteForm) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const input = notesInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    });

    return () => cancelAnimationFrame(frame);
  }, [showNoteForm]);

  useEffect(() => {
    if (!showPasswordForm) {
      return;
    }

    const timer = setTimeout(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    }, 100);

    return () => clearTimeout(timer);
  }, [showPasswordForm]);

  const handleOpenNoteForm = () => {
    setNotesDraft(client.notes || "");
    setEmployeePassword("");
    setEmployeePasswordError("");
    setSubmitError("");
    setShowNoteForm(true);
  };

  const handleRequestSaveNote = () => {
    const currentNotes = client.notes ?? "";
    const trimmedCurrentNotes = currentNotes.trim();
    const trimmedDraftNotes = notesDraft.trim();

    if (trimmedDraftNotes === trimmedCurrentNotes) {
      setShowNoteForm(false);
      setEmployeePassword("");
      setEmployeePasswordError("");
      setSubmitError("");
      return;
    }

    if (!trimmedDraftNotes) {
      void handleSaveNotes(true);
      return;
    }

    setEmployeePassword("");
    setEmployeePasswordError("");
    setSubmitError("");
    setShowNoteForm(false);
    setShowPasswordForm(true);
  };

  const handleSaveNotes = async (skipPassword = false) => {
    if (!skipPassword && !employeePassword.trim()) {
      setEmployeePasswordError("Enter employee password.");
      return;
    }

    setSubmitError("");
    setSavingNotes(true);
    try {
      const trimmedNotes = notesDraft.trim();
      await onSaveNotes({
        client,
        identifications,
        notes: trimmedNotes,
        employeePassword: skipPassword ? "" : employeePassword,
        notesAction: skipPassword ? "clear" : "append_signature",
      });
      setShowPasswordForm(false);
      setShowNoteForm(false);
      setNotesDraft("");
      setEmployeePassword("");
      setEmployeePasswordError("");
      setSubmitError("");
    } catch (error) {
      const nextEmployeePasswordError = resolveFormFieldError(
        "employee_password",
        error,
      );

      if (nextEmployeePasswordError) {
        setEmployeePasswordError(nextEmployeePasswordError);
        return;
      }

      console.error("Failed to update client notes:", error);
      setSubmitError(
        "Couldn't update the client notes right now. Please try again.",
      );
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <Box>
      {client.is_active === false && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Deactivated client. New tickets are disabled; existing tickets can
          still be handled.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1.0,
          minHeight: 0,
        }}
      >
        <Box sx={clientProfilePanelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            Profile
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow
              label="Client #:"
              value={display.text(client.client_number)}
            />
            <InfoRow
              label="Last name:"
              value={display.text(client.last_name?.toUpperCase())}
            />
            <InfoRow
              label="First name:"
              value={display.text(client.first_name?.toUpperCase())}
            />
            <InfoRow
              label="Middle name:"
              value={display.text(client.middle_name?.toUpperCase())}
            />
            <InfoRow
              label="Date of birth:"
              value={display.date(client.date_of_birth)}
            />
          </Box>
        </Box>

        <Box sx={clientProfilePanelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            Physical
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow label="Gender:" value={display.option(client.gender)} />
            <InfoRow
              label="Hair color:"
              value={display.option(client.hair_color)}
            />
            <InfoRow
              label="Eye color:"
              value={display.option(client.eye_color)}
            />
            <InfoRow
              label="Height:"
              value={display.measurement(client.height_cm, "cm")}
            />
            <InfoRow
              label="Weight:"
              value={display.measurement(client.weight_kg, "kg")}
            />
          </Box>
        </Box>

        <Box sx={clientProfilePanelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            Stats
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 0.65,
              alignContent: "center",
              justifyItems: "center",
            }}
          >
            {[
              {
                label: "Redeem",
                value: client.redeem_count,
                color: statColors.redeem,
              },
              {
                label: "Expire",
                value: client.expire_count,
                color: statColors.expire,
              },
              {
                label: "Sold",
                value: client.sell_count,
                color: statColors.sold,
              },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  borderRadius: 1.5,
                  px: 0.8,
                  py: 0.5,
                  backgroundColor: stat.color,
                  color: "#fff",
                  boxShadow: 1,
                  textAlign: "center",
                  width: 92,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    letterSpacing: 0.15,
                  }}
                >
                  {stat.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    lineHeight: 1.1,
                  }}
                >
                  {display.count(stat.value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={clientProfilePanelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            IDs
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              maxHeight: 180,
              overflow: "auto",
            }}
          >
            {!placeholder && identifications.length > 0 ? (
              identifications.map((element, index) => (
                <Box key={index}>
                  <InfoRow
                    label={`${formatClientIdType(element.id_type)}:`}
                    value={element.id_value || "—"}
                  />
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">
                {placeholder ? "—" : "No identifications available."}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={clientProfilePanelSx}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            Contact
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <InfoRow label="Address:" value={display.text(client.address)} />
            <InfoRow
              label="Postal code:"
              value={display.uppercase(client.postal_code)}
            />
            <InfoRow label="City:" value={display.text(client.city)} />
            <InfoRow label="Province:" value={display.text(client.province)} />
            <InfoRow label="Country:" value={display.text(client.country)} />
            <InfoRow label="Phone:" value={display.text(client.phone)} />
            <InfoRow label="Email:" value={display.text(client.email)} />
          </Box>
        </Box>

        <Box sx={clientProfilePanelSx}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0.5,
              gap: 1,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Notes
            </Typography>
            <Button
              style={{ textTransform: "none" }}
              variant="outlined"
              size="small"
              onClick={handleOpenNoteForm}
              disabled={placeholder}
            >
              Edit notes
            </Button>
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              maxHeight: 180,
              overflow: "auto",
            }}
          >
            <Typography
              sx={{
                whiteSpace: "pre-line",
                fontSize: "0.92rem",
                lineHeight: 1.45,
              }}
            >
              {placeholder ? "—" : client.notes || "No notes available."}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={showNoteForm}
        onClose={() => {
          if (!savingNotes) {
            setShowNoteForm(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit notes</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {submitError}
            </Alert>
          )}
          <TextField
            inputRef={notesInputRef}
            fullWidth
            multiline
            minRows={6}
            label="Notes"
            value={notesDraft}
            onChange={(event) => {
              setNotesDraft(event.target.value);
              if (submitError) {
                setSubmitError("");
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            style={{ textTransform: "none" }}
            onClick={() => setShowNoteForm(false)}
            disabled={savingNotes}
          >
            Cancel
          </Button>
          <Button
            style={{ textTransform: "none" }}
            onClick={handleRequestSaveNote}
            variant="contained"
            disabled={savingNotes}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showPasswordForm}
        onClose={() => {
          if (!savingNotes) {
            setShowPasswordForm(false);
            setShowNoteForm(true);
            setEmployeePasswordError("");
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Employee password</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {submitError}
            </Alert>
          )}
          <TextField
            inputRef={passwordInputRef}
            fullWidth
            type="password"
            label="Employee password"
            value={employeePassword}
            onChange={(event) => {
              setEmployeePassword(event.target.value);
              if (submitError) {
                setSubmitError("");
              }
              if (employeePasswordError) {
                setEmployeePasswordError("");
              }
            }}
            sx={{ mt: 1 }}
            error={Boolean(employeePasswordError)}
            helperText={employeePasswordError || " "}
          />
        </DialogContent>
        <DialogActions>
          <Button
            style={{ textTransform: "none" }}
            onClick={() => {
              setShowPasswordForm(false);
              setShowNoteForm(true);
              setEmployeePasswordError("");
            }}
            disabled={savingNotes}
          >
            Cancel
          </Button>
          <Button
            style={{ textTransform: "none" }}
            onClick={() => {
              void handleSaveNotes();
            }}
            variant="contained"
            disabled={savingNotes}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientProfile;
