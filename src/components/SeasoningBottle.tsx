import bottles from '../../public/images/mix/seasoning-bottles.json'

/** Reference-guided Higgsfield packshots, cropped locally with real alpha.
 * The opening is the rotation pivot, keeping the pour attached to the bottle.
 */
export function SeasoningBottle({ name, x, y, height, rotation }: {
  name: 'chamoy' | 'tajin' | 'limon'; x: number; y: number; height: number; rotation: number
}) {
  const asset = bottles.assets.find(asset => asset.name === name)!
  const scale = height / asset.height
  return <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
    <image data-seasoning-image={name} href={asset.image}
      x={-asset.pivot.x * scale} y={-asset.pivot.y * scale}
      width={asset.width * scale} height={height} preserveAspectRatio="xMidYMid meet" />
  </g>
}
