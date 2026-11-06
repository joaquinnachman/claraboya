// Instrumentos y afinaciones. Notas en MIDI (60 = C4 / Do central, 69 = A4 / La 440).
// Las cuerdas van en el orden en que se ven en el instrumento de frente (de la más grave a la más aguda,
// salvo instrumentos reentrantes como ukelele o banjo, que siguen el orden físico).
// alt: {índice: nota} = ese orden tiene un par en otra octava (se acepta cualquiera de las dos).
(function (root) {
  var T = function (id, name, group, notes, extra) {
    var t = { id: id, name: name, group: group, notes: notes };
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  };
  var FL = { flats: true };

  var INSTRUMENTS = [
    {
      id: 'guitarra', name: 'Guitarra', icon: 'guitar', fretted: true,
      labels: ['6', '5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar', 'Estándar', [40, 45, 50, 55, 59, 64]),
        T('eb', 'Medio tono abajo', 'Bajadas', [39, 44, 49, 54, 58, 63], FL),
        T('d', 'Un tono abajo (D)', 'Bajadas', [38, 43, 48, 53, 57, 62]),
        T('c', 'Do estándar (C)', 'Bajadas', [36, 41, 46, 51, 55, 60]),
        T('b', 'Si estándar (B)', 'Bajadas', [35, 40, 45, 50, 54, 59]),
        T('dropd', 'Drop D', 'Drop', [38, 45, 50, 55, 59, 64]),
        T('dropcs', 'Drop C#', 'Drop', [37, 44, 49, 54, 58, 63], FL),
        T('dropc', 'Drop C', 'Drop', [36, 43, 48, 53, 57, 62]),
        T('dropb', 'Drop B', 'Drop', [35, 42, 47, 52, 56, 61]),
        T('dropa', 'Drop A', 'Drop', [33, 40, 45, 50, 54, 59]),
        T('ddropd', 'Doble Drop D', 'Drop', [38, 45, 50, 55, 59, 62]),
        T('openg', 'Open G', 'Abiertas', [38, 43, 50, 55, 59, 62]),
        T('opend', 'Open D', 'Abiertas', [38, 45, 50, 54, 57, 62]),
        T('opene', 'Open E', 'Abiertas', [40, 47, 52, 56, 59, 64]),
        T('opena', 'Open A', 'Abiertas', [40, 45, 52, 57, 61, 64]),
        T('openc', 'Open C', 'Abiertas', [36, 43, 48, 55, 60, 64]),
        T('opendm', 'Open D menor', 'Abiertas', [38, 45, 50, 53, 57, 62]),
        T('opencm', 'Open C menor', 'Abiertas', [36, 43, 48, 55, 60, 63], FL),
        T('dadgad', 'DADGAD', 'Modales y otras', [38, 45, 50, 55, 57, 62]),
        T('cgcgcd', 'CGCGCD', 'Modales y otras', [36, 43, 48, 55, 60, 62]),
        T('cuartas', 'Todo cuartas', 'Modales y otras', [40, 45, 50, 55, 60, 65]),
        T('nst', 'New Standard (Fripp)', 'Modales y otras', [36, 43, 50, 57, 64, 67]),
        T('nash', 'Nashville (encordado alto)', 'Modales y otras', [52, 57, 62, 67, 59, 64])
      ]
    },
    {
      id: 'guitarra7', name: 'Guitarra 7', icon: 'guitar', fretted: true,
      labels: ['7', '6', '5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (B)', 'Estándar', [35, 40, 45, 50, 55, 59, 64]),
        T('eb', 'Medio tono abajo', 'Bajadas', [34, 39, 44, 49, 54, 58, 63], FL),
        T('a', 'La estándar (A)', 'Bajadas', [33, 38, 43, 48, 53, 57, 62]),
        T('dropa', 'Drop A', 'Drop', [33, 40, 45, 50, 55, 59, 64]),
        T('dropg', 'Drop G', 'Drop', [31, 38, 43, 48, 53, 57, 62])
      ]
    },
    {
      id: 'bajo4', name: 'Bajo 4', icon: 'bass', fretted: true,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar', 'Estándar', [28, 33, 38, 43]),
        T('eb', 'Medio tono abajo', 'Bajadas', [27, 32, 37, 42], FL),
        T('d', 'Un tono abajo (D)', 'Bajadas', [26, 31, 36, 41]),
        T('c', 'Do estándar (C)', 'Bajadas', [24, 29, 34, 39]),
        T('bead', 'BEAD', 'Bajadas', [23, 28, 33, 38]),
        T('dropd', 'Drop D', 'Drop', [26, 33, 38, 43]),
        T('dropc', 'Drop C', 'Drop', [24, 31, 36, 41]),
        T('tenor', 'Tenor (ADGC)', 'Otras', [33, 38, 43, 48]),
        T('quintas', 'Quintas (CGDA)', 'Otras', [24, 31, 38, 45])
      ]
    },
    {
      id: 'bajo5', name: 'Bajo 5', icon: 'bass', fretted: true,
      labels: ['5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (B)', 'Estándar', [23, 28, 33, 38, 43]),
        T('highc', 'Con C aguda', 'Estándar', [28, 33, 38, 43, 48]),
        T('eb', 'Medio tono abajo', 'Bajadas', [22, 27, 32, 37, 42], FL),
        T('dropa', 'Drop A', 'Drop', [21, 28, 33, 38, 43])
      ]
    },
    {
      id: 'bajo6', name: 'Bajo 6', icon: 'bass', fretted: true,
      labels: ['6', '5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar', 'Estándar', [23, 28, 33, 38, 43, 48]),
        T('eb', 'Medio tono abajo', 'Bajadas', [22, 27, 32, 37, 42, 47], FL)
      ]
    },
    {
      id: 'ukelele', name: 'Ukelele', icon: 'uke', fretted: true,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (GCEA)', 'Soprano · concierto · tenor', [67, 60, 64, 69]),
        T('lowg', 'G grave (GCEA)', 'Soprano · concierto · tenor', [55, 60, 64, 69]),
        T('d', 'Re (ADF#B)', 'Soprano · concierto · tenor', [69, 62, 66, 71]),
        T('bb', 'Si bemol (FBbDG)', 'Soprano · concierto · tenor', [65, 58, 62, 67], FL),
        T('bari', 'Barítono (DGBE)', 'Barítono', [50, 55, 59, 64])
      ]
    },
    {
      id: 'charango', name: 'Charango', icon: 'uke', fretted: true,
      labels: ['5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Temple natural (GCEAE)', 'Estándar', [67, 72, 76, 69, 76], { alt: { 2: 64 } }),
        T('d', 'Temple en Re (ADF#BF#)', 'Otras', [69, 74, 78, 71, 78], { alt: { 2: 66 } })
      ]
    },
    {
      id: 'violin', name: 'Violín', icon: 'violin', fretted: false,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (GDAE)', 'Estándar', [55, 62, 69, 76]),
        T('crossa', 'Cross A (AEAE)', 'Scordatura', [57, 64, 69, 76]),
        T('gdgd', 'GDGD', 'Scordatura', [55, 62, 67, 74])
      ]
    },
    {
      id: 'viola', name: 'Viola', icon: 'violin', fretted: false,
      labels: ['4', '3', '2', '1'],
      tunings: [T('std', 'Estándar (CGDA)', 'Estándar', [48, 55, 62, 69])]
    },
    {
      id: 'cello', name: 'Violonchelo', icon: 'violin', fretted: false,
      labels: ['4', '3', '2', '1'],
      tunings: [T('std', 'Estándar (CGDA)', 'Estándar', [36, 43, 50, 57])]
    },
    {
      id: 'contrabajo', name: 'Contrabajo', icon: 'bass', fretted: false,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Orquesta (EADG)', 'Estándar', [28, 33, 38, 43]),
        T('solo', 'Solista (F#BEA)', 'Estándar', [30, 35, 40, 45])
      ]
    },
    {
      id: 'mandolina', name: 'Mandolina', icon: 'uke', fretted: true,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (GDAE)', 'Estándar', [55, 62, 69, 76]),
        T('gdgd', 'Cross G (GDGD)', 'Otras', [55, 62, 67, 74])
      ]
    },
    {
      id: 'banjo', name: 'Banjo 5', icon: 'uke', fretted: true,
      labels: ['5', '4', '3', '2', '1'],
      tunings: [
        T('std', 'Open G (gDGBD)', 'Estándar', [67, 50, 55, 59, 62]),
        T('dblc', 'Doble C (gCGCD)', 'Otras', [67, 48, 55, 60, 62]),
        T('sawmill', 'Sawmill (gDGCD)', 'Otras', [67, 50, 55, 60, 62]),
        T('opend', 'Open D (f#DF#AD)', 'Otras', [66, 50, 54, 57, 62])
      ]
    },
    {
      id: 'cavaquinho', name: 'Cavaquinho', icon: 'uke', fretted: true,
      labels: ['4', '3', '2', '1'],
      tunings: [
        T('std', 'Estándar (DGBD)', 'Estándar', [62, 67, 71, 74]),
        T('dgbe', 'DGBE', 'Otras', [62, 67, 71, 76])
      ]
    },
    {
      id: 'cromatico', name: 'Cromático', icon: 'wave', fretted: false, chromatic: true,
      labels: [], tunings: [T('libre', 'Cualquier nota', 'Libre', [])]
    }
  ];

  root.INSTRUMENTS = INSTRUMENTS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
