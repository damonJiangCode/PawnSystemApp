export interface Employee {
  employee_number: number;
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
  created_at?: Date;
  updated_at?: Date;
}
