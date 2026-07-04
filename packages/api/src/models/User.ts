/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: A user account in the system.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         username:
 *           type: string
 *           maxLength: 256
 *           example: "admin"
 *           description: Unique username for login
 *         displayName:
 *           type: string
 *           maxLength: 256
 *           example: "Administrator"
 *           description: Display name shown to other users
 *         email:
 *           type: string
 *           maxLength: 512
 *           format: email
 *           example: "admin@example.com"
 *           description: Unique email address
 *         emailMD5:
 *           type: string
 *           description: MD5 hash of email (for Gravatar)
 *           pattern: "^[a-fA-F0-9]{32}$"
 *           readOnly: true
 *         role:
 *           type: string
 *           enum:
 *             - admin
 *             - guest
 *           description: User role determining permissions
 *         provider:
 *           type: string
 *           maxLength: 256
 *           description: OAuth provider name if using OAuth
 *         provider_id:
 *           type: string
 *           maxLength: 1024
 *           description: OAuth provider’s user ID
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         deletionDate:
 *           oneOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *       required:
 *         - id
 *         - username
 *         - displayName
 *         - email
 *         - role
 */
export class User {
  id!: number;

  username!: string;

  displayName!: string;

  password!: string;

  email!: string;

  role!: "admin" | "guest";

  provider?: string;

  provider_id?: string;

  creationDate!: Date;

  updatedOn!: Date;

  deletionDate!: Date;

  emailMD5!: string;
}
