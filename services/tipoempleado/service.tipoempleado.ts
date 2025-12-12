"use server";

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getTiposEmpleado(){
    return executeQuery(
        'getTiposEmpleado',
        async () => {

            const getQuery = `
                SELECT id, nombre
                FROM tipoempleado
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows
        }
    );
};//

export async function getTipoEmpleadoMensualizado(){
    return executeQuery(
        'getTipoEmpleadoMensualizado',
        async () => {

            const getQuery = `
                SELECT id FROM tipoempleado
                WHERE nombre = 'Mensualizado'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO tipoempleado (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Mensualizado']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getTipoEmpleadoJornalero(){
    return executeQuery(
        'getTipoEmpleadoJornalero',
        async () => {

            const getQuery = `
                SELECT id FROM tipoempleado
                WHERE nombre = 'Jornalero'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO tipoempleado (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Jornalero']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//