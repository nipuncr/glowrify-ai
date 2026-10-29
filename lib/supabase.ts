import { createClient, SupabaseClient } from "@supabase/supabase-js";
const origin = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
let pending: Promise<SupabaseClient> | null = null;
export function authClient(): Promise<SupabaseClient> {
  if (!pending)
    pending = (async () => {
      const response = await fetch(`${origin}/api/config`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          "Sign-in is temporarily unavailable. Please try again.",
        );
      const config = await response.json();
      if (!config.supabase_url || !config.supabase_anon_key)
        throw new Error(
          "Sign-in is temporarily unavailable. Please try again.",
        );
      return createClient(config.supabase_url, config.supabase_anon_key);
    })().catch(() => {
      pending = null;
      throw new Error("Sign-in is temporarily unavailable. Please try again.");
    });
  return pending;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const client = await authClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new Error("Sign in to create your personal edit.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error("The request could not be completed. Please try again.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Your request could not be completed. Please try again.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}


export async function guestRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error("The request could not be completed. Please check that Glowrify's backend is running.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Your request could not be completed. Please try again.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
