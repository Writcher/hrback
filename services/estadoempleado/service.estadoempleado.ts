"use server";

import { db } from "@vercel/postgres";

const client = db;

export async function getEstadosEmpleado(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM estadoempleado
        `;
        const resultado = await client.query(texto);
        return resultado.rows;
    } catch (error) {
        console.error("Error en getEstadosEmpleado: ", error);
        throw error;
    };
};