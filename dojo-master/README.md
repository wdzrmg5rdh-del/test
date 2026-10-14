# Dojo Master

Ein 2D-Karatespiel für drei Kämpfer im Browser, spielmechanisch angelehnt an den Heimcomputerklassiker „International Karate +“ (1987). Privates, nicht kommerzielles Projekt. Es enthält kein Originalmaterial: Grafiken, Sounds, Texte und Namen sind vollständig im Code erzeugt.

## Starten

```bash
cd dojo-master
npm install
npm run dev      # Entwicklungsserver, Adresse steht in der Konsole
npm run build    # statische Seite in dist/ (ohne Server-Logik auslieferbar)
npm run preview  # gebaute Seite lokal ansehen
npm run sim      # kopflose Tests der Spiellogik (Daten, Reichweiten, KI, Bonusrunden, Kollision)
```

Der Build besteht aus `index.html` und einer JavaScript-Datei. Es werden keine weiteren Dateien und keine Netzwerkressourcen geladen. Die Basis ist relativ (`./`), die Seite funktioniert daher auch in einem Unterverzeichnis.

Nur im Entwicklungsmodus gibt es Abkürzungen über die Adresszeile: `?modus=1` bzw. `?modus=2` startet direkt einen Kampf, `?bonus=A` bzw. `?bonus=B` eine Bonusrunde, `?spielende=7500` den Spielende-Bildschirm mit Namenseingabe, `?posen` zeigt alle Schlüsselposen. `?seed=123` setzt in jedem Modus den Zufalls-Seed für reproduzierbare Partien.

## Steuerung

Richtungen gelten relativ zur Blickrichtung des Kämpfers (vor = in Blickrichtung). Die Tabelle wird im Spiel auf dem Steuerungsbildschirm angezeigt und dort direkt aus den Daten (`src/data/controls.ts`) erzeugt.

| Richtung | ohne Taste | Schlag | Tritt | Abwehr |
|---|---|---|---|---|
| neutral | Stehen | Fauststoß hoch | Fronttritt | Abwehr hoch |
| vor | Schritt vor | Fauststoß hoch | Fronttritt | Abwehr hoch |
| zurück | Schritt zurück | Fauststoß hinten | Tritt nach hinten | Umdrehen |
| oben | Sprung | Kopfstoß | Hoher Tritt | Abwehr hoch |
| unten | Ducken | Fauststoß tief | Fußfeger | Abwehr tief |
| oben-vor | Salto vorwärts | Kopfstoß | Flugtritt | Abwehr hoch |
| oben-zurück | Salto rückwärts | Fauststoß hinten | Halbkreistritt | Umdrehen |
| unten-vor | Ducken | Fauststoß tief | Fußfeger | Abwehr tief |
| unten-zurück | Ducken | Fauststoß tief | Fußfeger | Abwehr tief |

Abwehr wird gehalten. Die hohe Abwehr schützt vor hohen und mittleren Angriffen, die tiefe vor tiefen und mittleren. Abwehr wirkt nur gegen Angriffe von vorn.

Standardbelegung (geprüft über `KeyboardEvent.code`, daher auf deutschen und englischen Tastaturen an derselben Stelle):

| | Richtungen | Schlag | Tritt | Abwehr |
|---|---|---|---|---|
| Spieler 1 | W A S D | F | G | H |
| Spieler 2 | Pfeiltasten | Num 1 oder K | Num 2 oder L | Num 3 oder Ö |

Gamepad (Standard-Mapping): Steuerkreuz oder linker Stick, X = Schlag, A = Tritt, B = Abwehr, Start = Pause. Weitere Tasten: P oder Esc = Pause, F9 = Vollbild, F3 = Debug-Modus. Alle Belegungen sind im Optionsmenü änderbar und werden im localStorage gespeichert.

Zu Ghosting: Die beiden Spieler liegen in getrennten Bereichen der Tastatur (linker Buchstabenblock gegenüber Pfeiltasten und Ziffernblock). Das vermeidet die häufigsten Blockaden, garantieren lässt es sich aber nicht, weil die Tastaturmatrix je nach Modell verschieden ist. Die Ausweichbelegung K, L, Ö für Tastaturen ohne Ziffernblock liegt wieder im Buchstabenblock und ist daher anfälliger; wer dort Aussetzer bemerkt, nimmt besser den Ziffernblock, ein Gamepad oder belegt die Tasten im Optionsmenü um.

Eingaben werden 7 Frames gepuffert, sodass ein Angriff, der kurz vor Ende einer Animation gedrückt wird, danach ausgeführt wird.

## Regeln

