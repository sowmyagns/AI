import api from "./axiosConfig";

export const getCompanySettings = () => api.get("/settings/company");

export const updateCompanySettings = (payload) =>
  api.put("/settings/company", payload);

/** Live profile, subscription, and session details for the signed-in user. */
export const getAccountOverview = () => api.get("/settings/account-overview");
