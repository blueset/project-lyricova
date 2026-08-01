FROM node:24

# Set the working directory to /app
WORKDIR /app

# Install mecab and mecab-ipadic-neologd
RUN apt-get update && apt-get install -y mecab libmecab-dev mecab-ipadic-utf8 git make curl xz-utils file ffmpeg
# Make sudo dummy replacement, so we don't weaken docker security
RUN echo "#!/bin/bash\n\$@" > /usr/bin/sudo
RUN chmod +x /usr/bin/sudo

RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git /tmp/neologd && \
    /tmp/neologd/bin/install-mecab-ipadic-neologd -n -a -y && \
    rm -rf /tmp/neologd

# Install Python 3 and dependencies
RUN apt-get install -y python3 python3-venv
RUN python3 -m venv /opt/yt-dlp && \
    /opt/yt-dlp/bin/pip install --upgrade pip && \
    /opt/yt-dlp/bin/pip install "yt-dlp[default,curl-cffi]" && \
    ln -s /opt/yt-dlp/bin/yt-dlp /usr/local/bin/yt-dlp

RUN npm install -g concurrently

COPY mecabrc /etc/

ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV MUSIC_FILES_PATH=/var/music/
ENV NODE_ENV production

# This image provisions runtime OS deps only; it intentionally does NOT compile
# the apps or the @lyricova/glyph-renderer Rust/wasm crate. docker-compose
# bind-mounts the repo (.:/app) and the CMD below runs `npm run start`, so the
# container serves artifacts built on the HOST (`npm install && npm run build`,
# which produces glyph-renderer's pkg/ + build/). Jukebox's `prestart` hook
# verifies those prebuilt wasm/JS artifacts exist before serving. If you ever
# make this image build from source instead, add a stable Rust toolchain + the
# wasm32-unknown-unknown target here (see .github/workflows/typecheck.yml).

# Expose the ports defined in the environment variables LYRICOVA_PORT and JUKEBOX_PORT
EXPOSE $LYRICOVA_PORT $JUKEBOX_PORT

VOLUME ["/app", "/var/music"]

# Start the website in the lyricova and jukebox packages concurrently
CMD ["concurrently", "-n", "api,lyricova,jukebox", "-c", "yellow,green,blue", "--restart-tries", "-1", "cd packages/api && npm run start", "cd packages/lyricova && npm run start -- -p $LYRICOVA_PORT", "cd packages/jukebox && npm run start -- -p $JUKEBOX_PORT"]