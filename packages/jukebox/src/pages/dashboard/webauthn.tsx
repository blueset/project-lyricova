import { WebAuthnCredManager } from "lyricova-common/components/WebAuthnCredManager";
import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";

export default function WebAuthn() {
  return <WebAuthnCredManager />;
}

WebAuthn.layout = getLayout("WebAuthn Credentials");
