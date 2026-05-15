// Pixel UI assets inspired by Pxlkit's grid icon format and 8bitcn's chunky UI style.
// Icons here are hand-authored for this game so the project stays self-contained.
const PIXEL_ICONS = {
    coin: {
        size: 16,
        palette: { G: '#d99528', Y: '#ffd45f', D: '#8d5a1f', W: '#fff4b8' },
        grid: [
            '................',
            '.....DDDDDD.....',
            '...DDYYYYYYDD...',
            '..DYYYYWWYYYYD..',
            '..DYYYGGGGYYYD..',
            '.DYYYGYYYYGYYD.',
            '.DYYYGYYYYGYYD.',
            '.DYYYGYYYYGYYD.',
            '.DYYYGYYYYGYYD.',
            '.DYYYGGGGYYYD.',
            '..DYYYYYYYYD...',
            '..DYYYYYYYYD...',
            '...DDYYYYDD....',
            '.....DDDD......',
            '................',
            '................'
        ]
    },
    book: {
        size: 16,
        palette: { B: '#5f8fa8', L: '#d9edf3', D: '#385c71', P: '#fff8df' },
        grid: [
            '................',
            '..DDDD..DDDD....',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLD.DLLBD...',
            '.DBLLDDDDBD...',
            '..DDDP.PDDD....',
            '....P...P......',
            '................',
            '................'
        ]
    },
    seed: {
        size: 16,
        palette: { G: '#6f9b73', L: '#9fcb86', D: '#416642', B: '#8f6a45' },
        grid: [
            '................',
            '.......D........',
            '......DLD.......',
            '.....DLLLD......',
            '......DLD.......',
            '.......D........',
            '....L..D..L.....',
            '...LLL.D.LLL....',
            '....L..D..L.....',
            '.......D........',
            '......DDD.......',
            '.....DBBBD......',
            '....DBBBBBD.....',
            '....DDBBBDD.....',
            '................',
            '................'
        ]
    },
    hammer: {
        size: 16,
        palette: { S: '#9aa6a3', D: '#5d6662', B: '#8f6a45', H: '#c28a4a' },
        grid: [
            '................',
            '..DDDDDD........',
            '.DSSSSSSD.......',
            '.DSSSSSSD.......',
            '..DDHHDD........',
            '....HH..........',
            '....HH..........',
            '....HHH.........',
            '.....HH.........',
            '.....HHH........',
            '......HH........',
            '......HHH.......',
            '.......HH.......',
            '.......BB.......',
            '................',
            '................'
        ]
    },
    market: {
        size: 16,
        palette: { B: '#5f8fa8', G: '#6f9b73', R: '#c95c4a', Y: '#ffd979', D: '#36423b' },
        grid: [
            '................',
            '...........GG...',
            '..........GGG...',
            '.........GGGG...',
            '........GGGGG...',
            '.......GGG.DD...',
            '......GGG..D....',
            '..BB.GGG........',
            '..BBGGG.........',
            '..BBBB..........',
            '..BBBB....RR....',
            '..BBBB...RRRR...',
            '..BBBB..RRRRRR..',
            '..DDDDDDDDDDDD..',
            '................',
            '................'
        ]
    },
    order: {
        size: 16,
        palette: { B: '#8f6a45', P: '#fff8df', D: '#5d432c', G: '#6f9b73' },
        grid: [
            '................',
            '....DDDDDD......',
            '...DBBBBBBD.....',
            '..DBPPPPPBD.....',
            '..DBPGPGPBD.....',
            '..DBPPPPPBD.....',
            '..DBPGPGPBD.....',
            '..DBPPPPPBD.....',
            '..DBPGPGPBD.....',
            '..DBPPPPPBD.....',
            '..DBBBBBBBD.....',
            '..DDDDDDDDD.....',
            '................',
            '................',
            '................',
            '................'
        ]
    },
    gear: {
        size: 16,
        palette: { S: '#9aa6a3', D: '#53645c', L: '#dce6df' },
        grid: [
            '................',
            '.....D..D.......',
            '....DSLLSD......',
            '..D.DSLLSD.D....',
            '..DSDSSSSD.D....',
            '...SSDLLDSS.....',
            '.DSSDL..LDSSD...',
            '..LLD....DLL....',
            '..LLD....DLL....',
            '.DSSDL..LDSSD...',
            '...SSDLLDSS.....',
            '..DSDSSSSD.D....',
            '..D.DSLLSD.D....',
            '....DSLLSD......',
            '.....D..D.......',
            '................'
        ]
    },
    close: {
        size: 16,
        palette: { R: '#c95c4a', L: '#ffd0c6', D: '#7c2c28' },
        grid: [
            '................',
            '..DDDDDDDDDD....',
            '.DRRRRRRRRRD....',
            '.DRL.....LRD....',
            '.DRRL...LRRD....',
            '.DRRRL.LRRRD....',
            '.DRRRLLRRRRD....',
            '.DRRRLLRRRRD....',
            '.DRRRL.LRRRD....',
            '.DRRL...LRRD....',
            '.DRL.....LRD....',
            '.DRRRRRRRRRD....',
            '..DDDDDDDDDD....',
            '................',
            '................',
            '................'
        ]
    }
};

function drawPixelIcon(ctx, name, x, y, scale = 2) {
    const icon = PIXEL_ICONS[name];
    if (!icon) return false;
    icon.grid.forEach((row, rowIndex) => {
        [...row].forEach((cell, colIndex) => {
            if (cell === '.') return;
            ctx.fillStyle = icon.palette[cell] || '#000';
            ctx.fillRect(Math.round(x + colIndex * scale), Math.round(y + rowIndex * scale), scale, scale);
        });
    });
    return true;
}
