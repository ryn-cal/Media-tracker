/* =====================================================================
   Quotes: mined time sentences (public-domain novels) + curated poems for time-of-day fallbacks
   ===================================================================== */
const PERIODS = ['dawn','morning','noon','afternoon','dusk','evening','night'];
const periodOf = h => h < 4 ? 'night' : h < 6 ? 'dawn' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 17 ? 'afternoon' : h < 19 ? 'dusk' : h < 22 ? 'evening' : 'night';
const POEMS = [
  { l:'en', p:'dawn', text:"I'll tell you how the Sun rose —\nA Ribbon at a time —", a:'Emily Dickinson' },
  { l:'en', p:'dawn morning', hl:'a dawn in me', text:'Morning is when I am awake and there is a dawn in me.', a:'Henry David Thoreau', w:'Walden' },
  { l:'en', p:'dawn', text:'The sun is but a morning star.', a:'Henry David Thoreau', w:'Walden' },
  { l:'en', p:'dawn', text:"The glow-worm shows the matin to be near,\nAnd 'gins to pale his uneffectual fire.", a:'William Shakespeare', w:'Hamlet' },
  { l:'en', p:'dawn morning', text:"Now morn, her rosy steps in th' eastern clime\nAdvancing, sowed the earth with orient pearl.", a:'John Milton', w:'Paradise Lost' },
  { l:'en', p:'morning', text:'The Sun came up upon the left,\nOut of the sea came he!', a:'Samuel Taylor Coleridge', w:'The Rime of the Ancient Mariner' },
  { l:'en', p:'morning', hl:'the beauty of the morning', text:'This City now doth, like a garment, wear\nThe beauty of the morning.', a:'William Wordsworth', w:'Composed upon Westminster Bridge' },
  { l:'en', p:'noon afternoon', text:"Shall I compare thee to a summer's day?\nThou art more lovely and more temperate.", a:'William Shakespeare', w:'Sonnet 18' },
  { l:'en', p:'afternoon', hl:'always afternoon', text:'In the afternoon they came unto a land\nIn which it seemed always afternoon.', a:'Alfred, Lord Tennyson', w:'The Lotos-Eaters' },
  { l:'en', p:'afternoon dusk', text:"But at my back I always hear\nTime's wingèd chariot hurrying near.", a:'Andrew Marvell', w:'To His Coy Mistress' },
  { l:'en', p:'dusk evening', hl:'Sunset and evening star', text:'Sunset and evening star,\nAnd one clear call for me!', a:'Alfred, Lord Tennyson', w:'Crossing the Bar' },
  { l:'en', p:'dusk evening', hl:'The day is done', text:'The day is done, and the darkness\nFalls from the wings of Night.', a:'Henry Wadsworth Longfellow', w:'The Day Is Done' },
  { l:'en', p:'evening', hl:'the evening is spread out against the sky', text:'Let us go then, you and I,\nWhen the evening is spread out against the sky', a:'T. S. Eliot', w:'The Love Song of J. Alfred Prufrock' },
  { l:'en', p:'evening night', text:'If music be the food of love, play on.', a:'William Shakespeare', w:'Twelfth Night' },
  { l:'en', p:'evening night', text:'The woods are lovely, dark and deep,\nBut I have promises to keep.', a:'Robert Frost', w:'Stopping by Woods on a Snowy Evening' },
  { l:'en', p:'night', text:'We are all in the gutter, but some of us are looking at the stars.', a:'Oscar Wilde', w:"Lady Windermere's Fan" },
  { l:'en', p:'night', hl:'Good night, good night', text:'Good night, good night! Parting is such sweet sorrow,\nThat I shall say good night till it be morrow.', a:'William Shakespeare', w:'Romeo and Juliet' },
  { l:'en', p:'night', text:'Tyger Tyger, burning bright,\nIn the forests of the night.', a:'William Blake', w:'The Tyger' },
  { l:'en', p:'night', hl:'first sweet sleep of night', text:'I arise from dreams of thee\nIn the first sweet sleep of night.', a:'Percy Bysshe Shelley', w:'The Indian Serenade' },
  { l:'en', p:'dawn', hl:'So dawn goes down to day', text:'So dawn goes down to day.\nNothing gold can stay.', a:'Robert Frost', w:'Nothing Gold Can Stay' },
  { l:'en', p:'dawn', text:"Hark, hark! the lark at heaven's gate sings,\nAnd Phoebus 'gins arise.", a:'William Shakespeare', w:'Cymbeline' },
  { l:'en', t:['07:00'], p:'morning', hl:'Morning’s at seven', text:'The year’s at the spring,\nAnd day’s at the morn;\nMorning’s at seven;\nThe hill-side’s dew-pearled;', a:'Robert Browning', w:'Pippa Passes' },
  { l:'en', p:'morning', text:'In winter I get up at night\nAnd dress by yellow candle-light.', a:'Robert Louis Stevenson', w:'Bed in Summer' },
  { l:'en', p:'noon', hl:'noon a purple glow', text:'There midnight’s all a glimmer, and noon a purple glow,\nAnd evening full of the linnet’s wings.', a:'W. B. Yeats', w:'The Lake Isle of Innisfree' },
  { l:'en', p:'dusk', text:'The long day wanes: the slow moon climbs: the deep\nMoans round with many voices.', a:'Alfred, Lord Tennyson', w:'Ulysses' },
  { l:'en', p:'dusk', text:'Light thickens, and the crow\nMakes wing to the rooky wood.', a:'William Shakespeare', w:'Macbeth' },
  { l:'en', p:'dusk evening', text:'I leant upon a coppice gate\nWhen Frost was spectre-gray,', a:'Thomas Hardy', w:'The Darkling Thrush' },
  { l:'en', p:'night', hl:'tender is the night', text:'Already with thee! tender is the night,\nAnd haply the Queen-Moon is on her throne.', a:'John Keats', w:'Ode to a Nightingale' },
  { l:'zh', p:'dawn', hl:'海日生残夜', text:'海日生残夜，江春入旧年。', a:'王湾', w:'次北固山下' },
  { l:'zh', p:'dawn morning', hl:'晨兴理荒秽', text:'晨兴理荒秽，带月荷锄归。', a:'陶渊明', w:'归园田居' },
  { l:'zh', p:'morning', hl:'清晨入古寺', text:'清晨入古寺，初日照高林。', a:'常建', w:'题破山寺后禅院' },
  { l:'zh', p:'morning', hl:'日出江花红胜火', text:'日出江花红胜火，春来江水绿如蓝。', a:'白居易', w:'忆江南' },
  { l:'zh', p:'dawn morning', hl:'昨夜雨疏风骤', text:'昨夜雨疏风骤，浓睡不消残酒。\n试问卷帘人，却道海棠依旧。', a:'李清照', w:'如梦令' },
  { l:'zh', p:'noon', hl:'东边日出西边雨', text:'东边日出西边雨，道是无晴却有晴。', a:'刘禹锡', w:'竹枝词' },
  { l:'zh', p:'noon', text:'千山鸟飞绝，万径人踪灭。', a:'柳宗元', w:'江雪' },
  { l:'zh', p:'afternoon', text:'水光潋滟晴方好，山色空蒙雨亦奇。', a:'苏轼', w:'饮湖上初晴后雨' },
  { l:'zh', p:'afternoon', hl:'坐看云起时', text:'行到水穷处，坐看云起时。', a:'王维', w:'终南别业' },
  { l:'zh', p:'dusk', hl:'日暮客愁新', text:'日暮客愁新，野旷天低树。', a:'孟浩然', w:'宿建德江' },
  { l:'zh', p:'dusk', hl:'夕阳无限好', text:'夕阳无限好，只是近黄昏。', a:'李商隐', w:'乐游原' },
  { l:'zh', p:'dusk evening', hl:'日暮乡关何处是', text:'日暮乡关何处是，烟波江上使人愁。', a:'崔颢', w:'黄鹤楼' },
  { l:'zh', p:'evening', hl:'灯火阑珊处', text:'众里寻他千百度，蓦然回首，\n那人却在，灯火阑珊处。', a:'辛弃疾', w:'青玉案·元夕' },
  { l:'zh', p:'evening night', hl:'春江潮水连海平', text:'春江潮水连海平，海上明月共潮生。', a:'张若虚', w:'春江花月夜' },
  { l:'zh', p:'night', hl:'天阶夜色凉如水', text:'银烛秋光冷画屏，轻罗小扇扑流萤。\n天阶夜色凉如水，卧看牵牛织女星。', a:'杜牧', w:'秋夕' },
  { l:'zh', p:'night', hl:'星垂平野阔', text:'星垂平野阔，月涌大江流。', a:'杜甫', w:'旅夜书怀' },
  { l:'zh', p:'night', text:'独坐幽篁里，弹琴复长啸。\n深林人不知，明月来相照。', a:'王维', w:'竹里馆' },
  { l:'zh', p:'night', hl:'手可摘星辰', text:'危楼高百尺，手可摘星辰。', a:'李白', w:'夜宿山寺' },
  { l:'zh', t:['00:00'], p:'night', hl:'夜半钟声', text:'月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。', a:'张继', w:'枫桥夜泊' },
  { l:'zh', p:'dawn', text:'女曰鸡鸣，士曰昧旦。', a:'《诗经》', w:'郑风·女曰鸡鸣' },
  { l:'zh', p:'dawn morning', hl:'春眠不觉晓', text:'春眠不觉晓，处处闻啼鸟。', a:'孟浩然', w:'春晓' },
  { l:'zh', p:'morning', hl:'朝辞白帝彩云间', text:'朝辞白帝彩云间，千里江陵一日还。', a:'李白', w:'早发白帝城' },
  { l:'zh', p:'morning', text:'日照香炉生紫烟，遥看瀑布挂前川。', a:'李白', w:'望庐山瀑布' },
  { l:'zh', p:'morning', text:'两个黄鹂鸣翠柳，一行白鹭上青天。', a:'杜甫', w:'绝句' },
  { l:'zh', p:'noon afternoon', text:'泉眼无声惜细流，树阴照水爱晴柔。', a:'杨万里', w:'小池' },
  { l:'zh', p:'noon afternoon', text:'独怜幽草涧边生，上有黄鹂深树鸣。', a:'韦应物', w:'滁州西涧' },
  { l:'zh', p:'afternoon dusk', hl:'白日依山尽', text:'白日依山尽，黄河入海流。', a:'王之涣', w:'登鹳雀楼' },
  { l:'zh', p:'dusk', hl:'长河落日圆', text:'大漠孤烟直，长河落日圆。', a:'王维', w:'使至塞上' },
  { l:'zh', p:'dusk', text:'一道残阳铺水中，半江瑟瑟半江红。', a:'白居易', w:'暮江吟' },
  { l:'zh', p:'dusk', hl:'停车坐爱枫林晚', text:'停车坐爱枫林晚，霜叶红于二月花。', a:'杜牧', w:'山行' },
  { l:'zh', p:'dusk evening', hl:'日夕', text:'采菊东篱下，悠然见南山。\n山气日夕佳，飞鸟相与还。', a:'陶渊明', w:'饮酒·其五' },
  { l:'zh', p:'evening', hl:'天气晚来秋', text:'空山新雨后，天气晚来秋。', a:'王维', w:'山居秋暝' },
  { l:'zh', p:'evening', hl:'人约黄昏后', text:'月上柳梢头，人约黄昏后。', a:'欧阳修', w:'生查子·元夕' },
  { l:'zh', p:'evening night', hl:'海上生明月', text:'海上生明月，天涯共此时。', a:'张九龄', w:'望月怀远' },
  { l:'zh', p:'night', hl:'床前明月光', text:'床前明月光，疑是地上霜。', a:'李白', w:'静夜思' },
  { l:'zh', p:'night', text:'花间一壶酒，独酌无相亲。\n举杯邀明月，对影成三人。', a:'李白', w:'月下独酌' },
  { l:'zh', p:'night', hl:'明月几时有', text:'明月几时有？把酒问青天。', a:'苏轼', w:'水调歌头' },
  { l:'zh', p:'night', text:'人闲桂花落，夜静春山空。', a:'王维', w:'鸟鸣涧' },
  { l:'zh', p:'night', hl:'巴山夜雨', text:'君问归期未有期，巴山夜雨涨秋池。', a:'李商隐', w:'夜雨寄北' },
  { l:'zh', p:'dawn', hl:"鸡声茅店月", text:"鸡声茅店月，人迹板桥霜。", a:"温庭筠", w:"商山早行" },
  { l:'zh', p:'dawn', hl:"晨起动征铎", text:"晨起动征铎，客行悲故乡。", a:"温庭筠", w:"商山早行" },
  { l:'zh', p:'dawn', hl:"东方未明", text:"东方未明，颠倒衣裳。", a:"《诗经》", w:"齐风·东方未明" },
  { l:'zh', p:'dawn', hl:"晓看红湿处", text:"晓看红湿处，花重锦官城。", a:"杜甫", w:"春夜喜雨" },
  { l:'zh', p:'dawn', hl:"绛帻鸡人报晓筹", text:"绛帻鸡人报晓筹，尚衣方进翠云裘。", a:"王维", w:"和贾舍人早朝大明宫之作" },
  { l:'zh', p:'dawn', hl:"晓风残月", text:"今宵酒醒何处？杨柳岸，晓风残月。", a:"柳永", w:"雨霖铃" },
  { l:'zh', p:'dawn', hl:"平明送客楚山孤", text:"寒雨连江夜入吴，平明送客楚山孤。", a:"王昌龄", w:"芙蓉楼送辛渐" },
  { l:'zh', p:'dawn morning', hl:"白露为霜", text:"蒹葭苍苍，白露为霜。\n所谓伊人，在水一方。", a:"《诗经》", w:"秦风·蒹葭" },
  { l:'zh', p:'dawn', hl:"三更灯火五更鸡", text:"三更灯火五更鸡，正是男儿读书时。", a:"颜真卿", w:"劝学" },
  { l:'zh', p:'dawn morning', hl:"千门万户曈曈日", text:"爆竹声中一岁除，春风送暖入屠苏。\n千门万户曈曈日，总把新桃换旧符。", a:"王安石", w:"元日" },
  { l:'zh', p:'dawn morning', hl:"晓汲清湘燃楚竹", text:"渔翁夜傍西岩宿，晓汲清湘燃楚竹。", a:"柳宗元", w:"渔翁" },
  { l:'zh', p:'dawn morning', hl:"路漫漫其修远兮", text:"路漫漫其修远兮，吾将上下而求索。", a:"屈原", w:"离骚" },
  { l:'zh', p:'morning', hl:"一日看尽长安花", text:"春风得意马蹄疾，一日看尽长安花。", a:"孟郊", w:"登科后" },
  { l:'zh', p:'morning', hl:"杏花雨", text:"沾衣欲湿杏花雨，吹面不寒杨柳风。", a:"志南", w:"绝句" },
  { l:'zh', p:'morning', hl:"春江水暖鸭先知", text:"竹外桃花三两枝，春江水暖鸭先知。", a:"苏轼", w:"惠崇春江晚景" },
  { l:'zh', p:'morning', hl:"映日荷花别样红", text:"毕竟西湖六月中，风光不与四时同。\n接天莲叶无穷碧，映日荷花别样红。", a:"杨万里", w:"晓出净慈寺送林子方" },
  { l:'zh', p:'morning', hl:"朝闻道", text:"朝闻道，夕死可矣。", a:"孔子", w:"论语·里仁" },
  { l:'zh', p:'morning', hl:"天朗气清", text:"是日也，天朗气清，惠风和畅。", a:"王羲之", w:"兰亭集序" },
  { l:'zh', p:'morning', hl:"朝晖夕阴", text:"朝晖夕阴，气象万千。", a:"范仲淹", w:"岳阳楼记" },
  { l:'zh', p:'morning', hl:"日出而林霏开", text:"若夫日出而林霏开，云归而岩穴暝，晦明变化者，山间之朝暮也。", a:"欧阳修", w:"醉翁亭记" },
  { l:'zh', p:'morning', hl:"朝菌不知晦朔", text:"朝菌不知晦朔，蟪蛄不知春秋。", a:"庄子", w:"逍遥游" },
  { l:'zh', p:'morning', hl:"千里之行", text:"千里之行，始于足下。", a:"老子", w:"道德经" },
  { l:'zh', p:'morning', hl:"朝搴阰之木兰兮", text:"朝搴阰之木兰兮，夕揽洲之宿莽。", a:"屈原", w:"离骚" },
  { l:'zh', p:'morning', hl:"一日难再晨", text:"盛年不重来，一日难再晨。\n及时当勉励，岁月不待人。", a:"陶渊明", w:"杂诗" },
  { l:'zh', p:'morning', hl:"木欣欣以向荣", text:"木欣欣以向荣，泉涓涓而始流。", a:"陶渊明", w:"归去来兮辞" },
  { l:'zh', p:'morning', hl:"池塘生春草", text:"池塘生春草，园柳变鸣禽。", a:"谢灵运", w:"登池上楼" },
  { l:'zh', p:'morning', hl:"万条垂下绿丝绦", text:"碧玉妆成一树高，万条垂下绿丝绦。\n不知细叶谁裁出，二月春风似剪刀。", a:"贺知章", w:"咏柳" },
  { l:'zh', p:'morning', hl:"渭城朝雨浥轻尘", text:"渭城朝雨浥轻尘，客舍青青柳色新。", a:"王维", w:"送元二使安西" },
  { l:'zh', p:'morning', hl:"烟花三月下扬州", text:"故人西辞黄鹤楼，烟花三月下扬州。", a:"李白", w:"黄鹤楼送孟浩然之广陵" },
  { l:'zh', p:'morning', hl:"会当凌绝顶", text:"会当凌绝顶，一览众山小。", a:"杜甫", w:"望岳" },
  { l:'zh', p:'morning', hl:"齐鲁青未了", text:"岱宗夫如何？齐鲁青未了。", a:"杜甫", w:"望岳" },
  { l:'zh', p:'morning', hl:"窗含西岭千秋雪", text:"窗含西岭千秋雪，门泊东吴万里船。", a:"杜甫", w:"绝句" },
  { l:'zh', p:'morning', hl:"几处早莺争暖树", text:"几处早莺争暖树，谁家新燕啄春泥。", a:"白居易", w:"钱塘湖春行" },
  { l:'zh', p:'morning', hl:"烟销日出不见人", text:"烟销日出不见人，欸乃一声山水绿。", a:"柳宗元", w:"渔翁" },
  { l:'zh', p:'morning', hl:"我言秋日胜春朝", text:"自古逢秋悲寂寥，我言秋日胜春朝。", a:"刘禹锡", w:"秋词" },
  { l:'zh', p:'morning', hl:"千里莺啼绿映红", text:"千里莺啼绿映红，水村山郭酒旗风。", a:"杜牧", w:"江南春" },
  { l:'zh', p:'morning', hl:"小山重叠金明灭", text:"小山重叠金明灭，鬓云欲度香腮雪。", a:"温庭筠", w:"菩萨蛮" },
  { l:'zh', p:'morning', hl:"庭院深深深几许", text:"庭院深深深几许，杨柳堆烟，帘幕无重数。", a:"欧阳修", w:"蝶恋花" },
  { l:'zh', p:'morning', hl:"春色满园关不住", text:"春色满园关不住，一枝红杏出墙来。", a:"叶绍翁", w:"游园不值" },
  { l:'zh', p:'morning', hl:"忽如一夜春风来", text:"忽如一夜春风来，千树万树梨花开。", a:"岑参", w:"白雪歌送武判官归京" },
  { l:'zh', p:'morning', hl:"斜风细雨不须归", text:"西塞山前白鹭飞，桃花流水鳜鱼肥。\n青箬笠，绿蓑衣，斜风细雨不须归。", a:"张志和", w:"渔歌子" },
  { l:'zh', p:'morning', hl:"林花谢了春红", text:"林花谢了春红，太匆匆。", a:"李煜", w:"相见欢" },
  { l:'zh', p:'morning', hl:"关关雎鸠", text:"关关雎鸠，在河之洲。", a:"《诗经》", w:"周南·关雎" },
  { l:'zh', p:'morning', hl:"学而时习之", text:"学而时习之，不亦说乎？", a:"孔子", w:"论语·学而" },
  { l:'zh', p:'morning', hl:"盼望着", text:"盼望着，盼望着，东风来了，春天的脚步近了。", a:"朱自清", w:"春" },
  { l:'zh', p:'morning noon', hl:"风烟俱净", text:"风烟俱净，天山共色。从流飘荡，任意东西。", a:"吴均", w:"与朱元思书" },
  { l:'zh', p:'noon', hl:"上善若水", text:"上善若水，水善利万物而不争。", a:"老子", w:"道德经" },
  { l:'zh', p:'noon', hl:"小荷才露尖尖角", text:"小荷才露尖尖角，早有蜻蜓立上头。", a:"杨万里", w:"小池" },
  { l:'zh', p:'noon', hl:"晴空一鹤排云上", text:"晴空一鹤排云上，便引诗情到碧霄。", a:"刘禹锡", w:"秋词" },
  { l:'zh', p:'noon', hl:"欲把西湖比西子", text:"欲把西湖比西子，淡妆浓抹总相宜。", a:"苏轼", w:"饮湖上初晴后雨" },
  { l:'zh', p:'noon', hl:"天光云影共徘徊", text:"半亩方塘一鉴开，天光云影共徘徊。\n问渠那得清如许？为有源头活水来。", a:"朱熹", w:"观书有感" },
  { l:'zh', p:'noon', hl:"相看两不厌", text:"众鸟高飞尽，孤云独去闲。\n相看两不厌，只有敬亭山。", a:"李白", w:"独坐敬亭山" },
  { l:'zh', p:'noon', hl:"春和景明", text:"至若春和景明，波澜不惊，上下天光，一碧万顷。", a:"范仲淹", w:"岳阳楼记" },
  { l:'zh', p:'noon afternoon', hl:"蝉噪林逾静", text:"蝉噪林逾静，鸟鸣山更幽。", a:"王籍", w:"入若耶溪" },
  { l:'zh', p:'noon', hl:"自非亭午夜分", text:"自三峡七百里中，两岸连山，略无阙处。\n重岩叠嶂，隐天蔽日，自非亭午夜分，不见曦月。", a:"郦道元", w:"水经注·江水" },
  { l:'zh', p:'noon', hl:"日长篱落无人过", text:"梅子金黄杏子肥，麦花雪白菜花稀。\n日长篱落无人过，惟有蜻蜓蝴蝶飞。", a:"范成大", w:"四时田园杂兴" },
  { l:'zh', p:'noon', hl:"锄禾日当午", text:"锄禾日当午，汗滴禾下土。", a:"李绅", w:"悯农" },
  { l:'zh', p:'afternoon', hl:"大江东去", text:"大江东去，浪淘尽，千古风流人物。", a:"苏轼", w:"念奴娇·赤壁怀古" },
  { l:'zh', p:'afternoon', hl:"何妨吟啸且徐行", text:"莫听穿林打叶声，何妨吟啸且徐行。", a:"苏轼", w:"定风波" },
  { l:'zh', p:'afternoon', hl:"一蓑烟雨任平生", text:"竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", a:"苏轼", w:"定风波" },
  { l:'zh', p:'afternoon', hl:"横看成岭侧成峰", text:"横看成岭侧成峰，远近高低各不同。", a:"苏轼", w:"题西林壁" },
  { l:'zh', p:'afternoon', hl:"望湖楼下水如天", text:"黑云翻墨未遮山，白雨跳珠乱入船。\n卷地风来忽吹散，望湖楼下水如天。", a:"苏轼", w:"六月二十七日望湖楼醉书" },
  { l:'zh', p:'afternoon', hl:"黄河远上白云间", text:"黄河远上白云间，一片孤城万仞山。", a:"王之涣", w:"凉州词" },
  { l:'zh', p:'afternoon', hl:"江流天地外", text:"江流天地外，山色有无中。", a:"王维", w:"汉江临眺" },
  { l:'zh', p:'afternoon', hl:"无边落木萧萧下", text:"无边落木萧萧下，不尽长江滚滚来。", a:"杜甫", w:"登高" },
  { l:'zh', p:'afternoon', hl:"两岸青山相对出", text:"两岸青山相对出，孤帆一片日边来。", a:"李白", w:"望天门山" },
  { l:'zh', p:'afternoon', hl:"白水绕东城", text:"青山横北郭，白水绕东城。", a:"李白", w:"送友人" },
  { l:'zh', p:'afternoon', hl:"念天地之悠悠", text:"前不见古人，后不见来者。\n念天地之悠悠，独怆然而涕下。", a:"陈子昂", w:"登幽州台歌" },
  { l:'zh', p:'afternoon', hl:"浴乎沂", text:"暮春者，春服既成，冠者五六人，童子六七人，浴乎沂，风乎舞雩，咏而归。", a:"孔子", w:"论语·先进" },
  { l:'zh', p:'afternoon', hl:"人面桃花相映红", text:"去年今日此门中，人面桃花相映红。", a:"崔护", w:"题都城南庄" },
  { l:'zh', p:'afternoon', hl:"天苍苍", text:"天苍苍，野茫茫，风吹草低见牛羊。", a:"《敕勒歌》", w:"" },
  { l:'zh', p:'afternoon', hl:"泪眼问花花不语", text:"泪眼问花花不语，乱红飞过秋千去。", a:"欧阳修", w:"蝶恋花" },
  { l:'zh', p:'afternoon', hl:"两山排闼送青来", text:"一水护田将绿绕，两山排闼送青来。", a:"王安石", w:"书湖阴先生壁" },
  { l:'zh', p:'afternoon', hl:"愁永昼", text:"薄雾浓云愁永昼，瑞脑消金兽。", a:"李清照", w:"醉花阴" },
  { l:'zh', p:'afternoon', hl:"山重水复疑无路", text:"山重水复疑无路，柳暗花明又一村。", a:"陆游", w:"游山西村" },
  { l:'zh', p:'afternoon', hl:"北国的秋", text:"不管怎么说，北国的秋，却特别地来得清，来得静，来得悲凉。", a:"郁达夫", w:"故都的秋" },
  { l:'zh', p:'afternoon', hl:"不必说碧绿的菜畦", text:"不必说碧绿的菜畦，光滑的石井栏，高大的皂荚树，紫红的桑椹。", a:"鲁迅", w:"从百草园到三味书屋" },
  { l:'zh', p:'afternoon', hl:"白昼听棋声", text:"春听鸟声，夏听蝉声，秋听虫声，冬听雪声，\n白昼听棋声，月下听箫声，山中听松声，水际听欸乃声，\n方不虚生此耳。", a:"张潮", w:"幽梦影" },
  { l:'zh', p:'dusk', hl:"落霞与孤鹜齐飞", text:"落霞与孤鹜齐飞，秋水共长天一色。", a:"王勃", w:"滕王阁序" },
  { l:'zh', p:'dusk', hl:"渔舟唱晚", text:"渔舟唱晚，响穷彭蠡之滨；雁阵惊寒，声断衡阳之浦。", a:"王勃", w:"滕王阁序" },
  { l:'zh', p:'dusk', hl:"返景入深林", text:"空山不见人，但闻人语响。\n返景入深林，复照青苔上。", a:"王维", w:"鹿柴" },
  { l:'zh', p:'dusk', hl:"落日故人情", text:"浮云游子意，落日故人情。", a:"李白", w:"送友人" },
  { l:'zh', p:'dusk', hl:"决眦入归鸟", text:"荡胸生曾云，决眦入归鸟。", a:"杜甫", w:"望岳" },
  { l:'zh', p:'dusk', hl:"日之夕矣", text:"鸡栖于埘，日之夕矣，羊牛下来。", a:"《诗经》", w:"王风·君子于役" },
  { l:'zh', p:'dusk', hl:"昔我往矣", text:"昔我往矣，杨柳依依。\n今我来思，雨雪霏霏。", a:"《诗经》", w:"小雅·采薇" },
  { l:'zh', p:'dusk', hl:"鸟倦飞而知还", text:"云无心以出岫，鸟倦飞而知还。", a:"陶渊明", w:"归去来兮辞" },
  { l:'zh', p:'dusk', hl:"景翳翳以将入", text:"景翳翳以将入，抚孤松而盘桓。", a:"陶渊明", w:"归去来兮辞" },
  { l:'zh', p:'dusk', hl:"余霞散成绮", text:"余霞散成绮，澄江静如练。", a:"谢朓", w:"晚登三山还望京邑" },
  { l:'zh', p:'dusk', hl:"人间重晚晴", text:"天意怜幽草，人间重晚晴。", a:"李商隐", w:"晚晴" },
  { l:'zh', p:'dusk', hl:"斜晖脉脉水悠悠", text:"过尽千帆皆不是，斜晖脉脉水悠悠。", a:"温庭筠", w:"梦江南" },
  { l:'zh', p:'dusk', hl:"夕阳西下几时回", text:"一曲新词酒一杯，去年天气旧亭台。\n夕阳西下几时回？", a:"晏殊", w:"浣溪沙" },
  { l:'zh', p:'dusk', hl:"无可奈何花落去", text:"无可奈何花落去，似曾相识燕归来。", a:"晏殊", w:"浣溪沙" },
  { l:'zh', p:'dusk', hl:"对长亭晚", text:"寒蝉凄切，对长亭晚，骤雨初歇。", a:"柳永", w:"雨霖铃" },
  { l:'zh', p:'dusk', hl:"也无风雨也无晴", text:"回首向来萧瑟处，归去，也无风雨也无晴。", a:"苏轼", w:"定风波" },
  { l:'zh', p:'dusk', hl:"常记溪亭日暮", text:"常记溪亭日暮，沉醉不知归路。\n兴尽晚回舟，误入藕花深处。", a:"李清照", w:"如梦令" },
  { l:'zh', p:'dusk', hl:"到黄昏、点点滴滴", text:"梧桐更兼细雨，到黄昏、点点滴滴。", a:"李清照", w:"声声慢" },
  { l:'zh', p:'dusk', hl:"夕阳西下，断肠人在天涯", text:"枯藤老树昏鸦，小桥流水人家，古道西风瘦马。\n夕阳西下，断肠人在天涯。", a:"马致远", w:"天净沙·秋思" },
  { l:'zh', p:'dusk', hl:"沉思往事立残阳", text:"谁念西风独自凉，萧萧黄叶闭疏窗，沉思往事立残阳。", a:"纳兰性德", w:"浣溪沙" },
  { l:'zh', p:'dusk', hl:"千里黄云白日曛", text:"千里黄云白日曛，北风吹雁雪纷纷。", a:"高适", w:"别董大" },
  { l:'zh', p:'dusk', hl:"朝发白帝，暮到江陵", text:"朝发白帝，暮到江陵，其间千二百里，虽乘奔御风，不以疾也。", a:"郦道元", w:"水经注·江水" },
  { l:'zh', p:'dusk', hl:"旦辞爷娘去，暮宿黄河边", text:"旦辞爷娘去，暮宿黄河边。", a:"《木兰诗》", w:"" },
  { l:'zh', p:'dusk', hl:"作别西天的云彩", text:"轻轻的我走了，正如我轻轻的来；\n我轻轻的招手，作别西天的云彩。", a:"徐志摩", w:"再别康桥" },
  { l:'zh', p:'evening', hl:"晚来天欲雪", text:"绿蚁新醅酒，红泥小火炉。\n晚来天欲雪，能饮一杯无？", a:"白居易", w:"问刘十九" },
  { l:'zh', p:'evening', hl:"风雪夜归人", text:"日暮苍山远，天寒白屋贫。\n柴门闻犬吠，风雪夜归人。", a:"刘长卿", w:"逢雪宿芙蓉山主人" },
  { l:'zh', p:'evening', hl:"山光忽西落", text:"山光忽西落，池月渐东上。\n散发乘夕凉，开轩卧闲敞。", a:"孟浩然", w:"夏日南亭怀辛大" },
  { l:'zh', p:'evening', hl:"竹露滴清响", text:"荷风送香气，竹露滴清响。", a:"孟浩然", w:"夏日南亭怀辛大" },
  { l:'zh', p:'evening', hl:"留得枯荷听雨声", text:"秋阴不散霜飞晚，留得枯荷听雨声。", a:"李商隐", w:"宿骆氏亭寄怀崔雍崔衮" },
  { l:'zh', p:'evening', hl:"昨夜西风凋碧树", text:"昨夜西风凋碧树，独上高楼，望尽天涯路。", a:"晏殊", w:"蝶恋花" },
  { l:'zh', p:'evening', hl:"东风夜放花千树", text:"东风夜放花千树，更吹落，星如雨。", a:"辛弃疾", w:"青玉案·元夕" },
  { l:'zh', p:'evening', hl:"莫道不销魂", text:"莫道不销魂，帘卷西风，人比黄花瘦。", a:"李清照", w:"醉花阴" },
  { l:'zh', p:'evening', hl:"是日更定矣", text:"崇祯五年十二月，余住西湖。大雪三日，湖中人鸟声俱绝。\n是日更定矣，余拏一小舟，拥毳衣炉火，独往湖心亭看雪。", a:"张岱", w:"湖心亭看雪" },
  { l:'zh', p:'evening', hl:"上下一白", text:"雾凇沆砀，天与云、与山、与水，上下一白。", a:"张岱", w:"湖心亭看雪" },
  { l:'zh', p:'evening', hl:"清风徐来", text:"清风徐来，水波不兴。", a:"苏轼", w:"赤壁赋" },
  { l:'zh', p:'evening night', hl:"星汉灿烂", text:"日月之行，若出其中；\n星汉灿烂，若出其里。", a:"曹操", w:"观沧海" },
  { l:'zh', p:'evening', hl:"洗手的时候", text:"洗手的时候，日子从水盆里过去；\n吃饭的时候，日子从饭碗里过去；\n默默时，便从凝然的双眼前过去。", a:"朱自清", w:"匆匆" },
  { l:'zh', p:'evening night', hl:"湖光秋月两相和", text:"湖光秋月两相和，潭面无风镜未磨。", a:"刘禹锡", w:"望洞庭" },
  { l:'zh', p:'evening', hl:"碧云天，黄叶地", text:"碧云天，黄叶地，秋色连波，波上寒烟翠。", a:"范仲淹", w:"苏幕遮" },
  { l:'zh', p:'night', hl:"明月松间照", text:"明月松间照，清泉石上流。", a:"王维", w:"山居秋暝" },
  { l:'zh', p:'night', hl:"润物细无声", text:"好雨知时节，当春乃发生。\n随风潜入夜，润物细无声。", a:"杜甫", w:"春夜喜雨" },
  { l:'zh', p:'night', hl:"江船火独明", text:"野径云俱黑，江船火独明。", a:"杜甫", w:"春夜喜雨" },
  { l:'zh', p:'night', hl:"露从今夜白", text:"露从今夜白，月是故乡明。", a:"杜甫", w:"月夜忆舍弟" },
  { l:'zh', p:'night', hl:"今夜鄜州月", text:"今夜鄜州月，闺中只独看。", a:"杜甫", w:"月夜" },
  { l:'zh', p:'night', hl:"长安一片月", text:"长安一片月，万户捣衣声。", a:"李白", w:"子夜吴歌" },
  { l:'zh', p:'night', hl:"牛渚西江夜", text:"牛渚西江夜，青天无片云。", a:"李白", w:"夜泊牛渚怀古" },
  { l:'zh', p:'night', hl:"随君直到夜郎西", text:"我寄愁心与明月，随君直到夜郎西。", a:"李白", w:"闻王昌龄左迁龙标遥有此寄" },
  { l:'zh', p:'night', hl:"秦时明月汉时关", text:"秦时明月汉时关，万里长征人未还。", a:"王昌龄", w:"出塞" },
  { l:'zh', p:'night', hl:"烟笼寒水月笼沙", text:"烟笼寒水月笼沙，夜泊秦淮近酒家。", a:"杜牧", w:"泊秦淮" },
  { l:'zh', p:'night', hl:"蜡炬成灰泪始干", text:"春蚕到死丝方尽，蜡炬成灰泪始干。", a:"李商隐", w:"无题" },
  { l:'zh', p:'night', hl:"浔阳江头夜送客", text:"浔阳江头夜送客，枫叶荻花秋瑟瑟。", a:"白居易", w:"琵琶行" },
  { l:'zh', p:'night', hl:"唯见江心秋月白", text:"东船西舫悄无言，唯见江心秋月白。", a:"白居易", w:"琵琶行" },
  { l:'zh', p:'night', hl:"画船听雨眠", text:"春水碧于天，画船听雨眠。", a:"韦庄", w:"菩萨蛮" },
  { l:'zh', p:'night', hl:"春花秋月何时了", text:"春花秋月何时了，往事知多少。", a:"李煜", w:"虞美人" },
  { l:'zh', p:'night', hl:"月如钩", text:"无言独上西楼，月如钩。\n寂寞梧桐深院锁清秋。", a:"李煜", w:"相见欢" },
  { l:'zh', p:'night', hl:"羌管悠悠霜满地", text:"羌管悠悠霜满地。人不寐，将军白发征夫泪。", a:"范仲淹", w:"渔家傲" },
  { l:'zh', p:'night', hl:"夜来幽梦忽还乡", text:"夜来幽梦忽还乡，小轩窗，正梳妆。", a:"苏轼", w:"江城子" },
  { l:'zh', p:'night', hl:"但愿人长久", text:"但愿人长久，千里共婵娟。", a:"苏轼", w:"水调歌头" },
  { l:'zh', p:'night', hl:"缺月挂疏桐", text:"缺月挂疏桐，漏断人初静。", a:"苏轼", w:"卜算子" },
  { l:'zh', p:'night', hl:"春宵一刻值千金", text:"春宵一刻值千金，花有清香月有阴。\n歌管楼台声细细，秋千院落夜沉沉。", a:"苏轼", w:"春宵" },
  { l:'zh', p:'night', hl:"庭下如积水空明", text:"庭下如积水空明，水中藻荇交横，盖竹柏影也。", a:"苏轼", w:"记承天寺夜游" },
  { l:'zh', p:'night', hl:"清风半夜鸣蝉", text:"明月别枝惊鹊，清风半夜鸣蝉。\n稻花香里说丰年，听取蛙声一片。", a:"辛弃疾", w:"西江月·夜行黄沙道中" },
  { l:'zh', p:'night', hl:"七八个星天外", text:"七八个星天外，两三点雨山前。", a:"辛弃疾", w:"西江月·夜行黄沙道中" },
  { l:'zh', p:'night', hl:"醉里挑灯看剑", text:"醉里挑灯看剑，梦回吹角连营。", a:"辛弃疾", w:"破阵子" },
  { l:'zh', p:'night', hl:"夜阑卧听风吹雨", text:"夜阑卧听风吹雨，铁马冰河入梦来。", a:"陆游", w:"十一月四日风雨大作" },
  { l:'zh', p:'night', hl:"小楼一夜听春雨", text:"小楼一夜听春雨，深巷明朝卖杏花。", a:"陆游", w:"临安春雨初霁" },
  { l:'zh', p:'night', hl:"闲敲棋子落灯花", text:"黄梅时节家家雨，青草池塘处处蛙。\n有约不来过夜半，闲敲棋子落灯花。", a:"赵师秀", w:"约客" },
  { l:'zh', p:'night', hl:"明月何时照我还", text:"春风又绿江南岸，明月何时照我还。", a:"王安石", w:"泊船瓜洲" },
  { l:'zh', p:'night', hl:"月移花影上栏杆", text:"春色恼人眠不得，月移花影上栏杆。", a:"王安石", w:"夜直" },
  { l:'zh', p:'night', hl:"两情若是久长时", text:"纤云弄巧，飞星传恨，银汉迢迢暗度。\n两情若是久长时，又岂在朝朝暮暮。", a:"秦观", w:"鹊桥仙" },
  { l:'zh', p:'night', hl:"冷月无声", text:"二十四桥仍在，波心荡、冷月无声。", a:"姜夔", w:"扬州慢" },
  { l:'zh', p:'night', hl:"夜深千帐灯", text:"山一程，水一程，身向榆关那畔行，夜深千帐灯。", a:"纳兰性德", w:"长相思" },
  { l:'zh', p:'night', hl:"僧敲月下门", text:"鸟宿池边树，僧敲月下门。", a:"贾岛", w:"题李凝幽居" },
  { l:'zh', p:'night', hl:"明月何皎皎", text:"明月何皎皎，照我罗床帏。", a:"《古诗十九首》", w:"" },
  { l:'zh', p:'night', hl:"迢迢牵牛星", text:"迢迢牵牛星，皎皎河汉女。", a:"《古诗十九首》", w:"" },
  { l:'zh', p:'night', hl:"月明星稀", text:"月明星稀，乌鹊南飞。", a:"曹操", w:"短歌行" },
  { l:'zh', p:'night', hl:"朔气传金柝", text:"朔气传金柝，寒光照铁衣。", a:"《木兰诗》", w:"" },
  { l:'zh', p:'night', hl:"月出皎兮", text:"月出皎兮，佼人僚兮。", a:"《诗经》", w:"陈风·月出" },
  { l:'zh', p:'night', hl:"夜大雪，眠觉", text:"王子猷居山阴，夜大雪，眠觉，开室，命酌酒，四望皎然。", a:"刘义庆", w:"世说新语·任诞" },
  { l:'zh', p:'night', hl:"月光如流水一般", text:"月光如流水一般，静静地泻在这一片叶子和花上。", a:"朱自清", w:"荷塘月色" },
  { l:'zh', p:'night', hl:"金黄的圆月", text:"我在朦胧中，眼前又展开一片海边碧绿的沙地来，上面深蓝的天空中挂着一轮金黄的圆月。", a:"鲁迅", w:"故乡" },
  { l:'zh', p:'night', hl:"沉默是今晚的康桥", text:"悄悄是别离的笙箫；夏虫也为我沉默，沉默是今晚的康桥！", a:"徐志摩", w:"再别康桥" },
  { l:'zh', p:'night', hl:"大音希声", text:"大音希声，大象无形。", a:"老子", w:"道德经" },
  { l:'zh', p:'night', hl:"白露横江", text:"白露横江，水光接天。", a:"苏轼", w:"赤壁赋" }
];
// index mined English quotes by minute-of-day (ambiguous 12h quotes serve both AM and PM)
const QIDX = new Map();
(function () {
  QMINED.q.forEach((r, i) => {
    const [h, m, amb] = r, hs = amb ? [h % 12, h % 12 + 12] : [h];
    hs.forEach(hh => { const k = hh * 60 + m; (QIDX.get(k) || QIDX.set(k, []).get(k)).push(i); });
  });
})();
const qFromMined = i => { const r = QMINED.q[i], b = QMINED.b[r[6]] || ['', '']; return { l:'en', text:r[3], hl:r[3].substr(r[4], r[5]), a:b[1] === '?' ? '' : b[1], w:b[0] === '?' ? '' : b[0], mined:true }; };
function parseMyQuotes(txt) {
  return txt.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [tm, text, a, w] = l.split('|').map(s => s.trim()); if (!tm || !text) return null;
    const q = { l:'any', text, a:a || '', w:w || '', mine:true };
    if (/^(\*|\d{1,2}):\d{2}$/.test(tm)) { const [h, m] = tm.split(':'); q.t = [(h === '*' ? '*' : h.padStart(2, '0')) + ':' + m]; q.p = ''; }
    else q.p = tm === 'any' ? PERIODS.join(' ') : tm.toLowerCase();
    return q;
  }).filter(Boolean);
}
const hash = n => { n = Math.imul(n ^ 61 ^ (n >>> 16), 9) >>> 0; n = Math.imul(n ^ (n >>> 4), 0x27d4eb2d) >>> 0; return (n ^ (n >>> 15)) >>> 0; };
const NEAR_MAX = 8;
const inRange = (m, a, b) => a <= b ? (m >= a && m < b) : (m >= a || m < b);
/* Which quote for this minute.
   1. A quote that names this very minute, if there is one. 2. Otherwise one that names a minute close by, never more than NEAR_MAX away,
   chosen from all of them (the nearer, the likelier) rather than always the nearest, so neighbouring minutes do not show the same line.
   3. Otherwise a poem for the time of day. At every step lines you have seen lately (the last QSEEN_MAX, kept on this device) count for far
   less, so the clock rotates through the whole pool before it repeats (a seen line has a fiftieth of the chance of an unseen one). The pick for a minute is remembered, so redrawing the page
   inside that minute (a language change, a click elsewhere) does not change it, and only "another quote" does. */
