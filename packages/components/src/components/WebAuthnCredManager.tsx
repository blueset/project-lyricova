"use client";

import { getAuthenticatorName, type Passkey } from "@better-auth/passkey";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import { Input } from "@lyricova/components/components/ui/input";
import { Label } from "@lyricova/components/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "../utils/auth";
import { suggestPasskeyName } from "../utils/passkey";

interface NamingTarget {
  passkey: Passkey;
  newlyEnrolled: boolean;
}

export function WebAuthnCredManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [webAuthnSupported, setWebAuthnSupported] = useState(true);
  const [adding, setAdding] = useState(false);
  const [namingTarget, setNamingTarget] = useState<NamingTarget | null>(null);
  const [passkeyName, setPasskeyName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await authClient.passkey.listUserPasskeys();
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Could not load passkeys.");
      return;
    }
    setPasskeys(data ?? []);
  }, []);

  useEffect(() => {
    setWebAuthnSupported(Boolean(window.PublicKeyCredential));
    void refresh();
  }, [refresh]);

  const handleMutationError = useCallback(
    (error: { status: number; message?: string }) => {
      if (error.status === 403) {
        window.location.assign(
          `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }
      toast.error(error.message ?? "Could not update passkeys.");
    },
    [],
  );

  const addCredential = useCallback(async () => {
    setAdding(true);
    const { data, error } = await authClient.passkey.addPasskey();
    setAdding(false);
    if (error) {
      handleMutationError(error);
      return;
    }
    if (!data) {
      toast.error("Passkey was enrolled but its details were not returned.");
      await refresh();
      return;
    }
    await refresh();
    setPasskeyName(suggestPasskeyName(data));
    setNamingTarget({ passkey: data, newlyEnrolled: true });
  }, [handleMutationError, refresh]);

  const renameCredential = useCallback(
    (passkey: Passkey) => async () => {
      setPasskeyName(passkey.name?.trim() || suggestPasskeyName(passkey));
      setNamingTarget({ passkey, newlyEnrolled: false });
    },
    [],
  );

  const savePasskeyName = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const name = passkeyName.trim();
      if (!namingTarget || !name) return;

      setSavingName(true);
      const { error } = await authClient.passkey.updatePasskey({
        id: namingTarget.passkey.id,
        name,
      });
      setSavingName(false);
      if (error) {
        handleMutationError(error);
        return;
      }

      toast.success(
        namingTarget.newlyEnrolled ? "Passkey added." : "Passkey renamed.",
      );
      setNamingTarget(null);
      await refresh();
    },
    [handleMutationError, namingTarget, passkeyName, refresh],
  );

  const removeCredential = useCallback(
    (passkey: Passkey) => async () => {
      const warning =
        passkeys.length === 1
          ? "This is your last passkey. Password sign-in will remain available. Remove it?"
          : `Remove ${passkey.name || "this passkey"}?`;
      if (!window.confirm(warning)) return;

      const { error } = await authClient.passkey.deletePasskey({
        id: passkey.id,
      });
      if (error) {
        handleMutationError(error);
        return;
      }
      toast.success("Passkey removed.");
      await refresh();
    },
    [handleMutationError, passkeys.length, refresh],
  );

  return (
    <div>
      <div className="mb-4 flex flex-row items-center justify-between">
        <div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <p>{passkeys.length} passkey(s) found.</p>
          )}
          {!loading && passkeys.length < 2 && (
            <p className="text-sm text-muted-foreground">
              Enroll a second passkey to avoid losing access to your preferred
              sign-in method.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          disabled={!webAuthnSupported || adding}
          onClick={addCredential}
        >
          {adding ? "Adding..." : "Add passkey"}
        </Button>
      </div>
      <ul className="space-y-2">
        {passkeys.map((passkey) => {
          const authenticator =
            getAuthenticatorName(passkey.aaguid) ?? passkey.deviceType;
          return (
            <li
              key={passkey.id}
              className="flex items-center justify-between rounded border p-2"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {passkey.name || authenticator || "Passkey"}
                </p>
                <p className="text-muted-foreground">
                  {authenticator}
                  {passkey.backedUp ? " · Synced/backup eligible" : ""}
                  {passkey.createdAt
                    ? ` · ${new Date(passkey.createdAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Rename passkey"
                  onClick={renameCredential(passkey)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Remove passkey"
                  onClick={removeCredential(passkey)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog
        open={namingTarget !== null}
        onOpenChange={(open) => {
          if (!open && !savingName) setNamingTarget(null);
        }}
      >
        <DialogContent>
          <form onSubmit={savePasskeyName} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>
                {namingTarget?.newlyEnrolled
                  ? "Name your new passkey"
                  : "Rename passkey"}
              </DialogTitle>
              <DialogDescription>
                {namingTarget?.newlyEnrolled
                  ? "Your passkey is enrolled. Confirm the suggested authenticator name or choose your own."
                  : "Use a name that helps you recognize where this passkey is stored."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="passkey-name">Passkey name</Label>
              <Input
                id="passkey-name"
                value={passkeyName}
                onChange={(event) => setPasskeyName(event.target.value)}
                autoComplete="off"
                autoFocus
                required
                maxLength={255}
                disabled={savingName}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={savingName}
                onClick={() => setNamingTarget(null)}
              >
                {namingTarget?.newlyEnrolled ? "Skip" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={savingName || !passkeyName.trim()}
              >
                {savingName ? "Saving..." : "Save name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
