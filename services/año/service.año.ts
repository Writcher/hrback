"use server";

import { db } from "@vercel/postgres";
import { getAñoByValorParametros, insertAñoParametros } from "../../lib/types/año";

const client = db;

export async function getAñoByValor(parametros: getAñoByValorParametros) {
    try {
        const texto = `
            SELECT valor
            FROM año
            WHERE valor = $1
        `;

        const valores = [parametros.valor];

        const resultado = await client.query(texto, valores);

        return resultado;
    } catch (error) {
        console.error("Error en getAñoByValor: ", error);
        throw error;
    };
};

export async function insertAño(parametros: insertAñoParametros) {
    try {
        const texto = `
            INSERT INTO "año" (valor)
            VALUES ($1)
            RETURNING valor
        `;

        const valores = [parametros.valor];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].valor;
    } catch (error) {
        console.error("Error en insertAño: ", error);
        throw error;
    };
};