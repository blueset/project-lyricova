# Jukebox

## Node dependencies

```bash
npm install
```

## Python 3 dependencies

```bash
pip install yt-dlp
```

<!--
## Python 3 dependencies

```bash
pip install pytimeparse pymusic-dl click  # pending dropping due to bad support
```
-->

## Binary dependencies

- MySQL
  - Setup `ngram` index: add `ngram_token_size=1` under `[mysqld]` section of
    `my.cnf`. See
    [MySQL docs](https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html)
    for details.
- [MeCab](https://taku910.github.io/mecab/)
- [MeCab IPADic NeologD](https://github.com/neologd/mecab-ipadic-neologd) @
  `/usr/local/lib/mecab/dic/mecab-ipadic-neologd`

<!--
## Music downloader dependencies
### Install
- Install `go` and `git`

```bash
go get -u github.com/winterssy/mxget
git clone https://github.com:jsososo/QQMusicApi.git
cd QQMusicApi
npm install
```

### Serve
```bash
mxget serve  # serving on port 8080
```

```bash
cd QQMusicApi
./startup.py  # serving on port 3300
```
-->

<!--
 yarn run concurrently "~/go/bin/mxget serve" "~/Codebase/QQMusicApi/startup.py" -n mxget,qq
 -->

<!--
<details>
<summary>Content of <code>startup.py</code></summary>

Save the file next to `bin` under `QQMusicApi`.

```py
#!/usr/bin/env python3
import requests
import os
import time
import subprocess
from pathlib import Path


resp_json = requests.get("https://api.qq.jsososo.com/user/cookie",
                         headers={"user-agent": "Chrome/99.98.87 Windows 10"}).json()

cookies = resp_json["data"]["userCookie"]
cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])

qq = cookies["uin"]
print("Cookie str:", cookie_str)
print("QQ from demo API:", qq)

env_copy = os.environ.copy()
env_copy["qq"] = qq
proc = subprocess.Popen(["node", f"{Path(__file__).resolve().parent}/bin/www"], env=env_copy)

time.sleep(2)
resp = requests.post("http://localhost:3300/user/setCookie", json={"data": cookie_str})
print("Set cookies resp:", resp)

try:
    proc.wait()
except KeyboardInterrupt:
    proc.terminate()
    proc.wait()
```

</details>
-->

## Config

See `.env.example`.
