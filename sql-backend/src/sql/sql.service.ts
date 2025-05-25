import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
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
}