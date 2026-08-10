//! Deterministic horizontal paragraph layout built on top of the shaping
//! primitives in [`crate::shaping`].
//!
//! Where [`crate::shaping::shape`] handles a single pre-segmented contextual
//! run, this module implements the pieces needed to lay out a whole paragraph:
//!
//! 1. **Bidi segmentation** - the paragraph is analysed with the maintained
//!    [`unicode_bidi`] crate (UAX #9), split into directional runs, and each
//!    run is shaped with the correct direction. Lines are reordered into
//!    visual order (rule L2) while every cluster keeps its logical source
//!    range.
//! 2. **Grapheme-cluster-aware font fallback** - inherited from
//!    [`crate::shaping::segment_by_fallback`]: a base character and its
//!    combining marks / ZWJ sequence are never split across two fonts.
//! 3. **UAX #14 line breaking** - legal break opportunities come from the
//!    [`uniworld`] crate; [`line_break_opportunities`] exposes them
//!    directly and [`layout_paragraph`] uses them (plus per-cluster advances)
//!    to produce width-constrained greedy or balanced lines.
//! 4. **Safe shaped clusters** - one or more positioned glyphs (ligatures,
//!    base+mark combining sequences, ...) are grouped into [`ShapedCluster`]s
//!    with advance and bounding-box metadata for animation / paint mapping.
//!
//! Only *horizontal* layout is implemented; ruby annotations and glyph
//! rasterization / outline extraction are intentionally out of scope.

use std::collections::HashMap;
use std::ops::Range;
use std::str::FromStr;

use rustybuzz::ttf_parser::GlyphId;
use rustybuzz::{BufferClusterLevel, Direction as HbDirection, Face, Language, Script};
use serde::{Deserialize, Serialize};
use unicode_bidi::{BidiInfo, Level, ParagraphInfo};
use unicode_script::{Script as UScript, UnicodeScript};
use uniworld::linebreak::{
    line_break_opportunities as uniworld_line_break_opportunities, BreakAction,
};

use crate::shaping::{
    self, FontId, FontRegistry, PositionedGlyph, ShapeError, TextDirection, Utf16Map,
};

/// A source-text span expressed in **both** UTF-8 byte offsets and UTF-16
/// code-unit offsets, so DOM/JavaScript callers (whose string indices are
/// UTF-16) and byte-oriented consumers can both correlate a layout item back
/// to the exact source characters.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRange {
    pub utf8_start: u32,
    pub utf8_end: u32,
    pub utf16_start: u32,
    pub utf16_end: u32,
}

impl SourceRange {
    fn new(utf8_start: u32, utf8_end: u32, utf16: &Utf16Map) -> Self {
        SourceRange {
            utf8_start,
            utf8_end,
            utf16_start: utf16.to_utf16(utf8_start),
            utf16_end: utf16.to_utf16(utf8_end),
        }
    }
}

/// Axis-aligned bounding box of a cluster's glyphs, in the same units as the
/// glyph advances, relative to the cluster's pen origin. `y` follows the
/// HarfBuzz/font convention (positive up from the baseline). Useful for
/// animation and hit-testing / paint mapping without rasterizing outlines.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBounds {
    pub x_min: f32,
    pub x_max: f32,
    pub y_min: f32,
    pub y_max: f32,
}

/// A "safe" shaped cluster: one or more positioned glyphs that map to a
/// contiguous source range and must be treated atomically (a ligature spanning
/// several characters, or a base character plus its combining marks). Carries
/// advance and bounds metadata for animation / paint mapping.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapedCluster {
    /// Logical source range this cluster covers (UTF-8 and UTF-16).
    pub source: SourceRange,
    /// Font (from the request's fallback chain) that shaped this cluster.
    pub font_id: FontId,
    /// Resolved run direction this cluster was shaped with.
    pub direction: TextDirection,
    /// Resolved ISO 15924 script tag this cluster was shaped with (from the
    /// paragraph's per-script itemization, or the explicit request script).
    pub script: String,
    /// Resolved Unicode bidi embedding level of this cluster.
    pub level: u8,
    /// Positioned glyphs of this cluster, in visual (buffer) order.
    pub glyphs: Vec<PositionedGlyph>,
    /// Visual x-position of the cluster's left edge within its line.
    pub x: f32,
    /// Total horizontal advance of the cluster.
    pub advance: f32,
    /// Ink bounding box of the cluster's glyphs relative to the cluster origin.
    pub bounds: ClusterBounds,
    /// Whether every source character of this cluster is whitespace.
    pub is_whitespace: bool,
    /// Extra space inserted immediately before this cluster by a
    /// [`RangeAdvance`] (already reflected in `x`). `0.0` normally.
    pub leading_space: f32,
    /// Extra space inserted immediately after this cluster by a
    /// [`RangeAdvance`]. `0.0` normally.
    pub trailing_space: f32,
}

/// One laid-out line of a paragraph.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutLine {
    /// Clusters of this line in **visual** order (left-to-right).
    pub clusters: Vec<ShapedCluster>,
    /// Logical source span of the whole line (UTF-8 and UTF-16).
    pub source: SourceRange,
    /// Advance width of the line, excluding trailing whitespace.
    pub width: f32,
    /// Advance width of the line's trailing whitespace (excluded from `width`).
    pub trailing_whitespace: f32,
    /// Y-offset of the top of the line box from the top of the paragraph.
    pub top: f32,
    /// Y-offset of the baseline from the top of the paragraph.
    pub baseline: f32,
    /// Height of the line box.
    pub height: f32,
    /// Whether this line ended at a mandatory break (newline) or paragraph end.
    pub hard_break: bool,
    /// Base paragraph direction (for alignment of this line).
    pub direction: TextDirection,
}

/// The result of laying out a paragraph with [`layout_paragraph`].
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParagraphLayout {
    /// Laid-out lines, top to bottom.
    pub lines: Vec<LayoutLine>,
    /// Resolved base paragraph direction (from `base_direction`, or the first
    /// strong character when `auto`).
    pub base_direction: TextDirection,
    /// Width of the widest line (excluding trailing whitespace).
    pub width: f32,
    /// Total height of all lines.
    pub height: f32,
    /// Line box height used for every line.
    pub line_height: f32,
    /// Ascent of the primary font (baseline to top), in layout units.
    pub ascent: f32,
    /// Descent of the primary font (baseline to bottom, positive), in layout units.
    pub descent: f32,
    /// Logical source ranges that no font in the chain could cover (rendered
    /// with `.notdef`/tofu glyphs from the last font).
    pub missing_font_ranges: Vec<SourceRange>,
}

