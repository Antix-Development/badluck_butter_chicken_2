// Badluck Butter Chicken (episode 2).
// My 2024 entry for js13k (https://js13kgames.com/).
// By Cliff Earl, Antix Development, 2024 (https://github.com/Antix-Development).

const log = (t) => console.log(t); // REMOVE FOR PRODUCTION.

// Math variables.
const M = Math;
const min = M.min;
const abs = M.abs;
const cos = M.cos;
const sin = M.sin;
const PI = M.PI;
const PI2 = PI * 2;

// Screen dimensions.
const WIDTH = 1920;
const HEIGHT = 1080;
const CENTERX = WIDTH / 2;
const CENTERY = HEIGHT / 2;

const px = 'px';

// Sound effect IDs.
const FX_CLICK        = 0;
const FX_COIN         = 1;
const FX_DEFLECT      = 2;
const FX_SHIELD       = 3;
const FX_MAGNET       = 4;
const FX_BESTSCORE    = 5;
const FX_CLOCK        = 6;

// Keyboard variables.
let keysEnabled;
let waitingForKey; // 1 if app is waiting for a new control key to be pressed.
let leftHeld; // Movement flags
let rightHeld;
let controlIndex; // Index of control key to be changed.
let controlLabel; // UI element to change when new control is set.
let CONTROL_LEFT = 0; // Indexes into keyboard control array.
let CONTROL_RIGHT = 1;

// Game timing variables.
let DT;
let elapsedTime = 0;
let thisFrame;
let lastFrame;
let paused;
let pauseState;

// UI.
let activeMenu;
let cursorVisible = 1;
let gameMode;

// Game modes.
const GAME_MODE_MENUS = 0;
const GAME_MODE_PLAYING = 1;
const GAME_MODE_GAMEOVER = 2;

let MULTIPLIER = 1; // Multiplier for velocities used to increase difficulty over time.

// Score management.
let playerScore;
let gotBestScore;
let spawningBestScoreEffects;
let bestScoreEffectsSpawnTimer;
let bestScoreEffectsSpawnCounter;

// Graphical assets.
let textureRegions = []; // Array of texture regions.
let svgString; // String used to generate SVG images, before they are mime encoded and rendered to the `a` canvas.
let SVG_ID = 0; // Used to generate unique filter identities.

// Coin management.
let coinSpawnTimer;
let coinPool;
let activeCoins;

let frames = 10; // Number of frames.
let duration = .5; // Duration in seconds.

// Badluck Butter Chicken.
let player;
const playerAcceleration = 150;
const playerMaxVelocity = 1200;
const playerLeanFactor = PI2 * .005;

// Pickups.
let shieldOverlay;

let pickupPool;
let activePickups;

let shielded;
let shieldCounter;
let shieldPickupSpawnTimer;

let magnetized;
let magnetCounter;
let magnetPickupSpawnTimer;
let magnetEffectSpawnTimer;

let clocked;
let clockCounter;
let clockPickupSpawnTimer;
let clockEffectSpawnTimer;

// Other game entities.
let sun;
let egg; // Big egg in the middle.

let enemies;
let ENEMY_SPAWN_RADIUS = 1500;
let collisionsEnabled;

let stars = [];
starfield = {vx: 0, vy: 0, angle: 0, speed: 100};

let particles = [];

let renderList;

// Actor types. NOTE: These values are also used for z-sorting.
const ACTOR_TYPE_STAR           = 0;
const ACTOR_TYPE_SUN            = 2;
const ACTOR_TYPE_EGG            = 3;
const ACTOR_TYPE_MAGNET_PICKUP  = 10;
const ACTOR_TYPE_SHIELD_PICKUP  = 11;
const ACTOR_TYPE_CLOCK_PICKUP   = 12;
const ACTOR_TYPE_COIN_PICKUP    = 19;
const ACTOR_TYPE_ROPE           = 20;
const ACTOR_TYPE_ENEMY          = 25;
const ACTOR_TYPE_PLAYER         = 30;
const ACTOR_TYPE_SHIELD         = 35;
const ACTOR_TYPE_PARTICLE       = 50;

//#region gl2.js.

// A modified version of gl2.js (https://github.com/Antix-Development/gl2), which in its self is a modified version of gl1.js (https://github.com/curtastic/gl1) (basically I made it a bit smaller).
let 
gl2_gl,
gl2_canvas,
gl2_shaderProgram,
gl2_extension,

gl2_ready,

gl2_jsImage,
gl2_texdestWidth,
gl2_texdestHeight,

gl2_rgbas,
gl2_rotations,
gl2_positions,

gl2_maxDraws = 4e4, // Max amount of images on the screen at the same time. You can set this to any number, it's just the array size.
gl2_draws = 0, // Internal count of images drawn so far this frame.

// Draw the defined rectangular area of the sprite-sheet to the screen at the given coordinates with the given scale, alpha blend, and rotation.
// rgba (optional). You can tint the image for example to green by passing 0x00FF007F. rgba alpha goes from 0 to 127 (0x7F) where 127 is not transparent at all. Higher than 127 will brighten the image more than normal.
// rotation is (optional). In radians. Negative is allowed. Rotated about its center.
gl2_drawImage = (sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight, rgba, rotation) => {
  let
    positions = gl2_positions, // Use a local variable so it's faster to access.

    i = gl2_draws * 6;

  // console.log(rgba);

  gl2_rgbas[i + 4] = rgba || 0xFFFFFF7F; // Store rgba after position/texture. Default to white and fully opaque.
  gl2_rotations[i + 5] = rotation || 0; // Store how rotated we want this image to be.

  // Positions array is 2-byte shorts not 4-byte floats so there's twice as many slots.
  i *= 2;

  // Store where we want to draw the image.
  positions[i] = destX;
  positions[i + 1] = destY;
  positions[i + 2] = destWidth;
  positions[i + 3] = destHeight;

  // Store what portion of our PNG we want to draw.
  positions[i + 4] = sourceX;
  positions[i + 5] = sourceY;
  positions[i + 6] = sourceWidth;
  positions[i + 7] = sourceHeight;

  gl2_draws++;
},

// A handy function for when you want to draw rectangles. For example debugging hitboxes, or to darken everything with semi-transparent black overlay. This assumes the top left pixel in your texture is white, so you can stretch/tint it to any size/color rectangle.
gl2_drawRect = (x, y, width, height, rgba, rotation) => gl2_drawImage(0, 0, 1, 1, x, y, width, height, rgba, rotation),

// Call this every frame to actually draw everything onto your canvas. Renders all drawImage calls since the last time you called drawEverything.
gl2_drawEverything = () => {
  gl2_gl.clear(gl2_gl.COLOR_BUFFER_BIT); // Clear the canvas.
  gl2_gl.bufferSubData(gl2_gl.ARRAY_BUFFER, 0, gl2_rgbas.subarray(0, gl2_draws * 6)); // Only send to gl the amount slots in our arrayBuffer that we used this frame.
  gl2_extension.drawElementsInstancedANGLE(gl2_gl.TRIANGLES, 6, gl2_gl.UNSIGNED_BYTE, 0, gl2_draws); // Draw everything. 6 is because 2 triangles make a rectangle.
  gl2_draws = 0; // Go back to index 0 of our arrayBuffer, since we overwrite its slots every frame.
},

// Set the gl canvas background color with the given RGBA values.
gl2_setBackgroundColor = (r, g, b, a) => gl2_gl.clearColor(r, g, b, a),

gl2_setup = (canvas) => {

  gl2_canvas = canvas;

  gl2_gl = canvas.getContext('webgl', { antialias: 0, preserveDrawingBuffer: 1 }); // Get the canvas/context from html.
  // gl2_gl = canvas.getContext('webgl', { antialias: 0, alpha: 0, preserveDrawingBuffer: 1 }); // Get the canvas/context from html.
  gl2_extension = gl2_gl.getExtension('ANGLE_instanced_arrays'); // This extension allows us to repeat the draw operation 6 times (to make 2 triangles) on the same 12 slots in gl2_positions, so we only have to put the image data into gl2_positions once for each image each time we want to draw an image.

  gl2_setBackgroundColor(0, 0, 0, 0); // Set the gl canvas background color.

  let
  byteOffset = 0,

  // Tell gl where read from our arrayBuffer to set our shader attibute variables each time an image is drawn.
  setupAttribute = (name, dataType, amount) => {
    var attribute = gl2_gl.getAttribLocation(shaderProgram, name);
    gl2_gl.enableVertexAttribArray(attribute);
    gl2_gl.vertexAttribPointer(attribute, amount, dataType, 0, bytesPerImage, byteOffset);
    gl2_extension.vertexAttribDivisorANGLE(attribute, 1);
    if (dataType == gl2_gl.SHORT) amount *= 2;
    if (dataType == gl2_gl.FLOAT) amount *= 4;
    byteOffset += amount;
  },

  // Create a shader object of the the given type with the given code.
  createShader = (type, code) => {
    var shader = gl2_gl.createShader(type);
    gl2_gl.shaderSource(shader, code);
    gl2_gl.compileShader(shader);
    return shader;
  },

  // Bind the given buffer of the given type with the given usage.
  bindBuffer = (bufferType, buffer, usage = gl2_gl.STATIC_DRAW) => {
    gl2_gl.bindBuffer(bufferType, gl2_gl.createBuffer());
    gl2_gl.bufferData(bufferType, buffer, usage);
  },

  // Common strings that are reused in the shader code strings
  ATTRIBUTE = 'attribute',
  VARYING = 'varying',
  UNIFORM = 'uniform',

  // Create shaders
  vertShader = createShader(gl2_gl.VERTEX_SHADER, `${ATTRIBUTE} vec2 a;${ATTRIBUTE} vec2 b;${ATTRIBUTE} vec2 c;${ATTRIBUTE} vec4 d;${ATTRIBUTE} vec4 e;${ATTRIBUTE} float f;${VARYING} highp vec2 g;${VARYING} vec4 h;${UNIFORM} vec2 i;${UNIFORM} vec2 j;void main(void){vec2 k;if(f!=0.0){float l=cos(f);float m=sin(f);vec2 n=c*(a-0.5);k=(b+vec2(l*n.x-m*n.y,m*n.x+l*n.y)+c/2.0)/i;}else{k=(b+c*a)/i;}gl_Position=vec4(k.x-1.0,1.0-k.y,0.0,1.0);g=(d.xy+d.zw*a)/j;if(e.x>127.0){float o=pow(2.0,(e.x-127.0)/16.0)/255.0;h=vec4(e.w*o,e.z*o,e.y*o,1.0);}else h=vec4(e.w/255.0,e.z/255.0,e.y/255.0,e.x/127.0);}`), // Each time we draw an image it will run this 6 times. Once for each point of the 2 triangles we use to make the image's rectangle area. The only thing that changes on each repeated draw for the same image is a, so we can get to each corner of the image's rectangle area.
  fragShader = createShader(gl2_gl.FRAGMENT_SHADER, `${VARYING} highp vec2 g;${VARYING} highp vec4 h;${UNIFORM} sampler2D p;void main(void){gl_FragColor=texture2D(p,g)*h;}`),

  // Create a shader program object and attach the shaders.
  shaderProgram = gl2_gl.createProgram();
  gl2_gl.attachShader(shaderProgram, vertShader);
  gl2_gl.attachShader(shaderProgram, fragShader);
  gl2_gl.linkProgram(shaderProgram);
  gl2_gl.useProgram(shaderProgram);
  gl2_shaderProgram = shaderProgram;

  // Tell gl that when we set the opacity, it should be semi transparent above what was already drawn.
  gl2_gl.blendFunc(gl2_gl.SRC_ALPHA, gl2_gl.ONE_MINUS_SRC_ALPHA);
  gl2_gl.enable(gl2_gl.BLEND);
  gl2_gl.disable(gl2_gl.DEPTH_TEST);

  bindBuffer(gl2_gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 2, 1, 3])); // Map triangle vertexes to our multiplier array, for which corner of the image drawn's rectangle each triangle point is at.

  bindBuffer(gl2_gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1])); // Our multiplier array for destWidth/destHeight so we can get to each corner of the image drawn.

  // Size multiplier vec2 variable. This code goes here so that it's linked to the Float32Array above, using those values.
  var attribute = gl2_gl.getAttribLocation(shaderProgram, "a");
  gl2_gl.enableVertexAttribArray(attribute);
  gl2_gl.vertexAttribPointer(attribute, 2, gl2_gl.FLOAT, 0, 0, 0);

  var
  shortsPerImagePosition = 2, // Whenever we call our drawImage(), we put in 2 shorts into our arrayBuffer for position (destX,destY)
  shortsPerImageSize = 2, // Whenever we call our drawImage(), we put in 2 shorts into our arrayBuffer for size (destWidth,destHeight)
  shortsPerImageTexPos = 4, // Whenever we call our drawImage(), we also store 4 shorts into our arrayBuffer (texX,texY,texdestWidth,texdestHeight)
  bytesPerImageRgba = 4, // Whenever we call our drawImage(), we also store 4 bytes into our arrayBuffer (r,g,b,a) for color and alpha.
  floatsPerImageRotation = 1, // Whenever we call our drawImage(), we also put a float for rotation.
  bytesPerImage = shortsPerImagePosition * 2 + shortsPerImageSize * 2 + shortsPerImageTexPos * 2 + bytesPerImageRgba + floatsPerImageRotation * 4, // Total bytes stored into arrayBuffer per image = 24
  arrayBuffer = new ArrayBuffer(gl2_maxDraws * bytesPerImage); // Make a buffer big enough to have all the data for the max images we can show at the same time.
  gl2_positions = new Int16Array(arrayBuffer); // Make 3 views on the same arrayBuffer, because we store 3 data types into this same byte array. When we store image positions/UVs into our arrayBuffer we store them as shorts (int16's)
  gl2_rotations = new Float32Array(arrayBuffer); // When we store image rotation into our arrayBuffer we store it as float, because it's radians.
  gl2_rgbas = new Uint32Array(arrayBuffer); // When we store image rgbas into our arrayBuffer we store it as 1 4-byte int32.

  bindBuffer(gl2_gl.ARRAY_BUFFER, arrayBuffer, gl2_gl.DYNAMIC_DRAW); // Make the gl vertex buffer and link it to our arrayBuffer. Using DYNAMIC_DRAW because these change as images move around the screen.

  setupAttribute("b", gl2_gl.SHORT, shortsPerImagePosition); // Tell gl that each time an image is drawn, have it read 2 array slots from our arrayBuffer as short, and store them in the vec2 I made "b"
  setupAttribute("c", gl2_gl.SHORT, shortsPerImageSize); // Then read the next 2 array slots and store them in my vec2 "c"
  setupAttribute("d", gl2_gl.SHORT, shortsPerImageTexPos); // Then read the next 4 array slots and store them in my vec4 "d"
  setupAttribute("e", gl2_gl.UNSIGNED_BYTE, bytesPerImageRgba); // Then read the next 4 bytes and store them in my vec4 "e"
  setupAttribute("f", gl2_gl.FLOAT, floatsPerImageRotation); // Then read the next 4 bytes as 1 float and store it in my float "f"
},