Drei Kämpfer stehen gleichzeitig auf der Kampffläche, jeder kann jeden treffen. Im Einzelspielermodus spielt Spieler 1 (weiß) gegen zwei KI-Kämpfer (rot, blau), im Zwei-Spieler-Modus Spieler 1 (weiß) und Spieler 2 (rot) gegen einen KI-Kämpfer (blau).

Eine Runde dauert 30 Sekunden. Treffer bringen einen halben oder ganzen Punkt. Wer 6 Punkte erreicht, beendet die Runde sofort. Nach jedem Treffer unterbricht der Kampfrichter, der Getroffene taumelt (halber Punkt) oder stürzt (ganzer Punkt), alle kehren auf die Ausgangspositionen zurück. Während dieser Unterbrechungen steht die Rundenuhr.

Am Rundenende wird die Rangfolge nach Rundenpunkten ermittelt. Ein menschlicher Spieler auf dem letzten Platz scheidet aus; im Zwei-Spieler-Modus spielt der andere allein weiter (der frei gewordene Platz wird von der KI übernommen). Gleichstände entscheidet standardmäßig, wer zuletzt gepunktet hat. Lässt sich ein Gleichstand so nicht entscheiden (etwa weil beide nie gepunktet haben), entscheidet das Los über den seedbaren Zufallsgenerator.

Jeder halbe Rundenpunkt bringt 100 Gesamtpunkte. Der Rundensieger erhält 20 Bonuspunkte je verbleibender Sekunde, wenn die Runde durch Erreichen der Siegpunktzahl endet. Gürtelschwellen: weiß 0, gelb 1500, orange 3500, grün 6000, blau 9000, braun 12500, schwarz 16500. Mit jeder Gürtelstufe des besten noch aktiven Spielers werden die KI-Gegner schneller in Reaktion, Entscheidung und Schritt, wehren öfter ab, greifen häufiger an und machen weniger Fehler.

Nach jeweils zwei Kampfrunden folgt eine Bonusrunde, abwechselnd A und B. In A springen 26 Bälle von beiden Seiten in drei Höhen heran, mit steigender Geschwindigkeit. Oben, neutral und unten stellen den Schild hoch, mittel oder tief (tief heißt geduckt), links und rechts drehen den Spieler, jede Aktionstaste lässt ihn springen. Jeder abgewehrte Ball bringt 50 Punkte. In B kommen zusätzlich Bomben, die man nicht berühren darf: unter hohen Bomben ducken, über tiefe springen. Bombenkontakt kostet 100 Punkte.

Alle Zahlenwerte stehen zentral in `src/config.ts`.

## Treffer und Prioritätsregel

Körperzonen (Hurtboxes) sind Kapseln um Kopf, Rumpf, Ober- und Unterschenkel, berechnet aus der aktuellen Pose. Die Trefferzone (Hitbox) eines Angriffs ist eine Kapsel am schlagenden Glied (Unterarm und Faust, Unterschenkel und Fuß, beim Kopfstoß der Kopf) und existiert nur in der aktiven Phase. Tiefe Angriffe treffen nur Gegner am Boden, Sprünge und Saltos überspringen sie. Hohe Angriffe gehen über geduckte Gegner hinweg.

Sind in einem Frame mehrere Treffer möglich, gilt: Nicht abgewehrte Treffer gehen vor abgewehrten. Unter den nicht abgewehrten gewinnt der Angriff, dessen aktive Phase früher begonnen hat, bei Gleichstand der mit dem höheren Punktwert. Treffen sich danach zwei Kämpfer gegenseitig gleichwertig, zählt keiner („Gleichzeitig – kein Punkt“). Bleibt danach noch ein Gleichstand zwischen verschiedenen Paaren, entscheidet die Startposition (links vor Mitte vor rechts). Wer getroffen wird, kann im selben Frame nicht punkten.

Kämpfer durchdringen sich nicht und verlassen die Kampffläche nicht. Wer in einen stehenden Gegner läuft, wird gestoppt, statt ihn zu schieben.

## Angriffe

| Angriff | Anlauf | aktiv | Erholung | Höhe | Punkte |
|---|---|---|---|---|---|
| Fauststoß hoch | 6 | 4 | 12 | hoch | ½ |
| Fauststoß tief | 7 | 4 | 14 | tief | ½ |
| Kopfstoß | 8 | 4 | 14 | hoch | ½ |
| Fronttritt | 9 | 5 | 15 | mittel | ½ |
| Hoher Tritt | 12 | 5 | 18 | hoch | ½ |
| Halbkreistritt | 18 | 6 | 22 | hoch | 1 |
| Fußfeger | 12 | 6 | 18 | tief | ½ |
| Flugtritt | 8 | 14 | 16 | hoch | 1 |
| Tritt nach hinten | 14 | 6 | 20 | mittel | 1 |
| Fauststoß hinten | 10 | 4 | 16 | hoch | ½ |

