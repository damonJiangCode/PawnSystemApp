import type { ReferenceApi } from "../../../../shared/api-contracts/referenceApi.contract.ts";
import type { EyeColor } from "../../../../shared/models/eye-color.model.ts";
import type { HairColor } from "../../../../shared/models/hair-color.model.ts";
import type { HolidayDate } from "../../../../shared/models/holiday-date.model.ts";
import type { IdType } from "../../../../shared/models/id-type.model.ts";
import type {
  ItemCategory,
  ItemCategoryTree,
  ItemSubcategory,
} from "../../../../shared/models/item-category.model.ts";
import type { Location } from "../../../../shared/models/location.model.ts";
import type {
  CitiesResponse,
  ItemCategoryOption,
  SaveHolidayInput,
  SaveLocationInput,
} from "../../../../shared/payload-contracts/reference.contract.ts";
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
  return requestJson<string[]>(apiUrl(`/reference/${kind}-colors`, baseUrl));
}

export function loadAllColorsHttp(kind: ColorKind, baseUrl = API_BASE_URL) {
  return requestJson<(HairColor | EyeColor)[]>(
    apiUrl(`/reference/${kind}-colors/all`, baseUrl),
  );
}

export async function addColorHttp(
  kind: ColorKind,
  color: string,
  baseUrl = API_BASE_URL,
) {
  const result = await requestJson<{ color: string }>(
    apiUrl(`/reference/${kind}-colors`, baseUrl),
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
      `/reference/${kind}-colors/${isActive ? "activate" : "deactivate"}`,
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

export const createReferenceHttpApi = (
  baseUrl = API_BASE_URL,
): ReferenceApi => ({
  loadCities: () => loadCitiesHttp(baseUrl),

  loadIdTypes: () => loadIdTypesHttp(baseUrl),
  loadAllIdTypes: () => loadAllIdTypesHttp(baseUrl),
  addIdType: (type) => addIdTypeHttp(type, baseUrl),
  activateIdType: (type) => setIdTypeActiveHttp(type, true, baseUrl),
  deactivateIdType: (type) => setIdTypeActiveHttp(type, false, baseUrl),

  loadHairColors: () => loadColorsHttp("hair", baseUrl),
  loadAllHairColors: () => loadAllColorsHttp("hair", baseUrl),
  addHairColor: (color) => addColorHttp("hair", color, baseUrl),
  activateHairColor: (color) =>
    setColorActiveHttp("hair", color, true, baseUrl),
  deactivateHairColor: (color) =>
    setColorActiveHttp("hair", color, false, baseUrl),
  loadEyeColors: () => loadColorsHttp("eye", baseUrl),
  loadAllEyeColors: () => loadAllColorsHttp("eye", baseUrl),
  addEyeColor: (color) => addColorHttp("eye", color, baseUrl),
  activateEyeColor: (color) => setColorActiveHttp("eye", color, true, baseUrl),
  deactivateEyeColor: (color) =>
    setColorActiveHttp("eye", color, false, baseUrl),

  loadLocations: () => loadLocationsHttp(baseUrl),
  loadAllLocations: () => loadAllLocationsHttp(baseUrl),
  addLocation: (input) => addLocationHttp(input, baseUrl),
  activateLocation: (location) =>
    setLocationActiveHttp(location, true, baseUrl),
  deactivateLocation: (location) =>
    setLocationActiveHttp(location, false, baseUrl),

  loadHolidayDates: () => loadHolidayDatesHttp(baseUrl),
  addHolidayDate: (input) => addHolidayDateHttp(input, baseUrl),
  deleteHolidayDate: (holidayDate) =>
    deleteHolidayDateHttp(holidayDate, baseUrl),

  loadItemCategories: () => loadItemCategoriesHttp(baseUrl),
  loadAllItemCategories: () => loadAllItemCategoriesHttp(baseUrl),
  addItemCategory: (name) => addItemCategoryHttp(name, baseUrl),
  addItemSubcategory: (categoryId, name) =>
    addItemSubcategoryHttp(categoryId, name, baseUrl),
  setItemCategoryActive: (categoryId, isActive) =>
    setItemCategoryActiveHttp(categoryId, isActive, baseUrl),
  setItemSubcategoryActive: (subcategoryId, isActive) =>
    setItemSubcategoryActiveHttp(subcategoryId, isActive, baseUrl),
});
