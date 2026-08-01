//! `wasm-bindgen` bindings that expose [`crate::shaping`] to JavaScript.
//!
//! Shape requests/results cross the JS boundary as plain JSON-like objects
//! (via `serde-wasm-bindgen`) so the TypeScript wrapper in `ts/` can describe
//! them with ordinary structural types instead of wrapper classes.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::layout::{self, ParagraphRequest};
use crate::outline::{self, GlyphOutlineRequest};
use crate::shaping::{self, FontId, FontRegistry, ShapeRequest};

/// Runs once when the wasm module is instantiated; forwards Rust panics to
/// `console.error` with a real stack trace instead of an opaque trap.
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

fn to_js_error<E: std::fmt::Display>(err: E) -> JsValue {
    js_sys::Error::new(&err.to_string()).into()
}

/// Deserializes a request object, treating own-enumerable keys whose value is
/// JS `undefined` as if the key were absent.
///
/// `serde-wasm-bindgen` decodes a *present* `undefined` as a unit value, which
/// fails `#[serde(default)]` enum/`Option` fields - e.g. `{ baseDirection:
/// undefined }` throws `invalid type: unit value, expected enum TextDirection`.
/// That is a common shape for JS/TS callers who build a request by spreading
/// optional fields, so it is normalized here (an *absent* key or an explicit
/// `null` already worked and are left untouched).
fn deserialize_request<T: serde::de::DeserializeOwned>(request: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(strip_undefined_keys(request)).map_err(to_js_error)
}

/// Returns a shallow copy of a plain object with own keys whose value is
/// `undefined` removed; non-objects (and arrays) are returned unchanged.
fn strip_undefined_keys(value: JsValue) -> JsValue {
    if !value.is_object() || js_sys::Array::is_array(&value) {
        return value;
    }
    let obj: js_sys::Object = value.unchecked_into();
    let out = js_sys::Object::new();
    for key in js_sys::Object::keys(&obj).iter() {
        if let Ok(v) = js_sys::Reflect::get(&obj, &key) {
            if !v.is_undefined() {
                let _ = js_sys::Reflect::set(&out, &key, &v);
            }
        }
    }
    out.into()
}

/// Browser-facing handle: registers font byte buffers and shapes text runs
/// against them. Create one instance per independent set of fonts.
#[wasm_bindgen]
pub struct GlyphShaper {
    registry: FontRegistry,
}

#[wasm_bindgen]
impl GlyphShaper {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GlyphShaper {
        GlyphShaper {
            registry: FontRegistry::new(),
        }
    }

    /// Registers a font byte buffer (TTF/OTF, or one face of a TTC/OTC
    /// collection selected via `face_index`). Returns a numeric font id to
    /// pass in `ShapeRequest.fontIds`. Throws if the bytes cannot be parsed.
    #[wasm_bindgen(js_name = registerFont)]
    pub fn register_font(&mut self, bytes: &[u8], face_index: u32) -> Result<u32, JsValue> {
        self.registry
            .register(bytes.to_vec(), face_index)
            .map_err(to_js_error)
    }

    /// Unregisters a previously registered font. Returns `false` if unknown.
    #[wasm_bindgen(js_name = removeFont)]
    pub fn remove_font(&mut self, font_id: FontId) -> bool {
        self.registry.remove(font_id)
    }

    #[wasm_bindgen(js_name = hasFont)]
    pub fn has_font(&self, font_id: FontId) -> bool {
        self.registry.contains(font_id)
    }

    #[wasm_bindgen(js_name = fontCount)]
    pub fn font_count(&self) -> usize {
        self.registry.len()
    }

    /// Shapes a single contextual text run. `request` must match the shape
    /// of the TypeScript `ShapeRequest` type in `ts/types.ts`; the returned
    /// value matches `ShapeResult`. Throws a `ShapeError` (see `ts/types.ts`)
    /// on invalid input.
    pub fn shape(&self, request: JsValue) -> Result<JsValue, JsValue> {
        let request: ShapeRequest = deserialize_request(request)?;
        let result = shaping::shape(&self.registry, &request).map_err(to_js_error)?;
        serde_wasm_bindgen::to_value(&result).map_err(to_js_error)
    }

    /// Lays out a whole paragraph: Unicode bidi segmentation, grapheme-aware
    /// font fallback, UAX #14 line breaking with optional width wrapping, and
    /// safe cluster grouping. `request` must match the TypeScript
    /// `ParagraphRequest` type in `ts/types.ts`; the returned value matches
    /// `ParagraphLayout`. Throws a `ShapeError` on invalid input.
    #[wasm_bindgen(js_name = layoutParagraph)]
    pub fn layout_paragraph(&self, request: JsValue) -> Result<JsValue, JsValue> {
        let request: ParagraphRequest = deserialize_request(request)?;
        let result = layout::layout_paragraph(&self.registry, &request).map_err(to_js_error)?;
        serde_wasm_bindgen::to_value(&result).map_err(to_js_error)
    }

    /// Extracts a single registered font glyph's scalable vector outline
    /// (path commands + tight bounds), scaled to `request.fontSize`, with `y`
    /// pointing up (font convention). `request` must match the TypeScript
    /// `GlyphOutlineRequest` type in `ts/types.ts`; the returned value matches
    /// `GlyphOutline`, or `null` when the glyph has no monochrome outline
    /// (e.g. whitespace). Throws a `ShapeError` on invalid input (unknown
    /// font, out-of-range glyph id, non-positive size, or unparsable variation).
    #[wasm_bindgen(js_name = glyphOutline)]
    pub fn glyph_outline(&self, request: JsValue) -> Result<JsValue, JsValue> {
        let request: GlyphOutlineRequest = deserialize_request(request)?;
        let result = outline::glyph_outline(&self.registry, &request).map_err(to_js_error)?;
        serde_wasm_bindgen::to_value(&result).map_err(to_js_error)
    }
}

/// Returns every legal UAX #14 line-break opportunity in `text`, each reported
/// in both UTF-8 byte and UTF-16 code-unit coordinates (matches the TypeScript
/// `LineBreak[]` type). Does not require any registered font.
#[wasm_bindgen(js_name = lineBreakOpportunities)]
pub fn line_break_opportunities(text: &str) -> Result<JsValue, JsValue> {
    let breaks = layout::line_break_opportunities(text);
    serde_wasm_bindgen::to_value(&breaks).map_err(to_js_error)
}

impl Default for GlyphShaper {
    fn default() -> Self {
        Self::new()
    }
}
