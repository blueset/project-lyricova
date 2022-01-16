/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 * Copyright (c) 2020 Eana Hufwe. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */

/**
 * balancetextCJSVG.js
 *
 * Author: Randy Edmunds
 * Author: Eana Hufwe
 */

/*
 * Copyright (c) 2007-2009 unscriptable.com and John M. Hann
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the “Software”), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * Except as contained in this notice, the name(s) of the above
 * copyright holders (unscriptable.com and John M. Hann) shall not be
 * used in advertising or otherwise to promote the sale, use or other
 * dealings in this Software without prior written authorization.
 *
 * http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
 *
 * Tested to work on (lowest browser):
 * - Sarari 4
 * - Chrome 16
 * - Firefox 10
 * - IE 9
 * - Edge 13
 */


interface Range { start: number; end: number; }

/**
 * Line breaking global vars
 */
let breakMatches: number[] | null;

/**
 * Selectors and elements to watch;
 * calling $.balanceText(elements) adds "elements" to this list.
 */
const watching: {
  sel: string[];
  el: HTMLElement[];
} = {
  sel: [], // default class to watch
  el: [],
};

/**
 * Debounces a function over a threshold
 *
 * @param {Function} func      - The function to debounce
 * @param {number}   threshold - time in ms
 * @param args
 * @return {Function} Debounced function
 */
