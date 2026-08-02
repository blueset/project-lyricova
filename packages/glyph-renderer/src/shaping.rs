//! Core, WASM-independent text shaping engine backed by [`rustybuzz`].
//!
//! Nothing in this module depends on `wasm-bindgen`, so it can be built and
//! exercised with a plain `cargo test` on the host target. [`crate::bindings`]
//! adapts this engine to a JS-friendly surface for `wasm32-unknown-unknown`.
//!
//! ## Scope and known limitations
//!
//! This engine shapes a single *contextual run*: one direction, one script,
//! one language, applied uniformly to the whole input string. It does **not**
//! perform full Unicode Bidi paragraph analysis (splitting mixed LTR/RTL
//! paragraphs into runs) or line breaking/wrapping - callers that need mixed
//! bidi paragraphs or width-constrained line layout should use
//! [`crate::layout`], which is built on top of the primitives here. Font
//! fallback is explicit and deterministic: the caller supplies an ordered
//! candidate list and this engine walks it per *extended grapheme cluster*
//! (so a base character and its combining marks / ZWJ joins are never split
//! across two different fonts); it never guesses fonts from system font
//! catalogs or Unicode block heuristics.

use std::collections::HashMap;
use std::fmt;
use std::ops::Range;
use std::str::FromStr;

use rustybuzz::{
    BufferClusterLevel, Direction as HbDirection, Face, Feature, Language, Script, UnicodeBuffer,
    Variation,
};
use serde::{Deserialize, Serialize};
use unicode_segmentation::UnicodeSegmentation;

/// Opaque handle returned by [`FontRegistry::register`].
pub type FontId = u32;

/// Errors that can occur while registering fonts or shaping text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
pub enum ShapeError {
    /// The provided bytes could not be parsed as a font by `ttf-parser`.
    InvalidFont,
    /// A font id referenced by a [`ShapeRequest`] was never registered.
    UnknownFont(FontId),
    /// `font_ids` was empty; at least one fallback candidate is required.
    EmptyFontChain,
    /// `text` was empty.
    EmptyText,
    /// A `direction`, `script`, `language`, `feature`, or `variation` string
    /// could not be parsed.
    InvalidInput(String),
}

impl fmt::Display for ShapeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ShapeError::InvalidFont => write!(f, "invalid font bytes"),
            ShapeError::UnknownFont(id) => write!(f, "unknown font id: {id}"),
            ShapeError::EmptyFontChain => write!(f, "font_ids must contain at least one font"),
            ShapeError::EmptyText => write!(f, "text must not be empty"),
            ShapeError::InvalidInput(msg) => write!(f, "invalid input: {msg}"),
        }
    }
}

impl std::error::Error for ShapeError {}

/// Paragraph/run direction. See module docs for bidi scope limitations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TextDirection {
    Ltr,
    Rtl,
    Ttb,
    Btt,
    /// Resolve the direction heuristically from the dominant script of the
    /// input text (delegates to `rustybuzz`'s `guess_segment_properties`).
    #[default]
    Auto,
}

impl TextDirection {
    fn to_hb(self, guessed: HbDirection) -> HbDirection {
        match self {
            TextDirection::Ltr => HbDirection::LeftToRight,
            TextDirection::Rtl => HbDirection::RightToLeft,
            TextDirection::Ttb => HbDirection::TopToBottom,
            TextDirection::Btt => HbDirection::BottomToTop,
            TextDirection::Auto => guessed,
        }
    }

    fn from_hb(direction: HbDirection) -> TextDirection {
        match direction {
            HbDirection::LeftToRight => TextDirection::Ltr,
            HbDirection::RightToLeft => TextDirection::Rtl,
            HbDirection::TopToBottom => TextDirection::Ttb,
            HbDirection::BottomToTop => TextDirection::Btt,
            HbDirection::Invalid => TextDirection::Ltr,
        }
    }
}

