"use client";

import { authClient } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import { Divider } from "../Divider";
import classes from "./AdminLinks.module.scss";

interface AdminLinksProps {
  id: number;
}

export function AdminLinks({ id }: AdminLinksProps) {
  const { data: session } = authClient.useSession();
  if (session?.user.role !== "admin") return null;

  return (
    <>
      <div
        className={`lyricova-container verticalPadding ${classes.container}`}
      >
        <h2 className={classes.title}>Admin</h2>
        <div className={classes.content}>
          <Button variant="ghostBright" asChild>
            <a
              target="_blank"
              rel="noreferrer"
              href={`/dashboard/entries/${id}`}
            >
              Edit
            </a>
          </Button>
          <Button
            variant="ghostBright"
            onClick={async () => {
              try {
                const response = await fetch(`/api/bump/${id}`, {
                  method: "PATCH",
                });
                if (!response.ok) {
                  throw new Error(
                    `Request failed: ${response.status} ${response.statusText}`,
                  );
                }
                const data = await response.json();
                alert(`Success: ${JSON.stringify(data)}`);
                window.location.reload();
              } catch (error) {
                alert(`Fail: ${error}`);
                console.error("Failed to bump entry", error);
              }
            }}
          >
            Bump
          </Button>
        </div>
      </div>
      <Divider />
    </>
  );
}
