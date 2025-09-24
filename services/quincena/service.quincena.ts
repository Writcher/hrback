"use server";

import { getQuincenaByMesParametros, insertQuincenaParametros } from "@/lib/types/quincena";
import { db } from "@vercel/postgres"

const client = db;

export async function getQuincenaByMes(parametros: getQuincenaByMesParametros) {
    try {
        const texto = `
            SELECT id
            FROM quincena
            WHERE quincena = $1 AND id_mes = $2
        `;

        const valores = [parametros.quincena, parametros.id_mes];

        const resultado = await client.query(texto, valores);

        return resultado;
    } catch (error) {
        console.error("Error en getQuincenaByMes: ", error);
        throw error;
    };
};

export async function insertQuincena(parametros: insertQuincenaParametros) {
    try {
        const texto = `
            INSERT INTO quincena (quincena, id_mes)
            VALUES ($1, $2)
            RETURNING id
        `;

        const valores = [parametros.quincena, parametros.id_mes];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertQuincena: ", error);
        throw error;
    };
};