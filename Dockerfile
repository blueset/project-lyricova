FROM node:18

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
RUN apt-get install -y python3 python3-pip 
RUN pip3 install yt-dlp

RUN npm install -g concurrently

COPY mecabrc /etc/

ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV MUSIC_FILES_PATH=/var/music/
ENV NODE_ENV production

# Expose the ports defined in the environment variables LYRICOVA_PORT and JUKEBOX_PORT
EXPOSE $LYRICOVA_PORT $JUKEBOX_PORT

VOLUME ["/app", "/var/music"]

# Start the website in the lyricova and jukebox packages concurrently
CMD ["concurrently", "-n", "lyricova,jukebox", "-c", "green,blue", "--restart-tries", "-1", "cd packages/lyricova && npm run serve", "cd packages/jukebox && npm run serve"]
