"use client";

import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Button } from "@lyricova/components/components/ui/button";
import type { UserPublicKeyCredential } from "@lyricova/api/graphql/types";
import { MouseEvent, useCallback, useEffect, useState } from "react";
import base64url from "base64url";
import { LS_JWT_KEY } from "../utils/localStorage";
import { Trash2 } from "lucide-react";

const GET_CREDENTIALS_QUERY = gql`
  query {
    currentCredentials {
      id
      remarks
      creationDate
    }
  }
`;

const DELETE_CREDENTIAL_MUTATION = gql`
  mutation ($id: Int!) {
    deleteCredential(id: $id)
  }
`;

export function WebAuthnCredManager() {
  const { data, loading, error, refetch } = useQuery<{
    currentCredentials: UserPublicKeyCredential[];
  }>(GET_CREDENTIALS_QUERY);

  const apolloClient = useApolloClient();

  const [webAuthnSupported, setWebAuthnSupported] = useState(true);
  useEffect(() => {
    if (!window.PublicKeyCredential) {
      setWebAuthnSupported(false);
    }
  }, [setWebAuthnSupported]);

  const addCredential = useCallback(
    async (evt: MouseEvent<HTMLElement>) => {
      evt.preventDefault();
      const token = localStorage?.getItem(LS_JWT_KEY) ?? null;
      const resp = await fetch("/api/enroll/public-key/challenge", {
        method: "POST",
        headers: {
          Accept: "application/json",
          authorization: token ? `Bearer ${token}` : "",
        },
      });
      const respJson = await resp.json();

      const publicKey: PublicKeyCredentialCreationOptions = {
        rp: {
          name: "Project Lyricova",
          ...(window.location.hostname.startsWith("127")
            ? {}
            : { id: window.location.hostname }),
        },
        user: {
          id: Uint8Array.from(respJson.user.id as string, (c) =>
            c.charCodeAt(0)
          ),
          name: respJson.user.name,
          displayName: respJson.user.displayName,
        },
        challenge: base64url.toBuffer(
          respJson.challenge
        ) as unknown as ArrayBuffer,
        pubKeyCredParams: [
          {
            type: "public-key",
            alg: -7,
          },
        ],
        attestation: "none",
        authenticatorSelection: {
          userVerification: "discouraged",
          residentKey: "required",
        },
      };
      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential;

      const body = {
        response: {
          clientDataJSON: base64url.encode(
            Buffer.from(credential.response.clientDataJSON)
          ),
          attestationObject: base64url.encode(
            Buffer.from(
              (credential.response as AuthenticatorAttestationResponse)
                .attestationObject
            )
          ),
          transports: undefined as string[] | undefined,
        },
      };
      if (
        (credential.response as AuthenticatorAttestationResponse).getTransports
      ) {
        body.response.transports = (
          credential.response as AuthenticatorAttestationResponse
        ).getTransports();
      }

      const validateReq = await fetch("/api/login/public-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      const validateReqJson = await validateReq.json();
      console.log(validateReqJson);

      await refetch();
    },
    [refetch]
  );

  const removeCredential = useCallback(
    (id: number) => async () => {
      await apolloClient.mutate({
        mutation: DELETE_CREDENTIAL_MUTATION,
        variables: { id },
      });
      await refetch();
    },
    [apolloClient, refetch]
  );

  return (
    <div>
      <div className="flex flex-row justify-between items-center mb-4">
        <div>
          {loading && <p>Loading...</p>}
          {error && (
            <p className="text-destructive-foreground">
              Error occurred while loading credentials: {error.message}
            </p>
          )}
          {data && (
            <p>{data?.currentCredentials?.length ?? 0} credential(s) found.</p>
          )}
        </div>
        <Button
          variant="outline"
          disabled={!webAuthnSupported}
          onClick={addCredential}
        >
          Add credential
        </Button>
      </div>
      <ul className="space-y-2">
        {data?.currentCredentials.map((cred) => (
          <li
            key={cred.id}
            className="flex flex-row justify-between items-center p-2 border rounded"
          >
            <p className="text-sm">
              <b className="font-medium">{cred.id}</b>: {cred.remarks},{" "}
              {new Date(cred.creationDate).toISOString()}
            </p>
            <Button
              variant="destructive"
              size="icon"
              aria-label="Remove token"
              onClick={removeCredential(cred.id!)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
