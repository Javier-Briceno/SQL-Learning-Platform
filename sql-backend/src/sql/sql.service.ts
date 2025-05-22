import { Injectable } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class SqlService {
    constructor() { }

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

    }
}
