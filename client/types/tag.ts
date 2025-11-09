export type TagFull = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TagFormData = {
  id?: string;
  name: string;
  description?: string;
};