/// A single UAX #14 line-break opportunity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineBreak {
    /// Byte offset (UTF-8) at which a break may/must occur (start of next line).
    pub utf8_index: u32,
    /// The same position in UTF-16 code units.
    pub utf16_index: u32,
    /// `true` for a mandatory break (e.g. after a newline or at end of text).
    pub mandatory: bool,
}

/// Width-constrained line-wrapping strategy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LineWrapStrategy {
    /// First-fit UAX #14 wrapping at the last legal opportunity before
    /// overflow. This preserves the renderer's original behavior.
    #[default]
    Greedy,
    /// Preserve greedy's line count, then redistribute legal breakpoints to
    /// minimize width variance between the lines of each Unicode paragraph.
    Balanced,
}

/// How the extra advance required by a [`RangeAdvance`] is distributed
/// among the base clusters of the range.
///
/// Every variant is **symmetric or interior**: there is deliberately no
/// leading-only or trailing-only distribution. A caller that needs to displace
/// a range in one direction (JLReq's remedy for two ruby runs that still
/// collide - push the following base range right) can get it from the symmetric
/// form, since adding `2 * d` to `min_advance` places `d` on each side and so
/// moves the range's box centre right by `d`; it just also widens the line by
/// `2 * d` instead of `d`.
///
/// The reason no such variant exists is not that it would be hard to add, but
/// that it would not help: expansion is an *input* to line breaking (it is
/// applied to the logical cluster list before the break pass runs), so any
/// displacement decided from a finished layout requires re-running that pass,
/// and the new widths can move the range onto a different line - which
/// dissolves the adjacency that motivated the displacement while leaving the
/// base permanently wider. The ruby layer therefore reports the residual
/// overlap instead; see `resolveCollisions` in the jukebox package's
/// `rubyLayout.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RangeAdvanceDistribution {
    /// JLReq 2:1:1 distribution: with `m` clusters and `excess` extra width,
    /// the inter-cluster gap is `g = excess / m` and each edge gap is `g / 2`.
    #[default]
    Even,
    /// The whole excess is split equally between the two edge gaps; no
    /// inter-cluster spacing is added. Used for proportional / non-CJK runs,
    /// which must never be letterspaced.
    Edges,
    /// The excess is absorbed by inter-word whitespace clusters strictly
    /// inside the range; falls back to `Edges` when there is none.
    Whitespace,
}

/// A minimum total advance requirement for a logical UTF-16 range.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RangeAdvance {
    /// Logical UTF-16 start offset (inclusive).
    pub start: u32,
    /// Logical UTF-16 end offset (exclusive).
    pub end: u32,
    /// Minimum total advance the range must occupy.
    pub min_advance: f32,
    #[serde(default)]
    pub distribution: RangeAdvanceDistribution,
}

/// A request to lay out a whole paragraph.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParagraphRequest {
    pub text: String,
    /// Ordered, explicit font fallback chain (see [`crate::shaping`]).
    pub font_ids: Vec<FontId>,
    /// Base paragraph direction. `auto` resolves via the Unicode bidi
    /// first-strong rule (P2/P3). Only horizontal directions are accepted;
    /// `ttb`/`btt` are rejected with [`ShapeError::InvalidInput`].
    #[serde(default)]
    pub base_direction: TextDirection,
    /// Explicit ISO 15924 script tag, or `None` to guess per run.
    #[serde(default)]
    pub script: Option<String>,
    /// Explicit BCP-47 language tag, or `None` to guess per run.
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub features: Vec<String>,
    #[serde(default)]
    pub variations: Vec<String>,
    pub font_size: f32,
    /// Available width for wrapping. `None` (or a non-positive value) disables
    /// width wrapping - the paragraph is then only broken at mandatory breaks.
    #[serde(default)]
    pub max_width: Option<f32>,
    /// Strategy used when `max_width` enables wrapping. Defaults to
    /// [`LineWrapStrategy::Greedy`].
    #[serde(default)]
    pub wrap_strategy: LineWrapStrategy,
    /// Explicit line box height. `None` derives it from the primary font's
    /// vertical metrics (`ascender - descender + line_gap`).
    #[serde(default)]
    pub line_height: Option<f32>,
    /// Logical **UTF-16** `[start, end)` ranges inside which line breaking is
    /// forbidden (e.g. a ruby-annotated base run that must not be split). Only
    /// *width-driven* (UAX #14 "allowed") and emergency breaks are suppressed;
    /// legal breaks exactly *before* `start` and *after* `end` are preserved,
    /// and mandatory breaks (hard newlines) are always honored. Endpoints are
    /// validated strictly: `start < end`, within the text, and on code-point
    /// boundaries. Overlapping ranges are unioned.
    #[serde(default)]
    pub no_break_ranges: Vec<(u32, u32)>,
    /// Logical UTF-16 `[start, end)` phrase ranges whose interior UAX #14
    /// breaks are discouraged. These are soft constraints: an overlong phrase
    /// may still break internally instead of overflowing.
    #[serde(default)]
    pub phrase_ranges: Vec<(u32, u32)>,
    /// Logical UTF-16 ranges that must occupy at least a given total advance
    /// (ruby base expansion). Extra width is injected as inter-cluster and edge
    /// spacing *before* line breaking, so wrapping, cluster x-positions and line
    /// widths all account for it on the first pass. Ranges must not overlap.
    #[serde(default)]
    pub range_advances: Vec<RangeAdvance>,
}

/// Returns every legal UAX #14 line-break opportunity in `text`, with each
/// position reported in both UTF-8 byte and UTF-16 code-unit coordinates.
/// The final opportunity is the mandatory break at end of text.
pub fn line_break_opportunities(text: &str) -> Vec<LineBreak> {
    let utf16 = Utf16Map::new(text);
    collect_line_break_opportunities(text)
        .into_iter()
        .map(|(index, opportunity)| LineBreak {
            utf8_index: index as u32,
            utf16_index: utf16.to_utf16(index as u32),
            mandatory: opportunity == BreakAction::Mandatory,
        })
        .collect()
}

