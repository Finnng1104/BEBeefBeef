import { ParsedQs } from 'qs';

export function flattenQueryParams(params: ParsedQs): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(',');
    } else if (typeof value === 'object' && value !== null) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = '';
    }
  });
  return result;
}