// Set the parameter with the given name.
gl2_setTexParameter = (name) => gl2_gl.texParameteri(gl2_gl.TEXTURE_2D, name, gl2_gl.NEAREST),

// Load texture from the given canvas
gl2_loadTexture = (texture) => {
  // Create a gl texture from image file.
  gl2_gl.bindTexture(gl2_gl.TEXTURE_2D, gl2_gl.createTexture());

  gl2_gl.texImage2D(gl2_gl.TEXTURE_2D, 0, gl2_gl.RGBA, gl2_gl.RGBA, gl2_gl.UNSIGNED_BYTE, texture);

  gl2_gl.generateMipmap(gl2_gl.TEXTURE_2D);
  gl2_gl.activeTexture(gl2_gl.TEXTURE0);

  // Tell gl that when draw images scaled up, keep it pixellated and don't smooth it.
  gl2_setTexParameter(gl2_gl.TEXTURE_MAG_FILTER);
  gl2_setTexParameter(gl2_gl.TEXTURE_MIN_FILTER);

  // Store texture size in vertex shader.
  gl2_texdestWidth = texture.width;
  gl2_texdestHeight = texture.height;
  gl2_gl.uniform2f(gl2_gl.getUniformLocation(gl2_shaderProgram, "j"), gl2_texdestWidth, gl2_texdestHeight);

  gl2_gl.viewport(0, 0, gl2_canvas.width, gl2_canvas.height); // Resize the gl viewport to be the new size of the canvas.
  gl2_gl.uniform2f(gl2_gl.getUniformLocation(gl2_shaderProgram, "i"), gl2_canvas.width / 2, gl2_canvas.height / 2); // Update the shader variables for canvas size. Sending it to gl now so we don't have to do the math in JavaScript on every draw, since gl wants to draw at a position from 0 to 1, and we want to do drawImage with a screen pixel position.

  gl2_ready = 1;
};
//#endregion

// #region sound

// This sound system is a modified version of ZzFXM (https://github.com/keithclark/ZzFXM), which also includes ZzFX (https://github.com/.KilledByAPixel/ZzFX).

const menuMusicModule = [ // carrier detect, by christian maeland.
  [ // Instruments.
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2]],
  [ // Patterns.
    [
      [2,-1,12,,15,,19,,12,,15,,19,,12,,15,,20,,12,,15,,20,,19,,17,,15,,17,,10,,14,,17,,10,,14,,17,,10,,14,,19,,10,,14,,19,,17,,15,,14,,15,,],
      [,1,12,.94,15,12.94,19,15.94,24,19.94,12,24.94,15,12.94,19,15.94,24,19.94,12,24.94,15,12.94,20,15.94,24,20.94,12,24.94,15,12.94,20,15.94,24,20.94,10,24.94,14,10.94,17,14.94,22,17.94,10,22.94,14,10.94,17,14.94,22,17.94,10,22.94,14,10.94,19,14.94,22,19.94,10,22.94,14,10.94,19,14.94,22,19.94],
      [,-1,,,,,12,,,,12,,,,12,,,,,,,,8,,,,8,,,,8,,,,,,,,10,,,,10,,,,10,,,,,,,,15,,,,15,,,,15,,,,],
      [2,-1,,,,,,,24,,,,24,,,,24,,,,,,,,20,,,,20,,,,20,,,,,,,,22,,,,22,,,,22,,,,,,,,27,,,,27,,,,27,,],
      [1,-1,,,,,,,,,,,,,,,,,24,,,,,,,,,,,,,,,,20,,,,,,,,,,,,,,,,22,,,,,,,,,,,,,,,,]
    ],
    [
      [2,-1,8,,12,,15,,8,,12,,15,,8,,12,,17,,8,,12,,17,,15,,14,,12,,14,,11,,14,,17,,11,,14,,17,,11,,14,,19,,11,,17,,11,,15,,11,,14,,17,,],
      [1,-1,27,,,,,,,,,,,,,,,,20,,,,,,,,,,,,,,,,26,,,,,,,,,,,,,,,,19,,19,,,,,,,,,,,,,,],
      [,1,8,22.94,12,8.94,15,12.94,20,15.94,8,20.94,12,8.94,15,12.94,20,15.94,8,20.94,12,8.94,17,12.94,20,17.94,8,20.94,12,8.94,17,12.94,20,17.94,18,19,,,,,,,,,,,19.94,,,,,,,,,,,,19.97,,,,,,,,],
      [,-1,,,,,8,,,,8,,,,8,,,,,,,,14,,,,14,,,,14,,,,,,,,7,,,,7,,,,7,,,,,,,,11,,,,11,,,,11,,,,],
      [2,-1,,,,,,,20,,,,20,,,,20,,,,,,,,26,,,,26,,,,26,,,,,,,,19,,,,19,,,,19,,,,,,,,23,,,,23,,,,23,,]
    ],
    [
      [2,-1,8,,12,,15,,8,,12,,15,,8,,12,,17,,8,,12,,17,,15,,14,,12,,14,,11,,14,,17,,11,,14,,17,,11,,14,,19,,11,,17,,11,,15,,11,,14,,17,,],
      [1,-1,27,,,,,,,,,,,,,,,,20,,,,,,,,,,,,,,,,26,,,,,,,,,,,,,,,,19,,19,,,,,,,,,,,,,,],
      [,1,8,22.94,12,8.94,15,12.94,20,15.94,8,20.94,12,8.94,15,12.94,20,15.94,8,20.94,12,8.94,17,12.94,20,17.94,8,20.94,12,8.94,17,12.94,20,17.94,18,19,,,,,18,19,,,,,18,19,,,23,,19.94,,19,,23.94,,23,,19.94,,26,,23.94,,],
      [,-1,,,,,8,,,,8,,,,8,,,,,,,,14,,,,14,,,,14,,,,,,,,7,,,,7,,,,7,,,,,,,,11,,,,11,,,,11,,,,],
      [2,-1,,,,,,,20,,,,20,,,,20,,,,,,,,26,,,,26,,,,26,,,,,,,,19,,,,19,,,,19,,,,,,,,23,,,,23,,,,23,,]
    ]
  ],
  [0,1,0,2], // Sequence.
  125, // BPM.
];

const gameMusicModule = [ // polowanie, by cavell.
  [ // Instruments.
    [.75,0,386,,,.25,2],
    [,0,22,,.07,.07,2,0,,,.5,.01],
    [2,0,800,,,.075,2,2,,,1e3,-.01,.02,4.8,-.3,,.065],
    [2,0,4e3,,,.03,2,1.25,,,,,.02,6.8,-.3,,.5],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2],
    [.75,0,386,,,.25,2]
  ],
  [ // Patterns.
    [
      [2,-1,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,],
      [,1,12,.99,12,.99,,,12,.99,,,12,.99,12,.99,12,.99,17,.99,17,.99,,,17,.99,,,17,.99,,,17,.99,7,.99,7,.99,,,7,.99,,,7,.99,7,.99,7,.99,12,.99,12,.99,,,12,.99,,,12,.99,,,12,.99],
      [,-1,12,.75,12,.75,16,.75,19,.75,12,.75,12,.75,16,.75,19,.75,17,.75,,,,,21,.75,,,24,.75,,,,,7,.75,,,,,11,.75,,,7,.75,,,,,12,.75,12,.75,,,10,.75,,,12,.75,,,,,],
      [,1,12.08,,31.08,24.08,12.08,,31.08,24.08,12.08,,31.08,24.08,12.08,,31.08,24.08,5.08,,24.08,17.08,5.08,,24.08,17.08,5.08,,24.08,17.08,5.08,,24.08,17.08,7.08,,26.08,19.08,7.08,,26.08,19.08,7.08,,26.08,19.08,7.08,,26.08,19.08,12.08,,31.08,24.08,12.08,,31.08,24.08,12.08,,31.08,24.08,12.08,,31.08,24.08],
      [3,-1,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,],
      [1,-1,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,]
    ],
    [
      [2,-1,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,],
      [,1,12,,12,,,,12,,,,12,,12,,12,,17,,17,.99,,,17,,,,17,,,,17,.99,7,,7,.99,,,7,,,,7,,7,.99,7,.99,12,,12,,,,12,,,,12,,,,12,.99],
      [,-1,12,.5,12,.5,16,.5,19,.5,12,.5,12,.5,16,.5,19,.5,17,.5,,,,,21,.5,,,24,.5,,,,,7,.5,,,,,11,.5,,,7,.5,,,,,12,.5,12,.5,,,10,.5,,,12,.5,,,,,],
      [,1,12.14,12.14,12.14,12.14,,,,,12.14,12.14,,,,,19.14,19.14,,,,,,,,,17.14,17.14,17.14,17.14,21.14,21.14,24.14,,,,,,11.14,11.14,,,7.14,7.14,,,,,14.14,14.14,,,,,16.14,,,,,,12.14,12.14,16.14,16.14,19.14,19.14],
      [,1,,16.88,,24.88,,16.88,,24.88,,16.88,,24.88,,16.88,,24.88,,21.88,,,,,,17.88,.99,,,29.88,.99,,,,,11.88,,,,,,19.88,,,,19.88,,,,,,16.88,,24.88,.99,,,24.88,.99,,,24.88,.99,,,,],
      [3,-1,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,],
      [1,-1,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,],
      [,1,,,,,28,,28,,,,26,,24,,,,26,,,,21,,24,,,,,,,,,19.99,23,,26,,,,26,,,,26,,23,,,,24,,,,,24.99,28,,,,,,,,,,],
      [,-1,,,,,,,,,,,,,,,,,,,24,29.88,17,21.88,,,17,21.88,,,17,21.88,24,29.88,,,16,19.88,7,11.88,,,7,11.88,,,7,11.88,14,19.88,,,,,12,16.88,,,12,16.88,,,12,16.88,19,24.88]
    ],
    [
      [2,-1,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,,,25,,25,,,,,,],
      [,1,12,,12,,,,12,,,,12,,12,,12,,17,,17,.99,,,17,,,,17,,,,17,.99,7,,7,.99,,,7,,,,7,,7,.99,7,.99,12,,12,,,,12,,,,12,,,,12,.99],
      [,-1,12,.5,12,.5,16,.5,19,.5,12,.5,12,.5,16,.5,19,.5,17,.5,,,,,21,.5,,,24,.5,,,,,7,.5,,,,,11,.5,,,7,.5,,,,,12,.5,12,.5,,,10,.5,,,12,.5,,,,,],
      [,1,12.14,12.14,12.14,12.14,,,,,12.14,12.14,,,,,19.14,19.14,,,,,,,,,17.14,17.14,17.14,17.14,21.14,21.14,24.14,,,,,,11.14,11.14,,,7.14,7.14,,,,,14.14,,,,,,16.14,16.14,19.14,19.14,12.14,12.14,12.14,12.14,16.14,16.14,19.14,19.14],
      [,1,,16.88,,24.88,,16.88,,24.88,,16.88,,24.88,,16.88,,24.88,,21.88,,,,,,17.88,.99,,,29.88,.99,,,,,11.88,,,,,,19.88,,,,19.88,,,,,,16.88,,24.88,.99,,,24.88,.99,,,24.88,.99,,,,],
      [3,-1,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,25,,,,,,25,,,,25,,,,,,,,,,,,,,],
      [1,-1,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,,,,,,,25,,25,,,,,,25,,25,,],
      [,1,,,,,28,,28,,,,26,,24,,,,26,,,,21,,24,,,,,,,,,24.99,26,,26,,,,26,,,,26,,23,,,19.99,24,,,,,,,,,,,,,,,,],
      [,-1,,,,,,,,,,,,,,,,,,,24,29.88,17,21.88,,,17,21.88,,,17,21.88,24,29.88,,,16,19.88,7,11.88,,,7,11.88,,,7,11.88,14,19.88,,,,,12,16.88,,,12,16.88,,,12,16.88,19,24.88]
    ]
  ],
  [0,0,1,2,1,2], // Sequence.
  180 // BPM.
];

