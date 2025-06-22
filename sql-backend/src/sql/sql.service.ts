import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';

// Interface für Query-Ergebnisse
export interface QueryResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime?: number;
}

@Injectable()
export class SqlService {
    constructor(private readonly prisma: PrismaService) { }

    // Hilfsmethode, um eine Verbindung zur Admin-Datenbank herzustellen
    private async getAdminClient(): Promise<Client> {
        const client = new Client({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'postgres',
        });
        try {
            await client.connect();
            return client;
        } catch (error) {
            console.error('Fehler beim Verbinden mit der Admin-Datenbank:', error);
            throw new InternalServerErrorException('Verbindung zur Admin-Datenbank fehlgeschlagen.');
        }
    }

    // Hilfsmethode, um eine Verbindung zu einer spezifischen Datenbank herzustellen
    private async getDatabaseClient(databaseName: string): Promise<Client> {
        const client = new Client({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: databaseName,
        });
        try {
            await client.connect();
            return client;
        } catch (error) {
            console.error(`Fehler beim Verbinden mit der Datenbank ${databaseName}:`, error);
            throw new InternalServerErrorException(`Verbindung zur Datenbank ${databaseName} fehlgeschlagen.`);
        }
    }

    // Validiert SQL Query auf erlaubte Befehle
    private validateQuery(query: string): void {
        const normalizedQuery = query.trim().toLowerCase();
        
        // Erlaubte Befehle (Read-Only Operations)
        const allowedCommands = [
            'select',
            'show',
            'describe',
            'desc',
            'explain',
            'with'  // für CTEs (Common Table Expressions)
        ];

        // Verbotene Befehle
        const forbiddenCommands = [
            'insert',
            'update',
            'delete',
            'drop',
            'create',
            'alter',
            'truncate',
            'grant',
            'revoke'
        ];

        const firstWord = normalizedQuery.split(/\s+/)[0];

        // Prüfe auf verbotene Befehle
        if (forbiddenCommands.includes(firstWord)) {
            throw new BadRequestException(`SQL-Befehl '${firstWord.toUpperCase()}' ist nicht erlaubt. Nur Read-Only-Operationen sind gestattet.`);
        }

        // Prüfe auf erlaubte Befehle
        if (!allowedCommands.includes(firstWord)) {
            throw new BadRequestException(`SQL-Befehl '${firstWord.toUpperCase()}' ist nicht erkannt oder nicht erlaubt.`);
        }

        // Zusätzliche Validierungen
        if (normalizedQuery.includes(';') && normalizedQuery.split(';').length > 2) {
            throw new BadRequestException('Mehrere SQL-Statements sind nicht erlaubt.');
        }
    }

    // Neue Methode für Query Execution
    async executeQuery(query: string, databaseName: string, userId: number): Promise<QueryResult> {
    // Input Validierung
    if (!query || query.trim().length === 0) {
        throw new BadRequestException('SQL Query darf nicht leer sein.');
    }

    if (!databaseName || databaseName.trim().length === 0) {
        throw new BadRequestException('Datenbankname darf nicht leer sein.');
    }

    // Zugriffsprüfung: Owner ODER in einem Worksheet verwendet
    const managedDb = await this.prisma.managedDatabase.findUnique({
        where: { dbName: databaseName }
    });

    let hasAccess = false;
    if (managedDb && managedDb.ownerId === userId) {
        hasAccess = true;
    } else {
        // Prüfen, ob die Datenbank in einem Worksheet verwendet wird
        const worksheet = await this.prisma.worksheet.findFirst({
            where: { database: databaseName }
        });
        if (worksheet) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        throw new NotFoundException(`Datenbank '${databaseName}' wurde nicht gefunden oder ist nicht verfügbar.`);
    }

    // SQL Query validieren
    this.validateQuery(query);

    let client: Client | null = null;
    const startTime = Date.now();

    try {
        // Verbindung zur Zieldatenbank herstellen
        client = await this.getDatabaseClient(databaseName);
        // Query mit Timeout ausführen (10 Sekunden)
        const result = await Promise.race([
            client.query(query),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Query Timeout')), 10000)
            )
        ]) as any;

        const executionTime = Date.now() - startTime;

        // Ergebnis formatieren
        const queryResult: QueryResult = {
            columns: result.fields ? result.fields.map((field: any) => field.name) : [],
            rows: result.rows || [],
            rowCount: result.rowCount || 0,
            executionTime
        };

        console.log(`Query ausgeführt in ${executionTime}ms auf Datenbank ${databaseName}`);
        return queryResult;

    } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(`Query-Fehler nach ${executionTime}ms:`, error);

