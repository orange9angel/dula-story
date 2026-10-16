// Lei's independent geometry candidate, in his 1.78 m imported actor frame.
// Draft parameters: render the supplied original profiles before accepting.
// The production front is mapped around eye y=1.597 and chin y=1.487.
export function leiGeometryConfig(base) {
  return {
    ...base,
    centerX: -.012,
    headCut: 1.487,
    noseY: 1.562,
    noseDepth: 0,
    contourWidth: .024,
    faceRoundness: 1.05,
    cheekFullness: .018,
    eyeSurface: {slope: .48, recess: 0, width: .030, height: .024},

    // Eye level to chin is 110 mm. The lower face tapers more than the old
    // rounded muzzle; skull width is retained independently above the eyes.
    profiles: [
      [1.487, .0015, .098, .095],
      [1.4885, .0055, .0995, .089],
      [1.491, .0095, .102, .075],
      [1.494348, .013, .104, .064],
      [1.50537, .028, .109, .012],
      [1.516393, .043, .111, -.020],
      [1.529494, .058, .112, -.045],
      [1.550391, .074, .112, -.069],
      [1.578333, .092, .109, -.088],
      [1.597, .101, .108, -.098],
      [1.632, .104, .110, -.105],
      [1.665, .098, .100, -.107],
      [1.702, .078, .061, -.095],
      [1.74, .036, .007, -.060],
      [1.753, .001, -.030, -.031]
    ],
    // A small nose with a shallow lip transition, followed by a distinct but
    // restrained chin. No additional Gaussian nose is stacked onto this line.
    profileContour: [
      [1.487, .098], [1.494348, .104], [1.50537, .109],
      [1.516393, .1115], [1.522822, .1135], [1.528333, .1145],
      [1.534138, .1140], [1.542264, .1160], [1.548069, .1230],
      [1.556195, .1310], [1.562, .1320], [1.569, .1250],
      [1.581833, .1140], [1.597, .1080], [1.616, .1100],
      [1.648, .1090], [1.665, .1000], [1.702, .0610],
      [1.74, .0070], [1.753, -.0300]
    ],
    jawContour: [
      [1.487, .095], [1.494348, .064], [1.50537, .012],
      [1.516393, -.020], [1.529494, -.045], [1.550391, -.069],
      [1.578333, -.088], [1.597, -.098], [1.632, -.105],
      [1.665, -.107], [1.702, -.095], [1.74, -.060],
      [1.753, -.031]
    ],
    cranium: {
      startY: 1.623, fullY: 1.680, backStartY: 1.557,
      backFullY: 1.632, centerY: 1.650, topY: 1.759,
      width: .103, front: .109, back: -.107,
      templeStartY: 1.597, templeFullY: 1.655, templePower: .82,
      widthStartY: 1.597, widthFullY: 1.645
    },
    jawDefinition: {
      rootY: 1.549, rootZ: -.004, power: 2.8,
      obliqueRootY: 1.545, obliquePower: 2.3,
      ink: '#805b49', shadow: '#e7af8b'
    },
    externalContour: [60, 75],

    // The old ear was a narrow frontal oval seen edge-on. Give it a real
    // side chart and an attached lower lobe, while retaining separate ears.
    drawnEar: true,
    earRootDefinition: true,
    earShape: 'attached',
    earX: .096,
    earY: 1.578,
    earZ: -.003,
    earScale: [.014, .029, .022],
    earLobeInset: .016,
    earYaw: .30,

    // Upper neck enters the jaw/ear volume instead of ending at y=1.528.
    // Keep a broader male neck and a continuous posterior contour to collar.
    neckRadius: .043,
    neckZ: -.003,
    neckTopZ: -.016,
    neckInk: false,
    neckProfile: [
      [1.395, .050, .055, -.044],
      [1.423, .047, .052, -.047],
      [1.450, .051, .048, -.050],
      [1.480, .051, .044, -.054],
      [1.505, .051, .050, -.058],
      [1.535, .047, .041, -.065],
      [1.573, .053, .020, -.075]
    ]
  };
}
