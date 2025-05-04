import { redirect } from "next/navigation";
import { getSession } from "./session";
import { FRONTEND_URL } from "./constants";

export const authFetch = async (
  url: string | URL,
  options: RequestInit = {},
) => {
  const sess = await getSession();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${sess?.accessToken}`,
    },
  });

  if (response.status === 401) {
    // Todo: Refresh token
    console.error("Unauthorized access. Redirecting to login.");
    redirect(FRONTEND_URL + "/auth/login");
  }
  return response;
};
