/**
 * Color Tool
 * @description Provides an interface to pick color palettes.
 *
 * @url https://rsc-media.github.io/colorTool/
 * @url https://learnatrio.com/ColorTool/
 *
 * @url https://www.riolearn.org/content/_resources/interactives/colortool/dist/index.html
 * @url https://learnatrio.com/RL-ColorTool/
 */
// Configurable
config = {
  maxImageDim: window.screen.width / 6, // px
  initColors: [ "#0c234088", "#ffffffff", "#00ff00ff", "#236192ff" ],
  customColors: [
    { name: "Chandler Gilbert CC Cyan", hex: "#008c95" },
    { name: "Estrella Mountain CC Purple", hex: "#642667" },
    { name: "GateWay CC ", hex: "#0033A0" },
    { name: "Glendale CC ", hex: "#CB333B" },
    { name: "Mesa CC ", hex: "#004C97" },
    { name: "Paradise Valley CC ", hex: "#003DA5" },
    { name: "Phoenix College Dark Blue ", hex: "#002E5D" },
    { name: "Rio Salado College Blue ", hex: "#236192" },
    { name: "Scottsdale CC Green", hex: "#215732" },
    { name: "South Mountain CC Yellow", hex: "#CF7F00" },
    { name: "Maricopa District Dark Blue", hex: "#0C2340" }
  ]
}
// Handle Query String
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};
var qsColors = getUrlParameter("c");
if (qsColors && qsColors.length >= 4) config.initColors = qsColors.split("-");
else console.log("Query String 'c' detected but a minimum of 4 hex base colors were not found");

// Set up Variables
var currentFill = document.querySelector(".current > .fill");
//var edColor;

var namedColors = getNamedColors();
var tabs = {
  el: document.getElementsByClassName("tabs")[0]
};

// A list of IDs to find on the page
var wants = [
  "hex", "hex2", "hex3",
  "alpha", "alpha2",
  "red", "green", "blue",
  "hue", "sat", "lum",
  "cyn", "mag", "yel", "blk",
  "redCB", "greenCB", "blueCB", "alphaCB",
  "hueCB", "satCB", "lumCB", "alpha2CB",
  "cynCB", "magCB", "yelCB", "blkCB",
  "thumbnailDetails", "addToPalette"
];
// Load each item from the ID list
wants.forEach(function(want) {
  this[want] = document.getElementById(want);
});

var outputs = document.getElementById("conversions-output");
var nearest = document.getElementById("nearest");

var util = {
  pad: function(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  },
  adjustChild: function(object,child,value) {
    object[child] = value;
    return object;
  },
  sanitizeDec: function(val) {
    if (!Number.isInteger(val)) val = parseInt(val);
    return val;
  },
  /**
   * Get Hue linear gradient string
   * @returns {String}
   */
  luminance: function(obj) {
    // Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
    var rgba = [obj.red,obj.green,obj.blue];

    for(var i=0; i<3; i++) {
      var rgb = rgba[i];

      rgb /= 255;

      rgb = rgb < .03928 ? rgb / 12.92 : Math.pow((rgb + .055) / 1.055, 2.4);

      rgba[i] = rgb;
    }

    return .2126 * rgba[0] + .7152 * rgba[1] + 0.0722 * rgba[2];
  },
  getContrast: function(c1,c2) {
    if (typeof c1 == "string") {
      c1 = util.stringToRGB(c1);
    }
    if (typeof c2 == "string") {
      c2 = util.stringToRGB(c2);
    }
    // Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
    var l1 = util.luminance(c1) + .05,
        l2 = util.luminance(c2) + .05,
        ratio = (l1===l2) ? 1 : l1/l2;

    if (l2 > l1) {
      ratio = 1 / ratio;
    }

    ratio = Math.floor(ratio* 10) / 10;

    return ratio;
  },
  getHueStr: function(sat, lum) {
    var hueStr = "linear-gradient(to right, ";
    var hueCnt = 0;
    while (hueCnt <= 360) {
      if (hueCnt != 0) hueStr += ", ";
      hueStr += "hsl(" + hueCnt + "," + sat + "%," + lum + "%)";
      hueCnt += 60;
    }
    hueStr += ")";
    return hueStr;
  },
  getRGBStr: function(red, green, blue, alpha) {
    return (alpha >= 0) ? "rgba(" + red + ","+ green +","+ blue +","+ alpha + ")" : "rgb(" + red + ","+ green +","+ blue +")";
  },
  getRGBStrO: function(rgb) {
    return util.getRGBStr(rgb.red, rgb.green, rgb.blue, rgb.alpha);
  },
  CMYKtoRGB: function(cyan, magenta, yellow, black, round) {
    round = (round == false) ? false : true; // Default to round = true
    var c = util.sanitizeDec(cyan) / 100;
    var m = util.sanitizeDec(magenta) / 100;
    var y = util.sanitizeDec(yellow) / 100;
    var k = util.sanitizeDec(black) / 100;

    c = c * (1 - k) + k;
    m = m * (1 - k) + k;
    y = y * (1 - k) + k;

    var r = (1 - c) * 255;
    var g = (1 - m) * 255;
    var b = (1 - y) * 255;

    if (round) {
      r = Math.round(r);
      g = Math.round(g);
      b = Math.round(b);
    }

    return {
      red: r,
      green: g,
      blue: b
    }
  },
  RGBtoCMYK: function(red, green, blue) {
    var r = util.sanitizeDec(red) / 255;
    var g = util.sanitizeDec(green) / 255;
    var b = util.sanitizeDec(blue) / 255;

    var black = Math.min(1 - r, 1 - g, 1 - b);
    var cyan = black == 1 ? 0 : (1 - r - black) / (1 - black);
    var magenta = black == 1 ? 0 : (1 - g - black) / (1 - black);
    var yellow = black == 1 ? 0 : (1 - b - black) / (1 - black);
    cyan *= 100; magenta *= 100; yellow *= 100; black *= 100;
    return {
      cyan: Math.round(cyan),
      magenta: Math.round(magenta),
      yellow: Math.round(yellow),
      black: Math.round(black)
    }
  },
  RGBtoHex: function(red, green, blue, alpha) {
    var r = util.pad(util.sanitizeDec(red).toString(16), 2);
    var g = util.pad(util.sanitizeDec(green).toString(16), 2);
    var b = util.pad(util.sanitizeDec(blue).toString(16), 2);

    var hex = "#" + r + g + b;
    if (alpha) hex += Math.round(alpha * 255).toString(16);
    return hex;
  },
  RGBtoHSL: function(red, green, blue) {
    var r = util.sanitizeDec(red) / 255;
    var g = util.sanitizeDec(green) / 255;
    var b = util.sanitizeDec(blue) / 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var h,
      s,
      l = (max + min) / 2;

    if (max == min) {
      h = s = 0; // achromatic
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d;
          break; // + (g < b ? 6 : 0)
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
    }
    // If Hue has rolled past 0 or 360, roll it back
    var hue = Math.round(h * 60);
    while (hue < 0) hue += 360;
    while (hue > 360) hue -= 360;
    // Done
    return {
      hue: hue,
      sat: Math.round(s * 100),
      lum: Math.round(l * 100)
    }
  },
  RGBtoHSV: function(red, green, blue) {
    var r = util.sanitizeDec(red) / 255;
    var g = util.sanitizeDec(green) / 255;
    var b = util.sanitizeDec(blue) / 255;

    var h, s, v, d;
    var max = v = Math.max(r, g, b);
    var min = Math.min(r, g, b);

    d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    // map top 360,100,100
    h = round(h * 360);
    s = round(s * 100);
    v = round(v * 100);

    return [h, s, v];
  },
  RGBtoCIELAB: function(red, green, blue) {
    var r = util.sanitizeDec(red) / 255;
    var g = util.sanitizeDec(green) / 255;
    var b = util.sanitizeDec(blue) / 255;
    var x, y, z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return {
      l: (116 * y) - 16,
      a: 500 * (x - y),
      b: 200 * (y - z)
    };
  },
  HextoRGB: function(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b, a) {
      return r + r + g + g + b + b + ((a) ? a + a : '');
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
    if (result) {
      return {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16),
        alpha: Math.round((parseInt(result[4], 16) / 255) * 100)/100
      };
    } else return null;
  },
  HSLtoRGB: function(hue, sat, lum, alpha) {
    var r, g, b;
    var h = util.sanitizeDec(hue);
    var s = util.sanitizeDec(sat);
    var l = util.sanitizeDec(lum);
    h /= 360; s /= 100; l /= 100;

    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      red: r * 255,
      green: g * 255,
      blue: b * 255,
      alpha: alpha
    }
  },
  randomRGB: function() {
    return {
      red: Math.floor(Math.random() * Math.floor(255)),
      green: Math.floor(Math.random() * Math.floor(255)),
      blue: Math.floor(Math.random() * Math.floor(255))
    }
  },
  stringToRGB: function(string) {
    var out;
    string = string.trim();
    switch (true) {
      case string.startsWith("#"):
        out = util.HextoRGB(string);
        break;
      case string.startsWith("rgb"):
        var re = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d\.?\d*))?/;
        var found = string.match(re);
        out = {
          red: found[1],
          green: found[2],
          blue: found[3],
          alpha: (found.length == 5 && typeof found[4] != "undefined") ? found[4] : 1
        };
        break;
      case string.startsWith("hsl"):
      default:
        // console.log("Only hex and rgb are currently supported.");
        out = "";
        break;
    }
    return (out) ? out : util.randomRGB();
  }
};
var palette = initPalette();

