import autoBind from "auto-bind";
import * as xmlparser from '../xml-peruse';
import { ParamXMLElement, XMLDtdDecl, XMLParserProps } from "../xml-peruse";

//----------------------------------------------------------------------------------------------------------------------
// Types
//----------------------------------------------------------------------------------------------------------------------

// Dictionary types 

// `entSeq` entry sequence - unique numeric id
// `kanjiElement` - kanji rendering
// `readingElement` - kana reading
// `sense` - translations

// The kanji element, or in its absence, the reading element, is
//         the defining component of each entry.
//         The overwhelming majority of entries will have a single kanji
//         element associated with a word in Japanese. Where there are
//         multiple kanji elements within an entry, they will be orthographical
//         variants of the same word, either using variations in okurigana, or
//         alternative and equivalent kanji.
export type JmdictSense = {
    pos: string[]; // pos
    xref: string[]; // cross-reference
    gloss: JmdictGloss[];
    misc: string[];
    s_inf: string[];
};
type JmdictKele = {
    keb: string;
    ke_pri: string[];
    ke_inf: string[];
}
type JmdictRele = {
    reb: string;
    re_pri: string[];
    re_inf: string[];
}
type JmdictGloss = {
    lang: JmdictGlossLang;
    text: string;
};

export type JmdictEntry = {
    ent_seq: number; // ent_seq
    k_ele: JmdictKele[]; // k_ele
    r_ele: JmdictRele[]; // r_ele
    sense: JmdictSense[]; // sense

    cachedPreferredReading: string;
    cachedPreferredRele: string;
    cachedPreferredKele: string;
};

const makeDefaultSense = (): JmdictSense =>
    ({ pos: [], xref: [], gloss: [], misc: [], s_inf: [] });

const makeDefaultGloss = (): JmdictGloss =>
    ({ lang: JmdictGlossLang.eng, text: '' });

const k_KEB_INVALID = '';
const makeDefaultKele = (): JmdictKele =>
    ({ keb: k_KEB_INVALID, ke_pri: [], ke_inf: [] });

const k_REB_INVALID = '';
const makeDefaultRele = (): JmdictRele =>
    ({ reb: k_REB_INVALID, re_pri: [], re_inf: [] });

const k_ENT_SEQ_INVALID = -1;
const makeDefaultEntry = (): JmdictEntry => ({
    ent_seq: k_ENT_SEQ_INVALID,
    k_ele: [],
    r_ele: [],
    sense: [],
    cachedPreferredReading: '',
    cachedPreferredRele: '',
    cachedPreferredKele: '',
});

// XML Schema

type JmdictAttrKey = {
    'xml:lang': 'xml:lang';
};

type JmdictTagType = {
    r_ele: 'r_ele';
    k_ele: 'k_ele';
    ke_pri: 'ke_pri';
    re_pri: 're_pri';
    ke_inf: 'ke_inf';
    re_inf: 're_inf';
    sense: 'sense';
    entry: 'entry';
    ent_seq: 'ent_seq';
    keb: 'keb';
    reb: 'reb';
    pos: 'pos';
    gloss: 'gloss';
    xref: 'xref';
    misc: 'misc';
    s_inf: 's_inf';
};

export enum JmdictAbbrevs {
    // kanji info entities
    phonetic = "&ateji;", // "ateji (phonetic) reading">
    irregular_kana = "&ik;",    //"word containing irregular kana usage">
    irregular_kanji = "&iK;",    //"word containing irregular kanji usage">
    irregular_okurigana = "&io;",    //"irregular okurigana usage">
    outdated_kanji = "&oK;",    //"word containing out-dated kanji or kanji usage">
    rarely_kanji = "&rK;",    //"rarely used kanji form">
    search_kanji = "&sK;",    //"search-only kanji form">
    // misc entities
    usually_kana = "&uk;", // usually kana
    humble = "&hum;", // kenjougo
    honorific = "&hon;", // sonkeigo
    net_sl = "&net-sl;", // net slang
    vulgar = "&vulg;", // vulgar
    slang = "&sl;", // slang
    manga_slang = "&m-sl;", // manga slang
    obselete = "&obs;", // obselete
    archaic = "&arch;", // archaic
};

export enum JmdictGlossLang {
    eng = "eng",
}

type JmdictElement = ParamXMLElement<keyof JmdictTagType, keyof JmdictAttrKey>;

type JME_EntSeq = JmdictElement & {
    tagName: 'ent_seq'
    children: [string];
};
type JME_Keb = JmdictElement & {
    tagName: 'keb',
    children: [string];
};
type JME_Kepri = JmdictElement & {
    tagName: 'ke_pri'
    children: [string];
};
type JME_Keinf = JmdictElement & {
    tagName: 'ke_inf';
    children: [string];
}
type JME_Kele = JmdictElement & {
    tagName: 'k_ele',
    children: (JME_Keb | JME_Kepri | JME_Keinf)[]
};
type JME_Reb = JmdictElement & {
    tagName: 'reb',
    children: [string];
};
type JME_Repri = JmdictElement & {
    tagName: 're_pri'
    children: [string];
};
type JME_Reinf = JmdictElement & {
    tagName: 're_inf';
    children: [string];
}
type JME_Rele = JmdictElement & {
    tagName: 'r_ele',
    children: (JME_Reb | JME_Repri | JME_Reinf)[]
};
type JME_Gloss = JmdictElement & {
    tagName: 'gloss',
    attributes: {
        'xml:lang': JmdictGlossLang,
    }
    children: [string]
};
type JME_Pos = JmdictElement & {
    tagName: 'pos',
    children: [string]
};
type JME_Misc = JmdictElement & {
    tagName: 'misc',
    children: [string]
};
type JME_Xref = JmdictElement & {
    tagName: 'xref',
    children: [string]
};
type JME_Sinf = JmdictElement & {
    tagName: 's_inf',
    children: [string]
};
type JME_Sense = JmdictElement & {
    tagName: 'sense',
    children: (JME_Gloss | JME_Misc | JME_Pos | JME_Xref | JME_Misc | JME_Sinf)[]
};
type JME_Entry = JmdictElement & {
    tagName: 'entry',
    children: (JME_EntSeq | JME_Kele | JME_Rele | JME_Sense)[],
};