/// A request to shape a single contextual text run.
///
/// `direction`/`script`/`language` accept an explicit override or `None`/
/// [`TextDirection::Auto`] to resolve heuristically; `features` and
/// `variations` accept HarfBuzz-style strings (see
/// <https://harfbuzz.github.io/harfbuzz-hb-common.html#hb-feature-from-string>),
/// e.g. `"liga=1"`, `"smcp"`, `"-kern"`, `"salt[3:5]=2"` for features and
/// `"wght=650"`, `"opsz=18"` for variable-font axis variations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapeRequest {
    pub text: String,
    /// Ordered, explicit font fallback chain: the first font in this list
    /// with a glyph for a given character wins; if none do, the *last* font
    /// in the chain is used and the affected byte range is reported in
    /// [`ShapeResult::missing_font_ranges`].
    pub font_ids: Vec<FontId>,
    #[serde(default)]
    pub direction: TextDirection,
    /// ISO 15924 4-letter script tag, e.g. `"Latn"`, `"Arab"`, `"Deva"`.
    #[serde(default)]
    pub script: Option<String>,
    /// BCP-47 language tag, e.g. `"en-US"`, `"ja"`.
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub features: Vec<String>,
    #[serde(default)]
    pub variations: Vec<String>,
    /// Font size in the same units the caller wants for `x_advance`/
    /// `y_advance`/`x_offset`/`y_offset` (e.g. CSS pixels).
    pub font_size: f32,
}

/// One positioned glyph, ready to be drawn by a renderer.
///
/// Source cluster ranges are reported in **both** UTF-8 byte offsets
/// (`cluster`/`cluster_end`) and UTF-16 code-unit offsets
/// (`cluster_utf16`/`cluster_end_utf16`) against the original `text`, so a
/// JavaScript/DOM caller (whose string indices are UTF-16) can correlate
/// glyphs back to source characters without re-deriving the mapping itself.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionedGlyph {
    pub glyph_id: u32,
    /// Which font in `ShapeRequest::font_ids` produced this glyph.
    pub font_id: FontId,
    /// Start byte offset (UTF-8) of this glyph's cluster in the original `text`.
    pub cluster: u32,
    /// End byte offset (UTF-8, exclusive) of this glyph's cluster in the original `text`.
    pub cluster_end: u32,
    /// Start offset of this glyph's cluster in UTF-16 code units.
    pub cluster_utf16: u32,
    /// End offset (exclusive) of this glyph's cluster in UTF-16 code units.
    pub cluster_end_utf16: u32,
    pub x_advance: f32,
    pub y_advance: f32,
    pub x_offset: f32,
    pub y_offset: f32,
}

/// The result of shaping a [`ShapeRequest`].
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapeResult {
    /// Positioned glyphs in visual (left-to-right buffer) order.
    pub glyphs: Vec<PositionedGlyph>,
    /// The direction actually used for shaping (resolved from `Auto` if needed).
    pub direction: TextDirection,
    /// The ISO 15924 script tag actually used for shaping.
    pub script: String,
    /// The BCP-47 language tag actually used for shaping, if any was resolved.
    pub language: Option<String>,
    /// Byte ranges of `text` for which no font in the fallback chain had
    /// glyph coverage (shaped with the last font in the chain, typically
    /// producing `.notdef`/tofu glyphs).
    pub missing_font_ranges: Vec<(u32, u32)>,
}

/// Vertical metrics of one registered font, in **font design units**
/// (divide by `units_per_em` for em-relative values).
///
/// The `typo_*` fields come from the font's `OS/2` table and are the correct
/// anchor for aligning secondary text (e.g. ruby) to the primary run's em box;
/// the plain `ascender`/`descender`/`line_gap` are `hhea`-derived line metrics.
/// See [`FontRegistry::font_metrics`] for how they are read.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontMetrics {
    pub units_per_em: u16,
    /// `hhea.ascender` (or the OS/2 usWin/typo fallback ttf-parser applies).
    pub ascender: i16,
    /// `hhea.descender`, negative below the baseline.
    pub descender: i16,
    pub line_gap: i16,
    /// `OS/2.sTypoAscender`, or `None` when the table predates it.
    pub typo_ascender: Option<i16>,
    /// `OS/2.sTypoDescender` (negative below the baseline), or `None`.
    pub typo_descender: Option<i16>,
    /// `OS/2.sTypoLineGap`, or `None`.
    pub typo_line_gap: Option<i16>,
}

struct FontEntry {
    bytes: Vec<u8>,
    face_index: u32,
}

/// Holds registered font byte buffers, keyed by an opaque [`FontId`].
///
/// Fonts are supplied entirely as in-memory byte buffers (e.g. `fetch()`ed
/// by the host page) - there is no filesystem or system font catalog access,
/// which keeps this deterministic and portable to `wasm32-unknown-unknown`.
#[derive(Default)]
pub struct FontRegistry {
    fonts: HashMap<FontId, FontEntry>,
    next_id: FontId,
}

