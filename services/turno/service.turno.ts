"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getTurnos(){
    try {
        const texto = `
            SELECT 
            id, 
            nombre
            FROM turno
        `;
        
        const resultado = await client.query(texto);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getTurnos: ", error);
        throw error;
    };
};

export async function getTurnoNocturno() {
    try {
        const texto = `
            SELECT id
            FROM turno
            WHERE nombre = 'Nocturno'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTurnoNocturno: ", error);
        throw error;
    };
};

export async function getTurnoDiurno() {
    try {
        const texto = `
            SELECT id
            FROM turno
            WHERE nombre = 'Diurno'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getTurnoDiurno: ", error);
        throw error;
    };
};