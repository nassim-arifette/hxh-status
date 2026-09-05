import type { Locale } from "@/lib/i18n";

export type ChapterTitleInfo = {
  number: number;
  original: string; // Japanese Kanji title
  titles: Partial<Record<Locale, string>> & { en: string };
};

export const CHAPTER_TITLES: Record<number, ChapterTitleInfo> = {
  "1": {
    "number": 1,
    "original": "出発の日",
    "titles": {
      "en": "The Day of Departure",
      "fr": "Le jour du départ",
      "ja": "出発の日",
      "es": "El día de la partida"
    }
  },
  "2": {
    "number": 2,
    "original": "嵐の出会い",
    "titles": {
      "en": "An Encounter in the Storm",
      "fr": "Dans la tempête",
      "ja": "嵐の出会い",
      "es": "En la tempestad"
    }
  },
  "3": {
    "number": 3,
    "original": "究極の選択",
    "titles": {
      "en": "The Ultimate Choice",
      "fr": "L'ultime choix",
      "ja": "究極の選択",
      "es": "La elección final"
    }
  },
  "4": {
    "number": 4,
    "original": "魔獣 凶狸狐",
    "titles": {
      "en": "Kiriko: Wicked Magical Vulpes",
      "fr": "Le raton-renard monstrueux",
      "ja": "魔獣 凶狸狐",
      "es": "El monstruo Zorro-rata"
    }
  },
  "5": {
    "number": 5,
    "original": "第1次試験開始①",
    "titles": {
      "en": "The First Phase Begins, Part 1",
      "fr": "1er tour : début des épreuves [1]",
      "ja": "第1次試験開始①",
      "es": "Primer asalto: La prueba comienza (1)"
    }
  },
  "6": {
    "number": 6,
    "original": "第1次試験開始②",
    "titles": {
      "en": "The First Phase Begins, Part 2",
      "fr": "1er tour : début des épreuves [2]",
      "ja": "第1次試験開始②",
      "es": "Primer asalto: La prueba comienza (2)"
    }
  },
  "7": {
    "number": 7,
    "original": "それぞれの理由",
    "titles": {
      "en": "Respective Reasons",
      "fr": "À chacun ses raisons",
      "ja": "それぞれの理由",
      "es": "A cada uno sus razones"
    }
  },
  "8": {
    "number": 8,
    "original": "もうひとつの敵",
    "titles": {
      "en": "The Other Enemy",
      "fr": "Un adversaire de plus",
      "ja": "もうひとつの敵",
      "es": "Otro rival más"
    }
  },
  "9": {
    "number": 9,
    "original": "霧の中の攻防",
    "titles": {
      "en": "A Struggle in the Mist",
      "fr": "Bataille dans le brouillard",
      "ja": "霧の中の攻防",
      "es": "Batalla en la niebla"
    }
  },
  "10": {
    "number": 10,
    "original": "意外な課題",
    "titles": {
      "en": "An Unexpected Task",
      "fr": "Une épreuve inattendue",
      "ja": "意外な課題",
      "es": "Una prueba sorpresa"
    }
  },
  "11": {
    "number": 11,
    "original": "当然の結果",
    "titles": {
      "en": "The Inevitable Outcome",
      "fr": "Un résultat évident",
      "ja": "当然の結果",
      "es": "Un resultado obvio"
    }
  },
  "12": {
    "number": 12,
    "original": "会長参上",
    "titles": {
      "en": "The Chairman Awaits",
      "fr": "La visite du président",
      "ja": "会長参上",
      "es": "La visita del presidente"
    }
  },
  "13": {
    "number": 13,
    "original": "真夜中のゲーム①",
    "titles": {
      "en": "A Game at Midnight, Part 1",
      "fr": "Un jeu en pleine nuit [1]",
      "ja": "真夜中のゲーム①",
      "es": "Un juego a medianoche (1)"
    }
  },
  "14": {
    "number": 14,
    "original": "真夜中のゲーム②",
    "titles": {
      "en": "A Game at Midnight, Part 2",
      "fr": "Un jeu en pleine nuit [2]",
      "ja": "真夜中のゲーム②",
      "es": "Un juego a medianoche (2)"
    }
  },
  "15": {
    "number": 15,
    "original": "多数決の道",
    "titles": {
      "en": "The Path of Majority Rules",
      "fr": "Chemin des décisions par la majorité",
      "ja": "多数決の道",
      "es": "El camino que elige la mayoría"
    }
  },
  "16": {
    "number": 16,
    "original": "試練官登場",
    "titles": {
      "en": "Enter the Taskmasters",
      "fr": "Les jurés",
      "ja": "試練官登場",
      "es": "El jurado"
    }
  },
  "17": {
    "number": 17,
    "original": "不自由な2択",
    "titles": {
      "en": "Disparate Choice",
      "fr": "Deux choix identiques",
      "ja": "不自由な2択",
      "es": "Dos elecciones idénticas"
    }
  },
  "18": {
    "number": 18,
    "original": "2つの切り札",
    "titles": {
      "en": "The Two Aces in the Hole",
      "fr": "Deux atouts",
      "ja": "2つの切り札",
      "es": "Dos bazas"
    }
  },
  "19": {
    "number": 19,
    "original": "多数決の罠",
    "titles": {
      "en": "The Trap of Majority Rules",
      "fr": "Le piège des choix à la majorité",
      "ja": "多数決の罠",
      "es": "La trampa de la elección de la mayoría"
    }
  },
  "20": {
    "number": 20,
    "original": "ギャンブルタイム",
    "titles": {
      "en": "Gambling Time",
      "fr": "Gamble time",
      "ja": "ギャンブルタイム",
      "es": "Hora de arriesgar"
    }
  },
  "21": {
    "number": 21,
    "original": "決着",
    "titles": {
      "en": "Resolution",
      "fr": "Jeu décisif",
      "ja": "決着",
      "es": "Desempate"
    }
  },
  "22": {
    "number": 22,
    "original": "最後の問題",
    "titles": {
      "en": "The Last Question",
      "fr": "Le dernier problème",
      "ja": "最後の問題",
      "es": "El último problema"
    }
  },
  "23": {
    "number": 23,
    "original": "2人の敵",
    "titles": {
      "en": "Two Enemies",
      "fr": "Deux ennemis",
      "ja": "2人の敵",
      "es": "Dos enemigos"
    }
  },
  "24": {
    "number": 24,
    "original": "特訓",
    "titles": {
      "en": "Crash Course",
      "fr": "Entraînement spécial",
      "ja": "特訓",
      "es": "Entrenamiento especial"
    }
  },
  "25": {
    "number": 25,
    "original": "2日目",
    "titles": {
      "en": "The Second Day",
      "fr": "Le deuxième jour",
      "ja": "2日目",
      "es": "El segundo día"
    }
  },
  "26": {
    "number": 26,
    "original": "決戦前夜",
    "titles": {
      "en": "The Night Before the Showdown",
      "fr": "La veille du combat final",
      "ja": "決戦前夜",
      "es": "La víspera del combate final"
    }
  },
  "27": {
    "number": 27,
    "original": "一触即発",
    "titles": {
      "en": "A Volatile Situation",
      "fr": "Une situation explosive",
      "ja": "一触即発",
      "es": "Una situación explosiva"
    }
  },
  "28": {
    "number": 28,
    "original": "大きな借り",
    "titles": {
      "en": "A Huge Favor",
      "fr": "Une dette de taille",
      "ja": "大きな借り",
      "es": "Una deuda enorme"
    }
  },
  "29": {
    "number": 29,
    "original": "キルアの場合",
    "titles": {
      "en": "Killua's Case",
      "fr": "Et Kirua…",
      "ja": "キルアの場合",
      "es": "¿Y Killua?"
    }
  },
  "30": {
    "number": 30,
    "original": "蠢く罠",
    "titles": {
      "en": "The Slithering Trap",
      "fr": "Le piège grouillant",
      "ja": "蠢く罠",
      "es": "Una trampa pululante"
    }
  },
  "31": {
    "number": 31,
    "original": "九死に…",
    "titles": {
      "en": "By the Skin of Their Teeth...",
      "fr": "In extremis",
      "ja": "九死に…",
      "es": "In Extremis"
    }
  },
  "32": {
    "number": 32,
    "original": "最終試験は…?",
    "titles": {
      "en": "And the Final Test...?",
      "fr": "La dernière épreuve… ?",
      "ja": "最終試験は…?",
      "es": "¿Última oportunidad?"
    }
  },
  "33": {
    "number": 33,
    "original": "最終試験開始!",
    "titles": {
      "en": "The Final Test Begins!",
      "fr": "Le dernier tour !",
      "ja": "最終試験開始!",
      "es": "¡Última ronda!"
    }
  },
  "34": {
    "number": 34,
    "original": "合格第1号!?",
    "titles": {
      "en": "The First Candidate Accepted!?",
      "fr": "Premier candidat certifié ! ?",
      "ja": "合格第1号!?",
      "es": "Primer candidato certificado"
    }
  },
  "35": {
    "number": 35,
    "original": "光と闇①",
    "titles": {
      "en": "Light and Darkness, Part 1",
      "fr": "Ombre et lumière [1]",
      "ja": "光と闇①",
      "es": "Luz y Oscuridad, parte 1"
    }
  },
  "36": {
    "number": 36,
    "original": "光と闇②",
    "titles": {
      "en": "Light and Darkness, Part 2",
      "fr": "Ombre et lumière [2]",
      "ja": "光と闇②",
      "es": "Luz y Oscuridad, Parte 2"
    }
  },
  "37": {
    "number": 37,
    "original": "光と闇③",
    "titles": {
      "en": "Light and Darkness, Part 3",
      "fr": "Ombre et lumière [3]",
      "ja": "光と闇③",
      "es": "Luz y Oscuridad, Parte 3"
    }
  },
  "38": {
    "number": 38,
    "original": "ジン＝フリークス",
    "titles": {
      "en": "Ging Freecss",
      "fr": "Jin Freecss",
      "ja": "ジン＝フリークス",
      "es": "Ging Freecss"
    }
  },
  "39": {
    "number": 39,
    "original": "侵入者",
    "titles": {
      "en": "Intruder",
      "fr": "Les intrus",
      "ja": "侵入者",
      "es": "Intrusos"
    }
  },
  "40": {
    "number": 40,
    "original": "ゾルディック家①",
    "titles": {
      "en": "The Zoldycks, Part 1",
      "fr": "La famille Zoldik [1]",
      "ja": "ゾルディック家①",
      "es": "La Familia Zaoldyeck, Parte 1"
    }
  },
  "41": {
    "number": 41,
    "original": "ゾルディック家②",
    "titles": {
      "en": "The Zoldycks, Part 2",
      "fr": "La famille Zoldik [2]",
      "ja": "ゾルディック家②",
      "es": "La Familia Zaoldyeck, Parte 2"
    }
  },
  "42": {
    "number": 42,
    "original": "ゾルディック家③",
    "titles": {
      "en": "The Zoldycks, Part 3",
      "fr": "La famille Zoldik [3]",
      "ja": "ゾルディック家③",
      "es": "La Familia Zaoldyeck, Parte 3"
    }
  },
  "43": {
    "number": 43,
    "original": "ゾルディック家④",
    "titles": {
      "en": "The Zoldycks, Part 4",
      "fr": "La famille Zoldik [4]",
      "ja": "ゾルディック家④",
      "es": "La Familia Zaoldyeck, Parte 4"
    }
  },
  "44": {
    "number": 44,
    "original": "天空闘技場",
    "titles": {
      "en": "The Heavens Arena",
      "fr": "Le tournoi céleste",
      "ja": "天空闘技場",
      "es": "La Torre Celestial"
    }
  },
  "45": {
    "number": 45,
    "original": "レン",
    "titles": {
      "en": "Ren",
      "fr": "Ren",
      "ja": "レン",
      "es": "Ren"
    }
  },
  "46": {
    "number": 46,
    "original": "ネン",
    "titles": {
      "en": "Nen",
      "fr": "Nen",
      "ja": "ネン",
      "es": "Nen"
    }
  },
  "47": {
    "number": 47,
    "original": "見えない壁",
    "titles": {
      "en": "The Invisible Wall",
      "fr": "Le mur invisible",
      "ja": "見えない壁",
      "es": "Pared Invisible"
    }
  },
  "48": {
    "number": 48,
    "original": "ヒソカの条件",
    "titles": {
      "en": "Hisoka's Terms",
      "fr": "La condition d'Hisoka",
      "ja": "ヒソカの条件",
      "es": "La Condición de Hisoka"
    }
  },
  "49": {
    "number": 49,
    "original": "戦闘開始!!",
    "titles": {
      "en": "The Battle Begins!!",
      "fr": "Que le combat commence !!",
      "ja": "戦闘開始!!",
      "es": "¡¡Que Empiece el Combate!!"
    }
  },
  "50": {
    "number": 50,
    "original": "ゼツ",
    "titles": {
      "en": "Zetsu",
      "fr": "Zetsu",
      "ja": "ゼツ",
      "es": "Zetsu"
    }
  },
  "51": {
    "number": 51,
    "original": "点",
    "titles": {
      "en": "Ten",
      "fr": "Ten",
      "ja": "点",
      "es": "Ten"
    }
  },
  "52": {
    "number": 52,
    "original": "カストロ",
    "titles": {
      "en": "Kastro",
      "fr": "Kastro",
      "ja": "カストロ",
      "es": "Kastro"
    }
  },
  "53": {
    "number": 53,
    "original": "ダブル",
    "titles": {
      "en": "Double",
      "fr": "Double",
      "ja": "ダブル",
      "es": "Doble"
    }
  },
  "54": {
    "number": 54,
    "original": "敗因",
    "titles": {
      "en": "Cause of Defeat",
      "fr": "La cause de la défaite",
      "ja": "敗因",
      "es": "La Causa de la Derrota"
    }
  },
  "55": {
    "number": 55,
    "original": "ヒソカは…",
    "titles": {
      "en": "As For Hisoka...",
      "fr": "Hisoka…",
      "ja": "ヒソカは…",
      "es": "Hisoka..."
    }
  },
  "56": {
    "number": 56,
    "original": "修行再開",
    "titles": {
      "en": "Training Resumes",
      "fr": "Début de l'apprentissage",
      "ja": "修行再開",
      "es": "Empieza el Entrenamiento"
    }
  },
  "57": {
    "number": 57,
    "original": "約束",
    "titles": {
      "en": "Promise",
      "fr": "La promesse",
      "ja": "約束",
      "es": "Promesa"
    }
  },
  "58": {
    "number": 58,
    "original": "再戦",
    "titles": {
      "en": "Rematch",
      "fr": "Face à face de nouveau",
      "ja": "再戦",
      "es": "La Revancha"
    }
  },
  "59": {
    "number": 59,
    "original": "及第",
    "titles": {
      "en": "Making the Grade",
      "fr": "Qualification",
      "ja": "及第",
      "es": "El Examen"
    }
  },
  "60": {
    "number": 60,
    "original": "合格",
    "titles": {
      "en": "Passing the Exam",
      "fr": "Réussite",
      "ja": "合格",
      "es": "Aprobado"
    }
  },
  "61": {
    "number": 61,
    "original": "決戦",
    "titles": {
      "en": "Showdown",
      "fr": "Match décisif",
      "ja": "決戦",
      "es": "Combate Decisivo"
    }
  },
  "62": {
    "number": 62,
    "original": "本気",
    "titles": {
      "en": "Like You Mean It",
      "fr": "Pour de vrai",
      "ja": "本気",
      "es": "Dándolo Todo"
    }
  },
  "63": {
    "number": 63,
    "original": "これから",
    "titles": {
      "en": "Next",
      "fr": "Ça ne fait que commencer",
      "ja": "これから",
      "es": "A Partir de Ahora"
    }
  },
  "64": {
    "number": 64,
    "original": "帰郷",
    "titles": {
      "en": "Homecoming",
      "fr": "Retours au pays",
      "ja": "帰郷",
      "es": "Regreso a casa"
    }
  },
  "65": {
    "number": 65,
    "original": "ジンについて",
    "titles": {
      "en": "About Ging",
      "fr": "À propos de Jin",
      "ja": "ジンについて",
      "es": "Sobre Ging"
    }
  },
  "66": {
    "number": 66,
    "original": "テープ",
    "titles": {
      "en": "The Tape",
      "fr": "La cassette",
      "ja": "テープ",
      "es": "La cinta"
    }
  },
  "67": {
    "number": 67,
    "original": "人体収集家の館①",
    "titles": {
      "en": "The Flesh Collector's Mansion: Part 1",
      "fr": "Le château du collectionneur de corps [1]",
      "ja": "人体収集家の館①",
      "es": "La mansión del coleccionista de cuerpos: Parte 1"
    }
  },
  "68": {
    "number": 68,
    "original": "人体収集家の館②",
    "titles": {
      "en": "The Flesh Collector's Mansion: Part 2",
      "fr": "Le château du collectionneur de corps [2]",
      "ja": "人体収集家の館②",
      "es": "La mansión del coleccionista de cuerpos: Parte 2"
    }
  },
  "69": {
    "number": 69,
    "original": "グリードアイランド",
    "titles": {
      "en": "Greed Island",
      "fr": "Greed Island",
      "ja": "グリードアイランド",
      "es": "Greed Island"
    }
  },
  "70": {
    "number": 70,
    "original": "ヨークシンへ",
    "titles": {
      "en": "To Yorknew!",
      "fr": "Vers York Shin",
      "ja": "ヨークシンへ",
      "es": "A York Shin!"
    }
  },
  "71": {
    "number": 71,
    "original": "オークション開催!!",
    "titles": {
      "en": "The Auction Begins!!",
      "fr": "Ouverture des enchères !!",
      "ja": "オークション開催!!",
      "es": "Empieza la subasta!!"
    }
  },
  "72": {
    "number": 72,
    "original": "9月1日①",
    "titles": {
      "en": "September 1st: Part 1",
      "fr": "1er septembre [1]",
      "ja": "9月1日①",
      "es": "1 de septiembre: Parte 1"
    }
  },
  "73": {
    "number": 73,
    "original": "9月1日②",
    "titles": {
      "en": "September 1st: Part 2",
      "fr": "1er septembre [2]",
      "ja": "9月1日②",
      "es": "1 de septiembre: Parte 2"
    }
  },
  "74": {
    "number": 74,
    "original": "9月1日③",
    "titles": {
      "en": "September 1st: Part 3",
      "fr": "1er septembre [3]",
      "ja": "9月1日③",
      "es": "1 de septiembre: Parte 3"
    }
  },
  "75": {
    "number": 75,
    "original": "9月1日④",
    "titles": {
      "en": "September 1st: Part 4",
      "fr": "1er septembre [4]",
      "ja": "9月1日④"
    }
  },
  "76": {
    "number": 76,
    "original": "9月1日⑤",
    "titles": {
      "en": "September 1st: Part 5",
      "fr": "1er septembre [5]",
      "ja": "9月1日⑤",
      "es": "1 de septiembre: Parte 5"
    }
  },
  "77": {
    "number": 77,
    "original": "9月1日⑥",
    "titles": {
      "en": "September 1st: Part 6",
      "fr": "1er septembre [6]",
      "ja": "9月1日⑥",
      "es": "1 de septiembre: Parte 6"
    }
  },
  "78": {
    "number": 78,
    "original": "9月1日⑦",
    "titles": {
      "en": "September 1st: Part 7",
      "fr": "1er septembre [7]",
      "ja": "9月1日⑦",
      "es": "1 de septiembre: Parte 7"
    }
  },
  "79": {
    "number": 79,
    "original": "9月2日①",
    "titles": {
      "en": "September 2nd: Part 1",
      "fr": "2 septembre [1]",
      "ja": "9月2日①",
      "es": "2 de septiembre: Parte 1"
    }
  },
  "80": {
    "number": 80,
    "original": "9月2日②",
    "titles": {
      "en": "September 2nd: Part 2",
      "fr": "2 septembre [2]",
      "ja": "9月2日②",
      "es": "2 de septiembre: Parte 2"
    }
  },
  "81": {
    "number": 81,
    "original": "9月2日③",
    "titles": {
      "en": "September 2nd: Part 3",
      "fr": "2 septembre [3]",
      "ja": "9月2日③",
      "es": "2 de septiembre: Parte 3"
    }
  },
  "82": {
    "number": 82,
    "original": "9月2日④",
    "titles": {
      "en": "September 2nd: Part 4",
      "fr": "2 septembre [4]",
      "ja": "9月2日④",
      "es": "2 de septiembre: Parte 4"
    }
  },
  "83": {
    "number": 83,
    "original": "9月2日⑤",
    "titles": {
      "en": "September 2nd: Part 5",
      "fr": "2 septembre [5]",
      "ja": "9月2日⑤",
      "es": "2 de septiembre: Parte 5"
    }
  },
  "84": {
    "number": 84,
    "original": "9月2日⑥",
    "titles": {
      "en": "September 2nd: Part 6",
      "fr": "2 septembre [6]",
      "ja": "9月2日⑥",
      "es": "2 de septiembre: Parte 6"
    }
  },
  "85": {
    "number": 85,
    "original": "9月3日①",
    "titles": {
      "en": "September 3rd: Part 1",
      "fr": "3 septembre [1]",
      "ja": "9月3日①",
      "es": "3 de septiembre: Parte 1"
    }
  },
  "86": {
    "number": 86,
    "original": "9月3日②",
    "titles": {
      "en": "September 3rd: Part 2",
      "fr": "3 septembre [2]",
      "ja": "9月3日②",
      "es": "3 de septiembre: Parte 2"
    }
  },
  "87": {
    "number": 87,
    "original": "9月3日③",
    "titles": {
      "en": "September 3rd: Part 3",
      "fr": "3 septembre [3]",
      "ja": "9月3日③",
      "es": "3 de septiembre: Parte 3"
    }
  },
  "88": {
    "number": 88,
    "original": "9月3日④",
    "titles": {
      "en": "September 3rd: Part 4",
      "fr": "3 septembre [4]",
      "ja": "9月3日④",
      "es": "3 de septiembre: Parte 4"
    }
  },
  "89": {
    "number": 89,
    "original": "9月3日⑤",
    "titles": {
      "en": "September 3rd: Part 5",
      "fr": "3 septembre [5]",
      "ja": "9月3日⑤",
      "es": "3 de septiembre: Parte 5"
    }
  },
  "90": {
    "number": 90,
    "original": "9月3日⑥",
    "titles": {
      "en": "September 3rd: Part 6",
      "fr": "3 septembre [6]",
      "ja": "9月3日⑥",
      "es": "3 de septiembre: Parte 6"
    }
  },
  "91": {
    "number": 91,
    "original": "9月3日⑦",
    "titles": {
      "en": "September 3rd: Part 7",
      "fr": "3 septembre [7]",
      "ja": "9月3日⑦",
      "es": "3 de septiembre: Parte 7"
    }
  },
  "92": {
    "number": 92,
    "original": "9月3日⑧",
    "titles": {
      "en": "September 3rd: Part 8",
      "fr": "3 septembre [8]",
      "ja": "9月3日⑧",
      "es": "3 de septiembre: Parte 8"
    }
  },
  "93": {
    "number": 93,
    "original": "9月3日⑨",
    "titles": {
      "en": "September 3rd: Part 9",
      "fr": "3 septembre [9]",
      "ja": "9月3日⑨",
      "es": "3 de septiembre: Parte 9"
    }
  },
  "94": {
    "number": 94,
    "original": "9月3日⑩",
    "titles": {
      "en": "September 3rd: Part 10",
      "fr": "3 septembre [10]",
      "ja": "9月3日⑩",
      "es": "3 de septiembre: Parte 10"
    }
  },
  "95": {
    "number": 95,
    "original": "9月3日⑪",
    "titles": {
      "en": "September 3rd: Part 11",
      "fr": "3 septembre [11]",
      "ja": "9月3日⑪",
      "es": "3 de septiembre: Parte 11"
    }
  },
  "96": {
    "number": 96,
    "original": "9月3日⑫",
    "titles": {
      "en": "September 3rd: Part 12",
      "fr": "3 septembre [12]",
      "ja": "9月3日⑫",
      "es": "3 de septiembre: Parte 12"
    }
  },
  "97": {
    "number": 97,
    "original": "9月3日⑬",
    "titles": {
      "en": "September 3rd: Part 13",
      "fr": "3 septembre [13]",
      "ja": "9月3日⑬",
      "es": "3 de septiembre: Parte 13"
    }
  },
  "98": {
    "number": 98,
    "original": "9月3日⑭",
    "titles": {
      "en": "September 3rd: Part 14",
      "fr": "3 septembre [14]",
      "ja": "9月3日⑭",
      "es": "3 de septiembre: Parte 14"
    }
  },
  "99": {
    "number": 99,
    "original": "9月3日⑮",
    "titles": {
      "en": "September 3rd: Part 15",
      "fr": "3 septembre [15]",
      "ja": "9月3日⑮",
      "es": "3 de septiembre: Parte 15"
    }
  },
  "100": {
    "number": 100,
    "original": "9月3日⑯",
    "titles": {
      "en": "September 3rd: Part 16",
      "fr": "3 septembre [16]",
      "ja": "9月3日⑯",
      "es": "3 de septiembre: Parte 16"
    }
  },
  "101": {
    "number": 101,
    "original": "9月3日⑰",
    "titles": {
      "en": "September 3rd: Part 17",
      "fr": "3 septembre [17]",
      "ja": "9月3日⑰",
      "es": "3 de septiembre: Parte 17"
    }
  },
  "102": {
    "number": 102,
    "original": "9月4日①",
    "titles": {
      "en": "September 4th: Part 1",
      "fr": "4 septembre [1]",
      "ja": "9月4日①",
      "es": "4 de septiembre: Parte 1"
    }
  },
  "103": {
    "number": 103,
    "original": "9月4日②",
    "titles": {
      "en": "September 4th: Part 2",
      "fr": "4 septembre [2]",
      "ja": "9月4日②",
      "es": "4 de septiembre: Parte 2"
    }
  },
  "104": {
    "number": 104,
    "original": "9月4日③",
    "titles": {
      "en": "September 4th: Part 3",
      "fr": "4 septembre [3]",
      "ja": "9月4日③",
      "es": "4 de septiembre: Parte 3"
    }
  },
  "105": {
    "number": 105,
    "original": "9月4日④",
    "titles": {
      "en": "September 4th: Part 4",
      "fr": "4 septembre [4]",
      "ja": "9月4日④",
      "es": "4 de septiembre: Parte 4"
    }
  },
  "106": {
    "number": 106,
    "original": "9月4日⑤",
    "titles": {
      "en": "September 4th: Part 5",
      "fr": "4 septembre [5]",
      "ja": "9月4日⑤",
      "es": "4 de septiembre: Parte 5"
    }
  },
  "107": {
    "number": 107,
    "original": "9月4日⑥",
    "titles": {
      "en": "September 4th: Part 6",
      "fr": "4 septembre [6]",
      "ja": "9月4日⑥",
      "es": "4 de septiembre: Parte 6"
    }
  },
  "108": {
    "number": 108,
    "original": "9月4日⑦",
    "titles": {
      "en": "September 4th: Part 7",
      "fr": "4 septembre [7]",
      "ja": "9月4日⑦",
      "es": "4 de septiembre: Parte 7"
    }
  },
  "109": {
    "number": 109,
    "original": "9月4日⑧",
    "titles": {
      "en": "September 4th: Part 8",
      "fr": "4 septembre [8]",
      "ja": "9月4日⑧",
      "es": "4 de septiembre: Parte 8"
    }
  },
  "110": {
    "number": 110,
    "original": "9月4日⑨",
    "titles": {
      "en": "September 4th: Part 9",
      "fr": "4 septembre [9]",
      "ja": "9月4日⑨",
      "es": "4 de septiembre: Parte 9"
    }
  },
  "111": {
    "number": 111,
    "original": "9月4日⑩",
    "titles": {
      "en": "September 4th: Part 10",
      "fr": "4 septembre [10]",
      "ja": "9月4日⑩",
      "es": "4 de septiembre: Parte 10"
    }
  },
  "112": {
    "number": 112,
    "original": "9月4日⑪",
    "titles": {
      "en": "September 4th: Part 11",
      "fr": "4 septembre [11]",
      "ja": "9月4日⑪",
      "es": "4 de septiembre: Parte 11"
    }
  },
  "113": {
    "number": 113,
    "original": "9月4日⑫",
    "titles": {
      "en": "September 4th: Part 12",
      "fr": "4 septembre [12]",
      "ja": "9月4日⑫",
      "es": "4 de septiembre: Parte 12"
    }
  },
  "114": {
    "number": 114,
    "original": "9月4日⑬",
    "titles": {
      "en": "September 4th: Part 13",
      "fr": "4 septembre [13]",
      "ja": "9月4日⑬",
      "es": "4 de septiembre: Parte 13"
    }
  },
  "115": {
    "number": 115,
    "original": "9月4日⑭",
    "titles": {
      "en": "September 4th: Part 14",
      "fr": "4 septembre [14]",
      "ja": "9月4日⑭",
      "es": "4 de septiembre: Parte 14"
    }
  },
  "116": {
    "number": 116,
    "original": "9月4日⑮",
    "titles": {
      "en": "September 4th: Part 15",
      "fr": "4 septembre [15]",
      "ja": "9月4日⑮",
      "es": "4 de septiembre: Parte 15"
    }
  },
  "117": {
    "number": 117,
    "original": "9月4日⑯",
    "titles": {
      "en": "September 4th: Part 16",
      "fr": "4 septembre [16]",
      "ja": "9月4日⑯",
      "es": "4 de septiembre: Parte 16"
    }
  },
  "118": {
    "number": 118,
    "original": "9月4日⑰",
    "titles": {
      "en": "September 4th: Part 17",
      "fr": "4 septembre [17]",
      "ja": "9月4日⑰",
      "es": "4 de septiembre: Parte 17"
    }
  },
  "119": {
    "number": 119,
    "original": "9月4日⑱",
    "titles": {
      "en": "September 4th: Part 18",
      "fr": "4 septembre [18]",
      "ja": "9月4日⑱",
      "es": "4 de septiembre: Parte 18"
    }
  },
  "120": {
    "number": 120,
    "original": "9月6日①",
    "titles": {
      "en": "September 6th: Part 1",
      "fr": "6 septembre [1]",
      "ja": "9月6日①",
      "es": "4 de septiembre: Parte 1"
    }
  },
  "121": {
    "number": 121,
    "original": "9月6日②",
    "titles": {
      "en": "September 6th: Part 2",
      "fr": "6 septembre [2]",
      "ja": "9月6日②",
      "es": "4 de septiembre: Parte 2"
    }
  },
  "122": {
    "number": 122,
    "original": "9月6日③",
    "titles": {
      "en": "September 6th: Part 3",
      "fr": "6 septembre [3]",
      "ja": "9月6日③",
      "es": "4 de septiembre: Parte 3"
    }
  },
  "123": {
    "number": 123,
    "original": "9月6日④",
    "titles": {
      "en": "September 6th: Part 4",
      "fr": "6 septembre [4]",
      "ja": "9月6日④",
      "es": "4 de septiembre: Parte 4"
    }
  },
  "124": {
    "number": 124,
    "original": "9月7日①-9月10日①",
    "titles": {
      "en": "September 7th: Part 1 to September 10th: Part 1",
      "fr": "7 septembre - 10 septembre [1]",
      "ja": "9月7日①-9月10日①",
      "es": "7 de septiembre: Parte 1 - 10 de septiembre: Parte 1"
    }
  },
  "125": {
    "number": 125,
    "original": "9月10日②",
    "titles": {
      "en": "September 10th: Part 2",
      "fr": "10 septembre [2]",
      "ja": "9月10日②",
      "es": "10 de septiembre: Parte 2"
    }
  },
  "126": {
    "number": 126,
    "original": "9月10日③",
    "titles": {
      "en": "September 10th: Part 3",
      "fr": "10 septembre [3]",
      "ja": "9月10日③",
      "es": "10 de septiembre: Parte 3"
    }
  },
  "127": {
    "number": 127,
    "original": "9月10日④",
    "titles": {
      "en": "September 10th: Part 4",
      "fr": "10 septembre [4]",
      "ja": "9月10日④",
      "es": "10 de septiembre: Parte 4"
    }
  },
  "128": {
    "number": 128,
    "original": "9月10日⑤",
    "titles": {
      "en": "September 10th: Part 5",
      "fr": "10 septembre [5]",
      "ja": "9月10日⑤",
      "es": "10 de septiembre: Parte 5"
    }
  },
  "129": {
    "number": 129,
    "original": "懸賞都市 アントキバ",
    "titles": {
      "en": "Antokiba, Town of Prizes",
      "fr": "Antikoba, la ville du challenge",
      "ja": "懸賞都市 アントキバ",
      "es": "Antokiba, Ciudad de Premios"
    }
  },
  "130": {
    "number": 130,
    "original": "勧誘の理由",
    "titles": {
      "en": "The Reason for the Recruitment",
      "fr": "La raison de l'invitation",
      "ja": "勧誘の理由",
      "es": "La Razón de la Invitación"
    }
  },
  "131": {
    "number": 131,
    "original": "回答",
    "titles": {
      "en": "The Answer",
      "fr": "Réponses",
      "ja": "回答",
      "es": "Respuesta"
    }
  },
  "132": {
    "number": 132,
    "original": "40種の呪文",
    "titles": {
      "en": "The Forty Spells",
      "fr": "Les 40 sorts",
      "ja": "40種の呪文",
      "es": "40 Tipos de Conjuros"
    }
  },
  "133": {
    "number": 133,
    "original": "呪文以外の防御法",
    "titles": {
      "en": "How to Defend Yourself Without Spells",
      "fr": "D'autres défenses que les sorts",
      "ja": "呪文以外の防御法",
      "es": "Defendiendo sin Hechizos"
    }
  },
  "134": {
    "number": 134,
    "original": "島の秘密",
    "titles": {
      "en": "The Island's Secret",
      "fr": "Les secrets du jeu",
      "ja": "島の秘密",
      "es": "Secretos del Juego"
    }
  },
  "135": {
    "number": 135,
    "original": "いざマサドラへ!①",
    "titles": {
      "en": "To Masadora! Part 1",
      "fr": "Et maintenant, en route pour Masadora ! [1]",
      "ja": "いざマサドラへ!①",
      "es": "Hacia Masadora! Parte 1"
    }
  },
  "136": {
    "number": 136,
    "original": "いざマサドラへ!②",
    "titles": {
      "en": "To Masadora! Part 2",
      "fr": "Et maintenant, en route pour Masadora ! [2]",
      "ja": "いざマサドラへ!②",
      "es": "Hacia Masadora! Parte 2"
    }
  },
  "137": {
    "number": 137,
    "original": "いざマサドラへ!③",
    "titles": {
      "en": "To Masadora! Part 3",
      "fr": "Et maintenant, en route pour Masadora ! [3]",
      "ja": "いざマサドラへ!③",
      "es": "Hacia Masadora! Parte 3"
    }
  },
  "138": {
    "number": 138,
    "original": "いざマサドラへ…?",
    "titles": {
      "en": "To Masadora...?",
      "fr": "Et maintenant, en route pour Masadora… ?",
      "ja": "いざマサドラへ…?",
      "es": "Hacia Masadora...?"
    }
  },
  "139": {
    "number": 139,
    "original": "ホントにマサドラ行くのか?",
    "titles": {
      "en": "Are They Really Going to Masadora?",
      "fr": "On va vraiment à Masadora ?",
      "ja": "ホントにマサドラ行くのか?",
      "es": "De verdad vamos a Masadora?"
    }
  },
  "140": {
    "number": 140,
    "original": "マサドラには行ったけど",
    "titles": {
      "en": "They Got to Masadora, But...",
      "fr": "On est allé à Masadora mais…",
      "ja": "マサドラには行ったけど",
      "es": "Fuimos a Masadora, pero..."
    }
  },
  "141": {
    "number": 141,
    "original": "もうマサドラ行ったから次から別の感じのタイトルでいいや",
    "titles": {
      "en": "They Went to Masadora Already, So I'll Go With a Different Title Now",
      "fr": "Vu qu'on est allé à Masadora, on réfléchira un autre titre pour la prochaine fois",
      "ja": "もうマサドラ行ったから次から別の感じのタイトルでいいや",
      "es": "Ya Fuimos a Masadora, Así Que la Próxima Vez Usad Otro Título!"
    }
  },
  "142": {
    "number": 142,
    "original": "「爆弾魔」",
    "titles": {
      "en": "The Bomber",
      "fr": "Boomer, le magicien des bombes",
      "ja": "「爆弾魔」",
      "es": "El Bombardero"
    }
  },
  "143": {
    "number": 143,
    "original": "「命の音」",
    "titles": {
      "en": "Countdown",
      "fr": "Countdown - le son de la vie",
      "ja": "「命の音」",
      "es": "Cuenta Atrás"
    }
  },
  "144": {
    "number": 144,
    "original": "「解放」",
    "titles": {
      "en": "Release",
      "fr": "Libération",
      "ja": "「解放」",
      "es": "Liberación"
    }
  },
  "145": {
    "number": 145,
    "original": "邪拳＝ジャンケン!?",
    "titles": {
      "en": "Janken",
      "fr": "Jaken <nowiki>=</nowiki> Jan-Ken ?",
      "ja": "邪拳＝ジャンケン!?",
      "es": "¿¡Jaken = JanKen!?"
    }
  },
  "146": {
    "number": 146,
    "original": "アベンガネ①",
    "titles": {
      "en": "Abengane: Part 1",
      "fr": "Abengane [1]",
      "ja": "アベンガネ①",
      "es": "Abengane: Parte 1"
    }
  },
  "147": {
    "number": 147,
    "original": "アベンガネ②",
    "titles": {
      "en": "Abengane: Part 2",
      "fr": "Abengane [2]",
      "ja": "アベンガネ②",
      "es": "Abengane: Parte 2"
    }
  },
  "148": {
    "number": 148,
    "original": "試験開始",
    "titles": {
      "en": "The Exam Begins",
      "fr": "Début des épreuves",
      "ja": "試験開始",
      "es": "Empieza el Examen"
    }
  },
  "149": {
    "number": 149,
    "original": "遭遇",
    "titles": {
      "en": "Encounter",
      "fr": "Rencontre",
      "ja": "遭遇",
      "es": "Encuentro"
    }
  },
  "150": {
    "number": 150,
    "original": "始動",
    "titles": {
      "en": "Embarkment",
      "fr": "Départ",
      "ja": "始動",
      "es": "Empezando"
    }
  },
  "151": {
    "number": 151,
    "original": "躍進",
    "titles": {
      "en": "Progress",
      "fr": "Progrès rapides",
      "ja": "躍進",
      "es": "Prisa"
    }
  },
  "152": {
    "number": 152,
    "original": "接触",
    "titles": {
      "en": "Contact",
      "fr": "Contact",
      "ja": "接触",
      "es": "Contacto"
    }
  },
  "153": {
    "number": 153,
    "original": "成功",
    "titles": {
      "en": "Success",
      "fr": "Réussite",
      "ja": "成功",
      "es": "Éxito"
    }
  },
  "154": {
    "number": 154,
    "original": "共同戦線",
    "titles": {
      "en": "Common Cause",
      "fr": "Front commun",
      "ja": "共同戦線",
      "es": "Frente Unido"
    }
  },
  "155": {
    "number": 155,
    "original": "船長と14人の悪魔",
    "titles": {
      "en": "The Captain and His 14 Devils",
      "fr": "Le capitaine et ses 14 diables",
      "ja": "船長と14人の悪魔",
      "es": "El Capitán y sus 14 Diablos"
    }
  },
  "156": {
    "number": 156,
    "original": "対決①",
    "titles": {
      "en": "Face-Off: Part 1",
      "fr": "Duels [1]",
      "ja": "対決①",
      "es": "Enfrentados: Parte 1"
    }
  },
  "157": {
    "number": 157,
    "original": "対決②",
    "titles": {
      "en": "Face-Off: Part 2",
      "fr": "Duels [2]",
      "ja": "対決②",
      "es": "Enfrentados: Parte 2"
    }
  },
  "158": {
    "number": 158,
    "original": "似た者同士<sup>2</sup>+1",
    "titles": {
      "en": "Two of a Kind +1",
      "fr": "Personnes semblables² + 1",
      "ja": "似た者同士<sup>2</sup>+1",
      "es": "Compañeros Parecidos +1"
    }
  },
  "159": {
    "number": 159,
    "original": "恋愛都市アイアイ",
    "titles": {
      "en": "Aiai, the City of Love",
      "fr": "Love Love, la ville des relations amoureuses",
      "ja": "恋愛都市アイアイ",
      "es": "Love Love, la Ciudad del Amor"
    }
  },
  "160": {
    "number": 160,
    "original": "対決③",
    "titles": {
      "en": "Face-Off: Part 3",
      "fr": "Duels [3]",
      "ja": "対決③",
      "es": "Enfrentados: Parte 3"
    }
  },
  "161": {
    "number": 161,
    "original": "対決④",
    "titles": {
      "en": "Face-Off: Part 4",
      "fr": "Duels [4]",
      "ja": "対決④",
      "es": "Enfrentados: Parte 4"
    }
  },
  "162": {
    "number": 162,
    "original": "対決⑤",
    "titles": {
      "en": "Face-Off: Part 5",
      "fr": "Duels [5]",
      "ja": "対決⑤",
      "es": "Enfrentados: Parte 5"
    }
  },
  "163": {
    "number": 163,
    "original": "対決⑥",
    "titles": {
      "en": "Face-Off: Part 6",
      "fr": "Duels [6]",
      "ja": "対決⑥",
      "es": "Enfrentados: Parte 6"
    }
  },
  "164": {
    "number": 164,
    "original": "対決⑦",
    "titles": {
      "en": "Face-Off: Part 7",
      "fr": "Duels [7]",
      "ja": "対決⑦",
      "es": "Enfrentados: Parte 7"
    }
  },
  "165": {
    "number": 165,
    "original": "対決⑧",
    "titles": {
      "en": "Face-Off: Part 8",
      "fr": "Duels [8]",
      "ja": "対決⑧",
      "es": "Enfrentados: Parte 8"
    }
  },
  "166": {
    "number": 166,
    "original": "対決⑨",
    "titles": {
      "en": "Face-Off: Part 9",
      "fr": "Duels [9]",
      "ja": "対決⑨",
      "es": "Enfrentados: Parte 9"
    }
  },
  "167": {
    "number": 167,
    "original": "対決⑩",
    "titles": {
      "en": "Face-Off: Part 10",
      "fr": "Duels [10]",
      "ja": "対決⑩",
      "es": "Enfrentados: Parte 10"
    }
  },
  "168": {
    "number": 168,
    "original": "対決⑪",
    "titles": {
      "en": "Face-Off: Part 11",
      "fr": "Duels [11]",
      "ja": "対決⑪",
      "es": "Enfrentados: Parte 11"
    }
  },
  "169": {
    "number": 169,
    "original": "宣戦布告",
    "titles": {
      "en": "Declaration of War",
      "fr": "Déclaration de guerre",
      "ja": "宣戦布告",
      "es": "Declaración de Guerra"
    }
  },
  "170": {
    "number": 170,
    "original": "三つ巴の攻防",
    "titles": {
      "en": "Three-Way Struggle: Part 1",
      "fr": "Trois clans en lutte [1]",
      "ja": "三つ巴の攻防",
      "es": "Ataque de Tres: Parte 1"
    }
  },
  "171": {
    "number": 171,
    "original": "三つ巴の攻防②",
    "titles": {
      "en": "Three-Way Struggle: Part 2",
      "fr": "Trois clans en lutte [2]",
      "ja": "三つ巴の攻防②",
      "es": "Ataque de Tres: Parte 2"
    }
  },
  "172": {
    "number": 172,
    "original": "三つ巴の攻防③",
    "titles": {
      "en": "Three-Way Struggle: Part 3",
      "fr": "Trois clans en lutte [3]",
      "ja": "三つ巴の攻防③",
      "es": "Ataque de Tres: Parte 3"
    }
  },
  "173": {
    "number": 173,
    "original": "三つ巴の攻防④",
    "titles": {
      "en": "Three-Way Struggle: Part 4",
      "fr": "Trois clans en lutte [4]",
      "ja": "三つ巴の攻防④",
      "es": "Ataque de Tres: Parte 4"
    }
  },
  "174": {
    "number": 174,
    "original": "三つ巴の攻防⑤",
    "titles": {
      "en": "Three-Way Struggle: Part 5",
      "fr": "Trois clans en lutte [5]",
      "ja": "三つ巴の攻防⑤",
      "es": "Ataque de Tres: Parte 5"
    }
  },
  "175": {
    "number": 175,
    "original": "三つ巴の攻防⑥",
    "titles": {
      "en": "Three-Way Struggle: Part 6",
      "fr": "Trois clans en lutte [6]",
      "ja": "三つ巴の攻防⑥",
      "es": "Ataque de Tres: Parte 6"
    }
  },
  "176": {
    "number": 176,
    "original": "三つ巴の攻防⑦",
    "titles": {
      "en": "Three-Way Struggle: Part 7",
      "fr": "Trois clans en lutte [7]",
      "ja": "三つ巴の攻防⑦",
      "es": "Ataque de Tres: Parte 7"
    }
  },
  "177": {
    "number": 177,
    "original": "三つ巴の攻防⑧",
    "titles": {
      "en": "Three-Way Struggle: Part 8",
      "fr": "Trois clans en lutte [8]",
      "ja": "三つ巴の攻防⑧",
      "es": "Ataque de Tres: Parte 8"
    }
  },
  "178": {
    "number": 178,
    "original": "三つ巴の攻防⑨",
    "titles": {
      "en": "Three-Way Struggle: Part 9",
      "fr": "Trois clans en lutte [9]",
      "ja": "三つ巴の攻防⑨",
      "es": "Ataque de Tres: Parte 9"
    }
  },
  "179": {
    "number": 179,
    "original": "三つ巴の攻防⑩",
    "titles": {
      "en": "Three-Way Struggle: Part 10",
      "fr": "Trois clans en lutte [10]",
      "ja": "三つ巴の攻防⑩",
      "es": "Ataque de Tres: Parte 10"
    }
  },
  "180": {
    "number": 180,
    "original": "三つ巴の攻防⑪",
    "titles": {
      "en": "Three-Way Struggle: Part 11",
      "fr": "Trois clans en lutte [11]",
      "ja": "三つ巴の攻防⑪",
      "es": "Ataque de Tres: Parte 11"
    }
  },
  "181": {
    "number": 181,
    "original": "三つ巴の攻防⑫",
    "titles": {
      "en": "Three-Way Struggle: Part 12",
      "fr": "Trois clans en lutte [12]",
      "ja": "三つ巴の攻防⑫",
      "es": "Ataque de Tres: Parte 12"
    }
  },
  "182": {
    "number": 182,
    "original": "三つ巴の攻防⑬",
    "titles": {
      "en": "Three-Way Struggle: Part 13",
      "fr": "Trois clans en lutte [13]",
      "ja": "三つ巴の攻防⑬",
      "es": "Ataque de Tres: Parte 13"
    }
  },
  "183": {
    "number": 183,
    "original": "三つ巴の攻防⑭",
    "titles": {
      "en": "Three-Way Struggle: Part 14",
      "fr": "Trois clans en lutte [14]",
      "ja": "三つ巴の攻防⑭",
      "es": "Ataque de Tres: Parte 14"
    }
  },
  "184": {
    "number": 184,
    "original": "3枚の選択",
    "titles": {
      "en": "The Choice of Three Cards",
      "fr": "Trois choix",
      "ja": "3枚の選択",
      "es": "La Selección de las 3 Cartas"
    }
  },
  "185": {
    "number": 185,
    "original": "邂逅",
    "titles": {
      "en": "Chance Encounter",
      "fr": "Rencontre fortuite",
      "ja": "邂逅",
      "es": "Encuentro Casual"
    }
  },
  "186": {
    "number": 186,
    "original": "女王",
    "titles": {
      "en": "The Queen",
      "fr": "La reine",
      "ja": "女王",
      "es": "Reina"
    }
  },
  "187": {
    "number": 187,
    "original": "最高の餌",
    "titles": {
      "en": "The Best Fodder",
      "fr": "La meilleure des nourritures",
      "ja": "最高の餌",
      "es": "La Presa Definitiva"
    }
  },
  "188": {
    "number": 188,
    "original": "NGL",
    "titles": {
      "en": "N.G.L.",
      "fr": "NGL",
      "ja": "NGL",
      "es": "NGL"
    }
  },
  "189": {
    "number": 189,
    "original": "潜入",
    "titles": {
      "en": "Infiltration",
      "fr": "Infiltration",
      "ja": "潜入",
      "es": "Infiltración"
    }
  },
  "190": {
    "number": 190,
    "original": "狩り",
    "titles": {
      "en": "The Hunt",
      "fr": "Chasse",
      "ja": "狩り",
      "es": "Cacería"
    }
  },
  "191": {
    "number": 191,
    "original": "プロ",
    "titles": {
      "en": "Pros",
      "fr": "Professionnels",
      "ja": "プロ",
      "es": "Profesional"
    }
  },
  "192": {
    "number": 192,
    "original": "人間犬",
    "titles": {
      "en": "Human Dog",
      "fr": "L'homme chien",
      "ja": "人間犬",
      "es": "Perro Humano"
    }
  },
  "193": {
    "number": 193,
    "original": "チョキ",
    "titles": {
      "en": "Scissors",
      "fr": "Ciseaux",
      "ja": "チョキ",
      "es": "Tijeras"
    }
  },
  "194": {
    "number": 194,
    "original": "VSハギャ隊①",
    "titles": {
      "en": "Vs. Hagya's Squad: Part 1",
      "fr": "Contre les troupes de Hagya [1]",
      "ja": "VSハギャ隊①",
      "es": "Contra la Sección de Hagya: Parte 1"
    }
  },
  "195": {
    "number": 195,
    "original": "VSハギャ隊②",
    "titles": {
      "en": "Vs. Hagya's Squad: Part 2",
      "fr": "Contre les troupes de Hagya [2]",
      "ja": "VSハギャ隊②",
      "es": "Contra la Sección de Hagya: Parte 2"
    }
  },
  "196": {
    "number": 196,
    "original": "VSハギャ隊③",
    "titles": {
      "en": "Vs. Hagya's Squad: Part 3",
      "fr": "Contre les troupes de Hagya [3]",
      "ja": "VSハギャ隊③",
      "es": "Contra la Sección de Hagya: Parte 3"
    }
  },
  "197": {
    "number": 197,
    "original": "VSハギャ隊④",
    "titles": {
      "en": "Vs. Hagya's Squad: Part 4",
      "fr": "Contre les troupes de Hagya [4]",
      "ja": "VSハギャ隊④",
      "es": "Contra la Sección de Hagya: Parte 4"
    }
  },
  "198": {
    "number": 198,
    "original": "急襲",
    "titles": {
      "en": "Sudden Attack",
      "fr": "Offensive soudaine",
      "ja": "急襲",
      "es": "Ataque Sorpresa"
    }
  },
  "199": {
    "number": 199,
    "original": "光と影",
    "titles": {
      "en": "Light and Shadow",
      "fr": "Ombre et lumière",
      "ja": "光と影",
      "es": "Luz y Oscuridad"
    }
  },
  "200": {
    "number": 200,
    "original": "条件",
    "titles": {
      "en": "Stipulation",
      "fr": "Conditions",
      "ja": "条件",
      "es": "La Condición"
    }
  },
  "201": {
    "number": 201,
    "original": "再会",
    "titles": {
      "en": "Reunion",
      "fr": "Retrouvailles",
      "ja": "再会",
      "es": "Reunión"
    }
  },
  "202": {
    "number": 202,
    "original": "決闘",
    "titles": {
      "en": "Duel",
      "fr": "Combat",
      "ja": "決闘",
      "es": "Duelo"
    }
  },
  "203": {
    "number": 203,
    "original": "ジャイロ",
    "titles": {
      "en": "Gyro",
      "fr": "Jairo",
      "ja": "ジャイロ",
      "es": "Gyro"
    }
  },
  "204": {
    "number": 204,
    "original": "ジャイロは",
    "titles": {
      "en": "Gyro's Story",
      "fr": "Et Jairo ?",
      "ja": "ジャイロは",
      "es": "Sobre Gyro"
    }
  },
  "205": {
    "number": 205,
    "original": "残り時間",
    "titles": {
      "en": "Time Remaining",
      "fr": "Temps restant",
      "ja": "残り時間",
      "es": "Tiempo Restante"
    }
  },
  "206": {
    "number": 206,
    "original": "勝負",
    "titles": {
      "en": "A Real Fight",
      "fr": "Duel",
      "ja": "勝負",
      "es": "Victoria o Derrota"
    }
  },
  "207": {
    "number": 207,
    "original": "弱点①",
    "titles": {
      "en": "Weakness: Part 1",
      "fr": "Points faibles [1]",
      "ja": "弱点①",
      "es": "Debilidad, parte 1"
    }
  },
  "208": {
    "number": 208,
    "original": "弱点②",
    "titles": {
      "en": "Weakness: Part 2",
      "fr": "Points faibles [2]",
      "ja": "弱点②",
      "es": "Debilidad, parte 2"
    }
  },
  "209": {
    "number": 209,
    "original": "?",
    "titles": {
      "en": "?",
      "fr": "?",
      "ja": "?",
      "es": "?"
    }
  },
  "210": {
    "number": 210,
    "original": "弱点③",
    "titles": {
      "en": "Weakness: Part 3",
      "fr": "Points faibles [3]",
      "ja": "弱点③",
      "es": "Debilidad, parte 3"
    }
  },
  "211": {
    "number": 211,
    "original": "トイチ",
    "titles": {
      "en": "Loan Shark",
      "fr": "1 pour 10",
      "ja": "トイチ",
      "es": "10% de interés cada 10 días"
    }
  },
  "212": {
    "number": 212,
    "original": "破水",
    "titles": {
      "en": "Water Breaking",
      "fr": "Rupture amniotique",
      "ja": "破水",
      "es": "Ruptura"
    }
  },
  "213": {
    "number": 213,
    "original": "誕生",
    "titles": {
      "en": "Birth",
      "fr": "Naissance",
      "ja": "誕生",
      "es": "Nacimiento"
    }
  },
  "214": {
    "number": 214,
    "original": "決着",
    "titles": {
      "en": "Results",
      "fr": "Dénouement",
      "ja": "決着",
      "es": "Decisión"
    }
  },
  "215": {
    "number": 215,
    "original": "遺言",
    "titles": {
      "en": "Last Words",
      "fr": "Testament",
      "ja": "遺言",
      "es": "Último Deseo"
    }
  },
  "216": {
    "number": 216,
    "original": "東ゴルトー共和国",
    "titles": {
      "en": "Republic of East Gorteau",
      "fr": "République du Gorutô Est",
      "ja": "東ゴルトー共和国",
      "es": "La República de Goruto Oriental"
    }
  },
  "217": {
    "number": 217,
    "original": "肉樹園",
    "titles": {
      "en": "Meat Orchard",
      "fr": "Le jardin des viandes",
      "ja": "肉樹園",
      "es": "Nikushuen"
    }
  },
  "218": {
    "number": 218,
    "original": "告白",
    "titles": {
      "en": "Confession",
      "fr": "Déclaration",
      "ja": "告白",
      "es": "Confesión"
    }
  },
  "219": {
    "number": 219,
    "original": "覚醒",
    "titles": {
      "en": "Awakening",
      "fr": "Éveil",
      "ja": "覚醒",
      "es": "Despertar"
    }
  },
  "220": {
    "number": 220,
    "original": "再会①",
    "titles": {
      "en": "Reunion: Part 1",
      "fr": "Retrouvailles [1]",
      "ja": "再会①",
      "es": "Reunión, parte 1"
    }
  },
  "221": {
    "number": 221,
    "original": "再会②",
    "titles": {
      "en": "Reunion: Part 2",
      "fr": "Retrouvailles [2]",
      "ja": "再会②",
      "es": "Reunión, parte 2"
    }
  },
  "222": {
    "number": 222,
    "original": "再会③",
    "titles": {
      "en": "Reunion: Part 3",
      "fr": "Retrouvailles [3]",
      "ja": "再会③",
      "es": "Reunión, parte 13"
    }
  },
  "223": {
    "number": 223,
    "original": "10-①",
    "titles": {
      "en": "10: Part 1",
      "fr": "10 - [1]",
      "ja": "10-①",
      "es": "10, parte 1"
    }
  },
  "224": {
    "number": 224,
    "original": "10-②",
    "titles": {
      "en": "10: Part 2",
      "fr": "10 - [2]",
      "ja": "10-②",
      "es": "10, parte 2"
    }
  },
  "225": {
    "number": 225,
    "original": "10-③",
    "titles": {
      "en": "10: Part 3",
      "fr": "10 - [3]",
      "ja": "10-③",
      "es": "10, parte 3"
    }
  },
  "226": {
    "number": 226,
    "original": "10-④",
    "titles": {
      "en": "10: Part 4",
      "fr": "10 - [4]",
      "ja": "10-④",
      "es": "10, parte 4"
    }
  },
  "227": {
    "number": 227,
    "original": "10-⑤",
    "titles": {
      "en": "10: Part 5",
      "fr": "10 - [5]",
      "ja": "10-⑤",
      "es": "10, parte 5"
    }
  },
  "228": {
    "number": 228,
    "original": "10-⑥",
    "titles": {
      "en": "10: Part 6",
      "fr": "10 - [6]",
      "ja": "10-⑥",
      "es": "10, parte 6"
    }
  },
  "229": {
    "number": 229,
    "original": "10-⑦",
    "titles": {
      "en": "10: Part 7",
      "fr": "10 - [7]",
      "ja": "10-⑦",
      "es": "10, parte 7"
    }
  },
  "230": {
    "number": 230,
    "original": "9-①",
    "titles": {
      "en": "9: Part 1",
      "fr": "9 - [1]",
      "ja": "9-①",
      "es": "9, parte 1"
    }
  },
  "231": {
    "number": 231,
    "original": "9-②",
    "titles": {
      "en": "9: Part 2",
      "fr": "9 - [2]",
      "ja": "9-②",
      "es": "9, parte 2"
    }
  },
  "232": {
    "number": 232,
    "original": "9-③",
    "titles": {
      "en": "9: Part 3",
      "fr": "9 - [3]",
      "ja": "9-③",
      "es": "9, parte 3"
    }
  },
  "233": {
    "number": 233,
    "original": "9-④",
    "titles": {
      "en": "9: Part 4",
      "fr": "9 - [4]",
      "ja": "9-④",
      "es": "9, parte 4"
    }
  },
  "234": {
    "number": 234,
    "original": "9-⑤",
    "titles": {
      "en": "9: Part 5",
      "fr": "9 - [5]",
      "ja": "9-⑤",
      "es": "9, parte 5"
    }
  },
  "235": {
    "number": 235,
    "original": "8-①",
    "titles": {
      "en": "8: Part 1",
      "fr": "8 - [1]",
      "ja": "8-①",
      "es": "8, parte 1"
    }
  },
  "236": {
    "number": 236,
    "original": "8-②",
    "titles": {
      "en": "8: Part 2",
      "fr": "8 - [2]",
      "ja": "8-②",
      "es": "8, parte 2"
    }
  },
  "237": {
    "number": 237,
    "original": "8-③",
    "titles": {
      "en": "8: Part 3",
      "fr": "8 - [3]",
      "ja": "8-③",
      "es": "8, parte 3"
    }
  },
  "238": {
    "number": 238,
    "original": "8-④",
    "titles": {
      "en": "8: Part 4",
      "fr": "8 - [4]",
      "ja": "8-④",
      "es": "8, parte 4"
    }
  },
  "239": {
    "number": 239,
    "original": "8-⑤",
    "titles": {
      "en": "8: Part 5",
      "fr": "8 - [5]",
      "ja": "8-⑤",
      "es": "8, parte 5"
    }
  },
  "240": {
    "number": 240,
    "original": "8-⑥",
    "titles": {
      "en": "8: Part 6",
      "fr": "8 - [6]",
      "ja": "8-⑥",
      "es": "8, parte 6"
    }
  },
  "241": {
    "number": 241,
    "original": "8-⑦",
    "titles": {
      "en": "8: Part 7",
      "fr": "8 - [7]",
      "ja": "8-⑦",
      "es": "8, parte 7"
    }
  },
  "242": {
    "number": 242,
    "original": "7-①",
    "titles": {
      "en": "7: Part 1",
      "fr": "7 - [1]",
      "ja": "7-①",
      "es": "7, parte 1"
    }
  },
  "243": {
    "number": 243,
    "original": "7-②",
    "titles": {
      "en": "7: Part 2",
      "fr": "7 - [2]",
      "ja": "7-②",
      "es": "7, parte 2"
    }
  },
  "244": {
    "number": 244,
    "original": "6-①",
    "titles": {
      "en": "6: Part 1",
      "fr": "6 - [1]",
      "ja": "6-①",
      "es": "6, parte 1"
    }
  },
  "245": {
    "number": 245,
    "original": "6-②",
    "titles": {
      "en": "6: Part 2",
      "fr": "6 - [2]",
      "ja": "6-②",
      "es": "6, parte 2"
    }
  },
  "246": {
    "number": 246,
    "original": "6-③",
    "titles": {
      "en": "6: Part 3",
      "fr": "6 - [3]",
      "ja": "6-③",
      "es": "6, parte 3"
    }
  },
  "247": {
    "number": 247,
    "original": "6-④",
    "titles": {
      "en": "6: Part 4",
      "fr": "6 - [4]",
      "ja": "6-④",
      "es": "6, parte 4"
    }
  },
  "248": {
    "number": 248,
    "original": "6-⑤",
    "titles": {
      "en": "6: Part 5",
      "fr": "6 - [5]",
      "ja": "6-⑤",
      "es": "6, parte 5"
    }
  },
  "249": {
    "number": 249,
    "original": "6-⑥",
    "titles": {
      "en": "6: Part 6",
      "fr": "6 - [6]",
      "ja": "6-⑥",
      "es": "6, parte 6"
    }
  },
  "250": {
    "number": 250,
    "original": "6-⑦",
    "titles": {
      "en": "6: Part 7",
      "fr": "6 - [7]",
      "ja": "6-⑦",
      "es": "6, parte 7"
    }
  },
  "251": {
    "number": 251,
    "original": "6-⑧",
    "titles": {
      "en": "6: Part 8",
      "fr": "6 - [8]",
      "ja": "6-⑧",
      "es": "6, parte 8"
    }
  },
  "252": {
    "number": 252,
    "original": "6-⑨",
    "titles": {
      "en": "6: Part 9",
      "fr": "6 - [9]",
      "ja": "6-⑨",
      "es": "6, parte 9"
    }
  },
  "253": {
    "number": 253,
    "original": "6-⑩",
    "titles": {
      "en": "6: Part 10",
      "fr": "6 - [10]",
      "ja": "6-⑩",
      "es": "6, parte 10"
    }
  },
  "254": {
    "number": 254,
    "original": "6-⑪",
    "titles": {
      "en": "6: Part 11",
      "fr": "6 - [11]",
      "ja": "6-⑪",
      "es": "6, parte 11"
    }
  },
  "255": {
    "number": 255,
    "original": "5-①〜2-①",
    "titles": {
      "en": "5: Part 1 to 2: Part 1",
      "fr": "5 - [1]… 2 - [1]",
      "ja": "5-①〜2-①",
      "es": "5-2, parte 1"
    }
  },
  "256": {
    "number": 256,
    "original": "2-②",
    "titles": {
      "en": "2: Part 2",
      "fr": "2 - [2]",
      "ja": "2-②",
      "es": "2, parte 2"
    }
  },
  "257": {
    "number": 257,
    "original": "1-①",
    "titles": {
      "en": "1: Part 1",
      "fr": "1 - [1]",
      "ja": "1-①",
      "es": "1, parte 1"
    }
  },
  "258": {
    "number": 258,
    "original": "1-②",
    "titles": {
      "en": "1: Part 2",
      "fr": "1 - [2]",
      "ja": "1-②",
      "es": "1, parte 2"
    }
  },
  "259": {
    "number": 259,
    "original": "1-③",
    "titles": {
      "en": "1: Part 3",
      "fr": "1 - [3]",
      "ja": "1-③",
      "es": "1, parte 3"
    }
  },
  "260": {
    "number": 260,
    "original": "1-④",
    "titles": {
      "en": "1: Part 4",
      "fr": "1 - [4]",
      "ja": "1-④",
      "es": "1, parte 4"
    }
  },
  "261": {
    "number": 261,
    "original": "突入①",
    "titles": {
      "en": "Charge: Part 1",
      "fr": "Assaut [1]",
      "ja": "突入①",
      "es": "Ataque, Parte 1"
    }
  },
  "262": {
    "number": 262,
    "original": "突入②",
    "titles": {
      "en": "Charge: Part 2",
      "fr": "Assaut [2]",
      "ja": "突入②",
      "es": "Ataque, Parte 2"
    }
  },
  "263": {
    "number": 263,
    "original": "突入③",
    "titles": {
      "en": "Charge: Part 3",
      "fr": "Assaut [3]",
      "ja": "突入③",
      "es": "Ataque, Parte 3"
    }
  },
  "264": {
    "number": 264,
    "original": "突入④",
    "titles": {
      "en": "Charge: Part 4",
      "fr": "Assaut [4]",
      "ja": "突入④",
      "es": "Ataque, Parte 4"
    }
  },
  "265": {
    "number": 265,
    "original": "突入⑤",
    "titles": {
      "en": "Charge: Part 5",
      "fr": "Assaut [5]",
      "ja": "突入⑤",
      "es": "Ataque, Parte 5"
    }
  },
  "266": {
    "number": 266,
    "original": "『万が一』",
    "titles": {
      "en": "In the Unlikely Event Of...",
      "fr": "Et si jamais…",
      "ja": "『万が一』",
      "es": "El Peor Escenario"
    }
  },
  "267": {
    "number": 267,
    "original": "発動",
    "titles": {
      "en": "Activation",
      "fr": "Activation",
      "ja": "発動",
      "es": "Activación"
    }
  },
  "268": {
    "number": 268,
    "original": "王。",
    "titles": {
      "en": "The King",
      "fr": "Le roi",
      "ja": "王。",
      "es": "Rey"
    }
  },
  "269": {
    "number": 269,
    "original": "逆境○",
    "titles": {
      "en": "Adversity Is a Good Thing",
      "fr": "Infortune",
      "ja": "逆境○",
      "es": "Préstamo"
    }
  },
  "270": {
    "number": 270,
    "original": "貸し",
    "titles": {
      "en": "Indebted To",
      "fr": "Dette",
      "ja": "貸し",
      "es": "Endeuda"
    }
  },
  "271": {
    "number": 271,
    "original": "分断",
    "titles": {
      "en": "Separation",
      "fr": "Scission",
      "ja": "分断",
      "es": "Separación"
    }
  },
  "272": {
    "number": 272,
    "original": "誤算",
    "titles": {
      "en": "Error",
      "fr": "Mauvais calculs",
      "ja": "誤算",
      "es": "Error"
    }
  },
  "273": {
    "number": 273,
    "original": "再会",
    "titles": {
      "en": "We Meet Again",
      "fr": "Retrouvailles",
      "ja": "再会",
      "es": "Reunión"
    }
  },
  "274": {
    "number": 274,
    "original": "解答",
    "titles": {
      "en": "Solution",
      "fr": "Réponses",
      "ja": "解答",
      "es": "Respuesta"
    }
  },
  "275": {
    "number": 275,
    "original": "約束",
    "titles": {
      "en": "Promise",
      "fr": "Promesse",
      "ja": "約束",
      "es": "Promesa"
    }
  },
  "276": {
    "number": 276,
    "original": "卵男",
    "titles": {
      "en": "Missileman",
      "fr": "Missileman",
      "ja": "卵男",
      "es": "Hombre-Misil"
    }
  },
  "277": {
    "number": 277,
    "original": "侮辱",
    "titles": {
      "en": "Insult",
      "fr": "Humiliation",
      "ja": "侮辱",
      "es": "Insulto"
    }
  },
  "278": {
    "number": 278,
    "original": "破壊",
    "titles": {
      "en": "Destruction",
      "fr": "Destruction",
      "ja": "破壊",
      "es": "Destrucción"
    }
  },
  "279": {
    "number": 279,
    "original": "脱出",
    "titles": {
      "en": "Escape",
      "fr": "Évasion",
      "ja": "脱出",
      "es": "Escape"
    }
  },
  "280": {
    "number": 280,
    "original": "直撃",
    "titles": {
      "en": "Direct Hit",
      "fr": "Choc frontal",
      "ja": "直撃",
      "es": "Golpe Directo"
    }
  },
  "281": {
    "number": 281,
    "original": "神速",
    "titles": {
      "en": "Godspeed",
      "fr": "Kanmuru",
      "ja": "神速",
      "es": "Dios de la Velocidad"
    }
  },
  "282": {
    "number": 282,
    "original": "密室",
    "titles": {
      "en": "Sealed Area",
      "fr": "Isolé",
      "ja": "密室",
      "es": "Área de Sellado"
    }
  },
  "283": {
    "number": 283,
    "original": "決心",
    "titles": {
      "en": "Determination",
      "fr": "Détermination",
      "ja": "決心",
      "es": "Determinación"
    }
  },
  "284": {
    "number": 284,
    "original": "15分",
    "titles": {
      "en": "Fifteen Minutes",
      "fr": "15 minutes",
      "ja": "15分",
      "es": "15 Minutos"
    }
  },
  "285": {
    "number": 285,
    "original": "分身",
    "titles": {
      "en": "Doubles",
      "fr": "Clones",
      "ja": "分身",
      "es": "Dobles"
    }
  },
  "286": {
    "number": 286,
    "original": "本体",
    "titles": {
      "en": "Core",
      "fr": "Corps principal",
      "ja": "本体",
      "es": "Núcleo"
    }
  },
  "287": {
    "number": 287,
    "original": "現状",
    "titles": {
      "en": "Present State",
      "fr": "Situation",
      "ja": "現状",
      "es": "Estado Actual"
    }
  },
  "288": {
    "number": 288,
    "original": "賞賛",
    "titles": {
      "en": "Accolade",
      "fr": "Éloges",
      "ja": "賞賛",
      "es": "Premio"
    }
  },
  "289": {
    "number": 289,
    "original": "条件",
    "titles": {
      "en": "Terms",
      "fr": "Condition",
      "ja": "条件",
      "es": "Términos"
    }
  },
  "290": {
    "number": 290,
    "original": "名前",
    "titles": {
      "en": "Name",
      "fr": "Nom",
      "ja": "名前",
      "es": "Nombre"
    }
  },
  "291": {
    "number": 291,
    "original": "自問",
    "titles": {
      "en": "Soliloquy",
      "fr": "Interrogation personnelle",
      "ja": "自問",
      "es": "Soliloquio"
    }
  },
  "292": {
    "number": 292,
    "original": "思惑",
    "titles": {
      "en": "Hidden Agenda",
      "fr": "Pensée",
      "ja": "思惑",
      "es": "Cálculo"
    }
  },
  "293": {
    "number": 293,
    "original": "変貌",
    "titles": {
      "en": "Metamorphosis",
      "fr": "Métamorphose",
      "ja": "変貌",
      "es": "Metamorfosis"
    }
  },
  "294": {
    "number": 294,
    "original": "決壊",
    "titles": {
      "en": "Breakdown",
      "fr": "Rupture",
      "ja": "決壊",
      "es": "Colapso"
    }
  },
  "295": {
    "number": 295,
    "original": "決意",
    "titles": {
      "en": "Determination",
      "fr": "Décision",
      "ja": "決意",
      "es": "Determinación"
    }
  },
  "296": {
    "number": 296,
    "original": "告白",
    "titles": {
      "en": "Admission",
      "fr": "Révélation",
      "ja": "告白",
      "es": "Recuerdos"
    }
  },
  "297": {
    "number": 297,
    "original": "最後",
    "titles": {
      "en": "The Last",
      "fr": "Dernier",
      "ja": "最後",
      "es": "Fin"
    }
  },
  "298": {
    "number": 298,
    "original": "薔薇",
    "titles": {
      "en": "Rose",
      "fr": "Rose",
      "ja": "薔薇",
      "es": "Rosa"
    }
  },
  "299": {
    "number": 299,
    "original": "再生",
    "titles": {
      "en": "Regeneration",
      "fr": "Renaissance",
      "ja": "再生",
      "es": "Resurrección"
    }
  },
  "300": {
    "number": 300,
    "original": "保険",
    "titles": {
      "en": "Insurance",
      "fr": "Garantie",
      "ja": "保険",
      "es": "Seguridad"
    }
  },
  "301": {
    "number": 301,
    "original": "記憶",
    "titles": {
      "en": "Memories",
      "fr": "Mémoire",
      "ja": "記憶",
      "es": "Recuerdos"
    }
  },
  "302": {
    "number": 302,
    "original": "標的",
    "titles": {
      "en": "Target",
      "fr": "Cible",
      "ja": "標的",
      "es": "Objetivo"
    }
  },
  "303": {
    "number": 303,
    "original": "痛み",
    "titles": {
      "en": "Pain",
      "fr": "Douleur",
      "ja": "痛み",
      "es": "Dolor"
    }
  },
  "304": {
    "number": 304,
    "original": "魔法",
    "titles": {
      "en": "Magic",
      "fr": "Magie",
      "ja": "魔法",
      "es": "Magia"
    }
  },
  "305": {
    "number": 305,
    "original": "残念",
    "titles": {
      "en": "Unfortunate",
      "fr": "Déception",
      "ja": "残念",
      "es": "Desafortunadamente"
    }
  },
  "306": {
    "number": 306,
    "original": "安堵",
    "titles": {
      "en": "Relief",
      "fr": "Soulagement",
      "ja": "安堵",
      "es": "Alivio"
    }
  },
  "307": {
    "number": 307,
    "original": "喪失",
    "titles": {
      "en": "Loss",
      "fr": "Perte",
      "ja": "喪失",
      "es": "Perdida"
    }
  },
  "308": {
    "number": 308,
    "original": "閃光",
    "titles": {
      "en": "Flash",
      "fr": "Éclat",
      "ja": "閃光",
      "es": "Destello"
    }
  },
  "309": {
    "number": 309,
    "original": "勝負",
    "titles": {
      "en": "Match",
      "fr": "Duel",
      "ja": "勝負",
      "es": "Competencia"
    }
  },
  "310": {
    "number": 310,
    "original": "始動",
    "titles": {
      "en": "Start",
      "fr": "Action",
      "ja": "始動",
      "es": "Comienzo"
    }
  },
  "311": {
    "number": 311,
    "original": "期限",
    "titles": {
      "en": "Deadline",
      "fr": "Temps compté",
      "ja": "期限",
      "es": "Tiempo Límite"
    }
  },
  "312": {
    "number": 312,
    "original": "覚悟",
    "titles": {
      "en": "Resolve",
      "fr": "Résignation",
      "ja": "覚悟",
      "es": "Resolución"
    }
  },
  "313": {
    "number": 313,
    "original": "一言",
    "titles": {
      "en": "One Word",
      "fr": "Un seul mot",
      "ja": "一言",
      "es": "Una Simple Palabra"
    }
  },
  "314": {
    "number": 314,
    "original": "説得",
    "titles": {
      "en": "Persuasion",
      "fr": "Persuasion",
      "ja": "説得",
      "es": "Persuasión"
    }
  },
  "315": {
    "number": 315,
    "original": "帰郷",
    "titles": {
      "en": "Home",
      "fr": "Retour chez soi",
      "ja": "帰郷",
      "es": "De Vuelta a Casa"
    }
  },
  "316": {
    "number": 316,
    "original": "本名",
    "titles": {
      "en": "Real Name",
      "fr": "Vrai nom",
      "ja": "本名",
      "es": "Verdadero Nombre"
    }
  },
  "317": {
    "number": 317,
    "original": "返答",
    "titles": {
      "en": "Answer",
      "fr": "Réponse",
      "ja": "返答",
      "es": "Respuesta"
    }
  },
  "318": {
    "number": 318,
    "original": "遺言",
    "titles": {
      "en": "Final Will",
      "fr": "Testament",
      "ja": "遺言",
      "es": "Testamento"
    }
  },
  "319": {
    "number": 319,
    "original": "抽選",
    "titles": {
      "en": "Lotteries",
      "fr": "Tirage au sort",
      "ja": "抽選",
      "es": "Sorteo"
    }
  },
  "320": {
    "number": 320,
    "original": "投票",
    "titles": {
      "en": "Voting",
      "fr": "Vote",
      "ja": "投票",
      "es": "Votando"
    }
  },
  "321": {
    "number": 321,
    "original": "怪者",
    "titles": {
      "en": "Monster",
      "fr": "Animal",
      "ja": "怪者",
      "es": "Monstruo"
    }
  },
  "322": {
    "number": 322,
    "original": "兄妹",
    "titles": {
      "en": "Siblings",
      "fr": "Frères et sœurs",
      "ja": "兄妹",
      "es": "Hermanos"
    }
  },
  "323": {
    "number": 323,
    "original": "依頼",
    "titles": {
      "en": "Job Offer",
      "fr": "Demande",
      "ja": "依頼",
      "es": "Petición"
    }
  },
  "324": {
    "number": 324,
    "original": "執事",
    "titles": {
      "en": "Butler",
      "fr": "Les intendants",
      "ja": "執事",
      "es": "Mayordomos"
    }
  },
  "325": {
    "number": 325,
    "original": "参戦",
    "titles": {
      "en": "Joining the Fray",
      "fr": "Entrée en guerre",
      "ja": "参戦",
      "es": "Uniéndose a la Batalla"
    }
  },
  "326": {
    "number": 326,
    "original": "開戦",
    "titles": {
      "en": "Open Hostilities",
      "fr": "Début des hostilités",
      "ja": "開戦",
      "es": "El Comienzo de la Batalla"
    }
  },
  "327": {
    "number": 327,
    "original": "謎々",
    "titles": {
      "en": "Riddle",
      "fr": "Devinette",
      "ja": "謎々",
      "es": "Adivinanza"
    }
  },
  "328": {
    "number": 328,
    "original": "手配",
    "titles": {
      "en": "Arrangements",
      "fr": "Arrangement",
      "ja": "手配",
      "es": "Arreglo"
    }
  },
  "329": {
    "number": 329,
    "original": "密偵",
    "titles": {
      "en": "Spy",
      "fr": "Mouchard",
      "ja": "密偵",
      "es": "Espía"
    }
  },
  "330": {
    "number": 330,
    "original": "告白",
    "titles": {
      "en": "Confession",
      "fr": "Aveux",
      "ja": "告白",
      "es": "Confesión"
    }
  },
  "331": {
    "number": 331,
    "original": "X日",
    "titles": {
      "en": "Day of Reckoning",
      "fr": "Jour J",
      "ja": "X日",
      "es": "Día X"
    }
  },
  "332": {
    "number": 332,
    "original": "喝采",
    "titles": {
      "en": "Applause",
      "fr": "Ovation",
      "ja": "喝采",
      "es": "Aplausos"
    }
  },
  "333": {
    "number": 333,
    "original": "鳴動",
    "titles": {
      "en": "Rumble",
      "fr": "Beaucoup de bruit pour rien",
      "ja": "鳴動",
      "es": "Estruendos"
    }
  },
  "334": {
    "number": 334,
    "original": "完敗",
    "titles": {
      "en": "Total Defeat",
      "fr": "Défaite incontestable",
      "ja": "完敗",
      "es": "Derrota Total"
    }
  },
  "335": {
    "number": 335,
    "original": "決定",
    "titles": {
      "en": "Decision",
      "fr": "Décision",
      "ja": "決定",
      "es": "Decisión"
    }
  },
  "336": {
    "number": 336,
    "original": "解除",
    "titles": {
      "en": "Release",
      "fr": "Libération",
      "ja": "解除",
      "es": "Cancelar"
    }
  },
  "337": {
    "number": 337,
    "original": "懺悔",
    "titles": {
      "en": "Repentance",
      "fr": "Confession",
      "ja": "懺悔",
      "es": "Confesión"
    }
  },
  "338": {
    "number": 338,
    "original": "樹上",
    "titles": {
      "en": "Atop a Tree",
      "fr": "Au sommet de l'arbre",
      "ja": "樹上",
      "es": "En lo Alto del Árbol"
    }
  },
  "339": {
    "number": 339,
    "original": "静寂",
    "titles": {
      "en": "Stillness",
      "fr": "Silence",
      "ja": "静寂",
      "es": "Silencio"
    }
  },
  "340": {
    "number": 340,
    "original": "特命",
    "titles": {
      "en": "Special Mission",
      "fr": "Mission spéciale",
      "ja": "特命",
      "es": "Misión Extraordinaria"
    }
  },
  "341": {
    "number": 341,
    "original": "厄災",
    "titles": {
      "en": "Threats",
      "fr": "Calamités",
      "ja": "厄災"
    }
  },
  "342": {
    "number": 342,
    "original": "布告",
    "titles": {
      "en": "Challenge",
      "fr": "Décret",
      "ja": "布告"
    }
  },
  "343": {
    "number": 343,
    "original": "勧誘",
    "titles": {
      "en": "Invitation",
      "fr": "Invitation",
      "ja": "勧誘"
    }
  },
  "344": {
    "number": 344,
    "original": "著者",
    "titles": {
      "en": "Author",
      "fr": "Auteur",
      "ja": "著者"
    }
  },
  "345": {
    "number": 345,
    "original": "署名",
    "titles": {
      "en": "Signature",
      "fr": "Signature",
      "ja": "署名"
    }
  },
  "346": {
    "number": 346,
    "original": "選択",
    "titles": {
      "en": "Options",
      "fr": "Choix",
      "ja": "選択"
    }
  },
  "347": {
    "number": 347,
    "original": "就任",
    "titles": {
      "en": "Inauguration",
      "fr": "Prise de fonction",
      "ja": "就任"
    }
  },
  "348": {
    "number": 348,
    "original": "覚悟",
    "titles": {
      "en": "Resolve",
      "fr": "Préparation",
      "ja": "覚悟"
    }
  },
  "349": {
    "number": 349,
    "original": "蠱毒",
    "titles": {
      "en": "Worm Toxin",
      "fr": "Mauvais gu",
      "ja": "蠱毒"
    }
  },
  "350": {
    "number": 350,
    "original": "王子",
    "titles": {
      "en": "Prince",
      "fr": "Les princes",
      "ja": "王子"
    }
  },
  "351": {
    "number": 351,
    "original": "死闘",
    "titles": {
      "en": "Battle to the Death",
      "fr": "Combat à mort",
      "ja": "死闘"
    }
  },
  "352": {
    "number": 352,
    "original": "厄介",
    "titles": {
      "en": "Troublesome",
      "fr": "Embarras",
      "ja": "厄介"
    }
  },
  "353": {
    "number": 353,
    "original": "冷徹",
    "titles": {
      "en": "Cold-Blooded",
      "fr": "Perspicacité",
      "ja": "冷徹"
    }
  },
  "354": {
    "number": 354,
    "original": "頭部",
    "titles": {
      "en": "Head",
      "fr": "Tête",
      "ja": "頭部"
    }
  },
  "355": {
    "number": 355,
    "original": "爆破",
    "titles": {
      "en": "Detonation",
      "fr": "Explosion",
      "ja": "爆破"
    }
  },
  "356": {
    "number": 356,
    "original": "残念①",
    "titles": {
      "en": "Unfortunate: Part 1",
      "fr": "Dommage [1]",
      "ja": "残念①"
    }
  },
  "357": {
    "number": 357,
    "original": "残念②",
    "titles": {
      "en": "Unfortunate: Part 2",
      "fr": "Dommage [2]",
      "ja": "残念②"
    }
  },
  "358": {
    "number": 358,
    "original": "前夜",
    "titles": {
      "en": "Eve",
      "fr": "La veille au soir",
      "ja": "前夜"
    }
  },
  "359": {
    "number": 359,
    "original": "出航",
    "titles": {
      "en": "Departure",
      "fr": "Le départ",
      "ja": "出航"
    }
  },
  "360": {
    "number": 360,
    "original": "寄生",
    "titles": {
      "en": "Parasite",
      "fr": "Parasite",
      "ja": "寄生"
    }
  },
  "361": {
    "number": 361,
    "original": "辞退",
    "titles": {
      "en": "Withdraw",
      "fr": "Refus",
      "ja": "辞退"
    }
  },
  "362": {
    "number": 362,
    "original": "決意",
    "titles": {
      "en": "Resolve",
      "fr": "Décision",
      "ja": "決意"
    }
  },
  "363": {
    "number": 363,
    "original": "念獣",
    "titles": {
      "en": "Nen Beast",
      "fr": "Bête de nen",
      "ja": "念獣"
    }
  },
  "364": {
    "number": 364,
    "original": "思惑",
    "titles": {
      "en": "Speculation",
      "fr": "Intentions",
      "ja": "思惑"
    }
  },
  "365": {
    "number": 365,
    "original": "選択",
    "titles": {
      "en": "Choice",
      "fr": "Choix",
      "ja": "選択"
    }
  },
  "366": {
    "number": 366,
    "original": "其々",
    "titles": {
      "en": "To Each His Own",
      "fr": "Tout un chacun",
      "ja": "其々"
    }
  },
  "367": {
    "number": 367,
    "original": "同期",
    "titles": {
      "en": "Synchronization",
      "fr": "Synchronisation",
      "ja": "同期"
    }
  },
  "368": {
    "number": 368,
    "original": "凶行",
    "titles": {
      "en": "Foul Play",
      "fr": "Meurtre",
      "ja": "凶行"
    }
  },
  "369": {
    "number": 369,
    "original": "限界",
    "titles": {
      "en": "Limits",
      "fr": "Limites",
      "ja": "限界"
    }
  },
  "370": {
    "number": 370,
    "original": "観察",
    "titles": {
      "en": "Observation",
      "fr": "Observation",
      "ja": "観察"
    }
  },
  "371": {
    "number": 371,
    "original": "任務",
    "titles": {
      "en": "Mission",
      "fr": "Mission",
      "ja": "任務"
    }
  },
  "372": {
    "number": 372,
    "original": "消失",
    "titles": {
      "en": "Disappearance",
      "fr": "Disparition",
      "ja": "消失"
    }
  },
  "373": {
    "number": 373,
    "original": "継承",
    "titles": {
      "en": "Inheritance",
      "fr": "Succession",
      "ja": "継承"
    }
  },
  "374": {
    "number": 374,
    "original": "能力",
    "titles": {
      "en": "Ability",
      "fr": "Faculté",
      "ja": "能力"
    }
  },
  "375": {
    "number": 375,
    "original": "説得",
    "titles": {
      "en": "Persuasion",
      "fr": "Persuasion",
      "ja": "説得"
    }
  },
  "376": {
    "number": 376,
    "original": "決意",
    "titles": {
      "en": "Determination",
      "fr": "Décision",
      "ja": "決意"
    }
  },
  "377": {
    "number": 377,
    "original": "画策",
    "titles": {
      "en": "Scheme",
      "fr": "Intrigues",
      "ja": "画策"
    }
  },
  "378": {
    "number": 378,
    "original": "均衡（バランス）",
    "titles": {
      "en": "Balance",
      "fr": "Équilibre",
      "ja": "均衡（バランス）"
    }
  },
  "379": {
    "number": 379,
    "original": "共闘（コラボ）",
    "titles": {
      "en": "Collaboration",
      "fr": "Coopération",
      "ja": "共闘（コラボ）"
    }
  },
  "380": {
    "number": 380,
    "original": "警報",
    "titles": {
      "en": "Alarm",
      "fr": "Alerte",
      "ja": "警報"
    }
  },
  "381": {
    "number": 381,
    "original": "捕食",
    "titles": {
      "en": "Predation",
      "fr": "Predator",
      "ja": "捕食"
    }
  },
  "382": {
    "number": 382,
    "original": "覚醒",
    "titles": {
      "en": "Awakening",
      "fr": "L'éveil",
      "ja": "覚醒"
    }
  },
  "383": {
    "number": 383,
    "original": "脱出",
    "titles": {
      "en": "Escape",
      "fr": "La fuite",
      "ja": "脱出"
    }
  },
  "384": {
    "number": 384,
    "original": "抗争",
    "titles": {
      "en": "War",
      "fr": "Conflit",
      "ja": "抗争"
    }
  },
  "385": {
    "number": 385,
    "original": "警告",
    "titles": {
      "en": "Warning",
      "fr": "Mise en garde",
      "ja": "警告"
    }
  },
  "386": {
    "number": 386,
    "original": "仮説",
    "titles": {
      "en": "Hypothesis",
      "fr": "Hypothèse",
      "ja": "仮説"
    }
  },
  "387": {
    "number": 387,
    "original": "再現",
    "titles": {
      "en": "Recreation",
      "fr": "Répétitions",
      "ja": "再現"
    }
  },
  "388": {
    "number": 388,
    "original": "思案",
    "titles": {
      "en": "Reflection",
      "fr": "Réflexions",
      "ja": "思案"
    }
  },
  "389": {
    "number": 389,
    "original": "呪詛",
    "titles": {
      "en": "Curse",
      "fr": "Malédiction",
      "ja": "呪詛"
    }
  },
  "390": {
    "number": 390,
    "original": "衝突①",
    "titles": {
      "en": "Clash: Part 1",
      "fr": "Rixes [1]",
      "ja": "衝突①"
    }
  },
  "391": {
    "number": 391,
    "original": "衝突②",
    "titles": {
      "en": "Clash 2",
      "fr": "Affrontement 2",
      "ja": "衝突②",
      "es": "Choque 2",
      "pt": "Confronto 2",
      "zh": "冲突②",
      "ar": "اشتباك 2"
    }
  },
  "392": {
    "number": 392,
    "original": "情報",
    "titles": {
      "en": "Intel",
      "fr": "Informations",
      "ja": "情報",
      "es": "Información",
      "pt": "Informações",
      "zh": "情报",
      "ar": "معلومات"
    }
  },
  "393": {
    "number": 393,
    "original": "提案",
    "titles": {
      "en": "Proposal",
      "fr": "Proposition",
      "ja": "提案",
      "es": "Propuesta",
      "pt": "Proposta",
      "zh": "提案",
      "ar": "اقتراح"
    }
  },
  "394": {
    "number": 394,
    "original": "覚醒",
    "titles": {
      "en": "Awakening",
      "fr": "Éveil",
      "ja": "覚醒",
      "es": "Despertar",
      "pt": "Despertar",
      "zh": "觉醒",
      "ar": "صحوة"
    }
  },
  "395": {
    "number": 395,
    "original": "結成①",
    "titles": {
      "en": "Founding 1",
      "fr": "Fondation 1",
      "ja": "結成①",
      "es": "Fundación 1",
      "pt": "Formação 1",
      "zh": "结成①",
      "ar": "التأسيس 1"
    }
  },
  "396": {
    "number": 396,
    "original": "結成②",
    "titles": {
      "en": "Founding 2",
      "fr": "Fondation 2",
      "ja": "結成②",
      "es": "Fundación 2",
      "pt": "Formação 2",
      "zh": "结成②",
      "ar": "التأسيس 2"
    }
  },
  "397": {
    "number": 397,
    "original": "結成③",
    "titles": {
      "en": "Founding 3",
      "fr": "Fondation 3",
      "ja": "結成③",
      "es": "Fundación 3",
      "pt": "Formação 3",
      "zh": "结成③",
      "ar": "التأسيس 3"
    }
  },
  "398": {
    "number": 398,
    "original": "捜索",
    "titles": {
      "en": "Search",
      "fr": "Recherche",
      "ja": "捜索",
      "es": "Búsqueda",
      "pt": "Busca",
      "zh": "搜索",
      "ar": "بحث"
    }
  },
  "399": {
    "number": 399,
    "original": "脱出",
    "titles": {
      "en": "Expulsion",
      "fr": "Évacuation",
      "ja": "脱出",
      "es": "Expulsión",
      "pt": "Expulsão",
      "zh": "逃离",
      "ar": "طرد"
    }
  },
  "400": {
    "number": 400,
    "original": "孤立",
    "titles": {
      "en": "Seclusion",
      "fr": "Dissimulation",
      "ja": "孤立",
      "es": "Aislamiento",
      "pt": "Isolamento",
      "zh": "孤立",
      "ar": "عزلة"
    }
  },
  "401": {
    "number": 401,
    "original": "月光",
    "titles": {
      "en": "Moonlight",
      "fr": "Clair de lune",
      "ja": "月光",
      "es": "Luz de luna",
      "pt": "Luar",
      "zh": "月光",
      "ar": "ضوء القمر"
    }
  },
  "402": {
    "number": 402,
    "original": "手紙",
    "titles": {
      "en": "Letter",
      "fr": "La Lettre",
      "ja": "手紙",
      "es": "Carta",
      "pt": "Carta",
      "zh": "信件",
      "ar": "رسالة"
    }
  },
  "403": {
    "number": 403,
    "original": "成果",
    "titles": {
      "en": "Results",
      "fr": "Résultats",
      "ja": "成果",
      "es": "Resultados",
      "pt": "Resultados",
      "zh": "成果",
      "ar": "نتائج"
    }
  },
  "404": {
    "number": 404,
    "original": "芝居",
    "titles": {
      "en": "Acting",
      "fr": "Comédie",
      "ja": "芝居",
      "es": "Actuación",
      "pt": "Atuação",
      "zh": "演戏",
      "ar": "تمثيل"
    }
  },
  "405": {
    "number": 405,
    "original": "神器",
    "titles": {
      "en": "Sacred Treasures",
      "fr": "Trésors sacrés",
      "ja": "神器",
      "es": "Tesoros sagrados",
      "pt": "Tesouros Sagrados",
      "zh": "神器",
      "ar": "الكنوز المقدسة"
    }
  },
  "406": {
    "number": 406,
    "original": "交渉①",
    "titles": {
      "en": "Negotiation 1",
      "fr": "Négociations 1",
      "ja": "交渉①",
      "es": "Negociación 1",
      "pt": "Negociação 1",
      "zh": "交涉①",
      "ar": "مفاوضات 1"
    }
  },
  "407": {
    "number": 407,
    "original": "交渉②",
    "titles": {
      "en": "Negotiation 2",
      "fr": "Négociations 2",
      "ja": "交渉②",
      "es": "Negociación 2",
      "pt": "Negociação 2",
      "zh": "交涉②",
      "ar": "مفاوضات 2"
    }
  },
  "408": {
    "number": 408,
    "original": "交渉③",
    "titles": {
      "en": "Negotiation 3",
      "fr": "Négociations 3",
      "ja": "交渉③",
      "es": "Negociación 3",
      "pt": "Negociação 3",
      "zh": "交涉③",
      "ar": "مفاوضات 3"
    }
  },
  "409": {
    "number": 409,
    "original": "交渉④",
    "titles": {
      "en": "Negotiation 4",
      "fr": "Négociations 4",
      "ja": "交渉④",
      "es": "Negociación 4",
      "pt": "Negociação 4",
      "zh": "交涉④",
      "ar": "مفاوضات 4"
    }
  },
  "410": {
    "number": 410,
    "original": "発表",
    "titles": {
      "en": "Announcement",
      "fr": "Annonce",
      "ja": "発表",
      "es": "Anuncio",
      "pt": "Anúncio",
      "zh": "公布",
      "ar": "إعلان"
    }
  },
  "411": {
    "number": 411,
    "original": "質問",
    "titles": {
      "en": "Questions",
      "fr": "Questions",
      "ja": "質問",
      "es": "Preguntas",
      "pt": "Perguntas",
      "zh": "提问",
      "ar": "أسئلة"
    }
  },
  "412": {
    "number": 412,
    "original": "忠誠",
    "titles": {
      "en": "Loyalty",
      "fr": "Loyauté",
      "ja": "忠誠",
      "es": "Lealtad",
      "pt": "Lealdade",
      "zh": "忠诚",
      "ar": "ولاء"
    }
  },
  "413": {
    "number": 413,
    "original": "仲間",
    "titles": {
      "en": "Comrades",
      "fr": "Compagnons",
      "ja": "仲間",
      "es": "Compañeros",
      "pt": "Companheiros",
      "zh": "伙伴",
      "ar": "رفاق"
    }
  },
  "414": {
    "number": 414,
    "original": "標的",
    "titles": {
      "en": "Target",
      "fr": "Cible",
      "ja": "標的",
      "es": "Objetivo",
      "pt": "Alvo",
      "zh": "目标",
      "ar": "هدف"
    }
  },
  "415": {
    "number": 415,
    "original": "真偽",
    "titles": {
      "en": "Authenticity",
      "fr": "Vérités et mensonges",
      "ja": "真偽",
      "es": "Autenticidad",
      "pt": "Autenticidade",
      "zh": "真伪",
      "ar": "صحة"
    }
  },
  "416": {
    "number": 416,
    "original": "発令",
    "titles": {
      "en": "Proclamation",
      "fr": "Proclamation",
      "ja": "発令",
      "es": "Proclamación",
      "pt": "Proclamação",
      "zh": "发布命令",
      "ar": "إعلان"
    }
  },
  "417": {
    "number": 417,
    "original": "有事",
    "titles": {
      "en": "Contingency",
      "fr": "Situation de crise",
      "ja": "有事",
      "es": "Emergencia",
      "pt": "Emergência",
      "zh": "事变",
      "ar": "طارئ"
    }
  },
  "418": {
    "number": 418,
    "original": "仮定",
    "titles": {
      "en": "Hypothesis",
      "fr": "Hypothèse",
      "ja": "仮定",
      "es": "Hipótesis",
      "pt": "Hipótese",
      "zh": "假设",
      "ar": "افتراض"
    }
  },
  "419": {
    "number": 419,
    "original": "実践",
    "titles": {
      "en": "Implementation",
      "fr": "Mise en pratique",
      "ja": "実践",
      "es": "Práctica",
      "pt": "Prática",
      "zh": "实践",
      "ar": "تطبيق"
    }
  },
  "420": {
    "number": 420,
    "original": "遭遇",
    "titles": {
      "en": "Encounter",
      "fr": "Rencontre",
      "ja": "遭遇",
      "es": "Encuentro",
      "pt": "Encontro",
      "zh": "遭遇",
      "ar": "اللقاء"
    }
  },
  "-1": {
    "number": -1,
    "original": "クラピカ追憶編",
    "titles": {
      "en": "Kurapika's Memories",
      "fr": "Les Mémoires de Kurapika",
      "ja": "クラピカ追憶編",
      "es": "Los Recuerdos de Kurapika",
      "pt": "As Memórias de Kurapika",
      "zh": "酷拉皮卡追忆篇",
      "ar": "ذكريات كورابيكا"
    }
  }
};

