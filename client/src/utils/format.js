export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDueTime(time) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function formatDueDateTime(task) {
  const date = formatDate(task.dueDate);
  const time = formatDueTime(task.dueTime);
  return time ? `${date} · ${time}` : date;
}

export function formatDateTimeFull(isoTimestamp) {
  if (!isoTimestamp) return "";
  return new Date(isoTimestamp).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
