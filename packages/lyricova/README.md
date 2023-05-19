# Lyricova

The blog component.

## Setup

See `../jukebox/README.md` for details.

## Public API

### Getting a random verse

- URL: `https://lyricova.1a23.studio/api/verse`
- Method: `GET`
- Query parameters:
  - `type` _(optional)_  
    Possible values: `original`, `main`  
    Limit the result to the verses in the original or main languages.
  - `languages` _(optional)_  
    Possible values: `ja`, `en`, `zh`, `fr`, `es`, `08n`, etc.  
    Limit the result to the verses in specified languages.
- Response: JSON object
  ```typescript
  {
    "text": string, // the verse string
    "typingSequence": [string, string][][], // [Plain text, typing string] of each word on each line
    "stylizedText": string | null, // the verse string with spaces for alignment
    "html": string | null, // the verse string formatted in HTML
    "isMain": boolean, // whether the verse is the main verse
    "isOriginal": boolean, // whether the verse is in the original language
    "language": string, // the language of the verse
    "entryId": number, // the ID of the entry
    "entry": {
      "title": string, // the title of the entry
      "producersName": string | null, // producers of the song
      "vocalistsName": string | null, // vocalists of the song
      "tags": {
        "name": string, // the name of the tag
        "slug": string, // the slug of the tag
        "color": string, // the color of the tag, e.g. "#ff0000"
      }[],
    },
  }
  ```

### Getting entries by song entity ID

- URL: `https://lyricova.1a23.studio/api/versesBySong`
- Method: `GET`
- Query parameters:
  - `songId` _(required)_  
    The ID of the song entity.
- Response: JSON array
  ```typescript
  {
    "id": number, // the ID of the entry
    "title": string, // the title of the entry
    "producersName": string | null, // producers of the song
    "vocalistsName": string | null, // vocalists of the song
    "comment": string | null, // the comment of the entry
    "recentActionDate": string, // ISO 8601 date string of the most recent action
    "creationDate": string, // ISO 8601 date string of the creation date
    "tags": {
      "name": string, // the name of the tag
      "slug": string, // the slug of the tag
      "color": string, // the color of the tag, e.g. "#ff0000"
    }[],
    "pulses": {
      "creationDate": string, // ISO 8601 date string of the pulse date
    }[],
    "verses": {
      "text": string, // the verse string
      "isMain": boolean, // whether the verse is the main verse
      "isOriginal": boolean, // whether the verse is in the original language
      "language": string, // the language of the verse
    }[],
  }[]
  ```
