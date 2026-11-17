import type { EyeColor } from "@pawnsystem/shared/models/eye-color.model.ts";
import type { HairColor } from "@pawnsystem/shared/models/hair-color.model.ts";
import type { HolidayDate } from "@pawnsystem/shared/models/holiday-date.model.ts";
import type { IdType } from "@pawnsystem/shared/models/id-type.model.ts";
import type {
  ItemCategory,
  ItemCategoryTree,
  ItemSubcategory,
} from "@pawnsystem/shared/models/item-category.model.ts";
import type { Location } from "@pawnsystem/shared/models/location.model.ts";
import type {
  CitiesResponse,
  ItemCategoryOption,
  SaveHolidayInput,
  SaveLocationInput,
} from "@pawnsystem/shared/payload-contracts/reference.contract.ts";
import { API_BASE_URL, apiUrl, jsonBody, requestJson } from "./http.ts";

export type ColorKind = "hair" | "eye";

export function loadCitiesHttp(baseUrl = API_BASE_URL) {
  return requestJson<CitiesResponse>(apiUrl("/reference/cities", baseUrl));
}

export function loadIdTypesHttp(baseUrl = API_BASE_URL) {
  return requestJson<string[]>(apiUrl("/reference/id-types", baseUrl));
}

export function loadAllIdTypesHttp(baseUrl = API_BASE_URL) {
  return requestJson<IdType[]>(apiUrl("/reference/id-types/all", baseUrl));
}

export function addIdTypeHttp(type: string, baseUrl = API_BASE_URL) {
  return requestJson<IdType>(
    apiUrl("/reference/id-types", baseUrl),
    jsonBody("POST", { type }),
  );
}

export function setIdTypeActiveHttp(
  type: string,
  isActive: boolean,
  baseUrl = API_BASE_URL,
) {
  return requestJson<IdType>(
    apiUrl(
      `/reference/id-types/${isActive ? "activate" : "deactivate"}`,
      baseUrl,
    ),
    jsonBody("PATCH", { type }),
  );
}

export function loadColorsHttp(kind: ColorKind, baseUrl = API_BASE_URL) {
  return requestJson<string[]>(apiUrl(`/reference/colors/${kind}`, baseUrl));
}

export function loadAllColorsHttp(kind: ColorKind, baseUrl = API_BASE_URL) {
  return requestJson<(HairColor | EyeColor)[]>(
    apiUrl(`/reference/colors/${kind}/all`, baseUrl),
  );
}

export async function addColorHttp(
  kind: ColorKind,
  color: string,
  baseUrl = API_BASE_URL,
) {
  const result = await requestJson<{ color: string }>(
    apiUrl(`/reference/colors/${kind}`, baseUrl),
    jsonBody("POST", { color }),
  );
  return result.color;
}

export function setColorActiveHttp(
  kind: ColorKind,
  color: string,
  isActive: boolean,
  baseUrl = API_BASE_URL,
) {
  return requestJson<HairColor | EyeColor>(
    apiUrl(
      `/reference/colors/${kind}/${isActive ? "activate" : "deactivate"}`,
      baseUrl,
    ),
    jsonBody("PATCH", { color }),
  );
}

export function loadLocationsHttp(baseUrl = API_BASE_URL) {
  return requestJson<string[]>(apiUrl("/reference/locations", baseUrl));
}

export function loadAllLocationsHttp(baseUrl = API_BASE_URL) {
  return requestJson<Location[]>(apiUrl("/reference/locations/all", baseUrl));
}

export function addLocationHttp(
  input: SaveLocationInput,
  baseUrl = API_BASE_URL,
) {
  return requestJson<Location>(
    apiUrl("/reference/locations", baseUrl),
    jsonBody("POST", {
      location: input.location,
      description: input.description,
    }),
  );
}

export function setLocationActiveHttp(
  location: string,
  isActive: boolean,
  baseUrl = API_BASE_URL,
) {
  return requestJson<Location>(
    apiUrl(
      `/reference/locations/${isActive ? "activate" : "deactivate"}`,
      baseUrl,
    ),
    jsonBody("PATCH", { location }),
  );
}

export function loadHolidayDatesHttp(baseUrl = API_BASE_URL) {
  return requestJson<HolidayDate[]>(apiUrl("/reference/holidays", baseUrl));
}

export function addHolidayDateHttp(
  input: SaveHolidayInput,
  baseUrl = API_BASE_URL,
) {
  return requestJson<HolidayDate>(
    apiUrl("/reference/holidays", baseUrl),
    jsonBody("POST", { holiday_date: input.holiday_date, name: input.name }),
  );
}

export function deleteHolidayDateHttp(
  holidayDate: string,
  baseUrl = API_BASE_URL,
) {
  return requestJson<HolidayDate>(
    apiUrl(`/reference/holidays/${encodeURIComponent(holidayDate)}`, baseUrl),
    { method: "DELETE" },
  );
}

