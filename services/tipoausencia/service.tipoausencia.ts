"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getTiposAusencia(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM tipoausencia
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposAusencia: ", error);
        throw error;
    };
};