export const CHAPTER_TITLE_LABEL: Record<Locale, string> = {
  en: "Chapter Title",
  fr: "Titre du chapitre",
  ja: "サブタイトル",
  es: "Título del capítulo",
  pt: "Título do capítulo",
  zh: "章节标题",
  ar: "عنوان الفصل",
};

export const VOLUME_LABEL: Record<Locale, string> = {
  en: "Volume",
  fr: "Tome",
  ja: "巻",
  es: "Volumen",
  pt: "Volume",
  zh: "单行本",
  ar: "المجلد",
};

export function getChapterTitle(
  chapter: number | string | undefined,
  locale: Locale = "en",
): string | undefined {
  if (chapter === undefined) return undefined;
  const num = typeof chapter === "string" ? parseInt(chapter, 10) : chapter;
  if (isNaN(num)) return undefined;
  return CHAPTER_TITLES[num]?.titles[locale] ?? CHAPTER_TITLES[num]?.titles.en;
}

export function getChapterOriginalTitle(
  chapter: number | string | undefined,
): string | undefined {
  if (chapter === undefined) return undefined;
  const num = typeof chapter === "string" ? parseInt(chapter, 10) : chapter;
  if (isNaN(num)) return undefined;
  return CHAPTER_TITLES[num]?.original;
}

export function getVolumeNumber(chapter: number): number {
  if (chapter <= 380) return Math.ceil(chapter / 10);
  if (chapter <= 390) return 37;
  if (chapter <= 400) return 38;
  if (chapter <= 410) return 39;
  if (chapter <= 420) return 40;
  if (chapter <= 430) return 41;
  return 42;
}

export function getVolumeLabel(chapter: number, locale: Locale = "en"): string {
  const vol = getVolumeNumber(chapter);
  const prefix = VOLUME_LABEL[locale] ?? VOLUME_LABEL.en;
  if (locale === "ja") return `${vol}巻`;
  if (locale === "zh") return `第${vol}卷`;
  if (locale === "ar") return `${prefix} ${vol}`;
  return `${prefix} ${vol}`;
}
