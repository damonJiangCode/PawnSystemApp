export const confirmZeroTicketAmount = (amount: number): boolean => {
  if (amount !== 0) {
    return true;
  }

  return window.confirm(
    "Ticket amount is 0. This is usually only for special records such as signature-only tickets. Continue?",
  );
};