// Init
InitUI();
/**
 * Initialize the UI.
 */
function InitUI() {
  // init RGB
  red.value = palette.currentColor.red;
  green.value = palette.currentColor.green;
  blue.value = palette.currentColor.blue;
  // init Alpha
  alpha.value = palette.currentColor.alpha * 100;
  alpha2.value = palette.currentColor.alpha * 100;

  initTabs();
  // initCBKnobs();
  initDropzone();
  initCanvas();
  getCommonNames();
  UpdateUI(red);
  initTheme();

  var inputs = document.querySelectorAll(".tools.pane input:not([type=radio])")
  inputs.forEach(function(input) {
    input.addEventListener("input", function(ev) {
      ev.preventDefault();
      ev.stopPropagation();

      if (ev.srcElement.type == "file") {
        var file = ev.srcElement.files[0];
        loadFile(file);
      } else {
        console.log(ev);
        UpdateUI(ev.srcElement);
      }
    });
  });
}
var updatePrev, updatePrevValue;
/**
 * Updates the UI.
 * @param {HTMLelement} src The element that was changed and initated the update
 */
function UpdateUI(src) {
  // Debounce on duplicate update request or if already running an update.
  if (updatePrev === src && updatePrevValue === src.value) return;
  // Set up debounce
  updatePrev = src;
  updatePrevValue = src.value;
  // Update Inputs
  var target = updateInputs(src);
  var _hex = palette.currentColor.toHexString();

  if (target != "hex") {
    // Update Hex values
    hex.value = _hex;
    // Hex prefix insurance
    if (!hex.value.startsWith("#")) hex.value = "#" + hex.value;
    if (hex.value.startsWith("##")) hex.value = hex.value.replace("##", "#");

    hex2.value = hex.value;
    hex3.value = hex.value;
  }
  // Update RGB
  if (target != "rgb") {
    // Numerical values
    red.value = Math.round(palette.currentColor.red);
    green.value = Math.round(palette.currentColor.green);
    blue.value = Math.round(palette.currentColor.blue);
  }
  if (target != "rgbCB") {
    // Color bar values
    redCB.value = red.value;
    greenCB.value = green.value;
    blueCB.value = blue.value;
    alphaCB.value = alpha.value;
  }
  // Update HSL
  if (target != "hsl") {
    var hsl = palette.currentColor.toHSL();
    // Numerical values
    hue.value = hsl.hue;
    sat.value = hsl.sat;
    lum.value = hsl.lum;
  }
  if (target != "hslCB") {
    // Color bar values
    hueCB.value = hue.value;
    satCB.value = sat.value;
    lumCB.value = lum.value;
    alpha2CB.value = alpha2.value;
  }
  // Update CMYK
  if (target != "cmyk") {
    // Numerical values
    var cmyk = palette.currentColor.toCMYK();
    cyn.value = cmyk.cyan;
    mag.value = cmyk.magenta;
    yel.value = cmyk.yellow;
    blk.value = cmyk.black;
  }
  if (target != "cmykCB") {
    // Color bar values
    cynCB.value = cyn.value;
    magCB.value = mag.value;
    yelCB.value = yel.value;
    blkCB.value = blk.value;
  }
  updateFills(_hex);
  updateColorBars(target);
  updateConversions();
  // Update Background
  document.body.style.background =
    "linear-gradient(to bottom right, hsl(" + hue.value + "," + sat.value + "%,90%, 0), hsl(" + hue.value + "," + sat.value + "%,80%, 1))";
}

function updateInputs(src) {
  var target = null;
  if (src !== null) {
    switch (src) {
      case hex3:
        target = "hex";
        hex.value = hex3.value;
        hex2.value = hex3.value;
        palette.currentColor.fromHex(src.value);
        break;
      case hex2:
        target = "hex";
        hex.value = hex2.value;
        hex3.value = hex2.value;
        palette.currentColor.fromHex(src.value);
        break;
      case hex:
        target = "hex";
        hex2.value = hex.value;
        hex3.value = hex.value;
        palette.currentColor.fromHex(src.value);
        break;
      case red:
      case green:
      case blue:
      case alpha:
        target = "rgb";
        alpha2.value = alpha.value;
        // Update object
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case hue:
      case sat:
      case lum:
      case alpha2:
        target = "hsl";
        alpha.value = alpha2.value;
        // Update object
        palette.currentColor.fromHSL(hue.value, sat.value, lum.value, alpha2.value/100);
        break;
      case cyn:
      case mag:
      case yel:
      case blk:
        target = "cmyk";
        // Update object
        palette.currentColor.fromCMYK(cyn.value,mag.value,yel.value,blk.value);
        break;
      case redCB:
        target = "rgbCB";
        red.value = redCB.value;
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case greenCB:
        target = "rgbCB";
        green.value = greenCB.value;
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case blueCB:
        target = "rgbCB";
        blue.value = blueCB.value;
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case alphaCB:
        target = "rgbCB";
        alpha.value = alpha2.value = alphaCB.value;
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case hueCB:
        target = "hslCB";
        hue.value = hueCB.value;
        palette.currentColor.fromHSL(hue.value, sat.value, lum.value, alpha2.value/100);
        break;
      case satCB:
        target = "hslCB";
        sat.value = satCB.value;
        palette.currentColor.fromHSL(hue.value, sat.value, lum.value, alpha2.value/100);
        break;
      case lumCB:
        target = "hslCB";
        lum.value = lumCB.value;
        palette.currentColor.fromHSL(hue.value, sat.value, lum.value, alpha2.value/100);
        break;
      case alpha2CB:
        target = "hslCB";
        alpha.value = alpha2.value = alpha2CB.value;
        palette.currentColor.fromRGB(red.value, green.value, blue.value, alpha.value/100);
        break;
      case cynCB:
        target = "cmykCB";
        cyn.value = cynCB.value;
        palette.currentColor.fromCMYK(cyn.value,mag.value,yel.value,blk.value);
        break;
      case magCB:
        target = "cmykCB";
        mag.value = magCB.value;
        palette.currentColor.fromCMYK(cyn.value,mag.value,yel.value,blk.value);
        break;
      case yelCB:
        target = "cmykCB";
        yel.value = yelCB.value;
        palette.currentColor.fromCMYK(cyn.value,mag.value,yel.value,blk.value);
        break;
      case blkCB:
        target = "cmykCB";
        blk.value = blkCB.value;
        palette.currentColor.fromCMYK(cyn.value,mag.value,yel.value,blk.value);
        break;
    }
  }
  return target;
}
function updateColorBars(target) {
  /// RGB
  redCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStr(0, green.value, blue.value, alpha.value/100) +", "+ util.getRGBStr(255, green.value, blue.value, alpha.value/100) +")";
  greenCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStr(red.value, 0, blue.value, alpha.value/100) +", "+ util.getRGBStr(red.value, 255, blue.value, alpha.value/100) +")";
  blueCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStr(red.value, green.value, 0, alpha.value/100) +", "+ util.getRGBStr(red.value, green.value, 255, alpha.value/100) +")";
  alphaCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStr(red.value, green.value, blue.value , 0, alpha.value/100) +", "+ util.getRGBStr(red.value, green.value, blue.value , 1, alpha.value/100) +")";
  /// HSL
  hueCB.style.background = util.getHueStr(sat.value, lum.value);
  satCB.style.background =
    "linear-gradient(to right, hsl(" + hue.value + ",0%," + lum.value + "%, " +  alpha2.value / 100 + "), hsl(" + hue.value + ",100%," + lum.value + "%, " +  alpha2.value / 100 + "))";
  lumCB.style.background =
    "linear-gradient(to right, hsl(" + hue.value + "," + sat.value + "%,0%, " +  alpha2.value / 100 + "), hsl(" + hue.value + "," + sat.value + "%,50%), hsl(" + hue.value + "," + sat.value + "%,100%, " +  alpha2.value / 100 + "))";
  alpha2CB.style.background =
    "linear-gradient(to right, hsla(" + hue.value + "," + sat.value + "%," + lum.value + "%, 0, " +  alpha2.value / 100 + "), hsla(" + hue.value + "," + sat.value + "%," + lum.value + "%, 1, " +  alpha2.value / 100 + "))";
  /// CMYK
  cynCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStrO(util.CMYKtoRGB(0, mag.value, yel.value, blk.value)) +", "+ util.getRGBStrO(util.CMYKtoRGB(100, mag.value, yel.value, blk.value)) +")";
  magCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, 0, yel.value, blk.value)) +", "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, 100, yel.value, blk.value)) +")"
  yelCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, mag.value, 0, blk.value)) +", "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, mag.value, 100, blk.value)) +")"
  blkCB.style.background =
    "linear-gradient(to right, "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, mag.value, yel.value, 0)) +", "+ util.getRGBStrO(util.CMYKtoRGB(cyn.value, mag.value, yel.value, 100)) +")"
}

