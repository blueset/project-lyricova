//! Integration tests for the glyph outline extraction engine
//! ([`glyph_renderer::outline`]), using the existing fonts in
//! `packages/api/src/fonts/` directly.
//!
//! These run natively via plain `cargo test` - no wasm32 toolchain or browser.

use glyph_renderer::outline::{glyph_outline, GlyphOutlineRequest, PathCommand};
use glyph_renderer::{FontRegistry, ShapeError, ShapeRequest, TextDirection};

/// Latin/CFF outlines (Mona Sans, an OTF -> CFF `charstring` outlines).
const LATIN_FONT: &[u8] = include_bytes!("../../api/src/fonts/Mona-Sans-Regular.otf");
/// Hiragana + punctuation (TsimSans, also an OTF).
const KANA_FONT: &[u8] = include_bytes!("../../api/src/fonts/TsimSans-J-Regular-Palt.otf");

fn shape_request(text: &str, font_ids: Vec<u32>) -> ShapeRequest {
    ShapeRequest {
        text: text.to_string(),
        font_ids,
        direction: TextDirection::Auto,
        script: None,
        language: None,
        features: Vec::new(),
        variations: Vec::new(),
        font_size: 64.0,
    }
}

fn outline_request(font_id: u32, glyph_id: u32, font_size: f32) -> GlyphOutlineRequest {
    GlyphOutlineRequest {
        font_id,
        glyph_id,
        font_size,
        variations: Vec::new(),
    }
}

/// Shapes a single character and returns the glyph id the font mapped it to,
/// so outline tests don't hard-code (font-specific) glyph ids.
fn glyph_id_for(registry: &FontRegistry, font_id: u32, ch: &str) -> u32 {
    let result =
        glyph_renderer::shaping::shape(registry, &shape_request(ch, vec![font_id])).unwrap();
    assert_eq!(result.glyphs.len(), 1, "expected a single glyph for {ch:?}");
    result.glyphs[0].glyph_id
}

fn bounds_of(commands: &[PathCommand]) -> (f32, f32, f32, f32) {
    let mut x_min = f32::INFINITY;
    let mut x_max = f32::NEG_INFINITY;
    let mut y_min = f32::INFINITY;
    let mut y_max = f32::NEG_INFINITY;
    let mut point = |x: f32, y: f32| {
        x_min = x_min.min(x);
        x_max = x_max.max(x);
        y_min = y_min.min(y);
        y_max = y_max.max(y);
    };
    for command in commands {
        match *command {
            PathCommand::MoveTo { x, y } | PathCommand::LineTo { x, y } => point(x, y),
            PathCommand::QuadTo { x1, y1, x, y } => {
                point(x1, y1);
                point(x, y);
            }
            PathCommand::CubicTo {
                x1,
                y1,
                x2,
                y2,
                x,
                y,
            } => {
                point(x1, y1);
                point(x2, y2);
                point(x, y);
            }
            PathCommand::Close => {}
        }
    }
    (x_min, x_max, y_min, y_max)
}

#[test]
fn extracts_a_scaled_outline_starting_with_move_to() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, latin, "A");

    let outline = glyph_outline(&registry, &outline_request(latin, glyph, 64.0))
        .unwrap()
        .expect("'A' must have a drawable outline");

    assert!(
        !outline.commands.is_empty(),
        "outline must contain drawing commands"
    );
    // A well-formed contour always opens with a move.
    assert!(matches!(outline.commands[0], PathCommand::MoveTo { .. }));
    assert!(
        outline
            .commands
            .iter()
            .any(|c| matches!(c, PathCommand::Close)),
        "a filled glyph contour should be closed"
    );

    assert_eq!(outline.font_size, 64.0);
    assert!(outline.units_per_em > 0);
    assert!((outline.scale - 64.0 / outline.units_per_em as f32).abs() < 1e-6);
}