impl FontRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers raw font bytes (TTF/OTF, or one face of a TTC/OTC collection
    /// selected via `face_index`). Returns a stable [`FontId`] to reference
    /// this font from future [`ShapeRequest`]s.
    ///
    /// Fails with [`ShapeError::InvalidFont`] if the bytes cannot be parsed.
    pub fn register(&mut self, bytes: Vec<u8>, face_index: u32) -> Result<FontId, ShapeError> {
        if Face::from_slice(&bytes, face_index).is_none() {
            return Err(ShapeError::InvalidFont);
        }
        let id = self.next_id;
        self.next_id = self.next_id.wrapping_add(1);
        self.fonts.insert(id, FontEntry { bytes, face_index });
        Ok(id)
    }

    /// Removes a previously registered font. Returns `false` if `id` was unknown.
    pub fn remove(&mut self, id: FontId) -> bool {
        self.fonts.remove(&id).is_some()
    }

    pub fn contains(&self, id: FontId) -> bool {
        self.fonts.contains_key(&id)
    }

    pub fn len(&self) -> usize {
        self.fonts.len()
    }

    pub fn is_empty(&self) -> bool {
        self.fonts.is_empty()
    }

    pub(crate) fn face(&self, id: FontId) -> Result<Face<'_>, ShapeError> {
        let entry = self.fonts.get(&id).ok_or(ShapeError::UnknownFont(id))?;
        Face::from_slice(&entry.bytes, entry.face_index).ok_or(ShapeError::InvalidFont)
    }

    /// Reads the vertical [`FontMetrics`] of a registered font, in that font's
    /// own design units (see [`FontMetrics`] for turning them em-relative).
    ///
    /// Fails with [`ShapeError::UnknownFont`] for an unregistered `id` and
    /// [`ShapeError::InvalidFont`] if the stored bytes fail to re-parse (the
    /// same errors font resolution reports elsewhere in the crate).
    pub fn font_metrics(&self, id: FontId) -> Result<FontMetrics, ShapeError> {
        // Read metrics off the underlying `ttf_parser` face: its
        // `units_per_em()` returns the `u16` design grid, whereas the
        // `rustybuzz` wrapper shadows that accessor with an `i32`.
        let face = self.face(id)?;
        let face: &rustybuzz::ttf_parser::Face<'_> = face.as_ref();
        Ok(FontMetrics {
            units_per_em: face.units_per_em(),
            ascender: face.ascender(),
            descender: face.descender(),
            line_gap: face.line_gap(),
            typo_ascender: face.typographic_ascender(),
            typo_descender: face.typographic_descender(),
            typo_line_gap: face.typographic_line_gap(),
        })
    }

    /// Resolves an ordered fallback chain of [`FontId`]s into parsed faces,
    /// validating every id up front so failures are reported before any
    /// shaping work happens. Returns [`ShapeError::EmptyFontChain`] if
    /// `font_ids` is empty.
    pub(crate) fn resolve_faces(
        &self,
        font_ids: &[FontId],
    ) -> Result<Vec<(FontId, Face<'_>)>, ShapeError> {
        if font_ids.is_empty() {
            return Err(ShapeError::EmptyFontChain);
        }
        let mut faces = Vec::with_capacity(font_ids.len());
        for &id in font_ids {
            faces.push((id, self.face(id)?));
        }
        Ok(faces)
    }
}

