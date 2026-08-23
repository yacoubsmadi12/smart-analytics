import { describe, expect, it } from "vitest";
import { filterUsers, type UserDirectoryEntry } from "./user-directory";

const users: UserDirectoryEntry[] = [
  { id: 1, name: "System Administrator", username: "admin", email: "admin@example.com", role: "admin", isActive: true, lastSignedIn: new Date() },
  { id: 2, name: "Network Operations", username: "net.ops", email: "ops@example.com", role: "user", isActive: true, lastSignedIn: new Date() },
  { id: 3, name: "Former Analyst", username: "analyst", email: "analyst@example.com", role: "user", isActive: false, lastSignedIn: new Date() },
];

describe("user directory filters", () => {
  it("matches search text across name, username, and email", () => {
    expect(filterUsers(users, "OPS", "all", "all").map(user => user.id)).toEqual([2]);
    expect(filterUsers(users, "administrator", "all", "all").map(user => user.id)).toEqual([1]);
  });

  it("combines role and account status filters", () => {
    expect(filterUsers(users, "", "user", "active").map(user => user.id)).toEqual([2]);
    expect(filterUsers(users, "", "user", "disabled").map(user => user.id)).toEqual([3]);
  });

  it("returns an empty result when no account matches", () => {
    expect(filterUsers(users, "missing", "all", "all")).toEqual([]);
  });
});
