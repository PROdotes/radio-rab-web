/**
 * Radio Rab News Portal — Demo Data
 * Realistic sample content for the island of Rab
 */

// ===========================================
// CATEGORIES & AUTHORS
// ===========================================
const CATEGORIES = ['LOKALNO', 'SPORT', 'KULTURA', 'TURIZAM', 'MORE', 'GASTRONOMIJA'];

const AUTHORS = [
    'Marina Vuković',
    'Davor Petričević',
    'Ana Smokrović',
    'Ivica Barić',
    'Petra Dominković'
];

// ===========================================
// HERO ARTICLE
// ===========================================
const HERO_ARTICLE = {
    id: 0,
    category: 'LOKALNO',
    title: 'Rapska Fjera 2026: Povratak u Srednji Vijek',
    snippet: 'Najveća kulturna manifestacija na otoku ove godine donosi rekordni program. Više od 200 sudionika, vitezovi, obrtnici i glazbenici pretvorit će Rab u živu povijesnu pozornicu od 25. do 27. srpnja.',
    aiSummary: 'Rapska fjera ove godine slavi 20. obljetnicu. Program uključuje viteške turnire, srednjovjekovnu glazbu, sajam tradicijskih obrta i gastronomsku ponudu. Očekuje se preko 30.000 posjetitelja tijekom tri dana manifestacije.',
    image: 'https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=1200&h=800&fit=crop',
    author: 'Marina Vuković',
    date: 'Danas',
    readTime: '5 min'
};

