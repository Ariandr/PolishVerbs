import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const verbsDir = path.join(rootDir, 'src/data/verbs')

const translationPatches = new Map(
  Object.entries({
    192: {
      en: ['to use', 'to use up', 'to abuse'],
    },
    245: {
      en: ['to resign', 'to give up', 'to quit'],
    },
    407: {
      en: ['to establish', 'to refer to', 'to make contact'],
    },
    808: {
      en: ['to focus', 'to concentrate'],
      uk: ['зосередитися', 'сконцентруватися'],
    },
    1050: {
      en: ['to give', 'to donate', 'to let go'],
    },
    1056: {
      en: ['to establish', 'to refer to', 'to make contact'],
    },
    1246: {
      en: ['to give as a gift', 'to donate', 'to forgive'],
    },
    1278: {
      en: ['to lower', 'to let down', 'to release'],
      uk: ['опустити', 'спустити', 'випустити'],
    },
    1304: {
      en: ['to find out', 'to get to the bottom of', 'to investigate'],
    },
    1440: {
      en: ['to buy more', 'to buy extra', 'to draw another card'],
    },
    1448: {
      en: ['to photograph', 'to take pictures of'],
    },
    1571: {
      en: ['to push through', 'to force through'],
    },
    1584: {
      en: ['to photograph', 'to take a picture of'],
    },
    1829: {
      en: ['to water', 'to pour over'],
      uk: ['поливати', 'зрошувати'],
    },
    2209: {
      en: ['to approve', 'to confirm', 'to validate'],
    },
    2386: {
      en: ['to distance', 'to pull ahead of', 'to set apart'],
      uk: ['віддалити', 'дистанціювати', 'випередити'],
    },
    2431: {
      en: ['to keep an eye on', 'to watch over', 'to make sure'],
    },
    2519: {
      en: ['to export', 'to sell abroad'],
    },
    2797: {
      uk: ['погнати', 'підганяти', 'прогнати'],
    },
    2937: {
      en: ['to identify', 'to check ID', 'to legitimize'],
    },
    3664: {
      en: ['to stress', 'to accent', 'to emphasize'],
    },
    3786: {
      en: ['to occupy', 'to pay off', 'to redeem'],
    },
    4221: {
      en: ['to let through', 'to miss', 'to filter'],
    },
  }).map(([rank, patch]) => [Number(rank), patch])
)

