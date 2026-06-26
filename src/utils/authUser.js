export function getCurrentUser() {
  try {
    const rawUser =
      localStorage.getItem("vx_user") ||
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser");

    if (!rawUser) return null;

    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function getCurrentUserName() {
  const user = getCurrentUser();

  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    ""
  );
}