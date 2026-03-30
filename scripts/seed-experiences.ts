import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Experience = {
  title: string
  description: string
  category: string
  location: string | null
  tags: string[]
  effort: 'low' | 'medium' | 'high'
  estimated_cost_usd: number | null
}

const experiences: Experience[] = [
  // Travel
  {
    title: 'See the Northern Lights in Iceland',
    description: 'Watch the aurora borealis dance across the sky from Reykjavik or the remote countryside.',
    category: 'Travel',
    location: 'Iceland',
    tags: ['nature', 'night sky', 'winter'],
    effort: 'high',
    estimated_cost_usd: 3000,
  },
  {
    title: 'Take the Trans-Siberian Railway',
    description: 'Ride the longest railway in the world from Moscow to Vladivostok over 9,289 km.',
    category: 'Travel',
    location: 'Russia',
    tags: ['train', 'epic journey', 'overland'],
    effort: 'high',
    estimated_cost_usd: 2500,
  },
  {
    title: 'Spend a week in a Japanese ryokan',
    description: 'Stay in a traditional inn, soak in an onsen, and eat kaiseki meals prepared by hand.',
    category: 'Travel',
    location: 'Japan',
    tags: ['culture', 'wellness', 'food'],
    effort: 'medium',
    estimated_cost_usd: 2000,
  },
  {
    title: 'Road trip Route 66 end to end',
    description: 'Drive the 3,940 miles from Chicago to Santa Monica stopping at diners and roadside oddities.',
    category: 'Travel',
    location: 'United States',
    tags: ['road trip', 'americana', 'driving'],
    effort: 'high',
    estimated_cost_usd: 4000,
  },
  {
    title: 'Visit Machu Picchu at sunrise',
    description: 'Hike the Inca Trail and arrive at the Sun Gate as the mist lifts over the ruins.',
    category: 'Travel',
    location: 'Peru',
    tags: ['hiking', 'history', 'sunrise'],
    effort: 'high',
    estimated_cost_usd: 3500,
  },
  {
    title: 'Explore the Faroe Islands',
    description: 'Hike dramatic cliffs, hidden sea stacks, and grass-roofed villages between Iceland and Norway.',
    category: 'Travel',
    location: 'Faroe Islands',
    tags: ['nature', 'hiking', 'remote'],
    effort: 'medium',
    estimated_cost_usd: 2800,
  },
  {
    title: 'Sail through the Greek islands',
    description: 'Charter a sailboat and island-hop from Santorini to Rhodes over two weeks.',
    category: 'Travel',
    location: 'Greece',
    tags: ['sailing', 'islands', 'summer'],
    effort: 'high',
    estimated_cost_usd: 5000,
  },
  {
    title: 'Attend Carnival in Rio de Janeiro',
    description: 'Experience the world\'s largest carnival parade with samba schools and elaborate floats.',
    category: 'Travel',
    location: 'Brazil',
    tags: ['festival', 'dance', 'culture'],
    effort: 'medium',
    estimated_cost_usd: 2500,
  },
  {
    title: 'Safari in the Serengeti during migration',
    description: 'Witness over a million wildebeest and zebra cross the Mara River in Tanzania.',
    category: 'Travel',
    location: 'Tanzania',
    tags: ['wildlife', 'nature', 'photography'],
    effort: 'high',
    estimated_cost_usd: 6000,
  },
  {
    title: 'Cycle through the Vietnamese countryside',
    description: 'Pedal rice paddies and village paths from Hanoi to Ho Chi Minh City over several weeks.',
    category: 'Travel',
    location: 'Vietnam',
    tags: ['cycling', 'culture', 'adventure'],
    effort: 'high',
    estimated_cost_usd: 2000,
  },

  // Food & Drink
  {
    title: 'Eat at a three-Michelin-star restaurant',
    description: 'Book a tasting menu at one of the world\'s top-rated dining establishments.',
    category: 'Food & Drink',
    location: null,
    tags: ['fine dining', 'tasting menu', 'special occasion'],
    effort: 'low',
    estimated_cost_usd: 600,
  },
  {
    title: 'Take a pasta-making class in Bologna',
    description: 'Learn to hand-roll tagliatelle and fill tortellini with a local nonna in the food capital of Italy.',
    category: 'Food & Drink',
    location: 'Italy',
    tags: ['cooking', 'Italian', 'hands-on'],
    effort: 'medium',
    estimated_cost_usd: 800,
  },
  {
    title: 'Drink whisky at the source on Islay',
    description: 'Tour the smoky distilleries of Islay and taste single malts directly from the cask.',
    category: 'Food & Drink',
    location: 'Scotland',
    tags: ['whisky', 'distillery', 'tasting'],
    effort: 'medium',
    estimated_cost_usd: 1500,
  },
  {
    title: 'Eat your way through a night market in Bangkok',
    description: 'Sample pad krapow, mango sticky rice, and grilled street skewers at Jodd Fairs or Or Tor Kor.',
    category: 'Food & Drink',
    location: 'Thailand',
    tags: ['street food', 'night market', 'Thai cuisine'],
    effort: 'low',
    estimated_cost_usd: 50,
  },
  {
    title: 'Brew your own batch of beer',
    description: 'Take a home-brewing course and bottle a custom IPA or stout from scratch.',
    category: 'Food & Drink',
    location: null,
    tags: ['brewing', 'craft beer', 'DIY'],
    effort: 'medium',
    estimated_cost_usd: 150,
  },

  // Adventure & Sport
  {
    title: 'Skydive over a scenic landscape',
    description: 'Jump from 15,000 ft tandem with a professional over a coastline, desert, or mountain range.',
    category: 'Adventure',
    location: null,
    tags: ['skydiving', 'adrenaline', 'bucket list'],
    effort: 'low',
    estimated_cost_usd: 300,
  },
  {
    title: 'Climb a 14er in Colorado',
    description: 'Summit one of Colorado\'s 53 peaks over 14,000 ft — start with Mount Bierstadt for beginners.',
    category: 'Adventure',
    location: 'Colorado, USA',
    tags: ['hiking', 'mountaineering', 'altitude'],
    effort: 'medium',
    estimated_cost_usd: 200,
  },
  {
    title: 'Learn to surf in Portugal',
    description: 'Take a week-long surf camp on the Alentejo coast and catch your first green wave.',
    category: 'Adventure',
    location: 'Portugal',
    tags: ['surfing', 'ocean', 'learning'],
    effort: 'medium',
    estimated_cost_usd: 1200,
  },
  {
    title: 'Run a marathon',
    description: 'Train for and complete a full 26.2-mile race in a major city like New York, Chicago, or London.',
    category: 'Adventure',
    location: null,
    tags: ['running', 'fitness', 'endurance'],
    effort: 'high',
    estimated_cost_usd: 300,
  },
  {
    title: 'Go white-water rafting on the Zambezi',
    description: 'Navigate Class 5 rapids below Victoria Falls — one of the best rafting runs on Earth.',
    category: 'Adventure',
    location: 'Zambia/Zimbabwe',
    tags: ['rafting', 'adrenaline', 'water'],
    effort: 'medium',
    estimated_cost_usd: 150,
  },
  {
    title: 'Complete a multi-day backpacking trip',
    description: 'Carry everything you need and hike 50+ miles over four or more days in a national park.',
    category: 'Adventure',
    location: null,
    tags: ['backpacking', 'wilderness', 'self-reliance'],
    effort: 'high',
    estimated_cost_usd: 400,
  },
  {
    title: 'Learn to rock climb outdoors',
    description: 'Graduate from the gym to real rock with a guide, starting with single-pitch trad or sport climbing.',
    category: 'Adventure',
    location: null,
    tags: ['climbing', 'outdoors', 'learning'],
    effort: 'medium',
    estimated_cost_usd: 300,
  },

  // Culture & Arts
  {
    title: 'Attend a live opera performance at La Scala',
    description: 'See a world-class production at the most famous opera house in the world in Milan.',
    category: 'Culture',
    location: 'Italy',
    tags: ['opera', 'music', 'performance'],
    effort: 'medium',
    estimated_cost_usd: 500,
  },
  {
    title: 'Visit every room of the Louvre',
    description: 'Spend multiple days exploring all 35,000 works across the world\'s largest art museum.',
    category: 'Culture',
    location: 'France',
    tags: ['art', 'museum', 'history'],
    effort: 'medium',
    estimated_cost_usd: 300,
  },
  {
    title: 'Learn a second language to conversational level',
    description: 'Study consistently for a year and hold a real conversation with a native speaker.',
    category: 'Culture',
    location: null,
    tags: ['language', 'learning', 'long-term'],
    effort: 'high',
    estimated_cost_usd: 300,
  },
  {
    title: 'See a show on Broadway',
    description: 'Watch a world-premiere or long-running hit in a historic New York City theater.',
    category: 'Culture',
    location: 'New York, USA',
    tags: ['theater', 'performance', 'music'],
    effort: 'low',
    estimated_cost_usd: 200,
  },
  {
    title: 'Attend the Edinburgh Festival Fringe',
    description: 'See dozens of comedy, theater, and dance shows over a few days at the world\'s largest arts festival.',
    category: 'Culture',
    location: 'Scotland',
    tags: ['festival', 'comedy', 'theater'],
    effort: 'medium',
    estimated_cost_usd: 800,
  },
  {
    title: 'Take a pottery wheel class',
    description: 'Learn to center clay and throw your first bowl or mug in a hands-on studio course.',
    category: 'Culture',
    location: null,
    tags: ['pottery', 'ceramics', 'crafts'],
    effort: 'low',
    estimated_cost_usd: 80,
  },
  {
    title: 'Read 100 books in a year',
    description: 'Commit to reading two books per week across genres — fiction, non-fiction, classics, and poetry.',
    category: 'Culture',
    location: null,
    tags: ['reading', 'learning', 'literature'],
    effort: 'high',
    estimated_cost_usd: 500,
  },

  // Wellness & Mindfulness
  {
    title: 'Do a 10-day Vipassana silent meditation retreat',
    description: 'Sit in complete silence for ten days with no phone or reading — a full reset for the mind.',
    category: 'Wellness',
    location: null,
    tags: ['meditation', 'silence', 'mindfulness'],
    effort: 'high',
    estimated_cost_usd: 0,
  },
  {
    title: 'Complete a 30-day yoga challenge',
    description: 'Practice yoga every single day for a month using a structured online or in-studio program.',
    category: 'Wellness',
    location: null,
    tags: ['yoga', 'fitness', 'habit'],
    effort: 'medium',
    estimated_cost_usd: 60,
  },
  {
    title: 'Float in a sensory deprivation tank',
    description: 'Spend 90 minutes in a float pod with saltwater, darkness, and total silence.',
    category: 'Wellness',
    location: null,
    tags: ['float tank', 'relaxation', 'mindfulness'],
    effort: 'low',
    estimated_cost_usd: 80,
  },
  {
    title: 'Do a digital detox for one full week',
    description: 'No phone, no laptop, no social media — spend seven days fully offline.',
    category: 'Wellness',
    location: null,
    tags: ['digital detox', 'mindfulness', 'rest'],
    effort: 'medium',
    estimated_cost_usd: 0,
  },
  {
    title: 'Spend a night alone in the wilderness',
    description: 'Camp solo — no camping neighbor, no phone signal — and sit with your own thoughts overnight.',
    category: 'Wellness',
    location: null,
    tags: ['solitude', 'nature', 'camping'],
    effort: 'medium',
    estimated_cost_usd: 50,
  },

  // Learning & Skills
  {
    title: 'Build something with your hands from raw materials',
    description: 'Construct a piece of furniture, a garden shed, or a wooden kayak entirely from scratch.',
    category: 'Learning',
    location: null,
    tags: ['woodworking', 'making', 'DIY'],
    effort: 'high',
    estimated_cost_usd: 500,
  },
  {
    title: 'Learn to play a musical instrument',
    description: 'Take lessons for a full year — piano, guitar, violin, drums — and perform something for an audience.',
    category: 'Learning',
    location: null,
    tags: ['music', 'instrument', 'long-term'],
    effort: 'high',
    estimated_cost_usd: 600,
  },
  {
    title: 'Get an amateur radio license',
    description: 'Study for and pass the Technician exam, then make your first HF contact.',
    category: 'Learning',
    location: null,
    tags: ['radio', 'electronics', 'technical'],
    effort: 'medium',
    estimated_cost_usd: 150,
  },
  {
    title: 'Complete an online university course in a new field',
    description: 'Audit or enroll in a full semester MIT, Yale, or Stanford open course and finish every assignment.',
    category: 'Learning',
    location: null,
    tags: ['education', 'online', 'self-improvement'],
    effort: 'high',
    estimated_cost_usd: 0,
  },
  {
    title: 'Learn to sail a keelboat',
    description: 'Take a certified sailing course and earn your Day Skipper or ASA 101/103 certification.',
    category: 'Learning',
    location: null,
    tags: ['sailing', 'certification', 'water'],
    effort: 'medium',
    estimated_cost_usd: 700,
  },
  {
    title: 'Master sourdough bread baking',
    description: 'Grow a starter from scratch and bake a loaf with a consistent open crumb and blistered crust.',
    category: 'Learning',
    location: null,
    tags: ['baking', 'fermentation', 'food'],
    effort: 'medium',
    estimated_cost_usd: 50,
  },

  // Social & Connection
  {
    title: 'Write and send 52 handwritten letters in a year',
    description: 'Reconnect with one person per week through a handwritten letter — friends, family, mentors.',
    category: 'Connection',
    location: null,
    tags: ['writing', 'relationships', 'intentional'],
    effort: 'medium',
    estimated_cost_usd: 60,
  },
  {
    title: 'Volunteer for two weeks abroad',
    description: 'Give your time to a vetted conservation, education, or construction project in another country.',
    category: 'Connection',
    location: null,
    tags: ['volunteering', 'service', 'travel'],
    effort: 'high',
    estimated_cost_usd: 1500,
  },
  {
    title: 'Host a dinner party for people who don\'t know each other',
    description: 'Curate a guest list of strangers with interesting backgrounds and facilitate meaningful conversation.',
    category: 'Connection',
    location: null,
    tags: ['hosting', 'community', 'food'],
    effort: 'low',
    estimated_cost_usd: 150,
  },
  {
    title: 'Spend a week with grandparents recording their stories',
    description: 'Film or transcribe their life stories, recipes, and family history before it\'s gone.',
    category: 'Connection',
    location: null,
    tags: ['family', 'storytelling', 'memory'],
    effort: 'medium',
    estimated_cost_usd: 100,
  },

  // Nature & Environment
  {
    title: 'Watch a total solar eclipse in the path of totality',
    description: 'Travel to the narrow band of complete darkness and experience the corona with your own eyes.',
    category: 'Nature',
    location: null,
    tags: ['astronomy', 'rare event', 'travel'],
    effort: 'medium',
    estimated_cost_usd: 800,
  },
  {
    title: 'Plant 100 trees',
    description: 'Organize a planting day with a local conservation group or on private land — and watch them grow.',
    category: 'Nature',
    location: null,
    tags: ['environment', 'conservation', 'legacy'],
    effort: 'medium',
    estimated_cost_usd: 200,
  },
  {
    title: 'Stargaze from a certified Dark Sky Reserve',
    description: 'Drive far from light pollution and see the Milky Way with the naked eye for the first time.',
    category: 'Nature',
    location: null,
    tags: ['astronomy', 'night sky', 'outdoors'],
    effort: 'low',
    estimated_cost_usd: 100,
  },
  {
    title: 'Swim in bioluminescent water',
    description: 'Kayak or swim at night in one of the world\'s rare bioluminescent bays — Vieques, Puerto Rico is the brightest.',
    category: 'Nature',
    location: 'Puerto Rico',
    tags: ['ocean', 'bioluminescence', 'night'],
    effort: 'medium',
    estimated_cost_usd: 600,
  },
  {
    title: 'Go whale watching on an open-ocean research vessel',
    description: 'Join a citizen-science whale research trip and help collect behavioral data in the field.',
    category: 'Nature',
    location: null,
    tags: ['wildlife', 'ocean', 'science'],
    effort: 'medium',
    estimated_cost_usd: 500,
  },
]

async function seed() {
  console.log(`Seeding ${experiences.length} experiences...`)

  const { data, error } = await supabase
    .from('experiences')
    .insert(experiences)
    .select()

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`Done. Inserted ${data.length} rows.`)
}

seed()
