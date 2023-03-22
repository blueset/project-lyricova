/**
 * Marcocos (https://www.andreburnier.com/project/marcacos)
 * @author ANDRÉ BURNIER - www.andreburnier.com, @burnier, 2020
 * Modified by Eana Hufwe for Project Lyricova
 */

import Matter from "matter-js";
import type { Body } from "matter-js";
import MatterAttractors from "matter-attractors";
import p5 from "p5";
import { ScreensaverProps } from "../../utils/screensaverProps";
import { useEffect } from "react";
import classes from "./Marcacos.module.scss";

const { Engine, World, Bodies, Runner } = Matter;

Matter.use(MatterAttractors);
MatterAttractors.Attractors.gravityConstant = 0.5;

const enBase =
  "etonaishrldumygwfc,.IbpvkA‘’TW”“SEB?-jLVO!CP:zYF—NMDHRxU();GJ@=…{q/";
const jaBase =
  "いのなてたもにかるられでをっうしだはとくがまんりこけそよえき僕すつ、どー君さあわ見歌世？」せ何「界じめ日ち一イ出人ゃク生来今みボ声ンば言ろロラ夢無！明誰時タt。s気（）分げおず知間へ・空ね思や終届想中全遠ッ色y音心…トょ上g消スカキ前私自びドミ手意ル目ほ忘ア事ハ未べ続マシ葉待リぶ変度ひ向コ回ぐ味願む笑泣大合聞メノサ先存在楽止夜方ダ感光テゆ望残フモ実響現バ過良込足少唄";
const zhBase =
  "的我是一不在你了就那到有也吧，這能出都想歌要世人啊來「」無只下界著如自而去呢以會中明好这之？音天此然上唱起為道地事所看着心聲樣什時麼。来得己知前將個已何向嗎與s感像過！生定直意法被声会为全望未開次因沒样同最空…大身方可即現見光話算說變消但對切情没般於成後个相夢无們很和使见回色經始點子多讓做再现失物裡連传又面今旋忘間存從用思正达等啦过遠果雖些終給们西實永白義打星停";

type ContextProps = ScreensaverProps & {
  onNewVerse?: (entryId: number) => void;
};