Frames bei 60 Logikschritten pro Sekunde. Frame-Daten stehen in `src/data/moves.ts`, Punktwerte in `src/config.ts`, Animationen in `src/data/animations.ts`, Posen in `src/data/poses.ts`.

## KI

Die KI ist ein Zustandsautomat (Abwarten, Annähern, Abstand halten, Angreifen, Abwehren, Ausweichen). Sie sieht von den anderen Kämpfern nur Position, Blickrichtung und laufende Animation, und das um die Reaktionszeit verzögert; Eingaben kennt sie nicht. Sie steuert ihren Kämpfer über dieselben Eingaben wie ein Mensch. Ziele wählt sie meist nach Nähe, wechselt aber auch zum anderen Gegner, sodass sich die KI-Kämpfer auch gegenseitig angreifen. Angriffsreichweiten ermittelt sie beim Start durch Simulation aus den Posendaten.

## Architektur

| Verzeichnis | Inhalt |
|---|---|
| `src/core` | Spielschleife mit festem Zeitschritt, Bildschirm und Skalierung, Zufallsgenerator, Ereignisse |
| `src/input` | Tastatur, Gamepad, Belegungen, Menüeingaben |
| `src/data` | Posen, Animationen, Frame-Daten, Steuerungstabelle, Datenprüfung |
| `src/fighter` | Skelett und Vorwärtskinematik, Kämpfer-Zustandsautomat mit Eingabepuffer |
| `src/combat` | Hurtboxes, Hitboxes, Prioritätsregel, Kollision zwischen Kämpfern |
| `src/ai` | KI-Steuerung, Reichweitenmessung, menschliche Steuerung |
| `src/rules` | Kampfrunde, Kampfrichter, Wertung, Spielverlauf, Bonusrunden |
| `src/render` | Software-Framebuffer, Pixelschrift, Kämpfer, Kampfrichter, Hintergrund, HUD, Menüs, Debug-Overlay |
| `src/audio` | Soundeffekte mit Web Audio |
| `src/states` | Titel, Kampf, Bonusrunde, Pause, Spielende, Optionen, Steuerung, Bestenliste |
| `src/storage` | Einstellungen und Bestenliste im localStorage |
| `src/config.ts`, `src/texts.ts` | zentrale Konfiguration und alle deutschen Texte |

Gezeichnet wird in einen eigenen Pixelpuffer mit 640 × 360 Bildpunkten ohne Kantenglättung, der ganzzahlig skaliert auf den Bildschirm kommt; die Restfläche bleibt in neutralem Grau. Die Logik läuft mit festen 60 Schritten pro Sekunde, unabhängig von der Bildrate, und ist deterministisch: Sie verwendet ausschließlich den seedbaren Zufallsgenerator und greift weder auf Audio noch auf das DOM zu. `npm run sim` prüft das, indem es dieselbe Runde zweimal mit gleichem Seed simuliert.

Der Debug-Modus (F3) zeigt Hurtboxes (grün), aktive Hitboxes (rot), Zustand, Animation und Frame jedes Kämpfers, den KI-Zustand mit Ziel und letzter Aktion sowie Bild- und Logikrate und den Seed.

## Eigene Festlegungen und Abweichungen vom Original

Die Steuerung mit drei Aktionstasten, die Auflösung 16:9 und die konfigurierbare Gleichstandsregel folgen der Aufgabenstellung. Darüber hinaus habe ich einige Details selbst festgelegt, weil ich sie für das Original nicht sicher kenne oder weil die Vorgaben sie verlangen: die genaue Zuordnung der Angriffe zu Richtung und Taste, die Umrechnung von 100 Gesamtpunkten je halbem Rundenpunkt, den Zeitbonus nur für den Rundensieger bei vorzeitigem Rundenende, das Anhalten der Rundenuhr während der Unterbrechungen, die Gürtelschwellen, den Losentscheid bei nicht auflösbarem Gleichstand, die Regel, dass Kämpfer einander nicht überspringen können, den Standort des Kampfrichters am linken Rand und die Zahl von 26 Objekten je Bonusrunde. Musik gibt es nicht.

Bekannte Grenzen: Ohne Tastendruck oder Mausklick bleibt der Ton stumm, da Browser Audio erst nach einer Nutzerinteraktion erlauben; ein Gamepad-Knopf zählt dafür nicht. Der Vollbildmodus lässt sich aus dem Optionsmenü per Gamepad aus demselben Grund unter Umständen nicht einschalten, per Taste F9 oder per Tastatur im Menü schon.