function updateConversions() {
  var hex = palette.currentColor.toHexString(false);
  // Update Nearest
  var out = "<h3>Nearest Named Colors</h3>";
  out += "HTML Named: <span class='clickCopy' data-side='bottom'>" + namedColors.nearest.html(hex).name + "</span><br/>";
  out += "Crayon: " + namedColors.nearest.crayola(hex).name + "<br/>";
  if (typeof namedColors.nearest.common != "undefined") {
    out += "<label title='https://github.com/meodai/color-names'>Common</label>: " + namedColors.nearest.common(hex).name + "<br/>";
  }
  nearest.innerHTML = out;
  // Update Conversions
  var alphaEnabled = document.getElementById("alphaEnabled").checked;
  /// Get hex again if alphaEnabled = true
  if (alphaEnabled == true) {
    hex = palette.currentColor.toHexString(alphaEnabled);
  }
  out = "<span>hex: <span class='clickCopy'>" + hex + "</span></span>";
  out += "<span><span class='clickCopy'>" + palette.currentColor.toRGBString(alphaEnabled) + "</span></span>";
  out += "<span><span class='clickCopy'>" + palette.currentColor.toHSLstring(alphaEnabled) + "</span></span>";
  out += "<span><span class='clickCopy'>" + palette.currentColor.toCMYKstring(alphaEnabled) + "</span></span>";
  out += "<span><span class='clickCopy'>" + palette.currentColor.toCIELABstring(alphaEnabled) + "</span></span>";
  outputs.innerHTML = out;

  // Add event listeners
  initClickCopy();
}
function updateFills(hex) {
  hex = hex.replace("#", "");
  palette.fills[0].style.backgroundColor =
    palette.fills[palette.activeIndex].style.backgroundColor =
    palette.currentColor.toRGBString();
}

function initTabs() {
  tabs.radios = Array.prototype.slice.call(tabs.el.getElementsByTagName("input"));
  tabs.labels = Array.prototype.slice.call(tabs.el.getElementsByTagName("label"));
  tabs.contents = Array.prototype.slice.call(document.getElementsByClassName("tab-content"));
  tabs.contents[0].style.zIndex = 2;

  tabs.radios.forEach(function (radio, index) {

    tabs.el.querySelector("div[data-tabs=" + radio.id +"]");
    radio.content = tabs.contents.find(function (content) {
      var target = content.getAttribute("data-tab")
      return target == radio.id;
    });
    radio.addEventListener("change", function(e) {
      tabs.radios.forEach(function (radio, index) {
        radio.content.style.zIndex = (radio.checked) ? 2 : 0;
      });
    });
  });
}
// Palette stuff
/**
 * Creates a new Color object from RGB.
 *
 * @param {number} red The number for red between 0 - 255.
 * @param {number} green The number for green between 0 - 255.
 * @param {number} blue The number for blue between 0 - 255.
 * @param {number} alpha The number for alpha between 0.0 - 1.0.
 * @return {Color} The new Color object.
 */
