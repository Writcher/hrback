"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosJornada(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM estadojornada
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getEstadosJornada: ", error);
        throw error;
    };
};