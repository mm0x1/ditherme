#!/bin/bash
# Build script for libdither WASM module

set -e

LIBDITHER_SRC="libdither/src/libdither"
OUTPUT_DIR="../public/wasm"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# List of source files (including subdirectories)
SOURCES="
    $LIBDITHER_SRC/color_bytecolor.c
    $LIBDITHER_SRC/color_bytepalette.c
    $LIBDITHER_SRC/color_cachedpalette.c
    $LIBDITHER_SRC/color_colorimage.c
    $LIBDITHER_SRC/color_floatcolor.c
    $LIBDITHER_SRC/color_floatpalette.c
    $LIBDITHER_SRC/color_models.c
    $LIBDITHER_SRC/color_quant_kdtree.c
    $LIBDITHER_SRC/color_quant_mediancut.c
    $LIBDITHER_SRC/color_quant_wu.c
    $LIBDITHER_SRC/dither_dbs.c
    $LIBDITHER_SRC/dither_dotdiff.c
    $LIBDITHER_SRC/dither_dotlippens.c
    $LIBDITHER_SRC/dither_errordiff.c
    $LIBDITHER_SRC/dither_grid.c
    $LIBDITHER_SRC/dither_kallebach.c
    $LIBDITHER_SRC/dither_ordered.c
    $LIBDITHER_SRC/dither_pattern.c
    $LIBDITHER_SRC/dither_riemersma.c
    $LIBDITHER_SRC/dither_threshold.c
    $LIBDITHER_SRC/dither_varerrdiff.c
    $LIBDITHER_SRC/ditherimage.c
    $LIBDITHER_SRC/gamma.c
    $LIBDITHER_SRC/libdither.c
    $LIBDITHER_SRC/queue.c
    $LIBDITHER_SRC/random.c
    $LIBDITHER_SRC/kdtree/kdtree.c
    $LIBDITHER_SRC/tetrapal/tetrapal.c
"