function Color() {
  this.red = 0;
  this.green = 0;
  this.blue = 0;
  this.alpha = 0.5;

  var listeners = [];
  this.on = function(action, callback) {
    listeners.push({action: action, callback: callback});
  };
  this.emit = function(action, color, call) {
    listeners.forEach(function(listener) {
      if (listener.action == action) {
        var event = {};
        event.color = color;
        event.action = action;
        if (call) event.call = call;
        listener.callback(event);
      }
    });
  };

  this.fromHex = function(hex) {
    // Convert Hex to RGB
    var rgb = util.HextoRGB(hex);
    if (rgb == null) return null;
    // Fire Change event
    var args = Array.prototype.slice.call(arguments).join(", ");
    if (typeof args[args.length-1] == undefined) args.pop();
    this.emit("change", this, "fromHex(" + args + ")");
    // Update Color()
    this.red = rgb.red;
    this.green = rgb.green;
    this.blue = rgb.blue;

  };
  this.fromRGB = function(red, green, blue, alpha) {
    // Fire Change event
    var args = Array.prototype.slice.call(arguments).join(", ");
    this.emit("change", this, "fromRGB(" + args + ")");
    // Update Color()
    this.red = red;
    this.green = green;
    this.blue = blue;
    if (alpha) this.alpha = alpha;
  };
  this.fromHSL = function(h, s, l, alpha) {
    var rgb = util.HSLtoRGB(h,s,l,alpha);
    // Fire Change event
    var args = Array.prototype.slice.call(arguments).join(", ");
    this.emit("change", this, "fromHSL(" + args + ")");
    // Update Color()
    this.red = rgb.red;
    this.green = rgb.green;
    this.blue = rgb.blue;
    this.alpha = rgb.alpha;
  };
  this.fromCMYK = function(c, m, y, k) {
    var rgb = util.CMYKtoRGB(c, m, y, k);
    // Fire Change event
    var args = Array.prototype.slice.call(arguments).join(", ");
    this.emit("change", this, "fromCMYK(" + args + ")");
    // Update Color()
    this.red = rgb.red;
    this.green = rgb.green;
    this.blue = rgb.blue;
  }

  this.toCIELAB = function() {
    return util.RGBtoCIELAB(this.red, this.green, this.blue);
  }
  this.toCIELABstring = function() {
    var lab = this.toCIELAB();
    return "CIElab(" + Math.round(lab.l * 100)/100 + ", " + Math.round(lab.a * 100)/100 + ", " + Math.round(lab.b * 100)/100 + ")";
  }
  this.toRGBString = function(alphaEnabled) {
    if (typeof alphaEnable == "undefined") alphaEnable = true;
    var out = (alphaEnabled) ? "rgba(" : "rgb(";
    out += Math.round(this.red) + ", " +
      Math.round(this.green) + ", " +
      Math.round(this.blue);
    if (alphaEnabled) {
      out += ", " + this.alpha;
    }
    out += ")"
    return out;
  };
  this.toHSL = function() {
    return util.RGBtoHSL(this.red, this.green, this.blue);
  };
  this.toHSLstring = function(alphaEnabled) {
    if (typeof alphaEnabled == "undefined") alphaEnable = true;
    var hsl = this.toHSL();
    var hue = hsl.hue === 0 ? 0 : hsl.hue;
    var sat = hsl.sat === 0 ? 0 : hsl.sat + "%";
    var lum = hsl.lum === 0 ? 0 : hsl.lum + "%";

    var out = (alphaEnabled) ? "hsla(" : "hsl(";
    out += hue + ", " + sat + ", " + lum;
    if (alphaEnabled) {
      out += ", " + this.alpha;
    }
    out += ")";
    return out;
  };
  this.toHexString = function(alphaEnabled) {
    if (typeof alphaEnabled == "undefined") alphaEnable = false;
    return (alphaEnabled)
      ? util.RGBtoHex(this.red, this.green, this.blue, this.alpha)
      : util.RGBtoHex(this.red, this.green, this.blue);;
  };
  this.toCMYK = function() {
    return util.RGBtoCMYK(this.red, this.green, this.blue);
  };
  this.toCMYKstring = function() {
    var cmyk = this.toCMYK();
    return "device-cmyk(" + cmyk.cyan + "%, " + cmyk.magenta + "%, " + cmyk.yellow + "%, " + cmyk.black + "%)";
  };
}
function initPalette() {
  // Activate Alpha Enable checkbox under Conversions
  var alphaEnabled = document.getElementById("alphaEnabled");
  alphaEnabled.addEventListener("change", updateConversions);
  //
  var s = document.querySelector(".current.swatch");
  var f = s.fill = s.getElementsByClassName("fill")[0];
  f.swatch = s;
  var p = {
    swatches: [s],
    fills: [f],
    currentColor: new Color()
  };
  // Get Element
  p.el = p.element = document.getElementsByClassName("palette")[0];
  // Utility Functions
  p.addSwatch = function(rgb) {
    if (rgb == null || typeof rgb !== "object") rgb = util.randomRGB();
    rgb.alpha = 1;
    var swatch = document.createElement("div");
    swatch.classList.add("swatch");

    swatch.fill = document.createElement("div");
    swatch.appendChild(swatch.fill);

    swatch.fill.classList.add("fill");
    swatch.fill.style.backgroundColor = util.getRGBStr(rgb.red, rgb.green, rgb.blue, rgb.alpha)
    swatch.fill.innerHTML = "&nbsp;";
    swatch.fill.rgb = rgb;
    swatch.fill.swatch = swatch;

    p.swatches.push(swatch);
    p.fills.push(swatch.fill);

    addToPalette.parentElement.insertBefore(swatch, addToPalette);

    swatch.fill.addEventListener("click", handleFillClick);
  };

  // Build Swatches from Init Colors
  config.initColors.forEach(function(color) {
    var rgb = util.HextoRGB(color);
    p.addSwatch(rgb);

  });
  p.currentColor.fromHex(config.initColors[0]);
  alpha.value = 100;
  p.currentColor.alpha = 1;
  // Get length
  p.length = p.fills.length;
  // console.log (p)
  // Set active color
  p.activeIndex = 1;
  p.swatches[1].classList.add("active");

  var timeout;
  p.currentColor.on("change",function(ev) {
    clearTimeout(timeout);
    timeout = setTimeout(handleChange(ev), 500);
  });

  function handleChange(ev) {
    console.log("Color updated " + ev.call);
    // // updateFills(palette.currentColor.toHexString());
    // var color = ev.call.replace("fromRGB", "rgb");
    // if (p.fills[0].style.backgroundColor != color) p.fills[0].style.backgroundColor = color;
    // if (p.fills[p.activeIndex].style.backgroundColor != color) p.fills[p.activeIndex].style.backgroundColor = color;
    // var rgb = util.stringToRGB(color);
    // red.value = rgb.red;
    // green.value = rgb.green;
    // blue.value = rgb.blue;
    // alpha.value = rgb.alpha | 1;
    // UpdateUI(red);
  }

  return p;
}
function handleFillClick(ev) {
  ev.preventDefault();

  var swatch = ev.srcElement.parentElement;
  ev.color = ev.srcElement.style.backgroundColor;

  // Clear current active
  palette.swatches[palette.activeIndex].classList.remove("active");

  // Set new active
  swatch.classList.add("active");

  // Find index in siblings for new active
  var child = 1, cur = swatch;
  while (cur.previousElementSibling) {
    cur = cur.previousElementSibling;
    child++;
  }
  console.log("Swatch " + child + " was clicked with color: " + ev.color);

  // Update active index
  palette.activeIndex = child;

  // Update active Color
  var rgb = util.stringToRGB(swatch.fill.style.backgroundColor);
  palette.currentColor.fromRGB(rgb.red, rgb.green, rgb.blue, rgb.alpha);
  var _hex = palette.currentColor.toHexString();
  updateFills(_hex);

  // Update UI
  // hex.value = hex2.value = hex3.value = "#" + _hex;
  // UpdateUI(hex);
  red.value = Math.round(rgb.red);
  green.value = Math.round(rgb.green);
  blue.value = Math.round(rgb.blue);
  alpha.value = Math.round(rgb.alpha * 100);
  UpdateUI(red);
  // console.log(ev);
}
// Color Name stuff
function getNamedColors() {
  var colors = {};

  colors.html = htmlColors = [
    { hex: "#FFC0CB", name: "Pink", cat: "Pinks", red: 255, green: 192, blue: 203},
    { hex: "#FFB6C1", name: "LightPink", cat: "Pinks", red: 255, green: 182, blue: 193},
    { hex: "#FF69B4", name: "HotPink", cat: "Pinks", red: 255, green: 105, blue: 180},
    { hex: "#FF1493", name: "DeepPink", cat: "Pinks", red: 255, green: 20, blue: 147},
    { hex: "#DB7093", name: "PaleVioletRed", cat: "Pinks", red: 219, green: 112, blue: 147},
    { hex: "#C71585", name: "MediumVioletRed", cat: "Pinks", red: 199, green: 21, blue: 133},
    { hex: "#FFA07A", name: "LightSalmon", cat: "Reds", red: 255, green: 160, blue: 122},
    { hex: "#FA8072", name: "Salmon", cat: "Reds", red: 250, green: 128, blue: 114},
    { hex: "#E9967A", name: "DarkSalmon", cat: "Reds", red: 233, green: 150, blue: 122},
    { hex: "#F08080", name: "LightCoral", cat: "Reds", red: 240, green: 128, blue: 128},
    { hex: "#CD5C5C", name: "IndianRed", cat: "Reds", red: 205, green: 92, blue: 92},
    { hex: "#DC143C", name: "Crimson", cat: "Reds", red: 220, green: 20, blue: 60},
    { hex: "#B22222", name: "Firebrick", cat: "Reds", red: 178, green: 34, blue: 34},
    { hex: "#8B0000", name: "DarkRed", cat: "Reds", red: 139, green: 0, blue: 0},
    { hex: "#FF0000", name: "Red", cat: "Reds", red: 255, green: 0, blue: 0},
    { hex: "#FF4500", name: "OrangeRed", cat: "Oranges", red: 255, green: 69, blue: 0},
    { hex: "#FF6347", name: "Tomato", cat: "Oranges", red: 255, green: 99, blue: 71},
    { hex: "#FF7F50", name: "Coral", cat: "Oranges", red: 255, green: 127, blue: 80},
    { hex: "#FF8C00", name: "DarkOrange", cat: "Oranges", red: 255, green: 140, blue: 0},
    { hex: "#FFA500", name: "Orange", cat: "Oranges", red: 255, green: 165, blue: 0},
    { hex: "#FFFF00", name: "Yellow", cat: "Yellows", red: 255, green: 255, blue: 0},
    { hex: "#FFFFE0", name: "LightYellow", cat: "Yellows", red: 255, green: 255, blue: 224},
    { hex: "#FFFACD", name: "LemonChiffon", cat: "Yellows", red: 255, green: 250, blue: 205},
    { hex: "#FAFAD2", name: "LightGoldenrodYellow ", cat: "Yellows", red: 250, green: 250, blue: 210},
    { hex: "#FFEFD5", name: "PapayaWhip", cat: "Yellows", red: 255, green: 239, blue: 213},
    { hex: "#FFE4B5", name: "Moccasin", cat: "Yellows", red: 255, green: 228, blue: 181},
    { hex: "#FFDAB9", name: "PeachPuff", cat: "Yellows", red: 255, green: 218, blue: 185},
    { hex: "#EEE8AA", name: "PaleGoldenrod", cat: "Yellows", red: 238, green: 232, blue: 170},
    { hex: "#F0E68C", name: "Khaki", cat: "Yellows", red: 240, green: 230, blue: 140},
    { hex: "#BDB76B", name: "DarkKhaki", cat: "Yellows", red: 189, green: 183, blue: 107},
    { hex: "#FFD700", name: "Gold", cat: "Yellows", red: 255, green: 215, blue: 0},
    { hex: "#FFF8DC", name: "Cornsilk", cat: "Browns", red: 255, green: 248, blue: 220},
    { hex: "#FFEBCD", name: "BlanchedAlmond", cat: "Browns", red: 255, green: 235, blue: 205},
    { hex: "#FFE4C4", name: "Bisque", cat: "Browns", red: 255, green: 228, blue: 196},
    { hex: "#FFDEAD", name: "NavajoWhite", cat: "Browns", red: 255, green: 222, blue: 173},
    { hex: "#F5DEB3", name: "Wheat", cat: "Browns", red: 245, green: 222, blue: 179},
    { hex: "#DEB887", name: "Burlywood", cat: "Browns", red: 222, green: 184, blue: 135},
    { hex: "#D2B48C", name: "Tan", cat: "Browns", red: 210, green: 180, blue: 140},
    { hex: "#BC8F8F", name: "RosyBrown", cat: "Browns", red: 188, green: 143, blue: 143},
    { hex: "#F4A460", name: "SandyBrown", cat: "Browns", red: 244, green: 164, blue: 96},
    { hex: "#DAA520", name: "Goldenrod", cat: "Browns", red: 218, green: 165, blue: 32},
    { hex: "#B8860B", name: "DarkGoldenrod", cat: "Browns", red: 184, green: 134, blue: 11},
    { hex: "#CD853F", name: "Peru", cat: "Browns", red: 205, green: 133, blue: 63},
    { hex: "#D2691E", name: "Chocolate", cat: "Browns", red: 210, green: 105, blue: 30},
    { hex: "#8B4513", name: "SaddleBrown", cat: "Browns", red: 139, green: 69, blue: 19},
    { hex: "#A0522D", name: "Sienna", cat: "Browns", red: 160, green: 82, blue: 45},
    { hex: "#A52A2A", name: "Brown", cat: "Browns", red: 165, green: 42, blue: 42},
    { hex: "#800000", name: "Maroon", cat: "Browns", red: 128, green: 0, blue: 0},
    { hex: "#556B2F", name: "DarkOliveGreen", cat: "Greens", red: 85, green: 107, blue: 47},
    { hex: "#808000", name: "Olive", cat: "Greens", red: 128, green: 128, blue: 0},
    { hex: "#6B8E23", name: "OliveDrab", cat: "Greens", red: 107, green: 142, blue: 35},
    { hex: "#9ACD32", name: "YellowGreen", cat: "Greens", red: 154, green: 205, blue: 50},
    { hex: "#32CD32", name: "LimeGreen", cat: "Greens", red: 50, green: 205, blue: 50},
    { hex: "#00FF00", name: "Lime", cat: "Greens", red: 0, green: 255, blue: 0},
    { hex: "#7CFC00", name: "LawnGreen", cat: "Greens", red: 124, green: 252, blue: 0},
    { hex: "#7FFF00", name: "Chartreuse", cat: "Greens", red: 127, green: 255, blue: 0},
    { hex: "#ADFF2F", name: "GreenYellow", cat: "Greens", red: 173, green: 255, blue: 47},
    { hex: "#00FF7F", name: "SpringGreen", cat: "Greens", red: 0, green: 255, blue: 127},
    { hex: "#00FA9A", name: "MediumSpringGreen ", cat: "Greens", red: 0, green: 250, blue: 154},
    { hex: "#90EE90", name: "LightGreen", cat: "Greens", red: 144, green: 238, blue: 144},
    { hex: "#98FB98", name: "PaleGreen", cat: "Greens", red: 152, green: 251, blue: 152},
    { hex: "#8FBC8F", name: "DarkSeaGreen", cat: "Greens", red: 143, green: 188, blue: 143},
    { hex: "#66CDAA", name: "MediumAquamarine", cat: "Greens", red: 102, green: 205, blue: 170},
    { hex: "#3CB371", name: "MediumSeaGreen", cat: "Greens", red: 60, green: 179, blue: 113},
    { hex: "#2E8B57", name: "SeaGreen", cat: "Greens", red: 46, green: 139, blue: 87},
    { hex: "#228B22", name: "ForestGreen", cat: "Greens", red: 34, green: 139, blue: 34},
    { hex: "#008000", name: "Green", cat: "Greens", red: 0, green: 128, blue: 0},
    { hex: "#006400", name: "DarkGreen", cat: "Greens", red: 0, green: 100, blue: 0},
    { hex: "#00FFFF", name: "Aqua", cat: "Cyans", red: 0, green: 255, blue: 255},
    { hex: "#00FFFF", name: "Cyan", cat: "Cyans", red: 0, green: 255, blue: 255},
    { hex: "#E0FFFF", name: "LightCyan", cat: "Cyans", red: 224, green: 255, blue: 255},
    { hex: "#AFEEEE", name: "PaleTurquoise", cat: "Cyans", red: 175, green: 238, blue: 238},
    { hex: "#7FFFD4", name: "Aquamarine", cat: "Cyans", red: 127, green: 255, blue: 212},
    { hex: "#40E0D0", name: "Turquoise", cat: "Cyans", red: 64, green: 224, blue: 208},
    { hex: "#48D1CC", name: "MediumTurquoise", cat: "Cyans", red: 72, green: 209, blue: 204},
    { hex: "#00CED1", name: "DarkTurquoise", cat: "Cyans", red: 0, green: 206, blue: 209},
    { hex: "#20B2AA", name: "LightSeaGreen", cat: "Cyans", red: 32, green: 178, blue: 170},
    { hex: "#5F9EA0", name: "CadetBlue", cat: "Cyans", red: 95, green: 158, blue: 160},
    { hex: "#008B8B", name: "DarkCyan", cat: "Cyans", red: 0, green: 139, blue: 139},
    { hex: "#008080", name: "Teal", cat: "Cyans", red: 0, green: 128, blue: 128},
    { hex: "#B0C4DE", name: "LightSteelBlue", cat: "Blues", red: 176, green: 196, blue: 222},
    { hex: "#B0E0E6", name: "PowderBlue", cat: "Blues", red: 176, green: 224, blue: 230},
    { hex: "#ADD8E6", name: "LightBlue", cat: "Blues", red: 173, green: 216, blue: 230},
    { hex: "#87CEEB", name: "SkyBlue", cat: "Blues", red: 135, green: 206, blue: 235},
    { hex: "#87CEFA", name: "LightSkyBlue", cat: "Blues", red: 135, green: 206, blue: 250},
    { hex: "#00BFFF", name: "DeepSkyBlue", cat: "Blues", red: 0, green: 191, blue: 255},
    { hex: "#1E90FF", name: "DodgerBlue", cat: "Blues", red: 30, green: 144, blue: 255},
    { hex: "#6495ED", name: "CornflowerBlue", cat: "Blues", red: 100, green: 149, blue: 237},
    { hex: "#4682B4", name: "SteelBlue", cat: "Blues", red: 70, green: 130, blue: 180},
    { hex: "#4169E1", name: "RoyalBlue", cat: "Blues", red: 65, green: 105, blue: 225},
    { hex: "#0000FF", name: "Blue", cat: "Blues", red: 0, green: 0, blue: 255},
    { hex: "#0000CD", name: "MediumBlue", cat: "Blues", red: 0, green: 0, blue: 205},
    { hex: "#00008B", name: "DarkBlue", cat: "Blues", red: 0, green: 0, blue: 139},
    { hex: "#000080", name: "Navy", cat: "Blues", red: 0, green: 0, blue: 128},
    { hex: "#191970", name: "MidnightBlue", cat: "Blues", red: 25, green: 25, blue: 112},
    { hex: "#E6E6FA", name: "Lavender", cat: "Purples", red: 230, green: 230, blue: 250},
    { hex: "#D8BFD8", name: "Thistle", cat: "Purples", red: 216, green: 191, blue: 216},
    { hex: "#DDA0DD", name: "Plum", cat: "Purples", red: 221, green: 160, blue: 221},
    { hex: "#EE82EE", name: "Violet", cat: "Purples", red: 238, green: 130, blue: 238},
    { hex: "#DA70D6", name: "Orchid", cat: "Purples", red: 218, green: 112, blue: 214},
    { hex: "#FF00FF", name: "Fuchsia", cat: "Purples", red: 255, green: 0, blue: 255},
    { hex: "#FF00FF", name: "Magenta", cat: "Purples", red: 255, green: 0, blue: 255},
    { hex: "#BA55D3", name: "MediumOrchid", cat: "Purples", red: 186, green: 85, blue: 211},
    { hex: "#9370DB", name: "MediumPurple", cat: "Purples", red: 147, green: 112, blue: 219},
    { hex: "#8A2BE2", name: "BlueViolet", cat: "Purples", red: 138, green: 43, blue: 226},
    { hex: "#9400D3", name: "DarkViolet", cat: "Purples", red: 148, green: 0, blue: 211},
    { hex: "#9932CC", name: "DarkOrchid", cat: "Purples", red: 153, green: 50, blue: 204},
    { hex: "#8B008B", name: "DarkMagenta", cat: "Purples", red: 139, green: 0, blue: 139},
    { hex: "#800080", name: "Purple", cat: "Purples", red: 128, green: 0, blue: 128},
    { hex: "#4B0082", name: "Indigo", cat: "Purples", red: 75, green: 0, blue: 130},
    { hex: "#483D8B", name: "DarkSlateBlue", cat: "Purples", red: 72, green: 61, blue: 139},
    { hex: "#6A5ACD", name: "SlateBlue", cat: "Purples", red: 106, green: 90, blue: 205},
    { hex: "#7B68EE", name: "MediumSlateBlue ", cat: "Purples", red: 123, green: 104, blue: 238},
    { hex: "#FFFFFF", name: "White", cat: "Whites", red: 255, green: 255, blue: 255},
    { hex: "#FFFAFA", name: "Snow", cat: "Whites", red: 255, green: 250, blue: 250},
    { hex: "#F0FFF0", name: "Honeydew", cat: "Whites", red: 240, green: 255, blue: 240},
    { hex: "#F5FFFA", name: "MintCream", cat: "Whites", red: 245, green: 255, blue: 250},
    { hex: "#F0FFFF", name: "Azure", cat: "Whites", red: 240, green: 255, blue: 255},
    { hex: "#F0F8FF", name: "AliceBlue", cat: "Whites", red: 240, green: 248, blue: 255},
    { hex: "#F8F8FF", name: "GhostWhite", cat: "Whites", red: 248, green: 248, blue: 255},
    { hex: "#F5F5F5", name: "WhiteSmoke", cat: "Whites", red: 245, green: 245, blue: 245},
    { hex: "#FFF5EE", name: "Seashell", cat: "Whites", red: 255, green: 245, blue: 238},
    { hex: "#F5F5DC", name: "Beige", cat: "Whites", red: 245, green: 245, blue: 220},
    { hex: "#FDF5E6", name: "OldLace", cat: "Whites", red: 253, green: 245, blue: 230},
    { hex: "#FFFAF0", name: "FloralWhite", cat: "Whites", red: 255, green: 250, blue: 240},
    { hex: "#FFFFF0", name: "Ivory", cat: "Whites", red: 255, green: 255, blue: 240},
    { hex: "#FAEBD7", name: "AntiqueWhite", cat: "Whites", red: 250, green: 235, blue: 215},
    { hex: "#FAF0E6", name: "Linen", cat: "Whites", red: 250, green: 240, blue: 230},
    { hex: "#FFF0F5", name: "LavenderBlush", cat: "Whites", red: 255, green: 240, blue: 245},
    { hex: "#FFE4E1", name: "MistyRose", cat: "Whites", red: 255, green: 228, blue: 225},
    { hex: "#DCDCDC", name: "Gainsboro", cat: "Blacks", red: 220, green: 220, blue: 220},
    { hex: "#D3D3D3", name: "LightGray", cat: "Blacks", red: 211, green: 211, blue: 211},
    { hex: "#C0C0C0", name: "Silver", cat: "Blacks", red: 192, green: 192, blue: 192},
    { hex: "#A9A9A9", name: "DarkGray", cat: "Blacks", red: 169, green: 169, blue: 169},
    { hex: "#808080", name: "Gray", cat: "Blacks", red: 128, green: 128, blue: 128},
    { hex: "#696969", name: "DimGray", cat: "Blacks", red: 105, green: 105, blue: 105},
    { hex: "#778899", name: "LightSlateGray", cat: "Blacks", red: 119, green: 136, blue: 153},
    { hex: "#708090", name: "SlateGray", cat: "Blacks", red: 112, green: 128, blue: 144},
    { hex: "#2F4F4F", name: "DarkSlateGray", cat: "Blacks", red: 47, green: 79, blue: 79},
    { hex: "#000000", name: "Black", cat: "Blacks", red: 0, green: 0, blue: 0},
  ];
  colors.crayola = [
    { hex: "#EFDECD", name: "Almond", red: 239, green: 222, blue: 205 },
    { hex: "#CD9575", name: "Antique Brass", red: 205, green: 149, blue: 117 },
    { hex: "#FDD9B5", name: "Apricot", red: 253, green: 217, blue: 181 },
    { hex: "#78DBE2", name: "Aquamarine", red: 120, green: 219, blue: 226 },
    { hex: "#87A96B", name: "Asparagus", red: 135, green: 169, blue: 107 },
    { hex: "#FFA474", name: "Atomic Tangerine", red: 255, green: 164, blue: 116 },
    { hex: "#FAE7B5", name: "Banana Mania", red: 250, green: 231, blue: 181 },
    { hex: "#9F8170", name: "Beaver", red: 159, green: 129, blue: 112 },
    { hex: "#FD7C6E", name: "Bittersweet", red: 253, green: 124, blue: 110 },
    { hex: "#000000", name: "Black", red: 0, green: 0, blue: 0 },
    { hex: "#ACE5EE", name: "Blizzard Blue", red: 172, green: 229, blue: 238 },
    { hex: "#1F75FE", name: "Blue", red: 31, green: 117, blue: 254 },
    { hex: "#A2A2D0", name: "Blue Bell", red: 162, green: 162, blue: 208 },
    { hex: "#6699CC", name: "Blue Gray", red: 102, green: 153, blue: 204 },
    { hex: "#0D98BA", name: "Blue Green", red: 13, green: 152, blue: 186 },
    { hex: "#7366BD", name: "Blue Violet", red: 115, green: 102, blue: 189 },
    { hex: "#DE5D83", name: "Blush", red: 222, green: 93, blue: 131 },
    { hex: "#CB4154", name: "Brick Red", red: 203, green: 65, blue: 84 },
    { hex: "#B4674D", name: "Brown", red: 180, green: 103, blue: 77 },
    { hex: "#FF7F49", name: "Burnt Orange", red: 255, green: 127, blue: 73 },
    { hex: "#EA7E5D", name: "Burnt Sienna", red: 234, green: 126, blue: 93 },
    { hex: "#B0B7C6", name: "Cadet Blue", red: 176, green: 183, blue: 198 },
    { hex: "#FFFF99", name: "Canary", red: 255, green: 255, blue: 153 },
    { hex: "#1CD3A2", name: "Caribbean Green", red: 28, green: 211, blue: 162 },
    { hex: "#FFAACC", name: "Carnation Pink", red: 255, green: 170, blue: 204 },
    { hex: "#DD4492", name: "Cerise", red: 221, green: 68, blue: 146 },
    { hex: "#1DACD6", name: "Cerulean", red: 29, green: 172, blue: 214 },
    { hex: "#BC5D58", name: "Chestnut", red: 188, green: 93, blue: 88 },
    { hex: "#DD9475", name: "Copper", red: 221, green: 148, blue: 117 },
    { hex: "#9ACEEB", name: "Cornflower", red: 154, green: 206, blue: 235 },
    { hex: "#FFBCD9", name: "Cotton Candy", red: 255, green: 188, blue: 217 },
    { hex: "#FDDB6D", name: "Dandelion", red: 253, green: 219, blue: 109 },
    { hex: "#2B6CC4", name: "Denim", red: 43, green: 108, blue: 196 },
    { hex: "#EFCDB8", name: "Desert Sand", red: 239, green: 205, blue: 184 },
    { hex: "#6E5160", name: "Eggplant", red: 110, green: 81, blue: 96 },
    { hex: "#CEFF1D", name: "Electric Lime", red: 206, green: 255, blue: 29 },
    { hex: "#71BC78", name: "Fern", red: 113, green: 188, blue: 120 },
    { hex: "#6DAE81", name: "Forest Green", red: 109, green: 174, blue: 129 },
    { hex: "#C364C5", name: "Fuchsia", red: 195, green: 100, blue: 197 },
    { hex: "#CC6666", name: "Fuzzy Wuzzy", red: 204, green: 102, blue: 102 },
    { hex: "#E7C697", name: "Gold", red: 231, green: 198, blue: 151 },
    { hex: "#FCD975", name: "Goldenrod", red: 252, green: 217, blue: 117 },
    { hex: "#A8E4A0", name: "Granny Smith Apple", red: 168, green: 228, blue: 160 },
    { hex: "#95918C", name: "Gray", red: 149, green: 145, blue: 140 },
    { hex: "#1CAC78", name: "Green", red: 28, green: 172, blue: 120 },
    { hex: "#1164B4", name: "Green Blue", red: 17, green: 100, blue: 180 },
    { hex: "#F0E891", name: "Green Yellow", red: 240, green: 232, blue: 145 },
    { hex: "#FF1DCE", name: "Hot Magenta", red: 255, green: 29, blue: 206 },
    { hex: "#B2EC5D", name: "Inchworm", red: 178, green: 236, blue: 93 },
    { hex: "#5D76CB", name: "Indigo", red: 93, green: 118, blue: 203 },
    { hex: "#CA3767", name: "Jazzberry Jam", red: 202, green: 55, blue: 103 },
    { hex: "#3BB08F", name: "Jungle Green", red: 59, green: 176, blue: 143 },
    { hex: "#FEFE22", name: "Laser Lemon", red: 254, green: 254, blue: 34 },
    { hex: "#FCB4D5", name: "Lavender", red: 252, green: 180, blue: 213 },
    { hex: "#FFF44F", name: "Lemon Yellow", red: 255, green: 244, blue: 79 },
    { hex: "#FFBD88", name: "Macaroni and Cheese", red: 255, green: 189, blue: 136 },
    { hex: "#F664AF", name: "Magenta", red: 246, green: 100, blue: 175 },
    { hex: "#AAF0D1", name: "Magic Mint", red: 170, green: 240, blue: 209 },
    { hex: "#CD4A4C", name: "Mahogany", red: 205, green: 74, blue: 76 },
    { hex: "#EDD19C", name: "Maize", red: 237, green: 209, blue: 156 },
    { hex: "#979AAA", name: "Manatee", red: 151, green: 154, blue: 170 },
    { hex: "#FF8243", name: "Mango Tango", red: 255, green: 130, blue: 67 },
    { hex: "#C8385A", name: "Maroon", red: 200, green: 56, blue: 90 },
    { hex: "#EF98AA", name: "Mauvelous", red: 239, green: 152, blue: 170 },
    { hex: "#FDBCB4", name: "Melon", red: 253, green: 188, blue: 180 },
    { hex: "#1A4876", name: "Midnight Blue", red: 26, green: 72, blue: 118 },
    { hex: "#30BA8F", name: "Mountain Meadow", red: 48, green: 186, blue: 143 },
    { hex: "#C54B8C", name: "Mulberry", red: 197, green: 75, blue: 140 },
    { hex: "#1974D2", name: "Navy Blue", red: 25, green: 116, blue: 210 },
    { hex: "#FFA343", name: "Neon Carrot", red: 255, green: 163, blue: 67 },
    { hex: "#BAB86C", name: "Olive Green", red: 186, green: 184, blue: 108 },
    { hex: "#FF7538", name: "Orange", red: 255, green: 117, blue: 56 },
    { hex: "#FF2B2B", name: "Orange Red", red: 255, green: 43, blue: 43 },
    { hex: "#F8D568", name: "Orange Yellow", red: 248, green: 213, blue: 104 },
    { hex: "#E6A8D7", name: "Orchid", red: 230, green: 168, blue: 215 },
    { hex: "#414A4C", name: "Outer Space", red: 65, green: 74, blue: 76 },
    { hex: "#FF6E4A", name: "Outrageous Orange", red: 255, green: 110, blue: 74 },
    { hex: "#1CA9C9", name: "Pacific Blue", red: 28, green: 169, blue: 201 },
    { hex: "#FFCFAB", name: "Peach", red: 255, green: 207, blue: 171 },
    { hex: "#C5D0E6", name: "Periwinkle", red: 197, green: 208, blue: 230 },
    { hex: "#FDDDE6", name: "Piggy Pink", red: 253, green: 221, blue: 230 },
    { hex: "#158078", name: "Pine Green", red: 21, green: 128, blue: 120 },
    { hex: "#FC74FD", name: "Pink Flamingo", red: 252, green: 116, blue: 253 },
    { hex: "#F78FA7", name: "Pink Sherbet", red: 247, green: 143, blue: 167 },
    { hex: "#8E4585", name: "Plum", red: 142, green: 69, blue: 133 },
    { hex: "#7442C8", name: "Purple Heart", red: 116, green: 66, blue: 200 },
    { hex: "#9D81BA", name: "Purple Mountain's Majesty", red: 157, green: 129, blue: 186 },
    { hex: "#FE4EDA", name: "Purple Pizzazz", red: 254, green: 78, blue: 218 },
    { hex: "#FF496C", name: "Radical Red", red: 255, green: 73, blue: 108 },
    { hex: "#D68A59", name: "Raw Sienna", red: 214, green: 138, blue: 89 },
    { hex: "#714B23", name: "Raw Umber", red: 113, green: 75, blue: 35 },
    { hex: "#FF48D0", name: "Razzle Dazzle Rose", red: 255, green: 72, blue: 208 },
    { hex: "#E3256B", name: "Razzmatazz", red: 227, green: 37, blue: 107 },
    { hex: "#EE204D", name: "Red", red: 238, green: 32, blue: 77 },
    { hex: "#FF5349", name: "Red Orange", red: 255, green: 83, blue: 73 },
    { hex: "#C0448F", name: "Red Violet", red: 192, green: 68, blue: 143 },
    { hex: "#1FCECB", name: "Robin's Egg Blue", red: 31, green: 206, blue: 203 },
    { hex: "#7851A9", name: "Royal Purple", red: 120, green: 81, blue: 169 },
    { hex: "#FF9BAA", name: "Salmon", red: 255, green: 155, blue: 170 },
    { hex: "#FC2847", name: "Scarlet", red: 252, green: 40, blue: 71 },
    { hex: "#76FF7A", name: "Screamin' Green", red: 118, green: 255, blue: 122 },
    { hex: "#9FE2BF", name: "Sea Green", red: 159, green: 226, blue: 191 },
    { hex: "#A5694F", name: "Sepia", red: 165, green: 105, blue: 79 },
    { hex: "#8A795D", name: "Shadow", red: 138, green: 121, blue: 93 },
    { hex: "#45CEA2", name: "Shamrock", red: 69, green: 206, blue: 162 },
    { hex: "#FB7EFD", name: "Shocking Pink", red: 251, green: 126, blue: 253 },
    { hex: "#CDC5C2", name: "Silver", red: 205, green: 197, blue: 194 },
    { hex: "#80DAEB", name: "Sky Blue", red: 128, green: 218, blue: 235 },
    { hex: "#ECEABE", name: "Spring Green", red: 236, green: 234, blue: 190 },
    { hex: "#FFCF48", name: "Sunglow", red: 255, green: 207, blue: 72 },
    { hex: "#FD5E53", name: "Sunset Orange", red: 253, green: 94, blue: 83 },
    { hex: "#FAA76C", name: "Tan", red: 250, green: 167, blue: 108 },
    { hex: "#18A7B5", name: "Teal Blue", red: 24, green: 167, blue: 181 },
    { hex: "#EBC7DF", name: "Thistle", red: 235, green: 199, blue: 223 },
    { hex: "#FC89AC", name: "Tickle Me Pink", red: 252, green: 137, blue: 172 },
    { hex: "#DBD7D2", name: "Timberwolf", red: 219, green: 215, blue: 210 },
    { hex: "#17806D", name: "Tropical Rain Forest", red: 23, green: 128, blue: 109 },
    { hex: "#DEAA88", name: "Tumbleweed", red: 222, green: 170, blue: 136 },
    { hex: "#77DDE7", name: "Turquoise Blue", red: 119, green: 221, blue: 231 },
    { hex: "#FFFF66", name: "Unmellow Yellow", red: 255, green: 255, blue: 102 },
    { hex: "#926EAE", name: "Violet (Purple)", red: 146, green: 110, blue: 174 },
    { hex: "#324AB2", name: "Violet Blue", red: 50, green: 74, blue: 178 },
    { hex: "#F75394", name: "Violet Red", red: 247, green: 83, blue: 148 },
    { hex: "#FFA089", name: "Vivid Tangerine", red: 255, green: 160, blue: 137 },
    { hex: "#8F509D", name: "Vivid Violet", red: 143, green: 80, blue: 157 },
    { hex: "#FFFFFF", name: "White", red: 255, green: 255, blue: 255 },
    { hex: "#A2ADD0", name: "Wild Blue Yonder", red: 162, green: 173, blue: 208 },
    { hex: "#FF43A4", name: "Wild Strawberry", red: 255, green: 67, blue: 164 },
    { hex: "#FC6C85", name: "Wild Watermelon", red: 252, green: 108, blue: 133 },
    { hex: "#CDA4DE", name: "Wisteria", red: 205, green: 164, blue: 222 },
    { hex: "#FCE883", name: "Yellow", red: 252, green: 232, blue: 131 },
    { hex: "#C5E384", name: "Yellow Green", red: 197, green: 227, blue: 132 },
    { hex: "#FFAE42", name: "Yellow Orange", red: 255, green: 174, blue: 66 }
  ];

  colors.reducer = function(acc, val) {
    var o = { [val.name]: val.hex };
    return Object.assign(acc, o);
  };
  colors.nearest = {
    html: nearestColor.from(
      colors.html.reduce(colors.reducer, {})
    ),
    crayola: nearestColor.from(
      colors.crayola.reduce(colors.reducer, {})
    )
  };
  return colors;
}
function getCommonNames() {
  var xhr = new XMLHttpRequest()
  var colors = [];

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      namedColors.common = JSON.parse(xhr.response);
      namedColors.common = namedColors.common.concat(config.customColors);
      namedColors.nearest.common = nearestColor.from(
        namedColors.common.reduce((o, { name, hex }) => Object.assign(o, { [name]: hex }), {})
      );
      UpdateUI(red);
      updateConversions();
    } else {
      console.log('The request failed!');
    }
  }

  xhr.open('GET', 'https://unpkg.com/color-name-list@4.8.0/dist/colornames.json');
  xhr.send();
}
// Drop Zone stuff
function initDropzone() {
  window.addEventListener("drop",function(e){
    e = e || event;
    e.preventDefault();
  },false);
  window.addEventListener("dragover", function(ev) {
    // Make sure pane is open
    var pane = document.getElementById("pane-tools");
    if (!pane.checked) pane.checked = true;
    // Make sure tab is open
    var tab = document.getElementById("tab-image");
    if (!tab.checked) tab.click();
    // Scroll to top
    window.scrollTo(0,0);
    // Prevent Default.
    ev.preventDefault();
  });
}
function handleDrop(ev) {
  ev.preventDefault();
  ev.srcElement.classList.remove("over");
  var file = ev.dataTransfer.files[0];
  if (file == null) return;
  // console.log(file);
  loadFile(file);
}
function handleDragover(ev) {
  ev.preventDefault();
  ev.srcElement.classList.add("over");
}
function handleDragleave(ev) {
  ev.preventDefault();
  ev.srcElement.classList.remove("over");
}
function handleFileSelect(ev) {
  var files = evt.dataTransfer.files;
  console.log("handleFileSelect fired");
}
function loadFile(file) {
    var reader = new FileReader();
  reader.onload = function(e) {
    var imgURI = e.target.result;
    var dropzone = document.getElementsByClassName("dropzone")[0];
    dropzone.classList.add("hasImage");
    var canvas = dropzone.querySelector(".thumbnail canvas");
    var ctx = canvas.getContext("2d");
    var image = new Image;
    var out = "";
    image.addEventListener("load", function() {
      // Vibrant.js
      Vibrant.from(image).getPalette().then(function(palette) {
        var swatchList = ["Vibrant","Muted", "LightVibrant","LightMuted", "DarkVibrant","DarkMuted"]
        swatchList.forEach(function(swatch){
          if (palette.hasOwnProperty(swatch) && palette[swatch]) {
            out += "<label>" + swatch + "</label>";
            out += "<div class='swatch'><div class='fill' style='background-color:"+ palette[swatch].getHex() +"' title='Click to add color to the pallette' aria-label='Click to add color to the pallette'>&nbsp;</div></div>"
          }
        });
        thumbnailDetails.innerHTML = out;
      });

      // Color Thief
      var colorThief = new ColorThief();
      var ctPalette = colorThief.getPalette(image, 6);
      ctPalette.forEach(function(swatch, index) {
        out += "<label>Other " + (index+1) + "</label>";
        out += "<div class='swatch'><div class='fill' style='background-color:rgb("+ swatch[0] +", "+ swatch[1] +", "+ swatch[2] +")'>&nbsp;</div></div>";
        // return { red: swatch[0], green: swatch[1], blue: swatch[2],
        //         string: "rgb("+ swatch[0] +", "+ swatch[1] +", "+ swatch[2] +")" }
      })

      //
      thumbnailDetails.addEventListener("click", function(ev) {
        if (ev.srcElement) {
          palette.addSwatch(util.stringToRGB(ev.srcElement.style.backgroundColor));
        }
      });

      // console.log(ctPalette);
      var dw = 0, dh = 0;
      // Resize image to fit
      var max = config.maxImageDim;
      if ((image.width > max) || (image.height > max)) {
        var ratio = (image.width > image.height)
          ? (max / image.width)
          : (max / image.height);
        dw = parseInt(image.width * ratio);
        dh = parseInt(image.height * ratio);

        canvas.width = dw;
        canvas.height = dh;
      } else {
        canvas.width = image.width;
        canvas.height = image.height;
      }
      // Draw out the treated image
      ctx.drawImage(image, 0, 0, dw, dh);
    });
    image.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
// Image Canvas stuff
var edColor;
function initCanvas() {
  var canvas = document.querySelector(".dropzone .thumbnail canvas");
  var eyedropper = document.getElementById("eyedropper");
  // Update eye dropper on hover
  canvas.addEventListener("mousemove", handleHover);
  canvas.addEventListener("click", function(ev) {
    handleHover(ev);
    console.log("Canvas clicked");
    console.log(edColor);
    palette.addSwatch(edColor);
  });
}
function handleHover(ev) {
    // console.log("Canvas is being hovered.");
    // console.log(ev);
    var canvas = ev.srcElement;
    // Position Eye Dropper span
    eyedropper.style.left = (ev.clientX + 24 ) + "px";
    eyedropper.style.top = (ev.clientY - 24) + "px";
    // update Eye Dropper span background
    /// Get color
    var x = parseInt(ev.offsetX);
    var y = parseInt(ev.offsetY);
    var imgData = canvas.getContext("2d").getImageData(x, y, 1, 1);

    // console.log("Offset: " + x + " x " + y);

    var rgba = {
      red:   imgData.data[0],
      green: imgData.data[1],
      blue:  imgData.data[2],
      alpha: imgData.data[3]
    }
    edColor = rgba;
    /// Set color
    eyedropper.style.backgroundColor = util.getRGBStrO(rgba);
  }

// Click Copy
function initClickCopy() {
  var els = document.getElementsByClassName("clickCopy");
  for (var i=0; i < els.length; i++) {
    var el = els[i];
    // console.log(el);
    el.setAttribute("data-content", "Click to copy");
    el.addEventListener("click", handleClick);

    function handleClick(ev) {
      var el = ev.srcElement;
      copyToClipboard(el.innerText);
      el.setAttribute("data-content", "Copied!");
      el.classList.add("stay");
      setTimeout(function() {
        el.setAttribute("data-content", "Click to copy");
        ev.srcElement.classList.remove("stay");
      }, 3000);
    }
  }
}
function copyToClipboard (str) {
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

function initTheme() {
  var colors = { fg:"", bg:"", a1:"", a2:""};
  var fg = document.getElementById("foregroundSwatch");
  var bg = document.getElementById("backgroundSwatch");
  var a1 = document.getElementById("accent1Swatch");
  var a2 = document.getElementById("accent2Swatch");
  var objs = [fg,bg,a1,a2];
  for (var i = 0; i < objs.length; i++) {
    var el = objs[i];
    var name = Object.keys(colors)[i];
    var color = palette.fills[i+1].style.backgroundColor;
    // Assign fills
    el.fill = el.getElementsByClassName("fill")[0];
    el.title = "Click to set to Current Color";
    el.setAttribute("aria-label", el.title);
    el.setAttribute("data-type", name);
    // Set initial colors to first 4 palette colors
    updateSwatch (el, name, color);
    el.addEventListener("click", function(ev) {
      var el = ev.currentTarget;
      var name = el.getAttribute("data-type");
      updateSwatch(el, name, palette.currentColor.toHexString())
    });
  }
  // Functions
  function updateSwatch(swatch, name, color) {
    colors[name] = swatch.fill.style.backgroundColor = color;
    updatePreview();
    updateContrast();
  }

  function updatePreview() {
    var preview = document.getElementById("preview");
    var h1 = preview.getElementsByTagName("H1")[0];
    var hr = preview.getElementsByTagName("HR")[0];

    preview.style.color = colors.fg;
    preview.style.backgroundColor = colors.bg;
    preview.style.borderColor = colors.a1;
    hr.style.color = colors.a2;
    hr.style.backgroundColor = colors.a2;
  }

  function updateContrast() {
    var wrapper = document.getElementById("contrast");
    var table = document.getElementById("contrastTable");

    var c1 = util.getContrast(colors.fg, colors.bg);
    var c2 = util.getContrast(colors.fg, colors.a1);
    var c3 = util.getContrast(colors.fg, colors.a2);
    var c4 = util.getContrast(colors.a1, colors.bg);
    var c5 = util.getContrast(colors.a2, colors.bg);

    var c1Cell = table.querySelector("#contrastTable > tbody > tr:nth-child(1) > td:nth-child(2)");
    var c2Cell = table.querySelector("#contrastTable > tbody > tr:nth-child(1) > td:nth-child(3)");
    var c3Cell = table.querySelector("#contrastTable > tbody > tr:nth-child(1) > td:nth-child(4)");
    var c4Cell = table.querySelector("#contrastTable > tbody > tr:nth-child(1) > td:nth-child(5)");
    var c5Cell = table.querySelector("#contrastTable > tbody > tr:nth-child(1) > td:nth-child(6)");
    // Update Contrast cells
    c1Cell.innerText = c1 + ":1";
    c2Cell.innerText = c2 + ":1";
    c3Cell.innerText = c3 + ":1";
    c4Cell.innerText = c4 + ":1";
    c5Cell.innerText = c5 + ":1";
    // Update Pass \ Fail cells
    var els = {
      c1: c1,
      c2: c2,
      c3: c3,
      c4: c4,
      c5: c5,
      c1ntAA: document.getElementById("c1ntAA"),
      c1ntAAA: document.getElementById("c1ntAAA"),
      c1ltAA: document.getElementById("c1ltAA"),
      c1ltAAA: document.getElementById("c1ltAAA"),
      c1ltAAA: document.getElementById("c1ltAAA"),
      c1ge: document.getElementById("c1ge"),
      c2ntAA: document.getElementById("c2ntAA"),
      c2ntAAA: document.getElementById("c2ntAAA"),
      c2ltAA: document.getElementById("c2ltAA"),
      c2ltAAA: document.getElementById("c2ltAAA"),
      c2ltAAA: document.getElementById("c2ltAAA"),
      c2ge: document.getElementById("c2ge"),
      c3ntAA: document.getElementById("c3ntAA"),
      c3ntAAA: document.getElementById("c3ntAAA"),
      c3ltAA: document.getElementById("c3ltAA"),
      c3ltAAA: document.getElementById("c3ltAAA"),
      c3ltAAA: document.getElementById("c3ltAAA"),
      c3ge: document.getElementById("c3ge"),
      c4ntAA: document.getElementById("c4ntAA"),
      c4ntAAA: document.getElementById("c4ntAAA"),
      c4ltAA: document.getElementById("c4ltAA"),
      c4ltAAA: document.getElementById("c4ltAAA"),
      c4ltAAA: document.getElementById("c4ltAAA"),
      c4ge: document.getElementById("c4ge"),
      c5ntAA: document.getElementById("c5ntAA"),
      c5ntAAA: document.getElementById("c5ntAAA"),
      c5ltAA: document.getElementById("c5ltAA"),
      c5ltAAA: document.getElementById("c5ltAAA"),
      c5ltAAA: document.getElementById("c5ltAAA"),
      c5ge: document.getElementById("c5ge"),
    }

    for (var i = 1; i <= 5; i++) {
      var ntAA = els["c"+i+"ntAA"];
      var ntAAA = els["c"+i+"ntAAA"];
      var ltAA = els["c"+i+"ltAA"];
      var ltAAA = els["c"+i+"ltAAA"];
      var ge = els["c"+i+"ge"];
      var contrast = els["c"+i];
      // Set messages
      var passMsg = "Pass";
      var failMsg = "Fail";

      function formatMsg(msg) {
        var icon = (msg == passMsg) ? "check" : "times";
        return "<span class=\"" + msg.toLowerCase() + "\"><i class=\"fas fa-" + icon + "\"></i> " + msg + "</span>";
      }
      // Get and assign messages per contrast threshold
      ltAA.innerHTML = ge.innerHTML = formatMsg((contrast >= 3.1) ? passMsg : failMsg);
      ntAA.innerHTML = ltAAA.innerHTML = formatMsg((contrast >= 4.5) ? passMsg : failMsg);
      ntAAA.innerHTML = formatMsg((contrast >= 7.1) ? passMsg : failMsg);
    }
  }
}