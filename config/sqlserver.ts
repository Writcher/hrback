"use server"

import { executeQuery } from '@/lib/utils/database';
import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
    return executeQuery(
        'getConnection',
        async () => {

            if (pool) return pool;

            const config: sql.config = {
                user: process.env.SQLSERVER_USER!,
                password: process.env.SQLSERVER_PASSWORD!,
                server: process.env.SQLSERVER_SERVER!,
                port: process.env.SQLSERVER_PORT ? parseInt(process.env.SQLSERVER_PORT) : 1433,
                database: process.env.SQLSERVER_DATABASE!,
                options: {
                    encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
                    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true'
                }
            };

            pool = await sql.connect(config);

            return pool;
        }
    );
};