# Exported functions for WASM
EXPORTED_FUNCTIONS="[
    '_malloc',
    '_free',
    '_libdither_version',
    '_DitherImage_new',
    '_DitherImage_free',
    '_DitherImage_set_pixel',
    '_DitherImage_set_pixel_rgba',
    '_DitherImage_get_pixel',
    '_auto_threshold',
    '_threshold_dither',
    '_error_diffusion_dither',
    '_ErrorDiffusionMatrix_free',
    '_get_floyd_steinberg_matrix',
    '_get_jarvis_judice_ninke_matrix',
    '_get_stucki_matrix',
    '_get_burkes_matrix',
    '_get_sierra_3_matrix',
    '_get_sierra_2row_matrix',
    '_get_sierra_lite_matrix',
    '_get_atkinson_matrix',
    '_get_stevenson_arce_matrix',
    '_get_fake_floyd_steinberg_matrix',
    '_get_shiaufan1_matrix',
    '_get_shiaufan2_matrix',
    '_get_shiaufan3_matrix',
    '_get_xot_matrix',
    '_get_diagonal_matrix',
    '_get_diffusion_1d_matrix',
    '_get_diffusion_2d_matrix',
    '_get_steve_pigeon_matrix',
    '_get_robert_kist_matrix',
    '_ordered_dither',
    '_OrderedDitherMatrix_free',
    '_get_bayer2x2_matrix',
    '_get_bayer3x3_matrix',
    '_get_bayer4x4_matrix',
    '_get_bayer8x8_matrix',
    '_get_bayer16x16_matrix',
    '_get_bayer32x32_matrix',
    '_get_blue_noise_128x128',
    '_get_dispersed_dots_1_matrix',
    '_get_dispersed_dots_2_matrix',
    '_get_ulichney_void_dispersed_dots_matrix',
    '_get_non_rectangular_1_matrix',
    '_get_non_rectangular_2_matrix',
    '_get_non_rectangular_3_matrix',
    '_get_non_rectangular_4_matrix',
    '_get_ulichney_bayer_5_matrix',
    '_get_ulichney_matrix',
    '_get_ulichney_clustered_dot_matrix',
    '_get_bayer_clustered_dot_1_matrix',
    '_get_bayer_clustered_dot_2_matrix',
    '_get_bayer_clustered_dot_3_matrix',
    '_get_bayer_clustered_dot_4_matrix',
    '_get_bayer_clustered_dot_5_matrix',
    '_get_bayer_clustered_dot_6_matrix',
    '_get_bayer_clustered_dot_7_matrix',
    '_get_bayer_clustered_dot_8_matrix',
    '_get_bayer_clustered_dot_9_matrix',
    '_get_bayer_clustered_dot_10_matrix',
    '_get_bayer_clustered_dot_11_matrix',
    '_get_diagonal_ordered_matrix_matrix',
    '_get_magic5x5_circle_matrix',
    '_get_magic6x6_circle_matrix',
    '_get_magic7x7_circle_matrix',
    '_get_magic4x4_45_matrix',
    '_get_magic6x6_45_matrix',
    '_get_magic8x8_45_matrix',
    '_get_variable_2x2_matrix',
    '_get_variable_4x4_matrix',
    '_get_interleaved_gradient_noise',
    '_riemersma_dither',
    '_RiemersmaCurve_free',
    '_create_curve',
    '_get_hilbert_curve',
    '_get_hilbert_mod_curve',
    '_get_peano_curve',
    '_get_fass0_curve',
    '_get_fass1_curve',
    '_get_fass2_curve',
    '_get_gosper_curve',
    '_get_fass_spiral_curve',
    '_pattern_dither',
    '_TilePattern_free',
    '_get_2x2_pattern',
    '_get_3x3_v1_pattern',
    '_get_3x3_v2_pattern',
    '_get_3x3_v3_pattern',
    '_get_4x4_pattern',
    '_get_5x2_pattern',
    '_dot_diffusion_dither',
    '_DotClassMatrix_free',
    '_DotDiffusionMatrix_free',
    '_get_default_diffusion_matrix',
    '_get_guoliu8_diffusion_matrix',
    '_get_guoliu16_diffusion_matrix',
    '_get_mini_knuth_class_matrix',
    '_get_knuth_class_matrix',
    '_get_optimized_knuth_class_matrix',
    '_get_mese_8x8_class_matrix',
    '_get_mese_16x16_class_matrix',
    '_get_guoliu_8x8_class_matrix',
    '_get_guoliu_16x16_class_matrix',
    '_get_spiral_class_matrix',
    '_get_spiral_inverted_class_matrix',
    '_dotlippens_dither',
    '_DotLippensCoefficients_free',
    '_get_dotlippens_class_matrix',
    '_get_dotlippens_coefficients1',
    '_get_dotlippens_coefficients2',
    '_get_dotlippens_coefficients3',
    '_variable_error_diffusion_dither',
    '_grid_dither',
    '_dbs_dither',
    '_kallebach_dither',
    '_ColorImage_new',
    '_ColorImage_free',
    '_ColorImage_set_rgb',
    '_CachedPalette_new',
    '_CachedPalette_free',
    '_CachedPalette_from_BytePalette',
    '_CachedPalette_update_cache',
    '_BytePalette_new',
    '_BytePalette_free',
    '_BytePalette_set',
    '_error_diffusion_dither_color',
    '_ordered_dither_color'
]"

EXPORTED_RUNTIME="['ccall', 'cwrap', 'getValue', 'setValue', 'UTF8ToString', 'stringToUTF8', 'HEAPU8', 'HEAP32', 'HEAPF64']"

echo "Building libdither WASM module..."

emcc $SOURCES \
    -I"$LIBDITHER_SRC" \
    -I"$LIBDITHER_SRC/kdtree" \
    -I"$LIBDITHER_SRC/tetrapal" \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createLibDither" \
    -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
    -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=67108864 \
    -s MAXIMUM_MEMORY=536870912 \
    -s NO_EXIT_RUNTIME=1 \
    -s ENVIRONMENT='web,worker' \
    -o "$OUTPUT_DIR/libdither.js"

echo "Build complete! Output:"
ls -la "$OUTPUT_DIR"
