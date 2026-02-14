(() => {
  const families = ['a','o','e','i','u','ü'];
  const tones = [1,2,3,4];
  const slots = ['L1','L2','L3','L4','L5','C','R1','R2','R3','R4','R5'];
  const sides = ['L','R'];

  // CONSTANT initials (rows)
  const INITIALS = [
    'Ø',
    'b','p','m','f',
    'd','t','n','l',
    'g','k','h',
    'j','q','x',
    'zh','ch','sh','r',
    'z','c','s'
  ];

  // Finals vary by family (columns)
  const FINALS_BY_FAMILY = {
    a:  ['a','ai','an','ang','ao'],
    o:  ['o','ong','ou'],
    // FIX: include 'e' (your logic supports it, and your Arabic table includes it)
    e:  ['e','ei','en','eng','er'],
    // FIX: include iong
    i:  ['i','ia','ian','iang','iao','ie','in','ing','iong','iou'],
    u:  ['u','ua','uai','uan','uang','uei','uen','ueng','uo'],
    ü:  ['ü','üe','üan','ün']
  };

  // ------------------------------------------------------------
  // Default syllables (so we DON’T auto-fill impossible combos)
  // ------------------------------------------------------------
  const ALL_INITIALS_SET = new Set(INITIALS);

  const ALLOW = {
    A_FAMILY:  ['Ø','b','p','m','f','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    AI_FAMILY: ['Ø','b','p','m',      'd','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    AO_FAMILY: ['Ø','b','p','m',      'd','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],

    O_ONLY:    ['Ø','b','p','m','f'],
    ONG_ONLY:  ['d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    OU_ONLY:   ['Ø','p','m','f','d','t','l','g','k','h','z','c','s','zh','ch','sh','r'],

    E_ONLY:    ['Ø','m','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    EI_ONLY:   ['Ø','b','p','m','f','d','n','l','g','h','z','zh','sh'],
    EN_ONLY:   ['Ø','b','p','m','f','n','g','k','h','z','c','s','zh','ch','sh','r'],
    ENG_ONLY:  ['Ø','b','p','m','f','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    ER_ONLY:   ['Ø'],

    I_BASE:    ['Ø','b','p','m','d','t','n','l','j','q','x'],
    IA_ONLY:   ['Ø','d','l','j','q','x'],
    IAN_ONLY:  ['Ø','b','p','m','d','t','n','l','j','q','x'],
    IANG_ONLY: ['Ø','n','l','j','q','x'],
    IAO_ONLY:  ['Ø','b','p','m','d','t','n','l','j','q','x'],
    IE_ONLY:   ['Ø','b','p','m','d','t','n','l','j','q','x'],
    IN_ONLY:   ['Ø','b','p','m','n','l','j','q','x'],
    ING_ONLY:  ['Ø','b','p','m','d','t','n','l','j','q','x'],
    IONG_ONLY: ['Ø','j','q','x'],
    IOU_ONLY:  ['Ø','m','d','n','l','j','q','x'],

    U_BASE:    ['Ø','b','p','m','f','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    UA_ONLY:   ['Ø','g','k','h','zh','sh'],
    UAI_ONLY:  ['Ø','g','k','h','zh','ch','sh'],
    UAN_ONLY:  ['Ø','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],
    UANG_ONLY: ['Ø','g','k','h','zh','ch','sh'],
    UEI_ONLY:  ['Ø','d','t','g','k','h','z','c','s','zh','ch','sh','r'],
    UEN_ONLY:  ['Ø','d','t','l','g','k','h','z','c','s','zh','ch','sh','r'],
    UENG_ONLY: ['Ø'],
    UO_ONLY:   ['Ø','d','t','n','l','g','k','h','z','c','s','zh','ch','sh','r'],

    UMLAUT_BASE: ['Ø','n','l','j','q','x'],
    UMLAUT_AN:   ['Ø','j','q','x'],
    UMLAUT_E:    ['Ø','n','l','j','q','x'],
    UMLAUT_N:    ['Ø','j','q','x']
  };

  const ZERO_INITIAL_FORMS = {
    // i-family (y-)
    i: 'yi', ia: 'ya', ian: 'yan', iang: 'yang', iao: 'yao', ie: 'ye',
    in: 'yin', ing: 'ying', iong: 'yong', iou: 'you',
    // u-family (w-)
    u: 'wu', ua: 'wa', uai: 'wai', uan: 'wan', uang: 'wang', uei: 'wei',
    uen: 'wen', ueng: 'weng', uo: 'wo',
    // ü-family (y-)
    'ü': 'yu', 'üe': 'yue', 'üan': 'yuan', 'ün': 'yun'
  };

  // ------------------------------------------------------------
  // Arabic display overrides for RIGHT side (R slots)
  // We only override DISPLAY text (stored in R slot html). L stays Latin.
  // ------------------------------------------------------------
  const AR_INITIAL_TO_LATIN = {
    'ب':'b','پ':'p','م':'م','ف':'ف',
    'د':'d','ت':'t','ن':'n','ل':'l',
    'ڠ':'g','ك':'k','ح':'h','خ':'h',
    'ز':'z','تس':'c','س':'s',
    'ج':'zh','تش':'ch','ش':'sh','ر':'r',
  };

  // Latin -> Arabic label (for displaying stub initials on R side)
  const LATIN_TO_AR_INITIAL = {
    'Ø':'',
    'b':'ب','p':'پ','m':'م','f':'ف',
    'd':'د','t':'ت','n':'ن','l':'ل',
    'g':'ڠ','k':'ك','h':'ح',
    'j':'j','q':'q','x':'x',
    'zh':'ج','ch':'تش','sh':'ش','r':'ر',
    'z':'ز','c':'تس','s':'س'
  };

  // Final header labels for R side (mirrors FINALS_BY_FAMILY order)
  const AR_FINAL_LABEL = {
    a:  { a:'آ',  ai:'آي',  an:'آن',  ang:'آنڠ', ao:'آو' },
    o:  { o:'ءو', ong:'ءونڠ', ou:'ووه' },
    e:  { e:'ه',  ei:'ءي',  en:'ءن',  eng:'ءنڠ', er:'ءر' },
    i:  { i:'ي',  ia:'يآ',  ian:'يآن', iang:'يآنڠ', iao:'يآو', ie:'يه', in:'ين', ing:'ينڠ', iong:'يونڠ', iou:'يو' },
    u:  { u:'و',  ua:'وآ',  uai:'وآي',  uan:'وآن', uang:'وآنڠ', uei:'وي', uen:'ون', ueng:'ونڠ', uo:'ووه' },
    'ü':{ 'ü':'يو', 'üe':'يوي', 'üan':'يوآن', 'ün':'يون' }
  };

  function isRightSide(slotOrSide){
    return (slotOrSide === 'R') || (typeof slotOrSide === 'string' && slotOrSide.startsWith('R'));
  }

  function displayInitialForStub(slotOrSide, latinInitial){
    if (!isRightSide(slotOrSide)) return latinInitial;
    return LATIN_TO_AR_INITIAL[latinInitial] ?? latinInitial;
  }

  function displayFinalForHeader(slotOrSide, fam, final){
    if (!isRightSide(slotOrSide)) return final;
    return (AR_FINAL_LABEL[fam] && AR_FINAL_LABEL[fam][final]) ? AR_FINAL_LABEL[fam][final] : final;
  }

  // NOTE:
  // - This is the same content you pasted, normalized into tab-delimited rows.
  // - Each non-empty row ends with the Arabic initial label in the LAST column.
  // - We map the earlier columns into our finals via COL_MAP per family.
  const AR_RAW = {
    a: `آو\tآنڠ\tآن\tآي\tآ\t
\t\t\t\t\t
بآو\tبآنڠ\tبآن\tبآي\tبآ\tب
پآو\tپآنڠ\tپآن\tپآي\tپآ\tپ
مآو\tمآنڠ\tمآن\tمآي\tمآ\tم
\tفآنڠ\tفآن\t\tفآ\tف
\t\t\t\t\t
دآو\tدآنڠ\tدآن\tدآي\tدآ\tد
تآو\tتآنڠ\tتآن\tتآي\tتآ\tت
نآو\tنآنڠ\tنآن\tنآي\tنآ\tن
لآو\tلآنڠ\tلآن\tلآي\tلآ\tل
\t\t\t\t\t
ڠآو\tڠآنڠ\tڠآن\tڠآي\tڠآ\tڠ
كآو\tكآنڠ\tكآن\tكآي\tكآ\tك
حآو\tحآنڠ\tحآن\tحآي\tحآ\tح
\t\t\t\t\t
زآو\tزآنڠ\tزآن\tزآي\tزآ\tز
تسآو\tتسآنڠ\tتسآن\tتسآي\tتسآ\tتس
سآو\tسآنڠ\tسآن\tسآي\tسآ\tس
جآو\tجآنڠ\tجآن\tجآي\tجآ\tج
تشآو\tتشآنڠ\tتشآن\tتشآي\tتشآ\tتش
شآو\tشآنڠ\tشآن\tشآي\tشآ\tش
رآو\tرآنڠ\tرآن\t\t\tر`,

    o: `ءو\tءونڠ\tووه\t
\t\t\t
\t\tبووه\tب
پءو\t\tپووه\tپ
مءو\t\tمووه\tم
فءو\t\tفووه\tف
\t\t\t
دءو\tدءونڠ\t\tد
تءو\tتءونڠ\t\tت
\tنءونڠ\t\tن
لءو\tلءونڠ\t\tل
\t\t\t
ڠءو\tڠءونڠ\t\tڠ
كءو\tكءونڠ\t\tك
خءو\tخءونڠ\t\tخ
\t\t\t
زءو\tزءونڠ\t\tز
تسءو\tتسءونڠ\t\tتس
سءو\tسءونڠ\t\tس
جءو\tجءونڠ\t\tج
تشءو\tتشءونڠ\t\tتش
شءو\t\t\tش
رءو\t\t\tر`,

    // Your e-block corresponds to finals: e, ei, en, eng, er
    e: `ءر\tءنڠ\tءن\tءي\tه\t
\t\t\t\t\t
\tبءنڠ\tبءن\tبءي\t\tب
\tپءنڠ\tپءن\tپءي\t\tپ
\tمءنڠ\tمءن\tمءي\tمه\tم
\tفءنڠ\tفءن\t\t\tف
\t\t\t\t\t
\tدءنڠ\t\tدءي\tده\tد
\tتءنڠ\t\tتءي\tته\tت
\tنءنڠ\tنءن\tنءي\tنه\tن
\tلءنڠ\t\tلءي\tله\tل
\t\t\t\t\t
\tڠءنڠ\tڠءن\tڠءي\tڠه\tڠ
\tكءنڠ\tكءن\tكءي\tكه\tك
\tخءنڠ\tخءن\tخءي\tخه\tخ
\t\t\t\t\t
\tزءنڠ\tزءن\tزءي\tزه\tز
\tتسءنڠ\tتسءن\tتسءي\tتسه\tتس
\tسءنڠ\tسءن\tسءي\tسه\tس
\tجءنڠ\tجءن\tجءي\tجه\tج
\tتشءنڠ\tتشءن\tتشءي\tتشه\tتش
\tشءنڠ\tشءن\tشءي\tشه\tش
\t\tرءن\t\tره\tر`,

    // i-block header you pasted: يو, يونڠ, ينڠ, ين, يه, يآنڠ, يآن, يآو, يآ, ي
    // We map into our finals: i, ia, ian, iang, iao, ie, in, ing, iong, iou (see COL_MAP below)
    i: `\tيو\tيونڠ\tينڠ\tين\tيه\tيآنڠ\tيآن\tيآو\tيآ\tي\t
\t\t\t\t\t\t\t\t\t\t\t
\t\tبينڠ\tبين\tبيه\tبيآنڠ\tبيآن\tبيآو\t\tبي\tب
\t\tپينڠ\tپين\tپيه\tپيآنڠ\tپيآن\tپيآو\t\tپي\tپ
ميو\t\tمينڠ\tمين\tميه\tميآنڠ\tميآن\tميآو\t\tمي\tم
\t\t\t\t\t\t\t\t\t\tف
ديو\t\tدينڠ\t\tديه\tديآنڠ\tديآن\tديآو\tديآ\tدي\tد
\t\tتينڠ\t\tتيه\tتيآنڠ\tتيآن\tتيآو\t\tتي\tت
نيو\t\tنينڠ\tنين\tنيه\tنيآنڠ\tنيآن\tنيآو\t\tني\tن
ليو\t\tلينڠ\tلين\tليه\tليآنڠ\tليآن\tليآو\tليآ\tلي\tل
\t\t\t\t\t\t\t\t\t\tڠ
\t\t\t\t\t\t\t\t\t\tك
\t\t\t\t\t\t\t\t\t\tخ
جيو\tجيونڠ\tجينڠ\tجين\tجيه\tجيآنڠ\tجيآن\tجيآو\tجيآ\tجي\tجي
تشيو\tتشيونڠ\tتشينڠ\tتشين\tتشيه\tتشيآنڠ\tتشيآن\tتشيآو\tتشيآ\tتشي\tتشي
شيو\tشيونڠ\tشينڠ\tشين\tشيه\tشيآنڠ\tشيآن\tشيآو\tشيآ\tشي\tشي`,

    // u-block header you pasted: ووه, ونڠ, ون, وي, وآنڠ, وآن, وآي, وآ, و
    // We map into our finals: u, ua, uai, uan, uang, uei, uen, ueng, uo (see COL_MAP below)
    u: `ووه\tونڠ\tون\tوي\tوآنڠ\tوآن\tوآي\tوآ\tو\t
\t\t\t\t\t\t\t\t\t
بووه\t\t\t\t\t\t\tبو\tب
پووه\t\t\t\t\t\t\tپو\tپ
مووه\t\t\t\t\t\t\tمو\tم
فووه\t\t\t\t\t\t\tفو\tف
\t\t\t\t\t\t\t\t
دووه\t\tدون\tدوي\t\tدوآن\t\t\tدو\tد
تووه\t\tتون\tتوي\t\tتوآن\t\t\tتو\tت
نووه\t\t\t\t\tنوآن\t\t\tنو\tن
لووه\t\tلون\t\t\tلوآن\t\t\tلو\tل
\t\t\t\t\t\t\t\t
ڠووه\t\tڠون\tڠوي\tڠوآنڠ\tڠوآن\tڠوآي\tڠوآ\tڠو\tڠ
كووه\t\tكون\tكوي\tكوآنڠ\tكوآن\tكوآي\tكوآ\tكو\tك
خووه\t\tخون\tخوي\tخوآنڠ\tخوآن\tخوآي\tخوآ\tخو\tخ
\t\t\t\t\t\t\t\t
زووه\t\tزون\tزوي\t\tزوآن\t\t\tزو\tز
تسووه\t\tتسون\tتسوي\t\tتسوآن\t\t\tتسو\tتس
سووه\t\tسون\tسوي\t\tسوآن\t\t\tسو\tس
جووه\t\tجون\tجوي\tجوآنڠ\tجوآن\tجوآي\tجوآ\tجو\tج
تشووه\t\tتشون\tتشوي\tتشوآنڠ\tتشوآن\tتشوآي\t\tتشو\tتش
شووه\t\tشون\tشوي\tشوآنڠ\tشوآن\tشوآي\tشوآ\tشو\tش
رووه\t\tرون\tروي\t\tروآن\t\t\tرو\tر`
  };

  const AR_OVERRIDES = (() => {
    const out = {};

    function normToken(t){ return String(t || '').trim(); }

    // Our final order for mapping (must match FINALS_BY_FAMILY)
    const FINAL_ORDER = {
      a: ['a','ai','an','ang','ao'],
      o: ['o','ong','ou'],
      e: ['e','ei','en','eng','er'],
      i: ['i','ia','ian','iang','iao','ie','in','ing','iong','iou'],
      u: ['u','ua','uai','uan','uang','uei','uen','ueng','uo'],
    };

    // Column index mapping: values[] index -> our finals
    // Because your pasted tables are visually RTL-ish, we pick the correct column index per final.
    const COL_MAP = {
      // a-row columns: [ao, ang, an, ai, a]
      a: { a:4, ai:3, an:2, ang:1, ao:0 },

      // o-row columns: [ou, ong, o] (plus blanks)
      o: { o:2, ong:1, ou:0 },

      // e-row columns: [er, eng, en, ei, e] (your header: ءر ءنڠ ءن ءي ه)
      e: { e:4, ei:3, en:2, eng:1, er:0 },

      // i-row header: [you, yong, ying, yin, ye, yang, yan, yao, ya, yi]
      // Map to: i(yi)=9, ia(ya)=8, ian(yan)=6, iang(yang)=5, iao(yao)=7, ie(ye)=4, in(yin)=3, ing(ying)=2, iong(yong)=1, iou(you)=0
      i: { i:9, ia:8, ian:6, iang:5, iao:7, ie:4, in:3, ing:2, iong:1, iou:0 },

      // u-row header: [wo, weng, wen, wei, wang, wan, wai, wa, wu] BUT your pasted header starts with the longer form
      // Your columns: [wō? (ووه), ونڠ, ون, وي, وآنڠ, وآن, وآي, وآ, و]
      // Map to: u(wu)=8, ua(wa)=7, uai(wai)=6, uan(wan)=5, uang(wang)=4, uei(wei)=3, uen(wen)=2, ueng(weng)=1, uo(wo)=0
      u: { u:8, ua:7, uai:6, uan:5, uang:4, uei:3, uen:2, ueng:1, uo:0 },
    };

    function parseFamily(fam){
      const raw = AR_RAW[fam];
      if (!raw) return;

      const map = new Map();
      const lines = String(raw).split(/\r?\n/);

      for (const line of lines){
        const parts = line.split('\t').map(normToken);
        const nonEmpty = parts.filter(Boolean);
        if (nonEmpty.length < 2) continue;

        // last token is the Arabic initial label
        const arInit = parts[parts.length - 1];
        const latinInit = AR_INITIAL_TO_LATIN[arInit];
        if (!latinInit) continue;

        const values = parts.slice(0, parts.length - 1);

        const finals = FINAL_ORDER[fam];
        const cm = COL_MAP[fam];
        if (!finals || !cm) continue;

        for (const f of finals){
          const idx = cm[f];
          if (idx == null) continue;
          const v = normToken(values[idx]);
          if (!v) continue;
          map.set(`${latinInit}__${f}`, v);
        }
      }

      out[fam] = map;
    }

    parseFamily('a');
    parseFamily('o');
    parseFamily('e');
    parseFamily('i');
    parseFamily('u');

    return out;
  })();

  function arabicOverrideForCell(fam, initial, final){
    const m = AR_OVERRIDES[fam];
    if (!m) return null;
    return m.get(`${initial}__${final}`) || null;
  }

  function displayBaseFor(sideOrSlot, fam, initial, final){
    const base = defaultSyllable(initial, final);
    if (!base) return '';

    if (!isRightSide(sideOrSlot)) return base;

    return arabicOverrideForCell(fam, initial, final) || base;
  }

  function defaultSyllable(initial, final){
    if (!ALL_INITIALS_SET.has(initial)) return '';

    let allowed = null;

    if (['a','an','ang'].includes(final)) allowed = ALLOW.A_FAMILY;
    else if (final === 'ai') allowed = ALLOW.AI_FAMILY;
    else if (final === 'ao') allowed = ALLOW.AO_FAMILY;

    else if (final === 'o') allowed = ALLOW.O_ONLY;
    else if (final === 'ong') allowed = ALLOW.ONG_ONLY;
    else if (final === 'ou') allowed = ALLOW.OU_ONLY;

    else if (final === 'e') allowed = ALLOW.E_ONLY;
    else if (final === 'ei') allowed = ALLOW.EI_ONLY;
    else if (final === 'en') allowed = ALLOW.EN_ONLY;
    else if (final === 'eng') allowed = ALLOW.ENG_ONLY;
    else if (final === 'er') allowed = ALLOW.ER_ONLY;

    else if (final === 'i') allowed = ALLOW.I_BASE;
    else if (final === 'ia') allowed = ALLOW.IA_ONLY;
    else if (final === 'ian') allowed = ALLOW.IAN_ONLY;
    else if (final === 'iang') allowed = ALLOW.IANG_ONLY;
    else if (final === 'iao') allowed = ALLOW.IAO_ONLY;
    else if (final === 'ie') allowed = ALLOW.IE_ONLY;
    else if (final === 'in') allowed = ALLOW.IN_ONLY;
    else if (final === 'ing') allowed = ALLOW.ING_ONLY;
    else if (final === 'iong') allowed = ALLOW.IONG_ONLY;
    else if (final === 'iou') allowed = ALLOW.IOU_ONLY;

    else if (final === 'u') allowed = ALLOW.U_BASE;
    else if (final === 'ua') allowed = ALLOW.UA_ONLY;
    else if (final === 'uai') allowed = ALLOW.UAI_ONLY;
    else if (final === 'uan') allowed = ALLOW.UAN_ONLY;
    else if (final === 'uang') allowed = ALLOW.UANG_ONLY;
    else if (final === 'uei') allowed = ALLOW.UEI_ONLY;
    else if (final === 'uen') allowed = ALLOW.UEN_ONLY;
    else if (final === 'ueng') allowed = ALLOW.UENG_ONLY;
    else if (final === 'uo') allowed = ALLOW.UO_ONLY;

    else if (final === 'ü') allowed = ALLOW.UMLAUT_BASE;
    else if (final === 'üe') allowed = ALLOW.UMLAUT_E;
    else if (final === 'üan') allowed = ALLOW.UMLAUT_AN;
    else if (final === 'ün') allowed = ALLOW.UMLAUT_N;

    if (!allowed) return '';
    if (!allowed.includes(initial)) return '';

    if (initial === 'Ø'){
      return ZERO_INITIAL_FORMS[final] || final;
    }

    let outFinal = final;
    if (outFinal === 'iou') outFinal = 'iu';
    if (outFinal === 'uei') outFinal = 'ui';
    if (outFinal === 'uen') outFinal = 'un';

    if (outFinal.startsWith('ü') && (initial === 'j' || initial === 'q' || initial === 'x')){
      outFinal = outFinal.replace('ü', 'u');
    }

    return `${initial}${outFinal}`;
  }

  // ------------------------------------------------------------
  // Slot model (matches pinyintable.json)
  // L1..L5 and R1..R5 are grouped by initials.
  // C is reserved (we leave it empty for now).
  // ------------------------------------------------------------
  const SLOT_GROUPS = {
    L1: ['b','p','m','f'],
    L2: ['d','t','n','l'],
    L3: ['g','k','h'],
    L4: ['j','q','x'],
    L5: ['zh','ch','sh','r','z','c','s'],
    R1: ['b','p','m','f'],
    R2: ['d','t','n','l'],
    R3: ['g','k','h'],
    R4: ['j','q','x'],
    R5: ['zh','ch','sh','r','z','c','s'],
    C:  []
  };

  const SIDE_TO_SLOTS = {
    L: ['L1','L2','L3','L4','L5'],
    R: ['R1','R2','R3','R4','R5']
  };

  function slotDir(slot){
    return slot.startsWith('R') ? 'rtl' : 'ltr';
  }

  function titleFor(slot){
    return `${family} · ${slot} · tone ${tone}`;
  }

  // ------------------------------------------------------------
  // Realtime persistence (localStorage)
  // ------------------------------------------------------------
  const LS_STORE_KEY = 'pinyintable_builder_store_v1';
  const LS_STATE_KEY = 'pinyintable_builder_state_v1';

  function loadLocalJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function saveLocalJson(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e){
      console.warn('[builder] localStorage save failed:', e);
    }
  }

  function loadState(){
    return loadLocalJson(LS_STATE_KEY, { family: 'a', tone: 1, side: 'L', editMode: false });
  }

  function loadStoreFallback(){
    return { meta: { families, tones, slots }, data: {} };
  }

  function loadStore(){
    const s = loadLocalJson(LS_STORE_KEY, null);
    if (!s || typeof s !== 'object') return loadStoreFallback();
    if (!s.meta || !s.data) return loadStoreFallback();

    if (!Array.isArray(s.meta?.slots)) s.meta.slots = slots;
    if (!Array.isArray(s.meta?.families)) s.meta.families = families;
    if (!Array.isArray(s.meta?.tones)) s.meta.tones = tones;

    return s;
  }

  const __state = loadState();
  let family = (__state.family && families.includes(__state.family)) ? __state.family : 'a';
  let tone = (tones.includes(Number(__state.tone))) ? Number(__state.tone) : 1;
  let side = (sides.includes(__state.side)) ? __state.side : 'L';
  let editMode = !!__state.editMode;

  let STORE = loadStore();

  function saveState(){
    saveLocalJson(LS_STATE_KEY, { family, tone, side, editMode });
  }

  function saveStore(){
    saveLocalJson(LS_STORE_KEY, STORE);
  }

  function ensurePath(fam, t){
    STORE.data[fam] ||= {};
    STORE.data[fam][String(t)] ||= {};
    return STORE.data[fam][String(t)];
  }

  function getSlotsForCurrentSide(){
    return SIDE_TO_SLOTS[side] || [];
  }

  function getSavedHtmlForSlot(slot){
    return STORE.data?.[family]?.[String(tone)]?.[slot]?.html || null;
  }

  function setSavedSlot(slot, html){
    const map = ensurePath(family, tone);
    map[slot] = { title: titleFor(slot), html };
  }

  function clearSlotsForSide(){
    const map = STORE.data?.[family]?.[String(tone)];
    if (!map) return;
    getSlotsForCurrentSide().forEach(s => { delete map[s]; });
  }

  let draftTimer = null;
  function setSavedHtmlFromCurrentState(){
    const cols = FINALS_BY_FAMILY[family] || [];

    getSlotsForCurrentSide().forEach(slot => {
      const rows = SLOT_GROUPS[slot] || [];
      const html = buildExportHtml(rows, cols, slotDir(slot), slot, family);
      setSavedSlot(slot, html);
    });

    saveState();
    saveStore();
  }
  function persistDraftNow(){ setSavedHtmlFromCurrentState(); }
  function persistDraftSoon(){
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      draftTimer = null;
      persistDraftNow();
    }, 120);
  }

  // UI refs
  const familySeg = document.getElementById('familySeg');
  const toneSeg   = document.getElementById('toneSeg');
  const sideSeg   = document.getElementById('sideSeg');

  const gridMount = document.getElementById('gridMount');
  const statusText= document.getElementById('statusText');
  const statusSideEl  = document.getElementById('statusSide');
  const statusFamilyEl= document.getElementById('statusFamily');
  const statusToneEl  = document.getElementById('statusTone');
  const onCountEl = document.getElementById('onCount');
  const offCountEl= document.getElementById('offCount');

  // Builder meta UI refs
  const builderVersionEl = document.getElementById('builderVersion');
  const builderLastEditedEl = document.getElementById('builderLastEdited');
  const builderSaveCountEl = document.getElementById('builderSaveCount');

  function updateBuilderMetaUI(){
    const b = STORE.meta?.builder || {};
    if (builderVersionEl) builderVersionEl.textContent = b.version ?? '0.0';
    if (builderLastEditedEl){
      const iso = b.lastEdited;
      builderLastEditedEl.textContent = iso
        ? new Date(iso).toLocaleString()
        : '—';
    }
    if (builderSaveCountEl) builderSaveCountEl.textContent = String(b.saveCount ?? 0);
  }

  const saveBtn   = document.getElementById('saveBtn');
  const clearBtn  = document.getElementById('clearBtn');
  const loadBtn   = document.getElementById('loadBtn');
  const fileInput = document.getElementById('fileInput');

  // Remove Clear button from UI (prevents accidental data loss)
  if (clearBtn) clearBtn.remove();

  // Edit mode toggle button (must exist in HTML)
  const editModeBtn = document.getElementById('editModeBtn');

  // Inject minimal style for edit-mode OFF cells
  if (!document.getElementById('builderEditModeStyle')){
    const st = document.createElement('style');
    st.id = 'builderEditModeStyle';
    st.textContent = `
      td.cell-off { background: transparent !important; }
      td.cell-off .cell-input { color: transparent; text-shadow:none; }
      td.cell-off .cell-input::placeholder { color: transparent; }
    `;
    document.head.appendChild(st);
  }


  function updateEditModeBtn(){
    if (!editModeBtn) return;
    const on = !!editMode;
    editModeBtn.textContent = on ? 'Edit Mode: ON' : 'Edit Mode: OFF';
    editModeBtn.classList.toggle('active', on);
    editModeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function escapeHtml(s){
    return String(s ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  // OFF map: key -> false means OFF
  let cellOffMap = new Map();
  // Custom text map: key -> string (only when differs from default/base display)
  let cellTextMap = new Map();

  function parseStateFromHtml(html, rows, cols, baseFor){
    const off = new Map();
    const txt = new Map();

    try{
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tbody tr'));

      trs.forEach((tr, rIdx) => {
        const rowLabel = rows[rIdx];
        const tds = Array.from(tr.querySelectorAll('td'));
        tds.forEach((td, cIdx) => {
          const colLabel = cols[cIdx];
          const key = `${rowLabel}__${colLabel}`;

          const raw = (td.textContent || '').trim();

          // Latin base validity check (impossible combos must stay OFF)
          const baseLatin = defaultSyllable(rowLabel, colLabel);

          // Display base (Arabic on R slots, Latin on L slots)
          const baseDisp = (typeof baseFor === 'function')
            ? baseFor(rowLabel, colLabel)
            : baseLatin;

          // Impossible combo => always OFF
          if (!baseLatin){
            off.set(key, false);
            return;
          }

          // Empty cell => OFF
          if (!raw){
            off.set(key, false);
            return;
          }

          // IMPORTANT MIGRATION BEHAVIOR:
          // If we previously saved Latin defaults into R slots, treat them as NOT custom
          // so the Arabic base can show and export.
          // Also: if the saved value already matches the display base, don't store as custom.
          if (raw === baseLatin) return;
          if (raw === baseDisp) return;

          // Otherwise, it's a real override
          txt.set(key, raw);
        });
      });
    } catch {}

    return { off, txt };
  }

  function loadSideStateIntoMaps(cols){
    cellOffMap = new Map();
    cellTextMap = new Map();

    getSlotsForCurrentSide().forEach(slot => {
      const rows = SLOT_GROUPS[slot] || [];
      const html = getSavedHtmlForSlot(slot);
      if (!html) return;

      const baseFor = (r, c) => displayBaseFor(slot, family, r, c);
      const state = parseStateFromHtml(html, rows, cols, baseFor);

      for (const [k,v] of state.off.entries()) cellOffMap.set(k, v);
      for (const [k,v] of state.txt.entries()) cellTextMap.set(k, v);
    });
  }

  function buildExportHtml(rows, cols, dir, slotOrSide, famOverride){
    const fam = famOverride || family;

    const thead = `
      <thead>
        <tr class="pinyin-grid-top">
          <th class="stub"></th>
          ${cols.map(c => `<th>${escapeHtml(displayFinalForHeader(slotOrSide || side, fam, c))}</th>`).join('')}
        </tr>
        <tr class="pinyin-grid-head">
          <th class="stub"></th>
          ${cols.map(c => `<th>${escapeHtml(displayFinalForHeader(slotOrSide || side, fam, c))}</th>`).join('')}
        </tr>
      </thead>
    `;

    const tbody = rows.map(r => {
      const tds = cols.map(c => {
        const key = `${r}__${c}`;
        const isOff = cellOffMap.get(key) === false;

        const baseLatin = defaultSyllable(r, c);
        const baseDisp = displayBaseFor(slotOrSide || side, fam, r, c);

        const txt = (!baseLatin || isOff) ? '' : (cellTextMap.get(key) ?? baseDisp);
        return `<td>${escapeHtml(txt)}</td>`;
      }).join('');

      return `
      <tr>
        <th class="stub">${escapeHtml(displayInitialForStub(slotOrSide || side, r))}</th>
        ${tds}
      </tr>`;
    }).join('');

    return `<div class="pinyin-grid">\n  <table class="pinyin-grid-table" dir="${dir}">\n    ${thead}\n    <tbody>\n${tbody}\n    </tbody>\n  </table>\n</div>`;
  }

  function renderSeg(container, items, active, onPick){
    if (!container) return;

    container.innerHTML = '';
    items.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.dataset.value = String(v);
      b.textContent = String(v);
      container.appendChild(b);
    });

    const setActive = (value) => {
      const val = String(value);
      container.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === val);
      });
    };

    setActive(active);

    container.onclick = (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn || !container.contains(btn)) return;
      const val = btn.dataset.value;
      setActive(val);
      onPick(val);
    };

    container._setActive = setActive;
  }

  function updateCounts(rows, cols){
    let total = 0;
    let off = 0;

    rows.forEach(r => cols.forEach(c => {
      const base = defaultSyllable(r, c);
      if (!base) return;
      total++;
      const key = `${r}__${c}`;
      if (cellOffMap.get(key) === false) off++;
    }));

    onCountEl.textContent = String(total - off);
    offCountEl.textContent = String(off);
  }

  function startInlineEdit({ btn, key, base, rows, cols }){
    if (btn.classList.contains('editing')) return;

    if (btn.classList.contains('off')){
      btn.classList.remove('off');
      cellOffMap.set(key, true);
    }

    const current = (cellTextMap.get(key) ?? base);

    btn.classList.add('editing');
    btn.dataset.prevText = btn.textContent || base;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'cell-input';
    input.value = current;
    input.setAttribute('aria-label', 'Edit cell');
    // Always keep the hint/placeholder in Latin (English), even on R side
    const baseLatin = defaultSyllable(key.split('__')[0], key.split('__')[1]);
    input.placeholder = baseLatin || '';
    input.dir = 'ltr';

    btn.textContent = '';
    btn.appendChild(input);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });

    const cleanup = () => {
      btn.classList.remove('editing');
      delete btn.dataset.prevText;
      input.remove();
    };

    const commit = () => {
      const val = String(input.value ?? '').trim();
      if (!val){
        cellTextMap.delete(key);
        btn.textContent = base;
      } else {
        cellTextMap.set(key, val);
        btn.textContent = val;
      }
      cleanup();
      updateCounts(rows, cols);
      persistDraftSoon();
    };

    const cancel = () => {
      const prev = btn.dataset.prevText || base;
      btn.textContent = prev;
      cleanup();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter'){
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape'){
        e.preventDefault();
        cancel();
      }
    });

    input.addEventListener('blur', () => {
      if (!btn.classList.contains('editing')) return;
      commit();
    });

    input.addEventListener('click', (e) => e.stopPropagation());
  }

  function renderGrid(){
    const cols = FINALS_BY_FAMILY[family] || [];
    const rows = ['b','p','m','f','d','t','n','l','g','k','h','j','q','x','zh','ch','sh','r','z','c','s'];

    loadSideStateIntoMaps(cols);

    const table = document.createElement('table');
    table.className = 'grid';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    trh.innerHTML = `<th class="stub"></th>` + cols.map(c => `<th>${escapeHtml(displayFinalForHeader(side, family, c))}</th>`).join('');
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    rows.forEach(r => {
      const tr = document.createElement('tr');
      const stub = document.createElement('th');
      stub.className = 'stub';
      stub.textContent = displayInitialForStub(side, r);
      tr.appendChild(stub);

      cols.forEach(c => {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell-btn';
        btn.title = '';

        const key = `${r}__${c}`;
        const isOff = (cellOffMap.get(key) === false);

        const baseLatin = defaultSyllable(r, c);
        const baseDisp  = displayBaseFor(side, family, r, c);
        const custom = cellTextMap.get(key);

        if (!baseLatin){
          btn.textContent = '';
          btn.classList.add('off', 'locked');
          btn.disabled = true;
          btn.title = 'Not a valid combination';
          td.appendChild(btn);
        } else {
          // Two modes:
          // - editMode OFF: current behavior (click toggles off, dblclick edits one cell)
          // - editMode ON: render an input for every cell (spreadsheet-style)
          if (!editMode){
            btn.textContent = custom ?? baseDisp;
            if (isOff) btn.classList.add('off');

            btn.addEventListener('click', () => {
              if (btn.disabled) return;
              if (btn.classList.contains('editing')) return;
              const nowOff = btn.classList.toggle('off');
              cellOffMap.set(key, nowOff ? false : true);
              updateCounts(rows, cols);
              persistDraftSoon();
            });

            btn.addEventListener('dblclick', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const baseForEditLatin = defaultSyllable(r, c);
              if (!baseForEditLatin) return;
              const baseForEditDisp = displayBaseFor(side, family, r, c);
              startInlineEdit({ btn, key, base: baseForEditDisp, rows, cols });
            });

            td.appendChild(btn);
          } else {
            // Full-table edit mode
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'cell-input';
            input.value = (isOff ? '' : (custom ?? baseDisp));
            // Use baseLatin for placeholder (always Latin, not Arabic)
            input.placeholder = baseLatin;
            input.autocomplete = 'off';
            input.spellcheck = false;
            // Make it look like a cell (no external CSS dependency)
            input.style.width = '100%';
            input.style.height = '54px';
            input.style.border = '0';
            input.style.outline = '0';
            input.style.background = 'transparent';
            input.style.textAlign = 'center';
            input.style.font = 'inherit';
            input.style.padding = '0 6px';

            // Visual OFF state using td class (keeps your existing .cell-btn.off styling separate)
            if (isOff) td.classList.add('cell-off');

            const commit = () => {
              const val = String(input.value ?? '').trim();
              if (!val){
                // Empty => OFF
                cellOffMap.set(key, false);
                cellTextMap.delete(key);
                td.classList.add('cell-off');
              } else {
                // Non-empty => ON
                cellOffMap.set(key, true);
                td.classList.remove('cell-off');
                // Only store override if different from base display
                if (val === baseDisp) cellTextMap.delete(key);
                else cellTextMap.set(key, val);
              }
              updateCounts(rows, cols);
              persistDraftSoon();
            };

            input.addEventListener('input', () => {
              // live commit, debounced by persistDraftSoon
              commit();
            });

            input.addEventListener('blur', () => {
              commit();
            });

            td.appendChild(input);
          }
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    gridMount.innerHTML = '';
    gridMount.appendChild(table);

    if (statusSideEl) statusSideEl.textContent = side;
    if (statusFamilyEl) statusFamilyEl.textContent = family;
    if (statusToneEl) statusToneEl.textContent = String(tone);

    familySeg?._setActive?.(family);
    toneSeg?._setActive?.(tone);
    sideSeg?._setActive?.(side);

    updateCounts(rows, cols);

    document.body.dataset.family = family;
    document.body.dataset.tone = String(tone);
    document.body.dataset.side = side;
    saveState();
    updateEditModeBtn();
  }

  function downloadJson(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildDefaultSlotHtml(fam, t, slot){
    const cols = FINALS_BY_FAMILY[fam] || [];
    const rows = SLOT_GROUPS[slot] || [];

    const prevOff = cellOffMap;
    const prevTxt = cellTextMap;
    cellOffMap = new Map();
    cellTextMap = new Map();

    try {
      return buildExportHtml(rows, cols, slotDir(slot), slot, fam);
    } finally {
      cellOffMap = prevOff;
      cellTextMap = prevTxt;
    }
  }

  function withTempCellMaps(tempOff, tempTxt, fn){
    const prevOff = cellOffMap;
    const prevTxt = cellTextMap;
    cellOffMap = tempOff;
    cellTextMap = tempTxt;
    try { return fn(); }
    finally { cellOffMap = prevOff; cellTextMap = prevTxt; }
  }

  // Normalize an EXISTING saved slot HTML so that R-slots export Arabic defaults
  // while preserving real OFF states + real custom overrides.
  function normalizeSlotHtml(fam, t, slot, existingHtml){
    const cols = FINALS_BY_FAMILY[fam] || [];
    const rows = SLOT_GROUPS[slot] || [];

    // Parse with the correct display base for THIS slot (important for R slots)
    const baseFor = (r, c) => displayBaseFor(slot, fam, r, c);
    const state = parseStateFromHtml(existingHtml, rows, cols, baseFor);

    // Re-export using the parsed state
    return withTempCellMaps(state.off, state.txt, () => {
      return buildExportHtml(rows, cols, slotDir(slot), slot, fam);
    });
  }

  function bumpBuilderVersion(){
    STORE.meta ||= {};
    STORE.meta.builder ||= {};

    const current = STORE.meta.builder.version;
    const n = Number.parseFloat(current);
    const base = Number.isFinite(n) ? n : 0.0;

    const bumped = (Math.round((base * 10) + 1) / 10);

    STORE.meta.builder.version = bumped.toFixed(1);
    STORE.meta.builder.lastEdited = new Date().toISOString();
    STORE.meta.builder.saveCount = (Number(STORE.meta.builder.saveCount) || 0) + 1;
  }

  function ensureAllFamiliesTonesSlots(){
    STORE.meta ||= {};
    STORE.meta.families = families;
    STORE.meta.tones = tones;
    STORE.meta.slots = slots;

    for (const fam of families){
      for (const t of tones){
        const map = ensurePath(fam, t);

        for (const slot of ['L1','L2','L3','L4','L5','R1','R2','R3','R4','R5']){
          const existing = map?.[slot]?.html;

          // If missing, create default.
          if (!(typeof existing === 'string' && existing.trim())){
            const html = buildDefaultSlotHtml(fam, t, slot);
            map[slot] = { title: `${fam} · ${slot} · tone ${t}`, html };
            continue;
          }

          // If present, NORMALIZE so old Latin R-slot defaults stop re-exporting as Latin.
          // This preserves real edits/off-cells but converts Latin defaults to Arabic defaults.
          if (slot.startsWith('R')){
            const normalized = normalizeSlotHtml(fam, t, slot, existing);
            map[slot] = { title: `${fam} · ${slot} · tone ${t}`, html: normalized };
          }
        }
      }
    }
  }

  // Buttons
  if (editModeBtn){
    editModeBtn.addEventListener('click', () => {
      // Persist current draft before mode switch
      persistDraftNow();
      editMode = !editMode;
      saveState();
      updateEditModeBtn();
      renderGrid();
    });
  }

  saveBtn.addEventListener('click', () => {
    persistDraftNow();
    ensureAllFamiliesTonesSlots();
    bumpBuilderVersion();
    updateBuilderMetaUI();
    saveStore();
    downloadJson('pinyintable.json', STORE);
  });


  loadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try{
      const txt = await file.text();
      const json = JSON.parse(txt);
      if (json && typeof json === 'object') STORE = json;
      saveStore();
      renderGrid();
      updateBuilderMetaUI();
    } catch {
      alert('Invalid JSON file.');
    } finally {
      fileInput.value = '';
    }
  });

  // Wire toggles (persist draft BEFORE switching)
  renderSeg(familySeg, families, family, (v) => {
    persistDraftNow();
    family = v;
    document.body.dataset.family = family;
    saveState();
    familySeg?._setActive?.(family);
    renderGrid();
  });

  renderSeg(toneSeg, tones, tone, (v) => {
    persistDraftNow();
    tone = Number(v);
    document.body.dataset.tone = String(tone);
    saveState();
    toneSeg?._setActive?.(tone);
    renderGrid();
  });

  renderSeg(sideSeg, sides, side, (v) => {
    persistDraftNow();
    side = v;
    document.body.dataset.side = side;
    saveState();
    sideSeg?._setActive?.(side);
    renderGrid();
  });

  // Boot state -> body dataset + persist
  STORE.meta ||= {};
  STORE.meta.families = families;
  STORE.meta.tones = tones;
  STORE.meta.slots = slots;
  STORE.meta.builder ||= { version: '0.0', lastEdited: null, saveCount: 0 };

  document.body.dataset.family = family;
  document.body.dataset.tone = String(tone);
  document.body.dataset.side = side;
  saveState();
  saveStore();
  updateBuilderMetaUI();
  updateEditModeBtn();

  renderGrid();
})();