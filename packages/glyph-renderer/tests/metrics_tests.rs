//! Integration tests for per-font vertical metrics
//! ([`glyph_renderer::FontRegistry::font_metrics`]), using the existing
//! variable fonts in `packages/api/src/fonts/` directly.
//!
//! The values asserted here are the fonts' *default-instance* design-unit
//! metrics (all three fonts are 1000-upem), measured directly from the tables.
//! They run natively via plain `cargo test` - no wasm32 toolchain or browser.

use glyph_renderer::{FontMetrics, FontRegistry, ShapeError};

/// Latin variable font; its `hhea` and `OS/2` sTypo metrics agree.
const MONA_SANS_VF: &[u8] = include_bytes!("../../api/src/fonts/Mona-Sans-VF.ttf");
/// Pan-CJK variable font; its `OS/2` sTypo box (the ideographic em box) is
/// much tighter than its loose `hhea` line metrics - the reason this API exists.
const SOURCE_HAN_SANS_VF: &[u8] = include_bytes!("../../api/src/fonts/SourceHanSans-VF.otf");
/// Thai variable font; like Mona Sans its `hhea` and sTypo metrics agree.
const NOTO_SANS_THAI_VF: &[u8] = include_bytes!("../../api/src/fonts/NotoSansThai-VF.ttf");

fn metrics_of(font: &[u8]) -> FontMetrics {
    let mut registry = FontRegistry::new();
    let id = registry.register(font.to_vec(), 0).unwrap();
    registry.font_metrics(id).unwrap()
}

#[test]
fn source_han_sans_typo_box_differs_from_hhea_line_metrics() {
    let m = metrics_of(SOURCE_HAN_SANS_VF);

    // `hhea` carries loose line metrics for this pan-CJK face...
    assert_eq!(m.ascender, 1160);
    assert_eq!(m.descender, -288);

    // ...while `sTypo` is the ideographic em box (880 up / -120 down per 1000
    // upem): a far tighter, script-neutral anchor for placing ruby relative to
    // the base text. Both must be readable and genuinely different - that
    // divergence is the whole point of exposing per-font metrics.
    assert_eq!(m.typo_ascender, Some(880));
    assert_eq!(m.typo_descender, Some(-120));
    assert_ne!(i32::from(m.ascender), i32::from(m.typo_ascender.unwrap()));
    assert_ne!(i32::from(m.descender), i32::from(m.typo_descender.unwrap()));
}

#[test]
fn mona_sans_hhea_and_typo_metrics_are_identical() {
    let m = metrics_of(MONA_SANS_VF);

    // A Latin face whose `hhea` and `OS/2` sTypo metrics agree, so a
    // Latin-only chain is unaffected by choosing `typo*` over `hhea`.
    assert_eq!(m.ascender, 1090);
    assert_eq!(m.descender, -320);
    assert_eq!(m.typo_ascender, Some(1090));
    assert_eq!(m.typo_descender, Some(-320));
    assert_eq!(i32::from(m.ascender), i32::from(m.typo_ascender.unwrap()));
    assert_eq!(i32::from(m.descender), i32::from(m.typo_descender.unwrap()));
}

#[test]
fn noto_sans_thai_hhea_and_typo_metrics_are_identical() {
    let m = metrics_of(NOTO_SANS_THAI_VF);

    // Another script whose `hhea` and sTypo metrics agree.
    assert_eq!(m.ascender, 1061);
    assert_eq!(m.descender, -450);
    assert_eq!(m.typo_ascender, Some(1061));
    assert_eq!(m.typo_descender, Some(-450));
}

#[test]
fn units_per_em_is_reported() {
    // All three fixtures are 1000-upem designs; `units_per_em` scales the raw
    // design units into em-relative values.
    assert_eq!(metrics_of(MONA_SANS_VF).units_per_em, 1000);
    assert_eq!(metrics_of(SOURCE_HAN_SANS_VF).units_per_em, 1000);
    assert_eq!(metrics_of(NOTO_SANS_THAI_VF).units_per_em, 1000);
}

#[test]
fn line_gap_and_typo_line_gap_are_readable() {
    // Present (and zero) for every fixture; asserted so the accessor is
    // exercised for all seven fields, not just ascent/descent.
    let m = metrics_of(SOURCE_HAN_SANS_VF);
    assert_eq!(m.line_gap, 0);
    assert_eq!(m.typo_line_gap, Some(0));
}

#[test]
fn unknown_font_id_reports_unknown_font() {
    let registry = FontRegistry::new();
    let err = registry.font_metrics(42).unwrap_err();
    assert_eq!(err, ShapeError::UnknownFont(42));
}
