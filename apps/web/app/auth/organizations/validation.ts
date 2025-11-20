export const validateOrgName = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'Required';
  if (!/^[\p{L}]/u.test(trimmed))
    return 'Must start with a letter (A–Z including accents)';
  if (trimmed.length < 2) return 'Must be at least 2 characters';
  if (trimmed.length > 100) return 'Must be at most 100 characters';
  if (!/^[\p{L}0-9\s-]+$/u.test(trimmed))
    return 'Only letters (including accents), numbers, spaces, and "-" are allowed';
  return '';
};

export const validateOrgAlias = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'Required';
  if (!/^[\p{L}]/u.test(trimmed))
    return 'Must start with a letter (A–Z including accents)';
  if (trimmed.length < 2) return 'Must be at least 2 characters';
  if (trimmed.length > 50) return 'Must be at most 50 characters';
  if (!/^[\p{L}0-9\s-]+$/u.test(trimmed))
    return 'Only letters (including accents), numbers, spaces, and "-" are allowed';
  return '';
};

export const validateICO = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return 'Required';
  if (!/^\d{8}$/.test(trimmed)) return 'Must be exactly 8 digits';
  return '';
};
