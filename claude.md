# Anweisungen für dieses Projekt

## Zweck der App
- Nutzer sollen für jeden Tag erfassen können, was sie gegessen haben, optional mit Foto.
- Nutzer sollen parallel festhalten können, ob Symptome aufgetreten sind, welche Symptome es waren und wann sie aufgetreten sind.
- Die Auswertung soll die gespeicherten Einträge nach wiederkehrenden Mustern und möglichen zeitlichen Zusammenhängen zwischen Lebensmitteln und Symptomen durchsuchen.
- Zeige nachvollziehbar, auf welchen Einträgen ein erkanntes Muster beruht. Stelle Beobachtungen nicht als medizinische Diagnose oder als Beweis für eine Allergie oder Ursache dar.

## Datenschutz und Speicherung
- Alle Einträge und Fotos müssen lokal auf dem Gerät im Browser gespeichert werden. Verwende `localStorage` als Datenspeicher.
- Sende oder teile keine persönlichen, gesundheitlichen oder sonstigen wichtigen Nutzerdaten nach außen. Es darf dafür keine Server-, Cloud-, Analyse-, Tracking- oder Drittanbieter-Integration geben.
- Lade keine externen Datenquellen, um Nutzerdaten anzureichern oder auszuwerten. Die Auswertung darf nur auf den vom Nutzer selbst eingegebenen Daten beruhen.
- Übertrage keine Einträge oder Fotos über Netzwerk-Anfragen. Protokolliere sie auch nicht in externen Diensten.
- Informiere Nutzer verständlich darüber, dass die Daten nur lokal gespeichert werden und beim Löschen der Browserdaten verloren gehen können.
- Behandle Fotos und Gesundheitsangaben als besonders sensible Daten. Speichere Fotos nur nach Auswahl durch den Nutzer und gehe sorgsam mit Speichergrenzen von `localStorage` um.

## Umsetzung
- Halte Änderungen auf die oben beschriebenen Funktionen und Datenschutzanforderungen beschränkt.
- Bevorzuge eine klare, barrierearme Oberfläche für tägliche Einträge und die Übersicht vergangener Einträge.
- Bei Speicherfehlern, etwa wenn der Browser-Speicher voll ist, zeige eine verständliche Fehlermeldung. Daten dürfen nicht stillschweigend verworfen werden.
