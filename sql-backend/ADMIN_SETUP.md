# Admin-Konto Setup

Die Anwendung verwendet ein vordefiniertes Admin-Konto, das beim Seeding der Datenbank erstellt wird.

## Admin-Anmeldeinformationen

- **E-Mail:** admin@example.com
- **Passwort:** Admin123!

## Tutor-Registrierung

Die Anwendung ermöglicht die Registrierung von Tutoren mithilfe eines vordefinierten Schlüssels:

- **Tutor-Schlüssel:** TUT0R-K3Y-2025

Dieser Schlüssel ist in der `.env`-Datei definiert und kann dort bei Bedarf geändert werden.

## Datenbank Seeding

Um das Admin-Konto zu erstellen, führen Sie folgenden Befehl aus:

```bash
npx prisma db seed
```

oder

```bash
npm run prisma:seed
```

## Wichtige Hinweise

- Das Admin-Konto wird nur erstellt, wenn noch kein Benutzer mit Admin-Rolle existiert
- Es ist nicht möglich, sich als Admin zu registrieren; neue Benutzer erhalten automatisch die Rolle STUDENT
- Tutoren können sich mit dem Tutor-Schlüssel selbst registrieren
- In einer Produktionsumgebung sollten Sie das Admin-Passwort und den Tutor-Schlüssel nach der ersten Anmeldung ändern