const QSEEN_MAX = 400, QSEEN = { ids:jsonStore('vmm.qseen', []), has(id) { return this.ids.includes(id); }, add(id) { if (!id || this.ids[this.ids.length - 1] === id) return; this.ids.push(id); if (this.ids.length > QSEEN_MAX) this.ids.shift(); store.set('vmm.qseen', JSON.stringify(this.ids)); } };
let QCUR = { key:'', res:null };
function qChoose(items, seed, idOf, distOf) {
  const ws = items.map(x => (QSEEN.has(idOf(x)) ? .02 : 1) / (1 + (distOf ? distOf(x) : 0))), tot = ws.reduce((a, b) => a + b, 0); let r = (hash(seed) % 100000) / 100000 * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1];
}
function pickQuote(now, bump) {
  const hh = now.getHours(), mm = now.getMinutes(), mod = hh * 60 + mm, per = periodOf(hh);
  const day = now.getFullYear() * 400 + now.getMonth() * 31 + now.getDate();
  const seed = hash(day * 1440 + mod + bump * 7919);
  const mine = parseMyQuotes(prefs.myq), hs = String(hh).padStart(2, '0'), ms = String(mm).padStart(2, '0');
  // One language per draw. "Both" keeps the interface language in the majority (about 7 of 10) so the page never reads as a jumble.
  const ql = quoteLang(seed), useEn = ql === 'en', key = [day, mod, bump, ql, prefs.myq && prefs.myq.length].join('|');
  if (QCUR.key === key && QCUR.res) return QCUR.res;
  const done = res => { QCUR = { key, res }; QSEEN.add(res.q.id); return res; };
  const exactMine = mine.filter(q => (q.t || []).some(x => x === hs + ':' + ms || x === '*:' + ms));
  const poemExact = POEMS.filter(q => q.l === ql && (q.t || []).some(x => x === hs + ':' + ms));
  if (exactMine.length && !bump) return done({ q:{ ...qChoose(exactMine, seed, q => 'm' + q.text.slice(0, 24)), id:'m' }, exact:true });
  if (useEn) {
    const ex = QIDX.get(mod) || [];
    if (ex.length) { const i = qChoose(ex, seed, i => 'e' + i); return done({ q:{ ...qFromMined(i), id:'e' + i }, exact:true }); }
  }
  if (poemExact.length && !bump) { const p = qChoose(poemExact, seed, p => 'p' + POEMS.indexOf(p)); return done({ q:{ ...p, id:'p' + POEMS.indexOf(p) }, exact:true }); }
  if (useEn) {
    const near = []; for (let d = 1; d <= NEAR_MAX; d++) [(mod + d) % 1440, (mod - d + 1440) % 1440].forEach(k => (QIDX.get(k) || []).forEach(i => near.push({ i, d })));
    if (near.length) {
      const c = qChoose(near, seed, c => 'e' + c.i, c => c.d), r = QMINED.q[c.i], at = String(r[2] ? (hh >= 12 ? r[0] % 12 + 12 : r[0] % 12) : r[0]).padStart(2, '0') + ':' + String(r[1]).padStart(2, '0');
      return done({ q:{ ...qFromMined(c.i), id:'e' + c.i }, exact:false, near:true, nearT:at });
    }
  }
  const pool = (POEMS.some(q => q.l === ql) ? POEMS.filter(q => q.l === ql) : POEMS.filter(q => q.l === 'en')).concat(mine.filter(q => (q.p || '').split(' ').includes(per)));
  const by = pool.filter(q => (q.p || '').split(' ').includes(per));
  const zhPool = ql === 'zh' ? QZH_MINED.map((r, i) => [r, i]).filter(([r]) => inRange(mod, r[0], r[1])).map(([r, i]) => ({ l:'zh', text:r[2], hl:r[3], a:r[4], w:r[5], tag:r[6], mined:true, id:'z' + i })) : [];
  const cand = zhPool.length && (seed % 5 < 3 || !by.length) ? zhPool : (by.length ? by : pool), q = qChoose(cand, seed, q => q.id || 'p' + POEMS.indexOf(q));
  return done({ q:q.id ? q : { ...q, id:'p' + POEMS.indexOf(q) }, exact:false });
}
function quoteCoverage() {
  let en = 0, near = 0; for (let m = 0; m < 1440; m++) { if (QIDX.has(m)) { en++; near++; continue; } for (let d = 1; d <= NEAR_MAX; d++) if (QIDX.has((m + d) % 1440) || QIDX.has((m - d + 1440) % 1440)) { near++; break; } }
  return { en, near, total:QMINED.q.length, books:new Set(QMINED.q.map(r => r[6])).size };
}

