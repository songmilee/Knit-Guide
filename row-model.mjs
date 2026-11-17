export function calibration(positions) {
  const first = positions?.[1], second = positions?.[2];
  if (!first || !second || first.page !== second.page) return null;
  const step = second.y - first.y;
  if (!Number.isFinite(step) || Math.abs(step) < 0.001 || Math.abs(step) > 0.5) return null;
  return { page: first.page, step };
}

export function rowPosition(positions, row, guideHeight = 0) {
  const exact = positions?.[row];
  if (exact) return { ...exact, estimated: false };
  const basis = calibration(positions);
  if (!basis) return null;
  const anchors = Object.entries(positions)
    .map(([key, value]) => ({ row: Number(key), ...value }))
    .filter(value => Number.isInteger(value.row) && value.row > 0);
  const before = anchors.filter(value => value.row < row).sort((a, b) => b.row - a.row)[0];
  const after = anchors.filter(value => value.row > row).sort((a, b) => a.row - b.row)[0];
  if (before && after && before.page !== after.page) return null;
  anchors.sort((a, b) => Math.abs(a.row - row) - Math.abs(b.row - row));
  const nearest = anchors[0];
  if (!nearest || nearest.page !== basis.page) return null;
  const y = nearest.y + (row - nearest.row) * basis.step;
  if (y < 0 || y > 1 - guideHeight) return null;
  return { page: basis.page, y, estimated: true };
}
