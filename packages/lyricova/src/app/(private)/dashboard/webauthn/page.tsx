import { WebAuthnCredManager } from "@lyricova/components";
import { NavHeader } from "../NavHeader";

export const metadata = {
  title: "Passkeys",
};

export default function WebAuthn() {
  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Passkeys" },
        ]}
      />
      <div className="h-full mx-4 mb-2">
        <WebAuthnCredManager />
      </div>
    </>
  );
}
