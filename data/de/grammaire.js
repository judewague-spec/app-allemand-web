/* Grammaire (SPEC section 2) : 20 règles, de A1 à B1, dans l'ordre de la section 2.
   D.regles    : fiches {id: 'gram-07', niveau, titre_fr, titre_de, explication_fr, formule_de,
                 exemples: [{de, fr, vocabulaire: [ids des mots de la section 1 réutilisés]}, …], controle}
   D.grammaire : exercices {id: 'gram-07-01', regle: 'gram-07', phrase (un seul « ___ »), choix: [4 formes], reponse, fr}
   Dans ce fichier, la bonne réponse est écrite en premier dans « choix » ; le moteur mélange les choix à l'affichage.
   « fr » traduit la phrase complète ; il s'affiche après la réponse, avec la fiche de la règle.
   Contrôle : node outils/controle-grammaire.js controler (voir ce fichier). */
(function (root) {
  'use strict';
  const D = root.DONNEES;

  const regle = (id, niveau, titre_fr, titre_de, formule_de, explication_fr, exemples) =>
    ({ id, niveau, titre_fr, titre_de, explication_fr, formule_de, exemples, controle: 'controle/cache/' + id + '.json' });
  const exemple = (de, fr, vocabulaire) => ({ de, fr, vocabulaire });
  const exercice = (regle, n, phrase, choix, fr) =>
    ({ id: regle + '-' + String(n).padStart(2, '0'), regle, phrase, choix, reponse: choix[0], fr });

  D.regles.push(
    regle('gram-01', 'A1', 'L’ordre des mots : le verbe en deuxième position', 'Wortstellung: das Verb auf Position 2',
      'Aussagesatz: Position 1 – Verb – Rest',
      'Dans une phrase affirmative, le verbe conjugué est toujours le deuxième élément. Le premier élément peut être le sujet, mais aussi un moment ou un lieu (heute, im Restaurant). Dans ce cas, le sujet passe juste après le verbe : Heute fahre ich.',
      [exemple('Heute fahre ich mit dem Zug.', 'Aujourd’hui, je prends le train.', ['deplacer-090', 'deplacer-001']),
        exemple('Am Abend trinkt mein Vater einen Tee.', 'Le soir, mon père boit un thé.', ['resto-075', 'presenter-039', 'resto-037'])]),
    regle('gram-02', 'A1', 'La majuscule des noms', 'Großschreibung der Nomen',
      'Nomen groß: der Tisch, das Essen',
      'En allemand, tous les noms prennent une majuscule, où qu’ils soient dans la phrase : der Tisch, die Liebe. Un verbe employé comme nom en prend une aussi : das Essen (le repas). Les verbes, les adjectifs et les adverbes s’écrivent en général en minuscules, sauf en début de phrase.',
      [exemple('Die Kellnerin bringt das Essen.', 'La serveuse apporte le repas.', ['resto-007', 'resto-078', 'resto-016']),
        exemple('Wir kaufen frisches Brot und leckeren Kuchen.', 'Nous achetons du pain frais et du bon gâteau.', ['courses-104', 'resto-097', 'resto-026', 'resto-031'])]),
    regle('gram-03', 'A1', 'Le genre et les articles', 'Genus und Artikel',
      'der / die / das – ein / eine / ein',
      'Chaque nom a un genre : masculin, féminin ou neutre. L’article défini est der (masculin), die (féminin) ou das (neutre) ; l’article indéfini est ein, eine, ein. Le genre ne suit pas toujours le français : das Mädchen (la fille) est neutre. Apprends donc chaque nom avec son article.',
      [exemple('Der Löffel, die Gabel und das Messer liegen auf dem Tisch.', 'La cuillère, la fourchette et le couteau sont sur la table.', ['resto-046', 'resto-045', 'resto-044', 'resto-003']),
        exemple('Das ist ein Hund, und das ist eine Katze.', 'C’est un chien, et c’est un chat.', ['agriculture-050', 'agriculture-051'])]),
    regle('gram-04', 'A1', 'Le pluriel des noms', 'Plural der Nomen',
      'Plural: die Tische, die Frauen, die Kinder, die Autos',
      'Au pluriel, l’article défini est die pour les trois genres, au nominatif comme à l’accusatif (au datif, il devient den : voir la règle 12). La terminaison du pluriel varie : -e (die Tische), -n ou -en (die Frauen), -er (die Kinder), -s (die Autos), ou rien (die Lehrer). Elle s’accompagne parfois d’un Umlaut : der Apfel, die Äpfel. Les noms en -in font -innen : die Lehrerin, die Lehrerinnen. Apprends le pluriel avec le nom.',
      [exemple('Die Kinder essen gern Äpfel und Bananen.', 'Les enfants aiment manger des pommes et des bananes.', ['presenter-009', 'resto-074', 'resto-032', 'courses-057']),
        exemple('Im Dorf gibt es zwei Bäckereien.', 'Dans le village, il y a deux boulangeries.', ['agriculture-015', 'courses-005'])]),
    regle('gram-05', 'A1', 'Les pronoms personnels', 'Personalpronomen',
      'ich, du, er / sie / es, wir, ihr, sie / Sie',
      'Le pronom remplace un nom et prend le genre du nom allemand : der Bahnhof devient er, die Tasche devient sie, das Auto devient es. sie veut dire elle, ou ils et elles au pluriel ; du, c’est tu ; ihr, c’est vous quand on tutoie plusieurs personnes ; Sie, avec une majuscule, c’est le vous de politesse. Le verbe s’accorde avec le pronom : ich spreche, du sprichst.',
      [exemple('Wo ist meine Tasche? – Sie ist im Auto.', 'Où est mon sac ? – Il est dans la voiture.', ['deplacer-028', 'deplacer-007']),
        exemple('Kennst du Paul? – Ja, er ist mein Nachbar.', 'Tu connais Paul ? – Oui, c’est mon voisin.', ['presenter-064', 'presenter-031'])]),
  );

  D.grammaire.push(
    exercice('gram-01', 1, 'Morgen ___ nach Berlin.', ['fahre ich', 'ich fahre', 'ich fahren', 'fahren ich'], 'Demain, je vais à Berlin.'),
    exercice('gram-01', 2, 'Am Wochenende ___ ein Fahrrad.', ['mietet mein Bruder', 'mein Bruder mietet', 'mieten mein Bruder', 'mein Bruder mieten'], 'Le week-end, mon frère loue un vélo.'),
    exercice('gram-01', 3, 'Im Restaurant ___ die Rechnung.', ['bezahlt der Gast', 'der Gast bezahlt', 'bezahlen der Gast', 'der Gast bezahlen'], 'Au restaurant, le client paie l’addition.'),
    exercice('gram-01', 4, 'Meine Schwester ___ in Hamburg.', ['wohnt jetzt', 'jetzt wohnt', 'wohnen jetzt', 'jetzt wohnen'], 'Ma sœur habite maintenant à Hambourg.'),
    exercice('gram-01', 5, 'Jeden Morgen ___ einen Kaffee.', ['trinkt meine Mutter', 'meine Mutter trinkt', 'trinken meine Mutter', 'meine Mutter trinken'], 'Chaque matin, ma mère boit un café.'),
    exercice('gram-01', 6, 'Nach der Schule ___ im Park.', ['spielen die Kinder', 'die Kinder spielen', 'spielt die Kinder', 'die Kinder spielt'], 'Après l’école, les enfants jouent au parc.'),

    exercice('gram-02', 1, 'Ich kaufe ___ im Supermarkt.', ['frisches Brot', 'Frisches brot', 'frisches brot', 'Frisches Brot'], 'J’achète du pain frais au supermarché.'),
    exercice('gram-02', 2, 'Wir trinken ___.', ['kaltes Wasser', 'Kaltes wasser', 'kaltes wasser', 'Kaltes Wasser'], 'Nous buvons de l’eau froide.'),
    exercice('gram-02', 3, 'Mein Bruder ___ gern.', ['kocht', 'Kocht', 'Koch', 'koch'], 'Mon frère aime cuisiner.'),
    exercice('gram-02', 4, 'Das ___ schmeckt sehr gut.', ['Essen', 'essen', 'Essens', 'essens'], 'Le repas est très bon.'),
    exercice('gram-02', 5, 'Meine Tochter hat ein rotes ___.', ['Kleid', 'kleid', 'Kleider', 'kleider'], 'Ma fille a une robe rouge.'),
    exercice('gram-02', 6, 'Im ___ fahren wir ans Meer.', ['Sommer', 'sommer', 'Sommers', 'sommers'], 'En été, nous allons à la mer.'),

    exercice('gram-03', 1, '___ Tisch ist neu.', ['Der', 'Die', 'Das', 'Den'], 'La table est neuve.'),
    exercice('gram-03', 2, '___ Mädchen spielt im Garten.', ['Das', 'Die', 'Der', 'Den'], 'La fille joue dans le jardin.'),
    exercice('gram-03', 3, '___ Rechnung ist hoch.', ['Die', 'Der', 'Das', 'Den'], 'L’addition est élevée.'),
    exercice('gram-03', 4, 'Hier ist ___ Apotheke.', ['eine', 'ein', 'einen', 'einem'], 'Ici, il y a une pharmacie.'),
    exercice('gram-03', 5, 'Das ist ___ Fahrrad.', ['ein', 'eine', 'einen', 'einer'], 'C’est un vélo.'),
    exercice('gram-03', 6, '___ Brille liegt auf dem Tisch.', ['Die', 'Der', 'Das', 'Den'], 'Les lunettes sont sur la table.'),

    exercice('gram-04', 1, 'Ich habe zwei ___.', ['Kinder', 'Kinds', 'Kinde', 'Kindern'], 'J’ai deux enfants.'),
    exercice('gram-04', 2, 'Im Garten stehen drei ___.', ['Bäume', 'Baume', 'Baums', 'Bäumen'], 'Dans le jardin, il y a trois arbres.'),
    exercice('gram-04', 3, 'Wir kaufen vier ___.', ['Äpfel', 'Apfels', 'Äpfeln', 'Apfel'], 'Nous achetons quatre pommes.'),
    exercice('gram-04', 4, 'Die ___ sind sehr nett.', ['Lehrerinnen', 'Lehrerin', 'Lehrerins', 'Lehrerinen'], 'Les enseignantes sont très gentilles.'),
    exercice('gram-04', 5, 'In der Stadt gibt es viele ___.', ['Autos', 'Auto', 'Autoen', 'Autoe'], 'En ville, il y a beaucoup de voitures.'),
    exercice('gram-04', 6, 'Meine ___ wohnen in Köln.', ['Brüder', 'Bruder', 'Bruders', 'Brüdern'], 'Mes frères habitent à Cologne.'),

    exercice('gram-05', 1, 'Wo ist der Bahnhof? – ___ ist dort links.', ['Er', 'Sie', 'Es', 'Wir'], 'Où est la gare ? – Elle est là-bas, à gauche.'),
    exercice('gram-05', 2, 'Woher kommst ___?', ['du', 'ihr', 'wir', 'Sie'], 'D’où viens-tu ?'),
    exercice('gram-05', 3, '___ spreche Deutsch und Französisch.', ['Ich', 'Du', 'Er', 'Wir'], 'Je parle allemand et français.'),
    exercice('gram-05', 4, 'Anna und Paul, ___ seid sehr nett.', ['ihr', 'sie', 'wir', 'du'], 'Anna et Paul, vous êtes très gentils.'),
    exercice('gram-05', 5, 'Die Tasche ist teuer, aber ___ ist schön.', ['sie', 'er', 'ihr', 'du'], 'Le sac est cher, mais il est beau.'),
    exercice('gram-05', 6, 'Das Fahrrad ist alt. ___ ist kaputt.', ['Es', 'Er', 'Sie', 'Ihr'], 'Le vélo est vieux. Il est cassé.'),
  );

  // ---------- Règles 6 à 10 ----------

  D.regles.push(
    regle('gram-06', 'A1', 'Les articles possessifs', 'Possessivartikel',
      'mein, dein, sein, ihr, unser, euer, ihr, Ihr',
      'Le possessif dépend du possesseur : mein (à moi), dein (à toi), sein (à lui), ihr (à elle), unser (à nous), euer (à vous), ihr (à eux ou à elles), Ihr (vous de politesse). Attention : sein, c’est à lui ; ihr, c’est à elle. La terminaison suit le nom possédé, comme pour ein au singulier, et -e au pluriel : mein Bruder, meine Schwester, mein Kind, meine Eltern. Devant une terminaison, euer perd son e : eure.',
      [exemple('Meine Mutter und mein Vater wohnen in Hamburg.', 'Ma mère et mon père habitent à Hambourg.', ['presenter-040', 'presenter-039', 'presenter-055']),
        exemple('Ist das Ihr Koffer, Frau Schmidt?', 'C’est votre valise, Madame Schmidt ?', ['deplacer-026'])]),
    regle('gram-07', 'A1', 'Le nominatif et l’accusatif', 'Nominativ und Akkusativ',
      'Akkusativ: den / einen',
      'Le sujet, celui qui fait l’action, est au nominatif. Le complément d’objet direct (qui ? quoi ?) est à l’accusatif. Pour les articles, seul le masculin singulier change : der devient den, ein devient einen, kein devient keinen. Au féminin, au neutre et au pluriel, l’accusatif a la même forme que le nominatif. Les pronoms ont aussi leur accusatif : mich, dich, ihn, uns, euch ; sie, es et Sie ne changent pas à l’accusatif.',
      [exemple('Der Kellner empfiehlt den Fisch.', 'Le serveur recommande le poisson.', ['resto-006', 'resto-021']),
        exemple('Mein Bruder kauft einen Rucksack.', 'Mon frère achète un sac à dos.', ['presenter-037', 'courses-104', 'deplacer-027'])]),
    regle('gram-08', 'A1', 'La négation avec nicht et kein', 'Negation mit nicht und kein',
      'kein + Nomen; nicht oft am Satzende (Er kommt heute nicht.)',
      'kein nie un nom qui aurait ein ou pas d’article : Ich habe ein Auto devient Ich habe kein Auto. Il prend les terminaisons de ein : keine, keinen. nicht nie tout le reste : un verbe, un adjectif, un adverbe, ou un nom précédé de der, die, das ou d’un possessif. nicht se place souvent en fin de phrase, mais avant un adjectif ou un complément de lieu. Pour corriger un mot, nicht se met juste devant lui : nicht mein Bruder, mein Cousin.',
      [exemple('Wir haben kein Auto, wir fahren mit dem Bus.', 'Nous n’avons pas de voiture, nous prenons le bus.', ['deplacer-007', 'deplacer-003']),
        exemple('Der Kaffee ist nicht heiß.', 'Le café n’est pas chaud.', ['resto-036', 'resto-098'])]),
    regle('gram-09', 'A1', 'Les questions, avec et sans mot interrogatif', 'Fragen: W-Fragen und Ja/Nein-Fragen',
      'W-Wort – Verb – Subjekt? / Verb – Subjekt …?',
      'Avec un mot interrogatif (wer, was, wo, wohin, woher, wann, wie, warum), le mot interrogatif vient en premier, puis le verbe, puis le sujet s’il y en a un. Pour une question à laquelle on répond par oui ou non, la phrase commence par le verbe conjugué. wo demande le lieu où l’on est, wohin le lieu où l’on va, woher le lieu d’où l’on vient. Pour un prix, on dit Was kostet … ? ou Wie viel kostet … ?',
      [exemple('Wann fährt der Zug nach München?', 'Quand part le train pour Munich ?', ['deplacer-090', 'deplacer-001']),
        exemple('Haben Sie heute Zeit?', 'Avez-vous le temps aujourd’hui ?', ['presenter-053'])]),
    regle('gram-10', 'A1', 'Les verbes à particule séparable', 'Trennbare Verben',
      'anrufen: Ich rufe dich an.',
      'Certains verbes commencent par une particule (an, ab, auf, aus, ein, mit, um, zurück…). Quand le verbe est conjugué en première ou en deuxième position, la particule se détache et va en général à la fin de la proposition principale : einkaufen, Ich kaufe heute ein. Au participe passé (pour le passé composé, le Perfekt), ge se place entre la particule et le verbe : eingekauft.',
      [exemple('Der Zug fährt um acht Uhr ab.', 'Le train part à huit heures.', ['deplacer-001', 'deplacer-093']),
        exemple('Ich kaufe heute im Supermarkt ein.', 'Aujourd’hui, je fais les courses au supermarché.', ['courses-103', 'courses-001'])]),
  );

  D.grammaire.push(
    exercice('gram-06', 1, 'Ich heiße Paul. Das ist ___ Schwester.', ['meine', 'mein', 'meinen', 'meiner'], 'Je m’appelle Paul. C’est ma sœur.'),
    exercice('gram-06', 2, 'Maria hat einen Bruder. ___ Bruder heißt Tom.', ['Ihr', 'Sein', 'Ihre', 'Seine'], 'Maria a un frère. Son frère s’appelle Tom.'),
    exercice('gram-06', 3, 'Herr Weber ist Lehrer. ___ Frau ist Ärztin.', ['Seine', 'Sein', 'Ihr', 'Seiner'], 'M. Weber est enseignant. Sa femme est médecin.'),
    exercice('gram-06', 4, 'Wir haben ein Haus. ___ Haus ist alt.', ['Unser', 'Unsere', 'Unseren', 'Unserem'], 'Nous avons une maison. Notre maison est vieille.'),
    exercice('gram-06', 5, 'Kinder, wo sind ___ Schuhe?', ['eure', 'euer', 'euren', 'eurer'], 'Les enfants, où sont vos chaussures ?'),
    exercice('gram-06', 6, 'Frau Schmidt, ist das ___ Tasche?', ['Ihre', 'Ihr', 'Ihren', 'Ihrem'], 'Madame Schmidt, c’est votre sac ?'),

    exercice('gram-07', 1, 'Ich kaufe ___ Rucksack.', ['einen', 'ein', 'eine', 'einem'], 'J’achète un sac à dos.'),
    exercice('gram-07', 2, 'Wir besuchen ___ Großvater.', ['unseren', 'unser', 'unserem', 'unsere'], 'Nous rendons visite à notre grand-père.'),
    exercice('gram-07', 3, 'Der Kellner bringt ___ Suppe.', ['die', 'den', 'der', 'dem'], 'Le serveur apporte la soupe.'),
    exercice('gram-07', 4, '___ Arzt untersucht mich.', ['Der', 'Den', 'Dem', 'Des'], 'Le médecin m’examine.'),
    exercice('gram-07', 5, 'Hast du ___ Hund?', ['einen', 'ein', 'eine', 'einem'], 'Tu as un chien ?'),
    exercice('gram-07', 6, 'Ich nehme ___ Fisch und ein Glas Wein.', ['den', 'der', 'dem', 'des'], 'Je prends le poisson et un verre de vin.'),

    exercice('gram-08', 1, 'Ich habe ___ Auto.', ['kein', 'keine', 'keinen', 'nicht'], 'Je n’ai pas de voiture.'),
    exercice('gram-08', 2, 'Das Essen ist ___ teuer.', ['nicht', 'kein', 'keine', 'keinen'], 'Le repas n’est pas cher.'),
    exercice('gram-08', 3, 'Wir haben ___ Zeit.', ['keine', 'kein', 'keinen', 'nicht'], 'Nous n’avons pas le temps.'),
    exercice('gram-08', 4, 'Er kommt heute ___.', ['nicht', 'kein', 'keine', 'keinen'], 'Il ne vient pas aujourd’hui.'),
    exercice('gram-08', 5, 'Ich trinke ___ Kaffee.', ['keinen', 'kein', 'keine', 'keiner'], 'Je ne bois pas de café.'),
    exercice('gram-08', 6, 'Das ist ___ mein Bruder, das ist mein Cousin.', ['nicht', 'kein', 'keine', 'keinen'], 'Ce n’est pas mon frère, c’est mon cousin.'),

    exercice('gram-09', 1, '___ wohnst du? – In Berlin.', ['Wo', 'Wohin', 'Woher', 'Wann'], 'Où habites-tu ? – À Berlin.'),
    exercice('gram-09', 2, '___ kommen Sie? – Aus Frankreich.', ['Woher', 'Wo', 'Wohin', 'Wer'], 'D’où venez-vous ? – De France.'),
    exercice('gram-09', 3, '___ fährt der Zug? – Nach München.', ['Wohin', 'Wo', 'Woher', 'Wie'], 'Où va le train ? – À Munich.'),
    exercice('gram-09', 4, '___ du Geschwister?', ['Hast', 'Hat', 'Haben', 'Habt'], 'Tu as des frères et sœurs ?'),
    exercice('gram-09', 5, 'Wann ___ nach Berlin?', ['fährt der Zug', 'der Zug fährt', 'fährt den Zug', 'fahren der Zug'], 'Quand le train part-il pour Berlin ?'),
    exercice('gram-09', 6, '___ kostet das Ticket? – Zwanzig Euro.', ['Was', 'Wer', 'Wo', 'Wann'], 'Combien coûte le billet ? – Vingt euros.'),

    exercice('gram-10', 1, 'Wir ___ in Frankfurt um.', ['steigen', 'umsteigen', 'steigt', 'umsteigt'], 'Nous changeons à Francfort.'),
    exercice('gram-10', 2, 'Ich ___ dich morgen an.', ['rufe', 'anrufe', 'rufen', 'ruft'], 'Je t’appelle demain.'),
    exercice('gram-10', 3, 'Wann kommt dein Flug ___?', ['an', 'ankommt', 'kommt an', 'ankommen'], 'Quand ton vol arrive-t-il ?'),
    exercice('gram-10', 4, 'Im Supermarkt ___ wir für das Wochenende ein.', ['kaufen', 'einkaufen', 'kauft', 'einkauft'], 'Au supermarché, nous faisons les courses pour le week-end.'),
    exercice('gram-10', 5, 'Ich habe das Geschenk schon ___.', ['eingepackt', 'geeinpackt', 'einpackt', 'eingepackten'], 'J’ai déjà emballé le cadeau.'),
    exercice('gram-10', 6, 'Er ___ seine Jacke an.', ['zieht', 'anzieht', 'ziehen', 'ziehst'], 'Il met sa veste.'),
  );

  // ---------- Règles 11 à 15 ----------

  D.regles.push(
    regle('gram-11', 'A1', 'Les verbes de modalité', 'Modalverben',
      'Modalverb (Position 2) … Infinitiv (Ende)',
      'Les verbes de modalité sont können (pouvoir, savoir faire), müssen (devoir), wollen (vouloir), dürfen (avoir le droit), sollen (devoir, sur l’ordre de quelqu’un) et mögen (aimer) ; möchten (je voudrais) est une forme polie de mögen. Le verbe de modalité est conjugué en deuxième position ; l’autre verbe reste à l’infinitif, à la fin de la phrase. Au singulier, ich et er/sie/es ont la même forme, sans -t : ich kann, er kann.',
      [exemple('Kann ich mit Karte bezahlen?', 'Je peux payer par carte ?', ['courses-018', 'resto-077']),
        exemple('Du musst den Arzt anrufen.', 'Tu dois appeler le médecin.', ['medecin-001', 'medecin-097'])]),
    regle('gram-12', 'A2', 'Le datif', 'Dativ',
      'Dativ: dem / einem, der / einer, den …-n',
      'Le datif marque souvent la personne à qui l’on donne, montre ou dit quelque chose (à qui ?). Articles au datif : dem et einem au masculin et au neutre, der et einer au féminin, den au pluriel, où le nom prend un -n s’il n’en a pas déjà, sauf les pluriels en -s (den Kindern, mais den Autos). Pronoms : mir, dir, ihm, ihr, uns, euch, ihnen, Ihnen. Certains verbes demandent toujours le datif : helfen, danken, gefallen, schmecken.',
      [exemple('Der Kellner bringt dem Gast die Rechnung.', 'Le serveur apporte l’addition au client.', ['resto-006', 'resto-078', 'presenter-035', 'resto-010']),
        exemple('Die Jacke gefällt mir sehr.', 'La veste me plaît beaucoup.', ['mode-012', 'mode-079'])]),
    regle('gram-13', 'A2', 'Les prépositions à l’accusatif, au datif, et les prépositions mixtes', 'Präpositionen mit Akkusativ, Dativ und Wechselpräpositionen',
      'für, durch, gegen, ohne, um + Akk. – aus, bei, mit, nach, seit, von, zu + Dat. – Wo? Dativ, Wohin? Akkusativ',
      'Après durch, für, gegen, ohne et um : toujours l’accusatif. Après aus, bei, mit, nach, seit, von et zu : toujours le datif. Les prépositions mixtes (an, auf, hinter, in, neben, über, unter, vor, zwischen) prennent le datif pour le lieu où l’on est (wo ?) et l’accusatif pour le lieu où l’on va (wohin ?). Contractions courantes : im (in dem), ins (in das), zum (zu dem), zur (zu der), beim (bei dem), vom (von dem).',
      [exemple('Nach dem Essen gehen wir in den Park.', 'Après le repas, nous allons au parc.', ['resto-016', 'deplacer-050']),
        exemple('Das Hotel liegt neben dem Bahnhof.', 'L’hôtel est à côté de la gare.', ['deplacer-032', 'resto-132', 'deplacer-002'])]),
    regle('gram-14', 'A2', 'Les subordonnées : le verbe en fin de phrase', 'Nebensätze mit weil, dass, wenn',
      'weil / dass / wenn … Verb am Ende',
      'Après weil (parce que), dass (que) et wenn (si, quand), le verbe conjugué va à la fin de la proposition ; un verbe à particule s’y écrit en un seul mot (wenn du mich einlädst). Une virgule sépare toujours la subordonnée de la principale. Si la subordonnée vient en premier, la principale commence par son verbe : Wenn ich Zeit habe, komme ich.',
      [exemple('Ich gehe zum Arzt, weil ich Fieber habe.', 'Je vais chez le médecin parce que j’ai de la fièvre.', ['medecin-001', 'medecin-036']),
        exemple('Wenn die Sonne scheint, fahren wir an den Strand.', 'Quand il y a du soleil, nous allons à la plage.', ['deplacer-083', 'deplacer-077'])]),
    regle('gram-15', 'A2', 'Le comparatif et le superlatif', 'Komparativ und Superlativ',
      'schnell – schneller als – am schnellsten',
      'Le comparatif se forme avec -er : billig, billiger. « que » se dit als : Der Zug ist schneller als der Bus. Le superlatif se forme avec am … -sten : am billigsten ; en général, après d, t, s, ß, z, sch ou x, on écrit -esten : am heißesten, am frischesten (sauf groß : am größten). Les adjectifs en -er et -el perdent parfois leur e : teuer, teurer. Beaucoup d’adjectifs courts prennent un Umlaut : alt, älter, am ältesten. Formes irrégulières : gut, besser, am besten ; gern, lieber, am liebsten ; viel, mehr, am meisten. Pour l’égalité, on dit so … wie (aussi … que).',
      [exemple('Der Zug ist schneller als der Bus.', 'Le train est plus rapide que le bus.', ['deplacer-001', 'deplacer-003']),
        exemple('Im Sommer ist das Meer am wärmsten.', 'C’est en été que la mer est la plus chaude.', ['deplacer-078', 'resto-100'])]),
  );

  D.grammaire.push(
    exercice('gram-11', 1, 'Ich kann heute nicht ___.', ['kommen', 'komme', 'kommt', 'gekommen'], 'Je ne peux pas venir aujourd’hui.'),
    exercice('gram-11', 2, 'Du ___ hier nicht parken.', ['darfst', 'darf', 'dürfen', 'dürft'], 'Tu n’as pas le droit de te garer ici.'),
    exercice('gram-11', 3, 'Wir möchten einen Tisch ___.', ['reservieren', 'reserviert', 'reserviere', 'reservierst'], 'Nous voudrions réserver une table.'),
    exercice('gram-11', 4, 'Er ___ morgen früh arbeiten.', ['muss', 'müsst', 'musst', 'müssen'], 'Il doit travailler demain matin.'),
    exercice('gram-11', 5, '___ ihr Deutsch sprechen?', ['Könnt', 'Kann', 'Können', 'Kannst'], 'Vous savez parler allemand ?'),
    exercice('gram-11', 6, 'Meine Schwester ___ Ärztin werden.', ['will', 'willst', 'wollen', 'wollt'], 'Ma sœur veut devenir médecin.'),

    exercice('gram-12', 1, 'Ich gebe ___ Mann das Buch.', ['dem', 'den', 'der', 'des'], 'Je donne le livre à l’homme.'),
    exercice('gram-12', 2, 'Wir helfen ___ Nachbarin.', ['der', 'die', 'dem', 'den'], 'Nous aidons la voisine.'),
    exercice('gram-12', 3, 'Das Kleid gefällt ___ sehr.', ['mir', 'mich', 'ich', 'mein'], 'La robe me plaît beaucoup.'),
    exercice('gram-12', 4, 'Der Kellner bringt ___ Kindern Wasser.', ['den', 'die', 'dem', 'der'], 'Le serveur apporte de l’eau aux enfants.'),
    exercice('gram-12', 5, 'Ich danke ___ für die Einladung.', ['Ihnen', 'Sie', 'Ihren', 'Ihrem'], 'Je vous remercie de l’invitation.'),
    exercice('gram-12', 6, 'Die Suppe schmeckt ___ Gast nicht.', ['dem', 'den', 'der', 'des'], 'La soupe ne plaît pas au client.'),

    exercice('gram-13', 1, 'Das Geschenk ist für ___ Vater.', ['meinen', 'meinem', 'mein', 'meiner'], 'Le cadeau est pour mon père.'),
    exercice('gram-13', 2, 'Ich fahre mit ___ Fahrrad zur Arbeit.', ['dem', 'das', 'den', 'der'], 'Je vais au travail à vélo.'),
    exercice('gram-13', 3, 'Die Kinder spielen in ___ Küche.', ['der', 'die', 'den', 'dem'], 'Les enfants jouent dans la cuisine.'),
    exercice('gram-13', 4, 'Ich lege die Brille auf ___ Tisch.', ['den', 'dem', 'der', 'des'], 'Je pose les lunettes sur la table.'),
    exercice('gram-13', 5, 'Die Brille liegt auf ___ Tisch.', ['dem', 'den', 'der', 'des'], 'Les lunettes sont sur la table.'),
    exercice('gram-13', 6, 'Seit ___ Jahr lerne ich Deutsch.', ['einem', 'ein', 'einen', 'eines'], 'J’apprends l’allemand depuis un an.'),
    exercice('gram-13', 7, 'Wir gehen durch ___ Park.', ['den', 'dem', 'der', 'des'], 'Nous traversons le parc.'),

    exercice('gram-14', 1, 'Ich bleibe heute zu Hause, ___ ich krank bin.', ['weil', 'dass', 'denn', 'deshalb'], 'Je reste à la maison aujourd’hui parce que je suis malade.'),
    exercice('gram-14', 2, 'Ich weiß, dass ___.', ['der Zug Verspätung hat', 'der Zug hat Verspätung', 'hat der Zug Verspätung', 'Verspätung der Zug hat'], 'Je sais que le train a du retard.'),
    exercice('gram-14', 3, 'Wenn das Wetter schön ist, ___ an den Strand.', ['gehen wir', 'wir gehen', 'gehen', 'wir'], 'S’il fait beau, nous allons à la plage.'),
    exercice('gram-14', 4, 'Er sagt, ___ er morgen kommt.', ['dass', 'das', 'denn', 'deshalb'], 'Il dit qu’il vient demain.'),
    exercice('gram-14', 5, 'Ich lerne Deutsch, weil ich in Berlin ___ möchte.', ['arbeiten', 'arbeite', 'arbeitet', 'gearbeitet'], 'J’apprends l’allemand parce que je voudrais travailler à Berlin.'),
    exercice('gram-14', 6, 'Ich komme gern, wenn ihr mich ___.', ['einladet', 'ladet ein', 'einladen', 'lädst ein'], 'Je viens volontiers si vous m’invitez.'),

    exercice('gram-15', 1, 'Das Taxi ist ___ als der Bus.', ['schneller', 'schnell', 'am schnellsten', 'schnellste'], 'Le taxi est plus rapide que le bus.'),
    exercice('gram-15', 2, 'Mein Bruder ist ___ als ich.', ['älter', 'alter', 'älterer', 'am ältesten'], 'Mon frère est plus âgé que moi.'),
    exercice('gram-15', 3, 'Das Hotel ist teurer ___ die Jugendherberge.', ['als', 'wie', 'dann', 'so'], 'L’hôtel est plus cher que l’auberge de jeunesse.'),
    exercice('gram-15', 4, 'Ich trinke gern Tee, aber ___ trinke ich Kaffee.', ['lieber', 'gerner', 'mehr gern', 'besser'], 'J’aime boire du thé, mais je préfère boire du café.'),
    exercice('gram-15', 5, 'Im Winter ist es hier ___ kalt wie in Berlin.', ['so', 'als', 'wie', 'mehr'], 'En hiver, il fait aussi froid ici qu’à Berlin.'),
    exercice('gram-15', 6, 'Im August ist es hier am ___.', ['wärmsten', 'wärmer', 'warmsten', 'wärmste'], 'C’est en août qu’il fait le plus chaud ici.'),
    exercice('gram-15', 7, 'Das Essen hier ist ___ als im Café.', ['besser', 'guter', 'gutter', 'am besten'], 'Ici, la cuisine est meilleure qu’au café.'),
  );

  // ---------- Règles 16 à 20 ----------

  D.regles.push(
    regle('gram-16', 'A2', 'La déclinaison de l’adjectif', 'Adjektivdeklination',
      'der neue Rock – ein neuer Rock – den neuen Rock',
      'Devant un nom, l’adjectif prend une terminaison. Après der, die, das : -e au nominatif singulier (der neue Rock) et à l’accusatif féminin et neutre (die neue Jacke, das neue Kleid) ; -en partout ailleurs (den neuen Rock, mit dem neuen Rock, die neuen Schuhe). Après ein, l’adjectif montre le genre que l’article ne montre pas : ein neuer Rock, ein neues Kleid, eine neue Jacke, avec les mêmes formes à l’accusatif féminin et neutre ; à l’accusatif masculin et au datif, -en : einen neuen Rock, mit einem neuen Rock. Sans article, il prend la terminaison de dieser, dieses, diese : frisches Brot (comme dieses Brot). Après sein, l’adjectif ne change pas : Der Rock ist neu.',
      [exemple('Ich trage heute den roten Rock und eine weiße Bluse.', 'Aujourd’hui, je porte la jupe rouge et un chemisier blanc.', ['courses-117', 'mode-092', 'mode-005', 'mode-091', 'mode-009']),
        exemple('Wir essen in einem kleinen Restaurant.', 'Nous mangeons dans un petit restaurant.', ['resto-074', 'courses-131', 'resto-001'])]),
    regle('gram-17', 'A2', 'Les verbes pronominaux', 'Reflexive Verben',
      'sich freuen: ich freue mich, du freust dich, er freut sich, wir freuen uns, ihr freut euch, sie / Sie freuen sich',
      'Un verbe pronominal s’emploie avec un pronom réfléchi qui renvoie au sujet : mich, dich, sich, uns, euch, sich. À la troisième personne et avec le vous de politesse, c’est toujours sich, sans majuscule : Setzen Sie sich. Quand le verbe a déjà un complément d’objet direct, le réfléchi est au datif : ich wasche mir die Hände (seuls mich et dich deviennent mir et dir). Les verbes pronominaux ne sont pas toujours les mêmes qu’en français : sich bewerben (postuler), sich bedanken (remercier).',
      [exemple('Ich freue mich auf die Hochzeit.', 'J’ai hâte d’être au mariage.', ['presenter-068', 'famille-039']),
        exemple('Wir melden uns für den Kurs an.', 'Nous nous inscrivons au cours.', ['courses-121', 'metiers-070'])]),
    regle('gram-18', 'B1', 'Le génitif', 'Genitiv',
      'Genitiv: des Vaters, des Kindes – der Mutter, der Kinder',
      'Le génitif exprime l’appartenance (de, du) : das Auto des Vaters, la voiture du père. Au masculin et au neutre, l’article devient des (eines) et le nom prend -s ou -es, sauf quelques noms masculins (des Kollegen) ; au féminin et au pluriel, l’article est der. Avec un prénom, on ajoute -s : Annas Fahrrad. On emploie aussi le génitif après wegen (à cause de), während (pendant) et trotz (malgré). À l’oral, on dit souvent von et le datif : das Auto von meinem Vater.',
      [exemple('Das ist das Auto meines Vaters.', 'C’est la voiture de mon père.', ['deplacer-007', 'presenter-039']),
        exemple('Wegen des Regens fahren wir nicht ans Meer.', 'À cause de la pluie, nous n’allons pas à la mer.', ['deplacer-078', 'deplacer-090'])]),
    regle('gram-19', 'B1', 'Les propositions relatives', 'Relativsätze',
      'der Mann, der … / den … / dem … – Verb am Ende',
      'Le pronom relatif (qui, que, à qui) prend le genre et le nombre du nom qu’il reprend, mais son cas dépend de son rôle dans la relative : der Mann, der dort steht (sujet) ; der Mann, den ich kenne (complément direct) ; der Mann, dem ich helfe (datif). Ses formes sont celles de l’article défini, sauf au datif pluriel (denen) et au génitif (dessen, deren). Après une préposition, le cas dépend de la préposition : in dem, mit denen. La relative est encadrée de virgules, et son verbe conjugué va à la fin.',
      [exemple('Der Kellner, der uns bedient, ist sehr freundlich.', 'Le serveur qui nous sert est très aimable.', ['resto-006', 'presenter-083']),
        exemple('Das ist das Hotel, in dem wir übernachtet haben.', 'C’est l’hôtel où nous avons passé la nuit.', ['deplacer-032', 'deplacer-102'])]),
    regle('gram-20', 'B1', 'Le passif', 'Passiv',
      'werden + Partizip II – Perfekt: ist … worden',
      'Le passif met en avant l’action ou ce qui la subit, plutôt que celui qui agit. Il se forme avec werden conjugué et le participe passé à la fin : Das Essen wird gekocht (le repas est préparé). Celui qui agit s’introduit par von et le datif : vom Koch. Au prétérit : wurde gekocht. Au passé composé : ist gekocht worden (worden, sans ge-).',
      [exemple('Die Suppe wird in der Küche gekocht.', 'La soupe est préparée en cuisine.', ['resto-017', 'resto-053', 'resto-082']),
        exemple('Das Paket ist gestern geliefert worden.', 'Le colis a été livré hier.', ['courses-092', 'courses-110'])]),
  );

  D.grammaire.push(
    exercice('gram-16', 1, 'Der ___ Mantel ist warm.', ['neue', 'neuer', 'neuen', 'neues'], 'Le nouveau manteau est chaud.'),
    exercice('gram-16', 2, 'Ich habe einen ___ Pullover.', ['grauen', 'grauer', 'graue', 'graues'], 'J’ai un pull gris.'),
    exercice('gram-16', 3, 'Das ist ein ___ Kleid.', ['schönes', 'schöne', 'schönen', 'schöner'], 'C’est une belle robe.'),
    exercice('gram-16', 4, 'Sie trägt eine ___ Bluse.', ['weiße', 'weißen', 'weißer', 'weißes'], 'Elle porte un chemisier blanc.'),
    exercice('gram-16', 5, 'Wir wohnen in einem ___ Haus.', ['alten', 'altes', 'alte', 'alter'], 'Nous habitons dans une vieille maison.'),
    exercice('gram-16', 6, 'Die Jacke ist ___.', ['neu', 'neue', 'neuen', 'neues'], 'La veste est neuve.'),
    exercice('gram-16', 7, 'Er kauft die ___ Schuhe.', ['schwarzen', 'schwarze', 'schwarzer', 'schwarzes'], 'Il achète les chaussures noires.'),

    exercice('gram-17', 1, 'Ich freue ___ auf den Urlaub.', ['mich', 'mir', 'sich', 'dich'], 'J’ai hâte d’être en vacances.'),
    exercice('gram-17', 2, 'Du musst ___ beeilen, der Zug fährt gleich ab.', ['dich', 'dir', 'sich', 'du'], 'Tu dois te dépêcher, le train part bientôt.'),
    exercice('gram-17', 3, 'Peter hat ___ in Anna verliebt.', ['sich', 'ihn', 'ihm', 'er'], 'Peter est tombé amoureux d’Anna.'),
    exercice('gram-17', 4, 'Wir bewerben ___ bei einer großen Firma.', ['uns', 'sich', 'unser', 'wir'], 'Nous postulons auprès d’une grande entreprise.'),
    exercice('gram-17', 5, 'Habt ihr ___ schon angemeldet?', ['euch', 'sich', 'ihr', 'eure'], 'Vous vous êtes déjà inscrits ?'),
    exercice('gram-17', 6, 'Herr Müller, bitte setzen Sie ___.', ['sich', 'Sie', 'Ihnen', 'sie'], 'Monsieur Müller, asseyez-vous, je vous prie.'),

    exercice('gram-18', 1, 'Das ist das Auto ___ Vaters.', ['des', 'dem', 'den', 'der'], 'C’est la voiture du père.'),
    exercice('gram-18', 2, 'Die Farbe ___ Jacke gefällt mir.', ['der', 'die', 'des', 'dem'], 'La couleur de la veste me plaît.'),
    exercice('gram-18', 3, 'Wegen ___ Staus kommen wir später.', ['des', 'dem', 'den', 'der'], 'À cause de l’embouteillage, nous arrivons plus tard.'),
    exercice('gram-18', 4, 'Während ___ Urlaubs habe ich viel gelesen.', ['des', 'dem', 'den', 'der'], 'Pendant les vacances, j’ai beaucoup lu.'),
    exercice('gram-18', 5, 'Das Zimmer ___ Kinder ist groß.', ['der', 'den', 'die', 'des'], 'La chambre des enfants est grande.'),
    exercice('gram-18', 6, 'Der Name des ___ ist Weber.', ['Lehrers', 'Lehrer', 'Lehrern', 'Lehrerin'], 'Le nom de l’enseignant est Weber.'),

    exercice('gram-19', 1, 'Der Mann, ___ dort steht, ist mein Onkel.', ['der', 'den', 'dem', 'die'], 'L’homme qui est là-bas est mon oncle.'),
    exercice('gram-19', 2, 'Die Jacke, ___ ich gekauft habe, ist warm.', ['die', 'der', 'den', 'das'], 'La veste que j’ai achetée est chaude.'),
    exercice('gram-19', 3, 'Das ist der Nachbar, ___ ich oft helfe.', ['dem', 'den', 'der', 'die'], 'C’est le voisin que j’aide souvent.'),
    exercice('gram-19', 4, 'Das Kind, ___ im Garten spielt, heißt Lena.', ['das', 'der', 'die', 'dem'], 'L’enfant qui joue dans le jardin s’appelle Lena.'),
    exercice('gram-19', 5, 'Der Rock, ___ du trägst, ist sehr schön.', ['den', 'der', 'dem', 'die'], 'La jupe que tu portes est très belle.'),
    exercice('gram-19', 6, 'Das ist das Restaurant, ___ wir gestern gegessen haben.', ['in dem', 'in das', 'das', 'dem'], 'C’est le restaurant où nous avons mangé hier.'),
    exercice('gram-19', 7, 'Die Freunde, mit ___ ich Urlaub mache, kommen aus Köln.', ['denen', 'den', 'dem', 'die'], 'Les amis avec qui je pars en vacances viennent de Cologne.'),

    exercice('gram-20', 1, 'Das Brot ___ jeden Morgen gebacken.', ['wird', 'wirst', 'wurden', 'werden'], 'Le pain est cuit chaque matin.'),
    exercice('gram-20', 2, 'Die Rechnung wird sofort ___.', ['bezahlt', 'bezahle', 'bezahlte', 'bezahlst'], 'L’addition est payée tout de suite.'),
    exercice('gram-20', 3, 'Die Pakete ___ morgen geliefert.', ['werden', 'wird', 'worden', 'werdet'], 'Les colis seront livrés demain.'),
    exercice('gram-20', 4, 'Das Haus ist 1990 gebaut ___.', ['worden', 'geworden', 'werden', 'wird'], 'La maison a été construite en 1990.'),
    exercice('gram-20', 5, 'Der Patient wird ___ Arzt untersucht.', ['vom', 'von', 'von der', 'von den'], 'Le patient est examiné par le médecin.'),
    exercice('gram-20', 6, 'In diesem Restaurant ___ viel Fisch gegessen.', ['wird', 'werden', 'wurden', 'hat'], 'Dans ce restaurant, on mange beaucoup de poisson.'),
  );
})(typeof window !== 'undefined' ? window : globalThis);