/// An intermediate cluster produced while shaping, before line breaking and
/// visual reordering. Glyphs are in buffer order.
struct RawCluster {
    utf8_start: u32,
    utf8_end: u32,
    utf16_start: u32,
    utf16_end: u32,
    font_id: FontId,
    script: String,
    level: u8,
    glyphs: Vec<PositionedGlyph>,
    advance: f32,
    bounds: ClusterBounds,
    is_whitespace: bool,
    /// Extra space injected before this cluster by a [`RangeAdvance`].
    leading_space: f32,
    /// Extra space injected after this cluster by a [`RangeAdvance`].
    trailing_space: f32,
}

/// Lays out `request.text` into wrapped, bidi-reordered lines of shaped
/// clusters. See the [module docs](self) for the algorithm and scope.
pub fn layout_paragraph(
    registry: &FontRegistry,
    request: &ParagraphRequest,
) -> Result<ParagraphLayout, ShapeError> {
    if request.text.is_empty() {
        return Err(ShapeError::EmptyText);
    }

    let faces = registry.resolve_faces(&request.font_ids)?;

    // Strict numeric validation.
    shaping::validate_font_size(request.font_size)?;
    if let Some(lh) = request.line_height {
        if !(lh.is_finite() && lh > 0.0) {
            return Err(ShapeError::InvalidInput(format!(
                "line_height must be a finite positive number, got {lh}"
            )));
        }
    }
    if let Some(mw) = request.max_width {
        if !mw.is_finite() {
            return Err(ShapeError::InvalidInput(format!(
                "max_width must be a finite number, got {mw}"
            )));
        }
    }

    let base_level = match request.base_direction {
        TextDirection::Ltr => Some(Level::ltr()),
        TextDirection::Rtl => Some(Level::rtl()),
        TextDirection::Auto => None,
        TextDirection::Ttb | TextDirection::Btt => {
            return Err(ShapeError::InvalidInput(
                "vertical directions (ttb/btt) are not supported by paragraph layout".to_string(),
            ));
        }
    };

    let text = &request.text;
    let utf16 = Utf16Map::new(text);
    let features = shaping::parse_features(&request.features)?;
    let variations = shaping::parse_variations(&request.variations)?;

    let bidi = BidiInfo::new(text, base_level);
    let resolved_base = bidi
        .paragraphs
        .first()
        .map(|p| p.level)
        .unwrap_or_else(Level::ltr);
    let base_direction = direction_of(resolved_base);

    // Optional explicit script/language shared by every run.
    let explicit_script = match &request.script {
        Some(s) => Some(
            <Script as std::str::FromStr>::from_str(s)
                .map_err(|_| ShapeError::InvalidInput(format!("invalid script tag: {s}")))?,
        ),
        None => None,
    };
    let explicit_language = match &request.language {
        Some(l) => Some(
            <Language as std::str::FromStr>::from_str(l)
                .map_err(|_| ShapeError::InvalidInput(format!("invalid language tag: {l}")))?,
        ),
        None => None,
    };

    // Validate optional break-suppression ranges up front (strict).
    let no_break_ranges = validate_no_break_ranges(&request.no_break_ranges, &utf16)?;
    let phrase_ranges = validate_phrase_ranges(&request.phrase_ranges, &utf16)?;
    let range_advances = validate_range_advances(&request.range_advances, &utf16)?;

    // --- Itemize into runs (bidi level x font fallback x script) in logical
    // order and shape each, producing a single logical-order list of clusters. ---
    let mut clusters: Vec<RawCluster> = Vec::new();
    let mut missing_font_ranges: Vec<SourceRange> = Vec::new();

    for (level, run_start, run_end) in level_runs(text, &bidi.levels) {
        let hb_direction = if level.is_rtl() {
            HbDirection::RightToLeft
        } else {
            HbDirection::LeftToRight
        };

        for segment in shaping::segment_by_fallback(text, run_start..run_end, &faces) {
            let (font_id, face) = &faces[segment.font_index];
            let mut metrics_face = face.clone();
            if !variations.is_empty() {
                metrics_face.set_variations(&variations);
            }

            // Report absent/degraded coverage (including significant marks a
            // base-only fallback font cannot render) at scalar granularity.
            for (start, end) in shaping::uncovered_ranges(text, segment.start..segment.end, face) {
                missing_font_ranges.push(SourceRange::new(start, end, &utf16));
            }

            let scale = request.font_size / (face.units_per_em().max(1) as f32);
            let language = explicit_language.clone();

            // Split the font segment further by script so mixed same-font,
            // same-direction scripts (e.g. Latin + Greek) shape correctly.
            for (s_start, s_end, uscript) in script_runs(text, segment.start..segment.end) {
                let script = explicit_script
                    .unwrap_or_else(|| resolve_script(uscript, &text[s_start..s_end]));
                let sub = shaping::FallbackSegment {
                    start: s_start,
                    end: s_end,
                    font_index: segment.font_index,
                };
                let glyphs = shaping::shape_segment(
                    text,
                    &sub,
                    face,
                    *font_id,
                    &variations,
                    hb_direction,
                    script,
                    language.as_ref(),
                    &features,
                    request.font_size,
                    BufferClusterLevel::MonotoneGraphemes,
                    &utf16,
                );

                let script_tag = script.tag().to_string();
                let mut run_clusters = group_clusters(
                    glyphs,
                    text,
                    level.number(),
                    *font_id,
                    &script_tag,
                    &metrics_face,
                    scale,
                );
                // Buffer order is reversed for RTL; sort ascending by source so
                // the global cluster list is always in logical order.
                run_clusters.sort_by_key(|c| c.utf8_start);
                clusters.append(&mut run_clusters);
            }
        }
    }

    // Ruby base expansion: inject inter-cluster and edge spacing into the
    // logical cluster list *before* line breaking, so wrapping, cluster
    // x-positions and line widths all account for it on the first pass.
    apply_range_advances(&mut clusters, &range_advances);

    // --- Vertical metrics from the primary font. ---
    let primary = &faces[0].1;
    let scale = request.font_size / (primary.units_per_em().max(1) as f32);
    let ascent = primary.ascender() as f32 * scale;
    let descent = -(primary.descender() as f32) * scale;
    let line_gap = primary.line_gap() as f32 * scale;
    let line_height = request.line_height.unwrap_or(ascent + descent + line_gap);

    // --- Break into lines (logical order) then reorder each visually. ---
    let breaks = break_map(text);
    let max_width = request.max_width.filter(|w| *w > 0.0);
    let line_ranges = break_lines(
        &clusters,
        &breaks,
        max_width,
        &no_break_ranges,
        &phrase_ranges,
        request.wrap_strategy,
    );

    let mut lines = Vec::with_capacity(line_ranges.len());
    let mut paragraph_width = 0.0f32;

    for (line_index, line_range) in line_ranges.iter().enumerate() {
        let logical = &clusters[line_range.start..line_range.end];
        if logical.is_empty() {
            continue;
        }

        // Each line belongs to exactly one Unicode bidi paragraph (paragraph
        // separators are mandatory breaks), so reorder it with that
        // paragraph's own base level and report its own base direction.
        let para_level = paragraph_level_at(&bidi.paragraphs, logical[0].utf8_start, resolved_base);

        let line = build_line(
            logical,
            para_level,
            direction_of(para_level),
            line_index,
            line_height,
            ascent,
            &utf16,
            line_range.hard_break,
        );
        paragraph_width = paragraph_width.max(line.width);
        lines.push(line);
    }

    let height = line_height * lines.len() as f32;

    Ok(ParagraphLayout {
        lines,
        base_direction,
        width: paragraph_width,
        height,
        line_height,
        ascent,
        descent,
        missing_font_ranges,
    })
}

