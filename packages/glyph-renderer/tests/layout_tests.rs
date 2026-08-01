//! Integration tests for the paragraph layout engine ([`glyph_renderer::layout`]):
//! bidi run ordering, UAX #14 line breaking / width wrapping, grapheme-aware
//! font fallback, ligature / combining-sequence cluster grouping, and the
//! UTF-8 <-> UTF-16 source-range mapping.
//!
//! These run natively via `cargo test` using the existing fonts in
//! `packages/api/src/fonts/` directly. Mixed
//! LTR/RTL ordering is exercised with Hebrew code points, which neither
//! fixture font covers: bidi levels come from Unicode data (font-independent),
//! so the *ordering* and *source ranges* are exact even though the Hebrew
//! glyphs themselves are `.notdef` - which additionally exercises the
//! missing-coverage reporting path.

use glyph_renderer::layout::{
    layout_paragraph, line_break_opportunities, LayoutLine, ParagraphRequest,
};
use glyph_renderer::{FontRegistry, LineWrapStrategy, ShapeError, TextDirection};

/// Latin coverage (has `kern`/`liga` OpenType features), no Hiragana/Kanji.
const LATIN_FONT: &[u8] = include_bytes!("../../api/src/fonts/Mona-Sans-Regular.otf");
/// Hiragana + Japanese punctuation coverage only (no Latin, no Kanji).
const KANA_FONT: &[u8] = include_bytes!("../../api/src/fonts/TsimSans-J-Regular-Palt.otf");

fn registry() -> (FontRegistry, u32, u32) {
    let mut reg = FontRegistry::new();
    let mona = reg.register(LATIN_FONT.to_vec(), 0).unwrap();
    let kana = reg.register(KANA_FONT.to_vec(), 0).unwrap();
    (reg, mona, kana)
}

fn para(text: &str, font_ids: Vec<u32>) -> ParagraphRequest {
    ParagraphRequest {
        text: text.to_string(),
        font_ids,
        base_direction: TextDirection::Auto,
        script: None,
        language: None,
        features: Vec::new(),
        variations: Vec::new(),
        font_size: 32.0,
        max_width: None,
        wrap_strategy: LineWrapStrategy::Greedy,
        line_height: None,
        no_break_ranges: Vec::new(),
        phrase_ranges: Vec::new(),
    }
}

/// UTF-8 start offsets of a line's clusters, in visual (left-to-right) order.
fn visual_utf8_starts(line: &LayoutLine) -> Vec<u32> {
    line.clusters.iter().map(|c| c.source.utf8_start).collect()
}

fn line_width_spread(lines: &[LayoutLine]) -> f32 {
    let min = lines
        .iter()
        .map(|line| line.width)
        .fold(f32::INFINITY, f32::min);
    let max = lines
        .iter()
        .map(|line| line.width)
        .fold(f32::NEG_INFINITY, f32::max);
    max - min
}

// --------------------------------------------------------------------------
// UTF-16 <-> UTF-8 source-range mapping
// --------------------------------------------------------------------------

#[test]
fn source_ranges_report_both_utf8_and_utf16_offsets() {
    let (reg, mona, kana) = registry();
    // "A" (1 byte / 1 u16) + "あ" (3 bytes / 1 u16) + "𝟙" U+1D7D9
    // (4 bytes / 2 u16, a surrogate pair) + "b" (1 byte / 1 u16).
    let layout = layout_paragraph(&reg, &para("A\u{3042}\u{1D7D9}b", vec![mona, kana])).unwrap();
    assert_eq!(layout.lines.len(), 1);
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 4);

    let ranges: Vec<_> = clusters
        .iter()
        .map(|c| {
            (
                c.source.utf8_start,
                c.source.utf8_end,
                c.source.utf16_start,
                c.source.utf16_end,
            )
        })
        .collect();
    assert_eq!(
        ranges,
        vec![
            (0, 1, 0, 1), // A
            (1, 4, 1, 2), // あ  (3 UTF-8 bytes, 1 UTF-16 unit)
            (4, 8, 2, 4), // 𝟙   (4 UTF-8 bytes, 2 UTF-16 units - surrogate pair)
            (8, 9, 4, 5), // b
        ]
    );
    // The astral character is uncovered by both fonts -> reported as missing,
    // in both coordinate systems.
    assert_eq!(layout.missing_font_ranges.len(), 1);
    let missing = layout.missing_font_ranges[0];
    assert_eq!((missing.utf8_start, missing.utf8_end), (4, 8));
    assert_eq!((missing.utf16_start, missing.utf16_end), (2, 4));
}

