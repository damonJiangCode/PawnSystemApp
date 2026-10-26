import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { getImageUrl } from "../../../../shared/utils/imageUrl";

interface ItemPhotoCaptureProps {
  imagePath?: string;
  itemNumber?: number;
  active?: boolean;
  previewSize?: number;
  error?: boolean;
  onCapture: (fileName: string, base64: string) => void;
}

const ItemPhotoCapture: React.FC<ItemPhotoCaptureProps> = ({
  imagePath,
  itemNumber,
  active = false,
  previewSize = 220,
  error = false,
  onCapture,
}) => {
  const [photoData, setPhotoData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // check whether the dialog is closed already or not
    let disposed = false;

    if (active) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
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
        });
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active]);

  useEffect(() => {
    setPhotoData(getImageUrl("item", imagePath));
  }, [imagePath]);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!video || !canvas || !ctx) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/png");
    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, "");
    const fileName = itemNumber
      ? `item_${itemNumber}_${Date.now()}.png`
      : `item_pending_${Date.now()}.png`;

    setPhotoData(imageDataUrl);
    onCapture(fileName, base64);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Box
          sx={{
            width: previewSize,
            height: previewSize,
            border: "1px solid",
            borderColor: error ? "error.main" : "divider",
            borderRadius: 2,
            backgroundColor: "#111827",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
        <Button sx={{ mt: 0.75 }} variant="contained" onClick={handleTakePhoto}>
          Capture
        </Button>
      </Box>

      <Box
        sx={{
          mt: 1.25,
          width: previewSize,
          height: previewSize,
          border: "1px solid",
          borderColor: error ? "error.main" : "divider",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: "#f8fafc",
        }}
      >
        {photoData ? (
          <img
            src={photoData}
            alt="Item"
            onError={() => setPhotoData(null)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No photo
          </Typography>
        )}
      </Box>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
};

export default ItemPhotoCapture;
