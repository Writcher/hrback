"use server"

import { deleteUsuarioParametros, editUsuarioParametros, getUsuarioPorCorreoParametros, getUsuariosParametros, insertUsuarioParametros } from "@/lib/types/usuario";
import { db } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { getEstadoUsuarioActivo, getEstadoUsuarioBaja } from "../estadousuario/service.estadousuario";

const client = db;

export async function getUsuarioPorCorreo(parametros: getUsuarioPorCorreoParametros) {
    try {
        const id_baja = await getEstadoUsuarioBaja();
        
        const correoMinuscula = parametros.correo.toLowerCase();

        const texto = `
            SELECT *
            FROM "usuario"
            WHERE correo ILIKE $1
                AND id_estadousuario != $2
        `;

        const valores = [correoMinuscula, id_baja];

        const respuesta = await client.query(texto, valores);

        return respuesta.rows[0];
    } catch (error) {
        console.error("Error en getUsuarioPorCorreo: ", error);
        throw error;
    };
};

export async function getUsuarios(parametros: getUsuariosParametros) {
    try {
        const id_estadobaja = await getEstadoUsuarioBaja();

        const offset = (parametros.pagina) * parametros.filas;
        const valoresBase: any = [];

        const columnasValidas = ['nombre', 'correo', 'id_tipousuario', 'id_estadousuario'];

        if (!columnasValidas.includes(parametros.columna)) {
            throw new Error('Columna Invalida');
        };

        const direccionesValidas = ['ASC', 'DESC'];

        if (!direccionesValidas.includes(parametros.direccion.toUpperCase())) {
            throw new Error('Dirección de ordenación invalida');
        };

        const columna = parametros.columna;
        const direccion = parametros.direccion.toUpperCase();

        let textoFiltroBase = 'WHERE 1=1 '

        const busquedaNombre = `%${parametros.busquedaNombre}%`;

        if (parametros.filtroTipoUsuario !== 0) {
            textoFiltroBase += `
                AND u.id_tipousuario = $${valoresBase.length + 1}
            `;
            valoresBase.push(parametros.filtroTipoUsuario);
        };

        if (parametros.busquedaNombre !== "") {
            textoFiltroBase += `
                AND unaccent(u.nombre) ILIKE unaccent($${valoresBase.length + 1}) 
            `;
            valoresBase.push(busquedaNombre);
        };

        const textoOrden = `
            ORDER BY ${columna} ${direccion}
        `;

        const valoresPrincipal = [...valoresBase, parametros.filas, offset];

        const textoLimite = `LIMIT $${valoresPrincipal.length - 1} OFFSET $${valoresPrincipal.length}`;

        let texto = `
            SELECT
                u.id,
                u.nombre,
                u.correo,
                u.id_tipousuario,
                tu.nombre AS tipousuario,
                eu.nombre AS estadousuario
            FROM "usuario" u
            JOIN "tipousuario" tu ON u.id_tipousuario = tu.id
            JOIN "estadousuario" eu ON u.id_estadousuario = eu.id
            ${textoFiltroBase}
            ${textoOrden}
            ${textoLimite}
        `;

        const resultado = await client.query(texto, valoresPrincipal);

        let textoConteo = `
            SELECT COUNT(*) AS total
            FROM "usuario" u
            ${textoFiltroBase}
        `;

        const resultadoConteo = await client.query(textoConteo, valoresBase);

        return {
            usuarios: resultado.rows,
            totalUsuarios: resultadoConteo.rows[0].total,
        };
    } catch (error) {
        console.error("Error en getUsuarios: ", error);
        throw error;
    };
};

export async function insertUsuario(parametros: insertUsuarioParametros) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(parametros.contraseña, salt);

        const id_estadousuario = await getEstadoUsuarioActivo();

        const texto = `
            INSERT INTO "usuario" (correo, nombre, contraseña, id_tipousuario, id_estadousuario)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;

        const valores = [parametros.correo, parametros.nombre, hash, parametros.id_tipousuario, id_estadousuario];

        const resultado = await client.query(texto, valores);

        return resultado.rows[0].id;
    } catch (error) {
        console.error("Error en insertUsuario: ", error);
        throw error;
    };
};

export async function editUsuario(parametros: editUsuarioParametros) {
    try {
        const id_baja = await getEstadoUsuarioBaja();

        const texto = `
            UPDATE "usuario"
            SET nombre = $1, correo = $2, id_tipousuario = $3
            WHERE id = $4
                AND id_estadousuario != $5
        `;
        const valores = [parametros.nombre, parametros.correo, parametros.id_tipousuario, parametros.id, id_baja];

        await client.query(texto, valores);

        return;
    } catch (error) {
        console.error("Error en editUsuario: ", error);
        throw error;
    };
};

export async function deleteUsuario(parametros: deleteUsuarioParametros) {
    try {
        const id_baja = await getEstadoUsuarioBaja();

        const texto = `
            UPDATE "usuario"
            SET id_estadousuario = $2
            WHERE id = $1
                AND id_estadousuario != $2
        `;

        const valores = [parametros.id, id_baja];

        await client.query(texto, valores);
    } catch (error) {
        console.error("Error en deleteUsuario: ", error);
        throw error;
    };
};