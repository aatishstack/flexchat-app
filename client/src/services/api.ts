import axios from "axios";

import { tokenStorage } from "@/lib/token";

export const api =
  axios.create({
    baseURL:
      process.env
        .NEXT_PUBLIC_API_URL,
  });

api.interceptors.request.use(
  (config) => {
    const token =
      tokenStorage.get();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);