import MeCab
import jieba
import pypinyin
import sys
import json


def lang_ja(text):
    def hira(w):
        return ''.join(chr(ord(i) - ord('ァ') + ord('ぁ'))
                       if ord('ァ') <= ord(i) <= ord('ヶ') else i for i in w)

    def not_punc(w):
        return any(map(lambda a: a.isalpha() or
                                 ord('ぁ') <= ord(a) <= ord('ヿ') or
                                 0x2E80 <= ord(a) <= 0x2FD5 or
                                 0x3400 <= ord(a) <= 0x4DBF or
                                 0x4E00 <= ord(a) <= 0x9FCC, w))

    t = MeCab.Tagger('--node-format=%M\u200C%f[7]\u200C%pA\\n --unk-format=%M\u200C%M\u200C%pA\\n --eos-format= -l3')
    res = []
    text = text.split("\n")
    for line in text:
        ln = [["", ""]]
        last_score = 0
        curr_diff = 0
        n = [i.split('\u200C') for i in t.parse(line).split('\n') if i]
        if len(n) < 1:  # EOL
            continue
        else:
            x = n.pop(0)
            last_score = float(x[2])
            ln[-1][0] += x[0]
            yomi = x[1]
            ln[-1][1] += hira(x[0] if yomi == "*" else yomi)
        while n:
            x = n.pop(0)
            curr_diff = last_score - float(x[2]) - 1000
            last_score = float(x[2])
            if curr_diff > 0 and not_punc(x[0]):
                ln.append(["", ""])
            ln[-1][0] += x[0]
            yomi = x[1]
            ln[-1][1] += hira(x[0] if yomi == "*" else yomi)
        if ln[-1] == ['', '']:
            ln.pop(-1)
        res.append(ln)
    return res


def lang_zh(text):
    res = []
    for line in text.split('\n'):
        cut = jieba.cut(line)
        ln = [[i, "'".join(j[0] for j in pypinyin.pinyin(i, style=0))] for i in cut]
        res.append(ln)
    return res

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('zh', 'ja'):
        print("Usage: %s (zh|ja) text" % sys.argv[0])
        exit()
    if sys.argv[1] == 'zh':
        jieba.initialize()
        print(json.dumps(lang_zh(sys.argv[2])))
    elif sys.argv[1] == 'ja':
        print(json.dumps(lang_ja(sys.argv[2])))
else:
    jieba.initialize()
