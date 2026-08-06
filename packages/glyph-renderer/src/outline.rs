//! Scalable glyph *outline* (vector path) extraction, built directly on
//! [`rustybuzz`]'s re-exported [`ttf_parser`] face outlining support.
//!
//! Where [`crate::shaping`] and [`crate::layout`] answer "*which* glyph goes
//! *where*" (glyph ids, advances, cluster ranges, metrics-derived bounds),
//! this module answers "*what does a glyph look like*": it returns the glyph's
//! filled contour as a list of [`PathCommand`]s (move/line/quadratic/cubic/
//! close) plus a tight ink bounding box, both already scaled to the requested
//! `font_size`. A browser renderer can feed these commands straight into a
//! `Path2D` (their names/argument order deliberately mirror the Canvas2D path
//! API) without ever touching font-unit coordinates itself.
//!
//! Like the rest of this crate, nothing here depends on `wasm-bindgen`, so it
//! is exercised natively with a plain `cargo test`; [`crate::bindings`] adapts
//! it to JS.
//!
//! ## Coordinate system
//!
//! Coordinates follow the **font convention**: the origin is the glyph's pen
//! position on the baseline and **`y` grows upwards**. This matches
//! [`crate::layout::ClusterBounds`] and the `y_offset` sign of a
//! [`crate::shaping::PositionedGlyph`]. A canvas renderer (whose `y` grows
//! *down*) is responsible for the axis flip; the outline is returned in the
//! same space the shaper positions glyphs in so the two compose directly.
//!
//! ## Scope and known limitations
//!
//! Only **monochrome** vector outlines (TrueType `glyf` / CFF / CFF2, including
//! the variable-font-interpolated result when `variations` are supplied) are
//! extracted. Color glyphs (`COLR`/`CPAL`), bitmap strikes (`CBDT`/`sbix`) and
//! `SVG ` glyphs are intentionally out of scope and yield `None` (the same as
//! a blank glyph) - callers wanting color must read those tables themselves.

use rustybuzz::ttf_parser::{GlyphId, OutlineBuilder, Rect};
use serde::{Deserialize, Serialize};

use crate::shaping::{parse_variations, FontId, FontRegistry, ShapeError};

/// A single vector path drawing command, in `font_size` units with `y`
/// pointing up (see the [module docs](self) for the coordinate system).
///
/// The variants and their fields mirror the Canvas2D `Path2D`/`CanvasPath`
/// methods (`moveTo`, `lineTo`, `quadraticCurveTo`, `bezierCurveTo`,
/// `closePath`) so a renderer can dispatch on `type` and forward the numbers
/// unchanged.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PathCommand {
    /// Begin a new sub-path at `(x, y)`.
    MoveTo { x: f32, y: f32 },
    /// Straight line from the current point to `(x, y)`.
    LineTo { x: f32, y: f32 },
    /// Quadratic Bézier to `(x, y)` with control point `(x1, y1)`.
    QuadTo { x1: f32, y1: f32, x: f32, y: f32 },
    /// Cubic Bézier to `(x, y)` with control points `(x1, y1)` and `(x2, y2)`.
    CubicTo {
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        x: f32,
        y: f32,
    },
    /// Close the current sub-path back to its start.
    Close,
}

/// Axis-aligned tight ink bounding box of a glyph outline, in `font_size`
/// units with `y` pointing up (font convention). Matches the field layout of
/// [`crate::layout::ClusterBounds`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlyphBounds {
    pub x_min: f32,
    pub x_max: f32,
    pub y_min: f32,
    pub y_max: f32,
}

/// A registered font glyph's scalable outline, ready to be turned into a
/// `Path2D`. See the [module docs](self) for the coordinate system and scope.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlyphOutline {
    /// Drawing commands in order, already scaled to `font_size` (y-up).
    pub commands: Vec<PathCommand>,
    /// Tight ink bounding box of the outline, in the same units as `commands`.
    pub bounds: GlyphBounds,
    /// The font's units-per-em (design grid), for reference / re-scaling.
    pub units_per_em: u16,
    /// The font size the `commands`/`bounds` were scaled to.
    pub font_size: f32,
    /// The scale factor applied to raw font units: `font_size / units_per_em`.
    pub scale: f32,
}

/// A request to extract one glyph's outline from a registered font.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlyphOutlineRequest {
    /// The font to read the glyph from (as returned by [`FontRegistry::register`]).
    pub font_id: FontId,
    /// The glyph id to outline (e.g. from a shaped [`crate::shaping::PositionedGlyph`]).
    pub glyph_id: u32,
    /// Font size the outline is scaled to (same units the shaper used).
    pub font_size: f32,
    /// Optional variable-font axis settings, e.g. `"wght=650"`. **Must match
    /// the values used when shaping** so the outline lines up with the shaped
    /// advances/offsets. Ignored axes are silently dropped (standard
    /// variable-font behavior).
    #[serde(default)]
    pub variations: Vec<String>,
}

/// Collects [`OutlineBuilder`] callbacks into [`PathCommand`]s, scaling every
/// coordinate from font units to `font_size` units as it goes. `y` is left in
/// the font's y-up space (no axis flip here - see the [module docs](self)).
struct PathCollector {
    scale: f32,
    commands: Vec<PathCommand>,
}

impl OutlineBuilder for PathCollector {
    fn move_to(&mut self, x: f32, y: f32) {
        self.commands.push(PathCommand::MoveTo {
            x: x * self.scale,
            y: y * self.scale,
        });
    }

