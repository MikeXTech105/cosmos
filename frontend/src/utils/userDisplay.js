export const getDisplayName = (user) => {
  return (
    user?.fullName ??
    user?.name ??
    user?.username ??
    user?.email ??
    "System Admin"
  );
};

export const getInitial = (name) => {
  return name.trim().charAt(0).toUpperCase() || "S";
};

export const getRoleName = (user, roles) => {
  return user?.role ?? user?.roleName ?? roles?.[0]?.name ?? roles?.[0] ?? "Admin";
};
