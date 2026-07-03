import type { User } from "./User";

/**
 * @openapi
 * components:
 *   schemas:
 *     UserPublicKeyCredential:
 *       type: object
 *       description: WebAuthn public key credential for passwordless authentication.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         userId:
 *           type: integer
 *           format: int64
 *           description: ID of the user who owns this credential
 *         externalId:
 *           type: string
 *           maxLength: 512
 *           description: External credential ID from WebAuthn
 *         publicKey:
 *           type: string
 *           description: Public key for the credential (base64 encoded)
 *         remarks:
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *           description: Optional remarks or nickname for this credential
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - userId
 *         - externalId
 *         - publicKey
 */
export class UserPublicKeyCredential {
  id?: number;

  userId: number;

  user?: User;

  externalId: string;

  publicKey: string;

  remarks?: string;

  creationDate: Date;

  updatedOn: Date;
}
