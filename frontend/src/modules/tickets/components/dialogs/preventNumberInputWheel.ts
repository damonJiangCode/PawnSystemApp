import type React from "react";

export const preventNumberInputWheel = (
  event: React.WheelEvent<HTMLInputElement>,
) => {
  event.preventDefault();
  event.currentTarget.blur();
};
