"use server";

import { db } from "@vercel/postgres";
import { getMesByMesParametros, insertMesParametros } from "@/lib/types/mes";

const client = db;

export async function getMeses(){
    try {
        const texto = `
            SELECT 
            id,
            mes, 
            id_año
            FROM mes
            ORDER BY mes, id_año
        `;

        const resultado = await client.query(texto);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getMeses: ", error);
        throw error;
    };
};

export async function getMesByMes(parametros: getMesByMesParametros) {
    try {
        const texto = `
            SELECT id
            FROM mes
            WHERE mes = $1 AND id_año = $2
        `;

        const valores = [parametros.mes, parametros.id_año];

        const resultado = await client.query(texto, valores);

        return resultado;
    } catch (error) {
        console.error("Error en getMesByMes: ", error);
        throw error;
    };
};

export async function insertMes(parametros: insertMesParametros) {
    try {
        const texto = `
            INSERT INTO mes (mes, id_año)
            VALUES ($1, $2)
            RETURNING id
        `;

        const valores = [parametros.mes, parametros.id_año];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertMes: ", error);
        throw error;
    };
};