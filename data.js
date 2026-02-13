/**
 * Radio Rab News Portal — Demo Data
 * Realistic sample content for the island of Rab
 */

// ===========================================
// CATEGORIES & AUTHORS
// ===========================================
const CATEGORIES = ['LOKALNO', 'SPORT', 'KULTURA', 'TURIZAM', 'MORE', 'GASTRONOMIJA']

const AUTHORS = [
  'Marina Vuković',
  'Davor Petričević',
  'Ana Smokrović',
  'Ivica Barić',
  'Petra Dominković',
]

// ===========================================
// HERO ARTICLE
// ===========================================
const HERO_ARTICLE = {
  id: 0,
  category: 'LOKALNO',
  title: 'Rapska Fjera 2026: Povratak u Srednji Vijek',
  snippet:
    'Najveća kulturna manifestacija na otoku ove godine donosi rekordni program. Više od 200 sudionika, vitezovi, obrtnici i glazbenici pretvorit će Rab u živu povijesnu pozornicu od 25. do 27. srpnja.',
  aiSummary:
    'Rapska fjera ove godine slavi 20. obljetnicu. Program uključuje viteške turnire, srednjovjekovnu glazbu, sajam tradicijskih obrta i gastronomsku ponudu. Očekuje se preko 30.000 posjetitelja tijekom tri dana manifestacije.',
  image: 'https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=1200&h=800&fit=crop',
  author: 'Marina Vuković',
  date: 'Danas',
  readTime: '5 min',
}

// ===========================================
// NEWS TEMPLATES
// ===========================================
const NEWS_TEMPLATES = {
  LOKALNO: [
    {
      title: 'Započeli radovi na novom kružnom toku kod Malog Palita',
      snippet: 'Velika infrastrukturna investicija smanjit će gužve prema gradu. Radovi traju do svibnja.',
      body: '<p><b>GRAD RAB</b> — Jutros su službeno započeli radovi na izgradnji novog kružnog toka na raskrižju kod Malog Palita. Ovo je jedna od najznačajnijih investicija u prometnu infrastrukturu otoka u posljednjih deset godina.</p><p>Gradonačelnik je istaknuo kako će se ovim rješenjem trajno riješiti usko grlo koje nastaje tijekom turističke sezone.</p><ul><li>Trajanje radova: 120 dana</li><li>Izvođač: Građevinar d.o.o.</li><li>Regulacija prometa: Semafori</li></ul>',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&h=600&fit=crop',
      tags: ['infrastruktura', 'promet', 'palit']
    },
    {
      title: 'Najava prekida opskrbe električnom energijom u Mundanijama',
      snippet: 'Zbog radova na trafostanici, Mundanije će u utorak biti bez struje od 8 do 12 sati.',
      body: '<p><b>HEP OBAVIJEST</b> — Obavještavamo mještane naselja Mundanije da će zbog planiranih radova na reviziji trafostanice doći do prekida opskrbe električnom energijom.</p><div class="alert-box"><strong>Vrijeme:</strong> Utorak, 8:00 - 12:00h<br><strong>Lokacija:</strong> Srednje Mundanije i zaseok Krstini.</div><p>U slučaju nepovoljnih vremenskih prilika radovi se odgađaju.</p>',
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop',
      tags: ['struja', 'hep', 'obavijest', 'brownout']
    }
  ],
  SPORT: [
    {
      title: 'RK Rab: Rukometašice izborile nastup u prvoj ligi',
      snippet: 'Povijesni uspjeh rapskog sporta. Pobjedom nad Senjom osiguran plasman u elitu.',
      body: '<p>Nevjerojatna atmosfera u dvorani na Rabu! Naša ženska ekipa <b>RK Rab</b> ostvarila je san generacija. U odlučujućoj utakmici sezone pobijedile su vječnog rivala ekipu Senja rezultatom 28:24.</p><p>Ovo je prvi put u povijesti da jedan rapski dvoranski sport ulazi u najviši nacionalni rang natjecanja.</p>',
      image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',
      tags: ['rukomet', 'rk rab', 'uspjeh']
    }
  ],
  KULTURA: [
    {
      title: 'Otvorena 20. jubilarna izložba u galeriji "Knežev dvor"',
      snippet: 'Svečano otvorena retrospektiva rapskih umjetnika kroz dva desetljeća.',
      body: '<p>Kulturno srce grada Raba sinoć je kucalo u ritmu povijesti. Jubilarna izložba "Dvadeset godina stvaralaštva" okupila je rekordan broj posjetitelja.</p><p>Izložba ostaje otvorena do kraja ožujka, a ulaz je besplatan za sve stanovnike otoka.</p>',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
      tags: ['kultura', 'izložba', 'rab']
    }
  ],
  TURIZAM: [
    {
      title: 'Rapska plovidba: Novi trajekt "Četiri zvonika" stiže u ožujku',
      snippet: 'Moderni brod povećat će kapacitet linije Mišnjak-Stinica za 30%.',
      body: '<p>Dugo najavljivano pojačanje flote <b>Rapske plovidbe</b> konačno stiže. Novi trajekt, simbolično nazvan "Četiri zvonika", trenutno je na završnom opremanju.</p><p>Brod može primiti 110 automobila i opremljen je najmodernijim salonima za putnike u potpunosti digitaliziranim sustavom upravljanja.</p>',
      image: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop',
      tags: ['trajekt', 'promet', 'turizam']
    }
  ],
  MORE: [
    {
      title: 'Povećana aktivnost dupina u Barbatskom kanalu',
      snippet: 'Znanstvenici iz Instituta Plavi svijet mole nautičare za oprez i smanjenu brzinu.',
      body: '<p>Tijekom posljednjih tjedan dana zabilježena je povećana aktivnost skupine dobrih dupina u kanalu između Raba i Dolina. Vjeruje se da se radi o majkama s mladunčadi.</p><p><b>VAŽNO OBAVIJEST:</b> Molimo nautičare da ne prilaze životinjama i da u kanalu drže minimalnu brzinu kretanja.</p>',
      image: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=800&h=600&fit=crop',
      tags: ['priroda', 'dupini', 'more']
    }
  ],
  GASTRONOMIJA: [
    {
      title: 'Rapska torta dospjela na listu "Zaboravljeni okusi Europe"',
      snippet: 'Prestižno priznanje za našu najpoznatiju slasticu i očuvanje recepture iz 1177. godine.',
      body: '<p>Tradicija koja traje stoljećima dobila je još jedno veliko međunarodno priznanje. Europsko udruženje za očuvanje gastro-baštine uvrstilo je <b>Rapsku tortu</b> u sam vrh autentičnih slastica.</p><p>Ovo nije samo priznanje slastici, već i svim rapskim obiteljima koje čuvaju originalni recept već 850 godina.</p>',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop',
      tags: ['gastro', 'recept', 'tradicija']
    }
  ],
  OSMRTNICE: [
    {
      title: 'Posljednji ispraćaj — Ivan Ivić',
      snippet: 'Preminuo u 85. godini života. Ispraćaj u srijedu na gradskom groblju.',
      body: '<div class="osmrtnica-content"><img src="https://via.placeholder.com/400x600/020617/ffffff?text=Osmrtnica+Primjer" alt="Osmrtnica"><p>S tugom u srcu javljamo rodbini i prijateljima da nas je napustio naš dragi otac i djed.</p></div>',
      image: 'https://via.placeholder.com/400x600/020617/ffffff?text=Osmrtnica+Primjer',
      tags: ['osmrtnice']
    }
  ]
}

