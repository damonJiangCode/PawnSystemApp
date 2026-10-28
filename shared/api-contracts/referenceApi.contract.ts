import type { EyeColor } from "../models/eye-color.model.ts";
import type { HairColor } from "../models/hair-color.model.ts";
import type { HolidayDate } from "../models/holiday-date.model.ts";
import type { IdType } from "../models/id-type.model.ts";
import type {
  ItemCategory,
  ItemCategoryTree,
  ItemSubcategory,
} from "../models/item-category.model.ts";
import type { Location } from "../models/location.model.ts";
import type {
  CitiesResponse,
  ItemCategoryOption,
  SaveHolidayInput,
  SaveLocationInput,
} from "../payload-contracts/reference.contract.ts";

export type ReferenceApi = {
  loadCities: () => Promise<CitiesResponse>;

  loadIdTypes: () => Promise<string[]>;
  loadAllIdTypes: () => Promise<IdType[]>;
  addIdType: (type: string) => Promise<IdType>;
  activateIdType: (type: string) => Promise<IdType>;
  deactivateIdType: (type: string) => Promise<IdType>;

  loadHairColors: () => Promise<string[]>;
  loadAllHairColors: () => Promise<HairColor[]>;
  addHairColor: (color: string) => Promise<string>;
  activateHairColor: (color: string) => Promise<HairColor>;
  deactivateHairColor: (color: string) => Promise<HairColor>;
  loadEyeColors: () => Promise<string[]>;
  loadAllEyeColors: () => Promise<EyeColor[]>;
  addEyeColor: (color: string) => Promise<string>;
  activateEyeColor: (color: string) => Promise<EyeColor>;
  deactivateEyeColor: (color: string) => Promise<EyeColor>;

  loadLocations: () => Promise<string[]>;
  loadAllLocations: () => Promise<Location[]>;
  addLocation: (input: SaveLocationInput) => Promise<Location>;
  activateLocation: (location: string) => Promise<Location>;
  deactivateLocation: (location: string) => Promise<Location>;

  loadHolidayDates: () => Promise<HolidayDate[]>;
  addHolidayDate: (input: SaveHolidayInput) => Promise<HolidayDate>;
  deleteHolidayDate: (holidayDate: string) => Promise<HolidayDate>;

  loadItemCategories: () => Promise<ItemCategoryOption[]>;
  loadAllItemCategories: () => Promise<ItemCategoryTree[]>;
  addItemCategory: (name: string) => Promise<ItemCategory>;
  addItemSubcategory: (
    categoryId: number,
    name: string,
  ) => Promise<ItemSubcategory>;
  setItemCategoryActive: (
    categoryId: number,
    isActive: boolean,
  ) => Promise<ItemCategory>;
  setItemSubcategoryActive: (
    subcategoryId: number,
    isActive: boolean,
  ) => Promise<ItemSubcategory>;
};