/// Splits `text` into maximal runs of equal bidi embedding level, in logical
/// order. `levels` is indexed by UTF-8 byte (from [`BidiInfo::levels`]).
fn level_runs(text: &str, levels: &[Level]) -> Vec<(Level, usize, usize)> {
    let mut runs: Vec<(Level, usize, usize)> = Vec::new();
    for (byte, _) in text.char_indices() {
        let level = levels[byte];
        let end = next_char_boundary(text, byte);
        match runs.last_mut() {
            Some((run_level, _, run_end)) if *run_level == level => *run_end = end,
            _ => runs.push((level, byte, end)),
        }
    }
    runs
}

fn next_char_boundary(text: &str, byte: usize) -> usize {
    text[byte..]
        .char_indices()
        .nth(1)
        .map(|(i, _)| byte + i)
        .unwrap_or(text.len())
}

/// Guesses a script for a run substring using rustybuzz's Unicode heuristic.
fn guess_script(run: &str) -> Script {
    let mut buffer = rustybuzz::UnicodeBuffer::new();
    buffer.push_str(run);
    buffer.guess_segment_properties();
    buffer.script()
}

/// Maps a Unicode bidi embedding level to a horizontal text direction.
fn direction_of(level: Level) -> TextDirection {
    if level.is_rtl() {
        TextDirection::Rtl
    } else {
        TextDirection::Ltr
    }
}

/// Returns the embedding level of the Unicode bidi paragraph containing byte
/// offset `byte`, falling back to `default` if none matches.
fn paragraph_level_at(paragraphs: &[ParagraphInfo], byte: u32, default: Level) -> Level {
    let byte = byte as usize;
    paragraphs
        .iter()
        .find(|p| p.range.start <= byte && byte < p.range.end)
        .map(|p| p.level)
        .unwrap_or(default)
}

/// Splits `text[range]` into maximal same-script sub-runs (UAX #24 §5.1),
/// returning `(start, end, script)` byte ranges. `Common`/`Inherited`
/// characters extend the surrounding script (attaching to the preceding run,
/// or to the first strong script that follows); a run with no strong
/// character resolves to `Common`.
fn script_runs(text: &str, range: Range<usize>) -> Vec<(usize, usize, UScript)> {
    let mut runs: Vec<(usize, usize, UScript)> = Vec::new();
    let mut run_start = range.start;
    let mut run_script: Option<UScript> = None;

    for (offset, ch) in text[range.clone()].char_indices() {
        let byte = range.start + offset;
        let s = ch.script();
        if s == UScript::Common || s == UScript::Inherited {
            // Extends the current run regardless of its resolved script.
            continue;
        }
        match run_script {
            None => run_script = Some(s),
            Some(cur) if cur == s => {}
            Some(cur) => {
                runs.push((run_start, byte, cur));
                run_start = byte;
                run_script = Some(s);
            }
        }
    }
    runs.push((run_start, range.end, run_script.unwrap_or(UScript::Common)));
    runs
}

/// Converts a resolved Unicode script into a rustybuzz script for shaping.
/// A run that resolved to `Common`/`Inherited` (no strong character) defers
/// to rustybuzz's own heuristic on the substring.
fn resolve_script(uscript: UScript, run: &str) -> Script {
    if uscript == UScript::Common || uscript == UScript::Inherited {
        return guess_script(run);
    }
    Script::from_str(uscript.short_name()).unwrap_or_else(|_| guess_script(run))
}