const gameOverMusicModule = [
  [ // Instruments.
    [2,0,426,,.02,.2,,44,,,200,,,.1]
  ],
  [ // Patterns.
    [
      [,1,20,,,,19,,,,18,,,,17,,,,16,,,,,,,,,,,,,,,.99,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],
      [,-1,13,,,,12,,,,11,,,,10,,,,9,,,,,,,,,,,,,,,.99,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],
      [,1,23,,,,22,,,,21,,,,20,,,,19,,,,,,,,,,,,,,,.99,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]
    ]
  ],
  [0], // Sequence.
  125 // BPM.
];

let sounds = [];
let musicToStop = [];
let renderingInstrument;

// ZzFX by Frank Force (modified).

let zzfxVolume = 1;

let zzfxAudioContext;

const zzfxSampleRate = 44100;

// Create the `AudioContext` object which enables audio output.
const createAudioContext = e => {
  zzfxAudioContext = new AudioContext();
  enableAudio(OPTIONS.audio);
};

// Play an array of samples.
const playSamples = (...samples) => {

  const audioBuffer = zzfxAudioContext.createBuffer(samples.length, samples[0].length, zzfxSampleRate);
  const audioBufferSourceNode = zzfxAudioContext.createBufferSource();
  const gainNode = zzfxAudioContext.createGain();

  samples.map((d, i) => audioBuffer.getChannelData(i).set(d));
  audioBufferSourceNode.buffer = audioBuffer;
  audioBufferSourceNode.connect(gainNode); // `AudioBufferSourceNode` is connected to a `GainNode`
  gainNode.connect(zzfxAudioContext.destination); // `GainNode` is connected to the `AudioContext` for granular volume control.
  audioBufferSourceNode.start();

  return [audioBufferSourceNode, gainNode];
};

// Build an array of samples.
const newSound = (
    volume = 1,
    randomness = 0,
    frequency = 220,
    attack = 0,
    sustain = 0,
    release = .1,
    shape = 0,
    shapeCurve = 1,
    slide = 0,
    deltaSlide = 0,
    pitchJump = 0,
    pitchJumpTime = 0,
    repeatTime = 0,
    noise = 0,
    modulation = 0,
    bitCrush = 0,
    delay = 0,
    sustainVolume = 1,
    decay = 0,
    tremolo = 0,
    filter = 0) => {

    // init parameters
    // let PI2 = PI * 2,
    let sign = v => v < 0 ? -1 : 1,
    sampleRate = zzfxSampleRate,
    startSlide = slide *= 500 * PI2 / sampleRate / sampleRate,
    startFrequency = frequency *= PI2 / sampleRate,
//        (1 + randomness * 2 * M.random() - randomness) * PI2 / sampleRate,
    samples = [],
    t = 0,
    tm = 0,
    i = 0,
    j = 1,
    r = 0,
    c = 0,
    s = 0,
    f,
    length,

    // biquad LP/HP filter
    quality = 2,
    w = PI2 * abs(filter) * 2 / sampleRate,
    cosine = cos(w),
    alpha = sin(w) / 2 / quality,
    a0 = 1 + alpha,
    a1 = -2 * cosine / a0,
    a2 = (1 - alpha) / a0,
    b0 = (1 + sign(filter) * cosine) / 2 / a0,
    b1 =  - (sign(filter) + cosine) / a0,
    b2 = b0,
    x2 = 0,
    x1 = 0,
    y2 = 0,
    y1 = 0;

    // scale by sample rate
    attack = attack * sampleRate + 9; // minimum attack to prevent pop
    decay *= sampleRate;
    sustain *= sampleRate;
    release *= sampleRate;
    delay *= sampleRate;
    deltaSlide *= 500 * PI2 / sampleRate ** 3;
    modulation *= PI2 / sampleRate;
    pitchJump *= PI2 / sampleRate;
    pitchJumpTime *= sampleRate;
    repeatTime = repeatTime * sampleRate | 0;
    volume *= zzfxVolume;

    // generate waveform
    for (length = attack + decay + sustain + release + delay | 0; i < length; samples[i++] = s * volume) { // sample

      if (!(++c % (bitCrush * 100 | 0))) { // bit crush
            s = shape ? shape > 1 ? shape > 2 ? shape > 3 ? // wave shape
                sin(t ** 3) : // 4 noise
                M.max(min(M.tan(t), 1), -1) : // 3 tan
                1 - (2 * t / PI2 % 2 + 2) % 2 : // 2 saw
                1 - 4 * abs(M.round(t / PI2) - t / PI2) : // 1 triangle
                sin(t); // 0 sin

            s = (repeatTime ?
                1 - tremolo + tremolo * sin(PI2 * i / repeatTime) // tremolo
                 : 1) *
            sign(s) * (abs(s) ** shapeCurve) * // curve
            (i < attack ? i / attack : // attack
                i < attack + decay ? // decay
                1 - ((i - attack) / decay) * (1 - sustainVolume) : // decay falloff
                i < attack + decay + sustain ? // sustain
                sustainVolume : // sustain volume
                i < length - delay ? // release
                (length - i - delay) / release * // release falloff
                sustainVolume : // release volume
                0); // post release

            s = delay ? s / 2 + (delay > i ? 0 : // delay
                    (i < length - delay ? 1 : (length - i) / delay) * // release delay
                    samples[i - delay | 0] / 2 / volume) : s; // sample delay

            if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1); // apply filter
        }

        f = (frequency += slide += deltaSlide) * // frequency
        cos(modulation * tm++); // modulation
        t += f + f * noise * sin(i ** 5); // noise

        if (j && ++j > pitchJumpTime) { // pitch jump
            frequency += pitchJump; // apply pitch jump
            startFrequency += pitchJump; // also apply to start
            j = 0; // stop pitch jump time
        }

        if (repeatTime && !(++r % repeatTime)) { // repeat
            frequency = startFrequency; // reset frequency
            slide = startSlide; // reset slide
            j = j || 1; // reset pitch jump time
        }
    }

    if (!renderingInstrument) {
      sounds.push({
        samples
      });
    }

    return samples;
};

// ZzFX Music Renderer v2.0.3 by Keith Clark and Frank Force (modified).
const renderMusic = (instruments, patterns, sequence, BPM = 125) => {
  renderingInstrument = 1;

  let instrumentParameters;
  let i;
  let j;
  let k;
  let note;
  let sample;
  let patternChannel;
  let notFirstBeat;
  let stop;
  let instrument;
  let pitch;
  let attenuation;
  let outSampleOffset;
  let isSequenceEnd;
  let sampleOffset = 0;
  let nextSampleOffset;
  let sampleBuffer = [];
  let leftChannelBuffer = [];
  let rightChannelBuffer = [];
  let channelIndex = 0;
  let panning = 0;
  let hasMore = 1;
  let sampleCache = {};
  let beatLength = zzfxSampleRate / BPM * 60 >> 2;

  // for each channel in order until there are no more
  for(; hasMore; channelIndex++) {

    // reset current values
    sampleBuffer = [hasMore = notFirstBeat = pitch = outSampleOffset = 0];

    // for each pattern in sequence
    sequence.map((patternIndex, sequenceIndex) => {
      // get pattern for current channel, use empty 1 note pattern if none found
      patternChannel = patterns[patternIndex][channelIndex] || [0, 0, 0];

      // check if there are more channels
      hasMore |= !!patterns[patternIndex][channelIndex];

      // get next offset, use the length of first channel
      nextSampleOffset = outSampleOffset + (patterns[patternIndex][0].length - 2 - !notFirstBeat) * beatLength;
      // for each beat in pattern, plus one extra if end of sequence
      isSequenceEnd = sequenceIndex == sequence.length - 1;
      for (i = 2, k = outSampleOffset; i < patternChannel.length + isSequenceEnd; notFirstBeat = ++i) {

        // <channel-note>
        note = patternChannel[i];

        // stop if end, different instrument or new note
        stop = i == patternChannel.length + isSequenceEnd - 1 && isSequenceEnd ||
            instrument != (patternChannel[0] || 0) | note | 0;

        // fill buffer with samples for previous beat, most cpu intensive part
        for (j = 0; j < beatLength && notFirstBeat;

            // fade off attenuation at end of beat if stopping note, prevents clicking
            j++ > beatLength - 99 && stop ? attenuation += (attenuation < 1) / 99 : 0
        ) {
          // copy sample to stereo buffers with panning
          sample = (1 - attenuation) * sampleBuffer[sampleOffset++] / 2 || 0;
          leftChannelBuffer[k] = (leftChannelBuffer[k] || 0) - sample * panning + sample;
          rightChannelBuffer[k] = (rightChannelBuffer[k++] || 0) + sample * panning + sample;
        }

        // set up for next note
        if (note) {
          // set attenuation
          attenuation = note % 1;
          panning = patternChannel[1] || 0;
          if (note |= 0) {
            // get cached sample
            sampleBuffer = sampleCache[
              [
                instrument = patternChannel[sampleOffset = 0] || 0,
                note
              ]
            ] = sampleCache[[instrument, note]] || (
                // add sample to cache
                instrumentParameters = [...instruments[instrument]],
                instrumentParameters[2] *= 2 ** ((note - 12) / 12),

                // allow negative values to stop notes
                note > 0 ? newSound(...instrumentParameters) : []
            );
          }
        }
      }

      // update the sample offset
      outSampleOffset = nextSampleOffset;
    });
  }

  renderingInstrument = 0;

  return [leftChannelBuffer, rightChannelBuffer];
};

// Play the sound with the given id.
const playSound = id => {
  const sound = sounds[id];
  const oldGainNode = sound.gainNode;

  const [buffer, gainNode] = playSamples(sound.samples);

  sound.buffer = buffer;
  sound.gainNode = gainNode;

  if(oldGainNode) oldGainNode.gain.linearRampToValueAtTime(0, zzfxAudioContext.currentTime + .01); // Fade to no volume over .01 seconds.
};

