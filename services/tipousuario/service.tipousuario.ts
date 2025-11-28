"use server"

import { getTipoUsuarioPorIdParametros } from "@/lib/types/tipousuario";
import { executeQuery } from "@/lib/utils/database";
import { db } from "@vercel/postgres";

const client = db;

export async function getTipoUsuarioPorId(parametros: getTipoUsuarioPorIdParametros) {
    return executeQuery(
        'getTipoUsuarioPorId',
        async () => {

            const getQuery = `
                SELECT * FROM tipousuario
                WHERE id = $1
            `;

            const getResult = await client.query(getQuery, [
                parametros.id_tipousuario
            ]);

            return getResult.rows[0];
        },

        parametros
    );
};//

export async function getTiposUsuario(){
    return executeQuery(
        'getTiposUsuario',
        async () => {

            const getQuery = `
                SELECT * FROM tipousuario
            `;

            const getResult = await client.query(getQuery);

            return getResult.rows;
        }
    );
};//