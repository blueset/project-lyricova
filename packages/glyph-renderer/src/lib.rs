//! `glyph-renderer`: a WASM text shaping/layout proof of concept for
//! Project Lyricova, backed by [`rustybuzz`] (a pure-Rust HarfBuzz port).
//!
//! See the crate-level docs on [`shaping`] for the single-run shaping engine
//! and [`layout`] for the deterministic horizontal paragraph layout (bidi,
//! UAX #14 line breaking, width wrapping, and safe cluster grouping) built on
//! top of it, [`outline`] for scalable per-glyph vector outline extraction,
//! and the package `README.md` for build instructions and the rationale behind
//! choosing rustybuzz over `cosmic-text`.

pub mod bindings;
pub mod layout;
pub mod outline;
pub mod shaping;

pub use layout::{
    layout_paragraph, line_break_opportunities, ClusterBounds, LayoutLine, LineBreak,
    LineWrapStrategy, ParagraphLayout, ParagraphRequest, ShapedCluster, SourceRange,
};
pub use outline::{glyph_outline, GlyphBounds, GlyphOutline, GlyphOutlineRequest, PathCommand};
pub use shaping::{
    shape, FontId, FontMetrics, FontRegistry, PositionedGlyph, ShapeError, ShapeRequest,
    ShapeResult, TextDirection,
};