// Play the given music object.
const playMusic = musicObject => {

  let samples = musicObject.samples;

  const [buffer, gainNode] = playSamples(...samples);

  gainNode.gain.value = 0;
  gainNode.gain.linearRampToValueAtTime(.10, zzfxAudioContext.currentTime + 1); // Fade to full volume over 1 second.

  buffer.loop = musicObject.loop;

  musicObject.buffer = buffer;
  musicObject.gainNode = gainNode;
  musicObject.samples = samples;
};

// Stop the given music object.
const stopMusic = musicObject => {
  musicObject.gainNode.gain.linearRampToValueAtTime(0, zzfxAudioContext.currentTime + 1); // Fade to silent over .01 seconds.
  musicObject.timer = 1; // The music will be stopped after 1 second.
  musicToStop.push(musicObject);
};

// Enable the audio according to the given state.
const enableAudio = state => {
  if (zzfxAudioContext) (state && OPTIONS.audio) ? zzfxAudioContext.resume() : zzfxAudioContext.suspend();
};

const menuMusicObject = {module: menuMusicModule, loop: 1};
const gameMusicObject = {module: gameMusicModule, loop: 1};
const gameOverMusicObject = {module: gameOverMusicModule, loop: 0};

menuMusicObject.samples = renderMusic(...menuMusicObject.module);
gameMusicObject.samples = renderMusic(...gameMusicObject.module);
gameOverMusicObject.samples = renderMusic(...gameOverMusicObject.module);

// #endregion

// #region localstorage

let OPTIONS; // Persistent data buffer.

const NAMESPACE = 'com.antix.bbc2'; // Persistent data filename.

// Save options to local storage.
const saveOptions = () => localStorage.setItem(NAMESPACE, JSON.stringify(OPTIONS));

// Reset options to default and save them to local storage.
const resetOptions = () => {
  OPTIONS = {
    best: 5000, // Top score.
    audio: 1, // Audio enabled.
    controls: [ // Controls.
      { // Left.
        code: 'KeyZ' // Ascii representation.
      },
      { // Right.
        code: 'KeyX'
      }
    ]
  };

  saveOptions(); // Save options to local storage.
};

// #endregion

// #region -- prng

// xorshift32.
let randomState = performance.now();//135724680;

// Call random() for a float, and random(max) for an integer between 0 and max.
const random = max => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  let result = (randomState >>> 0) / 4294967296 * (max | 1);
  return (!max) ? result : ~~result;
};

// Get a random integer in the given range.
const randomInt = (min, max) => ((random(max) + min));

// #endregion

// Constrain the given value to the given range.
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

// Functions that return strings representing SVG elements (or attributes) with the given parameters.
const SVG_HEAD = (w, h) => `<svg width="${w}" height="${h}" version="1.1" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
const SVG_FILL_WITH_COLOR_OR_URL = (fill) => ((fill.match(/[G-Z]/g)) ? `fill="url(#${fill})"` : `fill="#${fill}"`); // Fills with color or url.
const SVG_RECT = (x, y, w, h, fill, rx = 0, ry = rx, strokeWidth = 0, stroke = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${(SVG_FILL_WITH_COLOR_OR_URL(fill))} rx="${rx}" ry="${ry}" stroke-width="${strokeWidth}" stroke="#${stroke}"/>`;
const SVG_PATH = (path, fill, strokeWidth = 0, stroke = '0000') => `<path d="${path}" fill="#${fill}" stroke-width="${strokeWidth}" stroke="#${stroke}"/>`;
const SVG_TEXT = (x, y, text, color, size) => `<text x="${x}" y="${y}" fill="#${color}" font-family="Arial" font-size="${size}px" font-weight="900">${text}</text>`;
const SVG_CIRCLE = (x, y, r, fill = 'fff') => `<circle cx="${x}" cy="${y}" r="${r}" fill="#${fill}"/>`;
const SVG_RADIALGRADIENT = (x, y, r, color1, opacity1, offset1, color2, opacity2, offset2)  => (`<radialGradient id="Z${++SVG_ID}" cx="${x}" cy="${y}" r="${r}" gradientUnits="userSpaceOnUse">` + SVG_GRADIENT_COLOR_STOP(color1, opacity1, offset1) + SVG_GRADIENT_COLOR_STOP(color2, opacity2, offset2) + `</radialGradient>`);
const SVG_GRADIENT_COLOR_STOP = (color, opacity, offset) => (`<stop stop-color="#${color}" stop-opacity="${opacity}" offset="${offset}"/>`);

// Show or hide the mouse cursor according to the given state.
const showCursor = state => {
  if (state) {
    if (!cursorVisible) b.style.cursor = 'pointer'; // Only show the cursor if it is not visible.
      
  } else {
    if (cursorVisible) b.style.cursor = 'none'; // Only hide the cursor if it is visible.

  }
  cursorVisible = state; // Save the state.
};

// HTML element types.  
const TYPE_DIV = 0;
const TYPE_BUTTON = 1;
const TYPE_H1 = 2;
const TYPE_H2 = 3;
const TYPE_H3 = 4;
const TYPE_H4 = 5;
const TYPE_H5 = 6;
const TYPE_H6 = 7;

