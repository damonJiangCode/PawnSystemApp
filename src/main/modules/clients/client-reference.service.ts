import type { EyeColor } from "../../../shared/models/eye-color.model.ts";
import type { HairColor } from "../../../shared/models/hair-color.model.ts";
import { clientReferenceRepo } from "./client-reference.repo.ts";
import { clientInput } from "./client.input.ts";

export const clientReferenceService = {
  loadHairColorsForAdmin: async (): Promise<HairColor[]> => {
    return clientReferenceRepo.loadHairColorsForAdmin();
  },

  addHairColor: async (color: string): Promise<string> => {
    const normalizedColor = clientInput.normalizeColor(color).toUpperCase();

    if (!normalizedColor) {
      throw new Error("Hair color is required.");
    }

    const savedColor = await clientReferenceRepo.addHairColor(normalizedColor);

    if (!savedColor) {
      throw new Error("That hair color already exists.");
    }

    return savedColor;
  },

  deactivateHairColor: async (color: string): Promise<HairColor> => {
    const deactivatedColor = await clientReferenceRepo.deactivateHairColor(
      clientInput.normalizeColor(color).toUpperCase(),
    );

    if (!deactivatedColor) {
      throw new Error("That active hair color was not found.");
    }

    return deactivatedColor;
  },

  activateHairColor: async (color: string): Promise<HairColor> => {
    const activatedColor = await clientReferenceRepo.activateHairColor(
      clientInput.normalizeColor(color).toUpperCase(),
    );

    if (!activatedColor) {
      throw new Error("That inactive hair color was not found.");
    }

    return activatedColor;
  },

  loadEyeColorsForAdmin: async (): Promise<EyeColor[]> => {
    return clientReferenceRepo.loadEyeColorsForAdmin();
  },

  addEyeColor: async (color: string): Promise<string> => {
    const normalizedColor = clientInput.normalizeColor(color).toUpperCase();

    if (!normalizedColor) {
      throw new Error("Eye color is required.");
    }

    const savedColor = await clientReferenceRepo.addEyeColor(normalizedColor);

    if (!savedColor) {
      throw new Error("That eye color already exists.");
    }

    return savedColor;
  },

  deactivateEyeColor: async (color: string): Promise<EyeColor> => {
    const deactivatedColor = await clientReferenceRepo.deactivateEyeColor(
      clientInput.normalizeColor(color).toUpperCase(),
    );

    if (!deactivatedColor) {
      throw new Error("That active eye color was not found.");
    }

    return deactivatedColor;
  },

  activateEyeColor: async (color: string): Promise<EyeColor> => {
    const activatedColor = await clientReferenceRepo.activateEyeColor(
      clientInput.normalizeColor(color).toUpperCase(),
    );

    if (!activatedColor) {
      throw new Error("That inactive eye color was not found.");
    }

    return activatedColor;
  },
};