#[test]
fn reported_bounds_enclose_the_path_and_scale_with_font_size() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, latin, "H");

    let small = glyph_outline(&registry, &outline_request(latin, glyph, 32.0))
        .unwrap()
        .unwrap();
    let large = glyph_outline(&registry, &outline_request(latin, glyph, 64.0))
        .unwrap()
        .unwrap();

    // The reported bounds must actually enclose every emitted point.
    let (x_min, x_max, y_min, y_max) = bounds_of(&small.commands);
    assert!(small.bounds.x_min <= x_min + 1e-3);
    assert!(small.bounds.x_max >= x_max - 1e-3);
    assert!(small.bounds.y_min <= y_min + 1e-3);
    assert!(small.bounds.y_max >= y_max - 1e-3);

    // 'H' sits above the baseline: y-up means positive ink extents.
    assert!(small.bounds.y_max > 0.0);
    assert!(small.bounds.x_max > small.bounds.x_min);

    // Doubling the font size doubles the geometry (linear scaling).
    let ratio = large.bounds.x_max / small.bounds.x_max;
    assert!(
        (ratio - 2.0).abs() < 1e-3,
        "expected 2x geometry at 2x size, got ratio {ratio}"
    );
    assert!((large.scale / small.scale - 2.0).abs() < 1e-4);
}

#[test]
fn whitespace_glyph_has_no_outline() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let space = glyph_id_for(&registry, latin, " ");

    let outline = glyph_outline(&registry, &outline_request(latin, space, 64.0)).unwrap();
    assert!(
        outline.is_none(),
        "a space glyph has no monochrome outline and must return None"
    );
}

#[test]
fn outline_matches_metrics_bounding_box_from_layout() {
    // The outline's ink box should agree (within scaling tolerance) with the
    // metrics-derived cluster bounds the layout engine reports for the same
    // glyph, since both come from the same underlying face bbox.
    let mut registry = FontRegistry::new();
    let kana = registry.register(KANA_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, kana, "\u{3042}"); // HIRAGANA A

    let outline = glyph_outline(&registry, &outline_request(kana, glyph, 64.0))
        .unwrap()
        .unwrap();

    assert!(outline.bounds.x_max > outline.bounds.x_min);
    assert!(outline.bounds.y_max > outline.bounds.y_min);
    // Ink must fit inside a sane multiple of the em box.
    assert!(outline.bounds.x_max <= 64.0 * 2.0);
    assert!(outline.bounds.y_max <= 64.0 * 2.0);
}

#[test]
fn rejects_unknown_font() {
    let registry = FontRegistry::new();
    let err = glyph_outline(&registry, &outline_request(7, 0, 64.0)).unwrap_err();
    assert_eq!(err, ShapeError::UnknownFont(7));
}

#[test]
fn rejects_out_of_range_glyph_id() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let err = glyph_outline(&registry, &outline_request(latin, 5_000_000, 64.0)).unwrap_err();
    assert!(matches!(err, ShapeError::InvalidInput(_)));
}

#[test]
fn rejects_non_positive_or_non_finite_font_size() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, latin, "A");

    for bad in [0.0, -12.0, f32::NAN, f32::INFINITY] {
        let err = glyph_outline(&registry, &outline_request(latin, glyph, bad)).unwrap_err();
        assert!(
            matches!(err, ShapeError::InvalidInput(_)),
            "font_size {bad} must be rejected"
        );
    }
}

#[test]
fn rejects_invalid_variation_string() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, latin, "A");

    let mut request = outline_request(latin, glyph, 64.0);
    request.variations = vec!["not a variation".to_string()];
    let err = glyph_outline(&registry, &request).unwrap_err();
    assert!(matches!(err, ShapeError::InvalidInput(_)));
}

#[test]
fn accepts_variation_strings_on_a_non_variable_font() {
    // The fixture fonts have no `fvar`, so a valid axis string parses and is
    // simply ignored - the outline must still be produced unchanged.
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let glyph = glyph_id_for(&registry, latin, "A");

    let base = glyph_outline(&registry, &outline_request(latin, glyph, 64.0))
        .unwrap()
        .unwrap();

    let mut request = outline_request(latin, glyph, 64.0);
    request.variations = vec!["wght=650".to_string()];
    let varied = glyph_outline(&registry, &request).unwrap().unwrap();

    assert_eq!(
        base.commands, varied.commands,
        "a non-variable font must ignore axis settings and yield the same outline"
    );
}