/// Groups a run's glyphs (buffer order) into clusters by shared cluster start,
/// computing per-cluster advance, ink bounds, and whitespace flag. Clusters
/// whose source is entirely non-drawable controls (LF/CR/LS/PS, bidi format
/// controls) keep their source range but emit no glyph and no advance.
#[allow(clippy::too_many_arguments)]
fn group_clusters(
    glyphs: Vec<PositionedGlyph>,
    text: &str,
    level: u8,
    font_id: FontId,
    script_tag: &str,
    face: &Face<'_>,
    scale: f32,
) -> Vec<RawCluster> {
    let mut clusters: Vec<RawCluster> = Vec::new();

    for glyph in glyphs {
        match clusters.last_mut() {
            Some(cluster) if cluster.utf8_start == glyph.cluster => {
                accumulate_glyph(cluster, &glyph, face, scale);
                cluster.glyphs.push(glyph);
            }
            _ => {
                let utf8_start = glyph.cluster;
                let utf8_end = glyph.cluster_end;
                let utf16_start = glyph.cluster_utf16;
                let utf16_end = glyph.cluster_end_utf16;
                let is_whitespace = text
                    .get(utf8_start as usize..utf8_end as usize)
                    .map(|s| !s.is_empty() && s.chars().all(|c| c.is_whitespace()))
                    .unwrap_or(false);
                let mut cluster = RawCluster {
                    utf8_start,
                    utf8_end,
                    utf16_start,
                    utf16_end,
                    font_id,
                    script: script_tag.to_string(),
                    level,
                    glyphs: Vec::new(),
                    advance: 0.0,
                    bounds: ClusterBounds {
                        x_min: f32::INFINITY,
                        x_max: f32::NEG_INFINITY,
                        y_min: f32::INFINITY,
                        y_max: f32::NEG_INFINITY,
                    },
                    is_whitespace,
                    leading_space: 0.0,
                    trailing_space: 0.0,
                };
                accumulate_glyph(&mut cluster, &glyph, face, scale);
                cluster.glyphs.push(glyph);
                clusters.push(cluster);
            }
        }
    }

    for cluster in &mut clusters {
        if shaping::source_is_non_drawable(text, cluster.utf8_start, cluster.utf8_end) {
            // Preserve the source range / break behavior but draw nothing.
            cluster.glyphs.clear();
            cluster.advance = 0.0;
            cluster.bounds = ClusterBounds {
                x_min: 0.0,
                x_max: 0.0,
                y_min: 0.0,
                y_max: 0.0,
            };
        } else if cluster.bounds.x_min > cluster.bounds.x_max {
            // No glyph contributed ink (e.g. whitespace); use the logical box.
            cluster.bounds = ClusterBounds {
                x_min: 0.0,
                x_max: cluster.advance,
                y_min: 0.0,
                y_max: 0.0,
            };
        }
    }

    clusters
}

/// Adds a glyph's advance to `cluster` and unions its ink bounding box into
/// the cluster bounds (at the cluster-local pen position).
fn accumulate_glyph(
    cluster: &mut RawCluster,
    glyph: &PositionedGlyph,
    face: &Face<'_>,
    scale: f32,
) {
    let pen = cluster.advance;
    if let Some(bbox) = face.glyph_bounding_box(GlyphId(glyph.glyph_id as u16)) {
        let x0 = pen + glyph.x_offset + bbox.x_min as f32 * scale;
        let x1 = pen + glyph.x_offset + bbox.x_max as f32 * scale;
        let y0 = glyph.y_offset + bbox.y_min as f32 * scale;
        let y1 = glyph.y_offset + bbox.y_max as f32 * scale;
        cluster.bounds.x_min = cluster.bounds.x_min.min(x0);
        cluster.bounds.x_max = cluster.bounds.x_max.max(x1);
        cluster.bounds.y_min = cluster.bounds.y_min.min(y0);
        cluster.bounds.y_max = cluster.bounds.y_max.max(y1);
    }
    cluster.advance += glyph.x_advance;
}

/// Builds a byte-index -> mandatory map of UAX #14 break opportunities.
fn break_map(text: &str) -> HashMap<u32, bool> {
    collect_line_break_opportunities(text)
        .into_iter()
        .map(|(index, opportunity)| (index as u32, opportunity == BreakAction::Mandatory))
        .collect()
}

/// Converts UniWorld's dense byte-indexed action table into the sparse
/// opportunity list consumed by the paragraph layout and public bindings.
fn collect_line_break_opportunities(text: &str) -> Vec<(usize, BreakAction)> {
    let actions = uniworld_line_break_opportunities(text);
    text.char_indices()
        .map(|(index, _)| index)
        .chain(std::iter::once(text.len()))
        .filter_map(|index| {
            let action = actions[index];
            (action != BreakAction::Prohibited).then_some((index, action))
        })
        .collect()
}

/// A half-open range of cluster indices making up one line.
#[derive(Clone, Copy)]
struct LineRange {
    start: usize,
    end: usize,
    hard_break: bool,
}

/// Validates optional break-suppression ranges (logical UTF-16 `[start, end)`)
/// and returns them unchanged on success. Each range must be non-empty
/// (`start < end`), lie within the text, and have both endpoints on Unicode
/// code-point boundaries (never mid-surrogate). Overlaps are permitted (their
/// suppression simply unions).
fn validate_no_break_ranges(
    ranges: &[(u32, u32)],
    utf16: &Utf16Map,
) -> Result<Vec<(u32, u32)>, ShapeError> {
    validate_utf16_ranges(ranges, utf16, "no-break")
}

fn validate_phrase_ranges(
    ranges: &[(u32, u32)],
    utf16: &Utf16Map,
) -> Result<Vec<(u32, u32)>, ShapeError> {
    validate_utf16_ranges(ranges, utf16, "phrase")
}

fn validate_utf16_ranges(
    ranges: &[(u32, u32)],
    utf16: &Utf16Map,
    label: &str,
) -> Result<Vec<(u32, u32)>, ShapeError> {
    let len = utf16.utf16_len();
    for &(start, end) in ranges {
        if start >= end {
            return Err(ShapeError::InvalidInput(format!(
                "{label} range start ({start}) must be less than end ({end})"
            )));
        }
        if end > len {
            return Err(ShapeError::InvalidInput(format!(
                "{label} range end ({end}) exceeds the text length ({len}) in UTF-16 code units"
            )));
        }
        if !utf16.is_utf16_boundary(start) || !utf16.is_utf16_boundary(end) {
            return Err(ShapeError::InvalidInput(format!(
                "{label} range [{start}, {end}) endpoints must be on UTF-16 code-point boundaries"
            )));
        }
    }
    Ok(ranges.to_vec())
}

/// Validates ruby base-expansion range advances (logical UTF-16 `[start, end)`)
/// and returns them sorted by `start`. Each range is validated with the same
/// strict endpoint rules as [`validate_utf16_ranges`], `min_advance` must be
/// finite and non-negative, and (unlike no-break ranges) overlapping ranges are
/// rejected because overlapping expansion is ambiguous. Touching ranges
/// (`a.end == b.start`) are permitted.
fn validate_range_advances(
    ranges: &[RangeAdvance],
    utf16: &Utf16Map,
) -> Result<Vec<RangeAdvance>, ShapeError> {
    let pairs: Vec<(u32, u32)> = ranges.iter().map(|r| (r.start, r.end)).collect();
    validate_utf16_ranges(&pairs, utf16, "range-advance")?;

    for range in ranges {
        if !(range.min_advance.is_finite() && range.min_advance >= 0.0) {
            return Err(ShapeError::InvalidInput(format!(
                "range-advance minAdvance must be a finite non-negative number, got {}",
                range.min_advance
            )));
        }
    }

    let mut sorted = ranges.to_vec();
    sorted.sort_by_key(|r| r.start);
    for pair in sorted.windows(2) {
        if pair[1].start < pair[0].end {
            return Err(ShapeError::InvalidInput(format!(
                "range-advance ranges must not overlap: [{}, {}) overlaps [{}, {})",
                pair[0].start, pair[0].end, pair[1].start, pair[1].end
            )));
        }
    }
    Ok(sorted)
}

