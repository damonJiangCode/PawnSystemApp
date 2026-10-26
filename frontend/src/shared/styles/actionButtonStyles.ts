export const actionButtonSx = {
  width: "100%",
  minWidth: 0,
  justifyContent: "center",
  textAlign: "center",
  px: 1.25,
  color: "primary.contrastText",
  backgroundColor: "primary.main",
  "&:hover": {
    boxShadow: 3,
    backgroundColor: "primary.dark",
  },
  "&.Mui-disabled": {
    color: "rgba(15, 23, 42, 0.38)",
    backgroundColor: "rgba(148, 163, 184, 0.22)",
    borderColor: "transparent",
  },
  "& .MuiButton-startIcon": {
    marginRight: 0.75,
    marginLeft: 0,
    minWidth: 18,
    display: "inline-flex",
    justifyContent: "center",
  },
} as const;

export const destructiveButtonSx = {
  ...actionButtonSx,
  color: "error.contrastText",
  backgroundColor: "error.main",
  "&:hover": {
    boxShadow: 3,
    backgroundColor: "error.dark",
  },
  "&.Mui-disabled": {
    color: "rgba(127, 29, 29, 0.42)",
    backgroundColor: "rgba(248, 113, 113, 0.18)",
    borderColor: "transparent",
  },
} as const;
