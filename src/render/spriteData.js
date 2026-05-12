// 8x8 像素矩阵，空格=透明
export const SPRITES = {
  soil: [
    "BBBBBBBB",
    "BABBABBB",
    "BBBBABBA",
    "BABBBBBB",
    "BBBBBABB",
    "BBABBBBB",
    "BBBBBABA",
    "BBBBBBBB"
  ],
  soilLocked: [
    "AAAAAAAA",
    "ABBAABBA",
    "AABBAABA",
    "ABABBBAB",
    "BABABBBA",
    "BBABABAB",
    "BABAAABA",
    "AAAAAAAA"
  ],
  // 小麦三阶段
  wheat_s1: [
    "        ",
    "        ",
    "   gg   ",
    "   gg   ",
    "        ",
    "        ",
    "        ",
    "        "
  ],
  wheat_s2: [
    "        ",
    "   YY   ",
    "  YYY   ",
    "   YY   ",
    "   gg   ",
    "   gg   ",
    "        ",
    "        "
  ],
  wheat_s3: [
    "   YY   ",
    "  YYYY  ",
    " YYYYYY ",
    "  YYYY  ",
    "   YY   ",
    "   gg   ",
    "   gg   ",
    "        "
  ],
  // 胡萝卜
  carrot_s1: [
    "        ",
    "        ",
    "   gg   ",
    "   gg   ",
    "        ",
    "        ",
    "        ",
    "        "
  ],
  carrot_s2: [
    "        ",
    "   gg   ",
    "  gggg  ",
    "  gggg  ",
    "   gg   ",
    "        ",
    "        ",
    "        "
  ],
  carrot_s3: [
    "   OO   ",
    "   OO   ",
    "  OOOO  ",
    "  OOOO  ",
    "   OO   ",
    "   gg   ",
    "   gg   ",
    "        "
  ],
  // 西瓜
  melon_s1: [
    "        ",
    "        ",
    "   GG   ",
    "   GG   ",
    "        ",
    "        ",
    "        ",
    "        "
  ],
  melon_s2: [
    "        ",
    "  GGGG  ",
    " GGGGGG ",
    " GGGGGG ",
    "  GGGG  ",
    "        ",
    "        ",
    "        "
  ],
  melon_s3: [
    " GGGGGG ",
    "GggggggG",
    "GggggggG",
    "GggggggG",
    "GggggggG",
    " GGGGGG ",
    "        ",
    "        "
  ]
};

export const PALETTE = {
  B: '#5D4037',      // 土壤深
  A: '#3E2723',      // 锁定地
  g: '#4CAF50',      // 茎叶
  Y: '#FFEB3B',      // 小麦黄
  O: '#FF9800',      // 胡萝卜橙
  G: '#2E7D32',      // 西瓜皮
  ' ': null
};