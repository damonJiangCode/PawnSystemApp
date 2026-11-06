import type { ReferenceApi } from "../../../../shared/api-contracts/referenceApi.contract";
import type {
  ItemCategoryOption,
  SaveHolidayInput,
  SaveLocationInput,
} from "../../../../shared/payload-contracts/reference.contract";
import { getAppApi } from "../../shared/api/app.api";

const api = (): ReferenceApi => {
  const reference = getAppApi()?.reference;
  if (!reference) throw new Error("Reference API is unavailable.");
  return reference;
};

const upper = (value: string) => value.trim().toUpperCase();

let itemCategoryCache: ItemCategoryOption[] | null = null;
let itemCategoryPromise: Promise<ItemCategoryOption[]> | null = null;

export const referenceApi = {
  loadCities: () => api().loadCities(),

  loadIdTypes: () => api().loadIdTypes(),
  loadAllIdTypes: () => api().loadAllIdTypes(),
  addIdType: (type: string) => api().addIdType(type.trim()),
  activateIdType: (type: string) => api().activateIdType(type.trim()),
  deactivateIdType: (type: string) => api().deactivateIdType(type.trim()),

  loadHairColors: () => api().loadHairColors(),
  loadAllHairColors: () => api().loadAllHairColors(),
  addHairColor: (color: string) => api().addHairColor(upper(color)),
  activateHairColor: (color: string) => api().activateHairColor(upper(color)),
  deactivateHairColor: (color: string) =>
    api().deactivateHairColor(upper(color)),
  loadEyeColors: () => api().loadEyeColors(),
  loadAllEyeColors: () => api().loadAllEyeColors(),
  addEyeColor: (color: string) => api().addEyeColor(upper(color)),
  activateEyeColor: (color: string) => api().activateEyeColor(upper(color)),
  deactivateEyeColor: (color: string) => api().deactivateEyeColor(upper(color)),

  loadLocations: () => api().loadLocations(),
  loadAllLocations: () => api().loadAllLocations(),
  addLocation: (input: SaveLocationInput) =>
    api().addLocation({
      location: upper(input.location),
      description: input.description.trim(),
    }),
  activateLocation: (location: string) =>
    api().activateLocation(upper(location)),
  deactivateLocation: (location: string) =>
    api().deactivateLocation(upper(location)),

  loadHolidayDates: () => api().loadHolidayDates(),
  addHolidayDate: (input: SaveHolidayInput) =>
    api().addHolidayDate({
      holiday_date: input.holiday_date.trim(),
      name: input.name.trim(),
    }),
  deleteHolidayDate: (holidayDate: string) =>
    api().deleteHolidayDate(holidayDate.trim()),

  // Active options for item pickers, loaded once per window.
  preloadItemCategories: (): Promise<ItemCategoryOption[]> => {
    if (itemCategoryCache) return Promise.resolve(itemCategoryCache);
    if (itemCategoryPromise) return itemCategoryPromise;
    itemCategoryPromise = api()
      .loadItemCategories()
      .then((categories) => {
        itemCategoryCache = categories;
        return categories;
      })
      .finally(() => {
        itemCategoryPromise = null;
      });
    return itemCategoryPromise;
  },
  loadAllItemCategories: () => api().loadAllItemCategories(),
  addItemCategory: (name: string) => api().addItemCategory(name.trim()),
  addItemSubcategory: (categoryId: number, name: string) =>
    api().addItemSubcategory(categoryId, name.trim()),
  setItemCategoryActive: (categoryId: number, isActive: boolean) =>
    api().setItemCategoryActive(categoryId, isActive),
  setItemSubcategoryActive: (subcategoryId: number, isActive: boolean) =>
    api().setItemSubcategoryActive(subcategoryId, isActive),
};
