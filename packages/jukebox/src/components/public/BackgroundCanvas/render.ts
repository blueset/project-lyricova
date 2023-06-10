import { Pixel, resizeImage } from "./utils";
import { FBMWaveMethod } from "./fbm-wave";
import { BlurAlbumMethod } from "./blur-album";
import { MontereyWannaBe } from "./monterey-wannabe";

const DEFAULT_VERTEX_SHADER =
  "attribute vec4 a_pos;" + "void main(){" + "gl_Position=a_pos;" + "}";

const EMPTY_128_F32_ARRAY = new Float32Array(128);

const smallestPowOfTwo = (b: number) =>
  Math.max(2, Math.ceil(Math.log2(Math.log2(b))));

export const BUILDIN_RENDER_METHODS = [
  BlurAlbumMethod,
  FBMWaveMethod,
  MontereyWannaBe,
];

/**
 * 对于渲染管线结构
 */
export enum DefineType {
  Float,
  Int,
}

/**
 * 一种背景渲染方式管线结构
 */
export interface BackgroundRenderMethod {
  fragmentShaderCode: string;
  beforeDrawArray?: (this: CanvasBackgroundRender) => void;
  afterDrawArray?: (this: CanvasBackgroundRender) => void;
  label: string;
  value: string;
  description?: string;
  configurableUniforms?: string[];
}

