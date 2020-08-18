"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let breakMatches, wsnwMatches = [], wsnwOffset = 0;
const watching = {
    sel: [],
    el: [],
};
let handlersInitialized = false;
let polyfilled = false;
function noop() { }
function forEach(elements, callback) {
    Array.prototype.forEach.call(elements, callback);
}
function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
function debounce(func, wait) {
    let timeout = undefined;
    return function executedFunction(...args) {
        const later = () => {
            window.clearTimeout(timeout);
            func(...args);
        };
        window.clearTimeout(timeout);
        timeout = window.setTimeout(later, wait);
    };
}
function hasTextWrap() {
    if (typeof window === "undefined") {
        return false;
    }
    const { style } = document.documentElement;
    return style.textWrap || style.WebkitTextWrap || style.MozTextWrap || style.MsTextWrap;
}
class NextWS_params {
    constructor() {
        this.index = 0;
        this.width = 0;
        this.reset = () => {
            this.index = 0;
            this.width = 0;
        };
        this.reset();
    }
}
function isWhiteSpaceNoWrap(index) {
    return wsnwMatches.some(range => (range.start < index && index < range.end));
}
function recursiveCalcNoWrapOffsetsForLine(node, includeTag) {
    if (node.nodeType === node.ELEMENT_NODE) {
        const el = node;
        const style = window.getComputedStyle(el);
        if (style.whiteSpace === "nowrap") {
            const len = el.outerHTML.length;
            wsnwMatches.push({ start: wsnwOffset, end: wsnwOffset + len });
            wsnwOffset += len;
        }
        else {
            forEach(el.childNodes, (child) => {
                recursiveCalcNoWrapOffsetsForLine(child, true);
            });
            if (includeTag) {
                wsnwOffset += (el.outerHTML.length - el.innerHTML.length);
            }
        }
    }
    else if (node.nodeType === node.COMMENT_NODE) {
        const el = node;
        wsnwOffset += el.length + 7;
    }
    else if (node.nodeType === node.PROCESSING_INSTRUCTION_NODE) {
        const el = node;
        wsnwOffset += el.length + 2;
    }
    else {
        const el = node;
        wsnwOffset += el.length;
    }
}
function calcNoWrapOffsetsForLine(el, oldWS, lineCharOffset) {
    if (lineCharOffset === 0) {
        el.style.whiteSpace = oldWS;
        wsnwOffset = 0;
        wsnwMatches = [];
        recursiveCalcNoWrapOffsetsForLine(el, false);
        el.style.whiteSpace = "nowrap";
    }
    else {
        const newMatches = [];
        wsnwMatches.forEach((match) => {
            if (match.start > lineCharOffset) {
                newMatches.push({ start: match.start - lineCharOffset, end: match.end - lineCharOffset });
            }
        });
        wsnwMatches = newMatches;
    }
}
function removeTags(el) {
    let brs = el.querySelectorAll('br[data-owner="balance-text-hyphen"]');
    forEach(brs, (br) => {
        br.outerHTML = "";
    });
    brs = el.querySelectorAll('br[data-owner="balance-text-zws"]');
    forEach(brs, (br) => {
        br.outerHTML = "";
    });
    brs = el.querySelectorAll('br[data-owner="balance-text"]');
    forEach(brs, (br) => {
        br.outerHTML = " ";
    });
    let spans = el.querySelectorAll('span[data-owner="balance-text-softhyphen"]');
    if (spans.length > 0) {
        forEach(spans, (span) => {
            var _a, _b;
            const textNode = document.createTextNode("\u00ad");
            (_a = span.parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(textNode, span);
            (_b = span.parentNode) === null || _b === void 0 ? void 0 : _b.removeChild(span);
        });
    }
    spans = el.querySelectorAll('span[data-owner="balance-text-justify"]');
    if (spans.length > 0) {
        let txt = "";
        forEach(spans, (span) => {
            var _a;
            txt += span.textContent;
            (_a = span.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(span);
        });
        el.innerHTML = txt;
    }
}
const isJustified = function (el) {
    const style = window.getComputedStyle(el, null);
    return (style.textAlign === "justify");
};
function justify(el, txt, conWidth) {
    var _a;
    txt = txt.trim();
    const words = txt.split(" ").length;
    txt = `${txt} `;
    if (words < 2) {
        return txt;
    }
    const tmp = document.createElement("span");
    tmp.innerHTML = txt;
    el.appendChild(tmp);
    const size = tmp.offsetWidth;
    (_a = tmp.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(tmp);
    const wordSpacing = Math.floor((conWidth - size) / (words - 1));
    tmp.style.wordSpacing = `${wordSpacing}px`;
    tmp.setAttribute("data-owner", "balance-text-justify");
    const div = document.createElement("div");
    div.appendChild(tmp);
    return div.innerHTML;
}
function isBreakChar(txt, index) {
    const re = /([^\S\u00a0]|-|\u2014|\u2013|\u00ad|\u200B)(?![^<]*>)/g;
    let match;
    if (!breakMatches) {
        breakMatches = [];
        match = re.exec(txt);
        while (match !== null) {
            if (!isWhiteSpaceNoWrap(match.index)) {
                breakMatches.push(match.index);
            }
            match = re.exec(txt);
        }
    }
    return breakMatches.indexOf(index) !== -1;
}
function isBreakOpportunity(txt, index) {
    return ((index === 0) || (index === txt.length) ||
        (isBreakChar(txt, index - 1) && !isBreakChar(txt, index)));
}
function findBreakOpportunity(el, txt, conWidth, desWidth, dir, c, ret) {
    let w = 0;
    if (txt && typeof txt === "string") {
        for (;;) {
            while (!isBreakOpportunity(txt, c)) {
                c += dir;
            }
            el.innerHTML = txt.substr(0, c);
            w = el.offsetWidth;
            if (dir < 0) {
                if ((w <= desWidth) || (w <= 0) || (c === 0)) {
                    break;
                }
            }
            else if ((desWidth <= w) || (conWidth <= w) || (c === txt.length)) {
                break;
            }
            c += dir;
        }
    }
    ret.index = c;
    ret.width = w;
}
function getSpaceWidth(el, h) {
    var _a;
    const container = document.createElement("div");
    container.style.display = "block";
    container.style.position = "absolute";
    container.style.bottom = "0";
    container.style.right = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.visibility = "hidden";
    container.style.overflow = "hidden";
    const space = document.createElement("span");
    space.style.fontSize = "2000px";
    space.innerHTML = "&nbsp;";
    container.appendChild(space);
    el.appendChild(container);
    const dims = space.getBoundingClientRect();
    (_a = container.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(container);
    const spaceRatio = dims.height / dims.width;
    return (h / spaceRatio);
}
function getElementsList(elements) {
    if (!elements) {
        return [];
    }
    if (typeof elements === "string") {
        return [...document.querySelectorAll(elements)];
    }
    if ("tagName" in elements && "querySelectorAll" in elements) {
        return [elements];
    }
    return elements;
}
function preprocessCJ(text) {
    if (text.match(/\u200B/g) || !text.match(/(\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han})/ug)) {
        return [text, false];
    }
    const kana = "あアいイうウえエおオかカきキくクけケこコさサしシすスせセそソたタちチつツてテとトなナにニぬヌねネのノはハひヒふフへヘほホまマみミむムめメもモやヤゆユよヨらラりリるルれレろロわワをヲんンがガぎギぐグげゲごゴざザじジずズぜゼぞゾだダぢヂづヅでデどドばバびビぶブべベぼボぱパぴピぷプぺペぽポ";
    const cj = `\\p{Script=Han}${kana}`;
    const smallKana = "ぁぃぅぇぉァィゥェォっゃゅょゎゕゖッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿㇷ゚ー・゠ヽヾゝゞ々〻\u3099-\u309e";
    const inseparable = "—…‥";
    const openingBracket = "‘“（〔［｛〈《「『【｟〘〖«〝";
    const closingBracket = "’”）〕］｝〉》」』】｠〙〗»〟";
    const hyphens = "‐〜゠–";
    const puncts = "！？‼⁇⁈⁉・：；。．、，";
    const notBefore = smallKana + inseparable + closingBracket + hyphens + puncts;
    const notAfter = openingBracket;
    const ascIINonSpace = "\x21-\x7E";
    text = text.replace(new RegExp(`([${cj}${notBefore}])([^${notBefore}])`, "ug"), "$1\u200B$2");
    text = text.replace(new RegExp(`([${ascIINonSpace}])([${cj}${notAfter}])`, "ug"), "$1\u200B$2");
    return [text, true];
}
function balanceText(elements) {
    forEach(getElementsList(elements), (el) => {
        const maxTextWidth = 5000;
        removeTags(el);
        const oldWS = el.style.whiteSpace;
        const oldFloat = el.style.float;
        const oldDisplay = el.style.display;
        const oldPosition = el.style.position;
        const oldLH = el.style.lineHeight;
        el.style.lineHeight = "normal";
        const containerWidth = el.offsetWidth;
        const containerHeight = el.offsetHeight;
        el.style.whiteSpace = "nowrap";
        el.style.float = "none";
        el.style.display = "inline";
        el.style.position = "static";
        let nowrapWidth = el.offsetWidth;
        const nowrapHeight = el.offsetHeight;
        const spaceWidth = ((oldWS === "pre-wrap") ? 0 : getSpaceWidth(el, nowrapHeight));
        if (containerWidth > 0 &&
            nowrapWidth > containerWidth &&
            nowrapWidth < maxTextWidth) {
            let remainingText = el.innerHTML;
            let newText = "";
            let lineText = "";
            const shouldJustify = isJustified(el);
            const totLines = Math.round(containerHeight / nowrapHeight);
            let remLines = totLines;
            let lineCharOffset = 0;
            let preprocessed = false;
            [remainingText, preprocessed] = preprocessCJ(remainingText);
            let desiredWidth, guessIndex, le, ge, splitIndex, isHyphen, isSoftHyphen, isZWS;
            while (remLines > 1) {
                breakMatches = null;
                calcNoWrapOffsetsForLine(el, oldWS, lineCharOffset);
                desiredWidth = Math.round((nowrapWidth + spaceWidth) / remLines - spaceWidth);
                if (desiredWidth > containerWidth) {
                    remLines++;
                    desiredWidth = Math.round((nowrapWidth + spaceWidth) / remLines - spaceWidth);
                }
                guessIndex = Math.round((remainingText.length + 1) / remLines) - 1;
                le = new NextWS_params();
                findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);
                ge = new NextWS_params();
                guessIndex = le.index;
                findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, +1, guessIndex, ge);
                le.reset();
                guessIndex = ge.index;
                findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);
                if (le.index === 0) {
                    splitIndex = ge.index;
                }
                else if ((containerWidth < ge.width) || (le.index === ge.index)) {
                    splitIndex = le.index;
                }
                else {
                    splitIndex = ((Math.abs(desiredWidth - le.width) < Math.abs(ge.width - desiredWidth))
                        ? le.index
                        : ge.index);
                }
                lineText = remainingText.substr(0, splitIndex).replace(/\s$/, "");
                isSoftHyphen = Boolean(lineText.match(/\u00ad$/));
                if (isSoftHyphen) {
                    lineText = lineText.replace(/\u00ad$/, '<span data-owner="balance-text-softhyphen">-</span>');
                }
                if (shouldJustify) {
                    newText += justify(el, lineText, containerWidth);
                }
                else {
                    newText += lineText;
                    isHyphen = isSoftHyphen || Boolean(lineText.match(/(-|\u2014|\u2013)$/));
                    isZWS = Boolean(lineText.match(/\u200B$/));
                    let newLineBreak = '<br data-owner="balance-text" />';
                    if (isHyphen) {
                        newLineBreak = '<br data-owner="balance-text-hyphen" />';
                    }
                    else if (isZWS) {
                        newLineBreak = '<br data-owner="balance-text-zws" />';
                    }
                    newText += newLineBreak;
                }
                remainingText = remainingText.substr(splitIndex);
                lineCharOffset = splitIndex;
                remLines--;
                el.innerHTML = remainingText;
                nowrapWidth = el.offsetWidth;
                if (remLines < 2 && el.offsetWidth > containerWidth) {
                    remLines++;
                }
            }
            if (preprocessed) {
                newText = newText.replace(/\u200B/g, "");
                remainingText = remainingText.replace(/\u200B/g, "");
            }
            if (shouldJustify) {
                el.innerHTML = newText + justify(el, remainingText, containerWidth);
            }
            else {
                el.innerHTML = newText + remainingText;
            }
        }
        el.style.whiteSpace = oldWS;
        el.style.float = oldFloat;
        el.style.display = oldDisplay;
        el.style.position = oldPosition;
        el.style.lineHeight = oldLH;
    });
}
function updateWatched() {
    const selectors = watching.sel.join(",");
    const selectedElements = getElementsList(selectors);
    const elements = Array.prototype.concat.apply(watching.el, selectedElements);
    balanceText(elements);
}
function initHandlers() {
    if (handlersInitialized) {
        return;
    }
    ready(updateWatched);
    window.addEventListener("load", updateWatched);
    window.addEventListener("resize", debounce(updateWatched, 100));
    handlersInitialized = true;
}
function balanceTextAndWatch(elements) {
    if (typeof elements === "string") {
        watching.sel.push(elements);
    }
    else {
        forEach(getElementsList(elements), (el) => {
            watching.el.push(el);
        });
    }
    initHandlers();
    updateWatched();
}
function unwatch(elements) {
    if (typeof elements === "string") {
        watching.sel = watching.sel.filter(el => el !== elements);
    }
    else {
        const elementsList = getElementsList(elements);
        watching.el = watching.el.filter(el => elementsList.indexOf(el) === -1);
    }
}
function polyfill() {
    if (polyfilled) {
        return;
    }
    watching.sel.push(".balance-text");
    initHandlers();
    polyfilled = true;
}
let publicInterface = function (elements, options) {
    if (!elements) {
        polyfill();
    }
    else if (options && options.watch === true) {
        balanceTextAndWatch(elements);
    }
    else if (options && options.watch === false) {
        unwatch(elements);
    }
    else {
        balanceText(elements);
    }
};
if (hasTextWrap()) {
    publicInterface = noop;
}
exports.default = publicInterface;
//# sourceMappingURL=balanceText.js.map