const examplePatches = new Map(
  Object.entries({
    5: {
      pl: 'Mówisz trochę za szybko, więc proszę cię o wolniejsze tempo.',
      en: 'You are speaking a little too fast, so I’m asking you to slow down.',
      uk: 'Ти говориш трохи занадто швидко, тому я прошу тебе говорити повільніше.',
    },
    13: {
      pl: 'Damy ci chwilę, żeby spokojnie przemyśleć propozycję.',
      en: 'We will give you a moment to calmly think over the proposal.',
      uk: 'Ми дамо тобі хвилину, щоб спокійно обдумати пропозицію.',
    },
    225: {
      pl: 'Trudno przestać myśleć o tej rozmowie.',
      en: 'It is hard to stop thinking about that conversation.',
      uk: 'Важко перестати думати про цю розмову.',
    },
    271: {
      pl: 'Zawsze wolała kupować świeże warzywa na lokalnym targu.',
      en: 'She always preferred buying fresh vegetables at the local market.',
      uk: 'Вона завжди воліла купувати свіжі овочі на місцевому ринку.',
    },
    318: {
      pl: 'Proszę nie dotknąć eksponatów w tej części muzeum.',
      en: 'Please do not touch the exhibits in this part of the museum.',
      uk: 'Будь ласка, не торкайтеся експонатів у цій частині музею.',
    },
    499: {
      pl: 'Podczas spaceru udało mi się przebić piłkę na ostrym kamieniu.',
      en: 'During the walk I managed to puncture the ball on a sharp stone.',
      uk: 'Під час прогулянки мені вдалося пробити м’яч об гострий камінь.',
    },
    515: {
      pl: 'Nie musisz mnie dłużej przekonywać, bo już się zgodziłem.',
      en: 'You do not have to keep convincing me because I have already agreed.',
      uk: 'Тобі більше не треба мене переконувати, бо я вже погодився.',
    },
    546: {
      pl: 'Rząd zaplanował zlikwidować kilka niepotrzebnych agencji.',
      en: 'The government planned to eliminate several unnecessary agencies.',
      uk: 'Уряд запланував ліквідувати кілька непотрібних агентств.',
    },
    588: {
      pl: 'Matka bała się puścić rękę dziecka w dużym tłumie.',
      en: 'The mother was afraid to let go of the child’s hand in a large crowd.',
      uk: 'Мати боялася відпустити руку дитини у великому натовпі.',
    },
    618: {
      pl: 'Program potrafi szybko wyeliminować większość zagrożeń.',
      en: 'The program can quickly eliminate most threats.',
      uk: 'Програма здатна швидко усунути більшість загроз.',
    },
    627: {
      pl: 'Biolodzy mogli z bliska zaobserwować rzadkie zachowanie zwierzęcia.',
      en: 'The biologists were able to observe the animal’s rare behavior up close.',
      uk: 'Біологи змогли зблизька спостерігати рідкісну поведінку тварини.',
    },
    643: {
      pl: 'Po imprezie musiałem ogarnąć bałagan w salonie.',
      en: 'After the party I had to sort out the mess in the living room.',
      uk: 'Після вечірки мені довелося прибрати безлад у вітальні.',
    },
    649: {
      pl: 'Strażacy starali się szybko oczyścić drogę po burzy.',
      en: 'Firefighters tried to quickly clear the road after the storm.',
      uk: 'Пожежники намагалися швидко розчистити дорогу після бурі.',
    },
    712: {
      pl: 'Oszczędności powinny pokryć koszty naszego wesela.',
      en: 'The savings should cover the cost of our wedding.',
      uk: 'Заощадження мають покрити витрати на наше весілля.',
    },
    720: {
      pl: 'Prawnik musiał zweryfikować wszystkie klauzule umowy.',
      en: 'The lawyer had to verify all clauses of the contract.',
      uk: 'Юрист мусив перевірити всі пункти договору.',
    },
    735: {
      pl: 'Pies uwielbiał kopać głębokie doły w ogrodzie.',
      en: 'The dog loved digging deep holes in the garden.',
      uk: 'Собака обожнював копати глибокі ями в саду.',
    },
    736: {
      pl: 'Musimy dokładnie zaplanować całą podróż.',
      en: 'We need to plan the whole trip carefully.',
      uk: 'Нам потрібно ретельно спланувати всю подорож.',
    },
    767: {
      pl: 'Światło latarki mogło odbić się od powierzchni jeziora.',
      en: 'The flashlight beam could reflect off the surface of the lake.',
      uk: 'Світло ліхтарика могло відбитися від поверхні озера.',
    },
    798: {
      pl: 'Niedźwiedź mógł zaatakować turystów w lesie.',
      en: 'The bear could attack tourists in the forest.',
      uk: 'Ведмідь міг напасти на туристів у лісі.',
    },
    799: {
      pl: 'Umowa musi jasno określać warunki naszej współpracy.',
      en: 'The contract must clearly define the terms of our cooperation.',
      uk: 'Договір має чітко визначати умови нашої співпраці.',
    },
    843: {
      pl: 'W okolicy zaczęły powstawać nowe domy.',
      en: 'New houses began to appear in the area.',
      uk: 'У районі почали з’являтися нові будинки.',
    },
    867: {
      pl: 'Przed balem musimy się szybko przebrać za piratów.',
      en: 'Before the party we have to quickly dress up as pirates.',
      uk: 'Перед балом нам треба швидко переодягнутися в піратів.',
    },
    869: {
      pl: 'Chciał pocałować dziewczynę w policzek po pierwszej randce.',
      en: 'He wanted to kiss the girl on the cheek after their first date.',
      uk: 'Він хотів поцілувати дівчину в щоку після першого побачення.',
    },
    870: {
      pl: 'Porywacz próbował porwać dziecko sprzed szkoły.',
      en: 'The kidnapper tried to abduct a child from outside the school.',
      uk: 'Викрадач намагався викрасти дитину біля школи.',
    },
    884: {
      pl: 'Profesor poprosił studentów, aby spróbowali zdefiniować to pojęcie.',
      en: 'The professor asked the students to try to define the concept.',
      uk: 'Професор попросив студентів спробувати визначити це поняття.',
    },
    892: {
      pl: 'Robotnicy musieli rozebrać starą szopę w ogrodzie.',
      en: 'The workers had to dismantle the old shed in the garden.',
      uk: 'Робітникам довелося розібрати стару повітку в саду.',
    },
    895: {
      pl: 'Prawnik negocjował warunki nowego kontraktu przez całe popołudnie.',
      en: 'The lawyer negotiated the terms of the new contract all afternoon.',
      uk: 'Юрист увесь пообідній час узгоджував умови нового контракту.',
    },
    899: {
      pl: 'Ten film potrafił wywoływać lęk nawet u dorosłych widzów.',
      en: 'That film could cause fear even in adult viewers.',
      uk: 'Цей фільм міг викликати страх навіть у дорослих глядачів.',
    },
    900: {
      pl: 'Po chorobie uczeń szybko nadrobił zaległości z matematyki.',
      en: 'After being ill, the student quickly caught up on his math work.',
      uk: 'Після хвороби учень швидко надолужив пропущене з математики.',
    },
    1082: {
      pl: 'Egzamin może wypaść lepiej, niż się spodziewasz.',
      en: 'The exam may turn out better than you expect.',
      uk: 'Іспит може пройти краще, ніж ти очікуєш.',
    },
    1307: {
      pl: 'Nie lubię podpisywać dokumentów bez dokładnego czytania.',
      en: 'I do not like signing documents without reading them carefully.',
      uk: 'Я не люблю підписувати документи без уважного читання.',
    },
    1547: {
      pl: 'Łudzisz się, jeśli myślisz, że problem sam zniknie.',
      en: 'You are deluding yourself if you think the problem will disappear on its own.',
      uk: 'Ти тішиш себе ілюзіями, якщо думаєш, що проблема зникне сама.',
    },
    1560: {
      pl: 'Ta książka potrafi wywrzeć na czytelniku ogromne wrażenie.',
      en: 'That book can make a huge impression on the reader.',
      uk: 'Ця книжка може справити на читача величезне враження.',
    },
    1727: {
      pl: 'Dzieci lubią drzeć papier na małe kawałki do pracy plastycznej.',
      en: 'Children like tearing paper into small pieces for an art project.',
      uk: 'Діти люблять рвати папір на маленькі шматочки для творчої роботи.',
    },
    1888: {
      pl: 'Wsunął klucz do kieszeni płaszcza i wyszedł.',
      en: 'He slipped the key into his coat pocket and left.',
      uk: 'Він засунув ключ у кишеню пальта й вийшов.',
    },
    1921: {
      pl: 'Organizacja konferencji może przypaść w tym roku naszemu zespołowi.',
      en: 'The organization of the conference may fall to our team this year.',
      uk: 'Організація конференції цього року може випасти нашій команді.',
    },
    2467: {
      pl: 'Po deszczu trzeba otrzeć buty o wycieraczkę przy wejściu.',
      en: 'After the rain, you need to wipe your shoes on the doormat by the entrance.',
      uk: 'Після дощу треба витерти взуття об килимок біля входу.',
    },
    2896: {
      pl: 'Mimo silnego wiatru łódź musiała przeć naprzód.',
      en: 'Despite the strong wind, the boat had to push forward.',
      uk: 'Попри сильний вітер човен мусив просуватися вперед.',
    },
    2930: {
      pl: 'Różne grupy etniczne zaczęły zamieszkiwać ten region wiele wieków temu.',
      en: 'Various ethnic groups began to inhabit this region many centuries ago.',
      uk: 'Різні етнічні групи почали заселяти цей регіон багато століть тому.',
    },
    2972: {
      pl: 'To stanowisko powinno przynależeć do działu finansowego.',
      en: 'This position should belong to the finance department.',
      uk: 'Ця посада має належати до фінансового відділу.',
    },
  }).map(([rank, example]) => [Number(rank), example])
)

async function main() {
  const files = (await readdir(verbsDir))
    .filter((file) => file.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

  let changed = 0
  for (const file of files) {
    const filePath = path.join(verbsDir, file)
    const records = JSON.parse(await readFile(filePath, 'utf8'))
    let fileChanged = false

    for (const verb of records) {
      const translationPatch = translationPatches.get(verb.frequencyRank)
      if (translationPatch) {
        if (translationPatch.en) verb.translations.en = translationPatch.en
        if (translationPatch.uk) verb.translations.uk = translationPatch.uk
        changed += 1
        fileChanged = true
      }

      const examplePatch = examplePatches.get(verb.frequencyRank)
      if (examplePatch) {
        verb.examples = [examplePatch]
        changed += 1
        fileChanged = true
      }
    }

    if (fileChanged) {
      await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
    }
  }

  console.log(`Applied ${changed} targeted translation/example repair(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
