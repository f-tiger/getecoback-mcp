export function usableWindowWidth(clearWidth, sideMargin) {
  return Math.max(0, clearWidth - 2 * sideMargin);
}

export function headFitsWindow(headWidth, usableWidth) {
  // Absorb floating-point rounding at exact decimal equality. This is not
  // a reserve or a claim about measuring precision.
  return usableWidth > 0 && headWidth > 0 && headWidth <= usableWidth + 1e-9;
}
