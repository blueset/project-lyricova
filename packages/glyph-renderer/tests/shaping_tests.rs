//! Integration tests for the core shaping engine, using existing repo fonts
//! directly from `packages/api/src/fonts/` without duplicating the binaries.
//!
//! These run on the host target via plain `cargo test` - no wasm32 toolchain
//! or browser is required.

use glyph_renderer::{FontRegistry, ShapeError, ShapeRequest, TextDirection};

/// Latin coverage (has `kern`/`liga` OpenType features, no Hiragana/Kanji).
const LATIN_FONT: &[u8] = include_bytes!("../../api/src/fonts/Mona-Sans-Regular.otf");
/// Hiragana + punctuation coverage only (no Latin, no Kanji).
const KANA_FONT: &[u8] = include_bytes!("../../api/src/fonts/TsimSans-J-Regular-Palt.otf");

fn request(text: &str, font_ids: Vec<u32>) -> ShapeRequest {
    ShapeRequest {
        text: text.to_string(),
        font_ids,
        direction: TextDirection::Auto,
        script: None,
        language: None,
        features: Vec::new(),
        variations: Vec::new(),
        font_size: 16.0,
    }
}

#[test]
fn registers_valid_fonts_and_rejects_garbage() {
    let mut registry = FontRegistry::new();
    let id = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    assert!(registry.contains(id));
    assert_eq!(registry.len(), 1);

    let err = registry.register(b"not a font".to_vec(), 0).unwrap_err();
    assert_eq!(err, ShapeError::InvalidFont);
}

#[test]
fn shapes_basic_latin_text_with_correct_clusters_and_advances() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    let result = glyph_renderer::shaping::shape(&registry, &request("Hi", vec![latin])).unwrap();

    assert_eq!(result.glyphs.len(), 2);
    assert_eq!(result.direction, TextDirection::Ltr);
    assert!(result.missing_font_ranges.is_empty());

    assert_eq!(result.glyphs[0].cluster, 0);
    assert_eq!(result.glyphs[0].cluster_end, 1);
    assert_eq!(result.glyphs[0].font_id, latin);
    assert!(result.glyphs[0].x_advance > 0.0);

    assert_eq!(result.glyphs[1].cluster, 1);
    assert_eq!(result.glyphs[1].cluster_end, 2);
    assert!(result.glyphs[1].x_advance > 0.0);
}

#[test]
fn rejects_empty_text() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let err = glyph_renderer::shaping::shape(&registry, &request("", vec![latin])).unwrap_err();
    assert_eq!(err, ShapeError::EmptyText);
}

#[test]
fn rejects_empty_font_chain() {
    let registry = FontRegistry::new();
    let err = glyph_renderer::shaping::shape(&registry, &request("Hi", vec![])).unwrap_err();
    assert_eq!(err, ShapeError::EmptyFontChain);
}

#[test]
fn rejects_unknown_font_id() {
    let registry = FontRegistry::new();
    let err = glyph_renderer::shaping::shape(&registry, &request("Hi", vec![42])).unwrap_err();
    assert_eq!(err, ShapeError::UnknownFont(42));
}

#[test]
fn explicit_fallback_selects_first_covering_font_in_order() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let kana = registry.register(KANA_FONT.to_vec(), 0).unwrap();

    // "A" (Latin, only in `latin`) + "あい" (Hiragana "ai", only in `kana`).
    let text = "A\u{3042}\u{3044}";
    let result =
        glyph_renderer::shaping::shape(&registry, &request(text, vec![latin, kana])).unwrap();

    assert!(result.missing_font_ranges.is_empty());
    assert_eq!(result.glyphs.len(), 3);
    assert_eq!(result.glyphs[0].font_id, latin);
    assert_eq!(result.glyphs[1].font_id, kana);
    assert_eq!(result.glyphs[2].font_id, kana);

    // Fallback resolves coverage per-glyph independently of chain order:
    // "A" is still only covered by `latin`, so reversing the chain order
    // doesn't change which font renders it.
    let result_swapped =
        glyph_renderer::shaping::shape(&registry, &request(text, vec![kana, latin])).unwrap();
    assert_eq!(result_swapped.glyphs[0].font_id, latin);
}

#[test]
fn reports_missing_coverage_when_no_font_in_chain_has_a_glyph() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let kana = registry.register(KANA_FONT.to_vec(), 0).unwrap();

    // U+65E5 CJK IDEOGRAPH "日" - covered by neither fixture font.
    let text = "A\u{65E5}";
    let result =
        glyph_renderer::shaping::shape(&registry, &request(text, vec![latin, kana])).unwrap();

    assert_eq!(result.missing_font_ranges.len(), 1);
    let (start, end) = result.missing_font_ranges[0];
    assert_eq!(start, 1);
    assert_eq!(end, 1 + '\u{65E5}'.len_utf8() as u32);
    // The last font in the chain is used for the uncovered range.
    assert_eq!(result.glyphs[1].font_id, kana);
}

#[test]
fn explicit_direction_script_and_language_are_echoed_back_resolved() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    let mut req = request("Hi", vec![latin]);
    req.direction = TextDirection::Rtl;
    req.script = Some("Latn".to_string());
    req.language = Some("en-US".to_string());

    let result = glyph_renderer::shaping::shape(&registry, &req).unwrap();
    assert_eq!(result.direction, TextDirection::Rtl);
    assert_eq!(result.script, "Latn");
    assert_eq!(result.language.as_deref(), Some("en-us"));
}

#[test]
fn invalid_script_tag_is_reported_as_invalid_input() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    let mut req = request("Hi", vec![latin]);
    req.script = Some("".to_string());

    let err = glyph_renderer::shaping::shape(&registry, &req).unwrap_err();
    assert!(matches!(err, ShapeError::InvalidInput(_)));
}

