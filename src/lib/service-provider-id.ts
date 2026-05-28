export const SERVICE_PROVIDER_ID_ROUTE_PATTERN = /^(\d{6})-(\d{5})$/;
export const SERVICE_PROVIDER_ID_DISPLAY_PATTERN = /^(\d{6})\/(\d{5})$/;

export function getServiceProviderIdPrefix(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export function buildServiceProviderId(value: Date | string, sequence: number) {
  return `${getServiceProviderIdPrefix(value)}/${String(sequence).padStart(
    5,
    "0",
  )}`;
}

export function normalizeServiceProviderId(value?: string | null) {
  if (!value) return "";
  const decoded = decodeURIComponent(value).trim();
  const routeMatch = decoded.match(SERVICE_PROVIDER_ID_ROUTE_PATTERN);
  if (routeMatch) return `${routeMatch[1]}/${routeMatch[2]}`;

  const displayMatch = decoded.match(SERVICE_PROVIDER_ID_DISPLAY_PATTERN);
  if (displayMatch) return `${displayMatch[1]}/${displayMatch[2]}`;

  return decoded;
}

export function serviceProviderIdToRouteSegment(value?: string | null) {
  const normalized = normalizeServiceProviderId(value);
  if (!normalized) return "";
  return encodeURIComponent(normalized.replace("/", "-"));
}

export function serviceProviderRouteSegmentToId(value?: string | null) {
  return normalizeServiceProviderId(value);
}

export function getServiceProviderDisplayId(provider: {
  id: string;
  serviceProviderId?: string | null;
}) {
  return normalizeServiceProviderId(provider.serviceProviderId) || provider.id;
}

export function getProviderListingDisplayId(
  serviceProviderId: string,
  sequence: number,
) {
  return `${serviceProviderId}/${String(sequence).padStart(5, "0")}`;
}