export class CanvasBackgroundRender {
  private disposed = false;
  private gl: WebGLRenderingContext;
  private frameId = 0;
  private createTime = Date.now();
  skipFrameRate = 0;
  private _skipFrameRate = 0;
  private currentRenderMethod: BackgroundRenderMethod;
  private _displaySize = [0, 0];
  private _currentAlbumColorMapColors: Pixel[] = [];
  private _currentAlbumImage: HTMLImageElement;
  private get time() {
    return Date.now() - this.createTime;
  }
  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl");
    if (gl) {
      this.gl = gl;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this._displaySize = [canvas.clientWidth, canvas.clientHeight];
      this.resize();
      this.rebuildVertex();
      this.setRenderMethod(BlurAlbumMethod);
      this.setAlbumColorMap([[0, 0, 0]]);
    } else {
      throw new TypeError(
        "你的网易云不支持 WebGL ！有可能是需要开启 GPU 硬件加速或电脑硬件不支持！"
      );
    }
  }
  setRenderMethod(renderMethod: BackgroundRenderMethod) {
    this.resetTime();
    this.rebuildShader(renderMethod.fragmentShaderCode);
    this.rebuildProgram();
    if (this._currentAlbumColorMapColors.length > 0)
      this.setAlbumColorMap(this._currentAlbumColorMapColors);
    if (this._currentAlbumImage) this.setAlbumImage(this._currentAlbumImage);
    this.currentRenderMethod = renderMethod;
  }
  resetTime() {
    this.createTime = Date.now();
  }
  resize(
    width = this.canvas.width,
    height = this.canvas.height,
    renderScale = 1
  ) {
    const canvas = this.canvas;
    canvas.width = width * renderScale;
    canvas.height = height * renderScale;
    this._displaySize = [width, height];
    this.gl.viewport(0, 0, canvas.width, canvas.height);
  }
  onUpdateAndDraw() {
    this.updateUniforms();

    this.currentRenderMethod?.beforeDrawArray?.call(this);

    const gl = this.gl;
    // gl.clearColor(0, 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.currentRenderMethod?.afterDrawArray?.call(this);
  }
  shouldRedraw() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.onFrame);
    }
  }
  dispose() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
    this.disposed = true;
  }
  private readonly onFrame = () => {
    if (!this.disposed) {
      this.frameId = 0;
      if (this._skipFrameRate > 0) {
        this._skipFrameRate--;
        this.shouldRedraw();
      } else {
        this._skipFrameRate = this.skipFrameRate;
        this.onUpdateAndDraw();
      }
    }
  };
  private vertexBuffer: WebGLBuffer;
  private rebuildVertex() {
    const gl = this.gl;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);

    const buffer = gl.createBuffer();
    if (!buffer) throw new TypeError("顶点缓冲区创建失败！");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );

    this.vertexBuffer = buffer;
  }
  private vshader: WebGLShader;
  private fshader: WebGLShader;
  private rebuildShader(
    fragmentSource: string,
    vertexSource = DEFAULT_VERTEX_SHADER
  ) {
    const gl = this.gl;
    if (this.vshader) gl.deleteShader(this.vshader);
    if (this.fshader) gl.deleteShader(this.fshader);

    const vshader = gl.createShader(gl.VERTEX_SHADER);
    if (!vshader) throw new TypeError("顶点着色器创建失败！");

    gl.shaderSource(vshader, vertexSource);
    gl.compileShader(vshader);

    if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(vshader) || "未知编译错误";
      throw new TypeError("顶点着色器编译失败：\n\n" + error);
    }

    const fshader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fshader) throw new TypeError("片段着色器创建失败！");

    gl.shaderSource(fshader, fragmentSource);
    gl.compileShader(fshader);

    if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(fshader) || "未知编译错误";
      throw new TypeError("片段着色器编译失败：\n\n" + error);
    }

    this.vshader = vshader;
    this.fshader = fshader;
  }
  private program: WebGLProgram;
  private rebuildProgram() {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);

    const program = gl.createProgram();

    if (!program) throw new TypeError("渲染程序句柄创建失败！");

    gl.attachShader(program, this.vshader);
    gl.attachShader(program, this.fshader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) || "未知链接错误";
      throw new TypeError(`渲染管线程序链接错误：${info}`);
    }

    gl.useProgram(program);

    const posLoc = gl.getAttribLocation(program, "a_pos");
    if (posLoc === -1)
      throw new TypeError("无法找到渲染程序顶点着色器中的 a_pos 属性！");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.program = program;
  }
  private albumColorMapSize = 0;
  private albumColorMapTex: WebGLTexture;
  setAlbumColorMap(colorMap: Pixel[]) {
    this._currentAlbumColorMapColors = colorMap;
    const tmp = [...colorMap];
    // shuffleArray(tmp);
    const size = Math.pow(2, smallestPowOfTwo(tmp.length));
    const pixelsData: number[] = [];

    let ci = 0;
    for (let i = 0; i < size * size; i++) {
      const p = tmp[i % tmp.length];
      pixelsData.push(p[0], p[1], p[2], 0xff);
      ci++;
      if (ci >= tmp.length) {
        // shuffleArray(tmp);
        ci = 0;
      }
    }

    console.log(
      "已创建颜色数量为",
      tmp.length,
      "色图尺寸为",
      size,
      "像素数量为",
      pixelsData.length / 4,
      "的材质",
      pixelsData
    );

    this.albumColorMapSize = size;
    this.albumColorMapTex = this.rebuildTextureFromPixels(
      this.gl.TEXTURE1,
      this.albumColorMapSize,
      new Uint8Array(pixelsData),
      this.albumColorMapTex
    );
    this.updateAllUniforms();
  }
  private albumImageSize = [0, 0];
  private albumImageTex: WebGLTexture;
  setAlbumImage(image: HTMLImageElement) {
    this._currentAlbumImage = image;
    this.albumImageSize = [image.width, image.height];
    const fitImageSize = Math.min(
      this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),
      Math.pow(2, Math.round(Math.log2(Math.max(image.width, image.height))))
    );
    const resized = resizeImage(image, fitImageSize, fitImageSize);
    console.log(
      "设置了大小为",
      image.width,
      "x",
      image.height,
      "->",
      resized.width,
      "x",
      resized.height,
      "的专辑图片"
    );
    this.albumImageTex = this.rebuildTextureFromPixels(
      this.gl.TEXTURE2,
      fitImageSize,
      resized.data,
      this.albumImageTex
    );
    this.updateAllUniforms();
  }
  private rebuildTextureFromImage(
    id: GLenum,
    image: HTMLImageElement,
    existTexture?: WebGLTexture
  ) {
    const gl = this.gl;
    if (existTexture) gl.deleteTexture(existTexture);
    const tex = gl.createTexture();
    if (!tex) throw new TypeError("材质句柄创建失败！");
    gl.activeTexture(id);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return tex;
  }
  private rebuildTextureFromPixels(
    id: GLenum,
    size: number,
    pixelsData: Uint8Array | Uint8ClampedArray,
    existTexture?: WebGLTexture
  ) {
    if (!Number.isInteger(Math.log2(size)))
      throw new TypeError("材质大小不是二的次幂！");
    const gl = this.gl;
    if (existTexture) gl.deleteTexture(existTexture);
    const tex = gl.createTexture();
    if (!tex) throw new TypeError("材质句柄创建失败！");
    gl.activeTexture(id);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      size,
      size,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixelsData
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }
  private updateAllUniforms() {
    this.updateUniforms();
  }
  private updateUniforms() {
    const gl = this.gl;
    // 着色器开始运行到现在的时间，单位秒
    {
      const loc = gl.getUniformLocation(this.program, "time");
      if (loc) gl.uniform1f(loc, this.time / 1000);
    }
    // 绘制画板的大小，单位像素
    {
      const loc = gl.getUniformLocation(this.program, "resolution");
      if (loc) gl.uniform2f(loc, this._displaySize[0], this._displaySize[1]);
    }
    // 特征色表图的分辨率，单位像素
    {
      const loc = gl.getUniformLocation(this.program, "albumColorMapRes");
      if (loc)
        gl.uniform2f(loc, this.albumColorMapSize, this.albumColorMapSize);
    }
    // 专辑图片的大小，单位像素
    {
      const loc = gl.getUniformLocation(this.program, "albumImageRes");
      if (loc)
        gl.uniform2f(loc, this.albumImageSize[0], this.albumImageSize[1]);
    }
    // 从专辑图片中取色得出的特征色表图
    {
      const loc = gl.getUniformLocation(this.program, "albumColorMap");
      if (loc) gl.uniform1i(loc, 1);
    }
    // 专辑图片
    {
      const loc = gl.getUniformLocation(this.program, "albumImage");
      if (loc) gl.uniform1i(loc, 2);
    }
    // TODO: 当前音频的波形数据缓冲区
    {
      const loc = gl.getUniformLocation(this.program, "audioWaveBuffer");
      if (loc) gl.uniform1fv(loc, EMPTY_128_F32_ARRAY);
    }
    // TODO: 当前音频的可视化数据缓冲区
    {
      const loc = gl.getUniformLocation(this.program, "audioFFTBuffer");
      if (loc) gl.uniform1fv(loc, EMPTY_128_F32_ARRAY);
    }
  }
}
