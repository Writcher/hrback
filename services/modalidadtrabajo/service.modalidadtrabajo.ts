"use server"

import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getModalidadTrabajoCorrido() {
    return executeQuery(
        'getModalidadTrabajoCorrido',
        async () => {

            const getQuery = `
                SELECT id FROM modalidadtrabajo
                WHERE nombre = 'Jornada Completa'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {
                
                const insertQuery = `
                    INSERT INTO tipoausencia (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Jornada Completa']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getModalidadTrabajoPartido() {
    return executeQuery(
        'getModalidadTrabajoPartido',
        async () => {

            const getQuery = `
                SELECT id FROM modalidadtrabajo
                WHERE nombre = 'Jornada Partida'
            `;

            const getResult = await client.query(getQuery);

            if (getResult.rows.length === 0) {

                const insertQuery = `
                    INSERT INTO tipoausencia (nombre)
                    VALUES ($1)
                    ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
                    RETURNING id
                `;

                const insertResult = await client.query(insertQuery, ['Jornada Partida']);

                return insertResult.rows[0].id;
            };

            return getResult.rows[0].id;
        }
    );
};//

export async function getModalidadesTrabajo(){
    return executeQuery(
        'getModalidadesTrabajo',
        async () => {

            const getQuery = `
                SELECT *
                FROM modalidadtrabajo
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows
        }
    );
};//