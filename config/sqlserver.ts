"use server"

import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

function parseConnectionString(connectionString: string): sql.config {

    const withoutProtocol = connectionString.replace('mssql://', '');
    
    const [credentials, serverAndRest] = withoutProtocol.split('@');
    const [user, password] = credentials.split(':');
    
    const [serverWithPort, databaseAndParams] = serverAndRest.split('/');
    const [server, port] = serverWithPort.split(':');
    
    const [database, paramsString] = databaseAndParams.split('?');
    
    const params = new URLSearchParams(paramsString);
    
    return {
        user: user,
        password: password,
        server: server,
        port: port ? parseInt(port) : 1433,
        database: database,
        options: {
            encrypt: params.get('encrypt') === 'true',
            trustServerCertificate: params.get('trustServerCertificate') === 'true'
        }
    };
};

export async function getConnection() {
    if (pool) return pool;
    
    try {
        const config = parseConnectionString(process.env.SQLSERVER_URL!);

        pool = await sql.connect(config);

        return pool;
    } catch (error) {
        console.error('Error conectando a SQL Server:', error);
        throw error;
    };
};