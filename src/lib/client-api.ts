export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("off2zim_token");
}

export function getAuthHeaders(
  initHeaders?: HeadersInit,
  includeJsonContentType = false
) {
  const headers = new Headers(initHeaders);
  const token = getStoredToken();

  if (includeJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers = getAuthHeaders(init.headers, !!init.body && !isFormData);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || "Request failed";

    if (
      response.status === 401 &&
      token &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(
        new CustomEvent("off2zim:session-expired", {
          detail: {
            path: `${window.location.pathname}${window.location.search}`,
          },
        })
      );
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}
