import json
import pickle
import codecs
import sys
import os
from unittest.mock import MagicMock
from music_dl.source import MusicSource
from music_dl import config
import click

ms = MusicSource()
config.init()


@click.group()
def cli():
    pass


def suppress_echo():
    """Suppress echo and progress bar from click."""
    click.echo = MagicMock()
    click.progressbar = MagicMock()


@cli.command(help="Search for songs")
@click.argument("term")
def search(term):
    suppress_echo()
    result = ms.search(
        term, ["baidu", "kugou", "netease", "163", "qq", "migu"]
    )
    data = [
        {
            "source": i.source,
            "title": i.title,
            "artists": i.singer,
            "album": i.album,
            "duration": i.duration,
            "size": i.size,
            "songURL": i.song_url,
            "lyricsURL": i.lyrics_url,
            "coverURL": i.cover_url,
            "pickle": codecs.encode(pickle.dumps(i), "base64").decode()
        }
        for i in result
    ]
    json_data = json.dumps(data)
    print(json_data)
    return json_data


@cli.command(help="Download a song")
def download():
    suppress_echo()
    data = sys.stdin.read()
    pickled = codecs.decode(data.encode(), "base64")
    obj = pickle.loads(pickled)
    obj.download()
    print(obj.song_fullname)
    return obj.song_fullname


if __name__ == '__main__':
    cli()
