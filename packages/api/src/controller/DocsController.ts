import type { Request, Response } from "express";
import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import { apiReference } from "@scalar/express-api-reference";
import { ENVIRONMENT } from "../utils/secret";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.1",
    info: {
      title: "Lyricova API",
      version: "1.0.0",
    },
    servers: [
      ENVIRONMENT === "development" && {
        url: "http://localhost:8083/api",
        description: "Local server",
      },
      {
        url: "https://lyricova.1a23.studio/api",
        description: "Lyricova production server",
      },
      {
        url: "https://jukebox.1a23.studio/api",
        description: "Lyricova Jukebox production server",
      },
    ].filter(Boolean),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    tags: [
      {
        name: "Artists",
        description: "Operations related to artist entities and their metadata",
      },
      {
        name: "Entries",
        description:
          "Operations related to blog entries with verses and metadata",
      },
      {
        name: "Songs",
        description: "Operations related to song entities and their metadata",
      },
      {
        name: "Lyricova admin API",
        description:
          "Administrative operations for managing Lyricova blog data",
      },
      {
        name: "Lyricova public API",
        description: "General queries for Lyricova blog data",
      },
      {
        name: "Music Files",
        description:
          "Operations for managing music files in Jukebox, including metadata, cover art, and lyrics",
      },
      {
        name: "Playlists",
        description: "Operations related to playlists",
      },
      {
        name: "Tags",
        description: "Operations related to tags",
      },
    ],
  },
  apis: [
    "./src/controller/*.ts",
    "./src/models/*.ts",
    "./src/graphql/LyricsKitObjects.ts",
    "./src/utils/adminOnlyMiddleware.ts",
  ],
};

export class DocsController {
  public router: Router;
  public swaggerSpec: object;

  constructor() {
    this.router = Router();
    this.swaggerSpec = swaggerJsdoc(options);
    this.router.get("/swagger.json", this.swaggerJson);
    this.router.use(
      "/docs",
      apiReference({
        content: this.swaggerSpec,
        pageTitle: "Lyricova API Documentation",
        title: "Lyricova API Documentation",
      })
    );
  }

  public swaggerJson = async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(this.swaggerSpec);
  };
}