//----------------------------------------------------------------------------------------------------------------------
// Jmdict Implementation
//----------------------------------------------------------------------------------------------------------------------

export class Jmdict {
    constructor() {
        autoBind(this);
    }
    static async create(filePath: string): Promise<Jmdict> {
        const jmdict = new Jmdict();
        await jmdict.parse(filePath);
        return jmdict;
    }

    async parse(filePath: string): Promise<void> {
        const serializeKele = (el: JME_Kele): JmdictKele => {
            const kele = makeDefaultKele();
            for (const child of el.children) {
                if (child.tagName == 'keb') kele.keb = child.children[0];
                else if (child.tagName == 'ke_pri') kele.ke_pri.push(child.children[0]);
                else if (child.tagName == 'ke_inf') kele.ke_inf.push(child.children[0]);
            }
            return kele;
        };
        const serializeRele = (el: JME_Rele): JmdictRele => {
            const rele = makeDefaultRele();
            for (const child of el.children) {
                if (child.tagName == 'reb') rele.reb = child.children[0];
                else if (child.tagName == 're_pri') rele.re_pri.push(child.children[0]);
                else if (child.tagName == 're_inf') rele.re_inf.push(child.children[0]);
            }
            return rele;
        };
        const serializeGloss = (el: JME_Gloss): JmdictGloss => {
            const gloss = makeDefaultGloss();
            gloss.lang = el.attributes?.['xml:lang'] || JmdictGlossLang.eng;
            gloss.text = el.children[0];
            return gloss;
        };
        const serializeSense = (el: JME_Sense): JmdictSense => {
            const sense = makeDefaultSense();
            for (const child of el.children) {
                if (child.tagName == 'pos') sense.pos.push(child.children[0]);
                else if (child.tagName == 'gloss') sense.gloss.push(
                    serializeGloss(child)
                );
                else if (child.tagName == 'xref') sense.xref.push(child.children[0]);
                else if (child.tagName == 'misc') sense.misc.push(child.children[0]);
                else if (child.tagName == 's_inf') sense.s_inf.push(child.children[0]);
            }
            return sense;
        }
        const serializeEntry = (el: JME_Entry): JmdictEntry => {
            const entry: JmdictEntry = makeDefaultEntry();

            for (const child of el.children) {
                if (child.tagName == 'ent_seq') {
                    entry.ent_seq = parseInt(child.children[0]);
                }
                else if (child.tagName == 'k_ele') {
                    entry.k_ele.push(serializeKele(child));
                }
                else if (child.tagName == 'r_ele') {
                    entry.r_ele.push(serializeRele(child));
                }
                else if (child.tagName == 'sense') {
                    entry.sense.push(serializeSense(child));
                }
            }
            return entry;
        };

        const onElement = (el: JmdictElement) => {
            if (el.tagName == 'entry') {
                const entry: JmdictEntry = serializeEntry(el as JME_Entry)
                // console.dir(entry, { depth: null, colors: true });
                this.emplaceEntry(entry);
            }
        };

        const onDtd = (e: XMLDtdDecl) => {
            if (e.tagName == '!ENTITY') {
                this.emplaceEntity(e.key, e.value);
            }
        }

        const handlers: XMLParserProps<keyof JmdictTagType, keyof JmdictAttrKey> = {
            skipRoot: false,
            onDtdDecl: onDtd,
            onElement: onElement,
        };

        await xmlparser.parseXML<keyof JmdictTagType, keyof JmdictAttrKey>(filePath, handlers);
    }

    private emplaceEntity(key: string, value: string): void {
        this.m_entityAbbrev[key] = value;
    }

    private emplaceEntry(entry: JmdictEntry): void {
        if (entry.ent_seq == k_ENT_SEQ_INVALID) {
            console.error("invalid");
            return;
        }
        if (this.m_entries.has(entry.ent_seq)) {
            console.error("Entry already exists", entry.ent_seq);
            return;
        }
        this.m_entries.set(entry.ent_seq, entry);

        entry.k_ele.forEach(({ keb }) => {
            this.emplaceWord(keb, entry.ent_seq);
        })
        entry.r_ele.forEach(({ reb }) => {
            this.emplaceWord(reb, entry.ent_seq);
        })
    }

    private emplaceWord(word: string, ent_seq: number) {
        // Emplace words
        const wordArr = this.m_wordToSeq.get(word);
        if (!wordArr) this.m_wordToSeq.set(word, [ent_seq]);
        else if (!wordArr.includes(ent_seq)) wordArr.push(ent_seq);
    }

    // Entity abbreviations
    private m_entityAbbrev: Record<string, string> = {};

    // Index of word to ent seq
    private m_wordToSeq: Map<string, number[]> = new Map();
    // Dictionary entries indexed by entry seq
    private m_entries: Map<number, JmdictEntry> = new Map();
}