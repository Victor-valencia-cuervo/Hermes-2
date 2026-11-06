// Mascotas nuevas (tiras generadas desde las hojas de sprites). Se suman a las de pets.js.
// Las frases van una por línea y numeradas: para agregar una, añade otra línea al final de la lista.
export const NEW_PETS = [
 {
  id: 'tralalero', name: 'Tralalero', n: 15, cell: [255,165], disp: [115.9,75.0], body: [87.3,48],
  frames: {"idle":[0,1,2],"walk":[0,3],"music":[4,5,6],"love":[12],"hot":[9],"cold":[10],"wave":[7],"jump":[11],"alert":[11,8],"sleep":[14],"run":[3,0]},
  voice: [
    /* 1 */ "¡Tralalero Tralalá!",
    /* 2 */ "Tiburón con tenis, así soy yo.",
    /* 3 */ "Nado en la música, camino en la pantalla.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡Tralalero Tralalá!",
      /* 2 */ "Gluglú… ¿alguien dijo mar?",
    ],
  },
  sp: {id:'tralala',chance:0.05,sf:{"power":13}},
 },
 {
  id: 'ninja', name: 'Ninja', n: 17, cell: [153,174], disp: [69.5,79.1], body: [33.6,59],
  frames: {"idle":[0],"walk":[1,2,3,4],"music":[7],"love":[13,14],"hot":[8],"cold":[9],"wave":[6],"jump":[5],"alert":[11],"sleep":[15,16],"run":[3,4,1,2]},
  voice: [
    /* 1 */ "Shhh… ya estoy detrás de ti.",
    /* 2 */ "El silencio también es una técnica.",
    /* 3 */ "Sin ruido, sin rastro.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Un ninja nunca pierde la calma.",
      /* 2 */ "Mi bufanda roja es sagrada.",
    ],
  },
  sp: {id:'ninja',chance:0.05,sf:{"throw":[11,12],"smoke":[8,9,10]}},
 },
 {
  id: 'batman', name: 'Batman', n: 13, cell: [260,166], disp: [118.2,75.5], body: [41.4,64],
  frames: {"idle":[0],"walk":[3,11],"music":[2],"love":[0],"hot":[5],"cold":[1],"wave":[9],"jump":[4],"alert":[2,3],"sleep":[1],"run":[7,6]},
  voice: [
    /* 1 */ "Yo soy la noche.",
    /* 2 */ "Hoy toca justicia… y una buena playlist.",
    /* 3 */ "No tengo superpoderes, solo mucho dinero y buen gusto.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "No soy un héroe, solo hago lo necesario.",
      /* 2 */ "La noche es mía.",
    ],
  },
  sp: {id:'batman',chance:0.05,sf:{"glide":12,"punch":6,"arang":10}},
 },
 {
  id: 'doakes', name: 'Doakes', n: 24, cell: [127,173], disp: [57.7,78.6], body: [30,65],
  frames: {"idle":[17,18],"walk":[11,12,13,14,15,16],"music":[2],"love":[2],"hot":[10],"cold":[9],"wave":[8],"jump":[6],"alert":[1,8],"sleep":[0],"run":[3,4,5,7]},
  voice: [
    /* 1 */ "Te estoy vigilando.",
    /* 2 */ "Algo no me cuadra contigo.",
    /* 3 */ "Sé lo que eres.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Esto no se queda así.",
      /* 2 */ "Tengo ojos en todas partes.",
    ],
  },
  sp: {id:'watch',chance:0.05,sf:{"watch":[19,20],"point":[21,22],"flex":23}},
 },
 {
  id: 'batista', name: 'Batista', n: 28, cell: [155,177], disp: [70.5,80.5], body: [31.6,62],
  frames: {"idle":[0,2,10,13],"walk":[3,4,5,8,9],"music":[6,24,25,26,27],"love":[11],"hot":[14],"cold":[15],"wave":[1],"jump":[12],"alert":[19,21],"sleep":[16,17,18],"run":[7,8,9,3]},
  voice: [
    /* 1 */ "¡LA PASIÓN!",
    /* 2 */ "Esto lo resolvemos con café y paciencia.",
    /* 3 */ "Soy detective, pero también soy simpático.",
    /* 4 */ "¿Alguien dijo baile?",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡LA PASIÓN, mi hermano!",
      /* 2 */ "Con calma que el caso se resuelve.",
    ],
  },
  sp: {id:'llamada',chance:0.05,sf:{"phone":19,"dance":[6,24,25,26,27]}},
 },
 {
  id: 'jesus', name: 'Jesús', n: 16, cell: [138,216], disp: [62.7,98.2], body: [30,66],
  frames: {"idle":[0,1],"walk":[2,3,4],"music":[7],"love":[9],"hot":[10],"cold":[6],"wave":[5],"jump":[15],"alert":[13,15],"sleep":[11],"run":[3,4,2]},
  voice: [
    /* 1 */ "La paz sea contigo.",
    /* 2 */ "Hoy es un buen día para perdonar.",
    /* 3 */ "Buena música, buenas vibras.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Amaos los unos a los otros.",
      /* 2 */ "Tranquilo, todo tiene arreglo.",
    ],
  },
  sp: {id:'buddy',chance:0.05,sf:{"dove":8,"glow":12}},
 },
 {
  id: 'caballero', name: 'Caballero', n: 12, cell: [154,162], disp: [70.0,73.6], body: [38.7,63],
  frames: {"idle":[0,1],"walk":[4,5,6],"music":[2],"love":[3],"hot":[7],"cold":[9],"wave":[10],"jump":[8],"alert":[2,3],"sleep":[11],"run":[4,6,8]},
  voice: [
    /* 1 */ "¡Por el reino!",
    /* 2 */ "Mi armadura pesa, pero mi honor más.",
    /* 3 */ "A sus órdenes, mi señor.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Defiendo esta pantalla con honor.",
      /* 2 */ "Mi espada está lista.",
    ],
  },
  sp: {id:'carga',chance:0.05,sf:{"run":[4,6,8]}},
 },
 {
  id: 'stewie', name: 'Stewie', n: 18, cell: [156,159], disp: [70.9,72.3], body: [45.2,53],
  frames: {"idle":[1,2],"walk":[8,9,10],"music":[3],"love":[11],"hot":[12],"cold":[13],"wave":[14],"jump":[15],"alert":[6,3],"sleep":[0],"run":[4,5,7]},
  voice: [
    /* 1 */ "¡La victoria será mía!",
    /* 2 */ "¡Maldición! ¿Dónde dejé el control mental?",
    /* 3 */ "Soy un genio, ¿lo ves?",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡Qué demonios!",
      /* 2 */ "Pronto dominaré el mundo.",
    ],
  },
  sp: {id:'laser',chance:0.05,sf:{"gold":[16,17]}},
 },
 {
  id: 'cain', name: 'Caine', n: 15, cell: [154,166], disp: [70.0,75.5], body: [34.3,60],
  frames: {"idle":[0,13,14],"walk":[13,14],"music":[4],"love":[5],"hot":[11],"cold":[12],"wave":[10],"jump":[8],"alert":[11,12],"sleep":[9],"run":[1,2,3]},
  voice: [
    /* 1 */ "¡Bienvenidos al Increíble Circo Digital!",
    /* 2 */ "Aquí el espectáculo nunca termina.",
    /* 3 */ "¡Palmas, palmas para el público!",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡Que comience el espectáculo!",
      /* 2 */ "¿Un pequeño error técnico? ¡Jamás!",
    ],
  },
  sp: {id:'show',chance:0.05,sf:{"cane":10,"fall":[6,7]}},
 },
 {
  id: 'snoopy', name: 'Snoopy', n: 43, cell: [169,256], disp: [76.8,116.4], body: [36.1,57],
  frames: {"idle":[11,5,8],"walk":[11,12,13,14,15,16,17,18],"music":[19,20,21,22],"love":[10],"hot":[8],"cold":[22],"wave":[6],"jump":[18],"alert":[8,11],"sleep":[4],"run":[23,24,25,26,27,28,31,32,33,34]},
  voice: [
    /* 1 */ "¡Contacto! A volar.",
    /* 2 */ "Para ser un perro, vivo muy bien.",
    /* 3 */ "Hoy escribo la gran novela… mañana.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Soy el as de la aviación.",
      /* 2 */ "Woodstock, ¿ya cenamos?",
    ],
  },
  sp: {id:'vuelo',chance:0.05,sf:{"house":[0,1]}},
 },
 {
  id: 'snoopybn', name: 'Snoopy B/N', n: 28, cell: [190,196], disp: [86.4,89.1], body: [45.3,53],
  frames: {"idle":[2,15,20,0],"walk":[7,8,9,10,11,12,13],"music":[3,4,5,6],"love":[24],"hot":[16],"cold":[17,18],"wave":[4],"jump":[5],"alert":[19],"sleep":[27],"run":[7,8,9,10,11,12,13]},
  voice: [
    /* 1 */ "Mmm… ¿y si vuelo un ratito?",
    /* 2 */ "Dibujado a pura tinta.",
    /* 3 */ "Woodstock, ¿ya cenamos?",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Soy el as de la aviación… en mi cabeza.",
      /* 2 */ "Mi casita roja es mi nave.",
    ],
  },
  sp: {id:'imagina',chance:0.05,sf:{"look":0,"plane":26}},
 },
 {
  id: 'mago', name: 'Mago', n: 6, cell: [176,176], disp: [80.0,80.0], body: [48.0,56.0],
  frames: {"idle":[0,1,2,3,4,5],"walk":[0,1,2,3,4,5],"music":[0,1,2,3,4,5],"love":[0,1,2,3,4,5],"hot":[0,1,2,3,4,5],"cold":[0,1,2,3,4,5],"wave":[0,1,2,3,4,5],"jump":[0,1,2,3,4,5],"alert":[0,1,2,3,4,5],"sleep":[0,1,2,3,4,5],"run":[0,1,2,3,4,5]},
  voice: [
    /* 1 */ "Estoy meditando… ¿lo notas?",
    /* 2 */ "El silencio también tiene su magia.",
    /* 3 */ "Respira hondo, ya casi llegas.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "La calma es el mejor hechizo.",
      /* 2 */ "Me concentro… me concentro…",
    ],
  },
  hover: true, fps: 5,
 },
 {
  id: 'mariposa', name: 'Mariposa', n: 4, cell: [117,132], disp: [53.2,60.0], body: [31.9,42.0],
  frames: {"idle":[0,1,2,3],"walk":[0,1,2,3],"music":[0,1,2,3],"love":[0,1,2,3],"hot":[0,1,2,3],"cold":[0,1,2,3],"wave":[0,1,2,3],"jump":[0,1,2,3],"alert":[0,1,2,3],"sleep":[0,1,2,3],"run":[0,1,2,3]},
  voice: [
    /* 1 */ "Vuelo bajito, vuelo bonito.",
    /* 2 */ "Qué lindo se ve todo desde aquí.",
    /* 3 */ "Aleteo, aleteo…",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Soy ligera como el aire.",
      /* 2 */ "Entre flores y canciones.",
    ],
  },
  hover: true, fps: 9,
 },
 {
  id: 'brian', name: 'Brian', n: 28, cell: [179,179], disp: [81.4,81.4], body: [32.7,64],
  frames: {"idle":[0,5],"walk":[16,17,18,19],"music":[6],"love":[12],"hot":[7],"cold":[8],"wave":[9],"jump":[11],"alert":[10],"sleep":[13],"run":[20,21,22,23]},
  voice: [
    /* 1 */ "Un martini, por favor. Seco.",
    /* 2 */ "Soy escritor, ¿sabías?",
    /* 3 */ "Estoy en mi fase intelectual.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "La vida es corta, el martini también.",
      /* 2 */ "Tengo un libro por terminar.",
    ],
  },
  sp: {id:'martini',chance:0.05,sf:{"martini":[24,25,26,27],"news":[1,2,3,4],"sit":[14,15]}},
 },
 {
  id: 'peter', name: 'Peter', n: 60, cell: [192,205], disp: [87.3,93.2], body: [32.6,66],
  frames: {"idle":[0,1,2,3,4,5,6,7,8,9],"walk":[42,43,44,45,46,47],"music":[11,12,13,14],"love":[20,21,22],"hot":[53,54],"cold":[55,56],"wave":[23,24,25,26],"jump":[27,28,29,30,31,32],"alert":[49,48],"sleep":[57,58,59],"run":[42,43,44,45,46,47]},
  voice: [
    /* 1 */ "¡Je je je je!",
    /* 2 */ "Eso fue más gracioso en mi cabeza.",
    /* 3 */ "¿Hay cerveza por aquí?",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Eso fue épico, ¿no?",
      /* 2 */ "Me caí, pero con estilo.",
    ],
  },
  sp: {id:'risa',chance:0.05,sf:{"laugh":[15,16,17,18,19],"trip":[49,50,51,52],"hole":[35,36,37,38,39,40,41]}},
 },
 {
  id: 'jake', name: 'Jake', n: 105, cell: [147,146], disp: [93.3,92.6], body: [57.5,55],
  frames: {"idle":[0,1,102,103,104],"walk":[2,3,4,5,6,7],"music":[29,30,31,32,70,71,72,73],"love":[33],"hot":[14,15],"cold":[43],"wave":[31,32,77,78],"jump":[13,16,17,18],"alert":[39,40,41,42],"sleep":[19,20,21,22,92,93,99],"run":[8,9,10,11,12]},
  voice: [
    /* 1 */ "¡Todo bien, hermano!",
    /* 2 */ "A veces me estiro y a veces solo me echo a dormir.",
    /* 3 */ "Las cosas se arreglan solitas, tío.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Hermano, ¡qué día!",
      /* 2 */ "Si te portas bien, te estiro un abrazo.",
    ],
  },
  sp: {id:'gigante',chance:0.05,sf:{"flex":[82,83,84,85,86,87,88,89],"stretch":[38,102,103,104,67,68,69]}},
 },
 {
  id: 'finn', name: 'Finn', n: 141, cell: [104,93], disp: [92.1,82.4], body: [50.0,59],
  frames: {"idle":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],"walk":[39,40,41,42,43,44,45,46,47,48,49,50],"music":[31,32,33,34],"love":[34],"hot":[37],"cold":[38],"wave":[31,32,35],"jump":[80,81,82,83,84,85,86,87,88,89],"alert":[36],"sleep":[90,91,92],"run":[69,70,71,72,73,74,75,76,77,78,79]},
  voice: [
    /* 1 */ "¡Es hora de aventura!",
    /* 2 */ "¡Algebraico!",
    /* 3 */ "Voy a ayudar a quien lo necesite.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡Qué aventura, hermano!",
      /* 2 */ "No hay misión imposible.",
    ],
  },
  sp: {id:'gigante',chance:0.05,sf:{"pose":33,"stomp":[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68],"stretch":[22,23,24,25,26,27,28,29,30]}},
 },
 {
  id: 'stitch', name: 'Stitch', n: 26, cell: [177,201], disp: [80.5,91.4], body: [35.3,55],
  frames: {"idle":[0,1],"walk":[4,5,6,7,8,9],"music":[2,3],"love":[3],"hot":[16],"cold":[15],"wave":[2],"jump":[10],"alert":[11,12],"sleep":[17],"run":[5,6,8,9]},
  voice: [
    /* 1 */ "Ohana significa familia.",
    /* 2 */ "Soy pequeño, pero causo caos.",
    /* 3 */ "¡Música! ¡Más música!",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Ohana significa familia: nadie se queda atrás.",
      /* 2 */ "¡Soy un experimento… muy tierno!",
    ],
  },
  sp: {id:'surf',chance:0.05,sf:{"surf":[18,19,20,21,22,23,24,25]}},
 },
 {
  id: 'reyhelado', name: 'Rey Helado', n: 16, cell: [132,148], disp: [60.0,67.3], body: [37.6,55],
  frames: {"idle":[0,4],"walk":[2,5,7,9],"music":[11],"love":[1],"hot":[6],"cold":[8],"wave":[10,11],"jump":[12],"alert":[10],"sleep":[3],"run":[2,5,7,9]},
  voice: [
    /* 1 */ "¡Que sea invierno!",
    /* 2 */ "Pingüino… ¿dónde estás?",
    /* 3 */ "Mi corona es mi tesoro.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "¡Mi barba es mágica!",
      /* 2 */ "Hace frío, ¡qué lindo!",
    ],
  },
  sp: {id:'invierno',chance:0.05,sf:{"power":[13,14,15]}},
 },
 {
  id: 'vampiro', name: 'Vampiro', n: 35, cell: [124,171], disp: [56.4,77.7], body: [30,63],
  frames: {"idle":[0,1,2,3],"walk":[20,21,22,23,24,23,22,21],"music":[6,5],"love":[4],"hot":[27,28],"cold":[25],"wave":[14,15],"jump":[7],"alert":[16,17],"sleep":[26],"run":[20,21,22,23,24,23,22,21]},
  voice: [
    /* 1 */ "Nunca duermo… solo descanso.",
    /* 2 */ "¿Un poco de niebla?",
    /* 3 */ "Soy un clásico de los noventa.",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Mírame a los ojos…",
      /* 2 */ "La noche apenas empieza.",
    ],
  },
  sp: {id:'murcielago',chance:0.05,sf:{"cast":[16,17,18,19],"trans":[5,6,7],"bat":[8,9,10,11],"ash":[27,28,29,30,31,32,33,34],"hand":[12,13]}},
 },
 {
  id: 'impostor', name: 'Impostor', n: 138, cell: [114,108], disp: [78.6,74.5], body: [47.0,50],
  frames: {"idle":[0,16,17,18,48,49,50,51,52,53,54],"walk":[1,2,3,4,5,6,7,8],"music":[72,73,74,75,76,77],"love":[44,45,46,47],"hot":[34,35],"cold":[36,37,38,39],"wave":[55,56,57,58],"jump":[28,29],"alert":[40,41,42,43],"sleep":[19,20,21,22,23,24,25],"run":[10,11,12,13,14,15]},
  voice: [
    /* 1 */ "Yo no fui.",
    /* 2 */ "Estaba en eléctrica, lo juro.",
    /* 3 */ "Sospechoso… ¿yo? ¡Jamás!",
  ],
  quotes: {
    every: [100000, 190000],
    list: [
      /* 1 */ "Vi a Víctor salir de la ventilación.",
      /* 2 */ "¡Reunión de emergencia!",
    ],
  },
  sp: {id:'impostor',chance:0.05,sf:{"fly":[26,27],"body":9}},
 },
  {
   id: 'morado', name: 'Impostor morado', n: 25, cell: [154,162], disp: [70.0,73.6], body: [37.7,55],
   frames: {"idle":[0,13],"walk":[1,2,3,4,5,6],"music":[14],"love":[21],"hot":[19],"cold":[22],"wave":[23,24],"jump":[20],"alert":[7],"sleep":[16,17],"run":[9,10,11,12]},
   voice: [
    /* 1 */ "Yo no fui.",
    /* 2 */ "Soy un tripulante muy normal.",
    /* 3 */ "Esa ventilación ya estaba abierta.",
   ],
   quotes: {
    every: [100000, 190000],
    list: [
     /* 1 */ "¿Quién dijo impostor?",
     /* 2 */ "Solo estoy pasando por aquí.",
    ],
   },
  },
  {
   id: 'marine', name: 'Marine', n: 43, cell: [160,208], disp: [72.8,94.6], body: [40,81],
   url: 'pets/marine.png?v=1',
   frames: {"idle":[0,1,2],"walk":[3,4,5,6],"music":[7],"love":[8],"hot":[9],"cold":[10],"wave":[11],"jump":[12],"alert":[13,14],"sleep":[15,16,17],"run":[5,6,3,4]},
   voice: [
    /* 1 */ "¡Por el Emperador!",
    /* 2 */ "¿Misión de hoy, hermano?",
    /* 3 */ "Sanguinius me guía.",
   ],
   musicPhrases: [
    /* 1 */ "¡Himno de batalla!",
    /* 2 */ "Esta marcha da furia.",
   ],
   weatherPhrases: {
    hot: [
     /* 1 */ "Calor de Baal Secundus.",
     /* 2 */ "Mi armadura se derrite, mi fe no.",
    ],
    cold: [
     /* 1 */ "Frío de vacío espacial.",
     /* 2 */ "Térmicos al máximo… brrr.",
    ],
    rain: [
     /* 1 */ "Tormenta perfecta.",
     /* 2 */ "El cielo llora ira.",
    ],
   },
   quotes: {
    every: [100000, 190000],
    list: [
     /* 1 */ "La Rabia Negra acecha… la controlo.",
     /* 2 */ "¿Agua? ¿Plasma? Tengo sed.",
    ],
   },
   grabFrame: 13,
   sp: {id:'marine',chance:0.05,sf:{"sword":[18,20,21,22,23],"shoot":[24,25,27,28,29],"wings":[30,31,32,33,34,35],"kneel":37,"energy":[38,39],"victory":42}},
  },
];
