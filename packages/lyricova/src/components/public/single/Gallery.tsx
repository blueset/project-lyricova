import { useEffect, useState } from "react";
import { Divider } from "../Divider";
import classes from "./Gallery.module.scss";

interface CommentProps {
  entryIds?: number[];
}

export function Gallery({ entryIds }: CommentProps) {
  const [galleryUrls, setGalleryUrls] = useState<
    {
      title: string;
      url: string;
      image: string;
    }[]
  >([]);

  useEffect(() => {
    async function fetchGalleryUrls() {
      const promises = entryIds.map(async (v) =>
        (
          await fetch(`https://1a23.com/wp-json/wp/v2/gallery?song_id=${v}`)
        ).json()
      );
      const jsons = await Promise.all(promises);
      setGalleryUrls(
        jsons.flat().map((o) => ({
          url: o.link,
          image: o.yoast_head_json.og_image[0].url,
          title: o.title.rendered,
        }))
      );
    }
    if (entryIds) {
      fetchGalleryUrls();
    }
  }, [entryIds]);

  if (!entryIds || galleryUrls.length <= 0) {
    return null;
  }
  return (
    <>
      <div className={`container verticalPadding ${classes.gallery}`}>
        <h2 className={classes.gallery}>Gallery</h2>
        <div className={classes.galleryEntries}>
          {galleryUrls.map(({ title, url, image }) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              <img src={image} alt={title} title={title} />
            </a>
          ))}
        </div>
      </div>
      <Divider />
    </>
  );
}
