import type { HolidayDate } from "../../../../../shared/models/holiday-date.model.ts";
import type { Location } from "../../../../../shared/models/location.model.ts";
import type {
  SaveHolidayInput,
  SaveLocationInput,
} from "../../../../../shared/payload-contracts/ticket.contract.ts";
import { holidayDateRepo } from "./holiday-date.repo.ts";
import { ticketLocationRepo } from "./ticket-location.repo.ts";
import { ticketInput } from "./ticket.input.ts";

export const ticketAdminService = {
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

  loadLocations: async (): Promise<string[]> => {
    return ticketLocationRepo.loadLocations();
  },

  loadLocationsForAdmin: async (): Promise<Location[]> => {
    return ticketLocationRepo.loadLocationsForAdmin();
  },

  addLocation: async (input: SaveLocationInput): Promise<Location> => {
    const normalizedInput = {
      location: input?.location?.trim().toUpperCase() ?? "",
      description: input?.description?.trim() ?? "",
    };

    if (!/^[A-Z]{2}\d{2}$/.test(normalizedInput.location)) {
      throw new Error(
        "Location code must contain two uppercase letters followed by two digits.",
      );
    }

    if (normalizedInput.description.length > 1000) {
      throw new Error("Location description cannot exceed 1000 characters.");
    }

    const location = await ticketLocationRepo.addLocation(normalizedInput);

    if (!location) {
      throw new Error("That location code already exists.");
    }

    return location;
  },

  deactivateLocation: async (locationCode: string): Promise<Location> => {
    const normalizedCode = locationCode?.trim().toUpperCase() ?? "";

    if (!normalizedCode) {
      throw new Error("Enter a valid location code.");
    }

    const location =
      await ticketLocationRepo.deactivateLocation(normalizedCode);

    if (!location) {
      throw new Error("That active location was not found.");
    }

    return location;
  },
};
