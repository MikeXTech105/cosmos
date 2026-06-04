const statusStyles = {
  active: "bg-emerald-50/70 text-emerald-700 ring-emerald-200/70",
  inactive: "bg-red-50/70 text-red-700 ring-red-200/70",
};

const UserStatusBadge = ({ isActive }) => {
  const status = isActive ? "active" : "inactive";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        statusStyles[status],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

export default UserStatusBadge;
