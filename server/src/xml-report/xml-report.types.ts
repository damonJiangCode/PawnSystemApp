// LeadsOnline ticket format. Field names

export type LeadsOnlineEnvironment = 'sandbox' | 'production';

export type LeadsOnlineLogin = {
  storeId: number;
  userName: string;
  password: string;
};

export type LeadsOnlineProperty = { Name: string; Value: string };

export type LeadsOnlineItem = {
  make: string;
  model: string;
  serialNumber: string;
  description: string;
  amount: number;
  itemType: 'Other' | 'Jewelry' | 'Firearm';
  itemStatus: 'Pawn' | 'Buy';
  isVoid: false;
  employee: string;
  extraItem: { PropertyValue: LeadsOnlineProperty[] };
};

export type LeadsOnlineTicket = {
  key: {
    ticketType: 'Pawn' | 'Buy';
    ticketnumber: string;
    ticketDateTime: string;
  };
  redeemByDate: string;
  customer: {
    name: string;
    fname: string;
    lname: string;
    address1: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    idType: string;
    idNumber: string;
    dob: string;
    weight: number;
    height: number;
    eyeColor: string;
    hairColor: string;
    sex: string;
    extraCustomer: { PropertyValue: LeadsOnlineProperty[] };
  };
  items: { Item: LeadsOnlineItem[] };
  isVoid: false;
  extraTicket: { PropertyValue: LeadsOnlineProperty[] };
};

// What LeadsOnline answered, in our own shape. error_code 0 means success.
export type LeadsOnlineResult = {
  success: boolean;
  error_code: number;
  message: string;
};
