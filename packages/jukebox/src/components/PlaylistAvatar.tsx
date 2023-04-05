import type { AvatarProps} from "@mui/material";
import { Avatar, styled } from "@mui/material";
import _ from "lodash";
import { useMemo } from "react";

/**
 * UI gradients hand picked for use under white text.
 * @by UIGradients contributors (https://github.com/ghosh/uiGradients)
 * @license MIT
 */
const gradients = [
  { name: "Omolon", colors: ["#091E3A", "#2F80ED", "#2D9EE0"] },
  {
    name: "Farhan",
    colors: ["#9400D3", "#4B0082"],
  },
  { name: "Purple", colors: ["#c84e89", "#F15F79"] },
  {
    name: "From Ice To Fire",
    colors: ["#72C6EF", "#004E8F"],
  },
  { name: "Purple Dream", colors: ["#bf5ae0", "#a811da"] },
  {
    name: "Blu",
    colors: ["#00416A", "#E4E5E6"],
  },
  { name: "Ver", colors: ["#FFE000", "#799F0C"] },
  {
    name: "Anwar",
    colors: ["#334d50", "#cbcaa5"],
  },
  { name: "Bluelagoo", colors: ["#0052D4", "#4364F7", "#6FB1FC"] },
  {
    name: "Reaqua",
    colors: ["#799F0C", "#ACBB78"],
  },
  { name: "Royal Blue", colors: ["#536976", "#292E49"] },
  {
    name: "Royal Blue + Petrol",
    colors: ["#BBD2C5", "#536976", "#292E49"],
  },
  { name: "Copper", colors: ["#B79891", "#94716B"] },
  {
    name: "Petrol",
    colors: ["#BBD2C5", "#536976"],
  },
  { name: "Sel", colors: ["#00467F", "#A5CC82"] },
  {
    name: "Afternoon",
    colors: ["#000C40", "#607D8B"],
  },
  { name: "Skyline", colors: ["#1488CC", "#2B32B2"] },
  {
    name: "DIMIGO",
    colors: ["#ec008c", "#fc6767"],
  },
  { name: "Purple Love", colors: ["#cc2b5e", "#753a88"] },
  {
    name: "Sexy Blue",
    colors: ["#2193b0", "#6dd5ed"],
  },
  { name: "Blooker20", colors: ["#e65c00", "#F9D423"] },
  {
    name: "Sea Blue",
    colors: ["#2b5876", "#4e4376"],
  },
  { name: "Nimvelo", colors: ["#314755", "#26a0da"] },
  {
    name: "YouTube",
    colors: ["#e52d27", "#b31217"],
  },
  { name: "Cool Brown", colors: ["#603813", "#b29f94"] },
  {
    name: "Harmonic Energy",
    colors: ["#16A085", "#F4D03F"],
  },
  { name: "Playing with Reds", colors: ["#D31027", "#EA384D"] },
  {
    name: "Green Beach",
    colors: ["#02AAB0", "#00CDAC"],
  },
  { name: "Intuitive Purple", colors: ["#DA22FF", "#9733EE"] },
  {
    name: "Emerald Water",
    colors: ["#348F50", "#56B4D3"],
  },
  { name: "Lemon Twist", colors: ["#3CA55C", "#B5AC49"] },
  {
    name: "Horizon",
    colors: ["#003973", "#E5E5BE"],
  },
  { name: "Frozen", colors: ["#403B4A", "#E7E9BB"] },
  {
    name: "Mango Pulp",
    colors: ["#F09819", "#EDDE5D"],
  },
  { name: "Bloody Mary", colors: ["#FF512F", "#DD2476"] },
  {
    name: "Aubergine",
    colors: ["#AA076B", "#61045F"],
  },
  { name: "Aqua Marine", colors: ["#1A2980", "#26D0CE"] },
  {
    name: "Sunrise",
    colors: ["#FF512F", "#F09819"],
  },
  { name: "Purple Paradise", colors: ["#1D2B64", "#F8CDDA"] },
  {
    name: "Sea Weed",
    colors: ["#4CB8C4", "#3CD3AD"],
  },
  { name: "Pinky", colors: ["#DD5E89", "#F7BB97"] },
  {
    name: "Cherry",
    colors: ["#EB3349", "#F45C43"],
  },
  { name: "Mojito", colors: ["#1D976C", "#93F9B9"] },
  {
    name: "Juicy Orange",
    colors: ["#FF8008", "#FFC837"],
  },
  { name: "Mirage", colors: ["#16222A", "#3A6073"] },
  {
    name: "Steel Gray",
    colors: ["#1F1C2C", "#928DAB"],
  },
  { name: "Kashmir", colors: ["#614385", "#516395"] },
  {
    name: "Electric Violet",
    colors: ["#4776E6", "#8E54E9"],
  },
  { name: "Venice Blue", colors: ["#085078", "#85D8CE"] },
  {
    name: "Moss",
    colors: ["#134E5E", "#71B280"],
  },
  { name: "Shroom Haze", colors: ["#5C258D", "#4389A2"] },
  {
    name: "Mystic",
    colors: ["#757F9A", "#D7DDE8"],
  },
  { name: "Midnight City", colors: ["#232526", "#414345"] },
  {
    name: "Titanium",
    colors: ["#283048", "#859398"],
  },
  { name: "Mantle", colors: ["#24C6DC", "#514A9D"] },
  {
    name: "Dracula",
    colors: ["#DC2424", "#4A569D"],
  },
  { name: "Peach", colors: ["#ED4264", "#FFEDBC"] },
  {
    name: "Stellar",
    colors: ["#7474BF", "#348AC7"],
  },
  { name: "Bourbon", colors: ["#EC6F66", "#F3A183"] },
  {
    name: "Calm Darya",
    colors: ["#5f2c82", "#49a09d"],
  },
  { name: "Influenza", colors: ["#C04848", "#480048"] },
  {
    name: "Shrimpy",
    colors: ["#e43a15", "#e65245"],
  },
  { name: "Army", colors: ["#414d0b", "#727a17"] },
  {
    name: "Pinot Noir",
    colors: ["#4b6cb7", "#182848"],
  },
  { name: "Day Tripper", colors: ["#f857a6", "#ff5858"] },
  {
    name: "Namn",
    colors: ["#a73737", "#7a2828"],
  },
  { name: "Blurry Beach", colors: ["#d53369", "#cbad6d"] },
  {
    name: "Vasily",
    colors: ["#e9d362", "#333333"],
  },
  { name: "A Lost Memory", colors: ["#DE6262", "#FFB88C"] },
  {
    name: "Petrichor",
    colors: ["#666600", "#999966"],
  },
  { name: "Kyoto", colors: ["#c21500", "#ffc500"] },
  {
    name: "Misty Meadow",
    colors: ["#215f00", "#e4e4d9"],
  },
  { name: "Moor", colors: ["#616161", "#9bc5c3"] },
  {
    name: "Forever Lost",
    colors: ["#5D4157", "#A8CABA"],
  },
  { name: "Winter", colors: ["#E6DADA", "#274046"] },
  {
    name: "Nelson",
    colors: ["#f2709c", "#ff9472"],
  },
  { name: "Reef", colors: ["#00d2ff", "#3a7bd5"] },
  {
    name: "The Strain",
    colors: ["#870000", "#190A05"],
  },
  { name: "Dirty Fog", colors: ["#B993D6", "#8CA6DB"] },
  {
    name: "Earthly",
    colors: ["#649173", "#DBD5A4"],
  },
  { name: "Ash", colors: ["#606c88", "#3f4c6b"] },
  {
    name: "Cherryblossoms",
    colors: ["#FBD3E9", "#BB377D"],
  },
  { name: "Parklife", colors: ["#ADD100", "#7B920A"] },
  {
    name: "Dance To Forget",
    colors: ["#FF4E50", "#F9D423"],
  },
  { name: "Starfall", colors: ["#F0C27B", "#4B1248"] },
  {
    name: "Red Mist",
    colors: ["#000000", "#e74c3c"],
  },
  { name: "Man of Steel", colors: ["#780206", "#061161"] },
  {
    name: "Amethyst",
    colors: ["#9D50BB", "#6E48AA"],
  },
  { name: "Cheer Up Emo Kid", colors: ["#556270", "#FF6B6B"] },
  {
    name: "Facebook Messenger",
    colors: ["#00c6ff", "#0072ff"],
  },
  { name: "SoundCloud", colors: ["#fe8c00", "#f83600"] },
  {
    name: "Behongo",
    colors: ["#52c234", "#061700"],
  },
  { name: "ServQuick", colors: ["#485563", "#29323c"] },
  {
    name: "Between The Clouds",
    colors: ["#73C8A9", "#373B44"],
  },
  { name: "Crazy Orange I", colors: ["#D38312", "#A83279"] },
  {
    name: "Hersheys",
    colors: ["#1e130c", "#9a8478"],
  },
  { name: "Talking To Mice Elf", colors: ["#948E99", "#2E1437"] },
  {
    name: "Purple Bliss",
    colors: ["#360033", "#0b8793"],
  },
  { name: "Predawn", colors: ["#FFA17F", "#00223E"] },
  {
    name: "Endless River",
    colors: ["#43cea2", "#185a9d"],
  },
  { name: "Twitch", colors: ["#6441A5", "#2a0845"] },
  {
    name: "Atlas",
    colors: ["#FEAC5E", "#C779D0", "#4BC0C8"],
  },
  { name: "Instagram", colors: ["#833ab4", "#fd1d1d", "#fcb045"] },
  {
    name: "Flickr",
    colors: ["#ff0084", "#33001b"],
  },
  { name: "Vine", colors: ["#00bf8f", "#001510"] },
  {
    name: "Turquoise flow",
    colors: ["#136a8a", "#267871"],
  },
  { name: "Virgin America", colors: ["#7b4397", "#dc2430"] },
  {
    name: "Koko Caramel",
    colors: ["#D1913C", "#FFD194"],
  },
  { name: "Green to dark", colors: ["#6A9113", "#141517"] },
  {
    name: "Curiosity blue",
    colors: ["#525252", "#3d72b4"],
  },
  { name: "Dark Knight", colors: ["#BA8B02", "#181818"] },
  {
    name: "Lizard",
    colors: ["#304352", "#d7d2cc"],
  },
  { name: "Sage Persuasion", colors: ["#CCCCB2", "#757519"] },
  {
    name: "Between Night and Day",
    colors: ["#2c3e50", "#3498db"],
  },
  { name: "Timber", colors: ["#fc00ff", "#00dbde"] },
  {
    name: "Passion",
    colors: ["#e53935", "#e35d5b"],
  },
  { name: "Clear Sky", colors: ["#005C97", "#363795"] },
  {
    name: "Master Card",
    colors: ["#f46b45", "#eea849"],
  },
  { name: "Deep Purple", colors: ["#673AB7", "#512DA8"] },
  {
    name: "Little Leaf",
    colors: ["#76b852", "#8DC26F"],
  },
  { name: "Netflix", colors: ["#8E0E00", "#1F1C18"] },
  {
    name: "Light Orange",
    colors: ["#FFB75E", "#ED8F03"],
  },
  { name: "Poncho", colors: ["#403A3E", "#BE5869"] },
  {
    name: "Back to the Future",
    colors: ["#C02425", "#F0CB35"],
  },
  { name: "Blush", colors: ["#B24592", "#F15F79"] },
  {
    name: "Inbox",
    colors: ["#457fca", "#5691c8"],
  },
  { name: "Purplin", colors: ["#6a3093", "#a044ff"] },
  {
    name: "Pale Wood",
    colors: ["#eacda3", "#d6ae7b"],
  },
  { name: "Haikus", colors: ["#fd746c", "#ff9068"] },
  {
    name: "Pizelex",
    colors: ["#114357", "#F29492"],
  },
  { name: "Joomla", colors: ["#1e3c72", "#2a5298"] },
  {
    name: "Miami Dolphins",
    colors: ["#4DA0B0", "#D39D38"],
  },
  { name: "Forest", colors: ["#5A3F37", "#2C7744"] },
  {
    name: "Nighthawk",
    colors: ["#2980b9", "#2c3e50"],
  },
  { name: "Suzy", colors: ["#834d9b", "#d04ed6"] },
  {
    name: "Dark Skies",
    colors: ["#4B79A1", "#283E51"],
  },
  { name: "Deep Space", colors: ["#000000", "#434343"] },
  {
    name: "Purple White",
    colors: ["#BA5370", "#F4E2D8"],
  },
  { name: "Tranquil", colors: ["#EECDA3", "#EF629F"] },
  {
    name: "Sylvia",
    colors: ["#ff4b1f", "#ff9068"],
  },
  { name: "Sweet Morning", colors: ["#FF5F6D", "#FFC371"] },
  {
    name: "Bright Vault",
    colors: ["#00d2ff", "#928DAB"],
  },
  { name: "Solid Vault", colors: ["#3a7bd5", "#3a6073"] },
  {
    name: "Sunset",
    colors: ["#0B486B", "#F56217"],
  },
  { name: "Grapefruit Sunset", colors: ["#e96443", "#904e95"] },
  {
    name: "Deep Sea Space",
    colors: ["#2C3E50", "#4CA1AF"],
  },
  { name: "Dusk", colors: ["#2C3E50", "#FD746C"] },
  {
    name: "Minimal Red",
    colors: ["#F00000", "#DC281E"],
  },
  { name: "Royal", colors: ["#141E30", "#243B55"] },
  {
    name: "Mauve",
    colors: ["#42275a", "#734b6d"],
  },
  { name: "Frost", colors: ["#000428", "#004e92"] },
  {
    name: "Lush",
    colors: ["#56ab2f", "#a8e063"],
  },
  { name: "Firewatch", colors: ["#cb2d3e", "#ef473a"] },
  {
    name: "Blood Red",
    colors: ["#f85032", "#e73827"],
  },
  { name: "IIIT Delhi", colors: ["#808080", "#3fada8"] },
  {
    name: "Jupiter",
    colors: ["#ffd89b", "#19547b"],
  },
  { name: "50 Shades of Grey", colors: ["#bdc3c7", "#2c3e50"] },
  {
    name: "Dania",
    colors: ["#BE93C5", "#7BC6CC"],
  },
  { name: "Disco", colors: ["#4ECDC4", "#556270"] },
  {
    name: "Love Couple",
    colors: ["#3a6186", "#89253e"],
  },
  { name: "Cosmic Fusion", colors: ["#ff00cc", "#333399"] },
  {
    name: "Ed's Sunset Gradient",
    colors: ["#ff7e5f", "#feb47b"],
  },
  { name: "Black Rosé", colors: ["#f4c4f3", "#fc67fa"] },
  {
    name: "80's Purple",
    colors: ["#41295a", "#2F0743"],
  },
  { name: "Radar", colors: ["#A770EF", "#CF8BF3", "#FDB99B"] },
  {
    name: "Ibiza Sunset",
    colors: ["#ee0979", "#ff6a00"],
  },
  { name: "Dawn", colors: ["#F3904F", "#3B4371"] },
  {
    name: "Mild",
    colors: ["#67B26F", "#4ca2cd"],
  },
  { name: "Vice City", colors: ["#3494E6", "#EC6EAD"] },
  {
    name: "Jaipur",
    colors: ["#DBE6F6", "#C5796D"],
  },
  { name: "Jodhpur", colors: ["#9CECFB", "#65C7F7", "#0052D4"] },
  {
    name: "Under the Lake",
    colors: ["#093028", "#237A57"],
  },
  { name: "The Blue Lagoon", colors: ["#43C6AC", "#191654"] },
  {
    name: "Can You Feel The Love Tonight",
    colors: ["#4568DC", "#B06AB3"],
  },
  { name: "Very Blue", colors: ["#0575E6", "#021B79"] },
  {
    name: "Love and Liberty",
    colors: ["#200122", "#6f0000"],
  },
  { name: "Orca", colors: ["#44A08D", "#093637"] },
  {
    name: "Venice",
    colors: ["#6190E8", "#A7BFE8"],
  },
  { name: "Pacific Dream", colors: ["#34e89e", "#0f3443"] },
  {
    name: "Learning and Leading",
    colors: ["#F7971E", "#FFD200"],
  },
  { name: "Celestial", colors: ["#C33764", "#1D2671"] },
  {
    name: "Purplepine",
    colors: ["#20002c", "#cbb4d4"],
  },
  { name: "Sha la la", colors: ["#D66D75", "#E29587"] },
  {
    name: "Html",
    colors: ["#E44D26", "#F16529"],
  },
  { name: "Coal", colors: ["#EB5757", "#000000"] },
  {
    name: "Sunkist",
    colors: ["#F2994A", "#F2C94C"],
  },
  { name: "Blue Skies", colors: ["#56CCF2", "#2F80ED"] },
  {
    name: "Chitty Chitty Bang Bang",
    colors: ["#007991", "#78ffd6"],
  },
  { name: "Visions of Grandeur", colors: ["#000046", "#1CB5E0"] },
  {
    name: "Crystal Clear",
    colors: ["#159957", "#155799"],
  },
  { name: "Mello", colors: ["#c0392b", "#8e44ad"] },
  {
    name: "Meridian",
    colors: ["#283c86", "#45a247"],
  },
  { name: "Relay", colors: ["#3A1C71", "#D76D77", "#FFAF7B"] },
  {
    name: "Alive",
    colors: ["#CB356B", "#BD3F32"],
  },
  { name: "Scooter", colors: ["#36D1DC", "#5B86E5"] },
  {
    name: "Terminal",
    colors: ["#000000", "#0f9b0f"],
  },
  { name: "Crimson Tide", colors: ["#642B73", "#C6426E"] },
  {
    name: "Socialive",
    colors: ["#06beb6", "#48b1bf"],
  },
  { name: "Kimoby Is The New Blue", colors: ["#396afc", "#2948ff"] },
  {
    name: "Purpink",
    colors: ["#7F00FF", "#E100FF"],
  },
  { name: "Orange Coral", colors: ["#ff9966", "#ff5e62"] },
  {
    name: "King Yna",
    colors: ["#1a2a6c", "#b21f1f", "#fdbb2d"],
  },
  { name: "Hydrogen", colors: ["#667db6", "#0082c8", "#0082c8", "#667db6"] },
  {
    name: "Argon",
    colors: ["#03001e", "#7303c0", "#ec38bc", "#fdeff9"],
  },
  { name: "Orange Fun", colors: ["#fc4a1a", "#f7b733"] },
  {
    name: "Rainbow Blue",
    colors: ["#00F260", "#0575E6"],
  },
  { name: "Pink Flavour", colors: ["#800080", "#ffc0cb"] },
  {
    name: "Selenium",
    colors: ["#3C3B3F", "#605C3C"],
  },
  { name: "Ohhappiness", colors: ["#00b09b", "#96c93d"] },
  {
    name: "Lawrencium",
    colors: ["#0f0c29", "#302b63", "#24243e"],
  },
  { name: "Taran Tado", colors: ["#23074d", "#cc5333"] },
  {
    name: "Bighead",
    colors: ["#c94b4b", "#4b134f"],
  },
  { name: "Sublime Vivid", colors: ["#FC466B", "#3F5EFB"] },
  {
    name: "Sublime Light",
    colors: ["#FC5C7D", "#6A82FB"],
  },
  { name: "Quepal", colors: ["#11998e", "#38ef7d"] },
  {
    name: "Sand to Blue",
    colors: ["#3E5151", "#DECBA4"],
  },
  { name: "Wedding Day Blues", colors: ["#40E0D0", "#FF8C00", "#FF0080"] },
  {
    name: "Shifter",
    colors: ["#bc4e9c", "#f80759"],
  },
  { name: "Red Sunset", colors: ["#355C7D", "#6C5B7B", "#C06C84"] },
  {
    name: "Moon Purple",
    colors: ["#4e54c8", "#8f94fb"],
  },
  { name: "Pure Lust", colors: ["#333333", "#dd1818"] },
  {
    name: "Slight Ocean View",
    colors: ["#a8c0ff", "#3f2b96"],
  },
  { name: "eXpresso", colors: ["#ad5389", "#3c1053"] },
  {
    name: "Vanusa",
    colors: ["#DA4453", "#89216B"],
  },
  { name: "Evening Night", colors: ["#005AA7", "#FFFDE4"] },
  {
    name: "Magic",
    colors: ["#59C173", "#a17fe0", "#5D26C1"],
  },
  { name: "Blue Raspberry", colors: ["#00B4DB", "#0083B0"] },
  {
    name: "Citrus Peel",
    colors: ["#FDC830", "#F37335"],
  },
  { name: "Sin City Red", colors: ["#ED213A", "#93291E"] },
  {
    name: "Wiretap",
    colors: ["#8A2387", "#E94057", "#F27121"],
  },
  { name: "Burning Orange", colors: ["#FF416C", "#FF4B2B"] },
  {
    name: "Ultra Voilet",
    colors: ["#654ea3", "#eaafc8"],
  },
  { name: "By Design", colors: ["#009FFF", "#ec2F4B"] },
  {
    name: "Kyoo Tah",
    colors: ["#544a7d", "#ffd452"],
  },
  { name: "Kye Meh", colors: ["#8360c3", "#2ebf91"] },
  {
    name: "Metapolis",
    colors: ["#659999", "#f4791f"],
  },
  { name: "Flare", colors: ["#f12711", "#f5af19"] },
  {
    name: "Witching Hour",
    colors: ["#c31432", "#240b36"],
  },
  { name: "Neuromancer", colors: ["#f953c6", "#b91d73"] },
  {
    name: "Harvey",
    colors: ["#1f4037", "#99f2c8"],
  },
  { name: "Amin", colors: ["#8E2DE2", "#4A00E0"] },
  {
    name: "Memariani",
    colors: ["#aa4b6b", "#6b6b83", "#3b8d99"],
  },
  { name: "Yoda", colors: ["#FF0099", "#493240"] },
  {
    name: "Dark Ocean",
    colors: ["#373B44", "#4286f4"],
  },
  { name: "Evening Sunshine", colors: ["#b92b27", "#1565C0"] },
  {
    name: "JShine",
    colors: ["#12c2e9", "#c471ed", "#f64f59"],
  },
  { name: "Moonlit Asteroid", colors: ["#0F2027", "#203A43", "#2C5364"] },
  {
    name: "Cool Blues",
    colors: ["#2193b0", "#6dd5ed"],
  },
  { name: "Telko", colors: ["#F36222", "#5CB644", "#007FC3"] },
  {
    name: "Zenta",
    colors: ["#2A2D3E", "#FECB6E"],
  },
  {
    name: "Under Blue Green",
    colors: ["#051937", "#004d7a", "#008793", "#00bf72", "#a8eb12"],
  },
  { name: "Lensod", colors: ["#6025F5", "#FF5555"] },
  {
    name: "Newspaper",
    colors: ["#8a2be2", "#ffa500", "#f8f8ff"],
  },
  { name: "Dark Blue Gradient", colors: ["#2774ae", "#002E5D", "#002E5D"] },
  {
    name: "Dark Blu Two",
    colors: ["#004680", "#4484BA"],
  },
  { name: "Mango Papaya", colors: ["#de8a41", "#2ada53"] },
  {
    name: "Flame",
    colors: ["#ff0000", "#fdcf58"],
  },
  { name: "Twitter", colors: ["#1DA1F2", "#009ffc"] },
  {
    name: "Blooze",
    colors: ["#6da6be", "#4b859e", "#6da6be"],
  },
  { name: "Blue Slate", colors: ["#B5B9FF", "#2B2C49"] },
  {
    name: "Space Light Green",
    colors: ["#9FA0A8", "#5C7852"],
  },
  {
    name: "Elate The Euge",
    colors: ["#8BDEDA", "43ADD0", "998EE0", "E17DC2", "EF9393"],
  },
  {
    name: "Abbas",
    colors: ["#00fff0", "#0083fe"],
  },
  { name: "Emerald Sea", colors: ["#05386b", "#5cdb95"] },
  {
    name: "Bleem",
    colors: ["#4284DB", "#29EAC4"],
  },
  { name: "Coffee Gold", colors: ["#554023", "#c99846"] },
  {
    name: "Compass",
    colors: ["#516b8b", "#056b3b"],
  },
  { name: "Andreuzza's", colors: ["#D70652", "#FF025E"] },
  {
    name: "Moonwalker",
    colors: ["#152331", "#000000"],
  },
  { name: "Hyper Blue", colors: ["#59CDE9", "#0A2A88"] },
  {
    name: "Racker",
    colors: ["#EB0000", "#95008A", "#3300FC"],
  },
  { name: "Visual Blue", colors: ["#003d4d", "#00c996"] },
];

