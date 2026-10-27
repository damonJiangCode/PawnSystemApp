import type { HolidayDate } from "../../../../../shared/models/holiday-date.model.ts";
import type { SaveHolidayInput } from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { holidayDateRepo } from "./holiday-date.repo.ts";
import { ticketInput } from "./ticket.input.ts";

export const ticketReferenceService = {
  loadHolidayDates: async (): Promise<HolidayDate[]> => {
    return holidayDateRepo.loadHolidayDates();
  },

  addHolidayDate: async (input: SaveHolidayInput): Promise<HolidayDate> => {
    const normalizedInput = {
      holiday_date: input?.holiday_date?.trim() ?? "",
      name: input?.name?.trim() ?? "",
    };

    if (!ticketInput.isValidDateKey(normalizedInput.holiday_date)) {
      throw new Error("Enter a valid holiday date.");
    }

    if (!normalizedInput.name) {
      throw new Error("Holiday name is required.");
    }

    const holiday = await holidayDateRepo.addHolidayDate(normalizedInput);

    if (!holiday) {
      throw new Error("That holiday date has already been added.");
    }

    return holiday;
  },

  deleteHolidayDate: async (holidayDate: string): Promise<HolidayDate> => {
    const normalizedDate = holidayDate?.trim() ?? "";

    if (!ticketInput.isValidDateKey(normalizedDate)) {
      throw new Error("Enter a valid holiday date.");
    }

    const holiday = await holidayDateRepo.deleteHolidayDate(normalizedDate);

    if (!holiday) {
      throw new Error("That holiday date was not found.");
    }

    return holiday;
  },
};
