# JukeBox

# Node dependencies

```bash
yarn install
```

# Python 3 dependencies

```
pip install pymusic-dl click
```

# Binary dependency

- MySQL
    - Setup `ngram` index: add `ngram_token_size=1` under `[mysqld]` section of `my.cnf`.
      See [MySQL docs](https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html) for details.
- [MeCab](https://taku910.github.io/mecab/)
- [MeCab IPADic NeologD](https://github.com/neologd/mecab-ipadic-neologd) @ `/usr/local/lib/mecab/dic/mecab-ipadic-neologd`

# Config

See `.env.example`.