/**
 * Create a 2 letter initial from a string;
 */
function initials(source: string): string {
  if (source.length < 3) return source.toLocaleUpperCase();
  const words = _.words(source);
  if (words.length === 0) return source.substring(0, 2).toLocaleUpperCase();
  else if (words.length === 1)
    return words[0].substring(0, 2).toLocaleUpperCase();
  else {
    return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase();
  }
}

/**
 * Hash a string into integer.
 * @by Dark Sky app (https://github.com/darkskyapp/string-hash)
 * @license CC-0
 */
function hash(str: string): number {
  let hash = 5381,
    i = str.length;
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return hash >>> 0;
}

const StyledAvatar = styled(Avatar)({
  color: "white",
});

interface Props extends AvatarProps {
  name: string;
  slug: string;
}

export default function PlaylistAvatar(props: Props) {
  const { name, slug, ...avatarProps } = props;
  const initial = useMemo(() => initials(name), [name]);
  const gradient = useMemo(
    () => gradients[hash(slug) % gradients.length].colors.join(", "),
    [slug]
  );
  return (
    <StyledAvatar
      style={{ background: `linear-gradient(135deg, ${gradient})` }}
      variant="rounded"
      {...avatarProps}
    >
      {initial}
    </StyledAvatar>
  );
}
