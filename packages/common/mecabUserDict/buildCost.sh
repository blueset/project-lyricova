cd ipadic
/usr/local/libexec/mecab/mecab-dict-index \
  -m ../mecab-ipadic-2.7.0-20070801.model \
  -d . \
  -u ../CustomDictWeighted.csv \
  -f utf-8 \
  -t utf-8 \
  -a ../CustomDict.csv
cat ../CustomDictPreweighted.csv ../CustomDictWeighted.csv > ../CustomDictWeightedCombined.csv
/usr/local/libexec/mecab/mecab-dict-index \
  -d . \
  -u ../CustomDictWeightedCombined.dic \
  -f utf-8 \
  -t utf-8 \
  ../CustomDictWeightedCombined.csv