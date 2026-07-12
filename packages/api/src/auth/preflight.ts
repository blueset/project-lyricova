import type { RowDataPacket } from "mysql2";
import { pool } from "../drizzle/client.js";

interface LegacyUserRow extends RowDataPacket {
  id: number;
  username: string | null;
  displayName: string | null;
  email: string | null;
  role: "admin" | "guest" | null;
  password: string | null;
  deletionDate: Date | null;
}

export interface AuthPreflightResult {
  users: number;
  activeUsers: number;
  activeAdmins: number;
  issues: string[];
}

export async function inspectLegacyAuthData(): Promise<AuthPreflightResult> {
  const [users] = await pool.query<LegacyUserRow[]>(
    "SELECT id, username, displayName, email, role, password, deletionDate FROM Users",
  );
  const issues: string[] = [];
  const usernameOwners = new Map<string, number>();
  const emailOwners = new Map<string, number>();

  for (const user of users) {
    if (!user.username?.trim()) {
      issues.push(`User ${user.id} has no username.`);
    } else {
      const normalized = user.username.toLowerCase();
      const existing = usernameOwners.get(normalized);
      if (existing !== undefined) {
        issues.push(
          `Users ${existing} and ${user.id} share normalized username ${normalized}.`,
        );
      } else {
        usernameOwners.set(normalized, user.id);
      }
    }

    if (!user.displayName?.trim()) {
      issues.push(`User ${user.id} has no display name.`);
    }

    if (!user.email?.trim()) {
      issues.push(`User ${user.id} has no email address.`);
    } else {
      const normalized = user.email.toLowerCase();
      const existing = emailOwners.get(normalized);
      if (existing !== undefined) {
        issues.push(
          `Users ${existing} and ${user.id} share normalized email ${normalized}.`,
        );
      } else {
        emailOwners.set(normalized, user.id);
      }
    }

    if (user.role !== "admin" && user.role !== "guest") {
      issues.push(`User ${user.id} has invalid role ${String(user.role)}.`);
    }

    if (user.deletionDate === null && !user.password) {
      issues.push(
        `Active user ${user.id} has no legacy password to carry into the reset workflow.`,
      );
    }
  }

  const activeUsers = users.filter((user) => user.deletionDate === null);
  const activeAdmins = activeUsers.filter(
    (user) => user.role === "admin",
  ).length;
  if (activeAdmins === 0) {
    issues.push("No active administrator account exists.");
  }

  return {
    users: users.length,
    activeUsers: activeUsers.length,
    activeAdmins,
    issues,
  };
}

async function main(): Promise<void> {
  try {
    const result = await inspectLegacyAuthData();
    console.log(
      `Auth preflight: ${result.users} users, ${result.activeUsers} active, ${result.activeAdmins} active admins.`,
    );
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.error(`- ${issue}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  void main();
}
