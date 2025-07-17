import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostgresDbDto, CreatePostgresDbResponse } from './create-database.dto';
import { ExecuteManipulationDto, ManipulationResult, DatabaseCopyInfo } from './manipulation-types.dto';

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

    async checkQueryMatchesTask(
    taskDescription: string,
    sqlQuery: string,
    dbName: string
): Promise<{ matches: boolean, aiAnswer: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new InternalServerErrorException('OPENAI_API_KEY nicht gesetzt.');
    }

    // Hole das Schema der Datenbank
    const schema = await this.inspectDatabase(dbName);

    // Schema als String für den Prompt
    const schemaString = JSON.stringify(schema, null, 2);

    const prompt = `
Aufgabenstellung: ${taskDescription}
SQL-Query: ${sqlQuery}
Datenbankschema: ${schemaString}
Antworte zuerst mit JA oder NEIN (ob die Query die Aufgabe korrekt löst), dann gib eine kurze Begründung (1-2 Sätze), warum die Query (nicht) passt. Achte besonders auf die Verwendung der richtigen Tabellen- und Spaltennamen.
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
                max_tokens: 300,
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
    // Extrahiert die SQL-Query aus der generierten Aufgabenbeschreibung
    private extractSqlQuery(taskDescription: string): string {
        const sqlRegex = /```sql\n([\s\S]*?)\n```/;
        const match = taskDescription.match(sqlRegex);
        return match ? match[1].trim() : '';
    }
    
    // Generiert eine SQL-Aufgabe basierend auf dem Thema und Schwierigkeitsgrad
    async generateTask(topic: string, difficulty: string, database: string, noise: string): Promise<{ taskDescription: string, sqlQuery: string }> {
        
        // 1) Schema auslesen (Tabellen & Spalten)
        const schemaInfo = await this.inspectDatabase(database);

        // 2) In eine Prompt-kompatible Form bringen
        const schemaDesc = schemaInfo
            .map(tbl => `${tbl.name}(${tbl.columns.join(', ')})`)
            .join('\n');

        // 3) Prompt bauen
        const prompt = `
        Schema der Datenbank "${database}":
        ${schemaDesc}

        Thema: ${topic}
        Schwierigkeitsgrad: ${difficulty}

        Interner Seed-Wert: ${noise} (nicht anzeigen – nur zur Variation)

        Erstelle eine **vollständig neue und einzigartige** SQL-Übungsaufgabe, die **nicht nur minimale Variationen** einer vorherigen Aufgabe darstellt. 
        Vermeide Wiederholungen und sorge für kreative Vielfalt innerhalb des angegebenen Themas.

        **WICHTIG:** Gib **nur** die reine Aufgaben­beschreibung zurück, **ohne** ein vorangestelltes "**Aufgabe:**" oder andere Überschriften.  
        Die SQL-Abfrage packst du bitte in einen \`\`\`sql …\`\`\`-Block.
        **Hinweis:** Die SQL-Lösung muss für **PostgreSQL** kompatibel sein.
        `.trim();

        // 4) Request an OpenAI
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException('OPENAI_API_KEY nicht gesetzt.');
        }
        
        // try-catch Block für die API-Anfrage
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
                        { role: 'system', content: 'Du bist ein hilfreicher SQL-Lehrer.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 500,
                    temperature: 0
                })
            });
            // Überprüfen, ob die Antwort erfolgreich war
            if (!response.ok) throw new InternalServerErrorException(`OpenAI-Fehler: ${response.statusText}`);
            // Antwort verarbeiten
            const data = await response.json();
            const taskDescription = data.choices[0].message.content.trim();
            // SQL-Query aus der Antwort extrahieren
            const sqlQuery = this.extractSqlQuery(taskDescription);
            return { taskDescription, sqlQuery };
        } catch (error) {
            throw new InternalServerErrorException('KI-Aufgabenerstellung fehlgeschlagen.');
        }
}

    // Neue Methode für manuelle PostgreSQL-Datenbank-Erstellung
  async createPostgresDatabase(createDbDto: CreatePostgresDbDto, userId: number): Promise<CreatePostgresDbResponse> {
    const { dbName, description, sqlScript } = createDbDto;

    // Validierung des Datenbanknamens
    if (!this.isValidPostgresDbName(dbName)) {
      throw new BadRequestException('Ungültiger Datenbankname. Muss mit Buchstabe beginnen und darf nur Buchstaben, Zahlen und Unterstriche enthalten.');
    }

    // Überprüfe, ob Datenbank bereits existiert (in der Verwaltungstabelle)
    const existingDatabase = await this.prisma.managedDatabase.findUnique({
      where: { dbName: dbName }
    });

    if (existingDatabase) {
      throw new BadRequestException('Eine Datenbank mit diesem Namen existiert bereits');
    }

    // Validiere SQL-Script auf Sicherheit  
    if (!this.isValidPostgresSqlScript(sqlScript)) {
      throw new BadRequestException('SQL-Script enthält nicht erlaubte Befehle. Nur CREATE TABLE, INSERT, UPDATE und SELECT sind erlaubt.');
    }

    let adminClient: Client | null = null;
    let newDbClient: Client | null = null;

    try {
      // 1. PostgreSQL-Datenbank erstellen
      adminClient = await this.getAdminClient();
      
      // Escape den Datenbanknamen für PostgreSQL
      const escapedDbName = `"${dbName}"`;
      await adminClient.query(`CREATE DATABASE ${escapedDbName}`);

      console.log(`PostgreSQL database ${dbName} created successfully`);

      // 2. Verbindung zur neuen Datenbank herstellen
      newDbClient = new Client({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbName,
      });
      await newDbClient.connect();

      // 3. SQL-Script in der neuen Datenbank ausführen
      const statements = this.splitPostgresSqlStatements(sqlScript);
      
      console.log(`Executing ${statements.length} SQL statements in database ${dbName}`);

      await newDbClient.query('BEGIN');

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement.length > 0) {
          try {
            console.log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
            await newDbClient.query(statement);
          } catch (stmtError) {
            throw new Error(`SQL Statement Error (Statement ${i + 1}): ${stmtError.message}\nStatement: ${statement}`);
          }
        }
      }

      await newDbClient.query('COMMIT');

      // 4. Datenbank in der Verwaltungstabelle registrieren
      await this.prisma.managedDatabase.create({
        data: {
          dbName: dbName,
          ownerId: userId,
          createdAt: new Date(),
        }
      });

      // 5. Tabellennamen aus Script extrahieren für Response
      const tableNames = this.extractTableNamesFromScript(sqlScript);

      return {
        dbName: dbName,
        success: true,
        message: `PostgreSQL-Datenbank '${dbName}' wurde erfolgreich erstellt`,
        tablesCreated: tableNames
      };

    } catch (error) {
      // Bei Fehler: Cleanup und rollback
      try {
        if (newDbClient) {
          await newDbClient.query('ROLLBACK');
        }
      } catch (rollbackError) {
        console.warn('Rollback failed:', rollbackError);
      }

      // Versuche die PostgreSQL-Datenbank zu löschen falls erstellt
      try {
        if (adminClient) {
          const escapedDbName = `"${dbName}"`;
          await adminClient.query(`DROP DATABASE IF EXISTS ${escapedDbName}`);
          console.log(`Cleaned up database ${dbName} after error`);
        }
      } catch (cleanupError) {
        console.warn('Database cleanup failed:', cleanupError);
      }

      // Entferne Eintrag aus Verwaltungstabelle falls erstellt
      try {
        await this.prisma.managedDatabase.delete({
          where: { dbName: dbName }
        });
      } catch (prismaCleanupError) {
        console.warn('Prisma cleanup failed:', prismaCleanupError);
      }

      console.error('Database creation error:', error);
      throw new BadRequestException(`Fehler beim Erstellen der PostgreSQL-Datenbank: ${error.message}`);
    } finally {
      if (adminClient) {
        await adminClient.end();
      }
      if (newDbClient) {
        await newDbClient.end();
      }
    }
  }

  // Hilfsmethoden für PostgreSQL-Datenbank-Erstellung
  private isValidPostgresDbName(name: string): boolean {
    const pattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return pattern.test(name) && name.length >= 3 && name.length <= 63; // PostgreSQL limit
  }

  private isValidPostgresSqlScript(script: string): boolean {
    const lowerScript = script.toLowerCase().trim();
    
    // Verbotene Befehle - spezifisch für PostgreSQL
    const forbiddenCommands = [
      /\bdrop\s+(database|schema|user|role)/i,
      /\bdelete\s+/i,
      /\btruncate\s+/i,
      /\balter\s+(database|user|role)/i,
      /\bgrant\s+/i,
      /\brevoke\s+/i,
      /\bcreate\s+(user|role|database|schema)/i,
      /\bexec\s+/i,
      /\bexecute\s+/i,
      /\bcopy\s+/i,
      /\b\\copy\s+/i
    ];
    
    // Überprüfe auf verbotene Befehle
    for (const pattern of forbiddenCommands) {
      if (pattern.test(lowerScript)) {
        console.warn('Forbidden PostgreSQL command found:', pattern);
        return false;
      }
    }

    // Teile das Script in SQL-Statements auf
    const statements = this.splitPostgresSqlStatements(lowerScript);
    
    // Erlaubte Statement-Typen für PostgreSQL
    const allowedStatementPatterns = [
      /^\s*create\s+table\s+/i,
      /^\s*create\s+index\s+/i,
      /^\s*create\s+sequence\s+/i,
      /^\s*insert\s+into\s+/i,
      /^\s*update\s+.*\s+set\s+/i,
      /^\s*select\s+/i,
      /^\s*with\s+/i, // CTE (Common Table Expressions)
      /^\s*alter\s+table\s+.*\s+add\s+/i, // Nur ADD erlaubt
      /^\s*--/i, // Kommentare
      /^\s*\/\*/i, // Kommentare
      /^\s*$/i // Leere Statements
    ];

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement.length === 0) continue;
      
      // Entferne Kommentare für die Validierung
      const cleanStatement = trimmedStatement
        .replace(/--.*$/gm, '') // Einzeilige Kommentare
        .replace(/\/\*[\s\S]*?\*\//g, '') // Mehrzeilige Kommentare
        .trim();
      
      if (cleanStatement.length === 0) continue;
      
      let isAllowed = false;
      for (const pattern of allowedStatementPatterns) {
        if (pattern.test(cleanStatement)) {
          isAllowed = true;
          break;
        }
      }
      
      if (!isAllowed) {
        console.warn('Potentially unsafe PostgreSQL statement:', cleanStatement.substring(0, 100));
        return false;
      }
    }
    
    return true;
  }

  private splitPostgresSqlStatements(script: string): string[] {
    // Ähnlich wie die SQLite-Version, aber angepasst für PostgreSQL
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    for (let i = 0; i < script.length; i++) {
      const char = script[i];
      const nextChar = script[i + 1];
      
      // Handle PostgreSQL dollar-quoted strings
      if (!inString && !inDollarQuote && char === '$') {
        const dollarMatch = script.substring(i).match(/^\$([^$]*)\$/);
        if (dollarMatch) {
          inDollarQuote = true;
          dollarTag = dollarMatch[1];
          currentStatement += dollarMatch[0];
          i += dollarMatch[0].length - 1;
          continue;
        }
      }
      
      if (inDollarQuote) {
        currentStatement += char;
        const endTag = `$${dollarTag}$`;
        if (script.substring(i).startsWith(endTag)) {
          currentStatement += endTag.substring(1);
          i += endTag.length - 1;
          inDollarQuote = false;
          dollarTag = '';
        }
        continue;
      }
      
      // Handle regular string literals
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentStatement += char;
      } else if (inString && char === stringChar) {
        // Check for escaped quotes
        if (nextChar === stringChar) {
          currentStatement += char + nextChar;
          i++; // Skip next character
        } else {
          inString = false;
          stringChar = '';
          currentStatement += char;
        }
      } else if (inString) {
        currentStatement += char;
      } else {
        // Check for statement separator
        if (char === ';') {
          const statement = currentStatement.trim();
          if (statement.length > 0) {
            statements.push(statement);
          }
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
    }
    
    // Add the last statement if there's one
    const lastStatement = currentStatement.trim();
    if (lastStatement.length > 0) {
      statements.push(lastStatement);
    }
    
    return statements;
  }

  private extractTableNamesFromScript(sqlScript: string): string[] {
    const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
    const matches: string[] = [];
    let match;
    
    while ((match = tablePattern.exec(sqlScript)) !== null) {
      // match[2] ist der Tabellenname, match[1] ist das Schema (falls vorhanden)
      const tableName = match[2] || match[1];
      if (tableName) {
        matches.push(tableName);
      }
    }
    
    return matches;
  }

  // Neue Methode für PostgreSQL-Schema-Inspektion
  async inspectPostgresDatabase(dbName: string, userId: number): Promise<any> {
    // Zugriffsprüfung: Nutzer muss Owner sein oder Datenbank muss in Worksheet verwendet werden
    const managedDb = await this.prisma.managedDatabase.findUnique({
      where: { dbName: dbName }
    });

    let hasAccess = false;
    if (managedDb && managedDb.ownerId === userId) {
      hasAccess = true;
    } else {
      // Prüfen, ob die Datenbank in einem Worksheet verwendet wird
      const worksheet = await this.prisma.worksheet.findFirst({
        where: { database: dbName }
      });
      if (worksheet) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new NotFoundException(`Datenbank '${dbName}' wurde nicht gefunden oder ist nicht verfügbar.`);
    }

    const client = await this.getDatabaseClient(dbName);
    try {
      // Database-Level Information
      const dbInfoRes = await client.query(`
        SELECT 
          current_database() as database_name,
          current_user as current_user,
          version() as version
      `);

      // Alle Tabellennamen und grundlegende Informationen holen
      const tablesRes = await client.query(`
        SELECT 
          schemaname,
          tablename,
          tableowner,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      const tables = tablesRes.rows.map(r => ({
        schema: r.schemaname,
        name: r.tablename,
        owner: r.tableowner,
        size: r.size
      }));

      const result: any = {
        databaseInfo: dbInfoRes.rows[0],
        tables: [],
        indexes: [],
        sequences: []
      };

      // Für jede Tabelle detaillierte Informationen holen
      for (const table of tables) {
        // Spaltennamen und Typen holen
        const columnsRes = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table.name]);

        // Constraints holen (Primary Keys, Foreign Keys, etc.)
        const constraintsRes = await client.query(`
          SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = $1 AND tc.table_schema = 'public'
          ORDER BY tc.constraint_type, kcu.column_name
        `, [table.name]);

        // Indexes für diese Tabelle holen
        const indexesRes = await client.query(`
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE tablename = $1 AND schemaname = 'public'
          ORDER BY indexname
        `, [table.name]);

        // Anzahl der Zeilen in der Tabelle
        const rowCountRes = await client.query(`SELECT COUNT(*) as count FROM "${table.name}"`);

        // Sample-Daten holen (erste 5 Zeilen)
        const sampleDataRes = await client.query(`SELECT * FROM "${table.name}" LIMIT 5`);

        result.tables.push({
          ...table,
          columns: columnsRes.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            maxLength: col.character_maximum_length,
            precision: col.numeric_precision,
            scale: col.numeric_scale
          })),
          constraints: constraintsRes.rows.map(cons => ({
            name: cons.constraint_name,
            type: cons.constraint_type,
            column: cons.column_name,
            foreignTable: cons.foreign_table_name,
            foreignColumn: cons.foreign_column_name
          })),
          indexes: indexesRes.rows.map(idx => ({
            name: idx.indexname,
            definition: idx.indexdef
          })),
          rowCount: parseInt(rowCountRes.rows[0].count),
          sampleData: sampleDataRes.rows
        });

        // Indexes zur globalen Liste hinzufügen
        result.indexes.push(...indexesRes.rows.map(idx => ({
          table: table.name,
          name: idx.indexname,
          definition: idx.indexdef
        })));
      }

      // Sequences holen
      const sequencesRes = await client.query(`
        SELECT 
          sequence_name,
          data_type,
          start_value,
          minimum_value,
          maximum_value,
          increment,
          cycle_option
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
        ORDER BY sequence_name
      `);

      result.sequences = sequencesRes.rows.map(seq => ({
        name: seq.sequence_name,
        type: seq.data_type,
        startValue: seq.start_value,
        minValue: seq.minimum_value,
        maxValue: seq.maximum_value,
        increment: seq.increment,
        cycle: seq.cycle_option === 'YES'
      }));

      return result;
    } finally {
      await client.end();
    }
  }
<<<<<<< Updated upstream
  
  async evaluateAnswerWithAI(aufgabe: string, antwort: string, dbName: string): Promise<{ feedback: string; korrekt: boolean }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY nicht gesetzt.');
    }

    const schema = await this.inspectDatabase(dbName);
    const schemaString = JSON.stringify(schema, null, 2);


    const prompt = `
      Aufgabe:
      ${aufgabe}

      Antwort des Studenten:
      ${antwort}

      Datenbankschema:
      ${schemaString}

      Du bist ein Tutor und gibst dem Studenten direkt Feedback zu seiner Antwort. 
      Sprich den Studenten direkt an ("du", "deine Antwort"). Bewerte die Antwort in Bezug auf die Aufgabe und das Datenbankschema. 
      Gib ein präzises Feedback in 2–3 Sätzen. Schreibe am Ende **nur** "KORREKT" oder "NICHT KORREKT" auf einer eigenen Zeile.
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
            { role: 'system', content: 'Du bist ein Tutor für Datenbanksysteme.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Fehler: ${response.statusText}`);
      }

      const data = await response.json();
      const feedback = data.choices[0].message.content.trim();

      const korrekt = feedback.toUpperCase().includes('KORREKT') &&
                    !feedback.toUpperCase().includes('NICHT KORREKT');

      return { feedback, korrekt };
    } catch (error) {
      console.error('Fehler bei OpenAI Anfrage:', error);
      throw new InternalServerErrorException('KI-Auswertung fehlgeschlagen.');
    }
  }
  
  async evaluateSubmissionWithAI(aufgaben: {
    aufgabe: string;
    antwort: string;
    feedback: string;
    bestanden: boolean;
  }[]): Promise<{ feedback: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY nicht gesetzt.');
    }

    const zusammenfassung = aufgaben.map((a, i) => {
      return `Aufgabe ${i + 1}:
  Aufgabe: ${a.aufgabe}
  Antwort: ${a.antwort}
  Feedback: ${a.feedback}
  Status: ${a.bestanden ? 'bestanden' : 'nicht bestanden'}`;
    }).join('\n\n---\n\n');

    const prompt = `
  Du bist ein Tutor für Datenbanksysteme. Basierend auf den untenstehenden Aufgaben und ihrem Feedback sollst du ein präzises, motivierendes Gesamtfeedback an den Studenten schreiben. Sprich den Studenten direkt an ("du", "deine Abgabe").

  Am Ende schreibe NUR "BESTANDEN" oder "NICHT BESTANDEN" auf einer eigenen Zeile.

  ${zusammenfassung}
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
            { role: 'system', content: 'Du bist ein Tutor für SQL und Datenbanksysteme.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Fehler: ${response.statusText}`);
      }

      const data = await response.json();
      const feedback = data.choices[0].message.content.trim();

      return { feedback };
    } catch (error) {
      console.error('Fehler bei Gesamtbewertung KI:', error);
      throw new InternalServerErrorException('KI-Auswertung für Gesamtbewertung fehlgeschlagen.');
    }
  }