// ===========================================
// GENERATE ARTICLES
// ===========================================
function generateArticles() {
  const articles = []
  let id = 1

  // Generate articles from templates
  Object.entries(NEWS_TEMPLATES).forEach(([category, templates]) => {
    templates.forEach((template) => {
      const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)]
      const hoursAgo = Math.floor(Math.random() * 72) + 1

      let dateStr
      if (hoursAgo < 1) {
        dateStr = 'Upravo sada'
      } else if (hoursAgo < 24) {
        dateStr = `prije ${hoursAgo} h`
      } else {
        const days = Math.floor(hoursAgo / 24)
        dateStr = days === 1 ? 'Jučer' : `prije ${days} dana`
      }

      articles.push({
        id: id++,
        category: category,
        title: template.title,
        snippet: template.snippet,
        image: template.image,
        author: author,
        date: dateStr,
        readTime: `${Math.floor(Math.random() * 4) + 2} min`,
      })
    })
  })

  // Shuffle articles
  return articles.sort(() => Math.random() - 0.5)
}

const ALL_ARTICLES = generateArticles()

// Migration-ready static data bridges (used by UI for demos)
const MARKET_ITEMS = [
  {
    title: 'Domaće Maslinovo Ulje',
    seller: 'OPG Kaštelan',
    price: '18 €/l',
    image: 'https://picsum.photos/seed/oil/400/300',
  },
  {
    title: 'Rapska Torta',
    seller: 'Vilma Slastice',
    price: '25 €',
    image: 'https://picsum.photos/seed/cake/400/300',
  },
  {
    title: 'Med od Kadulje',
    seller: 'Pčelarstvo Krstić',
    price: '12 €',
    image: 'https://picsum.photos/seed/honey/400/300',
  },
  {
    title: 'Ovčji Sir',
    seller: 'OPG Gvačić',
    price: '30 €/kg',
    image: 'https://picsum.photos/seed/cheese/400/300',
  },
  {
    title: 'Suhe Smokve',
    seller: 'Domaća Radinost',
    price: '8 €',
    image: 'https://picsum.photos/seed/figs/400/300',
  },
  {
    title: 'Eko Povrće Košarica',
    seller: 'Vrtovi Raba',
    price: '15 €',
    image: 'https://picsum.photos/seed/veg/400/300',
  },
]

const VIDEO_ITEMS = [
  {
    title: 'Nevera pogodila luku Rab',
    duration: '0:45',
    views: '1.2k',
    image: 'https://picsum.photos/seed/storm/300/500',
  },
  {
    title: 'Svečano otvorenje Fjere',
    duration: '1:20',
    views: '3.5k',
    image: 'https://picsum.photos/seed/fjera/300/500',
  },
  {
    title: 'Novi trajekt "Otok Rab"',
    duration: '0:55',
    views: '800',
    image: 'https://picsum.photos/seed/ferry/300/500',
  },
  {
    title: 'Intervju: Gradonačelnik',
    duration: '2:15',
    views: '2.1k',
    image: 'https://picsum.photos/seed/mayor/300/500',
  },
  {
    title: 'Sportski vikend: Sažetak',
    duration: '1:05',
    views: '950',
    image: 'https://picsum.photos/seed/sport/300/500',
  },
]
