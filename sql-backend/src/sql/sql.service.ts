import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';

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


    async executeSqlFile(sqlText: string) {

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
                },
            });
        } catch (prismaError) {
            console.warn(`Konnte ${newDbName} nicht zur ManagedDatabase Tabelle hinzufügen (existiert evtl. schon dort?): ${prismaError.message}`);
        }

        return { message: `Datenbank "${newDbName}" erfolgreich erstellt und befüllt.` };
    }


    async listDatabases(): Promise<string[]> {
        try {
            const managedDbs = await this.prisma.managedDatabase.findMany({
                select: {
                    dbName: true, 
                },
            });

            return managedDbs.map(db => db.dbName);

        } catch (error) {
            console.error('Fehler beim Auflisten der verwalteten Datenbanken via Prisma:', error);
            throw new InternalServerErrorException('Liste der verwalteten Datenbanken konnte nicht abgerufen werden.');
        }
    }
}