function debounce<Args extends unknown[]>(func: (...args: Args) => unknown, wait: number) {
  let timeout: number | undefined = undefined;

  return function executedFunction(...args: Args) {
    const later = () => {
      window.clearTimeout(timeout);
      func(...args);
    };

    window.clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Object for tracking next whitespace params
 */
// eslint-disable-next-line camelcase
class NextWS_params {
  public index = 0;
  public width = 0;

  constructor() {
    this.reset();
  }

  reset = () => {
    this.index = 0;
    this.width = 0;
  };
}

/**
 * Strip balance-text tags from an element inserted in previous run
 *
 * @param {Node} el - the element to act on
 */
function removeTags(el: SVGTextElement) {
  // Remove soft-hyphen breaks
  const lines = el.querySelectorAll<SVGTSpanElement>("tspan[data-owner^=\"balance-text-line\"]");
  lines.forEach((line) => {
    line.outerHTML = line.innerHTML;
  });

  // Restore hyphens inserted for soft-hyphens
  const spans = el.querySelectorAll<SVGTSpanElement>("tspan[data-owner=\"balance-text-softhyphen\"]");
  spans.forEach((span) => {
    span.outerHTML = "\u00ad";
  });
}

/**
 * Add whitespace after words in text to justify the string to
 * the specified size.
 * @param {Node}    el       - the element to justify
 * @param {string}  txt      - text string
 * @param {number}  conWidth - container width
 * @param {string}  x        - x coordinate of the line
 * @param {string}  dy       - height of the line
 * @return {string} Justified text
 */
function justify(el: SVGTextElement, txt: string, conWidth: number, x?: string, dy?: number): string {
  txt = txt.trim();
  const words = txt.split(" ").length;
  txt = `${txt}`;

  // if we don't have at least 2 words, no need to justify.
  if (words < 2) {
    return txt;
  }

  // Find width of text in the DOM
  const tmp = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  tmp.innerHTML = txt;
  el.appendChild(tmp);
  const size = tmp.getComputedTextLength();
  tmp.parentNode?.removeChild(tmp);

  // Figure out our word spacing and return the element
  const wordSpacing = Math.floor((conWidth - size) / (words - 1));
  tmp.style.wordSpacing = `${wordSpacing}px`;
  tmp.setAttribute("data-owner", "balance-text-line-justify");
  if (x != null && dy != null) {
    tmp.setAttribute("x", x);
    tmp.setAttribute("dy", `${dy}`);
  }

  return tmp.outerHTML;
}

/**
 * Returns true iff char at index is a break char outside of HTML < > tags.
 * Break char can be: whitespace (except non-breaking-space: u00a0),
 * hypen, emdash (u2014), endash (u2013), or soft-hyphen (u00ad).
 * 
 * For C-J, Zero Width Space (u200B) is also added.
 *
 * @param {string} txt   - the text to check
 * @param {number} index - the index of the character to check
 * @return {boolean}
 */
function isBreakChar(txt: string, index: number): boolean {
  const re = /([^\S\u00a0]|-|\u2014|\u2013|\u00ad|\u200B)(?![^<]*>)/g;
  let match;

  if (!breakMatches) {
    // Only calc break matches once per line
    breakMatches = [];
    match = re.exec(txt);
    while (match !== null) {
      breakMatches.push(match.index);
      match = re.exec(txt);
    }
  }

  return breakMatches.indexOf(index) !== -1;
}

/**
 * In the current implementation, an index is a break
 * opportunity in txt iff it is:
 * - 0 or txt.length
 * - index of a non-whitespace char immediately preceded by a
 *   whitespace, hyphen, soft-hyphen, em-dash, or en-dash char.
 *
 * Thus, it doesn't honour "white-space" or any other Unicode
 * line-breaking classes.)
 *
 * @precondition 0 <= index && index <= txt.length
 *
 * @param {string} txt   - the text to check
 * @param {number} index - the index to check
 * @return {boolean}
 */
function isBreakOpportunity(txt: string, index: number): boolean {
  return ((index === 0) || (index === txt.length) ||
    (isBreakChar(txt, index - 1) && !isBreakChar(txt, index)));
}

interface BreakOpportunity {
  index: number;
  width: number;
}

/**
 * Finds the first break opportunity (@see isBreakOpportunity)
 * in txt that's both after-or-equal-to index c in the direction dir
 * and resulting in line width equal to or past clamp(desWidth,
 * 0, conWidth) in direction dir.  Sets ret.index and ret.width
 * to the corresponding index and line width (from the start of
 * txt to ret.index).
 *
 * @param {Node}    el       - element
 * @param {string}  txt      - text string
 * @param {number}  conWidth - container width
 * @param {number}  desWidth - desired width
 * @param {number}  dir      - direction (-1 or +1)
 * @param {number}  c        - char index (0 <= c && c <= txt.length)
 * @param {Object}  ret      - return {index: {number}, width: {number}} of previous/next break
 */
function findBreakOpportunity(el: SVGTextElement, txt: string, conWidth: number, desWidth: number, dir: number, c: number, ret: BreakOpportunity) {
  let w = 0;

  if (txt && typeof txt === "string") {
    for (; ;) {
      while (!isBreakOpportunity(txt, c)) {
        c += dir;
      }

      el.innerHTML = txt.substr(0, c);
      w = el.getComputedTextLength();

      if (dir < 0) {
        if ((w <= desWidth) || (w <= 0) || (c === 0)) {
          break;
        }
      } else if ((desWidth <= w) || (conWidth <= w) || (c === txt.length)) {
        break;
      }

      c += dir;
    }
  }
  ret.index = c;
  ret.width = w;
}
const kana = "あアいイうウえエおオかカきキくクけケこコさサしシすスせセそソたタちチつツてテとトなナにニぬヌねネのノはハひヒふフへヘほホまマみミむムめメもモやヤゆユよヨらラりリるルれレろロわワをヲんンがガぎギぐグげゲごゴざザじジずズぜゼぞゾだダぢヂづヅでデどドばバびビぶブべベぼボぱパぴピぷプぺペぽポ";
const smallKana = "ぁぃぅぇぉァィゥェォっゃゅょゎゕゖッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿㇷ゚ー・゠ヽヾゝゞ々〻\u3099-\u309e";
const inseparable = "—…‥";
const openingBracket = "‘“（〔［｛〈《「『【｟〘〖«〝";
const closingBracket = "’”）〕］｝〉》」』】｠〙〗»〟";
const hyphens = "‐〜゠–";
const puncts = "！？‼⁇⁈⁉・：；。．、，";
export const cj = `\\p{Script=Han}${kana}`;
export const notBefore = smallKana + inseparable + closingBracket + hyphens + puncts;
export const notAfter = openingBracket;
export const ascIINonSpace = "\x21-\x7E";

/**
 * Add zero-width space (ZWS, \u200B) to all break chances if there is Chinese
 * or Japanese text in the string and no ZWS already presented in the string.
 * @param text Text to process
 * @returns Processed text and if the text is processed.
 */
function preprocessCJ(text: string): [string, boolean] {
  if (text.match(/\u200B/g) || !text.match(/(\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Han})/ug)) {
    return [text, false];
  }
  // eslint-disable-next-line no-misleading-character-class
  text = text.replace(new RegExp(`([${cj}${notBefore}])([^${notBefore}])`, "ug"), "$1\u200B$2");
  text = text.replace(new RegExp(`([${ascIINonSpace}])([${cj}${notAfter}])`, "ug"), "$1\u200B$2");
  return [text, true];
}

/**
 *  When a browser has native support for the text-wrap property,
 * the text balanceText plugin will let the browser handle it natively,
 * otherwise it will apply its own text balancing code.
 *
 * @param elements - the element to balance
 * @param lineWidth - Maximum width of lines
 * @param lineHeightFactor - Multiples of line height (1 by default)
 * @param shouldJustify - Justify text (not working on CJ text) (false by default)
 */
export function balanceText(el: SVGTextElement, containerWidth: number, lineHeightFactor: number = 1, shouldJustify: boolean = false): void {
  // In a lower level language, this algorithm takes time
  // comparable to normal text layout other than the fact
  // that we do two passes instead of one, so we should
  // be able to do without this limit.
  const maxTextWidth = 5000;

  removeTags(el);

  const lineHeight = parseFloat(window.getComputedStyle(el).fontSize) * lineHeightFactor;

  let nowrapWidth = el.getComputedTextLength();
  const xCoord = el.x.baseVal.getItem(0).valueAsString;
  const positioning = `dy="${lineHeight}" x="${xCoord}"`;

  // An estimate of the average line width reduction due
  // to trimming trailing space that we expect over all
  // lines other than the last.

  if (containerWidth > 0 &&               // prevent divide by zero
    nowrapWidth > containerWidth && // text is more than 1 line
    nowrapWidth < maxTextWidth) {   // text is less than arbitrary limit (make this a param?)
    let remainingText = el.innerHTML;
    let newText = "";
    let lineText = "";
    const totLines = Math.ceil(nowrapWidth / containerWidth);
    let remLines = totLines;

    // Run C-J preprocess
    let preprocessed = false;
    [remainingText, preprocessed] = preprocessCJ(remainingText);

    // loop vars
    let desiredWidth, guessIndex, le, ge, splitIndex, isHyphen, isSoftHyphen, isZWS;

    // Determine where to break:
    while (remLines > 1) {
      // clear whitespace match cache for each line
      breakMatches = null;

      // Fix C-J custom breakpoints may resulting desiredWidth larger than container width.
      // This is caused by totLines might not always be equivalent to the
      // resulting length, as browsers do not take in consideration of custom line break chances.
      desiredWidth = Math.round((nowrapWidth) / remLines);
      if (desiredWidth > containerWidth) {
        remLines++;
        desiredWidth = Math.round((nowrapWidth) / remLines);
      }

      // Guessed char index
      guessIndex = Math.round((remainingText.length + 1) / remLines) - 1;

      le = new NextWS_params();

      // Find a breaking space somewhere before (or equal to) desired width,
      // not necessarily the closest to the desired width.
      findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

      // Find first breaking char after (or equal to) desired width.
      ge = new NextWS_params();
      guessIndex = le.index;
      findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, +1, guessIndex, ge);

      // Find first breaking char before (or equal to) desired width.
      le.reset();
      guessIndex = ge.index;
      findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

      // Find closest string to desired length
      if (le.index === 0) {
        splitIndex = ge.index;
      } else if ((containerWidth < ge.width) || (le.index === ge.index)) {
        splitIndex = le.index;
      } else {
        splitIndex = ((Math.abs(desiredWidth - le.width) < Math.abs(ge.width - desiredWidth))
          ? le.index
          : ge.index);
      }

      // Break string
      lineText = remainingText.substr(0, splitIndex).replace(/\s$/, "");

      isSoftHyphen = Boolean(lineText.match(/\u00ad$/));
      if (isSoftHyphen) {
        // Replace soft-hyphen causing break with explicit hyphen
        lineText = lineText.replace(/\u00ad$/, "<tspan data-owner=\"balance-text-softhyphen\">-</tspan>");
      }

      if (shouldJustify) {
        if (newText.length > 0) {
          newText += justify(el, lineText, containerWidth, xCoord, lineHeight);
        } else {
          newText += justify(el, lineText, containerWidth, null, null);
        }
      } else {
        const posAttr = newText.length > 0 ? " " + positioning : "";
        isHyphen = isSoftHyphen || Boolean(lineText.match(/(-|\u2014|\u2013)$/));
        isZWS = Boolean(lineText.match(/\u200B$/));
        let newLineBreak = `<tspan data-owner="balance-text-line"${posAttr}>`;
        if (isHyphen) {
          newLineBreak = `<tspan data-owner="balance-text-line-hyphen"${posAttr}>`;
        } else if (isZWS) {
          newLineBreak = `<tspan data-owner="balance-text-line-zws"${posAttr}>`;
        }
        newText += newLineBreak;
        newText += lineText;
        newText += "</tspan>";
      }
      remainingText = remainingText.substr(splitIndex);

      // update counters
      remLines--;
      el.innerHTML = remainingText;
      nowrapWidth = el.getComputedTextLength();

      // Update remaining lines if remaining text is longer than container width.
      if (remLines < 2 && nowrapWidth > containerWidth) {
        remLines++;
      }
    }

    // Remove added ZWSs.
    if (preprocessed) {
      newText = newText.replace(/\u200B/g, "");
      remainingText = remainingText.replace(/\u200B/g, "");
    }
    const posAttr = newText.length > 0 ? " " + positioning : "";
    el.innerHTML = newText + `<tspan data-owner="balance-text-line"${posAttr}>${remainingText}</tspan>`;
  }
}