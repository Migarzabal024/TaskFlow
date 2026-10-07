import apiClient from "./apiClient";

export async function getStatistics() {
  const { data } = await apiClient.get("/statistics");
  return data.data.statistics;
}
