export type SongleTimeTagData = {
  start_time: number | null;
  end_time: number | null;
}[][][];

export interface SongleLyricsObject {
  id: number;
  url: string;
  offset: number;
  diff: {
    id: number;
  };
  parser_path: string;
  created_at: string;
  updated_at: string;
  processing: boolean;
  failed: boolean;
  data: SongleTimeTagData;
}

export interface SongleLicenseResponse {
  contenType: number;
  url: string;
  contentUrl: string;
  name: string;
  authorName: string;
  authorPath: string;
  license: {
    code: number;
    condition: {
      by: boolean;
      ns: boolean;
      nc: boolean;
      org: boolean;
      clb: boolean;
      cc: boolean;
    };
  };
}

export interface SongleError {
  error: string;
}