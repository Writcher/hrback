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

export async function getTipoJornadaAusencia() {
    try {
        const texto = `
            SELECT id
            FROM tipojornada
            WHERE nombre = 'Ausencia'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTipoJornadaAusencia: ", error);
        throw error;
    };
};