/// The total horizontal space a cluster occupies: its shaped glyph advance plus
/// any ruby base-expansion spacing injected before and after it. Every width
/// accumulation / indexing site must use this rather than `advance` alone.
fn total_advance(c: &RawCluster) -> f32 {
    c.leading_space + c.advance + c.trailing_space
}

/// Applies ruby base expansion to the logical cluster list. For each validated
/// [`RangeAdvance`] (already sorted by `start`), selects the clusters contained
/// in `[start, end)`, computes the excess width over their natural advance, and
/// distributes it as leading/trailing spacing per the range's distribution.
fn apply_range_advances(clusters: &mut [RawCluster], ranges: &[RangeAdvance]) {
    for range in ranges {
        let selected: Vec<usize> = clusters
            .iter()
            .enumerate()
            .filter(|(_, c)| c.utf16_start >= range.start && c.utf16_end <= range.end)
            .map(|(i, _)| i)
            .collect();
        let m = selected.len();
        if m == 0 {
            continue;
        }

        let base: f32 = selected.iter().map(|&i| clusters[i].advance).sum();
        let excess = (range.min_advance - base).max(0.0);
        if excess <= 0.0 {
            continue;
        }

        match range.distribution {
            RangeAdvanceDistribution::Even => {
                let g = excess / m as f32;
                let edge = g / 2.0;
                for (pos, &i) in selected.iter().enumerate() {
                    if pos == 0 {
                        clusters[i].leading_space += edge;
                    }
                    if pos == m - 1 {
                        clusters[i].trailing_space += edge;
                    } else {
                        clusters[i].trailing_space += g;
                    }
                }
            }
            RangeAdvanceDistribution::Edges => {
                let edge = excess / 2.0;
                clusters[selected[0]].leading_space += edge;
                clusters[selected[m - 1]].trailing_space += edge;
            }
            RangeAdvanceDistribution::Whitespace => {
                let interior: Vec<usize> = selected
                    .iter()
                    .enumerate()
                    .filter(|&(pos, &i)| pos != 0 && pos != m - 1 && clusters[i].is_whitespace)
                    .map(|(_, &i)| i)
                    .collect();
                if interior.is_empty() {
                    let edge = excess / 2.0;
                    clusters[selected[0]].leading_space += edge;
                    clusters[selected[m - 1]].trailing_space += edge;
                } else {
                    let share = excess / interior.len() as f32;
                    for i in interior {
                        clusters[i].trailing_space += share;
                    }
                }
            }
        }
    }
}

fn break_forbidden(pos: u32, no_break_ranges: &[(u32, u32)]) -> bool {
    no_break_ranges
        .iter()
        .any(|&(start, end)| start < pos && pos < end)
}

fn break_discouraged(pos: u32, phrase_ranges: &[(u32, u32)]) -> bool {
    phrase_ranges
        .iter()
        .any(|&(start, end)| start < pos && pos < end)
}

/// Greedy UAX #14 line breaking over the logical cluster list. Breaks are only
/// taken at cluster boundaries that coincide with a legal break opportunity;
/// mandatory breaks always split. When `max_width` is set, lines are wrapped at
/// the last legal opportunity that keeps the non-trailing-whitespace width
/// within the limit (with an emergency break when a single unbreakable cluster
/// overflows). Break opportunities whose logical UTF-16 position falls strictly
/// inside a `no_break_ranges` entry are suppressed (for both width-driven and
/// emergency breaks); mandatory breaks are always honored.
fn break_lines(
    clusters: &[RawCluster],
    breaks: &HashMap<u32, bool>,
    max_width: Option<f32>,
    no_break_ranges: &[(u32, u32)],
    phrase_ranges: &[(u32, u32)],
    strategy: LineWrapStrategy,
) -> Vec<LineRange> {
    let greedy = break_lines_greedy(clusters, breaks, max_width, no_break_ranges, phrase_ranges);
    let Some(limit) = max_width else {
        return greedy;
    };
    if strategy == LineWrapStrategy::Greedy || greedy.len() <= 1 {
        return greedy;
    }

    balance_greedy_paragraphs(
        clusters,
        breaks,
        limit,
        no_break_ranges,
        phrase_ranges,
        &greedy,
    )
}