// ===========================================
// NEWS TEMPLATES
// ===========================================
const NEWS_TEMPLATES = {
    LOKALNO: [
        {
            title: 'Grad Rab dobiva novu punionicu za električna vozila',
            snippet: 'U sklopu projekta zelene mobilnosti, na parkiralištu kod Providura instalirana je brza punionica snage 150 kW.',
            image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop'
        },
        {
            title: 'Obnovljena šetnica od Banjola do Padove',
            snippet: 'Nakon šest mjeseci radova, popularna obalna staza ponovno je otvorena za šetače i bicikliste.',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
        },
        {
            title: 'Rekordna prijava djece u rapske vrtiće',
            snippet: 'Ove godine upisano je 45 novih mališana, što je porast od 20% u odnosu na prošlu godinu.',
            image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&h=600&fit=crop'
        },
        {
            title: 'Novi vodovodni krak za Kampor',
            snippet: 'Investicija vrijedna 2 milijuna eura osigurat će stabilnu opskrbu vodom tijekom ljetnih mjeseci.',
            image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop'
        },
        {
            title: 'Komunalno poduzeće nabavilo novi kamion za odvoz otpada',
            snippet: 'Moderno vozilo smanjit će buku i emisije, a opremljeno je sustavom za automatsko podizanje kontejnera.',
            image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop'
        },
        {
            title: 'Povijesna jezgra dobiva novo rasvjetno tijelo',
            snippet: 'LED rasvjeta smanjit će potrošnju energije za 60% i bolje istaknuti arhitektonske detalje.',
            image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=600&fit=crop'
        },
        {
            title: 'Otvoreni natječaj za zakup gradskih lokala',
            snippet: 'Grad nudi pet poslovnih prostora u staroj jezgri pod povoljnim uvjetima za mlade poduzetnike.',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop'
        },
        {
            title: 'Besplatni tečaj digitalnih vještina za umirovljenike',
            snippet: 'Gradska knjižnica organizira radionicu korištenja pametnih telefona i interneta.',
            image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop'
        }
    ],
    SPORT: [
        {
            title: 'RK Rab plasirao se u finale Kupa Hrvatske',
            snippet: 'Rukometaši ostvarili povijesni uspjeh pobjedom protiv Dubrave. Finale se igra u Zagrebu 15. ožujka.',
            image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop'
        },
        {
            title: 'Otvoreno natjecanje u boćanju na Barbatu',
            snippet: 'Tradicionalni turnir okupio je 32 ekipe s cijelog otoka i okolnih mjesta.',
            image: 'https://images.unsplash.com/photo-1461896836934- voices?w=800&h=600&fit=crop'
        },
        {
            title: 'Mladi vaterpolisti osvojili drugo mjesto',
            snippet: 'Kadeti VK Raba vratili se s regionalne lige sa srebrnom medaljom.',
            image: 'https://images.unsplash.com/photo-1560090995-01632a28895b?w=800&h=600&fit=crop'
        },
        {
            title: 'Ultra maraton "Rab 100" privukao 500 trkača',
            snippet: 'Međunarodna utrka kroz rapske šume i obalu oduševila sudionike iz 15 zemalja.',
            image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop'
        },
        {
            title: 'Novi teren za padel u Supetarskoj Dragi',
            snippet: 'Popularni sport dobio prvo igralište na otoku, otvorenje predviđeno za svibanj.',
            image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop'
        },
        {
            title: 'Jedriličarska regata "Rab Open" ovog vikenda',
            snippet: 'Očekuje se nastup 40 jedrilica u klasi Optimist i Laser.',
            image: 'https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=800&h=600&fit=crop'
        },
        {
            title: 'Ronilački klub organizira školu za početnike',
            snippet: 'Besplatni tečaj ronjenja za mlade od 12 do 18 godina počinje u lipnju.',
            image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop'
        },
        {
            title: 'Biciklistička staza oko otoka službeno označena',
            snippet: '85 kilometara rute dobilo je službenu signalizaciju i odmorišta.',
            image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&h=600&fit=crop'
        }
    ],
    KULTURA: [
        {
            title: 'Izložba "Rab kroz objektiv" u Kneževoj palači',
            snippet: 'Retrospektiva povijesnih fotografija otoka od 1880. do danas otvorena do kraja veljače.',
            image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop'
        },
        {
            title: 'Koncert klape Kampanel na glavnom trgu',
            snippet: 'Tradicionalna dalmatinska glazba ispunit će večer na Trgu Municipium Arba.',
            image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600&fit=crop'
        },
        {
            title: 'Ljetno kino na Komrčaru počinje u lipnju',
            snippet: 'Program uključuje 30 filmova, od klasika do najnovijih blockbustera.',
            image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop'
        },
        {
            title: 'Radionica izrade tradicijskih čipki',
            snippet: 'Rapska čipka, nematerijalno kulturno dobro UNESCO-a, tema je trodnevne radionice.',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
        },
        {
            title: 'Festival kratkog filma "Rab Film Fest"',
            snippet: 'Natjecateljski program predstavlja 25 filmova autora iz cijele regije.',
            image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=600&fit=crop'
        },
        {
            title: 'Promocija knjige o rapskim legendama',
            snippet: 'Autor Ivan Medanić predstavit će zbirku prikupljenih priča i predaja.',
            image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop'
        },
        {
            title: 'Jazz večeri u Loži svaki četvrtak',
            snippet: 'Domaći i gostujući glazbenici nastupaju uz besplatan ulaz.',
            image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=600&fit=crop'
        },
        {
            title: 'Restauracija freske u crkvi sv. Justine',
            snippet: 'Konzervatori rade na obnovi djela iz 15. stoljeća vrijednog kulturnog naslijeđa.',
            image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop'
        }
    ],
    TURIZAM: [
        {
            title: 'Rekordne najave za ljetnu sezonu 2026',
            snippet: 'Turistička zajednica bilježi 15% više rezervacija u odnosu na prošlu godinu.',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop'
        },
        {
            title: 'Novi katamaran povezuje Rab s Rijekom',
            snippet: 'Brza linija skraćuje putovanje na sat i pol, polasci svakog dana od lipnja.',
            image: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop'
        },
        {
            title: 'Plaža Suha Punta dobila Plavu zastavu',
            snippet: 'Prestižna oznaka kvalitete dodijeljena je za čistoću mora i uređenost plaže.',
            image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop'
        },
        {
            title: 'E-bike sharing stiže na Rab',
            snippet: 'Sustav od 50 električnih bicikala bit će dostupan na šest lokacija od travnja.',
            image: 'https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=800&h=600&fit=crop'
        },
        {
            title: 'Glamping resort otvara vrata u Loparu',
            snippet: 'Luksuzni šatori s pogledom na Rajsku plažu primaju prve goste u svibnju.',
            image: 'https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?w=800&h=600&fit=crop'
        },
        {
            title: 'Aplikacija "Visit Rab" dostupna za preuzimanje',
            snippet: 'Interaktivni vodič s AR funkcijama otkriva skrivene ljepote otoka.',
            image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop'
        },
        {
            title: 'Obnovljen poučni put "Staze sv. Kristofora"',
            snippet: 'Hodočasnička ruta dobila je nove informativne ploče i klupe za odmor.',
            image: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800&h=600&fit=crop'
        },
        {
            title: 'Certifikat "Sustainable Rab" za zeleni turizam',
            snippet: 'Otok dobio međunarodno priznanje za održive turističke prakse.',
            image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop'
        }
    ],
    MORE: [
        {
            title: 'Morski konjici primijećeni u Supetarskoj Dragi',
            snippet: 'Rijetka pojava koja svjedoči o očuvanosti podmorja rapskog akvatorija.',
            image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop'
        },
        {
            title: 'Lučka kapetanija upozorava na jaku buru',
            snippet: 'Očekuju se udari do 100 km/h. Preporučuje se izbjegavanje plovidbe.',
            image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop'
        },
        {
            title: 'Počela sezona plivanja – more na 18°C',
            snippet: 'Hrabri kupači već uživaju na rapskim plažama unatoč proljetnim temperaturama.',
            image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&h=600&fit=crop'
        },
        {
            title: 'Ribari upozoravaju na invazivnu vrstu',
            snippet: 'Plava rakovica sve češće u mrežama – traži se plan upravljanja.',
            image: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&h=600&fit=crop'
        },
        {
            title: 'Podvodni park skulptura u planu',
            snippet: 'Umjetnički projekt koji bi privukao ronioce i zaštitio morsko dno.',
            image: 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=800&h=600&fit=crop'
        },
        {
            title: 'Čišćenje podmorja okupilo 50 volontera',
            snippet: 'Akcija "Čisto more" rezultirala uklanjanjem 200 kg otpada iz uvala.',
            image: 'https://images.unsplash.com/photo-1520879348138-ab4e6b8c1a3b?w=800&h=600&fit=crop'
        }
    ],
    GASTRONOMIJA: [
        {
            title: 'Rapska torta proglašena najboljom tradicionalnom slasticom',
            snippet: 'Nacionalno povjerenstvo nagradilo lokalnu slastičarnicu za autentičan recept.',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop'
        },
        {
            title: 'Festival maslinovog ulja u Mundanijama',
            snippet: 'Proizvođači predstavljaju ulja nove berbe uz degustacije i radionice.',
            image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&h=600&fit=crop'
        },
        {
            title: 'Novi restoran s Michelinovom preporukom',
            snippet: '"Konoba More" uvrštena u Michelin vodič za iznimnu riblju kuhinju.',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'
        },
        {
            title: 'Sajam domaćih proizvoda ovog vikenda',
            snippet: 'Med, sir, rakija i marmelada od smokava – sve s otoka na jednom mjestu.',
            image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=600&fit=crop'
        },
        {
            title: 'Vinogradari bilježe izvrsnu berbu',
            snippet: 'Sorte žlahtina i vrbnička žlahtina ove godine posebno kvalitetne.',
            image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop'
        },
        {
            title: 'Kulinarska škola za djecu u gradskoj knjižnici',
            snippet: 'Mali kuhari uče pripremati tradicionalna rapska jela svake subote.',
            image: 'https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=800&h=600&fit=crop'
        }
    ]
};

// ===========================================
// GENERATE ARTICLES
// ===========================================
function generateArticles() {
    const articles = [];
    let id = 1;

    // Generate articles from templates
    Object.entries(NEWS_TEMPLATES).forEach(([category, templates]) => {
        templates.forEach(template => {
            const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
            const hoursAgo = Math.floor(Math.random() * 72) + 1;

            let dateStr;
            if (hoursAgo < 1) {
                dateStr = 'Upravo sada';
            } else if (hoursAgo < 24) {
                dateStr = `prije ${hoursAgo} h`;
            } else {
                const days = Math.floor(hoursAgo / 24);
                dateStr = days === 1 ? 'Jučer' : `prije ${days} dana`;
            }

            articles.push({
                id: id++,
                category: category,
                title: template.title,
                snippet: template.snippet,
                image: template.image,
                author: author,
                date: dateStr,
                readTime: `${Math.floor(Math.random() * 4) + 2} min`
            });
        });
    });

    // Shuffle articles
    return articles.sort(() => Math.random() - 0.5);
}

const ALL_ARTICLES = generateArticles();