const buildContext =
  ({ entries, verses, onNewVerse }: ContextProps) =>
  (sketch: p5) => {
    verses = verses.filter(
      (v) =>
        v.text
          .split("\n")
          .map((l) => l.trim())
          .filter((v) => v).length > 1
    );
    const verseLines = verses.map((v) =>
      v.text
        .replace(/——/g, "⸺")
        .replace(/\p{Zs}/gu, " ")
        .split("\n")
        .map((l) => l.trim())
        .filter((v) => v)
    );

    let font: p5.Font;
    let engine: Matter.Engine;
    let mouse: Mouse;
    const letters: Letter[] = [];
    let gravity: Body;
    let verse: Verse = null;
    let typeSize: number;
    let border: number;
    let verseIndex = -1;
    let lineIndex = 0;
    // let mobile;
    const debug = false;
    // const debug = true;
    let clrBg: p5.Color, clrChar1: p5.Color, clrChar2: p5.Color;

    // Workaround of p5.js treating glyph ID 10 (C) as linebreak
    let id10: RegExp;
    let id10Replace: string;

    sketch.windowResized = () => {
      sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
      Matter.Body.setPosition(
        gravity,
        Matter.Vector.create(sketch.width * 0.5, sketch.height * 0.5)
      );
    };

    function nextVerseLine(): void {
      if (verseIndex < 0 || lineIndex + 1 >= verseLines[verseIndex].length) {
        verseIndex = (verseIndex + 1) % verseLines.length;
        onNewVerse?.(verses[verseIndex].entryId);
        lineIndex = -1;
      }
      lineIndex++;
      const text = verseLines[verseIndex][lineIndex];
      if (!text.trim()) return nextVerseLine();
      verse = new Verse(text);
    }

    function arrayMove<T>(arr: T[], old_index: number, new_index: number) {
      while (old_index < 0) {
        old_index += arr.length;
      }
      while (new_index < 0) {
        new_index += arr.length;
      }
      if (new_index >= arr.length) {
        let k = new_index - arr.length + 1;
        while (k--) {
          arr.push(undefined);
        }
      }
      arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    }

    function checkPos(body: Body, b: number) {
      if (
        body.position.x > sketch.width - b ||
        body.position.x < b ||
        body.position.y > sketch.height - b ||
        body.position.y < b
      )
        return true;
      else return false;
    }

    sketch.preload = () => {
      font = sketch.loadFont("/fonts/marcacosSans.ttf");
    };

    sketch.setup = () => {
      // mouse = sketch.createVector(0, 0);
      const div = document.getElementById("p5-sketch");
      const cnv = sketch.createCanvas(div.offsetWidth, div.offsetHeight);
      // div.style.setProperty("height", sketch.height + "px", "important");

      // mobile = sketch.width < sketch.height
      clrBg = sketch.color("#00171F");
      clrChar1 = sketch.color(255, 40);
      clrChar2 = sketch.color(255);

      typeSize = sketch.max(sketch.width, sketch.height) * 0.05;
      border = sketch.min(sketch.width, sketch.height) * 0.05;

      engine = Engine.create();
      Runner.run(engine);
      engine.gravity.x = 0;
      engine.gravity.y = 0;

      gravity = Bodies.circle(sketch.width / 2, sketch.height / 2, 0, {
        isStatic: true,
        plugin: {
          attractors: [
            (bodyA: Body, bodyB: Body) => {
              if (checkPos(bodyB, border))
                return {
                  x: (bodyA.position.x - bodyB.position.x) * 2e-6,
                  y: (bodyA.position.y - bodyB.position.y) * 2e-6,
                };
            },
          ],
        },
      });

      World.add(engine.world, gravity);
      mouse = new Mouse(20);

      sketch.textFont(font);

      id10 = new RegExp(
        String.fromCharCode(font.font.glyphs.glyphs[10].unicode),
        "g"
      );
      const targetAdvWdth = font.font.glyphs.glyphs[10].advanceWidth;
      id10Replace = Object.values(font.font.glyphs.glyphs)
        .filter(
          (g: { unicode: number }) =>
            g.unicode != font.font.glyphs.glyphs[10].unicode
        )
        .map<[number, string]>(
          (g: { advanceWidth: number; unicode: number }) => [
            Math.abs(g.advanceWidth - targetAdvWdth),
            String.fromCharCode(g.unicode),
          ]
        )
        .sort()[0][1];

      let alphabet = "";
      if (verses.some((v) => v.language.startsWith("en"))) alphabet += enBase;
      if (verses.some((v) => v.language.startsWith("ja"))) alphabet += jaBase;
      if (verses.some((v) => v.language.startsWith("zh"))) alphabet += zhBase;

      const nChar = 180;
      for (let i = 0; i < nChar; i++) {
        const c = alphabet[sketch.floor(sketch.random(1) * alphabet.length)];
        letters.push(
          new Letter(
            c,
            typeSize,
            sketch.random(sketch.width),
            sketch.random(sketch.height)
          )
        );
      }

      startLine();
    };

    function startLine() {
      nextVerseLine();
      setTimeout(endLine, 5000);
    }

    function endLine() {
      verse?.disable();
      setTimeout(startLine, 2000);
    }

    sketch.draw = () => {
      sketch.background(clrBg);
      mouse.att();
      for (let i = 0; i < letters.length; i++) {
        letters[i].att();
        letters[i].draw();
      }
      if (debug) {
        sketch.noStroke();
        sketch.fill(255, 0, 0);
        sketch.circle(gravity.position.x, gravity.position.y, 10);
        mouse.draw();
      }
      // if (debug && frameCount % 200 == 0) console.log(frameRate());
    };

    // sketch.mousePressed = () => {
    //   verse?.disable();
    //   // mobile = false;
    //   nextVerseLine();
    //   return false;
    // };

    // sketch.mouseReleased = () => {
    //   verse?.disable();
    //   verse = null;
    //   return false;
    // };

    // sketch.touchStarted = () => {
    //   if (verse != null) verse.disable();
    //   // mobile = true;
    //   nextVerseLine();
    //   return false;
    // };

    // sketch.touchEnded = () => {
    //   verse.disable();
    //   verse = null;
    //   return false;
    // };

    sketch.touchMoved = () => {
      return false;
    };

    class Letter {
      color: p5.Color;
      char: string;
      size: number;
      box: { x: number; y: number; w: number; h: number };
      free: boolean;
      speed: number;
      body: Body;
      midX: number;
      midY: number;
      posD: Matter.Vector;
      posC: Matter.Vector;

      constructor(l: string, size: number, x: number, y: number) {
        this.color = clrChar1;
        this.char = l;
        this.size = size;
        // Workaround of p5.js treating glyph ID 10 (C) as linebreak
        this.box = font.textBounds(
          this.char.replace(id10, id10Replace),
          0,
          0,
          this.size
        ) as {
          x: number;
          y: number;
          w: number;
          h: number;
        };
        this.free = true;
        this.speed = 0;

        const options = {
          frictionAir: 0.04,
          restitution: 0.3,
          angle: sketch.random(sketch.TWO_PI * 2),
        };

        const w = this.box.w;
        const h = this.box.h;
        this.midX = w * 0.5 + this.box.x;
        this.midY = h * 0.5 - (this.box.y + h);
        this.body = Bodies.rectangle(
          x + this.midX,
          y + this.midY,
          w,
          h,
          options
        );
        Matter.Body.setMass(this.body, 3);
        World.add(engine.world, this.body);
      }

      activate(pos: Matter.Vector, posC: Matter.Vector) {
        this.free = false;
        Matter.Body.setStatic(this.body, true);
        this.posD = pos;
        this.posC = posC;
      }

      disable() {
        this.free = true;
        Matter.Body.setStatic(this.body, false);
        this.speed = 0;
      }

      att() {
        if (!this.free) {
          this.speed = sketch.lerp(this.speed, 1, 0.005);
          const newPos = Matter.Vector.create(
            sketch.lerp(
              this.body.position.x,
              this.posD.x + this.posC.x,
              this.speed
            ),
            sketch.lerp(
              this.body.position.y,
              this.posD.y + this.posC.y,
              this.speed
            )
          );
          const speed = Matter.Vector.sub(newPos, this.body.position);
          const newAng = sketch.lerp(this.body.angle, 0, this.speed);
          const speedA = this.body.angle - newAng;
          Matter.Body.setAngle(this.body, newAng);
          Matter.Body.setPosition(this.body, newPos);
          Matter.Body.setVelocity(this.body, speed);
          Matter.Body.setAngularVelocity(this.body, speedA);
        }
      }

      remove() {
        World.remove(engine.world, this.body);
      }

      draw() {
        if (this.free)
          this.color = sketch.lerpColor(this.color, clrChar1, 0.05);
        else this.color = sketch.lerpColor(this.color, clrChar2, 0.1);

        sketch.push();
        sketch.translate(this.body.position.x, this.body.position.y);
        sketch.rotate(this.body.angle);
        sketch.textSize(this.size);
        sketch.textFont(font);
        sketch.fill(this.color);
        sketch.noStroke();
        sketch.text(this.char, -this.midX, this.midY);
        sketch.pop();

        if (debug) {
          sketch.noFill();
          sketch.stroke(255, 0, 0);
          sketch.beginShape();
          for (let i = 0; i < this.body.vertices.length; i++) {
            sketch.vertex(this.body.vertices[i].x, this.body.vertices[i].y);
          }
          sketch.endShape("close");
        }
      }
    }

    class Verse {
      letters: Letter[];
      pos: Matter.Vector[][];
      text: string;
      nLines: number;
      /** Width of lines */
      w: number[];
      /** Number of letters */
      n: number;

      constructor(text: string) {
        this.letters = [];
        this.pos = [[]];
        this.n = 0;
        this.text = text;
        this.nLines = 0;

        this.w = [0, 0, 0, 0, 0, 0, 0];
        this.pos[this.nLines][this.n] = Matter.Vector.create(0, 0);
        this.createLetters();
      }

      center() {
        let n = 0;
        // let posY;
        // if (mobile) posY = (this.nLines + 1) * typeSize;
        // else posY = sketch.floor(this.nLines * 0.5) * typeSize;
        const posY = sketch.floor(this.nLines * 0.5) * typeSize;
        for (let i = 0; i <= this.nLines; i++) {
          // lines
          const adjustment = -this.w[i] * 0.5;
          for (let j = 0; j < this.pos[i].length; j++) {
            // letters
            const letter =
              this.letters[sketch.min(n, this.letters.length - 1)].box;
            this.pos[i][j].x += adjustment;
            // this.pos[i][j].y -= letter.h * 0.5 - (letter.y + letter.h) + posY;
            this.pos[i][j].y -= letter.h * 0.5 - (letter.y + letter.h) + posY;
            n++;
          }
          n--;
        }
      }

      newLetra(letter: Letter) {
        const wletter = letter.box.x + letter.box.w;
        this.letters.push(letter);
        this.pos[this.nLines][this.n] = Matter.Vector.add(
          this.pos[this.nLines][this.n],
          Matter.Vector.create(wletter * 0.5 + 1, 0)
        );
        // letter.activate(mouse.body.position, this.pos[this.nLines][this.n]);
        letter.activate(
          { x: sketch.width / 2, y: (sketch.height + typeSize) / 2 },
          this.pos[this.nLines][this.n]
        );
        this.pos[this.nLines][this.n + 1] = Matter.Vector.add(
          this.pos[this.nLines][this.n],
          Matter.Vector.create(wletter * 0.5 + 1, 0)
        );
        this.n++;
        this.w[this.nLines] += wletter;
      }

      createLetters() {
        let wLine = 0;
        // const words = this.text.split(/\s/g);
        const words = this.text.split(
          /(?<=[\s\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Han}\p{Po}\p{Pf}\p{Ps}])(?![\p{Pf}\s])/gu
        );
        const space = typeSize * 0.3;
        // console.log("words", words);

        for (let i = 0; i < words.length; i++) {
          sketch.textSize(typeSize);
          sketch.textFont(font);
          // const wWord = sketch.textWidth(words[i].trim());
          // Workaround of p5.js treating glyph ID 10 (C) as linebreak
          const wWord = (
            font.textBounds(
              words[i].trim().replace(id10, id10Replace),
              0,
              0,
              typeSize
            ) as { w: number }
          ).w;
          const nextWLine = wLine + wWord + space;
          // console.log(words[i].trim(), wWord, nextWLine, sketch.width * 0.95);
          let wWordShape = 0;

          if (wLine > 0 && nextWLine > sketch.width * 0.95) {
            // line break
            this.n = 0;
            this.nLines++;
            this.pos[this.nLines] = [];
            this.w[this.nLines] = 0;
            this.pos[this.nLines][this.n] = Matter.Vector.create(
              0,
              typeSize * this.nLines
            );
            wLine = 0;
            // console.log("Line break");
          }

          for (let j = 0; j < words[i].length; j++) {
            const letter = words[i].charAt(j);
            if (letter.match(/\s/gu)) continue;
            let found = false;
            let l: Letter;
            for (let k = 0; k < letters.length; k++) {
              l = letters[k];
              if (!found && letter == l.char && l.free && checkPos(l.body, 0)) {
                found = true;
                this.newLetra(l);
                arrayMove(letters, k, letters.length - 1);
                break;
              }
            }
            if (!found) {
              const a = sketch.random(sketch.TWO_PI);
              const x = sketch.sin(a) * sketch.max(sketch.width, sketch.height);
              const y = sketch.cos(a) * sketch.max(sketch.width, sketch.height);
              l = new Letter(letter, typeSize, x, y);
              letters.push(l);
              this.newLetra(l);
              for (let k = 0; k < letters.length; k++) {
                const l = letters[k];
                if (l.free && checkPos(l.body, 0)) {
                  l.remove();
                  letters.splice(k, 1);
                  found = true;
                  break;
                }
              }
              if (!found) {
                for (let k = 0; k < letters.length; k++) {
                  const l = letters[k];
                  if (l.free) {
                    l.remove();
                    letters.splice(k, 1);
                    break;
                  }
                }
              }
            }
            wWordShape += l.box.w;
          }
          // console.log("wWord", wWord, "wWordShape", wWordShape);
          wLine += wWord;
          if (words[i].match(/\s$/gu)) {
            this.pos[this.nLines][this.n].x += space;
            this.w[this.nLines] += space;
            wLine += space;
          }
        }
        this.center();
      }

      disable() {
        for (let i = 0; i < this.letters.length; i++) {
          this.letters[i].disable();
        }
      }
    }

    class Mouse {
      radius: number;
      body: Body;

      constructor(radius: number) {
        this.radius = radius;
        this.body = Bodies.circle(0, 0, radius, {
          isStatic: true,
          restitution: 1,
        });
        World.add(engine.world, this.body);
      }

      att() {
        const m = Matter.Vector.create(sketch.mouseX, sketch.mouseY);
        const prevPos = Matter.Vector.clone(this.body.position);
        const v = 0.7;
        const newPos = Matter.Vector.create(
          sketch.lerp(this.body.position.x, m.x, v),
          sketch.lerp(this.body.position.y, m.y, v)
        );
        Matter.Body.setPosition(this.body, newPos);
        const vm = Matter.Vector.sub(newPos, prevPos);
        Matter.Body.setVelocity(this.body, vm);
      }

      draw() {
        sketch.noFill();
        sketch.stroke(255, 0, 0);
        sketch.circle(
          this.body.position.x,
          this.body.position.y,
          this.body.circleRadius * 2
        );
      }
    }
  };

// let skch = new p5(p, "p5-sketch");
export const buildSketch = (props: ContextProps) =>
  new p5(buildContext(props), document.getElementById("p5-sketch"));

export default function Marcacos(props: ContextProps) {
  useEffect(() => {
    if (window) {
      const p5Inst = buildSketch(props);
      return () => {
        p5Inst.remove();
      };
    }
  }, [props.verses, props.entries, props.onNewVerse]);
  return <div id="p5-sketch" className={classes.canvas}></div>;
}
