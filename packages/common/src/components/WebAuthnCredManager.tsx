import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Button, IconButton, Stack, Typography } from "@mui/material";
import { UserPublicKeyCredential } from "../models/UserPublicKeyCredential";
import { MouseEvent, useCallback, useEffect, useState } from "react";
import base64url from "base64url";
import { LS_JWT_KEY } from "../frontendUtils/localStorage";
import DeleteIcon from "@mui/icons-material/Delete";
import React from "react";

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
            : { id: window.location.hostname.split(".").slice(-2).join(".") }),
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
        authenticatorSelection: {},
      };
      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential;

      const body = {
        response: {
          clientDataJSON: base64url.encode(
            credential.response.clientDataJSON as Buffer
          ),
          attestationObject: base64url.encode(
            (credential.response as AuthenticatorAttestationResponse)
              .attestationObject as Buffer
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
      <Typography variant="h5" paragraph>
        WebAuthn Credentials
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: "center" }}
      >
        {loading && "Loading..."}
        {error && `Error occurred while loading credentials: ${error}`}
        {data && <>{data?.currentCredentials?.length} credential(s) found.</>}
        <Button
          variant="outlined"
          disabled={!webAuthnSupported}
          onClick={addCredential}
        >
          Add credential
        </Button>
      </Stack>
      <ul>
        {data?.currentCredentials.map((cred) => (
          <li
            key={cred.id}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" paragraph>
              <b>{cred.id}</b>: {cred.remarks},{" "}
              {new Date(cred.creationDate).toISOString()}
            </Typography>
            <IconButton
              color="error"
              aria-label="Remove token"
              onClick={removeCredential(cred.id!)}
            >
              <DeleteIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
