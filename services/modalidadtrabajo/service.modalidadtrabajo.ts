"use server"

import { db } from "@vercel/postgres";

const client = db;

export async function getModalidadTrabajoCorrido() {
    try {
        const texto = `
            SELECT id
            FROM modalidadtrabajo
            WHERE nombre = 'Jornada Completa'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getModalidadTrabajoCorrido: ", error);
        throw error;
    };
};

export async function getModalidadTrabajoPartido() {
    try {
        const texto = `
            SELECT id
            FROM modalidadtrabajo
            WHERE nombre = 'Jornada Partida'
        `;

        const resultado = await client.query(texto);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en getModalidadTrabajoPartido: ", error);
        throw error;
    };
};

export async function getModalidadesTrabajo(){
    try {
        const texto = `
            SELECT 
            id,
            nombre 
            FROM modalidadtrabajo
        `;

        const resultado = await client.query(texto);

        return resultado.rows;
    } catch (error) {
        console.error("Error en getModalidadesTrabajo: ", error);
        throw error;
    };
};