fn break_lines_greedy(
    clusters: &[RawCluster],
    breaks: &HashMap<u32, bool>,
    max_width: Option<f32>,
    no_break_ranges: &[(u32, u32)],
    phrase_ranges: &[(u32, u32)],
) -> Vec<LineRange> {
    let mut lines: Vec<LineRange> = Vec::new();
    let n = clusters.len();
    let mut line_start = 0usize;
    let mut i = 0usize;
    let mut width = 0.0f32; // includes trailing whitespace
    let mut width_no_ws = 0.0f32; // excludes trailing whitespace
    let mut last_preferred_break: Option<usize> = None;
    let mut last_phrase_break: Option<usize> = None;

    while i < n {
        let cluster = &clusters[i];
        width += total_advance(cluster);
        if cluster.is_whitespace {
            // trailing whitespace does not extend the measured width
        } else {
            width_no_ws = width;
        }

        let break_end = cluster.utf8_end;
        let break_opportunity = breaks.get(&break_end).copied();
        let is_mandatory_control =
            break_opportunity == Some(true) && cluster.glyphs.is_empty() && cluster.advance == 0.0;
        if is_mandatory_control {
            // Mandatory separators belong to the line they terminate. Handle
            // them before width overflow so an oversized preceding cluster
            // cannot strand the separator on an extra blank line.
            lines.push(LineRange {
                start: line_start,
                end: i + 1,
                hard_break: true,
            });
            line_start = i + 1;
            width = 0.0;
            width_no_ws = 0.0;
            last_preferred_break = None;
            last_phrase_break = None;
            i += 1;
            continue;
        }

        // Wrap if we have overflowed and there is a legal break to fall back to.
        if let Some(limit) = max_width {
            if width_no_ws > limit {
                let selected_break = last_preferred_break
                    .filter(|&b| b > line_start)
                    .or_else(|| last_phrase_break.filter(|&b| b > line_start));
                if let Some(brk) = selected_break {
                    lines.push(LineRange {
                        start: line_start,
                        end: brk,
                        hard_break: false,
                    });
                    line_start = brk;
                    i = brk;
                    width = 0.0;
                    width_no_ws = 0.0;
                    last_preferred_break = None;
                    last_phrase_break = None;
                    continue;
                } else if i > line_start && !break_forbidden(cluster.utf16_start, no_break_ranges) {
                    // Emergency break: a run of clusters with no legal break is
                    // wider than the limit; break before the overflowing cluster
                    // (but never inside a no-break range - it overflows intact).
                    lines.push(LineRange {
                        start: line_start,
                        end: i,
                        hard_break: false,
                    });
                    line_start = i;
                    width = 0.0;
                    width_no_ws = 0.0;
                    last_preferred_break = None;
                    last_phrase_break = None;
                    continue;
                }
            }
        }

        if break_opportunity == Some(true) {
            lines.push(LineRange {
                start: line_start,
                end: i + 1,
                hard_break: true,
            });
            line_start = i + 1;
            width = 0.0;
            width_no_ws = 0.0;
            last_preferred_break = None;
            last_phrase_break = None;
            i += 1;
            continue;
        } else if break_opportunity == Some(false) {
            // A legal (non-mandatory) break after this cluster, unless it is
            // suppressed by a no-break range.
            if !break_forbidden(cluster.utf16_end, no_break_ranges) {
                if break_discouraged(cluster.utf16_end, phrase_ranges) {
                    last_phrase_break = Some(i + 1);
                } else {
                    last_preferred_break = Some(i + 1);
                }
            }
        }
        i += 1;
    }

    if line_start < n {
        lines.push(LineRange {
            start: line_start,
            end: n,
            hard_break: true,
        });
    }

    lines
}

#[derive(Clone, Copy)]
struct BalanceBoundary {
    cluster_index: usize,
    legal: bool,
    discouraged: bool,
}

#[derive(Clone, Copy)]
struct BalanceScore {
    overflow: f64,
    emergency_breaks: u32,
    phrase_breaks: u32,
    variance: f64,
}

impl BalanceScore {
    const ZERO: Self = Self {
        overflow: 0.0,
        emergency_breaks: 0,
        phrase_breaks: 0,
        variance: 0.0,
    };

    fn add(
        self,
        width: f32,
        ideal_width: f32,
        limit: f32,
        emergency: bool,
        discouraged: bool,
    ) -> Self {
        let overflow = f64::from((width - limit).max(0.0));
        let deviation = f64::from(width - ideal_width);
        Self {
            overflow: self.overflow + overflow * overflow,
            emergency_breaks: self.emergency_breaks + u32::from(emergency),
            phrase_breaks: self.phrase_breaks + u32::from(discouraged),
            variance: self.variance + deviation * deviation,
        }
    }

    fn is_better_than(self, other: Self) -> bool {
        const EPSILON: f64 = 1e-6;
        if (self.overflow - other.overflow).abs() > EPSILON {
            return self.overflow < other.overflow;
        }
        if self.emergency_breaks != other.emergency_breaks {
            return self.emergency_breaks < other.emergency_breaks;
        }
        if self.phrase_breaks != other.phrase_breaks {
            return self.phrase_breaks < other.phrase_breaks;
        }
        self.variance + EPSILON < other.variance
    }
}

const MAX_BALANCE_TRANSITIONS: usize = 2_000_000;

struct LineWidthIndex {
    prefix_advance: Vec<f64>,
    last_non_whitespace_end: Vec<usize>,
}

impl LineWidthIndex {
    fn new(clusters: &[RawCluster]) -> Self {
        let mut prefix_advance = Vec::with_capacity(clusters.len() + 1);
        let mut last_non_whitespace_end = Vec::with_capacity(clusters.len() + 1);
        prefix_advance.push(0.0);
        last_non_whitespace_end.push(0);

        let mut last_visible_end = 0usize;
        for (index, cluster) in clusters.iter().enumerate() {
            prefix_advance.push(prefix_advance[index] + f64::from(total_advance(cluster)));
            if !cluster.is_whitespace {
                last_visible_end = index + 1;
            }
            last_non_whitespace_end.push(last_visible_end);
        }

        Self {
            prefix_advance,
            last_non_whitespace_end,
        }
    }

    fn content_width(&self, start: usize, end: usize) -> f32 {
        let visible_end = self.last_non_whitespace_end[end];
        if visible_end <= start {
            return 0.0;
        }
        (self.prefix_advance[visible_end] - self.prefix_advance[start]) as f32
    }
}

struct BalanceContext<'a> {
    clusters: &'a [RawCluster],
    breaks: &'a HashMap<u32, bool>,
    max_width: f32,
    no_break_ranges: &'a [(u32, u32)],
    phrase_ranges: &'a [(u32, u32)],
    widths: &'a LineWidthIndex,
}

fn balance_greedy_paragraphs(
    clusters: &[RawCluster],
    breaks: &HashMap<u32, bool>,
    max_width: f32,
    no_break_ranges: &[(u32, u32)],
    phrase_ranges: &[(u32, u32)],
    greedy: &[LineRange],
) -> Vec<LineRange> {
    let mut result = Vec::with_capacity(greedy.len());
    let mut group_start = 0usize;
    let widths = LineWidthIndex::new(clusters);
    let context = BalanceContext {
        clusters,
        breaks,
        max_width,
        no_break_ranges,
        phrase_ranges,
        widths: &widths,
    };

    for (index, line) in greedy.iter().enumerate() {
        if !line.hard_break {
            continue;
        }

        let group = &greedy[group_start..=index];
        let balanced = if group.len() > 1 {
            balance_paragraph(
                &context,
                group[0].start,
                group.last().expect("non-empty greedy group").end,
                group.len(),
            )
        } else {
            None
        };

        if let Some(mut lines) = balanced {
            if let Some(last) = lines.last_mut() {
                last.hard_break = true;
            }
            result.extend(lines);
        } else {
            result.extend_from_slice(group);
        }
        group_start = index + 1;
    }

    if group_start < greedy.len() {
        result.extend_from_slice(&greedy[group_start..]);
    }
    result
}

