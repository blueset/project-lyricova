import { Resolver, Query, ObjectType, Field } from "type-graphql";
import _ from "lodash";


@ObjectType()
export class Texture {
  @Field()
  name: string;
  @Field()
  author: string;
  @Field({ nullable: true })
  authorUrl?: string;
  @Field()
  url: string;
}

const TEXTURE_DATA: Texture[] = [
  {
    "name": "3Px Tile",
    "author": "Gre3g",
    "authorUrl": "http://gre3g.livejournal.com/",
    "url": "3px-tile.png"
  },
  {
    "name": "45 Degree Fabric (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "45-degree-fabric-dark.png"
  },
  {
    "name": "45 Degree Fabric (Light)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "45-degree-fabric-light.png"
  },
  {
    "name": "60º lines",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "60-lines.png"
  },
  {
    "name": "Absurdity",
    "author": "Carlos Valdez",
    "authorUrl": "http://saveder.blogspot.mx/",
    "url": "absurdity.png"
  },
  {
    "name": "AG Square",
    "author": "Erikdel",
    "authorUrl": "http://www.erikdel.com/",
    "url": "ag-square.png"
  },
  {
    "name": "Always Grey",
    "author": "Stefan Aleksić",
    "authorUrl": "http://www.facebook.com/stefanaleksic88",
    "url": "always-grey.png"
  },
  {
    "name": "Arabesque",
    "author": "David Sanchez",
    "authorUrl": "http://www.twitter.com/davidsancar",
    "url": "arabesque.png"
  },
  {
    "name": "Arches",
    "author": "Kim Ruddock",
    "authorUrl": "http://www.webdesigncreare.co.uk/",
    "url": "arches.png"
  },
  {
    "name": "Argyle",
    "author": "Will Monson",
    "authorUrl": null,
    "url": "argyle.png"
  },
  {
    "name": "Asfalt (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "asfalt-dark.png"
  },
  {
    "name": "Asfalt (Light)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "asfalt-light.png"
  },
  {
    "name": "Assault",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "assault.png"
  },
  {
    "name": "Axiom Pattern",
    "author": "Struck Axiom",
    "authorUrl": "http://www.struckaxiom.com/",
    "url": "axiom-pattern.png"
  },
  {
    "name": "Az Subtle",
    "author": "Anli",
    "authorUrl": "http://www.azmind.com/",
    "url": "az-subtle.png"
  },
  {
    "name": "Back Pattern",
    "author": "M",
    "authorUrl": null,
    "url": "back-pattern.png"
  },
  {
    "name": "Basketball",
    "author": "Mike Hearn",
    "authorUrl": "http://www.mikehearn.com/",
    "url": "basketball.png"
  },
  {
    "name": "Batthern",
    "author": "Factorio.us Collective",
    "authorUrl": "http://factorio.us/",
    "url": "batthern.png"
  },
  {
    "name": "Bedge Grunge",
    "author": "Alex Tapein",
    "authorUrl": "http://www.tapein.com/",
    "url": "bedge-grunge.png"
  },
  {
    "name": "Beige Paper",
    "author": "Konstantin Ivanov",
    "authorUrl": "http://twitter.com/phenix_h_k",
    "url": "beige-paper.png"
  },
  {
    "name": "Billie Holiday",
    "author": "Thomas Myrman",
    "authorUrl": "http://thomasmyrman.com/",
    "url": "billie-holiday.png"
  },
  {
    "name": "Binding Dark",
    "author": "Tia Newbury",
    "authorUrl": null,
    "url": "binding-dark.png"
  },
  {
    "name": "Binding Light",
    "author": "Tia Newbury",
    "authorUrl": null,
    "url": "binding-light.png"
  },
  {
    "name": "Black Felt",
    "author": "E. van Zummeren",
    "authorUrl": "http://www.evanzummeren.com/",
    "url": "black-felt.png"
  },
  {
    "name": "Black Linen",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "black-linen.png"
  },
  {
    "name": "Black Linen 2",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "black-linen-2.png"
  },
  {
    "name": "Black Mamba",
    "author": "Federica Pelzel",
    "authorUrl": "http://about.me/federicca",
    "url": "black-mamba.png"
  },
  {
    "name": "Black Orchid",
    "author": "Hybridixstudio",
    "authorUrl": "http://www.hybridixstudio.com/",
    "url": "black-orchid.png"
  },
  {
    "name": "Black Paper",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "black-paper.png"
  },
  {
    "name": "Black Scales",
    "author": "Alex Parker",
    "authorUrl": "http://twitter.com/misterparker",
    "url": "black-scales.png"
  },
  {
    "name": "Black Thread",
    "author": "Listvetra",
    "authorUrl": "http://listvetra.ru/",
    "url": "black-thread.png"
  },
  {
    "name": "Black Thread (Light)",
    "author": "Listvetra",
    "authorUrl": "http://listvetra.ru/",
    "url": "black-thread-light.png"
  },
  {
    "name": "Black Twill",
    "author": "Cary Fleming",
    "authorUrl": null,
    "url": "black-twill.png"
  },
  {
    "name": "Blizzard",
    "author": "Alexandre Naud",
    "authorUrl": "http://www.alexandrenaud.fr/",
    "url": "blizzard.png"
  },
  {
    "name": "Blu Stripes",
    "author": "Seb Jachec",
    "authorUrl": "http://twitter.com/iamsebj",
    "url": "blu-stripes.png"
  },
  {
    "name": "Bo Play",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "bo-play.png"
  },
  {
    "name": "Brick Wall",
    "author": "Benjamin Ward",
    "authorUrl": null,
    "url": "brick-wall.png"
  },
  {
    "name": "Brick Wall (Dark)",
    "author": "Benjamin Ward",
    "authorUrl": null,
    "url": "brick-wall-dark.png"
  },
  {
    "name": "Bright Squares",
    "author": "Waseem Dahman",
    "authorUrl": "http://twitter.com/dwaseem",
    "url": "bright-squares.png"
  },
  {
    "name": "Brilliant",
    "author": "Carlos Valdez",
    "authorUrl": "http://saveder.blogspot.mx/",
    "url": "brilliant.png"
  },
  {
    "name": "Broken Noise",
    "author": "Vincent Klaiber",
    "authorUrl": "http://vincentklaiber.com/",
    "url": "broken-noise.png"
  },
  {
    "name": "Brushed Alum",
    "author": "Tim Ward",
    "authorUrl": "http://www.mentalwarddesign.com/",
    "url": "brushed-alum.png"
  },
  {
    "name": "Brushed Alum Dark",
    "author": "Tim Ward",
    "authorUrl": "http://www.mentalwarddesign.com/",
    "url": "brushed-alum-dark.png"
  },
  {
    "name": "Buried",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "buried.png"
  },
  {
    "name": "Candyhole",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "candyhole.png"
  },
  {
    "name": "Carbon Fibre",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "carbon-fibre.png"
  },
  {
    "name": "Carbon Fibre Big",
    "author": "Factorio.us Collective",
    "authorUrl": "http://factorio.us/",
    "url": "carbon-fibre-big.png"
  },
  {
    "name": "Carbon Fibre V2",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "carbon-fibre-v2.png"
  },
  {
    "name": "Cardboard",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "cardboard.png"
  },
  {
    "name": "Cardboard Flat",
    "author": "Appleshadow",
    "authorUrl": null,
    "url": "cardboard-flat.png"
  },
  {
    "name": "Cartographer",
    "author": "Sam Feyaerts",
    "authorUrl": "http://sam.feyaerts.me/",
    "url": "cartographer.png"
  },
  {
    "name": "Checkered Light Emboss",
    "author": "Alex Parker",
    "authorUrl": "http://twitter.com/misterparker",
    "url": "checkered-light-emboss.png"
  },
  {
    "name": "Checkered Pattern",
    "author": "Radosław Rzepecki",
    "authorUrl": "http://designcocktails.com/",
    "url": "checkered-pattern.png"
  },
  {
    "name": "Church",
    "author": "j Boo",
    "authorUrl": null,
    "url": "church.png"
  },
  {
    "name": "Circles",
    "author": "Blunia",
    "authorUrl": "http://www.blunia.com/",
    "url": "circles.png"
  },
  {
    "name": "Classy Fabric",
    "author": "Richard Tabor",
    "authorUrl": "http://www.purtypixels.com/",
    "url": "classy-fabric.png"
  },
  {
    "name": "Clean Gray Paper",
    "author": "Paul Phönixweiß",
    "authorUrl": "http://phoenixweiss.me/",
    "url": "clean-gray-paper.png"
  },
  {
    "name": "Clean Textile",
    "author": "N8rx",
    "authorUrl": null,
    "url": "clean-textile.png"
  },
  {
    "name": "Climpek",
    "author": "Wassim",
    "authorUrl": "http://blugraphic.com/",
    "url": "climpek.png"
  },
  {
    "name": "Cloth Alike",
    "author": "Peax Webdesign",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "cloth-alike.png"
  },
  {
    "name": "Concrete Wall",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "concrete-wall.png"
  },
  {
    "name": "Concrete Wall 2",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "concrete-wall-2.png"
  },
  {
    "name": "Concrete Wall 3",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "concrete-wall-3.png"
  },
  {
    "name": "Connected",
    "author": "Mark Collins",
    "authorUrl": "http://pixxel.co/",
    "url": "connected.png"
  },
  {
    "name": "Corrugation",
    "author": "Anna Litvinuk",
    "authorUrl": "http://graphicriver.net/user/Naf_Naf?ref=Naf_Naf",
    "url": "corrugation.png"
  },
  {
    "name": "Cream Dust",
    "author": "Thomas Myrman",
    "authorUrl": "http://thomasmyrman.com/",
    "url": "cream-dust.png"
  },
  {
    "name": "Cream Paper",
    "author": "Devin Holmes",
    "authorUrl": "http://www.strick9design.com/",
    "url": "cream-paper.png"
  },
  {
    "name": "Cream Pixels",
    "author": "Mizanur Rahman",
    "authorUrl": "http://behance.net/rexmizan",
    "url": "cream-pixels.png"
  },
  {
    "name": "Crisp Paper Ruffles",
    "author": "Tish",
    "authorUrl": "http://www.ayonnette.blogspot.com/",
    "url": "crisp-paper-ruffles.png"
  },
  {
    "name": "Crissxcross",
    "author": "Ashton",
    "authorUrl": null,
    "url": "crissxcross.png"
  },
  {
    "name": "Cross Scratches",
    "author": "Andrey Ovcharov",
    "authorUrl": "http://www.ovcharov.me/",
    "url": "cross-scratches.png"
  },
  {
    "name": "Cross Stripes",
    "author": "Stefan Aleksić",
    "authorUrl": "http://www.facebook.com/stefanaleksic88",
    "url": "cross-stripes.png"
  },
  {
    "name": "Crossword",
    "author": "Ideawebme",
    "authorUrl": "http://www.ideaweb.me/",
    "url": "crossword.png"
  },
  {
    "name": "Cubes",
    "author": "Sander Ottens",
    "authorUrl": "http://www.experimint.nl/",
    "url": "cubes.png"
  },
  {
    "name": "Cutcube",
    "author": "Michael Atkins",
    "authorUrl": "http://cubecolour.co.uk/",
    "url": "cutcube.png"
  },
  {
    "name": "Dark Brick Wall",
    "author": "Alex Parker",
    "authorUrl": "http://alexparker.me/",
    "url": "dark-brick-wall.png"
  },
  {
    "name": "Dark Circles",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "dark-circles.png"
  },
  {
    "name": "Dark Denim",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "dark-denim.png"
  },
  {
    "name": "Dark Denim 3",
    "author": "Brandon Jacoby",
    "authorUrl": "http://www.brandonjacoby.com/",
    "url": "dark-denim-3.png"
  },
  {
    "name": "Dark Dot",
    "author": "Tsvetelin Nikolov",
    "authorUrl": "http://dribbble.com/bscsystem",
    "url": "dark-dot.png"
  },
  {
    "name": "Dark Dotted 2",
    "author": "Venam",
    "authorUrl": "http://venam.1.ai/",
    "url": "dark-dotted-2.png"
  },
  {
    "name": "Dark Exa",
    "author": "Venam",
    "authorUrl": "http://venam.1.ai/",
    "url": "dark-exa.png"
  },
  {
    "name": "Dark Fish Skin",
    "author": "Petr Šulc",
    "authorUrl": "http://www.petrsulc.com/",
    "url": "dark-fish-skin.png"
  },
  {
    "name": "Dark Geometric",
    "author": "Mike Warner",
    "authorUrl": "http://www.miketheindian.com/",
    "url": "dark-geometric.png"
  },
  {
    "name": "Dark Leather",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "dark-leather.png"
  },
  {
    "name": "Dark Matter",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "dark-matter.png"
  },
  {
    "name": "Dark Mosaic",
    "author": "John Burks",
    "authorUrl": null,
    "url": "dark-mosaic.png"
  },
  {
    "name": "Dark Stripes",
    "author": "Stefan Aleksić",
    "authorUrl": "http://www.facebook.com/stefanaleksic88",
    "url": "dark-stripes.png"
  },
  {
    "name": "Dark Stripes (Light)",
    "author": "Stefan Aleksić",
    "authorUrl": "http://www.facebook.com/stefanaleksic88",
    "url": "dark-stripes-light.png"
  },
  {
    "name": "Dark Tire",
    "author": "Wilmotte Bastien",
    "authorUrl": "http://dribbble.com/bastienwilmotte",
    "url": "dark-tire.png"
  },
  {
    "name": "Dark Wall",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "dark-wall.png"
  },
  {
    "name": "Dark Wood",
    "author": "Omar Alvarado",
    "authorUrl": "http://www.oaadesigns.com/",
    "url": "dark-wood.png"
  },
  {
    "name": "Darth Stripe",
    "author": "Ashton",
    "authorUrl": null,
    "url": "darth-stripe.png"
  },
  {
    "name": "Debut Dark",
    "author": "Luke McDonald",
    "authorUrl": "http://lukemcdonald.com/",
    "url": "debut-dark.png"
  },
  {
    "name": "Debut Light",
    "author": "Luke McDonald",
    "authorUrl": "http://lukemcdonald.com/",
    "url": "debut-light.png"
  },
  {
    "name": "Diagmonds (Dark)",
    "author": "INS",
    "authorUrl": "http://www.flickr.com/photos/ins",
    "url": "diagmonds.png"
  },
  {
    "name": "Diagmonds (Light)",
    "author": "INS",
    "authorUrl": "http://www.flickr.com/photos/ins",
    "url": "diagmonds-light.png"
  },
  {
    "name": "Diagonal Noise",
    "author": "Christopher Burton",
    "authorUrl": "http://christopherburton.net/",
    "url": "diagonal-noise.png"
  },
  {
    "name": "Diagonal Striped Brick",
    "author": "Alex Smith",
    "authorUrl": null,
    "url": "diagonal-striped-brick.png"
  },
  {
    "name": "Diagonal Waves",
    "author": "CoolPatterns",
    "authorUrl": "http://coolpatterns.net/",
    "url": "diagonal-waves.png"
  },
  {
    "name": "Diagonales Decalees",
    "author": "Graphiste",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "diagonales-decalees.png"
  },
  {
    "name": "Diamond Eyes",
    "author": "AJ Troxell",
    "authorUrl": "http://ajtroxell.com/",
    "url": "diamond-eyes.png"
  },
  {
    "name": "Diamond Upholstery",
    "author": "Dimitar Karaytchev",
    "authorUrl": "http://hellogrid.com/",
    "url": "diamond-upholstery.png"
  },
  {
    "name": "Diamonds Are Forever",
    "author": "Tom Neal",
    "authorUrl": "http://imaketees.co.uk/",
    "url": "diamonds-are-forever.png"
  },
  {
    "name": "Dimension",
    "author": "Luuk van Baars",
    "authorUrl": "http://luuk.ca/",
    "url": "dimension.png"
  },
  {
    "name": "Dirty Old Black Shirt",
    "author": "Paul Reulat",
    "authorUrl": "https://twitter.com/#!/PaulReulat",
    "url": "dirty-old-black-shirt.png"
  },
  {
    "name": "Dotnoise Light Grey",
    "author": "Nikolalek",
    "authorUrl": null,
    "url": "dotnoise-light-grey.png"
  },
  {
    "name": "Double Lined",
    "author": "Adam Anlauf",
    "authorUrl": "http://www.depcore.pl/",
    "url": "double-lined.png"
  },
  {
    "name": "Dust",
    "author": "Dominik Kiss",
    "authorUrl": "http://www.werk.sk/",
    "url": "dust.png"
  },
  {
    "name": "Ecailles",
    "author": "Graphiste",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "ecailles.png"
  },
  {
    "name": "Egg Shell",
    "author": "Paul Phönixweiß",
    "authorUrl": "http://phoenixweiss.me/",
    "url": "egg-shell.png"
  },
  {
    "name": "Elastoplast",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "elastoplast.png"
  },
  {
    "name": "Elegant Grid",
    "author": "GraphicsWall",
    "authorUrl": "http://www.graphicswall.com/",
    "url": "elegant-grid.png"
  },
  {
    "name": "Embossed Paper",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://graphicriver.net/user/graphcoder?ref=graphcoder",
    "url": "embossed-paper.png"
  },
  {
    "name": "Escheresque",
    "author": "Jan Meeus",
    "authorUrl": "http://dribbble.com/janmeeus",
    "url": "escheresque.png"
  },
  {
    "name": "Escheresque Dark",
    "author": "Ste Patten",
    "authorUrl": null,
    "url": "escheresque-dark.png"
  },
  {
    "name": "Exclusive Paper",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "exclusive-paper.png"
  },
  {
    "name": "Fabric (Plaid)",
    "author": "James Basoo",
    "authorUrl": "http://twitter.com/jbasoo",
    "url": "fabric-plaid.png"
  },
  {
    "name": "Fabric 1 (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "fabric-1-dark.png"
  },
  {
    "name": "Fabric 1 (Light)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "fabric-1-light.png"
  },
  {
    "name": "Fabric Of Squares",
    "author": "Heliodor Jalba",
    "authorUrl": "http://about.me/heliodor",
    "url": "fabric-of-squares.png"
  },
  {
    "name": "Fake Brick",
    "author": "Marat",
    "authorUrl": null,
    "url": "fake-brick.png"
  },
  {
    "name": "Fake Luxury",
    "author": "Factorio.us Collective",
    "authorUrl": "http://www.factorio.us/",
    "url": "fake-luxury.png"
  },
  {
    "name": "Fancy Deboss",
    "author": "Daniel Beaton",
    "authorUrl": "http://danielbeaton.tumblr.com/",
    "url": "fancy-deboss.png"
  },
  {
    "name": "Farmer",
    "author": "Fabian Schultz",
    "authorUrl": "http://fabianschultz.de/",
    "url": "farmer.png"
  },
  {
    "name": "Felt",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "felt.png"
  },
  {
    "name": "First Aid Kit",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "first-aid-kit.png"
  },
  {
    "name": "Flower Trail",
    "author": "Paridhi",
    "authorUrl": null,
    "url": "flower-trail.png"
  },
  {
    "name": "Flowers",
    "author": "Unknown",
    "authorUrl": null,
    "url": "flowers.png"
  },
  {
    "name": "Foggy Birds",
    "author": "Pete Fecteau",
    "authorUrl": "http://buttonpresser.com/",
    "url": "foggy-birds.png"
  },
  {
    "name": "Food",
    "author": "Ilya",
    "authorUrl": null,
    "url": "food.png"
  },
  {
    "name": "Football (No Yardlines)",
    "author": "Mike Hearn",
    "authorUrl": "http://www.mikehearn.com/",
    "url": "football-no-lines.png"
  },
  {
    "name": "French Stucco",
    "author": "Christopher Buecheler",
    "authorUrl": "http://cwbuecheler.com/",
    "url": "french-stucco.png"
  },
  {
    "name": "Fresh Snow",
    "author": "Kerstkaarten",
    "authorUrl": "http://www.fotokaarten.nl/kerst.html",
    "url": "fresh-snow.png"
  },
  {
    "name": "Gold Scale",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "gold-scale.png"
  },
  {
    "name": "Gplay",
    "author": "Dimitrie Hoekstra",
    "authorUrl": "http://dhesign.com/",
    "url": "gplay.png"
  },
  {
    "name": "Gradient Squares",
    "author": "Brankic1979",
    "authorUrl": "http://www.brankic1979.com/",
    "url": "gradient-squares.png"
  },
  {
    "name": "Graphcoders Lil Fiber",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://graphicriver.net/user/graphcoder?ref=graphcoder",
    "url": "graphcoders-lil-fiber.png"
  },
  {
    "name": "Graphy (Dark)",
    "author": "We Are Pixel8",
    "authorUrl": "http://www.wearepixel8.com/",
    "url": "graphy-dark.png"
  },
  {
    "name": "Graphy (Light)",
    "author": "We Are Pixel8",
    "authorUrl": "http://www.wearepixel8.com/",
    "url": "graphy.png"
  },
  {
    "name": "Gravel",
    "author": "Mike Hearn",
    "authorUrl": "http://www.mikehearn.com/",
    "url": "gravel.png"
  },
  {
    "name": "Gray Floral",
    "author": "Lauren",
    "authorUrl": "http://laurenharrison.org/",
    "url": "gray-floral.png"
  },
  {
    "name": "Gray Lines",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "gray-lines.png"
  },
  {
    "name": "Gray Sand",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "gray-sand.png"
  },
  {
    "name": "Green Cup",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "green-cup.png"
  },
  {
    "name": "Green Dust and Scratches",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "green-dust-and-scratches.png"
  },
  {
    "name": "Green Fibers",
    "author": "Matteo Di Capua",
    "authorUrl": "http://www.matteodicapua.com/",
    "url": "green-fibers.png"
  },
  {
    "name": "Green Gobbler",
    "author": "Simon Meek",
    "authorUrl": "http://www.simonmeek.com/",
    "url": "green-gobbler.png"
  },
  {
    "name": "Grey Jean",
    "author": "Omur Uluask",
    "authorUrl": "http://mr.pn/",
    "url": "grey-jean.png"
  },
  {
    "name": "Grey Sandbag",
    "author": "Diogo Silva",
    "authorUrl": "http://www.diogosilva.net/",
    "url": "grey-sandbag.png"
  },
  {
    "name": "Grey Washed Wall",
    "author": "Sagive SEO",
    "authorUrl": "http://www.sagive.co.il/",
    "url": "grey-washed-wall.png"
  },
  {
    "name": "Greyzz",
    "author": "Infographiste",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "greyzz.png"
  },
  {
    "name": "Grid",
    "author": "Dominik Kiss",
    "authorUrl": "http://www.werk.sk/",
    "url": "grid.png"
  },
  {
    "name": "Grid Me",
    "author": "Arno Gregorian",
    "authorUrl": "http://www.gobigbang.nl/",
    "url": "grid-me.png"
  },
  {
    "name": "Grid Noise",
    "author": "Daivid Serif",
    "authorUrl": null,
    "url": "grid-noise.png"
  },
  {
    "name": "Grilled Noise",
    "author": "Dertig Media",
    "authorUrl": "http://30.nl/",
    "url": "grilled-noise.png"
  },
  {
    "name": "Groovepaper",
    "author": "Isaac",
    "authorUrl": "http://graphicriver.net/user/krispdesigns",
    "url": "groovepaper.png"
  },
  {
    "name": "Grunge Wall",
    "author": "Adam Anlauf",
    "authorUrl": "http://www.depcore.pl/",
    "url": "grunge-wall.png"
  },
  {
    "name": "Gun Metal",
    "author": "Nikolay Boltachev",
    "authorUrl": "http://www.zigzain.com/",
    "url": "gun-metal.png"
  },
  {
    "name": "Handmade Paper",
    "author": "Le Marquis",
    "authorUrl": null,
    "url": "handmade-paper.png"
  },
  {
    "name": "Hexabump",
    "author": "Norbert Levajsics",
    "authorUrl": "http://spom.me/",
    "url": "hexabump.png"
  },
  {
    "name": "Hexellence",
    "author": "Kim Ruddock",
    "authorUrl": "http://www.webdesigncreare.co.uk/",
    "url": "hexellence.png"
  },
  {
    "name": "Hixs Evolution",
    "author": "Damian Rivas",
    "authorUrl": "http://www.hybridixstudio.com/",
    "url": "hixs-evolution.png"
  },
  {
    "name": "Hoffman",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "hoffman.png"
  },
  {
    "name": "Honey I'm Subtle",
    "author": "Alex M. Balling",
    "authorUrl": "http://www.blof.dk/",
    "url": "honey-im-subtle.png"
  },
  {
    "name": "Ice Age",
    "author": "Gjermund Gustavsen",
    "authorUrl": "http://tight.no/",
    "url": "ice-age.png"
  },
  {
    "name": "Inflicted",
    "author": "Hugo Loning",
    "authorUrl": "http://www.inflicted.nl/",
    "url": "inflicted.png"
  },
  {
    "name": "Inspiration Geometry",
    "author": "Welsley",
    "authorUrl": "http://www.pdmb.org/work",
    "url": "inspiration-geometry.png"
  },
  {
    "name": "Iron Grip",
    "author": "Tony Kinard",
    "authorUrl": "http://www.tonykinard.net/",
    "url": "iron-grip.png"
  },
  {
    "name": "Kinda Jean",
    "author": "Graphiste",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "kinda-jean.png"
  },
  {
    "name": "Knitted Netting",
    "author": "Anna Litvinuk",
    "authorUrl": "http://graphicriver.net/user/Naf_Naf?ref=Naf_Naf",
    "url": "knitted-netting.png"
  },
  {
    "name": "Knitted Sweater",
    "author": "Victoria Spahn",
    "authorUrl": "https://twitter.com/VictoriaSpahn",
    "url": "knitted-sweater.png"
  },
  {
    "name": "Kuji",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "kuji.png"
  },
  {
    "name": "Large Leather",
    "author": "Elemis",
    "authorUrl": "http://elemisfreebies.com/",
    "url": "large-leather.png"
  },
  {
    "name": "Leather",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "leather.png"
  },
  {
    "name": "Light Aluminum",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "light-aluminum.png"
  },
  {
    "name": "Light Gray",
    "author": "Brenda Lay",
    "authorUrl": "http://poisones.tumblr.com/",
    "url": "light-gray.png"
  },
  {
    "name": "Light Grey Floral Motif",
    "author": "GraphicsWall",
    "authorUrl": "http://www.graphicswall.com/",
    "url": "light-grey-floral-motif.png"
  },
  {
    "name": "Light Honeycomb",
    "author": "Federica Pelzel",
    "authorUrl": "http://about.me/federicca",
    "url": "light-honeycomb.png"
  },
  {
    "name": "Light Honeycomb (Dark)",
    "author": "Federica Pelzel",
    "authorUrl": "http://about.me/federicca",
    "url": "light-honeycomb-dark.png"
  },
  {
    "name": "Light Mesh",
    "author": "Wilmotte Bastien",
    "authorUrl": "http://dribbble.com/bastienwilmotte",
    "url": "light-mesh.png"
  },
  {
    "name": "Light Paper Fibers",
    "author": "Jorge Fuentes",
    "authorUrl": "http://www.jorgefuentes.net/",
    "url": "light-paper-fibers.png"
  },
  {
    "name": "Light Sketch",
    "author": "Dan Kruse",
    "authorUrl": "http://dankruse.com/",
    "url": "light-sketch.png"
  },
  {
    "name": "Light Toast",
    "author": "Pippin Lee",
    "authorUrl": "https://twitter.com/#!/pippinlee",
    "url": "light-toast.png"
  },
  {
    "name": "Light Wool",
    "author": "Andy",
    "authorUrl": "http://www.tall.me.uk/",
    "url": "light-wool.png"
  },
  {
    "name": "Lined Paper",
    "author": "Are Sundnes",
    "authorUrl": "http://www.paranaiv.no/",
    "url": "lined-paper.png"
  },
  {
    "name": "Lined Paper 2",
    "author": "Gjermund Gustavsen",
    "authorUrl": "http://www.tight.no/",
    "url": "lined-paper-2.png"
  },
  {
    "name": "Little Knobs",
    "author": "Amos",
    "authorUrl": "http://www.freepx.net/",
    "url": "little-knobs.png"
  },
  {
    "name": "Little Pluses",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "little-pluses.png"
  },
  {
    "name": "Little Triangles",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "little-triangles.png"
  },
  {
    "name": "Low Contrast Linen",
    "author": "Jordan Pittman",
    "authorUrl": null,
    "url": "low-contrast-linen.png"
  },
  {
    "name": "Lyonnette",
    "author": "Tish",
    "authorUrl": "http://www.ayonnette.blogspot.com/",
    "url": "lyonnette.png"
  },
  {
    "name": "Maze Black",
    "author": "Peax",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "maze-black.png"
  },
  {
    "name": "Maze White",
    "author": "Peax",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "maze-white.png"
  },
  {
    "name": "Mbossed",
    "author": "Alex Parker",
    "authorUrl": "http://twitter.com/misterparker",
    "url": "mbossed.png"
  },
  {
    "name": "Medic Packaging Foil",
    "author": "pixilated",
    "authorUrl": "http://be.net/pixilated",
    "url": "medic-packaging-foil.png"
  },
  {
    "name": "Merely Cubed",
    "author": "Etienne Rallion",
    "authorUrl": "http://www.etiennerallion.fr/",
    "url": "merely-cubed.png"
  },
  {
    "name": "Micro Carbon",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "micro-carbon.png"
  },
  {
    "name": "Mirrored Squares",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "mirrored-squares.png"
  },
  {
    "name": "Mocha Grunge",
    "author": "Joel Klein",
    "authorUrl": "http://www.evelt.com/",
    "url": "mocha-grunge.png"
  },
  {
    "name": "Mooning",
    "author": "Joel Klein",
    "authorUrl": "http://www.evelt.com/",
    "url": "mooning.png"
  },
  {
    "name": "Moulin",
    "author": "Venam",
    "authorUrl": "http://venam.1.ai/",
    "url": "moulin.png"
  },
  {
    "name": "My Little Plaid (Dark)",
    "author": "Pete Fecteau",
    "authorUrl": "http://buttonpresser.com/",
    "url": "my-little-plaid-dark.png"
  },
  {
    "name": "My Little Plaid (Light)",
    "author": "Pete Fecteau",
    "authorUrl": "http://buttonpresser.com/",
    "url": "my-little-plaid.png"
  },
  {
    "name": "Nami",
    "author": "Dertig Media",
    "authorUrl": "http://30.nl/",
    "url": "nami.png"
  },
  {
    "name": "Nasty Fabric",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "nasty-fabric.png"
  },
  {
    "name": "Natural Paper",
    "author": "Mihaela Hinayon",
    "authorUrl": null,
    "url": "natural-paper.png"
  },
  {
    "name": "Navy",
    "author": "Ethan Hamilton",
    "authorUrl": "http://ultranotch.com/",
    "url": "navy.png"
  },
  {
    "name": "Nice Snow",
    "author": "Kerstkaarten",
    "authorUrl": "http://www.fotokaarten.nl/kerst.html",
    "url": "nice-snow.png"
  },
  {
    "name": "Nistri",
    "author": "Markus Reiter",
    "authorUrl": "http://reitermark.us/",
    "url": "nistri.png"
  },
  {
    "name": "Noise Lines",
    "author": "Thomas Zucx",
    "authorUrl": null,
    "url": "noise-lines.png"
  },
  {
    "name": "Noise Pattern With Subtle Cross Lines",
    "author": "Viszt Péter",
    "authorUrl": "http://visztpeter.me/",
    "url": "noise-pattern-with-subtle-cross-lines.png"
  },
  {
    "name": "Noisy",
    "author": "Mladjan Antic",
    "authorUrl": "http://anticdesign.info/",
    "url": "noisy.png"
  },
  {
    "name": "Noisy Grid",
    "author": "Vectorpile",
    "authorUrl": "http://www.vectorpile.com/",
    "url": "noisy-grid.png"
  },
  {
    "name": "Noisy Net",
    "author": "Tom McArdle",
    "authorUrl": "http://twitter.com/_mcrdl",
    "url": "noisy-net.png"
  },
  {
    "name": "Norwegian Rose",
    "author": "Fredrik Scheide",
    "authorUrl": null,
    "url": "norwegian-rose.png"
  },
  {
    "name": "Notebook",
    "author": "HQvectors",
    "authorUrl": "http://www.hqvectors.com/",
    "url": "notebook.png"
  },
  {
    "name": "Notebook (Dark)",
    "author": "HQvectors",
    "authorUrl": "http://www.hqvectors.com/",
    "url": "notebook-dark.png"
  },
  {
    "name": "Office",
    "author": "Andrés Rigo",
    "authorUrl": "http://www.andresrigo.com/",
    "url": "office.png"
  },
  {
    "name": "Old Husks",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "old-husks.png"
  },
  {
    "name": "Old Map",
    "author": "Andreas Föhl",
    "authorUrl": "http://www.netzfeld.de/",
    "url": "old-map.png"
  },
  {
    "name": "Old Mathematics",
    "author": "Josh Green",
    "authorUrl": "http://emailcoder.net/",
    "url": "old-mathematics.png"
  },
  {
    "name": "Old Moon",
    "author": "Nick Batchelor",
    "authorUrl": "http://www.italicsbold.com.au/",
    "url": "old-moon.png"
  },
  {
    "name": "Old Wall",
    "author": "Bartosz Kaszubowski",
    "authorUrl": "http://twitter.com/simek",
    "url": "old-wall.png"
  },
  {
    "name": "Otis Redding",
    "author": "Thomas Myrman",
    "authorUrl": "http://thomasmyrman.com/",
    "url": "otis-redding.png"
  },
  {
    "name": "Outlets",
    "author": "Michal Chovanec",
    "authorUrl": "http://michalchovanec.com/",
    "url": "outlets.png"
  },
  {
    "name": "P1",
    "author": "Dima Shiper",
    "authorUrl": "http://www.epictextures.com/",
    "url": "p1.png"
  },
  {
    "name": "P2",
    "author": "Dima Shiper",
    "authorUrl": "http://www.epictextures.com/",
    "url": "p2.png"
  },
  {
    "name": "P4",
    "author": "Dima Shiper",
    "authorUrl": "http://www.epictextures.com/",
    "url": "p4.png"
  },
  {
    "name": "P5",
    "author": "Dima Shiper",
    "authorUrl": "http://www.epictextures.com/",
    "url": "p5.png"
  },
  {
    "name": "P6",
    "author": "Dima Shiper",
    "authorUrl": "http://www.epictextures.com/",
    "url": "p6.png"
  },
  {
    "name": "Padded",
    "author": "Chris Baldie",
    "authorUrl": "http://papertank.co.uk/",
    "url": "padded.png"
  },
  {
    "name": "Padded (Light)",
    "author": "Chris Baldie",
    "authorUrl": "http://papertank.co.uk/",
    "url": "padded-light.png"
  },
  {
    "name": "Paper",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "paper.png"
  },
  {
    "name": "Paper 1",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "paper-1.png"
  },
  {
    "name": "Paper 2",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "paper-2.png"
  },
  {
    "name": "Paper 3",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "paper-3.png"
  },
  {
    "name": "Paper Fibers",
    "author": "Heliodor jalba",
    "authorUrl": "http://about.me/heliodor",
    "url": "paper-fibers.png"
  },
  {
    "name": "Paven",
    "author": "Josh Green",
    "authorUrl": "http://emailcoder.net/",
    "url": "paven.png"
  },
  {
    "name": "Perforated White Leather",
    "author": "Dmitry",
    "authorUrl": null,
    "url": "perforated-white-leather.png"
  },
  {
    "name": "Pineapple Cut",
    "author": "Audee Mirza",
    "authorUrl": "http://audeemirza.com/",
    "url": "pineapple-cut.png"
  },
  {
    "name": "Pinstripe (Dark)",
    "author": "Brandon",
    "authorUrl": "http://extrast.com/",
    "url": "pinstripe-dark.png"
  },
  {
    "name": "Pinstripe (Light)",
    "author": "Brandon",
    "authorUrl": "http://extrast.com/",
    "url": "pinstripe-light.png"
  },
  {
    "name": "Pinstriped Suit",
    "author": "Alex Berkowitz",
    "authorUrl": "http://www.alexberkowitz.com/",
    "url": "pinstriped-suit.png"
  },
  {
    "name": "Pixel Weave",
    "author": "Dax Kieran",
    "authorUrl": "http://daxkieran.com/",
    "url": "pixel-weave.png"
  },
  {
    "name": "Polaroid",
    "author": "Daniel Beaton",
    "authorUrl": "http://danielbeaton.tumblr.com/",
    "url": "polaroid.png"
  },
  {
    "name": "Polonez Pattern",
    "author": "Radosław Rzepecki",
    "authorUrl": "http://designcocktails.com/",
    "url": "polonez-pattern.png"
  },
  {
    "name": "Polyester Lite",
    "author": "Jeremy",
    "authorUrl": "http://dribbble.com/jeremyelder",
    "url": "polyester-lite.png"
  },
  {
    "name": "Pool Table",
    "author": "Caveman",
    "authorUrl": "http://caveman.chlova.com/",
    "url": "pool-table.png"
  },
  {
    "name": "Project Paper",
    "author": "Rafael Almeida",
    "authorUrl": "http://www.fotografiaetc.com.br/",
    "url": "project-paper.png"
  },
  {
    "name": "Ps Neutral",
    "author": "Gluszczenko",
    "authorUrl": "http://www.gluszczenko.com/",
    "url": "ps-neutral.png"
  },
  {
    "name": "Psychedelic",
    "author": "Pixeden",
    "authorUrl": "http://www.pixeden.com/",
    "url": "psychedelic.png"
  },
  {
    "name": "Purty Wood",
    "author": "Richard Tabor",
    "authorUrl": "http://www.purtypixels.com/",
    "url": "purty-wood.png"
  },
  {
    "name": "Pw Pattern",
    "author": "Peax",
    "authorUrl": "http://www.peax-webdesign.com/",
    "url": "pw-pattern.png"
  },
  {
    "name": "Pyramid",
    "author": "Jeff Wall",
    "authorUrl": null,
    "url": "pyramid.png"
  },
  {
    "name": "Quilt",
    "author": "Josh Green",
    "authorUrl": "http://joshgreendesign.com/",
    "url": "quilt.png"
  },
  {
    "name": "Random Grey Variations",
    "author": "Stefan Aleksić",
    "authorUrl": "http://www.mentalwarddesign.com/",
    "url": "random-grey-variations.png"
  },
  {
    "name": "Ravenna",
    "author": "Sentel",
    "authorUrl": "http://sentel.co/",
    "url": "ravenna.png"
  },
  {
    "name": "Real Carbon Fibre",
    "author": "Alfred Lee",
    "authorUrl": null,
    "url": "real-carbon-fibre.png"
  },
  {
    "name": "Rebel",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "rebel.png"
  },
  {
    "name": "Redox 01",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "redox-01.png"
  },
  {
    "name": "Redox 02",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "redox-02.png"
  },
  {
    "name": "Reticular Tissue",
    "author": "Anna Litvinuk",
    "authorUrl": "http://graphicriver.net/user/Naf_Naf?ref=Naf_Naf",
    "url": "reticular-tissue.png"
  },
  {
    "name": "Retina Dust",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "retina-dust.png"
  },
  {
    "name": "Retina Wood",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "retina-wood.png"
  },
  {
    "name": "Retro Intro",
    "author": "Bilal Ketab",
    "authorUrl": "http://www.twitter.com/Creartinc",
    "url": "retro-intro.png"
  },
  {
    "name": "Rice Paper",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "rice-paper.png"
  },
  {
    "name": "Rice Paper #2",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "rice-paper-2.png"
  },
  {
    "name": "Rice Paper #3",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "rice-paper-3.png"
  },
  {
    "name": "Robots",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "robots.png"
  },
  {
    "name": "Rocky Wall",
    "author": "Projecteightyfive",
    "authorUrl": "http://projecteightyfive.com/",
    "url": "rocky-wall.png"
  },
  {
    "name": "Rough Cloth",
    "author": "Bartosz Kaszubowski",
    "authorUrl": "http://twitter.com/simek",
    "url": "rough-cloth.png"
  },
  {
    "name": "Rough Cloth (Light)",
    "author": "Bartosz Kaszubowski",
    "authorUrl": "http://twitter.com/simek",
    "url": "rough-cloth-light.png"
  },
  {
    "name": "Rough Diagonal",
    "author": "Jorick van Hees",
    "authorUrl": "http://jorickvanhees.com/",
    "url": "rough-diagonal.png"
  },
  {
    "name": "Rubber Grip",
    "author": "Sinisha",
    "authorUrl": "http://be.net/pixilated",
    "url": "rubber-grip.png"
  },
  {
    "name": "Sandpaper",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "sandpaper.png"
  },
  {
    "name": "Satin Weave",
    "author": "Merrin Macleod",
    "authorUrl": "http://www.merxplat.com/",
    "url": "satin-weave.png"
  },
  {
    "name": "Scribble Light",
    "author": "Tegan Male",
    "authorUrl": "http://thelovelyfox.com/",
    "url": "scribble-light.png"
  },
  {
    "name": "Shattered",
    "author": "Luuk van Baars",
    "authorUrl": "http://luukvanbaars.com/",
    "url": "shattered.png"
  },
  {
    "name": "Shattered (Dark)",
    "author": "Luuk van Baars",
    "authorUrl": "http://luukvanbaars.com/",
    "url": "shattered-dark.png"
  },
  {
    "name": "Shine Caro",
    "author": "mediumidee",
    "authorUrl": "http://www.mediumidee.de/",
    "url": "shine-caro.png"
  },
  {
    "name": "Shine Dotted",
    "author": "mediumidee",
    "authorUrl": "http://www.mediumidee.de/",
    "url": "shine-dotted.png"
  },
  {
    "name": "Shley Tree 1",
    "author": "Derek Ramsey",
    "authorUrl": "http://en.wikipedia.org/wiki/User:Ram-Man",
    "url": "shley-tree-1.png"
  },
  {
    "name": "Shley Tree 2",
    "author": "Mike Hearn",
    "authorUrl": "http://www.mikehearn.com/",
    "url": "shley-tree-2.png"
  },
  {
    "name": "Silver Scales",
    "author": "Alex Parker",
    "authorUrl": "http://twitter.com/misterparker",
    "url": "silver-scales.png"
  },
  {
    "name": "Simple Dashed",
    "author": "Venam",
    "authorUrl": "http://venam.1.ai/",
    "url": "simple-dashed.png"
  },
  {
    "name": "Simple Horizontal Light",
    "author": "Fabricio",
    "authorUrl": null,
    "url": "simple-horizontal-light.png"
  },
  {
    "name": "Skeletal Weave",
    "author": "Angelica",
    "authorUrl": "http://fleeting_days.livejournal.com/",
    "url": "skeletal-weave.png"
  },
  {
    "name": "Skewed Print",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "skewed-print.png"
  },
  {
    "name": "Skin Side Up",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "skin-side-up.png"
  },
  {
    "name": "Skulls",
    "author": "Adam",
    "authorUrl": null,
    "url": "skulls.png"
  },
  {
    "name": "Slash It",
    "author": "Venam",
    "authorUrl": "http://venam.1.ai/",
    "url": "slash-it.png"
  },
  {
    "name": "Small Crackle Bright",
    "author": "Markus Tinner",
    "authorUrl": "http://www.markustinner.ch/",
    "url": "small-crackle-bright.png"
  },
  {
    "name": "Small Crosses",
    "author": "Ian Dmitry",
    "authorUrl": null,
    "url": "small-crosses.png"
  },
  {
    "name": "Smooth Wall (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "smooth-wall-dark.png"
  },
  {
    "name": "Smooth Wall (Light)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "smooth-wall-light.png"
  },
  {
    "name": "Sneaker Mesh Fabric",
    "author": "Victor Bejar",
    "authorUrl": "http://victorbejar.com/",
    "url": "sneaker-mesh-fabric.png"
  },
  {
    "name": "Snow",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "snow.png"
  },
  {
    "name": "Soft Circle Scales",
    "author": "Ian Soper",
    "authorUrl": "http://iansoper.com/",
    "url": "soft-circle-scales.png"
  },
  {
    "name": "Soft Kill",
    "author": "Factorio.us Collective",
    "authorUrl": "http://www.factorio.us/",
    "url": "soft-kill.png"
  },
  {
    "name": "Soft Pad",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://ow.ly/8v3IG",
    "url": "soft-pad.png"
  },
  {
    "name": "Soft Wallpaper",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "soft-wallpaper.png"
  },
  {
    "name": "Solid",
    "author": "Hendrik Lammers",
    "authorUrl": "http://www.hendriklammers.com/",
    "url": "solid.png"
  },
  {
    "name": "Sos",
    "author": "JBasoo",
    "authorUrl": "https://twitter.com/JBasoo",
    "url": "sos.png"
  },
  {
    "name": "Sprinkles",
    "author": "Rebecca Litt",
    "authorUrl": "http://yellowmangodesign.com/",
    "url": "sprinkles.png"
  },
  {
    "name": "Squairy",
    "author": "Tia Newbury",
    "authorUrl": null,
    "url": "squairy.png"
  },
  {
    "name": "Squared Metal",
    "author": "doot0",
    "authorUrl": "http://twitter.com/doot0",
    "url": "squared-metal.png"
  },
  {
    "name": "Squares",
    "author": "Jaromír Kavan",
    "authorUrl": "http://www.toshtak.com/",
    "url": "squares.png"
  },
  {
    "name": "Stacked Circles",
    "author": "Saqib",
    "authorUrl": "http://www.960development.com/",
    "url": "stacked-circles.png"
  },
  {
    "name": "Stardust",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "stardust.png"
  },
  {
    "name": "Starring",
    "author": "Agus Riyadi",
    "authorUrl": "http://logosmile.net/",
    "url": "starring.png"
  },
  {
    "name": "Stitched Wool",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "stitched-wool.png"
  },
  {
    "name": "Strange Bullseyes",
    "author": "Christopher Buecheler",
    "authorUrl": "http://cwbuecheler.com/",
    "url": "strange-bullseyes.png"
  },
  {
    "name": "Straws",
    "author": "Pavel",
    "authorUrl": "http://evaluto.com/",
    "url": "straws.png"
  },
  {
    "name": "Stressed Linen",
    "author": "Jordan Pittman",
    "authorUrl": null,
    "url": "stressed-linen.png"
  },
  {
    "name": "Stucco",
    "author": "Bartosz Kaszubowski",
    "authorUrl": "http://twitter.com/#!/simek",
    "url": "stucco.png"
  },
  {
    "name": "Subtle Carbon",
    "author": "Designova",
    "authorUrl": "http://www.designova.net/",
    "url": "subtle-carbon.png"
  },
  {
    "name": "Subtle Dark Vertical",
    "author": "Cody L",
    "authorUrl": "http://tirl.tk/",
    "url": "subtle-dark-vertical.png"
  },
  {
    "name": "Subtle Dots",
    "author": "Designova",
    "authorUrl": "http://www.designova.net/",
    "url": "subtle-dots.png"
  },
  {
    "name": "Subtle Freckles",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "subtle-freckles.png"
  },
  {
    "name": "Subtle Grey",
    "author": "Haris Šumić",
    "authorUrl": null,
    "url": "subtle-grey.png"
  },
  {
    "name": "Subtle Grunge",
    "author": "Breezi",
    "authorUrl": "http://breezi.com/",
    "url": "subtle-grunge.png"
  },
  {
    "name": "Subtle Stripes",
    "author": "Raasa",
    "authorUrl": "http://cargocollective.com/raasa",
    "url": "subtle-stripes.png"
  },
  {
    "name": "Subtle Surface",
    "author": "Designova",
    "authorUrl": "http://www.designova.net/",
    "url": "subtle-surface.png"
  },
  {
    "name": "Subtle White Feathers",
    "author": "Viahorizon",
    "authorUrl": "http://therapywarsaw.com/",
    "url": "subtle-white-feathers.png"
  },
  {
    "name": "Subtle Zebra 3D",
    "author": "Mike Warner",
    "authorUrl": "http://www.miketheindian.com/",
    "url": "subtle-zebra-3d.png"
  },
  {
    "name": "Subtlenet",
    "author": "Designova",
    "authorUrl": "http://www.designova.net/",
    "url": "subtlenet.png"
  },
  {
    "name": "Swirl",
    "author": "Peter Chon",
    "authorUrl": "http://peterchondesign.com/",
    "url": "swirl.png"
  },
  {
    "name": "Tactile Noise (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "tactile-noise-dark.png"
  },
  {
    "name": "Tactile Noise (Light)",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "tactile-noise-light.png"
  },
  {
    "name": "Tapestry",
    "author": "Pixeden",
    "authorUrl": "http://www.pixeden.com/",
    "url": "tapestry.png"
  },
  {
    "name": "Tasky",
    "author": "Michal Chovanec",
    "authorUrl": "http://michalchovanec.com/",
    "url": "tasky.png"
  },
  {
    "name": "Tex2Res1",
    "author": "Janos Koos",
    "authorUrl": "http://joxadesign.com/",
    "url": "tex2res1.png"
  },
  {
    "name": "Tex2Res2",
    "author": "Janos Koos",
    "authorUrl": "http://joxadesign.com/",
    "url": "tex2res2.png"
  },
  {
    "name": "Tex2Res3",
    "author": "Janos Koos",
    "authorUrl": "http://joxadesign.com/",
    "url": "tex2res3.png"
  },
  {
    "name": "Tex2Res4",
    "author": "Janos Koos",
    "authorUrl": "http://joxadesign.com/",
    "url": "tex2res4.png"
  },
  {
    "name": "Tex2Res5",
    "author": "Janos Koos",
    "authorUrl": "http://joxadesign.com/",
    "url": "tex2res5.png"
  },
  {
    "name": "Textured Paper",
    "author": "Stephen Gilbert",
    "authorUrl": "http://stephen.io/",
    "url": "textured-paper.png"
  },
  {
    "name": "Textured Stripes",
    "author": "V Hartikainen",
    "authorUrl": "http://tiled-bg.blogspot.com/",
    "url": "textured-stripes.png"
  },
  {
    "name": "Texturetastic Gray",
    "author": "Adam Pickering",
    "authorUrl": "http://www.adampickering.com/",
    "url": "texturetastic-gray.png"
  },
  {
    "name": "Ticks",
    "author": "Laura Gilbert Gilardenghi",
    "authorUrl": "http://rossomenta.blogspot.it/",
    "url": "ticks.png"
  },
  {
    "name": "Tileable Wood",
    "author": "Elemis",
    "authorUrl": "http://elemisfreebies.com/",
    "url": "tileable-wood.png"
  },
  {
    "name": "Tileable Wood (Colored)",
    "author": "Elemis",
    "authorUrl": "http://elemisfreebies.com/",
    "url": "tileable-wood-colored.png"
  },
  {
    "name": "Tiny Grid",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "tiny-grid.png"
  },
  {
    "name": "Translucent Fibres",
    "author": "Angelica",
    "authorUrl": "http://fleeting_days.livejournal.com/",
    "url": "translucent-fibres.png"
  },
  {
    "name": "Transparent Square Tiles",
    "author": "Nathan Spady",
    "authorUrl": "http://nspady.com/",
    "url": "transparent-square-tiles.png"
  },
  {
    "name": "Tree Bark",
    "author": "GetDiscount",
    "authorUrl": "http://getdiscount.co.uk/",
    "url": "tree-bark.png"
  },
  {
    "name": "Triangles",
    "author": "Ivan Ginev",
    "authorUrl": "http://coggraphics.com/",
    "url": "triangles.png"
  },
  {
    "name": "Triangles 2",
    "author": "Pixeden",
    "authorUrl": "http://www.pixeden.com/",
    "url": "triangles-2.png"
  },
  {
    "name": "Triangular",
    "author": "Dax Kieran",
    "authorUrl": "http://daxkieran.com/",
    "url": "triangular.png"
  },
  {
    "name": "Tweed",
    "author": "Simon Leo",
    "authorUrl": null,
    "url": "tweed.png"
  },
  {
    "name": "Twinkle Twinkle",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "twinkle-twinkle.png"
  },
  {
    "name": "Txture",
    "author": "Anatoli Nicolae",
    "authorUrl": "http://designchomp.com/",
    "url": "txture.png"
  },
  {
    "name": "Type",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "type.png"
  },
  {
    "name": "Use Your Illusion",
    "author": "Mohawk Studios",
    "authorUrl": "http://www.mohawkstudios.com/",
    "url": "use-your-illusion.png"
  },
  {
    "name": "Vaio",
    "author": "Zigzain",
    "authorUrl": "http://www.zigzain.com/",
    "url": "vaio.png"
  },
  {
    "name": "Vertical Cloth",
    "author": "Krisp Designs",
    "authorUrl": "http://dribbble.com/krisp",
    "url": "vertical-cloth.png"
  },
  {
    "name": "Vichy",
    "author": "Olivier Pineda",
    "authorUrl": "http://www.olivierpineda.com/",
    "url": "vichy.png"
  },
  {
    "name": "Vintage Speckles",
    "author": "David Pomfret",
    "authorUrl": "http://simpleasmilk.co.uk/",
    "url": "vintage-speckles.png"
  },
  {
    "name": "Wall #4 Light",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "wall-4-light.png"
  },
  {
    "name": "Washi",
    "author": "Carolynne",
    "authorUrl": "http://www.sweetstudio.co.uk/",
    "url": "washi.png"
  },
  {
    "name": "Wave Grid",
    "author": "DomainsInfo",
    "authorUrl": "http://www.domainsinfo.org/",
    "url": "wave-grid.png"
  },
  {
    "name": "Wavecut",
    "author": "Ian Soper",
    "authorUrl": "http://iansoper.com/",
    "url": "wavecut.png"
  },
  {
    "name": "Weave",
    "author": "Catherine",
    "authorUrl": "http://wellterned.com/",
    "url": "weave.png"
  },
  {
    "name": "Wet Snow",
    "author": "Kerstkaarten",
    "authorUrl": "http://www.fotokaarten.nl/kerst.html",
    "url": "wet-snow.png"
  },
  {
    "name": "White Bed Sheet",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "white-bed-sheet.png"
  },
  {
    "name": "White Brick Wall",
    "author": "Listvetra",
    "authorUrl": "http://listvetra.ru/",
    "url": "white-brick-wall.png"
  },
  {
    "name": "White Brushed",
    "author": "Andre Schouten",
    "authorUrl": "http://uniqappz.com/",
    "url": "white-brushed.png"
  },
  {
    "name": "White Carbon",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "white-carbon.png"
  },
  {
    "name": "White Carbonfiber",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "white-carbonfiber.png"
  },
  {
    "name": "White Diamond",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "white-diamond.png"
  },
  {
    "name": "White Diamond (Dark)",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "white-diamond-dark.png"
  },
  {
    "name": "White Leather",
    "author": "Atle Mo",
    "authorUrl": "http://atlemo.com/",
    "url": "white-leather.png"
  },
  {
    "name": "White Linen",
    "author": "Fabian Schultz",
    "authorUrl": "http://fabianschultz.de/",
    "url": "white-linen.png"
  },
  {
    "name": "White Paperboard",
    "author": "Chaos",
    "authorUrl": null,
    "url": "white-paperboard.png"
  },
  {
    "name": "White Plaster",
    "author": "Phil Maurer",
    "authorUrl": "http://aurer.co.uk/",
    "url": "white-plaster.png"
  },
  {
    "name": "White Sand",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "white-sand.png"
  },
  {
    "name": "White Texture",
    "author": "Dmitry",
    "authorUrl": null,
    "url": "white-texture.png"
  },
  {
    "name": "White Tiles",
    "author": "Another One",
    "authorUrl": "http://www.anotherone.fr/",
    "url": "white-tiles.png"
  },
  {
    "name": "White Wall",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "white-wall.png"
  },
  {
    "name": "White Wall 2",
    "author": "Yuji Honzawa",
    "authorUrl": "https://corabbit.com/",
    "url": "white-wall-2.png"
  },
  {
    "name": "White Wall 3",
    "author": "Viahorizon",
    "authorUrl": "http://centrumpar.pl/",
    "url": "white-wall-3.png"
  },
  {
    "name": "White Wall 3[2]",
    "author": "Luca",
    "authorUrl": "http://skymbu.info/",
    "url": "white-wall-3-2.png"
  },
  {
    "name": "White Wave",
    "author": "Rohit Arun Rao",
    "authorUrl": null,
    "url": "white-wave.png"
  },
  {
    "name": "Whitey",
    "author": "Ant Ekşiler",
    "authorUrl": "http://www.turkhitbox.com/",
    "url": "whitey.png"
  },
  {
    "name": "Wide Rectangles",
    "author": "Petr Šulc",
    "authorUrl": "http://www.petrsulc.com/",
    "url": "wide-rectangles.png"
  },
  {
    "name": "Wild Flowers",
    "author": "Themes Tube",
    "authorUrl": "http://themestube.com/",
    "url": "wild-flowers.png"
  },
  {
    "name": "Wild Oliva",
    "author": "Badhon Ebrahim",
    "authorUrl": "http://dribbble.com/graphcoder",
    "url": "wild-oliva.png"
  },
  {
    "name": "Wine Cork",
    "author": "Atle Mo",
    "authorUrl": "http://www.atlemo.com/",
    "url": "wine-cork.png"
  },
  {
    "name": "Wood",
    "author": "Cloaks",
    "authorUrl": "http://cloaks.deviantart.com/",
    "url": "wood.png"
  },
  {
    "name": "Wood Pattern",
    "author": "Alexey Usoltsev",
    "authorUrl": null,
    "url": "wood-pattern.png"
  },
  {
    "name": "Worn Dots",
    "author": "Matt McDaniel",
    "authorUrl": "http://mattmcdaniel.me/",
    "url": "worn-dots.png"
  },
  {
    "name": "Woven",
    "author": "Max Rudberg",
    "authorUrl": "http://www.maxthemes.com/",
    "url": "woven.png"
  },
  {
    "name": "Woven (Light)",
    "author": "Max Rudberg",
    "authorUrl": "http://www.maxthemes.com/",
    "url": "woven-light.png"
  },
  {
    "name": "Xv",
    "author": "Lasma",
    "authorUrl": "http://www.oddfur.com/",
    "url": "xv.png"
  },
  {
    "name": "Zig Zag",
    "author": "Dmitriy Prodchenko",
    "authorUrl": "http://www.behance.net/dmpr0",
    "url": "zig-zag.png"
  },
  {
    "name": "Вlack Lozenge",
    "author": "Listvetra",
    "authorUrl": "http://www.listvetra.ru/",
    "url": "black-lozenge.png"
  }
];


@Resolver()
export class TextureResolver {
  @Query(returns => Texture)
  public randomTexture(): Texture {
    return _.sample(TEXTURE_DATA);
  }
}