#[test]
fn positioned_glyphs_carry_utf16_cluster_offsets() {
    // The single-run shaping API also reports UTF-16 cluster offsets.
    use glyph_renderer::{shape, ShapeRequest};
    let (reg, mona, kana) = registry();
    let req = ShapeRequest {
        text: "A\u{3042}b".to_string(),
        font_ids: vec![mona, kana],
        direction: TextDirection::Ltr,
        script: None,
        language: None,
        features: Vec::new(),
        variations: Vec::new(),
        font_size: 16.0,
    };
    let result = shape(&reg, &req).unwrap();
    let a = result.glyphs.iter().find(|g| g.cluster == 0).unwrap();
    assert_eq!((a.cluster, a.cluster_end), (0, 1));
    assert_eq!((a.cluster_utf16, a.cluster_end_utf16), (0, 1));
    let kana_glyph = result.glyphs.iter().find(|g| g.cluster == 1).unwrap();
    assert_eq!((kana_glyph.cluster, kana_glyph.cluster_end), (1, 4));
    assert_eq!(
        (kana_glyph.cluster_utf16, kana_glyph.cluster_end_utf16),
        (1, 2)
    );
    let b = result.glyphs.iter().find(|g| g.cluster == 4).unwrap();
    assert_eq!((b.cluster_utf16, b.cluster_end_utf16), (2, 3));
}

#[test]
fn line_break_opportunities_report_utf8_and_utf16_and_mandatory() {
    // "𝟙\n" : U+1D7D9 (4 bytes / 2 u16) then a newline (mandatory break).
    let breaks = line_break_opportunities("\u{1D7D9}\n");
    let mandatory: Vec<_> = breaks.iter().filter(|b| b.mandatory).collect();
    assert!(!mandatory.is_empty());
    // The final opportunity is at end of text: utf8 = 5 bytes, utf16 = 3 units.
    let last = breaks.last().unwrap();
    assert_eq!(last.utf8_index, 5);
    assert_eq!(last.utf16_index, 3);
    assert!(last.mandatory);

    // Plain UAX #14: a space offers an allowed break, the end is mandatory.
    let hello = line_break_opportunities("Hello world");
    assert!(hello
        .iter()
        .any(|b| b.utf8_index == 6 && !b.mandatory && b.utf16_index == 6));
    assert!(hello.last().unwrap().mandatory);
}

// --------------------------------------------------------------------------
// Ligatures & combining sequences -> safe shaped clusters
// --------------------------------------------------------------------------

#[test]
fn ligature_becomes_a_single_cluster_spanning_both_characters() {
    let (reg, mona, _) = registry();
    // Mona Sans ligates "ff" (f_f.liga) with the default `liga` feature on.
    let layout = layout_paragraph(&reg, &para("ff", vec![mona])).unwrap();
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 1, "ff should ligate into one cluster");
    let cluster = &clusters[0];
    assert_eq!((cluster.source.utf8_start, cluster.source.utf8_end), (0, 2));
    assert_eq!(cluster.glyphs.len(), 1, "ligature is a single glyph");
    assert!(cluster.advance > 0.0);
    // Advance metadata equals the sum of the cluster's glyph advances.
    let sum: f32 = cluster.glyphs.iter().map(|g| g.x_advance).sum();
    assert!((cluster.advance - sum).abs() < 1e-3);
    // Ink bounds are non-degenerate for a visible ligature.
    assert!(cluster.bounds.x_max > cluster.bounds.x_min);
}

#[test]
fn disabling_liga_splits_the_ligature_into_two_clusters() {
    let (reg, mona, _) = registry();
    let mut req = para("ff", vec![mona]);
    req.features = vec!["-liga".to_string()];
    let layout = layout_paragraph(&reg, &req).unwrap();
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 2);
    assert_eq!(
        (clusters[0].source.utf8_start, clusters[0].source.utf8_end),
        (0, 1)
    );
    assert_eq!(
        (clusters[1].source.utf8_start, clusters[1].source.utf8_end),
        (1, 2)
    );
}

#[test]
fn combining_sequence_stays_one_cluster() {
    let (reg, mona, _) = registry();
    // "e" + U+0301 COMBINING ACUTE ACCENT -> one extended grapheme cluster.
    let layout = layout_paragraph(&reg, &para("e\u{0301}", vec![mona])).unwrap();
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 1, "base+mark must be a single cluster");
    let cluster = &clusters[0];
    assert_eq!((cluster.source.utf8_start, cluster.source.utf8_end), (0, 3));
    assert_eq!(
        (cluster.source.utf16_start, cluster.source.utf16_end),
        (0, 2)
    );
    assert!(!cluster.is_whitespace);
    // Mona Sans covers both `e` and the acute mark, so nothing is degraded.
    assert!(layout.missing_font_ranges.is_empty());
    // The cluster shaped under the Latin script.
    assert_eq!(cluster.script, "Latn");
}
// --------------------------------------------------------------------------
// Grapheme-cluster-aware font fallback
// --------------------------------------------------------------------------

#[test]
fn fallback_never_splits_a_base_and_mark_across_fonts() {
    let (reg, mona, kana) = registry();
    // "あ" is only in the kana font; U+0301 is only in the Latin font. A naive
    // per-scalar fallback would split this grapheme across both fonts. The
    // grapheme-aware engine must keep the whole cluster on a single font.
    let layout = layout_paragraph(&reg, &para("\u{3042}\u{0301}", vec![mona, kana])).unwrap();
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 1, "the whole grapheme is one cluster");
    let cluster = &clusters[0];
    assert_eq!(
        cluster.font_id, kana,
        "resolved to the font covering the base"
    );
    assert_eq!((cluster.source.utf8_start, cluster.source.utf8_end), (0, 5));
    // The base (あ) is covered by kana but the acute mark it lacks is reported
    // as degraded coverage - not silently claimed as fully covered.
    assert_eq!(layout.missing_font_ranges.len(), 1);
    let missing = layout.missing_font_ranges[0];
    assert_eq!((missing.utf8_start, missing.utf8_end), (3, 5));
    assert_eq!((missing.utf16_start, missing.utf16_end), (1, 2));
}

