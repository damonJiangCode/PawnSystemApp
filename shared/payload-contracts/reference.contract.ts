export type CitiesResponse = {
  provinces: string[];
  citiesByProvince: Record<string, string[]>;
};

export type SaveHolidayInput = {
  holiday_date: string;
  name: string;
};

export type SaveLocationInput = {
  location: string;
  description: string;
};

export type ItemCategoryOption = {
  category_id: number;
  category_name: string;
  subcategory_id: number;
  subcategory_name: string;
};
