import api from "./axiosConfig";

export const getDocuments = (docType = null) =>
  api.get("/documents", { params: docType ? { doc_type: docType } : undefined });

export const getDocument = (documentId) => api.get(`/documents/${documentId}`);

export const createDocument = (payload) => api.post("/documents", payload);

export const updateDocument = (documentId, payload) =>
  api.put(`/documents/${documentId}`, payload);

export const deleteDocument = (documentId) =>
  api.delete(`/documents/${documentId}`);