#[test]
fn fallback_assigns_each_script_run_to_its_covering_font() {
    let (reg, mona, kana) = registry();
    let layout = layout_paragraph(&reg, &para("A\u{3042}B", vec![mona, kana])).unwrap();
    let clusters = &layout.lines[0].clusters;
    assert_eq!(clusters.len(), 3);
    assert_eq!(clusters[0].font_id, mona); // A
    assert_eq!(clusters[1].font_id, kana); // あ
    assert_eq!(clusters[2].font_id, mona); // B
    assert!(layout.missing_font_ranges.is_empty());
}

// --------------------------------------------------------------------------
// Mixed LTR/RTL bidi run ordering
// --------------------------------------------------------------------------

#[test]
fn ltr_base_reorders_embedded_rtl_run_into_visual_order() {
    let (reg, mona, _) = registry();
    // "ab" + Hebrew "אבג" (U+05D0..U+05D2) + "cd", base LTR.
    let layout = layout_paragraph(&reg, &para("ab\u{05D0}\u{05D1}\u{05D2}cd", vec![mona])).unwrap();
    assert_eq!(layout.base_direction, TextDirection::Ltr);
    assert_eq!(layout.lines.len(), 1);
    let line = &layout.lines[0];
    // Visual order: a b [gimel bet alef] c d - the Hebrew run is reversed.
    assert_eq!(visual_utf8_starts(line), vec![0, 1, 6, 4, 2, 8, 9]);
    // Directions/levels follow the resolved bidi levels.
    let dirs: Vec<_> = line
        .clusters
        .iter()
        .map(|c| (c.direction, c.level))
        .collect();
    assert_eq!(
        dirs,
        vec![
            (TextDirection::Ltr, 0),
            (TextDirection::Ltr, 0),
            (TextDirection::Rtl, 1),
            (TextDirection::Rtl, 1),
            (TextDirection::Rtl, 1),
            (TextDirection::Ltr, 0),
            (TextDirection::Ltr, 0),
        ]
    );
    // x-positions increase monotonically across the visual line.
    let xs: Vec<f32> = line.clusters.iter().map(|c| c.x).collect();
    assert!(xs.windows(2).all(|w| w[1] > w[0]));
    // The uncovered Hebrew run is reported as missing.
    assert_eq!(layout.missing_font_ranges.len(), 1);
    assert_eq!(
        (
            layout.missing_font_ranges[0].utf8_start,
            layout.missing_font_ranges[0].utf8_end
        ),
        (2, 8)
    );
}

#[test]
fn rtl_base_places_the_logical_first_run_on_the_right() {
    let (reg, mona, _) = registry();
    let mut req = para("ab\u{05D0}\u{05D1}\u{05D2}cd", vec![mona]);
    req.base_direction = TextDirection::Rtl;
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert_eq!(layout.base_direction, TextDirection::Rtl);
    let line = &layout.lines[0];
    // Deterministic UAX #9 L2 reordering for base RTL.
    assert_eq!(visual_utf8_starts(line), vec![8, 9, 6, 4, 2, 0, 1]);
    // Latin runs are level 2 (LTR embedded in RTL), Hebrew is level 1.
    assert_eq!(line.clusters[0].level, 2);
    assert_eq!(line.clusters[0].direction, TextDirection::Ltr);
    assert_eq!(line.clusters[2].level, 1);
    assert_eq!(line.clusters[2].direction, TextDirection::Rtl);
}

#[test]
fn auto_base_direction_resolves_from_first_strong_character() {
    let (reg, mona, _) = registry();
    // First strong character is Hebrew -> auto resolves to RTL.
    let layout = layout_paragraph(&reg, &para("\u{05D0}\u{05D1}a", vec![mona])).unwrap();
    assert_eq!(layout.base_direction, TextDirection::Rtl);
}

// --------------------------------------------------------------------------
// UAX #14 line breaking: spaces and CJK, with width wrapping
// --------------------------------------------------------------------------

#[test]
fn width_wrapping_breaks_at_spaces_without_splitting_words() {
    let (reg, mona, _) = registry();
    let mut req = para("hello world foo bar", vec![mona]);
    req.max_width = Some(150.0);
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert_eq!(layout.lines.len(), 3);
    // Lines break at word (space) boundaries; no word is split.
    assert_eq!(
        (
            layout.lines[0].source.utf8_start,
            layout.lines[0].source.utf8_end
        ),
        (0, 6) // "hello "
    );
    assert_eq!(
        (
            layout.lines[2].source.utf8_start,
            layout.lines[2].source.utf8_end
        ),
        (16, 19) // "bar"
    );
    assert!(layout.lines[2].hard_break);
    // Trailing whitespace is excluded from the measured line width.
    assert!(layout.lines[0].trailing_whitespace > 0.0);
    for line in &layout.lines {
        assert!(line.width <= 150.0, "content width fits the limit");
    }
    // The last cluster of the first line is the (trailing) space, not part of
    // any following word.
    let last = layout.lines[0].clusters.last().unwrap();
    assert!(last.is_whitespace);
    // Whitespace clusters expose a degenerate logical box for paint mapping.
    assert_eq!(last.bounds.x_min, 0.0);
    assert!((last.bounds.x_max - last.advance).abs() < 1e-3);
}

