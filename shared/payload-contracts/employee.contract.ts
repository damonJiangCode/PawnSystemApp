type EmployeeDetailsInput = {
  first_name: string;
  last_name: string;
  nickname: string;
  date_of_birth: string;
  gender: string;
  is_terminated: boolean;
  is_manager: boolean;
  address: string;
  phone: string;
  email: string;
};

export type CreateEmployeeInput = EmployeeDetailsInput & {
  password: string;
  manager_password: string;
};

export type UpdateEmployeeInput = EmployeeDetailsInput & {
  password?: string;
  manager_password: string;
};

export type EmployeeFormField = keyof CreateEmployeeInput | "form";

export type EmployeeSearchInput = {
  first_name?: string;
  last_name?: string;
};
