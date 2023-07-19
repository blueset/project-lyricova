export interface SpotifyAuthToken {
  clientId: string;
  accessToken: string;
  accessTokenExpirationTimestampMs: number;
  isAnonymous: boolean;
}
