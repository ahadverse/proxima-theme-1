const NAMES: Record<string, string> = { steadfast: 'Steadfast', pathao: 'Pathao', carrybee: 'Carrybee' };

/** A courier's display name for the key stored on an order ("pathao" → "Pathao"). */
export const courierLabel = (provider?: string) => (provider && NAMES[provider]) || provider || 'The courier';
