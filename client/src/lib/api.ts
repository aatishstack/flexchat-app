import axios from "axios";

import { tokenStorage } from "./token";

export const api =
  axios.create({
    baseURL:
      "http://localhost:5000",
  });

api.interceptors.request.use(
  (config) => {
    const token =
      tokenStorage.get();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);