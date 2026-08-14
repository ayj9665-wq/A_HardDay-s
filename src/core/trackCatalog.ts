import type { MoodId } from "./moods";

export type RecommendationTrack = {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  moods: MoodId[];
  energy: number;
  lightness: number;
  warmth: number;
  focus: number;
  contrast: number;
  instrumental: boolean;
};

const track = (
  id: string,
  title: string,
  artist: string,
  genres: string[],
  moods: MoodId[],
  energy: number,
  lightness: number,
  warmth: number,
  focus: number,
  contrast: number,
  instrumental = true,
): RecommendationTrack => ({
  id,
  title,
  artist,
  genres,
  moods,
  energy,
  lightness,
  warmth,
  focus,
  contrast,
  instrumental,
});

// Titles and artists are kept locally so recommendations work without an API key.
// Numeric values describe the listening character, not external service metadata.
export const TRACK_CATALOG: RecommendationTrack[] = [
  track("an-ending-ascent", "An Ending (Ascent)", "Brian Eno", ["ambient"], ["midnight-focus", "blue-hour", "clear-focus"], .12, .40, -.12, .96, .16),
  track("one-one", "1/1", "Brian Eno", ["ambient", "minimal"], ["open-prescription", "clear-focus", "golden-pause"], .10, .66, .12, .98, .08),
  track("avril-14th", "Avril 14th", "Aphex Twin", ["ambient", "piano"], ["midnight-focus", "clear-focus"], .16, .54, .02, .96, .13),
  track("rhubarb", "Rhubarb", "Aphex Twin", ["ambient"], ["midnight-focus", "blue-hour"], .18, .27, -.20, .93, .15),
  track("first-light", "First Light", "Harold Budd & Brian Eno", ["ambient"], ["blue-hour", "golden-pause"], .13, .58, .04, .96, .10),
  track("steep-hills", "Steep Hills of Vicodin Tears", "A Winged Victory for the Sullen", ["ambient", "modern-classical"], ["midnight-focus", "blue-hour"], .20, .31, -.14, .91, .22),
  track("abandon-window", "Abandon Window", "Jon Hopkins", ["ambient", "electronic"], ["midnight-focus", "blue-hour", "clear-focus"], .19, .34, -.22, .94, .17),
  track("creek", "Creek", "Hiroshi Yoshimura", ["ambient", "environmental"], ["clear-focus", "open-prescription"], .15, .69, -.03, .98, .08),
  track("green", "Green", "Hiroshi Yoshimura", ["ambient", "environmental"], ["golden-pause", "clear-focus"], .18, .72, .16, .97, .09),
  track("says", "Says", "Nils Frahm", ["ambient", "electronic"], ["clear-focus", "dark-current"], .47, .40, -.08, .90, .48),
  track("near-light", "Near Light", "Ólafur Arnalds", ["modern-classical", "ambient"], ["blue-hour", "clear-focus"], .31, .47, -.14, .92, .31),
  track("bibo-no-aozora", "Bibo no Aozora", "Ryuichi Sakamoto", ["modern-classical", "piano"], ["midnight-focus", "blue-hour"], .18, .38, -.12, .95, .20),
  track("andata", "andata", "Ryuichi Sakamoto", ["modern-classical", "ambient"], ["clear-focus", "open-prescription"], .20, .55, -.05, .96, .16),
  track("on-nature-daylight", "On the Nature of Daylight", "Max Richter", ["modern-classical"], ["blue-hour", "golden-pause"], .30, .45, .02, .86, .38),
  track("saman", "Saman", "Ólafur Arnalds", ["modern-classical", "piano"], ["midnight-focus", "clear-focus"], .12, .50, -.04, .97, .11),

  track("clair-de-lune", "Clair de Lune", "Claude Debussy", ["classical", "piano"], ["blue-hour", "midnight-focus"], .20, .57, -.08, .94, .23),
  track("gymnopedie-one", "Gymnopédie No. 1", "Erik Satie", ["classical", "piano"], ["clear-focus", "golden-pause"], .13, .62, .06, .98, .09),
  track("nocturne-op9-no2", "Nocturne in E-flat Major, Op. 9 No. 2", "Frédéric Chopin", ["classical", "piano"], ["midnight-focus", "golden-pause"], .24, .48, .11, .91, .24),
  track("cello-suite-prelude", "Cello Suite No. 1: Prelude", "Johann Sebastian Bach", ["classical"], ["clear-focus", "golden-pause"], .32, .62, .16, .94, .24),
  track("opening-glassworks", "Opening", "Philip Glass", ["minimal", "modern-classical"], ["clear-focus", "open-prescription"], .37, .56, -.01, .98, .28),
  track("metamorphosis-one", "Metamorphosis One", "Philip Glass", ["minimal", "piano"], ["midnight-focus", "clear-focus"], .29, .40, -.09, .97, .27),
  track("spiegel-im-spiegel", "Spiegel im Spiegel", "Arvo Pärt", ["modern-classical", "minimal"], ["clear-focus", "open-prescription"], .08, .72, .01, .99, .06),
  track("experience", "Experience", "Ludovico Einaudi", ["modern-classical", "piano"], ["sunlit-motion", "color-rush"], .62, .59, .12, .83, .55),
  track("suspirium", "Suspirium", "Thom Yorke", ["modern-classical", "piano"], ["midnight-focus", "dark-current"], .24, .28, -.15, .88, .25, false),
  track("flight-from-city", "Flight from the City", "Jóhann Jóhannsson", ["modern-classical", "ambient"], ["blue-hour", "clear-focus"], .19, .53, -.10, .95, .16),

  track("peace-piece", "Peace Piece", "Bill Evans", ["jazz", "piano"], ["golden-pause", "clear-focus"], .20, .58, .16, .94, .15),
  track("blue-in-green", "Blue in Green", "Miles Davis", ["jazz"], ["blue-hour", "midnight-focus"], .23, .31, -.08, .85, .24),
  track("naima", "Naima", "John Coltrane", ["jazz"], ["midnight-focus", "golden-pause"], .27, .38, .08, .83, .25),
  track("take-five", "Take Five", "The Dave Brubeck Quartet", ["jazz"], ["clear-focus", "sunlit-motion"], .54, .59, .10, .88, .42),
  track("moanin", "Moanin'", "Art Blakey & The Jazz Messengers", ["jazz"], ["color-rush", "sunlit-motion"], .74, .57, .21, .63, .62),
  track("sentimental-mood", "In a Sentimental Mood", "Duke Ellington & John Coltrane", ["jazz"], ["golden-pause", "midnight-focus"], .21, .43, .18, .84, .17),
  track("almost-blue", "Almost Blue", "Chet Baker", ["jazz"], ["blue-hour", "midnight-focus"], .18, .32, -.03, .78, .16, false),
  track("merry-go-round", "Merry-Go-Round", "Tigran Hamasyan", ["jazz", "piano"], ["dark-current", "clear-focus"], .57, .34, -.12, .88, .61),
  track("aruarian-dance", "Aruarian Dance", "Nujabes", ["jazz-hop", "lo-fi"], ["golden-pause", "clear-focus"], .38, .58, .13, .91, .22),
  track("reflection-eternal", "Reflection Eternal", "Nujabes", ["jazz-hop", "lo-fi"], ["blue-hour", "clear-focus"], .39, .47, -.02, .90, .23),
  track("time-moves-slow", "Time Moves Slow", "BADBADNOTGOOD", ["jazz", "soul"], ["golden-pause", "blue-hour"], .34, .46, .10, .68, .24, false),
  track("friday-morning", "Friday Morning", "Khruangbin", ["psychedelic", "soul"], ["golden-pause", "clear-focus"], .35, .66, .27, .89, .17),

  track("space-song", "Space Song", "Beach House", ["dream-pop"], ["blue-hour", "midnight-focus"], .36, .38, -.16, .69, .28, false),
  track("heaven-or-las-vegas", "Heaven or Las Vegas", "Cocteau Twins", ["dream-pop"], ["color-rush", "blue-hour"], .68, .66, -.05, .58, .56, false),
  track("sugar-for-pill", "Sugar for the Pill", "Slowdive", ["shoegaze", "dream-pop"], ["blue-hour", "clear-focus"], .43, .45, -.18, .69, .32, false),
  track("intro", "Intro", "The xx", ["indie", "minimal"], ["midnight-focus", "dark-current"], .30, .24, -.16, .94, .29),
  track("show-me-how", "Show Me How", "Men I Trust", ["dream-pop", "indie"], ["blue-hour", "golden-pause"], .34, .56, .04, .72, .18, false),
  track("apocalypse", "Apocalypse", "Cigarettes After Sex", ["dream-pop"], ["midnight-focus", "blue-hour"], .27, .30, -.11, .70, .20, false),
  track("myth", "Myth", "Beach House", ["dream-pop"], ["blue-hour", "golden-pause"], .46, .53, -.06, .68, .36, false),
  track("alison", "Alison", "Slowdive", ["shoegaze", "dream-pop"], ["blue-hour", "midnight-focus"], .39, .37, -.15, .65, .29, false),
  track("k", "K.", "Cigarettes After Sex", ["dream-pop"], ["midnight-focus", "golden-pause"], .22, .35, .00, .71, .16, false),
  track("chamber-reflection", "Chamber of Reflection", "Mac DeMarco", ["indie", "psychedelic"], ["blue-hour", "midnight-focus"], .37, .43, -.08, .67, .25, false),

  track("a-walk", "A Walk", "Tycho", ["electronic", "ambient"], ["clear-focus", "sunlit-motion"], .51, .68, .04, .94, .31),
  track("awake", "Awake", "Tycho", ["electronic", "ambient"], ["sunlit-motion", "clear-focus"], .58, .72, .10, .91, .37),
  track("two-thousand-seventeen", "Two Thousand and Seventeen", "Four Tet", ["electronic"], ["clear-focus", "golden-pause"], .55, .60, .09, .91, .36),
  track("parallel-jalebi", "Parallel Jalebi", "Four Tet", ["electronic", "minimal"], ["midnight-focus", "clear-focus"], .43, .39, -.06, .94, .27),
  track("kerala", "Kerala", "Bonobo", ["electronic", "downtempo"], ["sunlit-motion", "color-rush"], .63, .63, .12, .78, .46),
  track("cirrus", "Cirrus", "Bonobo", ["electronic", "downtempo"], ["color-rush", "clear-focus"], .67, .61, .08, .81, .51),
  track("odessa", "Odessa", "Caribou", ["electronic"], ["color-rush", "sunlit-motion"], .77, .66, .14, .61, .62, false),
  track("nuits-sonores", "Nuits Sonores", "Floating Points", ["electronic"], ["dark-current", "color-rush"], .71, .39, -.10, .76, .64),
  track("veridis-quo", "Veridis Quo", "Daft Punk", ["electronic"], ["golden-pause", "clear-focus"], .47, .52, .10, .91, .28),
  track("loud-places", "Loud Places", "Jamie xx", ["electronic", "indie"], ["sunlit-motion", "color-rush"], .69, .66, .13, .59, .50, false),
  track("emerald-rush", "Emerald Rush", "Jon Hopkins", ["electronic"], ["dark-current", "color-rush"], .82, .42, -.16, .79, .76),
  track("roygbiv", "Roygbiv", "Boards of Canada", ["electronic", "ambient"], ["golden-pause", "clear-focus"], .39, .62, .18, .92, .20),
  track("olsen", "Olson", "Boards of Canada", ["electronic", "ambient"], ["clear-focus", "blue-hour"], .16, .55, -.03, .98, .09),
  track("dayvan-cowboy", "Dayvan Cowboy", "Boards of Canada", ["electronic", "ambient"], ["blue-hour", "sunlit-motion"], .55, .52, -.08, .86, .54),

  track("tieduprightnow", "Tieduprightnow", "Parcels", ["indie", "funk"], ["sunlit-motion", "color-rush"], .79, .72, .28, .57, .55, false),
  track("keep-moving", "Keep Moving", "Jungle", ["soul", "funk"], ["sunlit-motion", "color-rush"], .82, .74, .30, .55, .57, false),
  track("lisztomania", "Lisztomania", "Phoenix", ["indie", "pop"], ["sunlit-motion", "color-rush"], .84, .76, .24, .50, .62, false),
  track("a-punk", "A-Punk", "Vampire Weekend", ["indie", "pop"], ["sunlit-motion", "color-rush"], .89, .82, .30, .44, .65, false),
  track("young-folks", "Young Folks", "Peter Bjorn and John", ["indie", "pop"], ["sunlit-motion", "golden-pause"], .67, .73, .25, .59, .41, false),
  track("walking-on-a-dream", "Walking on a Dream", "Empire of the Sun", ["electronic", "pop"], ["sunlit-motion", "color-rush"], .75, .78, .20, .53, .53, false),
  track("redbone", "Redbone", "Childish Gambino", ["soul", "psychedelic"], ["golden-pause", "color-rush"], .58, .50, .29, .58, .35, false),
  track("texas-sun", "Texas Sun", "Khruangbin & Leon Bridges", ["soul", "psychedelic"], ["golden-pause", "sunlit-motion"], .44, .68, .35, .71, .25, false),
  track("lovely-day", "Lovely Day", "Bill Withers", ["soul"], ["sunlit-motion", "golden-pause"], .70, .84, .36, .56, .43, false),
  track("breezin", "Breezin'", "George Benson", ["jazz", "soul"], ["golden-pause", "sunlit-motion"], .51, .70, .31, .83, .24),

  track("teardrop", "Teardrop", "Massive Attack", ["trip-hop", "electronic"], ["dark-current", "blue-hour"], .42, .25, -.19, .70, .39, false),
  track("roads", "Roads", "Portishead", ["trip-hop"], ["midnight-focus", "dark-current"], .23, .20, -.16, .67, .25, false),
  track("archangel", "Archangel", "Burial", ["electronic", "future-garage"], ["dark-current", "midnight-focus"], .55, .18, -.28, .76, .55),
  track("a-new-error", "A New Error", "Moderat", ["electronic"], ["dark-current", "clear-focus"], .66, .27, -.20, .84, .68),
  track("everything-right-place", "Everything in Its Right Place", "Radiohead", ["alternative", "electronic"], ["dark-current", "clear-focus"], .48, .29, -.16, .72, .43, false),
  track("angel", "Angel", "Massive Attack", ["trip-hop"], ["dark-current", "midnight-focus"], .49, .16, -.20, .63, .55, false),
  track("open-eye-signal", "Open Eye Signal", "Jon Hopkins", ["electronic"], ["dark-current", "color-rush"], .76, .30, -.21, .81, .71),
  track("night", "Night", "Balam Acab", ["electronic", "ambient"], ["midnight-focus", "dark-current"], .31, .19, -.22, .86, .31),

  track("your-hand-in-mine", "Your Hand in Mine", "Explosions in the Sky", ["post-rock"], ["clear-focus", "blue-hour"], .52, .55, -.01, .88, .48),
  track("auto-rock", "Auto Rock", "Mogwai", ["post-rock"], ["dark-current", "clear-focus"], .53, .35, -.11, .86, .53),
  track("tnt", "TNT", "Tortoise", ["post-rock", "jazz"], ["clear-focus", "open-prescription"], .45, .52, .00, .94, .30),
  track("remembrance", "Remembrance", "Balmorhea", ["post-rock", "modern-classical"], ["blue-hour", "clear-focus"], .31, .49, -.04, .93, .33),
  track("first-snow", "First Snow", "Emancipator", ["downtempo", "lo-fi"], ["clear-focus", "blue-hour"], .38, .58, -.08, .94, .23),
  track("midnight-perfect-world", "Midnight in a Perfect World", "DJ Shadow", ["trip-hop", "instrumental-hip-hop"], ["midnight-focus", "dark-current"], .43, .25, -.15, .88, .36),
  track("donut-of-heart", "Time: The Donut of the Heart", "J Dilla", ["instrumental-hip-hop", "lo-fi"], ["golden-pause", "clear-focus"], .42, .52, .18, .89, .22),
  track("feather", "Feather", "Nujabes", ["jazz-hop", "lo-fi"], ["sunlit-motion", "golden-pause"], .55, .68, .22, .72, .29, false),
];