fn balance_paragraph(
    context: &BalanceContext<'_>,
    paragraph_start: usize,
    paragraph_end: usize,
    line_count: usize,
) -> Option<Vec<LineRange>> {
    let mut boundaries = vec![BalanceBoundary {
        cluster_index: paragraph_start,
        legal: true,
        discouraged: false,
    }];

    for cluster_index in paragraph_start + 1..=paragraph_end {
        let previous = &context.clusters[cluster_index - 1];
        if cluster_index != paragraph_end
            && break_forbidden(previous.utf16_end, context.no_break_ranges)
        {
            continue;
        }
        boundaries.push(BalanceBoundary {
            cluster_index,
            legal: cluster_index == paragraph_end
                || context.breaks.contains_key(&previous.utf8_end),
            discouraged: cluster_index != paragraph_end
                && break_discouraged(previous.utf16_end, context.phrase_ranges),
        });
    }

    if boundaries.len() <= line_count {
        return None;
    }
    let estimated_transitions = line_count
        .saturating_mul(boundaries.len())
        .saturating_mul(boundaries.len());
    if estimated_transitions > MAX_BALANCE_TRANSITIONS {
        return None;
    }

    let paragraph_width = context.widths.content_width(paragraph_start, paragraph_end);
    let ideal_width = (paragraph_width / line_count as f32).min(context.max_width);
    let boundary_count = boundaries.len();
    let mut scores = vec![vec![None; boundary_count]; line_count + 1];
    let mut previous = vec![vec![None; boundary_count]; line_count + 1];
    scores[0][0] = Some(BalanceScore::ZERO);

    for used_lines in 1..=line_count {
        for end_boundary in 1..boundary_count {
            let remaining_boundaries = boundary_count - 1 - end_boundary;
            let remaining_lines = line_count - used_lines;
            if remaining_boundaries < remaining_lines {
                continue;
            }

            for start_boundary in 0..end_boundary {
                let Some(score) = scores[used_lines - 1][start_boundary] else {
                    continue;
                };
                let start = boundaries[start_boundary].cluster_index;
                let end = boundaries[end_boundary].cluster_index;
                if start >= end {
                    continue;
                }

                let width = context.widths.content_width(start, end);
                let emergency =
                    end_boundary + 1 < boundary_count && !boundaries[end_boundary].legal;
                let discouraged =
                    end_boundary + 1 < boundary_count && boundaries[end_boundary].discouraged;
                let candidate = score.add(
                    width,
                    ideal_width,
                    context.max_width,
                    emergency,
                    discouraged,
                );
                let replace = scores[used_lines][end_boundary]
                    .map(|current| candidate.is_better_than(current))
                    .unwrap_or(true);
                if replace {
                    scores[used_lines][end_boundary] = Some(candidate);
                    previous[used_lines][end_boundary] = Some(start_boundary);
                }
            }
        }
    }

    scores[line_count][boundary_count - 1]?;
    let mut ranges = Vec::with_capacity(line_count);
    let mut used_lines = line_count;
    let mut end_boundary = boundary_count - 1;
    while used_lines > 0 {
        let start_boundary = previous[used_lines][end_boundary]?;
        ranges.push(LineRange {
            start: boundaries[start_boundary].cluster_index,
            end: boundaries[end_boundary].cluster_index,
            hard_break: false,
        });
        end_boundary = start_boundary;
        used_lines -= 1;
    }
    ranges.reverse();
    Some(ranges)
}

/// Reorders a line's logical clusters into visual order (bidi rule L2, with the
/// L1 trailing-whitespace reset) and assigns x-positions, producing a
/// [`LayoutLine`].
#[allow(clippy::too_many_arguments)]
fn build_line(
    logical: &[RawCluster],
    base_level: Level,
    base_direction: TextDirection,
    line_index: usize,
    line_height: f32,
    ascent: f32,
    utf16: &Utf16Map,
    hard_break: bool,
) -> LayoutLine {
    // Rule L1: reset trailing whitespace clusters to the base level so they
    // reorder to the trailing (line-relative) edge.
    let mut effective: Vec<Level> = logical
        .iter()
        .map(|c| Level::new(c.level).unwrap())
        .collect();
    for idx in (0..logical.len()).rev() {
        if logical[idx].is_whitespace {
            effective[idx] = base_level;
        } else {
            break;
        }
    }

    let visual_order = BidiInfo::reorder_visual(&effective);

    // Trailing whitespace advance (logical end of line) is excluded from width.
    let mut trailing_whitespace = 0.0f32;
    for cluster in logical.iter().rev() {
        if cluster.is_whitespace {
            trailing_whitespace += total_advance(cluster);
        } else {
            break;
        }
    }

    // Ruby base expansion is only defined for horizontal LTR text, so applying
    // the logical leading/trailing spaces in this visual-order walk is fine.
    let mut clusters = Vec::with_capacity(logical.len());
    let mut pen = 0.0f32;
    for &logical_index in &visual_order {
        let raw = &logical[logical_index];
        pen += raw.leading_space;
        clusters.push(ShapedCluster {
            source: SourceRange::new(raw.utf8_start, raw.utf8_end, utf16),
            font_id: raw.font_id,
            direction: direction_of(Level::new(raw.level).unwrap_or(base_level)),
            script: raw.script.clone(),
            level: raw.level,
            glyphs: raw.glyphs.clone(),
            x: pen,
            advance: raw.advance,
            bounds: raw.bounds,
            is_whitespace: raw.is_whitespace,
            leading_space: raw.leading_space,
            trailing_space: raw.trailing_space,
        });
        pen += raw.advance + raw.trailing_space;
    }

    let width = (pen - trailing_whitespace).max(0.0);

    let utf8_start = logical.iter().map(|c| c.utf8_start).min().unwrap_or(0);
    let utf8_end = logical.iter().map(|c| c.utf8_end).max().unwrap_or(0);
    let top = line_index as f32 * line_height;

    LayoutLine {
        clusters,
        source: SourceRange::new(utf8_start, utf8_end, utf16),
        width,
        trailing_whitespace,
        top,
        baseline: top + ascent,
        height: line_height,
        hard_break,
        direction: base_direction,
    }
}