/// Shapes `request.text` against fonts held in `registry`, applying explicit
/// deterministic font fallback, and returns positioned glyphs with logical
/// source cluster ranges. See the [module docs](self) for scope and limitations.
///
/// Glyphs are returned in true visual order (left-to-right for LTR runs,
/// right-to-left for RTL runs) even when font fallback splits the run into
/// multiple segments. Non-drawable control characters (line/paragraph
/// separators and bidi format controls) produce no glyph and no advance.
pub fn shape(registry: &FontRegistry, request: &ShapeRequest) -> Result<ShapeResult, ShapeError> {
    if request.text.is_empty() {
        return Err(ShapeError::EmptyText);
    }
    validate_font_size(request.font_size)?;

    // Resolve and validate every font up front so failures are reported
    // before any shaping work happens (also rejects an empty font chain).
    let faces = registry.resolve_faces(&request.font_ids)?;

    let (direction, script, language) = resolve_segment_properties(&request.text, request)?;
    let features = parse_features(&request.features)?;
    let variations = parse_variations(&request.variations)?;

    let utf16 = Utf16Map::new(&request.text);
    let segments = segment_by_fallback(&request.text, 0..request.text.len(), &faces);

    let mut glyphs = Vec::new();
    let mut missing_font_ranges = Vec::new();

    // For a backward (RTL/BTT) run, later logical segments are drawn first, so
    // append segments in reverse to yield a single visually-ordered glyph list.
    let backward = matches!(
        direction,
        HbDirection::RightToLeft | HbDirection::BottomToTop
    );
    let ordered: Vec<&FallbackSegment> = if backward {
        segments.iter().rev().collect()
    } else {
        segments.iter().collect()
    };

    for segment in ordered {
        let (font_id, face) = &faces[segment.font_index];
        let run = shape_segment(
            &request.text,
            segment,
            face,
            *font_id,
            &variations,
            direction,
            script,
            language.as_ref(),
            &features,
            request.font_size,
            BufferClusterLevel::MonotoneCharacters,
            &utf16,
        );
        glyphs.extend(run);
    }

    // Report ranges whose significant scalars the assigned font cannot render
    // (absent or degraded coverage), in logical order.
    for segment in &segments {
        let (_, face) = &faces[segment.font_index];
        for (start, end) in uncovered_ranges(&request.text, segment.start..segment.end, face) {
            missing_font_ranges.push((start, end));
        }
    }

    // Non-drawable control characters emit no glyph or advance.
    glyphs.retain(|g| !source_is_non_drawable(&request.text, g.cluster, g.cluster_end));

    Ok(ShapeResult {
        glyphs,
        direction: TextDirection::from_hb(direction),
        script: script.tag().to_string(),
        language: language.map(|l| l.as_str().to_string()),
        missing_font_ranges,
    })
}

/// Validates that a font size is a finite, strictly-positive number.
pub(crate) fn validate_font_size(size: f32) -> Result<(), ShapeError> {
    if size.is_finite() && size > 0.0 {
        Ok(())
    } else {
        Err(ShapeError::InvalidInput(format!(
            "font_size must be a finite positive number, got {size}"
        )))
    }
}

/// Maps UTF-8 byte offsets (which are always at `char` boundaries for the
/// offsets this crate produces) to UTF-16 code-unit offsets against a fixed
/// source string, so cluster ranges can be reported in both coordinate
/// systems. Built once per shaped string; lookups are O(log n).
pub(crate) struct Utf16Map {
    /// `(utf8_offset, utf16_offset)` at every `char` boundary, plus the end,
    /// sorted ascending by `utf8_offset`.
    marks: Vec<(u32, u32)>,
}

impl Utf16Map {
    pub(crate) fn new(text: &str) -> Self {
        let mut marks = Vec::with_capacity(text.len() + 1);
        let mut utf16 = 0u32;
        for (byte, ch) in text.char_indices() {
            marks.push((byte as u32, utf16));
            utf16 += ch.len_utf16() as u32;
        }
        marks.push((text.len() as u32, utf16));
        Self { marks }
    }

    /// Translates a UTF-8 byte offset at a `char` boundary into its UTF-16
    /// code-unit offset. Offsets not on a boundary snap to the preceding
    /// boundary's UTF-16 value plus the byte delta is ignored (callers only
    /// ever pass boundary offsets).
    pub(crate) fn to_utf16(&self, utf8_offset: u32) -> u32 {
        match self.marks.binary_search_by_key(&utf8_offset, |&(b, _)| b) {
            Ok(idx) => self.marks[idx].1,
            // Not on a boundary: fall back to the nearest preceding boundary.
            Err(idx) => self.marks[idx.saturating_sub(1)].1,
        }
    }

    /// Total length of the source string in UTF-16 code units.
    pub(crate) fn utf16_len(&self) -> u32 {
        self.marks.last().map(|&(_, u)| u).unwrap_or(0)
    }

    /// Whether `utf16_offset` falls exactly on a Unicode code-point boundary
    /// (i.e. not in the middle of a surrogate pair). The UTF-16 column of
    /// `marks` is strictly increasing, so this is an O(log n) lookup.
    pub(crate) fn is_utf16_boundary(&self, utf16_offset: u32) -> bool {
        self.marks
            .binary_search_by_key(&utf16_offset, |&(_, u)| u)
            .is_ok()
    }
}

