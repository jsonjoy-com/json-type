export const normalizeAccessor = (key: string): string => {
  // Simple property access for valid identifiers, bracket notation otherwise
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `.${key}`;
  }
  return `[${JSON.stringify(key)}]`;
};