=======

  // ===== NEUE METHODEN FÜR DATENBANKMANIPULATION =====

  // Hauptmethode für Datenbankmanipulation mit automatischer Kopie-Erstellung
  async executeManipulation(dto: ExecuteManipulationDto, userId: number): Promise<ManipulationResult> {
    const { query, database, resetDatabase } = dto;

    // Input-Validierung
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('SQL Query darf nicht leer sein.');
    }

    if (!database || database.trim().length === 0) {
      throw new BadRequestException('Datenbankname darf nicht leer sein.');
    }

    // Zugriffsprüfung wie bei executeQuery
    const hasAccess = await this.checkDatabaseAccess(database, userId);
    if (!hasAccess) {
      throw new NotFoundException(`Datenbank '${database}' wurde nicht gefunden oder ist nicht verfügbar.`);
    }

    // Validiere Manipulation Query
    const queryType = this.validateManipulationQuery(query);

    // Bei Reset-Anfrage: Kopie zurücksetzen
    if (resetDatabase) {
      await this.resetDatabaseCopy(database, userId);
    }

    // Stelle sicher, dass eine Kopie existiert
    const copyDbName = await this.ensureDatabaseCopy(database, userId);

    let client: Client | null = null;
    const startTime = Date.now();

    try {
      // Verbindung zur Kopie-Datenbank herstellen
      client = await this.getDatabaseClient(copyDbName);

      // Query mit Timeout ausführen
      const result = await Promise.race([
        client.query(query),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query Timeout')), 30000)
        )
      ]) as any;

      const executionTime = Date.now() - startTime;

      // Update lastUsed der Kopie
      await this.updateCopyLastUsed(copyDbName);

      // Erstelle Basis-Response
      const response: ManipulationResult = {
        success: true,
        message: `${queryType}-Operation erfolgreich ausgeführt`,
        affectedRows: result.rowCount || 0,
        executionTime,
        queryType,
        resetPerformed: resetDatabase || false
      };

      // Bei SELECT-Queries: Auch Daten zurückgeben
      if (queryType === 'SELECT') {
        response.columns = result.fields ? result.fields.map((field: any) => field.name) : [];
        response.rows = result.rows || [];
        response.message = `SELECT-Operation erfolgreich ausgeführt - ${response.affectedRows} Zeilen gefunden`;
      }

      return response;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Manipulation Query-Fehler nach ${executionTime}ms:`, error);

      if (error.message === 'Query Timeout') {
        throw new BadRequestException('Query-Timeout: Die Abfrage dauerte zu lange (max. 30 Sekunden).');
      }

      // PostgreSQL-spezifische Fehlerbehandlung
      if (error.code) {
        switch (error.code) {
          case '42P01':
            throw new BadRequestException(`Tabelle oder Relation existiert nicht: ${error.message}`);
          case '42703':
            throw new BadRequestException(`Spalte existiert nicht: ${error.message}`);
          case '42601':
            throw new BadRequestException(`SQL-Syntax-Fehler: ${error.message}`);
          case '23505':
            throw new BadRequestException(`Eindeutigkeitsbeschränkung verletzt: ${error.message}`);
          case '23503':
            throw new BadRequestException(`Fremdschlüssel-Beschränkung verletzt: ${error.message}`);
          case '23502':
            throw new BadRequestException(`NULL-Wert in NOT NULL Spalte: ${error.message}`);
          default:
            throw new BadRequestException(`Datenbankfehler: ${error.message}`);
        }
      }

      throw new InternalServerErrorException(`Unerwarteter Fehler bei der Manipulation: ${error.message}`);
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  // Validiert Manipulation Queries
  private validateManipulationQuery(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' {
    const normalizedQuery = query.trim().toLowerCase();
    
    // Erlaubte Befehle (sowohl Read-Only als auch Manipulation)
    const allowedCommands = [
      { pattern: /^\s*select\s+/i, type: 'SELECT' },
      { pattern: /^\s*insert\s+into\s+/i, type: 'INSERT' },
      { pattern: /^\s*update\s+/i, type: 'UPDATE' },
      { pattern: /^\s*delete\s+from\s+/i, type: 'DELETE' },
      { pattern: /^\s*create\s+(table|index|sequence)\s+/i, type: 'CREATE' },
      { pattern: /^\s*alter\s+table\s+/i, type: 'ALTER' },
      { pattern: /^\s*drop\s+(table|index|sequence)\s+/i, type: 'DROP' }
    ];

    // Verbotene Befehle (System-relevante Operationen)
    const forbiddenCommands = [
      /\bcreate\s+(database|schema|user|role)\b/i,
      /\bdrop\s+(database|schema|user|role)\b/i,
      /\bgrant\s+/i,
      /\brevoke\s+/i,
      /\bcopy\s+/i,
      /\b\\copy\s+/i,
      /\btruncate\s+/i
    ];

    // Prüfe auf verbotene Befehle
    for (const pattern of forbiddenCommands) {
      if (pattern.test(normalizedQuery)) {
        throw new BadRequestException(`SQL-Befehl ist nicht erlaubt. Systemrelevante Operationen sind in der Lernumgebung nicht gestattet.`);
      }
    }

    // Bestimme Query-Typ
    for (const { pattern, type } of allowedCommands) {
      if (pattern.test(normalizedQuery)) {
        return type as any;
      }
    }

    throw new BadRequestException('SQL-Befehl ist nicht erkannt oder nicht erlaubt. SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE und DROP TABLE sind gestattet.');
  }

  // Stelle sicher, dass eine Datenbank-Kopie existiert
  private async ensureDatabaseCopy(originalDatabase: string, userId: number): Promise<string> {
    // Prüfe, ob bereits eine Kopie existiert
    let existingCopy = await this.prisma.databaseCopy.findFirst({
      where: {
        originalDatabase,
        userId,
        expiresAt: { gt: new Date() } // Noch nicht abgelaufen
      }
    });

    if (existingCopy) {
      return existingCopy.copyDatabase;
    }

    // Erstelle neue Kopie
    const copyDbName = `${originalDatabase}_copy_${userId}_${Date.now()}`;
    
    try {
      // Kopiere die Datenbank
      await this.createDatabaseCopy(originalDatabase, copyDbName);
      
      // Registriere die Kopie
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4); // Kopie läuft nach 4 Stunden ab

      await this.prisma.databaseCopy.create({
        data: {
          originalDatabase,
          copyDatabase: copyDbName,
          userId,
          expiresAt
        }
      });

      console.log(`Database copy created: ${copyDbName} for user ${userId}`);
      return copyDbName;

    } catch (error) {
      console.error('Error creating database copy:', error);
      throw new InternalServerErrorException(`Fehler beim Erstellen der Datenbank-Kopie: ${error.message}`);
    }
  }

  // Erstellt eine physische Kopie der PostgreSQL-Datenbank
  private async createDatabaseCopy(originalDb: string, copyDb: string): Promise<void> {
    const adminClient = await this.getAdminClient();
    
    try {
      // Beende alle Verbindungen zur Original-Datenbank (für den Kopierprozess)
      await adminClient.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [originalDb]);

      // Erstelle Kopie mit CREATE DATABASE ... WITH TEMPLATE
      await adminClient.query(`CREATE DATABASE "${copyDb}" WITH TEMPLATE "${originalDb}"`);

    } finally {
      await adminClient.end();
    }
  }

  // Prüft Datenbankzugriff (wie in executeQuery)
  private async checkDatabaseAccess(databaseName: string, userId: number): Promise<boolean> {
    const managedDb = await this.prisma.managedDatabase.findUnique({
      where: { dbName: databaseName }
    });

    if (managedDb && managedDb.ownerId === userId) {
      return true;
    }

    // Prüfen, ob die Datenbank in einem Worksheet verwendet wird
    const worksheet = await this.prisma.worksheet.findFirst({
      where: { database: databaseName }
    });

    return !!worksheet;
  }

  // Aktualisiert lastUsed einer Kopie
  private async updateCopyLastUsed(copyDbName: string): Promise<void> {
    try {
      await this.prisma.databaseCopy.update({
        where: { copyDatabase: copyDbName },
        data: { lastUsed: new Date() }
      });
    } catch (error) {
      console.warn('Failed to update copy lastUsed:', error);
    }
  }

  // Gibt Informationen über die Datenbank-Kopie zurück
  async getDatabaseCopyInfo(originalDatabase: string, userId: number): Promise<DatabaseCopyInfo | null> {
    const copy = await this.prisma.databaseCopy.findFirst({
      where: {
        originalDatabase,
        userId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!copy) {
      return null;
    }

    return {
      originalDatabase: copy.originalDatabase,
      copyDatabase: copy.copyDatabase,
      userId: copy.userId,
      createdAt: copy.createdAt,
      lastUsed: copy.lastUsed,
      expiresAt: copy.expiresAt
    };
  }

  // Setzt eine Datenbank-Kopie zurück
  async resetDatabaseCopy(originalDatabase: string, userId: number): Promise<{ success: boolean, message: string }> {
    // Finde und lösche bestehende Kopie
    const existingCopy = await this.prisma.databaseCopy.findFirst({
      where: {
        originalDatabase,
        userId
      }
    });

    if (existingCopy) {
      // Lösche physische Datenbank
      try {
        const adminClient = await this.getAdminClient();
        await adminClient.query(`DROP DATABASE IF EXISTS "${existingCopy.copyDatabase}"`);
        await adminClient.end();
      } catch (error) {
        console.warn('Failed to drop copy database:', error);
      }

      // Entferne Eintrag aus Datenbank
      await this.prisma.databaseCopy.delete({
        where: { id: existingCopy.id }
      });
    }

    return {
      success: true,
      message: 'Datenbank-Kopie wurde zurückgesetzt. Bei der nächsten Manipulation wird eine neue Kopie erstellt.'
    };
  }

  // Räumt abgelaufene Kopien auf
  async cleanupExpiredCopies(): Promise<{ deleted: number, message: string }> {
    const expiredCopies = await this.prisma.databaseCopy.findMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    let deletedCount = 0;
    const adminClient = await this.getAdminClient();

    try {
      for (const copy of expiredCopies) {
        try {
          // Lösche physische Datenbank
          await adminClient.query(`DROP DATABASE IF EXISTS "${copy.copyDatabase}"`);
          
          // Entferne Eintrag
          await this.prisma.databaseCopy.delete({
            where: { id: copy.id }
          });
          
          deletedCount++;
          console.log(`Cleaned up expired copy: ${copy.copyDatabase}`);
        } catch (error) {
          console.warn(`Failed to cleanup copy ${copy.copyDatabase}:`, error);
        }
      }
    } finally {
      await adminClient.end();
    }

    return {
      deleted: deletedCount,
      message: `${deletedCount} abgelaufene Datenbank-Kopien wurden aufgeräumt.`
    };
  }
>>>>>>> Stashed changes
}