// Create a new HTML element of the given type.
const createElement = (id, type) => {
  const el = document.createElement(['div', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'][type | 0]);
  if (id) el.id = id;
  return el;
};

// Set the position of the given element to the given coordinates.
const setElementPosition = (el, left, top) => {el.style.left = left + px; el.style.top = top + px};

// Add the `centered` class to the given element causing it's text to be centered.
const centerElement = el => el.classList.add('centered');

// Append the given element to the given other element.
const appendElementTo = (el, other) => other.appendChild(el);

// Set the size of the given element to the given dimensions.
const setElementSize = (el, width, height) => {el.style.width = width + px; el.style.height = height + px};

// Set the background color of the given element to the given color.
const setElementBackgroundColor = (el, color) => el.style.backgroundColor = `#` + color;

// Set the given HTML elements innerHTML to the given HTML
const setHTML = (el, html) => el.innerHTML = html;

// Set the text for the given text button to the given text.
const setButtonLabel = (el, t) => el.firstElementChild.innerHTML = t;

// Create a new text label with the given parameters.
const newTextLabel = (size, text, x, y, id) => {
  const heading = createElement(id, size);
  heading.innerHTML = text;
  setElementPosition(heading, x, y);
  return heading;
};

// Create a new text button with the given parameters.
const newTextButton = (x, y, w, h, text, color, callback, id) => {
  const button = createElement(id, TYPE_BUTTON);

  const label = createElement('', TYPE_H4);
  label.innerHTML = text;
  appendElementTo(label, button);

  button.style.width = w + px; button.style.height = h + px;
  button.style.backgroundColor = '#' + color;
  setElementPosition(button, x, y);

  button.onclick = e => {
    callback();
    playSound(FX_CLICK); // Play after executing callback so that it plays correctly when toggling audio on and off.
  };

  return button;
};

// Open the given menu.
const openMenu = (menu) => {
  // Hide current menu.
  activeMenu.classList.toggle('menu-visible');
  activeMenu.classList.toggle('menu-hidden');

  // Show the desired menu and make it the active one.
  if (menu) menu.classList.toggle('menu-visible');
  activeMenu = menu;
};

// Award the given number of points to the player and handle cases where best score was reached in this game.
const awardPoints = (n) => {
  playerScore += n;
  setHTML(playerScoreLabel, playerScore.toLocaleString());
  if (!gotBestScore) {

    if (playerScore > OPTIONS.best) {

      gotBestScore = 1;
      spawningBestScoreEffects = 1;
      playSound(FX_BESTSCORE);
    }
  }
};

// const randomX = e => randomInt(64, WIDTH - 64);
// const randomY = e => (-randomInt(144, HEIGHT));
const randomSpeed = e => (randomInt(70, 180));
const randomAngle = e => (random() * PI2);
const randomRotationDirection = e => ((random() < .5) ? -PI2 * .005 : PI2 * .005);
const angleToCenter = (x, y, cx, cy) => (Math.atan2(cy - y, cx - x));
const randomHeading = (x, y, padding = 128) => (angleToCenter(x, y, randomInt(CENTERX - padding, CENTERX + padding) , randomInt(CENTERY - padding, CENTERY + padding)));

// Create a new actor object with the given attributes.
const newActor = (type, x, y, vx, vy, texture, radius, alpha, scale, angle, rotationRate, ttl, gx, gy, fades, shrinks) => ({
  // Player, Mongol, Projectile, Particle.
  type,

  x,
  y,
  vx,
  vy,

  texture,

  radius,

  alpha,
  scale,

  angle,
  rotationRate,

  ttl,

  gx,
  gy,

  fades,
  shrinks,

  counter: ttl,
  originalScale: scale,

  originalAlpha: alpha,

  collides: 1,
});

// Spawn a particle using the given parameters.
const newParticle = (ttl, x, y, angle, texture, speed, fades, alpha, shrinks, scale, rotationRate, gx = 0, gy = 0) => {

  const particle = newActor(
    ACTOR_TYPE_PARTICLE, // type
    x, // x
    y, // y
    cos(angle) * speed, // vx
    sin(angle) * speed, // vy
    getTextureRegion(texture), // texture
    1, // radius
    alpha, // alpha
    scale, // scale
    angle, // rotation
    rotationRate, // rotationRate
    ttl, // ttl
    gx, // gx
    gy, // gy
    fades,  // fades
    shrinks, // shrinks
  );

  particle.originalAlpha = alpha;
  particle.originalScale = scale;
  particles.push(particle);
};

// Spawn a shower of star particle effect at the given actors position, with the given number of stars.
const spawnStarShower = (actor, n, texture) => {
  for (let k = n; k--;) {
    newParticle(
      1, // ttl
      actor.x, // x
      actor.y, // y
      randomAngle(), // angle
      texture, // texture
      500 + randomInt(50, 250), // speed
      1, // fades
      1, // alpha
      1, // shrinks
      .5 + random() * .5, // scale
      0, // rotationRate
      0, // gx
      15 + randomInt(10, 20) // gy
    );
  }
};

// Spawn a shower of coin particles at the given actors position.
const spawnCoinShower = (actor, n) => {
  for (let k = 0; k < n; k++) {
    newParticle(
      3, // ttl
      actor.x, // x
      actor.y, // y
      PI2 * .3 - (randomAngle() * .15), // angle
      'coin0', // texture
      900 + randomInt(50, 250), // speed
      1, // fades
      1, // alpha
      1, // shrinks
      .35 + random() * .5, // scale
      0, // rotationRate
      0, // gx
      -(70 + randomInt(10, 20)) // gy
    );
  }
};

// The player clicked the button so we can now create an `AudioContext`, start the menu music, and open the main menu.
const pregameButtonClicked = e => {
  createAudioContext(); // Create the `AudioContext` required to play sound.
  playMusic(menuMusicObject);
  openMenu(m);
};

// Reset game state and begin game.
const playButtonClicked = e => {

  stopMusic(menuMusicObject);
  playMusic(gameMusicObject);

  // Reset umbilical cord.
  points = Rope.generate();
  rope = new Rope(points);

  // Reset magnet pickup.
  magnetized = 0;
  magnetCounter = 0;
  setHTML(magnetCounterLabel, magnetCounter);
  magnetPickupSpawnTimer = 3 + random(); // Time till first ingame spawn.

  // Reset shield pickup.
  shieldCounter = 0;
  setHTML(shieldCounterLabel, shieldCounter);
  shieldPickupSpawnTimer = 6 + random();  // Time till first ingame spawn.

  // Reset clock pickup.
  clockCounter = 0;
  setHTML(clockCounterLabel, clockCounter);
  clockPickupSpawnTimer = 6 + random();  // Time till first ingame spawn.

  // Reset "achieved best score" variables.
  gotBestScore = 0;
  spawningBestScoreEffects = 0;
  bestScoreEffectsSpawnTimer = 0;
  bestScoreEffectsSpawnCounter = 10;

  // Reset coins.
  coinPool = Array.from({ length: 256 }, () => newActor(
    ACTOR_TYPE_COIN_PICKUP,
    0,
    0,
    0,
    450,
    null,
    48,
    1,
    1,
    0,
  ));
  activeCoins = new Set();
  coinSpawnTimer = .5;

  // 
  // Create enemies
  // 

  enemies = [];

  for (let i = 9; i--;) {

    let angle = randomAngle();

    const x = cos(angle) * ENEMY_SPAWN_RADIUS + CENTERX;
    const y = sin(angle) * ENEMY_SPAWN_RADIUS + CENTERY;

    angle = angleToCenter(x, y, CENTERX, CENTERY);

    const speed = randomSpeed();


    const enemy = newActor(ACTOR_TYPE_ENEMY, x, y, speed * Math.cos(angle), speed * Math.sin(angle), getTextureRegion('enemy'), 48, 1, 1, angle, randomRotationDirection());

    enemies.push(enemy);
  }

  elapsedTime = 0;
  playerScore = 0;
  gotBestScore = 0;

  MULTIPLIER = 1;


  setHTML(playerScoreLabel, playerScore.toLocaleString());

  // Create the player.
  player = newActor(
    ACTOR_TYPE_PLAYER, // type
    CENTERX,
    CENTERY,
    0, // vx
    0,
    getTextureRegion('chicky'),
    48,
    1,
    1,
    0,
    0
  );

  player.speed = 0;
  player.gy = 0;

  gameMode = GAME_MODE_PLAYING;

  keysEnabled = 1;

  collisionsEnabled = 1;

  openMenu(g);
  showCursor(0);
};

// Open the options menu.
const optionsButtonClicked = e => {
  openMenu(o);
};

// Toggle audio output.
const audioButtonClicked = e => {
  if (!paused) {
    setElementBackgroundColor(audioButton, ((OPTIONS.audio = !OPTIONS.audio)) ? '8c2' : '888');
    enableAudio(OPTIONS.audio);
    showCursor(0);
  }
};

// Toggle game paused state.
const pauseButtonClicked = e => {
  setElementBackgroundColor(pauseButton, ((paused = !paused)) ? '888' : '8c2');
  enableAudio(!paused);
  lastFrame = Date.now();
  showCursor(0);
};

const toggleAudioButtonClicked = e => {
  resetKeyButtons();
  mutateAudioButton((OPTIONS.audio = !OPTIONS.audio));
};

const resetKeyButtons = e => {
  setButtonLabel(setKeyLeftButton, OPTIONS.controls[CONTROL_LEFT].code);
  setButtonLabel(setKeyRightButton, OPTIONS.controls[CONTROL_RIGHT].code);
  waitingForKey = 0;
  controlLabel = null;
}

const setKeyForLeft = e => {
  resetKeyButtons();
  controlLabel = setKeyLeftButton;
  controlIndex = CONTROL_LEFT;
  setButtonLabel(setKeyLeftButton, 'Press Key');
  waitingForKey = 1;
};

const setKeyForRight = e => {
  resetKeyButtons();
  controlLabel = setKeyRightButton;
  controlIndex = CONTROL_RIGHT;
  setButtonLabel(setKeyRightButton, 'Press Key');
  waitingForKey = 1;
};

// Close the options menu, save the options, then open the main menu.
const optionsOkayButtonClicked = e => {
  resetKeyButtons();
  saveOptions();
  openMenu(m);
};

// Change the color and text of the audio toggle button and enable audio playback, according to the given state.
const mutateAudioButton = state => {
  setElementBackgroundColor(toggleAudioButton, (state) ? '8c2' : '888');
  setButtonLabel(toggleAudioButton, (state) ? 'ON' : 'OFF');
  
  enableAudio(state);
};
   
// Create a new texture region with the given attributes and draw the SVG image to the texture atlas canvas at the given coordinates and scaled to the given scale.
const newTextureRegion = (name, x, y, scale = 1) => {
  let image = new Image();
  image.onload = () => { // When the image has loaded...

    if (name) { // Name was passed, create a new `TextureRegion`.

      let 
      w = image.width * scale,
      h = image.height * scale;

      a.getContext('2d').drawImage(image, x, y, w, h); // draw image to the textureAtlas.
      textureRegions[name] = { x, y, w, h }; // Create new texture region.

      image.id = name;
      appendElementTo(image, u);
      setElementPosition(image, x, y);

      // log(`newTextureRegion() ${name} ${x},${y},${w},${h}`);

    } else { // No name passed, all assets have been generated.

      gl2_loadTexture(a); // Initialize webGL texture.

      allAssetsLoaded(); // Initialize other game vars and start menus.

    }
  }
  image.src = `data:image/svg+xml;base64,${btoa(svgString + '</svg>')}`; // Encode the SVG and set it to the images source (start it loading) .
},

// Get the texture region with the given name.
getTextureRegion = (name) => (textureRegions[name]);

// Initialize menus and other stuff, open the pre game menu, and start main game loop.
const allAssetsLoaded = e => {

  // 
  // Create extra actors.
  // 

  sun = newActor(ACTOR_TYPE_SUN, 1620, 290, 0, 0, getTextureRegion('sun'), 0, 1, 1, 0, 0);

  egg = newActor(ACTOR_TYPE_EGG, CENTERX, CENTERY, 0, 0, getTextureRegion('home'), 123, 1, 1, 0, 0);

  shieldOverlay = newActor(ACTOR_TYPE_SHIELD, 0, HEIGHT - 100, 0, 0, getTextureRegion('shield'), 0, 1, 1, 0, );

  // 
  // Create parallax stars.
  // 

  const newStar = layer => stars.push(newActor(ACTOR_TYPE_STAR, randomInt(0, WIDTH), randomInt(0, HEIGHT), 0, 0, getTextureRegion(`star${layer}`), 0, 1, 1, 0, 0));
  for (let i = 100; i--;) newStar(1);
  for (let i = 75; i--;) newStar(2);
  for (let i = 50; i--;) newStar(3);

  // 
  // Create the pre game menu.
  // 

  appendElementTo(newTextButton(560, 430, 800, 220, 'Click Me', '99b', pregameButtonClicked), v);
  
  // 
  // 
  // Create the main menu.
  // 

  appendElementTo(newTextLabel(TYPE_H2, 'BadLuck', 60, 60), m);
  appendElementTo(newTextLabel(TYPE_H3, 'Butter', 182, 232), m);
  appendElementTo(newTextLabel(TYPE_H2, 'Chicken', 460, 220), m);
  appendElementTo(newTextLabel(TYPE_H6, 'Goes To Outer Space', 640, 400), m);
  appendElementTo(chicky, m); // Move from assets container to main menu.
  setElementPosition(chicky, 990, 60);
  chicky.style.transform = 'rotate(-45deg)';
  appendElementTo(newTextLabel(TYPE_H5, 'TOP SCORE', 765, 530), m);
  appendElementTo(newTextLabel(TYPE_H5, '1,000', 0, 610, 'topScoreLabel'), m);
  updateBestScoreLabel();
  centerElement(topScoreLabel);
  appendElementTo(newTextButton(64, 525, 500, 450, 'PLAY', '8c2', playButtonClicked), m);
  appendElementTo(newTextButton(970, 764, 760, 210, 'OPTIONS', '3bd', optionsButtonClicked), m);

  // 
  // Create options menu.
  // 

  appendElementTo(newTextLabel(TYPE_H3, 'OPTIONS', 0, 40, 'optionsTitle'), o);
  centerElement(optionsTitle);
  appendElementTo(newTextLabel(TYPE_H3, "PLAY SOUND", 250, 230), o);
  appendElementTo(newTextLabel(TYPE_H3, "STEER LEFT", 250, 450), o);
  appendElementTo(newTextLabel(TYPE_H3, "STEER RIGHT", 250, 670), o);
  appendElementTo(newTextButton(1080, 200, 550, 140, '', '8c2', toggleAudioButtonClicked, 'toggleAudioButton'), o);
  mutateAudioButton(OPTIONS.audio);
  appendElementTo(newTextButton(980, 420, 740, 140, '', 'db3', setKeyForLeft, 'setKeyLeftButton'), o);
  appendElementTo(newTextButton(980, 640, 740, 140, '', 'db3', setKeyForRight, 'setKeyRightButton'), o);
  appendElementTo(newTextButton(64, 820, 400, 160, 'OKAY', '8c2', optionsOkayButtonClicked), o);
  resetKeyButtons();

  // 
  // Create ingame menu.
  // 

  appendElementTo(newTextLabel(TYPE_H3, '', 1000, 32, 'playerScoreLabel'), g);
  // centerElement(playerScoreLabel);
  appendElementTo(newTextButton(32, 24, 110, 160, '\u2016', '8c2', pauseButtonClicked, 'pauseButton'), g);
  appendElementTo(newTextButton(1744, 24, 120, 160, '\u266b', '8c2', audioButtonClicked, 'audioButton'), g);
  setElementBackgroundColor(audioButton, (OPTIONS.audio) ? '8c2' : '888');
  appendElementTo(magnetPickup, g);
  setElementPosition(magnetPickup, 250, 32);
  appendElementTo(newTextLabel(TYPE_H3, '0', 350, 24, 'magnetCounterLabel'), g);
  appendElementTo(clockPickup, g);
  setElementPosition(clockPickup, 500, 32);
  appendElementTo(newTextLabel(TYPE_H3, '0', 600, 24, 'clockCounterLabel'), g);
  appendElementTo(shieldPickup, g);
  setElementPosition(shieldPickup, 750, 32);
  appendElementTo(newTextLabel(TYPE_H3, '0', 850, 24, 'shieldCounterLabel'), g);
  
  // 
  // Create game over menu.
  // 

  appendElementTo(newTextLabel(TYPE_H2, 'GAME OVER', 0, 220, 'gameOverTitle'), j);
  centerElement(gameOverTitle);
  appendElementTo(newTextLabel(TYPE_H3, '', 0, 470, 'gameTimeLabel'), j);
  centerElement(gameTimeLabel);
  appendElementTo(newTextLabel(TYPE_H3, '', 0, 620, 'finalScoreLabel'), j);
  centerElement(finalScoreLabel);
  appendElementTo(newTextButton(610, 810, 700, 160, 'Continue', '8c2', gameOverButtonClicked), j);


  // 
  // All menus have now been created.
  // 

  b.style.display = 'block';

  onresize(); // Perform initial resize.

  // Open the main menu.
  activeMenu = v;
  v.classList.toggle('menu-visible');

  gameMode = GAME_MODE_MENUS;

  // Start the main game loop.
  lastFrame = Date.now();
  onEnterFrame();
};

const updateBestScoreLabel = e => setHTML(topScoreLabel, OPTIONS.best.toLocaleString());

// Window onload event handler (fired when page fully loaded). Initialize everything and start gameloop.
onload = e => {

  (!(OPTIONS = localStorage.getItem(NAMESPACE))) ? resetOptions() : OPTIONS = JSON.parse(OPTIONS); // Load options , creating new options if not found.
    
  //Reposition and resize the radial gradient that appears behind the sun.
  setElementPosition(s, 640, -824);
  setElementSize(s, 2048, 2048);

  gl2_setup(c); // Initialize webGL renderer.

  // #region - generate assets.

  // 
  // Generate sounds.
  // 

  newSound(...[.5,0,370,.01,.01,.04,2,.6,,,-116,.13,,.2,6,,,.56,.03,.04,801]); // FX_CLICK
  newSound(...[,0,459,.02,.03,.15,1,1.9,,,113,.07,,,,,,.88,.05]); // FX_COIN
  newSound(...[1.2,0,485,,.07,.37,3,4.9,,-59,,,.03,,29,,.01,.81,.06]); // FX_DEFLECT
  newSound(...[1.4,0,669,.04,.27,.15,1,3,,137,,,.06,.1,,,.05,.8,.26]); // FX_SHIELD
  newSound(...[,0,192,.08,.23,.29,1,.2,6,,,,.08,,15,,,.55,.15]); // FX_MAGNET
  newSound(...[1.7,0,263,.01,.14,.19,3,3,13,-1,,,,,,,.28,.71,.14]); // FX_BESTSCORE
  newSound(...[1.5,0,834,.01,.1,,,3.4,6,,,,.14,,215,,.13,.55,.38,.03]); // FX_CLOCK

  // 
  // Generate the imagery.
  // 

  // Sun.
  svgString = SVG_HEAD(600, 580) +
  SVG_RECT(1, -234, 798, 814, 'cef', 407) +
  SVG_RECT(71, -103, 678, 638, 'bde', 318);
  newTextureRegion('sun', 0, 0);

  // Star1.
  svgString = SVG_HEAD(8, 8) +
  SVG_RECT(0, 0, 8, 8, '368', 4) +
  SVG_RECT(.5, .5, 6.5, 6.5, '479', 4) + 
  SVG_RECT(1.5, 1.5, 2.5, 2.5, '58a', 3);
  newTextureRegion('star1', 144, 640);

  // Star2.
  svgString = SVG_HEAD(16, 16) +
  SVG_RECT(0, 0, 16, 16, '368', 8) +
  SVG_RECT(1, .5, 13, 13, '479', 7) + 
  SVG_RECT(2.5, 3, 5, 5, '58a', 3);
  newTextureRegion('star2', 152, 640);
  
  // Star3.
  svgString = SVG_HEAD(32, 32) +
  SVG_RECT(0, 0, 32, 32, '368', 16) +
  SVG_RECT(2, 1, 26, 26, '479', 13) + 
  SVG_RECT(5, 6, 10, 10, '58a', 5);
  newTextureRegion('star3', 168, 640);

  // Rope.
  svgString = SVG_HEAD(48, 48) + 
  SVG_RECT(0, 0, 48, 48, 'cb9', 20) + 
  SVG_RECT(2, 2, 44, 39, 'edb', 22) + 
  SVG_RECT(4, 4.5, 40, 30, 'ffe', 18);
  newTextureRegion('rope', 200, 640);

  // Enemy.
  svgString = SVG_HEAD(144, 144) +
  SVG_PATH('m30 62c.3 7 7 9 12 12 6 8 18-3 15-16-2-6-13-6-11-14 .3-6 11-8 9-.3-2 16 29 19 23-6 3-4 11-7 13-.5 8 9-14 21-7 31 7 9 25-6 27-9 7-4 8-11 6-18 2-8-7-11-9-17 2-8-6-14-13-14-7 2-14-6-20 1-6 2-11 6-17 6-6-1-13 2-18-4-9-4-10 7-14 12-5 5-6 12-1 17-4 5-5 15 3 19zm-6 31c1 5 7 9 5 15 2 4 13 2 9 9-.3 6 9 7 7 14 3 9 13 5 19 3 6-2 6-9 .8-12-3-4-.5-8 4-7 6-2 14-5 18 1 3 2 8 .9 6 6 .6 6 8 11 14 9 7-.9 11-10 6-15 5-3 3-10 1-14-4-6 5-12 1-19-5-3-10-9-17-8-9 1-3 11-5 15-7 4-12-6-19-5-6 3-12-2-17 1-6 4-10-2-16-.8-5-.1-18 .5-18 8z', 'fff', 8, '0006');
  newTextureRegion('enemy', 0, 582);
 
  // Magnetic wave.
  svgString = SVG_HEAD(160, 48) +
  SVG_PATH('m0 0h120l-35 30 75 18h-130c-3 0 45-30 45-30z', '8f8', 8, '0f0c');
  newTextureRegion('wave', 144, 582);

  // Shield.
  svgString = SVG_HEAD(168, 168) +
  `<defs>` + 
  SVG_RADIALGRADIENT(84, 84, 84, '8df', 0, .9, '8df', 1, 1) + 
  SVG_RADIALGRADIENT(112, 54, 24, 'eff', 1, 0, 'eff', 0, 1) + 
  `</defs>` + 
  SVG_RECT(0, 0, 168, 168, `Z${SVG_ID - 1}`, 84) + 
  SVG_RECT(88, 30, 48, 48, `Z${SVG_ID}`, 24);
  newTextureRegion('shield', 304, 582);

  // Home (big egg).
  svgString = SVG_HEAD(186, 256) + 
  SVG_RECT(1.5, 1.5, 183, 253, 'db7', 183, 128, 3, '222') + 
  SVG_RECT(11, 5, 144, 218, 'fc9', 144) + 
  SVG_RECT(22, 83, 22, 58, 'fed', 58) + 
  SVG_RECT(31, 52, 16, 24, 'fed', 24) + 
  SVG_RECT(63, 98, 60, 60, 'db7', 34);
  newTextureRegion('home', 490, 582);

  // Coin0.
  svgString = SVG_HEAD(113, 96) +
  SVG_RECT(8, 0, 96, 96, 'ff2', 48) + 
  SVG_RECT(24, 16, 64, 64, 'fd0', 32);
  newTextureRegion('coin0', 911, 0);
  
  // Coin1.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m56 0h-22s-34 8-34 48c.0103 40 33.9 48 33.9 48h22.1', 'ff7') + 
  SVG_RECT(15, 0, 81, 96, 'ff2', 41, 48) + 
  SVG_RECT(29, 16, 54, 64, 'fd0', 27, 32);
  newTextureRegion('coin1', 911, 100);
  
  // Coin2.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m56 0h-22s-30 8-30 48c.0103 40 29.9 48 29.9 48h22.1', 'ff7') + 
  SVG_RECT(23, 0, 66, 96, 'ff2', 33, 48) + 
  SVG_RECT(34, 16, 44, 64, 'fd0', 22, 32);
  newTextureRegion('coin2', 911, 200);
  
  // Coin3.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m57 0h-25s-22 8-22 48c.0103 40 21.9 48 21.9 48h25.1', 'ff7') + 
  SVG_RECT(32, 0, 50, 96, 'ff2', 25, 48) + 
  SVG_RECT(41, 16, 32, 64, 'fd0', 16, 32);
  newTextureRegion('coin3', 911, 300);
  
  // Coin4.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m55.5 0h-27.5s-10 8-10 48c.0103 40 9.89 48 9.89 48h27.6', 'ff7') + 
  SVG_RECT(42, 0, 27, 96, 'ff2', 14, 48) + 
  SVG_RECT(47, 16, 18, 64, 'fd0', 9, 32);
  newTextureRegion('coin4', 911, 400);
  
  // Coin5.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m41 0s-4.01 8-4 48c.0103 40 4 48 4 48h28s3.99-8 4-48-4-48-4-48z', 'ff7');
  newTextureRegion('coin5', 911, 500);
  
  // Coin6.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m54.2 96h27.5s10-8 10-48c-.0103-40-9.89-48-9.89-48h-27.6', 'ff7') + 
  SVG_RECT(41, 0, 27, 96, 'ff2', 13.5, 48) + 
  SVG_RECT(46, 16, 18, 64, 'fd0', 9, 32);
  newTextureRegion('coin6', 911, 600);
  
  // Coin7.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m55.5 96h25s22-8 22-48c-.0103-40-21.9-48-21.9-48h-25.1', 'ff7') + 
  SVG_RECT(31, 0, 49.4, 96, 'ff2', 24.7, 48) + 
  SVG_RECT(40, 16, 32, 64, 'fd0', 16, 32);
  newTextureRegion('coin7', 911, 700);
  
  // Coin8.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m57 96h22s30-8 30-48c-.0103-40-29.9-48-29.9-48h-22.1', 'ff7') + 
  SVG_RECT(24, 0, 66, 96, 'ff2', 33, 48) + 
  SVG_RECT(35, 16, 44, 64, 'fd0', 22, 32);
  newTextureRegion('coin8', 911, 800);
  
  // Coin9.
  svgString = SVG_HEAD(113, 96) +
  SVG_PATH('m57 96h22s34-8 34-48c-.0103-40-33.9-48-33.9-48h-22.1', 'ff7') + 
  SVG_RECT(16, 0, 81, 96, 'ff2', 41, 48) + 
  SVG_RECT(30, 16, 54, 64, 'fd0', 27, 32);
  newTextureRegion('coin9', 911, 900);

  // Star.
  svgString = SVG_HEAD(96, 96) +
  SVG_PATH('m76 96-28-16-31 14 6-33-22-27 32-4 17-31 14 30 33 8-23 23z', 'ff2');
  newTextureRegion('star', 814, 0);
    
  // Partice stars (stah).
  for (let i = 0; i < 10; i++) {
    svgString = SVG_HEAD(96, 96) + SVG_PATH('m76 96-28-16-31 14 6-33-22-27 32-4 17-31 14 30 33 8-23 23z', ['f22', 'fa2', 'df2', '5f2', '2f8', '2ff', '28f', '52f', 'd2f', 'f2a',][i]);
    newTextureRegion('stah' + i, 718, (i * 96));
  }

  // Magnet pickup.
  svgString = SVG_HEAD(96, 96) +
  SVG_PATH('m48 0c-27-5e-15-48 21-48 48v48h32v-48c0-9 7-16 16-16s16 7 16 16v48h32v-48c0-27-21-48-48-48z', 'f34') + 
  SVG_RECT(0, 68, 32, 38, 'eee') + 
  SVG_RECT(64, 68, 32, 28, 'eee');
  newTextureRegion('magnetPickup', 814, 100);

  // Shield pickup.
  svgString = SVG_HEAD(96, 96) +
  SVG_PATH('m96 48-12-48-58 8-26 40 26 40 58 8z', 'f8f') + 
  SVG_PATH('m88 48-10-40-48 6-22 34 22 34 48 6z', 'f1f');
  newTextureRegion('shieldPickup', 814, 200);

  // Clock.
  svgString = SVG_HEAD(96, 96) +
  SVG_RECT(3, 3, 90, 90, `dee`, 45, 45, 6, 'f34') + 
  SVG_RECT(12, 12, 72, 72, `eff`, 36) + 
  SVG_RECT(45, 16, 6, 36, `bbc`, 3) + 
  SVG_RECT(45, 47, 30, 6, `bbc`, 3); 
  newTextureRegion('clockPickup', 814, 300);

  // Badluck butter chicken.
  svgString = SVG_HEAD(192, 192) +
  SVG_RECT(2, 2, 188, 188, 'fff', 24, 24, 4, '000') +
  SVG_PATH('m66 96c-.0295-25.4-7.22-47.2-19.7-66-7.36 13.8-12.2 38.1-12.2 66 .0325 27.9 4.96 52.2 12.3 66 12.5-18.8 19.6-40.6 19.6-66z', 'f92') +
  SVG_PATH('m176 97.3c-.06-10.9-.97-22.2-2.97-33.3-21.6 16.3-24.1 45.4.832 64 1.41-9.34 2.2-19.8 2.14-30.7z', 'b22') +
  SVG_RECT(100, 52, 16, 16, '000', 8) +
  SVG_RECT(100, 124, 16, 16, '000', 8) + 
  SVG_RECT(36, 18, 140, 156, '0003', 26, 78, 4, '000');
  newTextureRegion('chicky', 814, 505, .5);

  // Call with no arguments means that all assets have been generated.
  svgString = SVG_HEAD(0, 0);
  newTextureRegion();

  // #endregion

  // #region - Install other DOM event handlers

  // Spawn some random star particles when the pointer is clicked.
  onpointerup = e => spawnStarShower({x: e.clientX, y: e.clientY}, 20, 'star');

  // Show the mouse cursor when the mouse is moved.
  onpointermove = e => showCursor(1);

  // Pause when page loses focus.
  onblur = e =>{
    pauseState = paused;
    paused = 1;
    if (OPTIONS.audio) enableAudio(0);
  }

  // Unpause when page gains focus.
  onfocus = e => {
    paused = pauseState;
    enableAudio(OPTIONS.audio);
    lastFrame = Date.now();
  };
  
  // Key down event handler.
  onkeydown = e => {
    if (keysEnabled && !waitingForKey) {
      const keyCode = e.code;
      if (!leftHeld && keyCode === OPTIONS.controls[CONTROL_LEFT].code) {
        leftHeld = 1;
        rightHeld = 0;
      };
      if (!rightHeld && keyCode === OPTIONS.controls[CONTROL_RIGHT].code) {
        rightHeld = 1;
        leftHeld = 0;
      };
    }
  };

  // Key up event handler
  onkeyup = e => {
    let keyCode = e.code;

    if (waitingForKey) {
      // Process keyup events when the game is waiting for a new controll key to be pressed
      setButtonLabel(controlLabel, e.code);
      OPTIONS.controls[controlIndex].code = e.code;
      waitingForKey = 0; // No longer waiting for this event.
      saveOptions();

    } else if (keysEnabled) {
      // Process keyup events when the game is running.
      if (leftHeld && keyCode === OPTIONS.controls[CONTROL_LEFT].code) leftHeld = 0;
      if (rightHeld && keyCode === OPTIONS.controls[CONTROL_RIGHT].code) rightHeld = 0;
    }

    if (keyCode === 'Enter' || keyCode === 'Space') {
      switch (gameMode) {
        case GAME_MODE_MENUS:
          if (activeMenu === m) playButtonClicked();
          else if (activeMenu === v) pregameButtonClicked();
          break;

        case GAME_MODE_GAMEOVER:
          gameOverButtonClicked();
          break;
      
        default:
          break;
      }
    }
  };

  // Window resize event handler. Scale and center game scene container.
  onresize = e => {
    b.style.transform = `scale(${min(innerWidth / WIDTH, innerHeight / HEIGHT)})`; // Scale container.
    b.style.left = (~~(innerWidth - b.getBoundingClientRect().width) / 2) + px; // Center on x-axis.
  }
  // onresize(); // Perform initial resize.

  // #endregion

};

// // Update particles.
const updateParticles = () => {
 
  if (particles.length) { // Check to be sure there is at least one partlcle

    for (let i = particles.length; i--;) {
    // for (let i = particles.length - 1; i >= 0; i--) {
      const actor = particles[i];

      if ((actor.counter -= DT) <= 0) { // Particle has expired.

        particles.splice(i, 1); // If the ttl reaches 0 or below, remove the particle from the list

      } else {

        actor.vx += actor.gx; // Apply gravity.
        actor.vy += actor.gy;

        actor.x += actor.vx * DT; // Update position.
        actor.y += actor.vy * DT;

        actor.angle += actor.rotationRate;
        let ratio = 1 / actor.ttl * actor.counter; // Scaling ratio.
        if (actor.fades) actor.alpha = actor.originalAlpha * ratio; // Scale alpha.
        if (actor.shrinks) {
          actor.scale = actor.originalScale * ratio; // Scale size.
          actor.iX = ((actor.texture.w * actor.originalScale) * (1 - ratio)) / 2;
          actor.iY = ((actor.texture.h * actor.originalScale) * (1 - ratio)) / 2;
        }
        // if (actor.frames > 0) setTextureRegion(actor, [actor.iX + (actor.tR[2] * clamp(actor.frames - floor(actor.frames * ratio) - 1, 0, actor.frames - 1)), actor.tR[1], actor.tR[2], actor.tR[3]]); // Animate a frame based particle over time.

        renderList.push(actor);
      }
    }
  }
};

// Spawn a new coin.
const spawnCoinX = (type, speed, texture, frame) => {
  const coin = coinPool.pop();

  activeCoins.add(coin);

  coin.type = type;
  coin.texture = getTextureRegion(texture);
  coin.frame = frame;

  let angle = randomAngle();

  x = cos(angle) * ENEMY_SPAWN_RADIUS + CENTERX;
  y = sin(angle) * ENEMY_SPAWN_RADIUS + CENTERY;

  coin.x = x;
  coin.y = y;

  let heading;

  if (type < ACTOR_TYPE_COIN_PICKUP) {
    coin.rotationRate =  randomRotationDirection();
    heading = randomHeading(x, y, 16);

  } else {
    coin.rotationRate = 0;
    heading = randomHeading(x, y);
    coin.angle = 0;
  }

    coin.vx = speed * Math.cos(heading);
    coin.vy = speed * Math.sin(heading);
  };

// Spawn the given number of particles with the given image at the given actors position.
const spawnRadialShower = (x, y, image) => {
  for (let k = 4; k--;) {
    newParticle(
      1, // ttl
      x, // x
      y, // y
      randomAngle(), // angle
      image, // texture
      600 + randomInt(50, 250), // speed
      1, // fades
      1, // alpha
      1, // shrinks
      1 + random() * .25, // scale
      0, // rotationRate
      0, // gx
      0 // gy
    );
  }
};

// Initialize the game over game state.
const gameOver = e => {
  gameMode = GAME_MODE_GAMEOVER;

  stopMusic(gameMusicObject);
  playMusic(gameOverMusicObject);

  magnetized = shielded = collisionsEnabled = 0;

  activeCoins.forEach((coin) => {
    let image;
    coin.vx = coin.vy = 0;
    switch (coin.type) {
      case ACTOR_TYPE_SHIELD_PICKUP:
        image = 'shieldPickup';
        break;
    
      case ACTOR_TYPE_MAGNET_PICKUP:
        image = 'magnetPickup';
        break;
    
      default:
        image = 'coin0';
        break;
    }
    spawnRadialShower(coin.x, coin.y, image);
  });

  enemies.forEach((enemy) => {
    enemy.vx = enemy.vy = enemy.rotationRate = 0;
    spawnRadialShower(enemy.x, enemy.y, 'enemy');
  });

  enemies = [];
  activeCoins = new Set();

  leftHeld = rightHeld = keysEnabled = 0;

  player.vy = -3000;
  player.gy = 123;

  setHTML(gameTimeLabel, `Your luck ran out after ${elapsedTime | 0} seconds`);
  setHTML(finalScoreLabel, `You scored ${playerScore.toLocaleString()} points (${['Abysmal', 'Dismal', 'Pathetic', 'Terrible', 'Poor', 'Mediocre', 'Fair', 'Modest', 'Adequate', 'Good', 'Solid', 'Excellent', 'Superb', 'Fantastic', 'Stupendous'][min((playerScore / 1e4) | 0, 14)]})`);

  j.classList.toggle('menu-visible');
  showCursor(1);
};

// Close the game over menu, open the main menu, and play the menu music.
const gameOverButtonClicked = e => {
  stopMusic(gameOverMusicObject);
  playMusic(menuMusicObject);

  if (gotBestScore) {
    OPTIONS.best = playerScore;
    updateBestScoreLabel();
    saveOptions();
  }

  j.classList.toggle('menu-visible');
  
  openMenu(m);
  gameMode = GAME_MODE_MENUS;
};

// #region Umbilical Cord.

// Modified code from https://codepen.io/guerrillacontra/pen/XPZeww

let points; 
let rope;

let ropeDamping = .95;
let ropeMass = .88;
let ropeResolution = 40;

const lerp = (a, b, t) => (a + (b - a) * t);

// Minimal class to manage vector operations.
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  static add(a, b) {
    return new Vector2(a.x + b.x, a.y + b.y);
  }
  static sub(a, b) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }
  static mag(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  }
    static zero(a) {
    return new Vector2();
  }
  
  static normalized(a) {
    const magnitude = Vector2.mag(a);
    if (magnitude === 0) {
      return Vector2.zero();
    }
    return new Vector2(a.x / magnitude, a.y / magnitude);
  }
}