    fn line_to(&mut self, x: f32, y: f32) {
        self.commands.push(PathCommand::LineTo {
            x: x * self.scale,
            y: y * self.scale,
        });
    }

    fn quad_to(&mut self, x1: f32, y1: f32, x: f32, y: f32) {
        self.commands.push(PathCommand::QuadTo {
            x1: x1 * self.scale,
            y1: y1 * self.scale,
            x: x * self.scale,
            y: y * self.scale,
        });
    }

    fn curve_to(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, x: f32, y: f32) {
        self.commands.push(PathCommand::CubicTo {
            x1: x1 * self.scale,
            y1: y1 * self.scale,
            x2: x2 * self.scale,
            y2: y2 * self.scale,
            x: x * self.scale,
            y: y * self.scale,
        });
    }

    fn close(&mut self) {
        self.commands.push(PathCommand::Close);
    }
}

/// Extracts the scalable outline of `request.glyph_id` from the font
/// `request.font_id`, scaled to `request.font_size`.
///
/// Returns `Ok(None)` when the glyph has **no drawable outline** - i.e. a
/// blank glyph such as a space, or a glyph that is only defined via color /
/// bitmap / SVG tables this monochrome extractor ignores (see the
/// [module docs](self)).
///
/// # Errors
///
/// - [`ShapeError::UnknownFont`] if `font_id` was never registered.
/// - [`ShapeError::InvalidFont`] if the stored bytes fail to re-parse.
/// - [`ShapeError::InvalidInput`] if `font_size` is not a positive finite
///   number, if `glyph_id` is outside the font's glyph range, or if a
///   `variations` string cannot be parsed.
pub fn glyph_outline(
    registry: &FontRegistry,
    request: &GlyphOutlineRequest,
) -> Result<Option<GlyphOutline>, ShapeError> {
    if !request.font_size.is_finite() || request.font_size <= 0.0 {
        return Err(ShapeError::InvalidInput(format!(
            "font_size must be a positive, finite number, got {}",
            request.font_size
        )));
    }

    // Parse (and validate) variations before any face work so a bad axis
    // string is reported the same way as elsewhere in the crate.
    let variations = parse_variations(&request.variations)?;

    // Resolves to `UnknownFont`/`InvalidFont` for a bad id / unparsable bytes.
    let mut face = registry.face(request.font_id)?;

    let glyph_count = face.number_of_glyphs();
    if request.glyph_id >= u32::from(glyph_count) {
        return Err(ShapeError::InvalidInput(format!(
            "glyph id {} is out of range for font {} ({} glyphs)",
            request.glyph_id, request.font_id, glyph_count
        )));
    }

    if !variations.is_empty() {
        face.set_variations(&variations);
    }

    let units_per_em = face.units_per_em().max(1);
    let scale = request.font_size / units_per_em as f32;

    let mut collector = PathCollector {
        scale,
        commands: Vec::new(),
    };
    let rect = face.outline_glyph(GlyphId(request.glyph_id as u16), &mut collector);

    // A glyph with no contours (whitespace, or a color/bitmap/SVG-only glyph)
    // has no monochrome outline to draw: report it uniformly as `None`
    // regardless of whether the backend returned a zero-sized rect or nothing.
    if collector.commands.is_empty() {
        return Ok(None);
    }

    let bounds = match rect {
        Some(rect) => scale_rect(rect, scale),
        // Defensive: a non-empty path with no reported rect (not expected for
        // `glyf`/CFF) still gets a valid, if conservative, box from its points.
        None => bounds_from_commands(&collector.commands),
    };

    Ok(Some(GlyphOutline {
        commands: collector.commands,
        bounds,
        units_per_em: units_per_em as u16,
        font_size: request.font_size,
        scale,
    }))
}

fn scale_rect(rect: Rect, scale: f32) -> GlyphBounds {
    GlyphBounds {
        x_min: rect.x_min as f32 * scale,
        x_max: rect.x_max as f32 * scale,
        y_min: rect.y_min as f32 * scale,
        y_max: rect.y_max as f32 * scale,
    }
}

/// Conservative bounding box over every command endpoint and control point.
/// Only used as a fallback when the outliner doesn't report a tight rect.
fn bounds_from_commands(commands: &[PathCommand]) -> GlyphBounds {
    let mut x_min = f32::INFINITY;
    let mut x_max = f32::NEG_INFINITY;
    let mut y_min = f32::INFINITY;
    let mut y_max = f32::NEG_INFINITY;

    let mut include = |x: f32, y: f32| {
        x_min = x_min.min(x);
        x_max = x_max.max(x);
        y_min = y_min.min(y);
        y_max = y_max.max(y);
    };

    for command in commands {
        match *command {
            PathCommand::MoveTo { x, y } | PathCommand::LineTo { x, y } => include(x, y),
            PathCommand::QuadTo { x1, y1, x, y } => {
                include(x1, y1);
                include(x, y);
            }
            PathCommand::CubicTo {
                x1,
                y1,
                x2,
                y2,
                x,
                y,
            } => {
                include(x1, y1);
                include(x2, y2);
                include(x, y);
            }
            PathCommand::Close => {}
        }
    }

    if x_min > x_max {
        return GlyphBounds {
            x_min: 0.0,
            x_max: 0.0,
            y_min: 0.0,
            y_max: 0.0,
        };
    }

    GlyphBounds {
        x_min,
        x_max,
        y_min,
        y_max,
    }
}
