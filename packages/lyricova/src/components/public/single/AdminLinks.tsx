"use client";

import { Button } from "@lyricova/components/components/ui/button";
import { LS_JWT_KEY } from "@lyricova/components";
import { useEffect, useState } from "react";
import { Divider } from "../Divider";
import classes from "./AdminLinks.module.scss";

interface AdminLinksProps {
  id: number;
}

export function AdminLinks({ id }: AdminLinksProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const jwtKey = localStorage?.getItem(LS_JWT_KEY);
    if (jwtKey) {
      const expiryDate = new Date(
        JSON.parse(atob(jwtKey.split(".")[1])).exp * 1000
      );
      setIsAdmin(expiryDate > new Date());
    } else {
      setIsAdmin(false);
    }
  }, []);

  if (!isAdmin) return null;

  return (
    <>
      <div className={`container verticalPadding ${classes.container}`}>
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
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem(LS_JWT_KEY)}`,
                  },
                });
                const data = await response.json();
                alert(`Success: ${JSON.stringify(data)}`);
                window.location.reload();
              } catch (e) {
                alert(`Fail: ${e}`);
                console.error("Failed to bump entry", e);
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