#[test]
fn balanced_wrapping_preserves_line_count_and_reduces_width_variance() {
    let (reg, mona, _) = registry();
    let text = "alpha beta gamma delta epsilon zeta eta theta";
    let mut improvement = None;

    // Search a fixed, bounded set of widths for a multi-line case where the
    // first-fit breakpoints are visibly ragged. The font fixture is stable,
    // while avoiding a brittle assertion on one exact font-unit threshold.
    for limit in (160..=360).step_by(8) {
        let mut greedy_request = para(text, vec![mona]);
        greedy_request.max_width = Some(limit as f32);
        let greedy = layout_paragraph(&reg, &greedy_request).unwrap();
        if greedy.lines.len() < 2 {
            continue;
        }

        let mut balanced_request = greedy_request.clone();
        balanced_request.wrap_strategy = LineWrapStrategy::Balanced;
        let balanced = layout_paragraph(&reg, &balanced_request).unwrap();
        if balanced.lines.len() != greedy.lines.len() {
            continue;
        }

        let greedy_spread = line_width_spread(&greedy.lines);
        let balanced_spread = line_width_spread(&balanced.lines);
        if balanced_spread + 1.0 < greedy_spread {
            improvement = Some((limit as f32, greedy, balanced));
            break;
        }
    }

    let (limit, greedy, balanced) =
        improvement.expect("expected a width where balanced wrapping reduces raggedness");
    assert_eq!(balanced.lines.len(), greedy.lines.len());
    assert!(line_width_spread(&balanced.lines) < line_width_spread(&greedy.lines));
    assert!(
        balanced.lines.iter().all(|line| line.width <= limit),
        "balanced lines should fit when a legal fitting solution exists"
    );
}

#[test]
fn balanced_wrapping_respects_no_break_ranges_and_mandatory_breaks() {
    let (reg, _, kana) = registry();
    let text = format!("{KANA5}\n{KANA5}");
    let mut request = para(&text, vec![kana]);
    request.max_width = Some(80.0);
    request.wrap_strategy = LineWrapStrategy::Balanced;
    request.no_break_ranges = vec![(1, 3), (7, 9)];

    let layout = layout_paragraph(&reg, &request).unwrap();
    assert!(layout.lines.iter().filter(|line| line.hard_break).count() >= 2);
    for forbidden in [2, 8] {
        assert!(
            layout
                .lines
                .iter()
                .all(|line| line.source.utf16_end != forbidden),
            "balanced wrapping must not break inside a no-break range"
        );
    }
}

#[test]
fn phrase_ranges_prefer_phrase_boundaries_for_greedy_and_balanced_wrapping() {
    let (reg, _, kana) = registry();

    for strategy in [LineWrapStrategy::Greedy, LineWrapStrategy::Balanced] {
        let mut request = para(KANA5, vec![kana]);
        request.max_width = Some(80.0);
        request.wrap_strategy = strategy;
        request.phrase_ranges = vec![(1, 3)];

        let layout = layout_paragraph(&reg, &request).unwrap();
        let ends: Vec<_> = layout
            .lines
            .iter()
            .map(|line| line.source.utf16_end)
            .collect();
        assert!(ends.contains(&1));
        assert!(ends.contains(&3));
        assert!(
            !ends.contains(&2),
            "a fitting phrase should not break internally"
        );
    }
}

#[test]
fn overlong_phrase_ranges_fall_back_to_internal_uax14_breaks() {
    let (reg, _, kana) = registry();
    let mut request = para(KANA5, vec![kana]);
    request.max_width = Some(80.0);
    request.wrap_strategy = LineWrapStrategy::Balanced;
    request.phrase_ranges = vec![(0, 5)];

    let layout = layout_paragraph(&reg, &request).unwrap();
    assert!(layout.lines.len() > 1);
    assert!(
        layout.lines.iter().all(|line| line.width <= 80.0),
        "line widths: {:?}",
        layout
            .lines
            .iter()
            .map(|line| line.width)
            .collect::<Vec<_>>()
    );
    assert!(layout
        .lines
        .iter()
        .take(layout.lines.len() - 1)
        .any(|line| line.source.utf16_end > 0 && line.source.utf16_end < 5));
}