// Each rope part is one of these, and uses a high precison varient of Störmer–Verlet integration to keep the simulation consistant otherwise it would "explode"!
class RopePoint {
  //integrates motion equations per node without taking into account relationship with other nodes...
  static integrate(point, dt, previousFrameDt) {
      point.velocity = Vector2.sub(point.pos, point.oldPos);
      point.oldPos = { ...point.pos };

      // Drastically improves stability.
      let timeCorrection = previousFrameDt != 0.0 ? dt / previousFrameDt : 0.0;

      let accel = { x: 0, y: ropeMass };

      const velCoef = timeCorrection * ropeDamping;//point.damping;
      const accelCoef = Math.pow(dt, 2);

      point.pos.x += point.velocity.x * velCoef + accel.x * accelCoef;
      point.pos.y += point.velocity.y * velCoef + accel.y * accelCoef;
  }

  // Apply constraints related to other nodes next to it (keeps each node within distance).
  static constrain(point) {
    if (point.next) {
      const delta = Vector2.sub(point.next.pos, point.pos);
      const len = Vector2.mag(delta);
      const diff = len - point.distanceToNextPoint;
      const normal = Vector2.normalized(delta);

      if (!point.isFixed) {
        point.pos.x += normal.x * diff * 0.25;
        point.pos.y += normal.y * diff * 0.25;
      }

      if (!point.next.isFixed) {
        point.next.pos.x -= normal.x * diff * 0.25;
        point.next.pos.y -= normal.y * diff * 0.25;
      }
    }
    if (point.prev) {
      const delta = Vector2.sub(point.prev.pos, point.pos);
      const len = Vector2.mag(delta);
      const diff = len - point.distanceToNextPoint;
      const normal = Vector2.normalized(delta);

      if (!point.isFixed) {
        point.pos.x += normal.x * diff * 0.25;
        point.pos.y += normal.y * diff * 0.25;
      }

      if (!point.prev.isFixed) {
        point.prev.pos.x -= normal.x * diff * 0.25;
        point.prev.pos.y -= normal.y * diff * 0.25;
      }
    }
  }