#[test]
fn kern_feature_toggle_changes_total_advance() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    let mut with_kern = request("AV", vec![latin]);
    with_kern.features = vec!["kern=1".to_string()];
    let with_kern = glyph_renderer::shaping::shape(&registry, &with_kern).unwrap();
    let with_kern_advance: f32 = with_kern.glyphs.iter().map(|g| g.x_advance).sum();

    let mut without_kern = request("AV", vec![latin]);
    without_kern.features = vec!["-kern".to_string()];
    let without_kern = glyph_renderer::shaping::shape(&registry, &without_kern).unwrap();
    let without_kern_advance: f32 = without_kern.glyphs.iter().map(|g| g.x_advance).sum();

    assert_ne!(
        with_kern_advance, without_kern_advance,
        "expected Mona Sans's AV kerning pair to change total advance when toggled"
    );
}

#[test]
fn fallback_keeps_a_base_and_mark_grapheme_on_a_single_font() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let kana = registry.register(KANA_FONT.to_vec(), 0).unwrap();

    // "あ" (only in `kana`) + U+0301 COMBINING ACUTE (only in `latin`): a naive
    // per-scalar fallback would split this grapheme across the two fonts. The
    // grapheme-cluster-aware engine must keep the whole cluster on one font.
    let text = "\u{3042}\u{0301}";
    let result =
        glyph_renderer::shaping::shape(&registry, &request(text, vec![latin, kana])).unwrap();
    assert!(!result.glyphs.is_empty());
    assert!(
        result.glyphs.iter().all(|g| g.font_id == kana),
        "base+mark grapheme must not be split across fonts"
    );
    // The base (あ) is covered by `kana`, but the acute mark it lacks must be
    // reported as degraded coverage rather than silently claimed as covered.
    assert_eq!(result.missing_font_ranges, vec![(3, 5)]);
}

#[test]
fn shape_reports_utf16_cluster_offsets() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    // "a𝟙b": 𝟙 = U+1D7D9 is one astral char (4 UTF-8 bytes, 2 UTF-16 units).
    let text = "a\u{1D7D9}b";
    let result = glyph_renderer::shaping::shape(&registry, &request(text, vec![latin])).unwrap();
    let a = result.glyphs.iter().find(|g| g.cluster == 0).unwrap();
    assert_eq!((a.cluster_utf16, a.cluster_end_utf16), (0, 1));
    let astral = result.glyphs.iter().find(|g| g.cluster == 1).unwrap();
    assert_eq!((astral.cluster, astral.cluster_end), (1, 5));
    assert_eq!((astral.cluster_utf16, astral.cluster_end_utf16), (1, 3));
    let b = result.glyphs.iter().find(|g| g.cluster == 5).unwrap();
    assert_eq!((b.cluster_utf16, b.cluster_end_utf16), (3, 4));
}

#[test]
fn invalid_variation_string_is_reported_as_invalid_input() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    let mut req = request("Hi", vec![latin]);
    req.variations = vec!["not a variation".to_string()];

    let err = glyph_renderer::shaping::shape(&registry, &req).unwrap_err();
    assert!(matches!(err, ShapeError::InvalidInput(_)));
}

#[test]
fn rtl_run_with_font_fallback_returns_visual_order() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    let kana = registry.register(KANA_FONT.to_vec(), 0).unwrap();

    // "A" (mona) + "あ" (kana): two fallback segments. Shaped RTL, the run must
    // come back in true visual order (rightmost logical char drawn first, i.e.
    // the あ glyph precedes the A glyph in the output list).
    let mut req = request("A\u{3042}", vec![latin, kana]);
    req.direction = TextDirection::Rtl;
    let rtl = glyph_renderer::shaping::shape(&registry, &req).unwrap();
    assert_eq!(rtl.glyphs.len(), 2);
    assert_eq!(
        rtl.glyphs[0].cluster, 1,
        "あ (logical last) is drawn first for RTL"
    );
    assert_eq!(rtl.glyphs[0].font_id, kana);
    assert_eq!(
        rtl.glyphs[1].cluster, 0,
        "A (logical first) is drawn last for RTL"
    );
    assert_eq!(rtl.glyphs[1].font_id, latin);

    // The same run shaped LTR keeps logical order.
    let mut ltr = request("A\u{3042}", vec![latin, kana]);
    ltr.direction = TextDirection::Ltr;
    let ltr = glyph_renderer::shaping::shape(&registry, &ltr).unwrap();
    assert_eq!(ltr.glyphs[0].cluster, 0);
    assert_eq!(ltr.glyphs[1].cluster, 1);
}

#[test]
fn control_characters_emit_no_glyph_and_are_not_missing() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();

    // "a\nb": the newline must not shape to a `.notdef` glyph nor be reported
    // as missing coverage; only the 'a' and 'b' glyphs remain.
    let result = glyph_renderer::shaping::shape(&registry, &request("a\nb", vec![latin])).unwrap();
    assert_eq!(result.glyphs.len(), 2);
    assert!(result.glyphs.iter().all(|g| g.cluster != 1));
    assert!(result.missing_font_ranges.is_empty());
}

#[test]
fn rejects_non_finite_or_non_positive_font_size() {
    let mut registry = FontRegistry::new();
    let latin = registry.register(LATIN_FONT.to_vec(), 0).unwrap();
    for bad in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY, 0.0, -3.0] {
        let mut req = request("Hi", vec![latin]);
        req.font_size = bad;
        assert!(matches!(
            glyph_renderer::shaping::shape(&registry, &req).unwrap_err(),
            ShapeError::InvalidInput(_)
        ));
    }
}