#[test]
fn balanced_wrapping_falls_back_to_greedy_for_pathologically_large_dp_work() {
    let (reg, _, kana) = registry();
    let text = "\u{3042}".repeat(600);

    let mut greedy_request = para(&text, vec![kana]);
    greedy_request.max_width = Some(80.0);
    let greedy = layout_paragraph(&reg, &greedy_request).unwrap();

    let mut balanced_request = greedy_request.clone();
    balanced_request.wrap_strategy = LineWrapStrategy::Balanced;
    let balanced = layout_paragraph(&reg, &balanced_request).unwrap();

    let greedy_ranges: Vec<_> = greedy
        .lines
        .iter()
        .map(|line| (line.source.utf16_start, line.source.utf16_end))
        .collect();
    let balanced_ranges: Vec<_> = balanced
        .lines
        .iter()
        .map(|line| (line.source.utf16_start, line.source.utf16_end))
        .collect();
    assert_eq!(balanced_ranges, greedy_ranges);
}

#[test]
fn cjk_text_wraps_between_ideographic_clusters() {
    let (reg, _, kana) = registry();
    // Five hiragana, each a stand-alone cluster; UAX #14 allows breaks between
    // them, so a narrow width wraps mid-"word".
    let mut req = para("\u{3042}\u{3044}\u{3046}\u{3048}\u{304A}", vec![kana]);
    req.max_width = Some(80.0);
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert!(
        layout.lines.len() >= 2,
        "kana should wrap under a narrow width"
    );
    // Every cluster maps to exactly one hiragana (3 UTF-8 bytes / 1 UTF-16 unit)
    // and no cluster is whitespace.
    for line in &layout.lines {
        for c in &line.clusters {
            assert_eq!(c.source.utf8_end - c.source.utf8_start, 3);
            assert_eq!(c.source.utf16_end - c.source.utf16_start, 1);
            assert!(!c.is_whitespace);
        }
    }
    // Concatenating line source ranges covers the whole paragraph in order.
    assert_eq!(layout.lines.first().unwrap().source.utf8_start, 0);
    assert_eq!(layout.lines.last().unwrap().source.utf8_end, 15);
}