  constructor(initialPos, distanceToNextPoint) {
    this.pos = initialPos;
    this.distanceToNextPoint = distanceToNextPoint;
    this.isFixed = false;
    this.oldPos = { ...initialPos };
    this.velocity = Vector2.zero();
    this.prev = null;
    this.next = null;

    this.texture = getTextureRegion('rope');
    this.alpha = 1;
    this.scale = 1;
    this.rotation = 0;
    this.type = ACTOR_TYPE_ROPE;
  }
}

// Manages a collection of rope points and executes the integration.
class Rope {
  // Generate an array of points suitable for a dynamic rope contour
  static generate() {

    const start = { x: 0, y: 0 };
    const end = { x: CENTERX, y: CENTERY };

    const delta = end;//Vector2.sub(end, start);

    const len = Vector2.mag(delta);

    let points = [];
    const pointsLen = len / ropeResolution;

    for (let i = 0; i < pointsLen; i++) {
      const percentage = i / (pointsLen - 1);

      const lerpX = lerp(start.x, end.x, percentage);
      const lerpY = lerp(start.y, end.y, percentage);

      points[i] = new RopePoint({ x: lerpX, y: lerpY }, ropeResolution);
    }

    // Link nodes into a doubly linked list.
    for (let i = 0; i < pointsLen; i++) {
      const prev = i != 0 ? points[i - 1] : null;
      const curr = points[i];
      const next = i != pointsLen - 1 ? points[i + 1] : null;

      curr.prev = prev;
      curr.next = next;
    }

    points[0].isFixed = points[points.length - 1].isFixed = true;

    log(points);

    return points;
  }

  constructor(points) {
    this._points = points;
    this.update = this.update.bind(this);
    this._prevDelta = 0;

    this.getPoint = this.getPoint.bind(this);
  }

  getPoint(index) {
    return this._points[index];
  }

  update(dt) {
    for (let i = 1; i < this._points.length-1; i++) {
      let point = this._points[i];
      RopePoint.integrate(point, dt, this._prevDelta);
    }

    for (let i = 1; i < this._points.length-1; i++) {
      let point = this._points[i];
      RopePoint.constrain(point);
    }

    this._prevDelta = dt;
  }
}

// #endregion

// Respawn the given enemy.
const respawnEnemy = (enemy, speed) => {
    
  let angle = randomAngle();
  enemy.rotationRate = randomRotationDirection();

  const x = Math.cos(angle) * ENEMY_SPAWN_RADIUS + CENTERX;
  const y = Math.sin(angle) * ENEMY_SPAWN_RADIUS + CENTERY;  

  angle = randomHeading(x, y);

  enemy.x = x;
  enemy.y = y;

  enemy.vx = speed * Math.cos(angle);
  enemy.vy = speed * Math.sin(angle);

  enemy.angle = angle;

  enemy.collides = 1;
};

