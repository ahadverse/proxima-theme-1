export interface AttributeValue {
  _id?: string;
  value: string;
  colorHex?: string;
  sortOrder?: number;
}

export interface Attribute {
  _id: string;
  name: string;
  slug: string;
  type: 'color' | 'text';
  values: AttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeInput {
  name: string;
  slug?: string;
  type?: 'color' | 'text';
  values?: AttributeValue[];
}
