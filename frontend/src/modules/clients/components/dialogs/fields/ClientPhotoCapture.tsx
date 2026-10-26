import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import type { Client } from "../../../../../../../shared/models/client.model";
import { getClientImageUrl } from "../../../hooks/useClientImage";

interface ClientPhotoCaptureProps {
  client: Client;
  onCapture: (fileName: string, base64: string) => void;
  active?: boolean;
  previewSrc?: string;
  disabled?: boolean;
}

const ClientPhotoCapture: React.FC<ClientPhotoCaptureProps> = (props) => {
  const { client, onCapture, active, previewSrc, disabled } = props;
  const [photoData, setPhotoData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // check whether the dialog is closed already
    let disposed = false;

    if (active) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          // close the stream
          if (disposed) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          if (disposed) {
            return;
          }

          console.error("Failed to access camera", err);
          alert("Failed to access camera (ClientPhotoCapture.tsx).");
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    return () => {
      disposed = true;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active]);

  useEffect(() => {
    setPhotoData(previewSrc ?? getClientImageUrl(client.image_path));
  }, [client.client_number, client.image_path, previewSrc, active]);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      alert("Camera not initialized (ClientPhotoCapture.tsx).");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/png");
    setPhotoData(imageDataUrl);

    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, "");
    const fileName = client.client_number
      ? `client_${client.client_number}_${Date.now()}.png`
      : `client_pending_${Date.now()}.png`;

    onCapture(fileName, base64);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 1,
        justifyItems: "center",
        alignItems: "start",
      }}
    >
      <Box
        sx={{
          width: 140,
          height: 140,
          border: "1px solid #ccc",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>

      <Box sx={{ gridRow: 2, gridColumn: "1 / -1" }}>
        <Button
          style={{ textTransform: "none" }}
          variant="contained"
          onClick={handleTakePhoto}
          disabled={disabled}
        >
          Capture
        </Button>
      </Box>

      <Box sx={{ gridColumn: 2, gridRow: 1 }}>
        <Box
          sx={{
            width: 140,
            height: 140,
            border: "1px solid #ccc",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: "#f9f9f9",
          }}
        >
          {photoData ? (
            <img
              src={photoData}
              alt="Captured"
              onError={() => setPhotoData(null)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              No photo yet
            </Typography>
          )}
        </Box>
      </Box>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
};

export default ClientPhotoCapture;
