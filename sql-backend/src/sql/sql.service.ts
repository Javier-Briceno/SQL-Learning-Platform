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

    }
}
