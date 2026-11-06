import { NEW_PETS } from './newpets';
// Mascotas. Cada una es una tira horizontal pets/<id>.webp con `n` cuadros de `cell` px.
// `disp` = tamaño en px a escala M; `body` = zona clicable; `frames` = qué cuadros usa cada estado.
// `sp` = su truco especial (id del truco en specials.js, probabilidad por decisión y cuadros propios en `sf`).
// `quotes` = frases propias que dice de vez en cuando (aparte de las de `voice`).
// Las hojas originales (con las que se generan las tiras) están en /assets-src/pets.
const BASE_PETS = [
 {
  id: 'tripulante', name: 'Tripulante', n: 12, cell: [190,115], disp: [119.8,72.5], body: [51.1,58],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['Sospechoso…','¿Quién es el impostor?','Hice mis tareas, lo juro.'],
  sp: {id:'knife',chance:0.045,sf:{pose:8,stab:9}},
 },
 {
  id: 'conde', name: 'Conde', n: 12, cell: [184,118], disp: [117.9,75.6], body: [57,66],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['Buenas noches… siempre.','No me da el sol, gracias.','Tengo sed… de música.'],
  sp: {id:'bat',chance:0.05,sf:{pose:8}},
 },
 {
  id: 'capi', name: 'Capi', n: 12, cell: [192,111], disp: [103.6,59.9], body: [48.5,48],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['Todo chill.','Tranquilo, sin prisa.','Vida de capibara.'],
  sp: {id:'spa',chance:0.04,sf:{calm:0}},
 },
 {
  id: 'diva', name: 'Diva', n: 12, cell: [176,123], disp: [128.3,89.7], body: [80.2,78],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['♪ la la la ♪','¡Pon algo bueno!','Hoy canto yo.'],
  sp: {id:'sing',chance:0.05,sf:{sing:3}},
 },
 {
  id: 'dino', name: 'Dino', n: 12, cell: [184,106], disp: [118.4,68.2], body: [54.7,56],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['¡No te caigas en el cactus!','Sin internet también funciono.','Saltar, saltar, saltar.'],
  sp: {id:'cactus',chance:0.05,sf:{hop:10}},
 },
 {
  id: 'pingui', name: 'Pingüi', n: 12, cell: [164,111], disp: [103.6,70.1], body: [52.4,60],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['Yo uso Linux, por cierto.','Hace calorcito aquí…','Waddle, waddle.'],
  sp: {id:'slide',chance:0.05,sf:{belly:11}},
 },
 {
  id: 'brujita', name: 'Brujita', n: 12, cell: [180,116], disp: [114.5,73.8], body: [64.3,70],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['¡Abracadabra!','Cuidado, que hechizo.','Mi varita está cargada.'],
  sp: {id:'lightning',chance:0.05,sf:{raise:8}},
 },
 {
  id: 'capitan', name: 'Capitán', n: 12, cell: [168,126], disp: [101.4,76], body: [49.5,70],
  frames: {idle:[0,1,2,1],walk:[1,2],music:[3],love:[4,5],hot:[6],cold:[7],wave:[8],jump:[10],alert:[9,10],sleep:[11],run:[10]},
  voice: ['¡A la orden!','Todo en orden por aquí.','Rumbo fijo.'],
  sp: {id:'siren',chance:0.045,sf:{point:9}},
 },
 {
  id: 'deportivo', name: 'Deportivo', n: 8, cell: [198,91], disp: [118.2,54.3], body: [104.5,40],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[6]},
  voice: ['¡Brrm brrm!','Tanque lleno.','Más rápido, más rápido.'],
  sp: {id:'drift',chance:0.05,sf:{boom:6}},
 },
 {
  id: 'roquita', name: 'Roquita', n: 8, cell: [170,83], disp: [97.1,47.4], body: [49.1,32],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[0]},
  voice: ['…','Soy una roca. Eso es todo.','Piedra firme.'],
  sp: {id:'quake',chance:0.05,sf:{shake:3}},
 },
 {
  id: 'gato', name: 'Gato', n: 8, cell: [198,103], disp: [124.3,64.7], body: [57.1,54],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[6]},
  voice: ['Miau.','Dame comida. O no.','Prrrr…'],
  sp: {id:'yarn',chance:0.05,sf:{swat:5,pounce:6}},
 },
 {
  id: 'perro', name: 'Perro', n: 8, cell: [196,103], disp: [119.3,62.7], body: [59.7,56],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[6]},
  voice: ['¡Guau!','¿Vamos a pasear?','¡Eres mi persona favorita!'],
  sp: {id:'bone',chance:0.05,sf:{jump:6}},
 },
 {
  id: 'caballo', name: 'Caballo', n: 8, cell: [212,113], disp: [130.8,69.7], body: [79.6,66],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[6]},
  voice: ['¡Iiiihhh!','Galopando en la nube.','Sin prisa, pero sin pausa.'],
  sp: {id:'rainbow',chance:0.05,sf:{gallop:6}},
 },
 {
  id: 'dragon', name: 'Dragón', n: 8, cell: [210,97], disp: [141.6,65.4], body: [67.4,60],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[6]},
  voice: ['¡Rawr!','Cuidado, que quemo.','Dragón pequeño, fuego grande.'],
  sp: {id:'fire',chance:0.05,sf:{breath:3}},
 },
 {
  id: 'creeper', name: 'Verdecito', n: 8, cell: [154,94], disp: [112.3,68.6], body: [42.3,62],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[0]},
  voice: ['Ssssss…','No me mires así.','Prometo no explotar.'],
  sp: {id:'boom',chance:0.045,sf:{hiss:3}},
 },
 {
  id: 'chispa', name: 'Chispa', n: 8, cell: [188,95], disp: [121,61.1], body: [58.6,56],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[0]},
  voice: ['¡Chis chis!','Carga al 100%.','Energía de sobra.'],
  sp: {id:'zap',chance:0.05,sf:{power:6}},
 },
 {
  id: 'fantasma', name: 'Fantasma', n: 8, cell: [176,101], disp: [113.3,65], body: [56.6,56],
  frames: {idle:[0],walk:[0],music:[1],love:[2],hot:[3],cold:[4],wave:[5],jump:[6],alert:[5,6],sleep:[7],run:[0]},
  voice: ['¡Buuu!','Atravieso paredes.','Casi invisible.'],
  sp: {id:'ghost',chance:0.05,sf:{boo:6}},
 },
 {
  id: 'rick', name: 'Rick', n: 12, cell: [88,106], disp: [55.4,66.8], body: [34,58],
  frames: {idle:[0,1],walk:[0,1],music:[6],love:[7],hot:[9],cold:[5],wave:[3],jump:[8],alert:[8,9],sleep:[11],run:[0,1]},
  voice: ['Wubba lubba dub dub!','Soy científico, no niñera.','¡Sácame de aquí, Morty!','*burp* Qué asco de universo.'],
  grabFrame: 8,
  idleWild: {pool:[2,3],chance:0.16},
  sp: {id:'rickmix',chance:0.05,sf:{gun:4,enter:10,shock:8,aura:9}},
 },
 {
  id: 'morty', name: 'Morty', n: 12, cell: [88,96], disp: [55.4,60.5], body: [34,52],
  frames: {idle:[0,0,1],walk:[0,1],music:[2],love:[6],hot:[4],cold:[10],wave:[2],jump:[7],alert:[7,4],sleep:[11],run:[9]},
  voice: ['¡Ay, caray, Rick!','No creo que esto sea buena idea…','Oh, hombre. Oh, hombre.','Solo quiero ir a la escuela.'],
  grabFrame: 7,
  quotes: {every:[70000,150000],list:['¡Ay, caray!','¡Rick, no! ¡Rick, espera!','Oh, hombre…','¡Yo no firmé para esto!']},
  sp: {id:'panic',chance:0.05,sf:{sweat:4,shake:10,run:9,cry:5,laugh:8,shock:7}},
 },
 {
  id: 'dex', name: 'Dex', n: 12, cell: [108,110], disp: [68,69.3], body: [35.9,64],
  frames: {idle:[0,0,1,0],walk:[0,8],music:[2],love:[3],hot:[4],cold:[5],wave:[6],jump:[9],alert:[7,8],sleep:[11],run:[9]},
  voice: ['Tonight’s the night.','No blood, no foul.','Hoy me toca ser buen vecino.','Todo bajo control.'],
  grabFrame: 7,
  quotes: {every:[55000,130000],list:['Tonight’s the night.','No blood, no foul.','Tonight’s the night…','Todo bajo control.']},
  sp: {id:'slash',chance:0.05,sf:{crouch:10,knife:8,rage:6,shock:7}},
 },
 {
  id: 'hielo', name: 'Asesino del hielo', n: 11, cell: [96,119], disp: [60.5,75], body: [34,64],
  frames: {idle:[0,0,4],walk:[0,4],music:[1],love:[2],hot:[4],cold:[5],wave:[7],jump:[8],alert:[6,3],sleep:[10],run:[8]},
  voice: ['Hola, hermano.','Qué frío hace… me gusta.','Tengo un regalito helado.','Shhh… no lo arruines.'],
  grabFrame: 6,
  quotes: {every:[80000,160000],list:['Hola, hermano.','El frío conserva todo.','Qué manos tan frías, ¿no?']},
  sp: {id:'freeze',chance:0.05,sf:{hand:3,ice:5,rage:6,crouch:9}},
 },
 {
  id: 'dragonhielo', name: 'Dragón de hielo', n: 11, cell: [116,111], disp: [73.1,69.9], body: [49.1,54],
  frames: {idle:[0,4],walk:[0,4],music:[1],love:[2],hot:[5],cold:[8],wave:[6],jump:[6],alert:[8,6],sleep:[10],run:[6]},
  voice: ['Grrr… qué frescura.','Mi aliento es de invierno.','Cuidado, resbalas.','¡Frrrr!'],
  sp: {id:'icebreath',chance:0.05,sf:{breath:3,lie:9}},
 },
 {
  id: 'dragonnieve', name: 'Dragón de nieve', n: 11, cell: [114,110], disp: [71.8,69.3], body: [48.3,54],
  frames: {idle:[0,4],walk:[0,4],music:[1],love:[2],hot:[5],cold:[8],wave:[6],jump:[6],alert:[8,6],sleep:[10],run:[6]},
  voice: ['Copito de nieve, a su orden.','Hoy nieva en mi corazón.','Rawr… suavecito.','¡Brrr, qué lindo frío!'],
  sp: {id:'blizzard',chance:0.05,sf:{snow:5,cheer:2,wave:6}},
 },
 {
  id: 'loky', name: 'Loky', n: 12, cell: [186,130], disp: [117.2,81.9], body: [51.6,74],
  frames: {idle:[0,7,0],walk:[0,1],music:[2],love:[3],hot:[10],cold:[10],wave:[6],jump:[9],alert:[4,6],sleep:[11],run:[8]},
  voice: ['Estoy cargado de glorioso propósito.','No soy tu villano. Aún.','Soy un dios, ¿lo recuerdas?','Un truco de magia y desaparezco.'],
  grabFrame: 9,
  quotes: {every:[90000,170000],list:['Estoy cargado de glorioso propósito.','Arrodíllate… o no, da igual.','Travesuras, solo travesuras.']},
  sp: {id:'illusion',chance:0.05,sf:{magic:5,blast:4,think:7}},
 },
];

export const PETS = [...BASE_PETS, ...NEW_PETS];

export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const MAX_PETS = 5;
