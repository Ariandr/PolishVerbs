import { readFile, writeFile } from 'fs/promises';

const updates = [
{"id":"011-pomoc", "pl":"Czy możesz mi pomóc wniesieniu tych ciężkich toreb?", "en":"Can you help me carry these heavy bags upstairs?", "uk":"Ти можеш допомогти мені підняти ці важкі сумки?"},
{"id":"012-zyc", "pl":"Moi dziadkowie całe życie żyli w małej wiosce w górach.", "en":"My grandparents lived their whole lives in a small mountain village.", "uk":"Мої дідусь і бабуся все життя жили в маленькому селі в горах."},
{"id":"013-dac", "pl":"Daj mi chwilę, muszę się zastanowić nad twoją propozycją.", "en":"Give me a moment, I need to think about your proposal.", "uk":"Дай мені хвилинку, мені треба подумати над твоєю пропозицією."},
{"id":"014-isc", "pl":"Jest już późno, chyba powinniśmy iść do domu.", "en":"It's already late, I think we should go home.", "uk":"Вже пізно, мабуть, нам час іти додому."},
{"id":"015-liczyc", "pl":"Możesz na mnie liczyć w każdej sytuacji.", "en":"You can count on me in any situation.", "uk":"Ти можеш розраховувати на мене в будь-якій ситуації."},
{"id":"016-stac", "pl":"Co się tutaj w ogóle stało podczas mojej nieobecności?", "en":"What actually happened here during my absence?", "uk":"Що взагалі тут сталося під час моєї відсутності?"},
{"id":"017-zmienic", "pl":"Zdecydowałem się całkowicie zmienić swoje dotychczasowe życie.", "en":"I've decided to completely change my life so far.", "uk":"Я вирішив повністю змінити своє дотеперішнє життя."},
{"id":"018-zrozumiec", "pl":"Czasami trudno jest zrozumieć zachowanie drugiego człowieka.", "en":"Sometimes it is difficult to understand another person's behavior.", "uk":"Іноді важко зрозуміти поведінку іншої людини."},
{"id":"019-szukac", "pl":"Od pół godziny szukam kluczyków do samochodu i nigdzie ich nie ma.", "en":"I've been looking for my car keys for half an hour and they are nowhere to be found.", "uk":"Я вже півгодини шукаю ключі від машини, і їх ніде немає."},
{"id":"020-kupic", "pl":"Muszę dzisiaj kupić świeży chleb i mleko w sklepie na rogu.", "en":"I need to buy fresh bread and milk at the corner store today.", "uk":"Мені сьогодні потрібно купити свіжий хліб і молоко в магазині на розі."},
{"id":"021-wrocic", "pl":"Kiedy planujesz wrócić z wakacji do pracy?", "en":"When are you planning to return to work from your vacation?", "uk":"Коли ти плануєш повернутися з відпустки на роботу?"},
{"id":"022-wziac", "pl":"Nie zapomnij wziąć ze sobą parasola, bo zanosi się na deszcz.", "en":"Don't forget to take an umbrella with you, because it looks like rain.", "uk":"Не забудь взяти з собою парасольку, бо збирається на дощ."},
{"id":"023-pracowac", "pl":"Od pięciu lat pracuję jako programista w tej samej firmie.", "en":"I have been working as a programmer in the same company for five years.", "uk":"Я вже п'ять років працюю програмістом у тій самій компанії."},
{"id":"024-pamietac", "pl":"Niestety nie pamiętam dokładnej daty naszych pierwszych urodzin.", "en":"Unfortunately, I don't remember the exact date of our first birthday.", "uk":"На жаль, я не пам'ятаю точної дати нашого першого дня народження."},
{"id":"025-myslec", "pl":"Co o tym wszystkim myślisz? Moim zdaniem to zły pomysł.", "en":"What do you think about all this? In my opinion, it's a bad idea.", "uk":"Що ти про все це думаєш? На мою думку, це погана ідея."},
{"id":"026-rozmawiac", "pl":"Wczoraj przez dwie godziny rozmawiałem z przyjacielem przez telefon.", "en":"Yesterday I talked with a friend on the phone for two hours.", "uk":"Вчора я дві години розмовляв з другом по телефону."},
{"id":"027-pokazac", "pl":"Czy możesz mi pokazać drogę na najbliższy dworzec kolejowy?", "en":"Can you show me the way to the nearest train station?", "uk":"Ти можеш показати мені дорогу до найближчого залізничного вокзалу?"},
{"id":"028-sprawdzic", "pl":"Przed wyjazdem musimy dokładnie sprawdzić rezerwację hotelu.", "en":"Before leaving, we must carefully check the hotel reservation.", "uk":"Перед від'їздом ми повинні уважно перевірити бронювання готелю."},
{"id":"029-wyjsc", "pl":"Kiedy możemy wyjść na spacer do parku?", "en":"When can we go out for a walk in the park?", "uk":"Коли ми можемо вийти на прогулянку в парк?"},
{"id":"030-poznac", "pl":"Chciałbym wreszcie poznać twoich rodziców.", "en":"I would like to finally meet your parents.", "uk":"Я хотів би нарешті познайомитися з твоїми батьками."},
{"id":"031-czekac", "pl":"Nie lubię czekać w długich kolejkach do kasy.", "en":"I don't like waiting in long lines at the checkout.", "uk":"Я не люблю чекати в довгих чергах до каси."},
{"id":"032-przyznac", "pl":"Muszę przyznać, że ta zupa jest wyjątkowo smaczna.", "en":"I must admit that this soup is exceptionally tasty.", "uk":"Мушу визнати, що цей суп надзвичайно смачний."},
{"id":"033-uznac", "pl":"Sąd postanowił uznać oskarżonego za winnego.", "en":"The court decided to find the defendant guilty.", "uk":"Суд вирішив визнати обвинуваченого винним."},
{"id":"034-prowadzic", "pl":"Uważaj, bo w nocy trudno się prowadzi samochód w czasie mgły.", "en":"Be careful, because it is difficult to drive a car at night in the fog.", "uk":"Будь обережний, бо вночі важко вести машину в туман."},
{"id":"035-wejsc", "pl":"Proszę zdjąć buty, zanim zdecydujesz się wejść do mieszkania.", "en":"Please take off your shoes before you decide to go inside the apartment.", "uk":"Будь ласка, зніми взуття, перш ніж вирішиш зайти в квартиру."},
{"id":"036-zaczac", "pl":"Kiedy zamierzasz zacząć pisać swoją nową książkę?", "en":"When do you intend to start writing your new book?", "uk":"Коли ти збираєшся почати писати свою нову книгу?"},
{"id":"037-spotkac", "pl":"Gdzie możemy się jutro spotkać na kawę?", "en":"Where can we meet for coffee tomorrow?", "uk":"Де ми можемо зустрітися завтра на каву?"},
{"id":"038-dostac", "pl":"Bardzo bym chciał dostać nowy rower na urodziny.", "en":"I would really like to get a new bike for my birthday.", "uk":"Я б дуже хотів отримати новий велосипед на день народження."},
{"id":"039-patrzec", "pl":"Nie lubię, kiedy ktoś z ukrycia patrzy mi na ręce.", "en":"I don't like it when someone watches my hands from hiding.", "uk":"Я не люблю, коли хтось із-за спини дивиться мені на руки."},
{"id":"040-walczyc", "pl":"Zawsze warto walczyć o swoje marzenia i przekonania.", "en":"It's always worth fighting for your dreams and beliefs.", "uk":"Завжди варто боротися за свої мрії та переконання."},
{"id":"041-przekonac", "pl":"Jak mam cię przekonać, że mówię szczerą prawdę?", "en":"How am I to convince you that I'm telling the honest truth?", "uk":"Як мені переконати тебе, що я говорю щиру правду?"},
{"id":"042-pisac", "pl":"Codziennie staram się pisać kilka stron mojego dziennika.", "en":"Every day I try to write a few pages of my diary.", "uk":"Щодня я намагаюся писати кілька сторінок свого щоденника."},
{"id":"043-dzialac", "pl":"Mój stary komputer przestał nagle działać podczas pracy.", "en":"My old computer suddenly stopped working while I was working.", "uk":"Мій старий комп'ютер раптом перестав працювати під час роботи."},
{"id":"044-zachowac", "pl":"W tej trudnej sytuacji musisz koniecznie zachować spokój.", "en":"In this difficult situation you must absolutely keep calm.", "uk":"У цій складній ситуації ти обов'язково повинен зберігати спокій."},
{"id":"045-spac", "pl":"Wczoraj poszedłem wcześnie spać, bo byłem bardzo zmęczony.", "en":"Yesterday I went to sleep early because I was very tired.", "uk":"Вчора я рано ліг спати, бо був дуже втомлений."},
{"id":"046-przyjac", "pl":"Z radością zdecydowaliśmy się przyjąć wasze zaproszenie na ślub.", "en":"We joyfully decided to accept your wedding invitation.", "uk":"Ми з радістю вирішили прийняти ваше запрошення на весілля."},
{"id":"047-pojsc", "pl":"Musimy koniecznie pójść do tamtej nowej restauracji w centrum.", "en":"We absolutely must go to that new restaurant downtown.", "uk":"Ми обов'язково повинні піти в той новий ресторан у центрі."},
{"id":"048-przejsc", "pl":"Uważaj, żeby bezpiecznie przejść przez to ruchliwe skrzyżowanie.", "en":"Be careful to cross this busy intersection safely.", "uk":"Будь обережний, щоб безпечно перейти через це жваве перехрестя."},
{"id":"049-wykorzystac", "pl":"Powinieneś wykorzystać tę wspaniałą okazję i pojechać za granicę.", "en":"You should use this wonderful opportunity and go abroad.", "uk":"Ти повинен використа́ти цю чудову можливість і поїхати за кордон."},
{"id":"050-dowiedziec", "pl":"Kiedy będziemy mogli dowiedzieć się, kto wygrał ten konkurs?", "en":"When will we be able to find out who won this contest?", "uk":"Коли ми зможемо дізнатися, хто виграв цей конкурс?"}
];

async function run() {
  const file = 'src/data/verbs/001-100.json';
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const item of data) {
    const update = updates.find(u => u.id === item.id);
    if (update) {
      item.examples = [{
        pl: update.pl,
        en: update.en,
        uk: update.uk
      }];
    }
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
run();