        if (error.message === 'Query Timeout') {
            throw new BadRequestException('Query-Timeout: Die Abfrage dauerte zu lange (max. 10 Sekunden).');
        }

        if (error.code) {
            // PostgreSQL-spezifische Fehler
            switch (error.code) {
                case '42P01':
                    throw new BadRequestException(`Tabelle oder Relation existiert nicht: ${error.message}`);
                case '42703':
                    throw new BadRequestException(`Spalte existiert nicht: ${error.message}`);
                case '42601':
                    throw new BadRequestException(`SQL-Syntax-Fehler: ${error.message}`);
                default:
                    throw new BadRequestException(`Datenbankfehler: ${error.message}`);
            }
        }

        throw new InternalServerErrorException(`Unerwarteter Fehler bei der Query-Ausführung: ${error.message}`);
    } finally {
        if (client) {
            await client.end();
        }
    }
}

    async executeSqlFile(sqlText: string, ownerId: number) {

        // Die SQL-Statements in der Datei trennen
        const statements = sqlText
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        // Überprüfen, ob das erste Statement ein CREATE DATABASE ist
        const createDbStmt = statements.shift();

        if (!createDbStmt) {
            throw new Error('Keine SQL-Statements gefunden.');
        }

        const dbNameMatch = createDbStmt.match(/CREATE DATABASE\s+([^\s;]+)/i);

        if (!dbNameMatch) {
            throw new Error('CREATE DATABASE fehlt oder ist ungültig.');
        }

        const newDbName = dbNameMatch[1];

        // Verbindung zur bestehenden postgres-Datenbank aufbauen
        const adminClient = await this.getAdminClient();

        // CREATE DATABASE ausführen
        try {
            await adminClient.query(createDbStmt);
        } catch (err) {
            console.error('Fehler bei CREATE DATABASE:', err);
            throw err;
        } finally {
            await adminClient.end();
        }

        // Verbindung zur neu erstellten Datenbank aufbauen
        const newDbClient = new Client({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: newDbName,
        });

        await newDbClient.connect()

        // SQL-Statements in der neuen Datenbank ausführen
        try {
            for (const stmt of statements) {
                await newDbClient.query(stmt);
            }
        } catch (err) {
            console.error('Fehler beim Ausführen der Statements:', err);
            throw err;
        } finally {
            await newDbClient.end();
        }

        // Neu erstellte Datenbank in die Prisma-Datenbank eintragen
        try {
            await this.prisma.managedDatabase.create({
                data: {
                    dbName: newDbName,
                    ownerId: ownerId,
                },
            });
        } catch (prismaError) {
            console.warn(`Konnte ${newDbName} nicht zur ManagedDatabase Tabelle hinzufügen (existiert evtl. schon dort?): ${prismaError.message}`);
        }

        return { message: `Datenbank "${newDbName}" erfolgreich erstellt und befüllt.` };
    }


    async listDatabases(ownerId: number): Promise<string[]> {
        const dbs = await this.prisma.managedDatabase.findMany({
        where: { ownerId },
        select: { dbName: true }
        });
        return dbs.map(db => db.dbName);
    }

     async deleteDatabase(dbName: string): Promise<void> {

        // Sicherheitsüberprüfung: Verhindere das Löschen von wichtigen Systemdatenbanken
        const systemDbs = ['postgres', 'template0', 'template1', 'rdsadmin'];
        if (systemDbs.includes(dbName.toLowerCase())) {
            throw new BadRequestException(`Das Löschen der System-Datenbank '${dbName}' ist nicht erlaubt.`);
        }

        const adminClient = await this.getAdminClient();

        try {
            // Bestehende Verbindungen zur zu löschenden Datenbank trennen
            const terminateResult = await adminClient.query(`
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = $1
                  AND pid <> pg_backend_pid();
            `, [dbName]);
            console.log(`Versuch, ${terminateResult.rowCount} Verbindungen zu '${dbName}' zu trennen.`);

            // Datenbank physisch löschen
            await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}";`);
            console.log(`Datenbank "${dbName}" physisch vom Server gelöscht (oder existierte nicht).`);

            // Eintrag aus der ManagedDatabase-Tabelle via Prisma entfernen
            try {
                await this.prisma.managedDatabase.delete({
                    where: {
                        dbName: dbName,
                    },
                });
                console.log(`Eintrag für "${dbName}" aus der Verwaltungstabelle (ManagedDatabase) entfernt.`);
            } catch (prismaError) {
                if (prismaError.code === 'P2025') { 
                    console.log(`Eintrag für "${dbName}" war nicht in der Verwaltungstabelle (oder bereits entfernt).`);
                } else {
                    console.warn(`Konnte den Eintrag für "${dbName}" nicht aus der Verwaltungstabelle entfernen: ${prismaError.message}`);
                }
            }
        } catch (error) {
            console.error(`Fehler beim Löschen der Datenbank '${dbName}' auf dem Server:`, error);
            if (error.code === '3D000') { 
                try {
                    await this.prisma.managedDatabase.deleteMany({ where: { dbName: dbName } });
                    console.log(`Eintrag für nicht gefundene DB "${dbName}" aus Verwaltungstabelle entfernt (falls vorhanden).`);
                } catch (prismaCleanupError) {
                    console.warn(`Zusätzlicher Fehler beim Aufräumen des Prisma-Eintrags für nicht gefundene DB ${dbName}: ${prismaCleanupError.message}`);
                }
                throw new NotFoundException(`Datenbank "${dbName}" wurde auf dem Server nicht gefunden.`); // NotFoundException needs to be imported as well
            }
            throw new InternalServerErrorException(`Ein Fehler ist beim Löschen der Datenbank "${dbName}" aufgetreten: ${error.message}`);
        } finally {
            if (adminClient) {
                await adminClient.end();
            }
        }
    }

    async checkQueryMatchesTask(taskDescription: string, sqlQuery: string): Promise<{ matches: boolean, aiAnswer: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new InternalServerErrorException('OPENAI_API_KEY nicht gesetzt.');
    }

    const prompt = `
    Aufgabenstellung: ${taskDescription}
    SQL-Query: ${sqlQuery}
    Antworte zuerst mit JA oder NEIN (ob die Query die Aufgabe korrekt löst), dann gib eine kurze Begründung (1-2 Sätze), warum die Query (nicht) passt.
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                messages: [
                    { role: 'system', content: 'Du bist ein SQL-Experte und bewertest, ob eine SQL-Query eine Aufgabenstellung korrekt löst.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Fehler: ${response.statusText}`);
        }

        const data = await response.json();
        const answer = data.choices[0].message.content.trim();
        const matches = answer.toUpperCase().startsWith('JA');
        return { matches, aiAnswer: answer };
    } catch (error) {
        throw new InternalServerErrorException('KI-Überprüfung fehlgeschlagen.');
    }
}

    async inspectDatabase(dbName: string): Promise<any[]> {
    const client = await this.getDatabaseClient(dbName);
    try {
    // Alle Tabellennamen holen
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    const result: any[] = [];
    for (const table of tables) {
      // Spaltennamen holen
      const columnsRes = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      const columns = columnsRes.rows.map(r => r.column_name);

      // Alle Zeilen holen (maximal 100)
      const rowsRes = await client.query(`SELECT * FROM "${table}" LIMIT 100`);
      result.push({
        name: table,
        columns,
        rows: rowsRes.rows
      });
    }
    return result;
  } finally {
    await client.end();
  }
}
}