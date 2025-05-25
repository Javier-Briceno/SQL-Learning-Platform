# Admin-Konto Setup

Die Anwendung verwendet ein vordefiniertes Admin-Konto, das beim Seeding der Datenbank erstellt wird.

## Admin-Anmeldeinformationen

- **E-Mail:** admin@example.com
- **Passwort:** Admin123!

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
- In einer Produktionsumgebung sollten Sie das Admin-Passwort nach der ersten Anmeldung ändern
