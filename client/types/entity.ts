export type EntityFull = {
  id: string;
  name: string;
  type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EntityFormData = {
  id?: string;
  name: string;
  type?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
};
