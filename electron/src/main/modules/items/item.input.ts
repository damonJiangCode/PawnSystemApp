const normalizeTicketItemNumbers = (
  ticketNumber: number,
  itemNumbers: number[],
) => ({
  ticketNumber: Number(ticketNumber),
  itemNumbers: [...new Set(itemNumbers.map(Number))].filter(
    (itemNumber) => Number.isFinite(itemNumber) && itemNumber > 0,
  ),
});

export const itemInput = {
  normalizeTicketItemNumbers,
};
