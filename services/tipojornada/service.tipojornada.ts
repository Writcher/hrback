"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getTiposJornada(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM tipojornada
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getTiposJornada: ", error);
        throw error;
    };
};