pub(crate) struct FallbackSegment {
    pub(crate) start: usize,
    pub(crate) end: usize,
    pub(crate) font_index: usize,
}

/// Splits `text[range]` into runs of consecutive *extended grapheme
/// clusters* resolved to the same font in the explicit fallback chain
/// `faces`. Fallback is resolved per grapheme cluster - never per scalar -
/// so a base character and its combining marks / ZWJ-joined sequence are
/// always assigned to a single font and never split across two fonts.
///
/// For each grapheme cluster the first face covering *all* of its
/// significant (non-ignorable, drawable) scalars wins; failing that, the
/// first face covering the cluster's base scalar wins (its uncovered marks
/// are then reported by [`uncovered_ranges`]); failing that, the *last* face
/// is used. Coverage/degradation is reported separately by
/// [`uncovered_ranges`] rather than baked into the segmentation.
pub(crate) fn segment_by_fallback(
    text: &str,
    range: Range<usize>,
    faces: &[(FontId, Face<'_>)],
) -> Vec<FallbackSegment> {
    let mut segments: Vec<FallbackSegment> = Vec::new();

    for (offset, grapheme) in text[range.clone()].grapheme_indices(true) {
        let start = range.start + offset;
        let end = start + grapheme.len();
        let font_index = resolve_font_index(faces, grapheme);

        match segments.last_mut() {
            Some(seg) if seg.font_index == font_index => {
                seg.end = end;
            }
            _ => segments.push(FallbackSegment {
                start,
                end,
                font_index,
            }),
        }
    }

    segments
}

/// Picks the fallback font for a single extended grapheme cluster. See
/// [`segment_by_fallback`] for the resolution order.
fn resolve_font_index(faces: &[(FontId, Face<'_>)], grapheme: &str) -> usize {
    // "Significant" scalars drive coverage decisions; default-ignorable and
    // non-drawable format controls (ZWJ, variation selectors, bidi controls,
    // line/paragraph separators, ...) are routinely absent from fonts and
    // must not by themselves force fallback.
    let significant: Vec<char> = grapheme
        .chars()
        .filter(|c| !is_ignorable_for_coverage(*c))
        .collect();
    if significant.is_empty() {
        // A cluster made purely of controls/ignorables (e.g. a lone newline or
        // bidi control): no glyph will be drawn, so the font choice is moot -
        // pin to the first font for deterministic, low-fragmentation grouping.
        return 0;
    }

    if let Some(index) = faces
        .iter()
        .position(|(_, face)| significant.iter().all(|&c| face.glyph_index(c).is_some()))
    {
        return index;
    }

    let base = significant[0];
    if let Some(index) = faces
        .iter()
        .position(|(_, face)| face.glyph_index(base).is_some())
    {
        return index;
    }

    faces.len() - 1
}

/// Reports the byte ranges of `text[range]` whose *significant* scalars
/// (drawable, non-ignorable) have no glyph in `face` - i.e. absent or
/// degraded coverage, including significant combining marks a base-only
/// fallback font cannot render. Adjacent uncovered scalars are merged.
/// Default-ignorable and non-drawable control scalars are never reported.
pub(crate) fn uncovered_ranges(
    text: &str,
    range: Range<usize>,
    face: &Face<'_>,
) -> Vec<(u32, u32)> {
    let mut out: Vec<(u32, u32)> = Vec::new();
    for (offset, ch) in text[range.clone()].char_indices() {
        let start = (range.start + offset) as u32;
        let end = start + ch.len_utf8() as u32;
        if is_ignorable_for_coverage(ch) {
            continue;
        }
        if face.glyph_index(ch).is_none() {
            match out.last_mut() {
                Some(last) if last.1 == start => last.1 = end,
                _ => out.push((start, end)),
            }
        }
    }
    out
}

/// Whether the source slice `text[start..end]` is non-empty and consists
/// entirely of non-drawable control characters (so it must emit no glyph or
/// advance while still contributing its source range and break behavior).
pub(crate) fn source_is_non_drawable(text: &str, start: u32, end: u32) -> bool {
    text.get(start as usize..end as usize)
        .map(|s| !s.is_empty() && s.chars().all(is_non_drawable_control))
        .unwrap_or(false)
}

/// Characters that must never produce a drawable glyph or advance: line and
/// paragraph separators (LF, CR, LS, PS) and bidi format controls. HarfBuzz
/// would otherwise shape LF/CR/LS/PS as `.notdef` tofu with a real advance.
pub(crate) fn is_non_drawable_control(ch: char) -> bool {
    matches!(ch as u32,
        0x000A                       // LINE FEED
        | 0x000D                     // CARRIAGE RETURN
        | 0x2028                     // LINE SEPARATOR
        | 0x2029                     // PARAGRAPH SEPARATOR
        | 0x200E | 0x200F            // LRM, RLM
        | 0x061C                     // ARABIC LETTER MARK
        | 0x202A..=0x202E            // LRE, RLE, PDF, LRO, RLO
        | 0x2066..=0x2069            // LRI, RLI, FSI, PDI
    )
}

/// A scalar that should never trigger font fallback or be reported as missing
/// coverage: any default-ignorable format character or non-drawable control.
pub(crate) fn is_ignorable_for_coverage(ch: char) -> bool {
    is_default_ignorable(ch) || is_non_drawable_control(ch)
}

/// Whether `ch` is a Unicode default-ignorable format control that fonts
/// commonly lack a glyph for and that therefore must not trigger font
/// fallback on its own (a superset covering ZWJ/ZWNJ/ZWSP, variation
/// selectors, bidi controls, and other invisible formatting characters).
pub(crate) fn is_default_ignorable(ch: char) -> bool {
    matches!(ch as u32,
        0x00AD                       // SOFT HYPHEN
        | 0x034F                     // COMBINING GRAPHEME JOINER
        | 0x061C                     // ARABIC LETTER MARK
        | 0x115F..=0x1160            // HANGUL CHOSEONG/JUNGSEONG FILLER
        | 0x17B4..=0x17B5            // KHMER VOWEL INHERENT
        | 0x180B..=0x180F            // MONGOLIAN variation selectors / FVS
        | 0x200B..=0x200F            // ZWSP, ZWNJ, ZWJ, LRM, RLM
        | 0x202A..=0x202E            // bidi embedding/override controls
        | 0x2060..=0x2064            // WORD JOINER .. INVISIBLE PLUS
        | 0x2066..=0x206F            // bidi isolates + deprecated format controls
        | 0x3164                     // HANGUL FILLER
        | 0xFE00..=0xFE0F            // variation selectors 1-16
        | 0xFEFF                     // ZERO WIDTH NO-BREAK SPACE (BOM)
        | 0xFFA0                     // HALFWIDTH HANGUL FILLER
        | 0x1BCA0..=0x1BCA3          // SHORTHAND FORMAT CONTROLS
        | 0x1D173..=0x1D17A          // MUSICAL SYMBOL begin/end controls
        | 0xE0000..=0xE0FFF          // tags + variation selectors supplement
    )
}

/// Resolves direction/script/language for the whole request: explicit values
/// win; anything left unset is filled in once (for the whole run) using
/// `rustybuzz`'s Unicode-based guess so every fallback segment shapes with
/// consistent properties.
fn resolve_segment_properties(
    text: &str,
    request: &ShapeRequest,
) -> Result<(HbDirection, Script, Option<Language>), ShapeError> {
    let mut probe = UnicodeBuffer::new();
    probe.push_str(text);
    probe.guess_segment_properties();

    let direction = request.direction.to_hb(probe.direction());

    let script = match &request.script {
        Some(s) => Script::from_str(s)
            .map_err(|_| ShapeError::InvalidInput(format!("invalid script tag: {s}")))?,
        None => probe.script(),
    };

    let language = match &request.language {
        Some(l) => Some(
            Language::from_str(l)
                .map_err(|_| ShapeError::InvalidInput(format!("invalid language tag: {l}")))?,
        ),
        None => probe.language(),
    };

    Ok((direction, script, language))
}

pub(crate) fn parse_features(features: &[String]) -> Result<Vec<Feature>, ShapeError> {
    features
        .iter()
        .map(|f| {
            Feature::from_str(f)
                .map_err(|_| ShapeError::InvalidInput(format!("invalid feature: {f}")))
        })
        .collect()
}

pub(crate) fn parse_variations(variations: &[String]) -> Result<Vec<Variation>, ShapeError> {
    variations
        .iter()
        .map(|v| {
            Variation::from_str(v)
                .map_err(|_| ShapeError::InvalidInput(format!("invalid variation: {v}")))
        })
        .collect()
}

/// Remaps feature byte ranges (expressed against the original full text)
/// into a segment's local coordinate space, dropping features that don't
/// overlap the segment at all. Global features (the default full-text
/// range) are passed through unchanged.
fn remap_features(features: &[Feature], seg_start: u32, seg_end: u32) -> Vec<Feature> {
    features
        .iter()
        .filter_map(|f| {
            let is_global = f.start == 0 && f.end == u32::MAX;
            if is_global {
                return Some(*f);
            }
            let f_end_exclusive = if f.end == u32::MAX {
                u32::MAX
            } else {
                f.end + 1
            };
            let overlap_start = f.start.max(seg_start);
            let overlap_end = f_end_exclusive.min(seg_end);
            if overlap_start >= overlap_end {
                return None;
            }
            Some(Feature {
                tag: f.tag,
                value: f.value,
                start: overlap_start - seg_start,
                end: overlap_end - seg_start - 1,
            })
        })
        .collect()
}

/// Shapes one fallback segment (`text[segment.start..segment.end]`) against
/// `face`, applying `variations`, and returns its positioned glyphs in buffer
/// order with global source cluster ranges filled in both UTF-8 and UTF-16
/// coordinates. Shared by the single-run [`shape`] entry point and the
/// paragraph layout engine in [`crate::layout`].
#[allow(clippy::too_many_arguments)]
pub(crate) fn shape_segment(
    text: &str,
    segment: &FallbackSegment,
    face: &Face<'_>,
    font_id: FontId,
    variations: &[Variation],
    direction: HbDirection,
    script: Script,
    language: Option<&Language>,
    features: &[Feature],
    font_size: f32,
    cluster_level: BufferClusterLevel,
    utf16: &Utf16Map,
) -> Vec<PositionedGlyph> {
    let mut face = face.clone();
    if !variations.is_empty() {
        face.set_variations(variations);
    }

    let mut buffer = UnicodeBuffer::new();
    buffer.push_str(&text[segment.start..segment.end]);
    buffer.set_direction(direction);
    buffer.set_script(script);
    if let Some(lang) = language {
        buffer.set_language(lang.clone());
    }
    buffer.set_cluster_level(cluster_level);

    let segment_features = remap_features(features, segment.start as u32, segment.end as u32);
    let output = rustybuzz::shape(&face, &segment_features, buffer);

    let mut glyphs = Vec::new();
    append_positioned_glyphs(
        &output,
        &face,
        font_size,
        segment.start as u32,
        (segment.end - segment.start) as u32,
        font_id,
        utf16,
        &mut glyphs,
    );
    glyphs
}

#[allow(clippy::too_many_arguments)]
fn append_positioned_glyphs(
    output: &rustybuzz::GlyphBuffer,
    face: &Face<'_>,
    font_size: f32,
    run_start: u32,
    run_len: u32,
    font_id: FontId,
    utf16: &Utf16Map,
    out: &mut Vec<PositionedGlyph>,
) {
    let upem = (face.units_per_em().max(1)) as f32;
    let scale = font_size / upem;

    let infos = output.glyph_infos();
    let positions = output.glyph_positions();

    let mut cluster_starts: Vec<u32> = infos.iter().map(|info| info.cluster).collect();
    cluster_starts.sort_unstable();
    cluster_starts.dedup();

    for (info, pos) in infos.iter().zip(positions.iter()) {
        let idx = cluster_starts.partition_point(|&c| c <= info.cluster);
        let cluster_end_local = cluster_starts.get(idx).copied().unwrap_or(run_len);

        let cluster = run_start + info.cluster;
        let cluster_end = run_start + cluster_end_local;

        out.push(PositionedGlyph {
            glyph_id: info.glyph_id,
            font_id,
            cluster,
            cluster_end,
            cluster_utf16: utf16.to_utf16(cluster),
            cluster_end_utf16: utf16.to_utf16(cluster_end),
            x_advance: pos.x_advance as f32 * scale,
            y_advance: pos.y_advance as f32 * scale,
            x_offset: pos.x_offset as f32 * scale,
            y_offset: pos.y_offset as f32 * scale,
        });
    }
}