// Main game loop.
onEnterFrame = (t) => {

  requestAnimationFrame(onEnterFrame);

  if (paused) return

  // Update game timing.
  thisFrame = Date.now();
  DT = (thisFrame - lastFrame) / 1000;
  lastFrame = thisFrame;
  elapsedTime += DT;

  renderList = [];

  if (gameMode === GAME_MODE_PLAYING) {

    // 
    // Player is inside game
    // 
    
    let pointsToAward = 0;

    const coinsToDelete = [];

    // Spawn a magnet pickup when the countdown expires.
    if ((magnetPickupSpawnTimer -= DT) < 0) {
      magnetPickupSpawnTimer += (10 + random() * 3);
      spawnCoinX(ACTOR_TYPE_MAGNET_PICKUP, 100, 'magnetPickup');
    }

    // Spawn a shield pickup when the countdown expires.
    if ((shieldPickupSpawnTimer -= DT) < 0) {
      shieldPickupSpawnTimer += (10 + random() * 3);
      spawnCoinX(ACTOR_TYPE_SHIELD_PICKUP, 100, 'shieldPickup');
    }

    // Spawn a clock pickup when the countdown expires.
    if ((clockPickupSpawnTimer -= DT) < 0) {
      clockPickupSpawnTimer += (10 + random() * 3);
      spawnCoinX(ACTOR_TYPE_CLOCK_PICKUP, 100, 'clockPickup');
    }
    
    // magnetized = 1
    // magnetCounter = 10;

    const playerX = player.x;// - player.radius;
    const playerY = player.y;// - player.radius;

    // Remove magnetized effect when timer expires.
    if (magnetized) {

      if ((magnetEffectSpawnTimer -= DT) < 0) {
        magnetEffectSpawnTimer += .05;

        let angle = randomAngle();
        const x = cos(angle) * 90 + playerX;
        const y = sin(angle) * 90 + playerY;
        const heading = angleToCenter(x, y, playerX, playerY) + PI;

        newParticle(
          1.25, // ttl
          x + 40, // x
          y + 24, // y
          heading,//randomAngle(),
          'wave', // texture
          400 + randomInt(50, 250), // speed
          1, // fades
          1, // alpha
          1, // shrinks
          .5 + random() * .5, // scale
          0, // rotationRate
          0, // gx
          0 // gy
        );
      }  

      if ((magnetCounter -= DT) < 0) {
        magnetCounter = 0;
        magnetized = 0;
      }
      setHTML(magnetCounterLabel, magnetCounter | 0);
    }

    // shielded = 1;
    // shieldCounter = 10;

    // Remove shielded effect when timer expires.
    if (shielded) {
      if ((shieldCounter -= DT) < 0) {
        shieldCounter = 0;
        shielded = 0;
      }
      setHTML(shieldCounterLabel, shieldCounter | 0);
    }
    
    // clocked = 1;
    // clockCounter = 10;
    
    // Remove clock effect when timer expires.
    if (clocked) {

      if ((clockEffectSpawnTimer -= DT) < 0) {
        clockEffectSpawnTimer += .05;

        let angle = randomAngle();
        const x = cos(angle) * 70 + playerX;
        const y = sin(angle) * 70 + playerY;
        const heading = angleToCenter(x, y, playerX, playerY) + PI;

        newParticle(
          1, // ttl
          x + 16, // x
          y + 16, // y
          heading,
          'clockPickup', // texture
          400 + randomInt(50, 250), // speed
          1, // fades
          1, // alpha
          1, // shrinks
          .5 + random() * .25, // scale
          0, // rotationRate
          0, // gx
          0 // gy
        );
      }  

      if ((clockCounter -= DT) < 0) {
        clockCounter = 0;
        clocked = 0;
      }
      setHTML(clockCounterLabel, clockCounter | 0);
    }

    // Spawn effects if player got a new best score.
    if (spawningBestScoreEffects) {
      if ((bestScoreEffectsSpawnTimer -= DT) <= 0) {
        bestScoreEffectsSpawnTimer = .1;
        spawnStarShower({ x: randomInt(0, WIDTH), y: randomInt(0, HEIGHT) }, 30, `stah${randomInt(0, 6)}`);
        if ((bestScoreEffectsSpawnCounter -= 1) < 0) spawningBestScoreEffects = 0;
      }
    }

    if ((coinSpawnTimer -= DT) <= 0) {
      coinSpawnTimer = random();
      spawnCoinX(ACTOR_TYPE_COIN_PICKUP, 250, 'coin0', randomInt(0, 9));
    }

    MULTIPLIER = clamp(MULTIPLIER + 0.003, 0, 2.5); // Scale base speed of mongols and their projectiles.

// #region Process player.

    const atan2 = M.atan2;

    const playerRotationRate = PI2 * .015;
    const playerMaxSpeed = 448;
    const playerAcceleration = 1.617;

    player.speed = clamp(player.speed + playerAcceleration, 0, playerMaxSpeed);
    
    if (leftHeld) {
      player.angle -= playerRotationRate;

    } else if (rightHeld) {
      player.angle += playerRotationRate;
    }
    
    player.vx = cos(player.angle) * player.speed;
    player.vy = sin(player.angle) * player.speed;
    
    // Update position
    player.x += player.vx * DT;
    player.y += player.vy * DT;
    
    // Handle collisions with screen edges.
    if (player.x > WIDTH || player.x < 0) {
      player.vx *= -1; // Reverse x velocity.
      player.angle = atan2(player.vy, player.vx); // Adjust angle based on new velocity.
      player.x = clamp(player.x, 0, WIDTH); // Clamp position to screen bounds.
    }
    
    if (player.y > HEIGHT || player.y < 0) {
      player.vy *= -1;
      player.angle = atan2(player.vy, player.vx);
      player.y = clamp(player.y, 0, HEIGHT);
    }
    
    player.speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy); // Recalculate speed after potential collisions.


    egg.x = (CENTERX + 120) - (player.x / 8 );
    egg.y = (CENTERY + 67.5) - (player.y / 8 );

    sun.x = (1620 + 120) - (player.x / 16 );
    sun.y = (290) - (player.y / 16);
// #endregion

// #region Process coins.
    activeCoins.forEach((coin) => {

      let currentFrame = ((elapsedTime % duration / duration) * frames) | 0;

      coin.x += coin.vx * DT * MULTIPLIER;
      coin.y += coin.vy * DT * MULTIPLIER;

      renderList.push(coin);

      coin.angle += coin.rotationRate;

      // if (coin.y > HEIGHT + 100) coinsToDelete.push(coin);

      let dx = coin.x - CENTERX;
      let dy = coin.y - CENTERY;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > ENEMY_SPAWN_RADIUS + 64) coinsToDelete.push(coin);

      dx = coin.x - player.x;
      dy = coin.y - player.y;
      distance = M.sqrt(dx * dx + dy * dy);

      if (coin.type === ACTOR_TYPE_COIN_PICKUP) {
        
        coin.texture = getTextureRegion(`coin${(currentFrame + coin.frame) % frames}`);
      }

      if (magnetized && coin.type === ACTOR_TYPE_COIN_PICKUP) {

        const attractionRadius = 550;
        const attractionForce = 200;
        if (distance < attractionRadius) {
          const force = attractionForce * (1 - distance / attractionRadius);
          const directionX = dx / distance;
          const directionY = dy / distance;

          coin.vx += force * -directionX;
          coin.vy += force * -directionY;
        }
      }

      if ((distance <= coin.radius + player.radius) && collisionsEnabled) {
        coinsToDelete.push(coin);
        switch (coin.type) {
          case ACTOR_TYPE_COIN_PICKUP:
            pointsToAward += 150;
            playSound(FX_COIN);
            spawnCoinShower(coin, 5);
            break;

          case ACTOR_TYPE_MAGNET_PICKUP:
            magnetized = 1;
            magnetCounter += 8;
            magnetEffectSpawnTimer = 0;
            playSound(FX_MAGNET);
            break;
        
          case ACTOR_TYPE_SHIELD_PICKUP:
            shielded = 1;
            shieldCounter += 8;
            playSound(FX_SHIELD);
            break;
            
          case ACTOR_TYPE_CLOCK_PICKUP:
            clocked = 1;
            clockCounter += 8;
            clockEffectSpawnTimer = 0;
            playSound(FX_CLOCK);
            break;
        
          default:
            break;
        }

      }
      
      renderList.push(egg);

    });

    // Recycle coins that left the game scene.
    coinsToDelete.forEach((coin) => {
      activeCoins.delete(coin);
      coinPool.push(coin);
    });
// #endregion

// #region Process enemies.
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];

      let dx = enemy.x - CENTERX;
      let dy = enemy.y - CENTERY;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > ENEMY_SPAWN_RADIUS + 64) respawnEnemy(enemy, randomSpeed());

      if (enemy.collides && collisionsEnabled) { // Only check collision if the enemy allows for it. Enemies who have been deflected do not collide.

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = M.sqrt(dx * dx + dy * dy);

        const deflectEnemy = () => {
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = enemy.radius + player.radius - distance;
          const dotProduct = -player.vx * nx + -player.vy * ny;
        
          enemy.x += nx * overlap / 2;
          enemy.y += ny * overlap / 2;
        
          enemy.vx -= 3 * dotProduct * nx;
          enemy.vy -= 3 * dotProduct * ny;
          
          enemy.rotationRate *= 8;

          enemy.collides = 0;

          for (let k = 10; k--;) {
            newParticle(
              1, // ttl
              player.x, // x
              player.y, // y
              randomAngle(),
              'shieldPickup', // texture
              450 + randomInt(50, 200), // speed
              1, // fades
              1, // alpha
              1, // shrinks
              .4 + random() * .35, // scale
              0, // rotationRate
              0, // gx
              0 // gy
            );
          }

          playSound(FX_DEFLECT);
        };

        if (distance <= enemy.radius + player.radius) { // there was a collision, resolve it.


          if (shieldCounter > 0 ) { // Player is shielded so bounce the enemy off and award points.

            deflectEnemy();

            pointsToAward += 250;

          } else {

            gameOver();

          }

        }

      }

      // Update enemy position after collision check.
      const timeShift = (clocked) ? .2 : 1;

      enemy.y += enemy.vy * MULTIPLIER * DT * timeShift;
      enemy.x += enemy.vx * MULTIPLIER * DT * timeShift;

      enemy.angle += enemy.rotationRate;

      renderList.push(enemy);
    }
// #endregion

    if (pointsToAward) awardPoints(pointsToAward); // Award any accrued points.

    let lastPoint = points[points.length - 1];
    lastPoint.pos.x = egg.x;
    lastPoint.pos.y = egg.y;
    
    let point = rope.getPoint(0);
    point.pos.x = player.x;
    point.pos.y = player.y;
    
    rope.update(DT);
  
    for (i = 0; i < points.length; i++) {
      let p = points[i];
  
      // const prev = i > 0 ? points[i - 1] : null;

      p.x = p.pos.x;
      p.y = p.pos.y;

      renderList.push(p);
    }
  
    renderList.push(player);
    if (shielded) {
      shieldOverlay.x = player.x;
      shieldOverlay.y = player.y;
      renderList.push(shieldOverlay);
    }
  
  } // END game playing 

  renderList.push(sun);

// #region Process parallax stars.

  let vx, vy;

  if (gameMode === GAME_MODE_PLAYING) {
    starfield.angle = player.angle;
    starfield.speed = player.speed;
    starfield.vx = player.vx;
    starfield.vy = player.vy;

  } else if (gameMode === GAME_MODE_GAMEOVER) { // Transition stars to be moving in the desired direction for the main menu.

    starfield.speed = lerp(starfield.speed, 100, 10 * DT);
    starfield.angle = lerp(starfield.angle, 0, 10 * DT);
  }

  vx = starfield.vx = cos(starfield.angle) * starfield.speed;
  vy = starfield.vy = sin(starfield.angle) * starfield.speed;

  for (let i = 225; i--;) {
    const star = stars[i];
    const speedFactor = i < 50 ? .3 : i < 125 ? .5 : 1;
    star.x -= vx * speedFactor * DT;
    star.y -= vy * speedFactor * DT;

    if (star.x < -32) star.x += WIDTH + 64
    else if (star.x > WIDTH + 32) star.x -= WIDTH + 64;

    if (star.y < -32) star.y += HEIGHT + 64
    else if (star.y > HEIGHT + 32) star.y -= HEIGHT + 64;

    renderList.push(star);
  }
// #endregion

// #region Render game scene.

  updateParticles(); // Particles appear on top of everything else, so they don't need to be added to `renderList` before sorting.
    
  renderList.sort((a, b) => (a.type < b.type) ? 1 : -1); // Sort into descending type order.

  const normal = 0xFFFFFF00;

  for (let i = renderList.length; i--;) {

    const actor = renderList[i];
    const r = actor.texture;

    gl2_drawImage(r.x, r.y, r.w, r.h, actor.x - r.w / 2, actor.y - r.h / 2, r.w * actor.scale, r.h * actor.scale, normal + actor.alpha * 127, actor.angle);
  }

  gl2_drawEverything();

// #endregion

  // Finally stop any music that needs to be stopped.
  for (let i = musicToStop.length; i--;) {
    const musicObject = musicToStop[i];
    if ((musicObject.timer -= DT) < 0) {
      musicObject.buffer.stop();
      musicToStop.pop();
    }
  }

};
