import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type ReportDocumentProps = {
  title: string;
  fromDate: string;
  toDate: string;
  children: ReactNode;
  footer: ReactNode;
  dateSummary?: string;
};

const ReportDocument = ({
  title,
  fromDate,
  toDate,
  children,
  footer,
  dateSummary,
}: ReportDocumentProps) => (
  <Box
    sx={{
      color: "#000",
      bgcolor: "#fff",
      px: 0.5,
      fontFamily: "Arial, sans-serif",
      "& .MuiTypography-root, & .MuiTableCell-root": {
        fontFamily: "Arial, sans-serif",
      },
      "& .MuiTableCell-root": {
        px: 0.75,
        py: 0.35,
        fontSize: "0.75rem",
        lineHeight: 1.25,
      },
      "@media print": {
        color: "#000",
        bgcolor: "#fff",
      },
    }}
  >
    <Stack alignItems="center" spacing={0.25} sx={{ mb: 1.25 }}>
      <Typography variant="h6" fontWeight={900}>
        {title.toUpperCase()}
      </Typography>
      <Typography variant="caption" fontWeight={800}>
        {dateSummary ?? (
          <>
            FROM: {fromDate} &nbsp;&nbsp; TO: {toDate}
          </>
        )}
      </Typography>
    </Stack>

    {children}

    <Stack
      direction="row"
      justifyContent="flex-end"
      alignItems="center"
      spacing={3}
      sx={{ mt: 1.5, breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      {footer}
    </Stack>
  </Box>
);

export default ReportDocument;