export function loadItemCategoriesHttp(baseUrl = API_BASE_URL) {
  return requestJson<ItemCategoryOption[]>(
    apiUrl("/reference/item-categories", baseUrl),
  );
}

export function loadAllItemCategoriesHttp(baseUrl = API_BASE_URL) {
  return requestJson<ItemCategoryTree[]>(
    apiUrl("/reference/item-categories/all", baseUrl),
  );
}

export function addItemCategoryHttp(name: string, baseUrl = API_BASE_URL) {
  return requestJson<ItemCategory>(
    apiUrl("/reference/item-categories", baseUrl),
    jsonBody("POST", { category_name: name }),
  );
}

export function addItemSubcategoryHttp(
  categoryId: number,
  name: string,
  baseUrl = API_BASE_URL,
) {
  return requestJson<ItemSubcategory>(
    apiUrl("/reference/item-subcategories", baseUrl),
    jsonBody("POST", { category_id: categoryId, subcategory_name: name }),
  );
}

export function setItemCategoryActiveHttp(
  categoryId: number,
  isActive: boolean,
  baseUrl = API_BASE_URL,
) {
  return requestJson<ItemCategory>(
    apiUrl(`/reference/item-categories/${categoryId}`, baseUrl),
    jsonBody("PATCH", { is_active: isActive }),
  );
}

export function setItemSubcategoryActiveHttp(
  subcategoryId: number,
  isActive: boolean,
  baseUrl = API_BASE_URL,
) {
  return requestJson<ItemSubcategory>(
    apiUrl(`/reference/item-subcategories/${subcategoryId}`, baseUrl),
    jsonBody("PATCH", { is_active: isActive }),
  );
}

const upper = (value: string) => value.trim().toUpperCase();

let itemCategoryCache: ItemCategoryOption[] | null = null;
let itemCategoryPromise: Promise<ItemCategoryOption[]> | null = null;

export const referenceApi = {
  loadCities: () => loadCitiesHttp(),

  loadIdTypes: () => loadIdTypesHttp(),
  loadAllIdTypes: () => loadAllIdTypesHttp(),
  addIdType: (type: string) => addIdTypeHttp(type.trim()),
  activateIdType: (type: string) => setIdTypeActiveHttp(type.trim(), true),
  deactivateIdType: (type: string) => setIdTypeActiveHttp(type.trim(), false),

  loadHairColors: () => loadColorsHttp("hair"),
  loadAllHairColors: () => loadAllColorsHttp("hair"),
  addHairColor: (color: string) => addColorHttp("hair", upper(color)),
  activateHairColor: (color: string) =>
    setColorActiveHttp("hair", upper(color), true),
  deactivateHairColor: (color: string) =>
    setColorActiveHttp("hair", upper(color), false),
  loadEyeColors: () => loadColorsHttp("eye"),
  loadAllEyeColors: () => loadAllColorsHttp("eye"),
  addEyeColor: (color: string) => addColorHttp("eye", upper(color)),
  activateEyeColor: (color: string) =>
    setColorActiveHttp("eye", upper(color), true),
  deactivateEyeColor: (color: string) =>
    setColorActiveHttp("eye", upper(color), false),

  loadLocations: () => loadLocationsHttp(),
  loadAllLocations: () => loadAllLocationsHttp(),
  addLocation: (input: SaveLocationInput) =>
    addLocationHttp({
      location: upper(input.location),
      description: input.description.trim(),
    }),
  activateLocation: (location: string) =>
    setLocationActiveHttp(upper(location), true),
  deactivateLocation: (location: string) =>
    setLocationActiveHttp(upper(location), false),

  loadHolidayDates: () => loadHolidayDatesHttp(),
  addHolidayDate: (input: SaveHolidayInput) =>
    addHolidayDateHttp({
      holiday_date: input.holiday_date.trim(),
      name: input.name.trim(),
    }),
  deleteHolidayDate: (holidayDate: string) =>
    deleteHolidayDateHttp(holidayDate.trim()),

  // Active options for item pickers, loaded once per window.
  preloadItemCategories: (): Promise<ItemCategoryOption[]> => {
    if (itemCategoryCache) return Promise.resolve(itemCategoryCache);
    if (itemCategoryPromise) return itemCategoryPromise;
    itemCategoryPromise = loadItemCategoriesHttp()
      .then((categories) => {
        itemCategoryCache = categories;
        return categories;
      })
      .finally(() => {
        itemCategoryPromise = null;
      });
    return itemCategoryPromise;
  },
  loadAllItemCategories: () => loadAllItemCategoriesHttp(),
  addItemCategory: (name: string) => addItemCategoryHttp(name.trim()),
  addItemSubcategory: (categoryId: number, name: string) =>
    addItemSubcategoryHttp(categoryId, name.trim()),
  setItemCategoryActive: (categoryId: number, isActive: boolean) =>
    setItemCategoryActiveHttp(categoryId, isActive),
  setItemSubcategoryActive: (subcategoryId: number, isActive: boolean) =>
    setItemSubcategoryActiveHttp(subcategoryId, isActive),
};
