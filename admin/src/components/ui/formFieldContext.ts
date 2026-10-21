import { createContext, useContext } from 'react';

/** What a FormField hands to the control inside it, so the label, hint and error are announced with it. */
export interface FormFieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export const FormFieldContext = createContext<FormFieldControlProps | null>(null);

/** The id and descriptions of the surrounding FormField, or null when the control isn't inside one. */
export function useFormFieldControl() {
  return useContext(FormFieldContext);
}
