export interface SongleResponseSearchResult {
  name: string;
  artist: string;
  code: string;
  id: number;
  durationSeconds: number;
}

interface SongleArtist {
  id: number;
  name: string;
}

export interface SongleResponseSearch {
  url: string;
  artist: SongleArtist;
  id: number;
  duration: number;
  permalink: string;
  code: string;
  rmsAmplitude: number;
  createdAt: string;
  updatedAt: string;
  recognizedAt: string;
  title: string;
}

export interface SongleResponseLyricsList {
  status: {
    processing: boolean;
    failed: boolean;
  };
  lyrics: {
    id: number;
    processing: boolean;
    failed: boolean;
    song: {
      id: number;
      createdAt: string;
      updatedAt: string;
      name: string;
      play_count: number;
      permalink: string;
      rms_amplitude: number;
      length: number;
      gender: {
        median: number;
        "1/4 quartile": number;
        "3/4 quartile": number;
        histogram: number[];
      };
      dead_linked: boolean;
      artist: SongleArtist;
      site_license: {
        name: string;
      };
      code: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
}