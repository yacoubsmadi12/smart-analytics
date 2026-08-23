export type UserDirectoryEntry = {
  id: number;
  name: string | null;
  username: string | null;
  email: string | null;
  role: "user" | "admin";
  isActive: boolean;
  lastSignedIn: Date;
};

export type UserRoleFilter = "all" | "user" | "admin";
export type UserStatusFilter = "all" | "active" | "disabled";

export function filterUsers(
  users: UserDirectoryEntry[],
  search: string,
  roleFilter: UserRoleFilter,
  statusFilter: UserStatusFilter,
) {
  const needle = search.trim().toLowerCase();
  return users.filter(user => {
    const matchesSearch = !needle || [user.name, user.username, user.email].some(value => value?.toLowerCase().includes(needle));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });
}