#[test]
fn no_max_width_keeps_everything_on_one_line() {
    let (reg, mona, _) = registry();
    let layout = layout_paragraph(&reg, &para("hello world", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 1);
    assert!(layout.lines[0].hard_break);
}

#[test]
fn mandatory_newline_breaks_into_separate_lines() {
    let (reg, mona, _) = registry();
    let layout = layout_paragraph(&reg, &para("ab\ncd", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    assert!(layout.lines[0].hard_break);
    assert_eq!(
        (
            layout.lines[0].source.utf8_start,
            layout.lines[0].source.utf8_end
        ),
        (0, 3) // "ab\n"
    );
    assert_eq!(
        (
            layout.lines[1].source.utf8_start,
            layout.lines[1].source.utf8_end
        ),
        (3, 5) // "cd"
    );
    // Line vertical metrics stack by line height.
    assert!(layout.lines[1].top > layout.lines[0].top);
    assert!((layout.lines[1].top - layout.lines[0].top - layout.line_height).abs() < 1e-3);
    assert!(layout.lines[0].baseline > layout.lines[0].top);
}

#[test]
fn oversized_cluster_stays_with_its_mandatory_newline() {
    let (reg, mona, kana) = registry();
    let text = "\u{3042}\nb";

    for strategy in [LineWrapStrategy::Greedy, LineWrapStrategy::Balanced] {
        let mut request = para(text, vec![mona, kana]);
        request.max_width = Some(1.0);
        request.wrap_strategy = strategy;
        let layout = layout_paragraph(&reg, &request).unwrap();

        assert_eq!(layout.lines.len(), 2);
        assert_eq!(
            (
                layout.lines[0].source.utf16_start,
                layout.lines[0].source.utf16_end
            ),
            (0, 2)
        );
        assert!(layout.lines[0].hard_break);
        assert_eq!(
            (
                layout.lines[1].source.utf16_start,
                layout.lines[1].source.utf16_end
            ),
            (2, 3)
        );
    }
}

#[test]
fn explicit_line_height_overrides_font_metrics() {
    let (reg, mona, _) = registry();
    let mut req = para("ab\ncd", vec![mona]);
    req.line_height = Some(50.0);
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert!((layout.line_height - 50.0).abs() < 1e-3);
    assert!((layout.height - 100.0).abs() < 1e-3);
}

// --------------------------------------------------------------------------
// Preserved shaping inputs & error handling
// --------------------------------------------------------------------------

#[test]
fn explicit_features_are_honored_in_layout() {
    let (reg, mona, _) = registry();
    let with_kern = layout_paragraph(&reg, &{
        let mut r = para("AV", vec![mona]);
        r.features = vec!["kern=1".to_string()];
        r
    })
    .unwrap();
    let without_kern = layout_paragraph(&reg, &{
        let mut r = para("AV", vec![mona]);
        r.features = vec!["-kern".to_string()];
        r
    })
    .unwrap();
    assert_ne!(with_kern.lines[0].width, without_kern.lines[0].width);
}

#[test]
fn rejects_empty_text_and_empty_font_chain() {
    let (reg, mona, _) = registry();
    assert_eq!(
        layout_paragraph(&reg, &para("", vec![mona])).unwrap_err(),
        ShapeError::EmptyText
    );
    assert_eq!(
        layout_paragraph(&reg, &para("hi", vec![])).unwrap_err(),
        ShapeError::EmptyFontChain
    );
}

#[test]
fn rejects_vertical_base_direction() {
    let (reg, mona, _) = registry();
    let mut req = para("hi", vec![mona]);
    req.base_direction = TextDirection::Ttb;
    assert!(matches!(
        layout_paragraph(&reg, &req).unwrap_err(),
        ShapeError::InvalidInput(_)
    ));
}

#[test]
fn rejects_invalid_script_tag() {
    let (reg, mona, _) = registry();
    let mut req = para("hi", vec![mona]);
    req.script = Some("".to_string());
    assert!(matches!(
        layout_paragraph(&reg, &req).unwrap_err(),
        ShapeError::InvalidInput(_)
    ));
}

#[test]
fn rejects_unknown_font_id() {
    let (reg, _, _) = registry();
    assert_eq!(
        layout_paragraph(&reg, &para("hi", vec![999])).unwrap_err(),
        ShapeError::UnknownFont(999)
    );
}

// --------------------------------------------------------------------------
// Break suppression via logical UTF-16 no-break ranges (for the ruby layer)
// --------------------------------------------------------------------------

/// "あいうえお": 5 hiragana, each 3 UTF-8 bytes / 1 UTF-16 unit.
const KANA5: &str = "\u{3042}\u{3044}\u{3046}\u{3048}\u{304A}";

#[test]
fn no_break_range_suppresses_interior_break_and_preserves_neighbors() {
    let (reg, _, kana) = registry();
    let mut req = para(KANA5, vec![kana]);
    req.max_width = Some(80.0);

    // Baseline: with no suppression the greedy wrap breaks between い and う
    // (a line ends at UTF-8 offset 6).
    let baseline = layout_paragraph(&reg, &req).unwrap();
    assert!(
        baseline.lines.iter().any(|l| l.source.utf8_end == 6),
        "baseline should break between い and う"
    );

    // Forbid breaks strictly inside "いう" (UTF-16 [1, 3)).
    req.no_break_ranges = vec![(1, 3)];
    let layout = layout_paragraph(&reg, &req).unwrap();

    // No line boundary between い and う (UTF-8 offset 6) any more.
    assert!(
        layout.lines.iter().all(|l| l.source.utf8_end != 6),
        "the break inside the no-break range must be suppressed"
    );
    // い and う land on the same line.
    let line_with_i = layout
        .lines
        .iter()
        .find(|l| l.source.utf8_start <= 3 && l.source.utf8_end >= 6)
        .expect("some line contains い");
    assert!(
        line_with_i.source.utf8_end >= 9,
        "the line containing い must also contain う"
    );
    // Legal breaks immediately before (UTF-8 3) and after (UTF-8 9) the range
    // are preserved.
    assert!(
        layout.lines.iter().any(|l| l.source.utf8_end == 3),
        "break before the range is preserved"
    );
    assert!(
        layout.lines.iter().any(|l| l.source.utf8_end == 9),
        "break after the range is preserved"
    );
}

#[test]
fn no_break_range_spanning_the_paragraph_forces_a_single_overflowing_line() {
    let (reg, _, kana) = registry();
    let mut req = para(KANA5, vec![kana]);
    req.max_width = Some(80.0);
    // Suppress every interior break (and the emergency fallback) across the
    // whole paragraph: it must stay on one line even though it overflows.
    req.no_break_ranges = vec![(0, 5)];
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert_eq!(layout.lines.len(), 1);
    assert_eq!(
        (
            layout.lines[0].source.utf8_start,
            layout.lines[0].source.utf8_end
        ),
        (0, 15)
    );
    assert!(
        layout.lines[0].width > 80.0,
        "the kept-together run overflows"
    );
}

#[test]
fn no_break_range_does_not_suppress_mandatory_newline_break() {
    let (reg, mona, _) = registry();
    let mut req = para("ab\ncd", vec![mona]);
    // Range covers "b\nc" (UTF-16 [1, 4)) - straddling the hard newline, whose
    // mandatory break must still be honored.
    req.no_break_ranges = vec![(1, 4)];
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert_eq!(layout.lines.len(), 2);
    assert!(layout.lines[0].hard_break);
}

#[test]
fn no_break_range_without_width_limit_is_a_harmless_noop() {
    let (reg, _, kana) = registry();
    let mut req = para(KANA5, vec![kana]);
    req.no_break_ranges = vec![(1, 3)];
    // No max_width => single line regardless; the range is accepted and inert.
    let layout = layout_paragraph(&reg, &req).unwrap();
    assert_eq!(layout.lines.len(), 1);
}

#[test]
fn no_break_ranges_are_validated_strictly() {
    let (reg, mona, kana) = registry();

    let invalid = |ranges: Vec<(u32, u32)>| {
        let mut req = para(KANA5, vec![kana]);
        req.no_break_ranges = ranges;
        layout_paragraph(&reg, &req).unwrap_err()
    };

    // start == end (empty range).
    assert!(matches!(invalid(vec![(3, 3)]), ShapeError::InvalidInput(_)));
    // start > end.
    assert!(matches!(invalid(vec![(4, 2)]), ShapeError::InvalidInput(_)));
    // end beyond the text (UTF-16 length is 5).
    assert!(matches!(invalid(vec![(0, 6)]), ShapeError::InvalidInput(_)));

    // Endpoint in the middle of a surrogate pair: "a𝟙b" has UTF-16 boundaries
    // {0, 1, 3, 4}; offset 2 is mid-surrogate.
    let mut req = para("a\u{1D7D9}b", vec![mona, kana]);
    req.no_break_ranges = vec![(1, 2)];
    assert!(matches!(
        layout_paragraph(&reg, &req).unwrap_err(),
        ShapeError::InvalidInput(_)
    ));
    // The valid surrounding range [1, 3) (whole astral char) is accepted.
    req.no_break_ranges = vec![(1, 3)];
    assert!(layout_paragraph(&reg, &req).is_ok());
}

#[test]
fn phrase_ranges_are_validated_strictly() {
    let (reg, mona, kana) = registry();

    let invalid = |ranges: Vec<(u32, u32)>| {
        let mut req = para(KANA5, vec![kana]);
        req.phrase_ranges = ranges;
        layout_paragraph(&reg, &req).unwrap_err()
    };

    assert!(matches!(invalid(vec![(2, 2)]), ShapeError::InvalidInput(_)));
    assert!(matches!(invalid(vec![(4, 2)]), ShapeError::InvalidInput(_)));
    assert!(matches!(invalid(vec![(0, 6)]), ShapeError::InvalidInput(_)));

    let mut request = para("a\u{1D7D9}b", vec![mona, kana]);
    request.phrase_ranges = vec![(1, 2)];
    assert!(matches!(
        layout_paragraph(&reg, &request).unwrap_err(),
        ShapeError::InvalidInput(_)
    ));
    request.phrase_ranges = vec![(1, 3)];
    assert!(layout_paragraph(&reg, &request).is_ok());
}

// --------------------------------------------------------------------------
// Non-drawable control characters (LF/CRLF/LS/PS + bidi controls)
// --------------------------------------------------------------------------

/// Finds a line's cluster whose logical source starts at `utf8_start`.
fn cluster_at(line: &LayoutLine, utf8_start: u32) -> &glyph_renderer::layout::ShapedCluster {
    line.clusters
        .iter()
        .find(|c| c.source.utf8_start == utf8_start)
        .expect("cluster with the given source start")
}

#[test]
fn newline_is_a_zero_advance_glyphless_cluster_not_reported_missing() {
    let (reg, mona, _) = registry();
    let layout = layout_paragraph(&reg, &para("ab\ncd", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    assert!(layout.lines[0].hard_break);

    // The LF cluster keeps its source range but draws nothing.
    let lf = cluster_at(&layout.lines[0], 2);
    assert!(lf.glyphs.is_empty(), "LF must emit no glyph");
    assert_eq!(lf.advance, 0.0, "LF must have no advance");
    assert!(lf.is_whitespace);
    // A control char is not a coverage failure.
    assert!(layout.missing_font_ranges.is_empty());
}

#[test]
fn crlf_is_glyphless_and_breaks_once() {
    let (reg, mona, _) = registry();
    let layout = layout_paragraph(&reg, &para("ab\r\ncd", vec![mona])).unwrap();
    // CR+LF is a single UAX #14 break -> exactly two lines.
    assert_eq!(layout.lines.len(), 2);
    assert!(layout.lines[0].hard_break);
    // Both the CR (2..3) and LF (3..4) draw nothing.
    for start in [2u32, 3u32] {
        let c = cluster_at(&layout.lines[0], start);
        assert!(c.glyphs.is_empty(), "control at {start} must emit no glyph");
        assert_eq!(c.advance, 0.0);
    }
    assert!(layout.missing_font_ranges.is_empty());
}

#[test]
fn line_separator_breaks_within_one_paragraph_and_draws_nothing() {
    let (reg, mona, _) = registry();
    // U+2028 LINE SEPARATOR: a mandatory UAX #14 break but NOT a bidi paragraph
    // separator, so both lines share one base direction.
    let layout = layout_paragraph(&reg, &para("ab\u{2028}cd", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    assert!(layout.lines[0].hard_break);
    assert_eq!(layout.lines[0].direction, layout.lines[1].direction);
    let ls = cluster_at(&layout.lines[0], 2);
    assert!(ls.glyphs.is_empty());
    assert_eq!(ls.advance, 0.0);
    assert!(layout.missing_font_ranges.is_empty());
}

#[test]
fn paragraph_separator_breaks_into_a_new_paragraph_and_draws_nothing() {
    let (reg, mona, _) = registry();
    // U+2029 PARAGRAPH SEPARATOR splits bidi paragraphs.
    let layout = layout_paragraph(&reg, &para("ab\u{2029}cd", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    let ps = cluster_at(&layout.lines[0], 2);
    assert!(ps.glyphs.is_empty());
    assert_eq!(ps.advance, 0.0);
    assert!(layout.missing_font_ranges.is_empty());
}

// --------------------------------------------------------------------------
// Per-paragraph base direction (multiple Unicode paragraphs)
// --------------------------------------------------------------------------

#[test]
fn auto_base_direction_is_tracked_per_paragraph() {
    let (reg, mona, _) = registry();
    // Latin paragraph, newline, then a Hebrew paragraph. With `auto`, each
    // Unicode paragraph resolves its own base direction.
    let layout =
        layout_paragraph(&reg, &para("abc\n\u{05D0}\u{05D1}\u{05D2}", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    // Top-level base direction reflects the first paragraph.
    assert_eq!(layout.base_direction, TextDirection::Ltr);
    // Each line carries its own paragraph's base direction.
    assert_eq!(layout.lines[0].direction, TextDirection::Ltr);
    assert_eq!(layout.lines[1].direction, TextDirection::Rtl);
    // The Hebrew line is reordered right-to-left with its own paragraph level.
    assert_eq!(visual_utf8_starts(&layout.lines[1]), vec![8, 6, 4]);
}

#[test]
fn paragraph_separator_allows_opposite_base_directions() {
    let (reg, mona, _) = registry();
    // Hebrew paragraph, PS, Latin paragraph (auto base direction).
    let layout = layout_paragraph(&reg, &para("\u{05D0}\u{05D1}\u{2029}abc", vec![mona])).unwrap();
    assert_eq!(layout.lines.len(), 2);
    assert_eq!(layout.base_direction, TextDirection::Rtl);
    assert_eq!(layout.lines[0].direction, TextDirection::Rtl);
    assert_eq!(layout.lines[1].direction, TextDirection::Ltr);
}

// --------------------------------------------------------------------------
// Script itemization (same font, mixed scripts)
// --------------------------------------------------------------------------

#[test]
fn same_font_mixed_scripts_are_itemized_by_script() {
    let (reg, mona, _) = registry();
    // Latin 'a', Greek alpha (U+03B1), Latin 'b' - all LTR, same bidi level.
    let layout = layout_paragraph(&reg, &para("a\u{03B1}b", vec![mona])).unwrap();
    let scripts: Vec<&str> = layout.lines[0]
        .clusters
        .iter()
        .map(|c| c.script.as_str())
        .collect();
    assert_eq!(scripts, vec!["Latn", "Grek", "Latn"]);
}

#[test]
fn common_and_inherited_characters_attach_to_the_surrounding_script() {
    let (reg, mona, _) = registry();
    // FULL STOP (Common) and the combining acute (Inherited) both resolve to
    // the surrounding Latin script - no spurious Common/Inherited runs.
    let layout = layout_paragraph(&reg, &para("a.e\u{0301}b", vec![mona])).unwrap();
    assert!(layout.lines[0].clusters.iter().all(|c| c.script == "Latn"));
}

#[test]
fn same_level_rtl_scripts_are_itemized() {
    let (reg, mona, _) = registry();
    // Hebrew alef + Arabic beh: both RTL (level 1) but different scripts.
    let layout = layout_paragraph(&reg, &para("\u{05D0}\u{0628}", vec![mona])).unwrap();
    let line = &layout.lines[0];
    assert_eq!(cluster_at(line, 0).script, "Hebr");
    assert_eq!(cluster_at(line, 2).script, "Arab");
}

// --------------------------------------------------------------------------
// Strict numeric input validation
// --------------------------------------------------------------------------

#[test]
fn rejects_non_finite_or_non_positive_font_size() {
    let (reg, mona, _) = registry();
    for bad in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY, 0.0, -12.0] {
        let mut req = para("hi", vec![mona]);
        req.font_size = bad;
        assert!(
            matches!(
                layout_paragraph(&reg, &req).unwrap_err(),
                ShapeError::InvalidInput(_)
            ),
            "font_size {bad} must be rejected"
        );
    }
}

#[test]
fn rejects_non_finite_or_non_positive_line_height() {
    let (reg, mona, _) = registry();
    for bad in [f32::NAN, f32::INFINITY, 0.0, -5.0] {
        let mut req = para("hi", vec![mona]);
        req.line_height = Some(bad);
        assert!(
            matches!(
                layout_paragraph(&reg, &req).unwrap_err(),
                ShapeError::InvalidInput(_)
            ),
            "line_height {bad} must be rejected"
        );
    }
}

#[test]
fn rejects_non_finite_max_width_but_allows_non_positive_as_no_wrap() {
    let (reg, mona, _) = registry();
    for bad in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
        let mut req = para("hi", vec![mona]);
        req.max_width = Some(bad);
        assert!(
            matches!(
                layout_paragraph(&reg, &req).unwrap_err(),
                ShapeError::InvalidInput(_)
            ),
            "max_width {bad} must be rejected"
        );
    }
    // Non-positive (finite) max_width is documented to mean "no wrapping".
    let mut req = para("hello world foo bar", vec![mona]);
    req.max_width = Some(0.0);
    assert_eq!(layout_paragraph(&reg, &req).unwrap().lines.len(), 1);
    req.max_width = Some(-100.0);
    assert_eq!(layout_paragraph(&reg, &req).unwrap().lines.len(), 1);
}
