import { Injectable } from '@nestjs/common';

@Injectable()
export class SqlService {
    constructor() { }

    async executeSqlFile(sqlText: string): Promise<any> {

        // Hier dann die Logik zum Ausführen der SQL-Anweisung implementieren:

    }
}
