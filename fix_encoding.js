const fs = require('fs');

const files = ['map.js', 'ui.js'];

const replacements = [
    [/BrojaÄ\s?i/g, 'Brojači'],
    [/uÅ¾ivo/g, 'uživo'],
    [/KakvoÄ‡a/g, 'Kakvoća'],
    [/PodruÄ\s?je/g, 'Područje'],
    [/unutraÅ¡njost/g, 'unutrašnjost'],
    [/PoÅ¡iljatelj/g, 'Pošiljatelj'],
    [/PokuÅ¡ajte/g, 'Pokušajte'],
    [/sluÅ¡anje/g, 'slušanje'],
    [/Ä\s?itanja/g, 'čitanja'],
    [/saÅ¾etak/g, 'sažetak'],
    [/Ä\s?lanka/g, 'članka'],
    [/UÅ½IVO/g, 'UŽIVO'],
    [/ðŸŽµ/g, '🎵'],
    [/âš ï¸/g, '⚠️'],
    [/Slojevi karte/g, 'Slojevi karte'], // Just in case it's actually mangled but looks okay
    [/Â·/g, '·']
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    replacements.forEach(([regex, replacement]) => {
        content = content.replace(regex, replacement);
    });
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed ${file}`);
    } else {
        console.log(`${file} already okay or no matches found.`);
    }
});
