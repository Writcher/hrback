"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getMeses(){
    try {
        const texto = `
            SELECT 
            id,
            mes, 
            id_año
            FROM mes
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getMeses: ", error);
        throw error;
    };
};