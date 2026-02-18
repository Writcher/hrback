"use server"

import { getConnection } from "@/config/sqlserver";
import { getModalidadTrabajoCorrido } from "../modalidadtrabajo/service.modalidadtrabajo";
import { getProyectoByNomina, getProyectoModalidadTrabajo, getProyectoNomina } from "../proyecto/service.proyecto";
import { getAllEmpleados, getEmpleadosAsistencia, getEmpleadosNocturnos } from "../empleado/service.empleado";
import ExcelJS from "exceljs";
import { db, QueryResult } from "@vercel/postgres";
import { EmpleadoJornada, getMarcasSQLServerParametros, getPresentesProyectoParametros, RegistroEmpleado, ResultadoProcesado } from "@/lib/types/sqlserver";
import { getEstadoEmpleadoActivo } from "../estadoempleado/service.estadoempleado";
import { executeQuery } from "@/lib/utils/database";
import { getTipoEmpleadoJornalero, getTipoEmpleadoMensualizado } from "../tipoempleado/service.tipoempleado";
import { getAusentesParametros } from "@/lib/types/empleado";

const client = db;

export async function getMarcasSQLServer(parametros: getMarcasSQLServerParametros) {
    return executeQuery(
        'getMarcasSQLServer',
        async () => {

            const pool = await getConnection();

            const dispositivosIndex = parametros.dispositivos.map((_, index) => `@${index + 2}`).join(', ');

            const getQuery = `
                SELECT 
                    [fecha_acceso],
                    [hora_acceso],
                    [nombre],
                    [id_empleado]
                FROM [control_de_accesos].[dbo].[registros_acceso]
                WHERE [fecha_acceso] = @1
                AND [numero_serie_dispositivo] IN (${dispositivosIndex})
                ORDER BY [nombre] ASC
            `;

            const query = pool.request();

            query.input('1', parametros.fecha);

            parametros.dispositivos.forEach((dispositivo, index) => {
                query.input(`${index + 2}`, dispositivo);
            });

            const getResult = await query.query(getQuery);

            return getResult.recordset
        },

        parametros
    );
};//

export async function getPresentesProyecto(parametros: getPresentesProyectoParametros) {
    return executeQuery(
        'getPresentesProyecto',
        async () => {

            const pool = await getConnection();

            const dispositivosIndex = parametros.dispositivos.map((_, index) => `@${index + 2}`).join(', ');

            const getQuery = `
                SELECT DISTINCT [id_empleado]
                FROM [control_de_accesos].[dbo].[registros_acceso]
                WHERE [fecha_acceso] = @1
                    AND [numero_serie_dispositivo] IN (${dispositivosIndex})
            `;

            const query = pool.request();

            query.input('1', parametros.fecha);

            parametros.dispositivos.forEach((dispositivo, index) => {
                query.input(`${index + 2}`, dispositivo)
            });

            const getResult = await query.query(getQuery);

            const ids_presentes = new Set(getResult.recordset.map(result => String(result.id_empleado)));

            const empleados = await getEmpleadosAsistencia();

            const empleadosPresentes = empleados.empleados.filter(empleado => ids_presentes.has(empleado.id_reloj));

            const id_tipoempleado = await getTipoEmpleadoMensualizado();

            const totalPresentesIndirectos = empleadosPresentes.filter(empleado => empleado.id_tipoempleado === id_tipoempleado).length;

            const totalPresentesDirectos = empleadosPresentes.filter(empleado => empleado.id_tipoempleado != id_tipoempleado).length;

            const totalPresentes = empleadosPresentes.length;

            let presentes;

            if (parametros.pagina !== undefined && parametros.filasPorPagina) {
                const inicio = parametros.pagina * parametros.filasPorPagina;
                const fin = inicio + parametros.filasPorPagina;
                presentes = empleadosPresentes.slice(inicio, fin);
            } else {
                presentes = empleadosPresentes;
            };

            const ids_ausentes = await getAusentesProyecto({
                filtroProyecto: parametros.filtroProyecto,
                fecha: parametros.fecha
            });

            const empleadosAusentes = empleados.empleados.filter(empleado => ids_ausentes.includes(empleado.id_reloj));

            const totalAusentes = empleadosAusentes.length;

            let ausentes;

            if (parametros.pagina !== undefined && parametros.filasPorPagina) {
                const inicio = parametros.pagina * parametros.filasPorPagina;
                const fin = inicio + parametros.filasPorPagina;
                ausentes = empleadosAusentes.slice(inicio, fin);
            } else {
                ausentes = empleadosAusentes;
            };

            return {
                totalMensualizados: totalPresentesIndirectos,
                totalJornaleros: totalPresentesDirectos,
                totalPresentes,
                totalAusentes,
                presentes: presentes,
                ausentes: ausentes,
            };
        },

        parametros
    );
};//

export async function getAusentesProyecto(parametros: getAusentesParametros) {
    return executeQuery(
        'getAusentesProyecto',
        async () => {

            const pool = await getConnection();

            const proy = await getProyectoNomina({ id_proyecto: parametros.filtroProyecto });

            const getQuery = `
                SELECT DISTINCT CAST(n.[dni] AS BIGINT) AS [id_empleado]
                FROM [control_de_accesos].[dbo].[nomina] n
                WHERE 
                    (ingreso IS NULL OR GETDATE() >= ingreso)
                    AND (egreso IS NULL OR GETDATE() <= egreso)
                    AND n.[proyecto] = @1
                    AND n.[apellido] NOT LIKE '%GARIN ODRIOZOLA%'
                    AND CAST(n.[dni] AS BIGINT) NOT IN (
                        SELECT DISTINCT [id_empleado]
                        FROM [control_de_accesos].[dbo].[registros_acceso]
                        WHERE [fecha_acceso] = @2
                    )
            `;

            const query = pool.request();

            query.input('1', proy);

            query.input('2', parametros.fecha);

            const getResult = await query.query(getQuery);

            return getResult.recordset.map(result => result.id_empleado);
        },

        parametros
    );
};//

export async function syncNomina() {
    return executeQuery(
        'syncNomina',
        async () => {
            const pool = await getConnection();

            const getQuery = `
                SELECT DISTINCT CAST([dni] AS BIGINT) AS [id_reloj], [legajo], [apellido], [nombre], [proyecto], [convenio]
                FROM [control_de_accesos].[dbo].[nomina]
                WHERE 
                    (ingreso IS NULL OR GETDATE() >= ingreso)
                    AND (egreso IS NULL OR GETDATE() <= egreso)
                    AND [apellido] NOT LIKE '%GARIN ODRIOZOLA%'
            `;
            const getResult = await pool.request().query(getQuery);

            const empleados = await getAllEmpleados();

            const empleadosMap = new Map(empleados.map(empleado => [empleado.id_reloj, empleado]));

            const nomina = new Map();
            getResult.recordset.forEach(fila => {
                nomina.set(fila.id_reloj, {
                    legajo: fila['legajo'],
                    apellido: fila['apellido'],
                    nombre: fila['nombre'],
                    proyecto: fila['proyecto'],
                    convenio: fila['convenio']
                });
            });
            const ids_reloj = new Set(empleados.map(empleado => empleado.id_reloj));

            const id_mensualizado = await getTipoEmpleadoMensualizado();
            const id_jornalero = await getTipoEmpleadoJornalero();
            const id_estadoempleado = await getEstadoEmpleadoActivo();

            const updatePromises: Promise<QueryResult<any>>[] = [];
            const insertPromises: Promise<QueryResult<any>>[] = [];

            for (const [id_reloj, data] of nomina.entries()) {
                if (ids_reloj.has(id_reloj)) {
                    const empleado = empleadosMap.get(id_reloj);
                    const id_proyecto = await getProyectoByNomina({ nomina: data.proyecto });

                    if (id_proyecto === null) continue;

                    const nombreapellido = `${data.apellido} ${data.nombre}`.trim();

                    let updateQuery: string;
                    let updateParams: any[];

                    if (data.convenio === 'FUERA DE CONVENIO') {

                        updateQuery = `
                            UPDATE empleado
                            SET legajo = $1, nombreapellido = $2, id_proyecto = $3, id_tipoempleado = $4
                            WHERE id = $5
                        `;
                        updateParams = [data.legajo, nombreapellido, id_proyecto, id_mensualizado, empleado.id];
                    } else {

                        updateQuery = `
                            UPDATE empleado
                            SET legajo = $1, nombreapellido = $2, id_proyecto = $3, id_tipoempleado = $4
                            WHERE id = $5
                        `;
                        updateParams = [data.legajo, nombreapellido, id_proyecto, id_jornalero, empleado.id];
                    };

                    updatePromises.push(client.query(updateQuery, updateParams));

                } else {
                    const id_proyecto = await getProyectoByNomina({ nomina: data.proyecto });

                    if (id_proyecto === null) continue;

                    const nombreapellido = `${data.apellido} ${data.nombre}`.trim();

                    let insertQuery: string;
                    let insertParams: any[];

                    if (data.convenio === 'FUERA DE CONVENIO') {
                        insertQuery = `
                            INSERT INTO empleado (nombreapellido, id_reloj, legajo, id_proyecto, id_estadoempleado, id_tipoempleado)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `;
                        insertParams = [nombreapellido, id_reloj, data.legajo, id_proyecto, id_estadoempleado, id_mensualizado];
                    } else {
                        insertQuery = `
                            INSERT INTO empleado (nombreapellido, id_reloj, legajo, id_proyecto, id_estadoempleado, id_tipoempleado)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `;
                        insertParams = [nombreapellido, id_reloj, data.legajo, id_proyecto, id_estadoempleado, id_jornalero];
                    };

                    insertPromises.push(
                        client.query(insertQuery, insertParams)
                    );
                }
            }
            await Promise.allSettled([...updatePromises, ...insertPromises]);
            console.log('Sync completed.')
        }
    );
};

export async function procesarMarcasEmpleados({ registros, id_proyecto }: { registros: any[], id_proyecto: number }): Promise<ResultadoProcesado> {

    const modalidad_proyecto = await getProyectoModalidadTrabajo({ id_proyecto });
    const modalidad_corrido = await getModalidadTrabajoCorrido();
    const empleadosNocturnosArray = await getEmpleadosNocturnos();
    const empleadosNocturnos = new Set(empleadosNocturnosArray);

    const empleadosJornada = new Map<string, EmpleadoJornada>();

    let importacionCompleta = true;

    const TOLERANCIA_MINUTOS = 5;

    // Determinar si es modalidad corrido
    const esModalidadCorrido = modalidad_proyecto === modalidad_corrido;

    // Agrupar registros por empleado
    const registrosPorEmpleado = new Map<string, any[]>();
    registros.forEach(registro => {
        const key = registro.id_empleado;

        if (!registrosPorEmpleado.has(key)) {
            registrosPorEmpleado.set(key, []);

        };
        registrosPorEmpleado.get(key)!.push(registro);
    });

    // Procesar cada empleado
    registrosPorEmpleado.forEach((registrosEmpleado, idEmpleado) => {

        const esEmpleadoNocturno = empleadosNocturnos.has(idEmpleado);

        // Ordenar por hora_acceso
        const registrosOrdenados = [...registrosEmpleado].sort((a, b) => {
            const horaA = new Date(a.hora_acceso).getTime();
            const horaB = new Date(b.hora_acceso).getTime();
            return horaA - horaB;
        });

        // Filtrar registros duplicados dentro del intervalo de tolerancia
        const registrosFiltrados = registrosOrdenados.filter((registro, index) => {
            if (index === 0) return true;
            const horaActual = new Date(registro.hora_acceso).getTime();
            const horaAnterior = new Date(registrosOrdenados[index - 1].hora_acceso).getTime();
            const diferenciaMinutos = (horaActual - horaAnterior) / (1000 * 60);
            return diferenciaMinutos > TOLERANCIA_MINUTOS;
        });

        let registrosProcesados: RegistroEmpleado[] = [];
        let requiresManualReview = false;

        if (esEmpleadoNocturno) {
            requiresManualReview = true;
        };

        if (esModalidadCorrido) {
            // MODALIDAD CORRIDO: Solo primera y última marca
            if (registrosFiltrados.length === 0) {
                requiresManualReview = true;
            } else if (registrosFiltrados.length === 1) {
                // Solo hay entrada, falta salida
                const marcaEntrada = registrosFiltrados[0];
                const fechaEntrada = new Date(marcaEntrada.fecha_acceso);
                const horaEntrada = new Date(marcaEntrada.hora_acceso);

                registrosProcesados.push({
                    fecha: fechaEntrada.toISOString().split('T')[0],
                    hora: `${horaEntrada.getUTCHours().toString().padStart(2, '0')}:${horaEntrada.getUTCMinutes().toString().padStart(2, '0')}`,
                    tipo: 'ENTRADA'
                });

                registrosProcesados.push({
                    fecha: fechaEntrada.toISOString().split('T')[0],
                    hora: '',
                    tipo: 'SALIDA'
                });

                requiresManualReview = true;
            } else {
                // Hay al menos 2 marcas: tomar primera y última
                const marcaEntrada = registrosFiltrados[0];
                const marcaSalida = registrosFiltrados[registrosFiltrados.length - 1];

                const fechaEntrada = new Date(marcaEntrada.fecha_acceso);
                const horaEntrada = new Date(marcaEntrada.hora_acceso);

                registrosProcesados.push({
                    fecha: fechaEntrada.toISOString().split('T')[0],
                    hora: `${horaEntrada.getUTCHours().toString().padStart(2, '0')}:${horaEntrada.getUTCMinutes().toString().padStart(2, '0')}`,
                    tipo: 'ENTRADA'
                });

                const fechaSalida = new Date(marcaSalida.fecha_acceso);
                const horaSalida = new Date(marcaSalida.hora_acceso);

                registrosProcesados.push({
                    fecha: fechaSalida.toISOString().split('T')[0],
                    hora: `${horaSalida.getUTCHours().toString().padStart(2, '0')}:${horaSalida.getUTCMinutes().toString().padStart(2, '0')}`,
                    tipo: 'SALIDA'
                });
            };
        } else {
            // MODALIDAD PARTIDA: Crear pares de entrada/salida
            for (let i = 0; i < registrosFiltrados.length; i += 2) {
                const marcaEntrada = registrosFiltrados[i];
                const marcaSalida = registrosFiltrados[i + 1];

                // Entrada
                const fechaEntrada = new Date(marcaEntrada.fecha_acceso);
                const horaEntrada = new Date(marcaEntrada.hora_acceso);

                registrosProcesados.push({
                    fecha: fechaEntrada.toISOString().split('T')[0],
                    hora: `${horaEntrada.getUTCHours().toString().padStart(2, '0')}:${horaEntrada.getUTCMinutes().toString().padStart(2, '0')}`,
                    tipo: 'ENTRADA'
                });

                // Salida (si existe)
                if (marcaSalida) {
                    const fechaSalida = new Date(marcaSalida.fecha_acceso);
                    const horaSalida = new Date(marcaSalida.hora_acceso);

                    registrosProcesados.push({
                        fecha: fechaSalida.toISOString().split('T')[0],
                        hora: `${horaSalida.getUTCHours().toString().padStart(2, '0')}:${horaSalida.getUTCMinutes().toString().padStart(2, '0')}`,
                        tipo: 'SALIDA'
                    });
                } else {
                    // Si no hay salida, agregar null
                    registrosProcesados.push({
                        fecha: fechaEntrada.toISOString().split('T')[0],
                        hora: '',
                        tipo: 'SALIDA'
                    });
                };
            };

            // Requiere revisión si hay número impar de marcas
            requiresManualReview = registrosFiltrados.length % 2 !== 0;
        };

        if (!requiresManualReview && !esEmpleadoNocturno && registrosProcesados.length >= 2) {
            const entrada = registrosProcesados.find(r => r.tipo === 'ENTRADA');
            const salida = registrosProcesados.find(r => r.tipo === 'SALIDA');

            if (entrada && salida && salida.hora !== '') {
                const fechaHoraEntrada = new Date(`${entrada.fecha}T${entrada.hora}:00`);
                const fechaHoraSalida = new Date(`${salida.fecha}T${salida.hora}:00`);
                const diferenciaHoras = (fechaHoraSalida.getTime() - fechaHoraEntrada.getTime()) / (1000 * 60 * 60);

                if (diferenciaHoras < 8) {
                    requiresManualReview = true;
                };
            };
        };

        if (requiresManualReview) {
            importacionCompleta = false;
        };

        empleadosJornada.set(idEmpleado, {
            nombre: registrosFiltrados[0].nombre,
            registros: registrosProcesados,
            requiresManualReview
        });
    });

    return {
        empleadosJornada,
        importacionCompleta
    };
};//

export async function generarExcelPresentes(
    presentes: Array<{ id_empleado: string | number; nombre: string }>,
    ausentes: Array<{ id_empleado: string | number; nombre: string }>
) {
    try {
        // Crear el workbook
        const workbook = new ExcelJS.Workbook();

        // Configurar propiedades del workbook
        workbook.creator = 'Sistema de Control de Accesos';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.description = 'Reporte de Empleados Presentes y Ausentes';

        // ==================== HOJA DE PRESENTES ====================
        const worksheetPresentes = workbook.addWorksheet('Presentes');

        // Definir las columnas
        worksheetPresentes.columns = [
            { header: 'ID Empleado', key: 'id_empleado', width: 15 },
            { header: 'Nombre', key: 'nombre', width: 50 }
        ];

        // Agregar los datos de presentes
        presentes.forEach(presente => {
            worksheetPresentes.addRow({
                id_empleado: presente.id_empleado,
                nombre: presente.nombre
            });
        });

        // Estilizar el header de presentes
        const headerRowPresentes = worksheetPresentes.getRow(1);
        headerRowPresentes.height = 25;
        headerRowPresentes.eachCell((cell) => {
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFF' },
                size: 11
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '2F5597' }
            };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
                wrapText: true
            };
        });

        // Aplicar estilos a las filas de datos de presentes
        worksheetPresentes.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                row.height = 20;

                // Alternar colores de fila para mejor legibilidad
                if (rowNumber % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'F8F9FA' }
                        };
                    });
                };

                // Aplicar bordes y formato
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'CCCCCC' } },
                        left: { style: 'thin', color: { argb: 'CCCCCC' } },
                        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                        right: { style: 'thin', color: { argb: 'CCCCCC' } }
                    };

                    // Alineación específica por columna
                    if (colNumber === 1) { // ID Empleado
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNumber === 2) { // Nombre
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    };
                });
            };
        });

        // Agregar fila vacía antes de los totales
        worksheetPresentes.addRow({});

        // Agregar fila de totales de presentes
        const totalRowPresentes = worksheetPresentes.addRow({
            id_empleado: '',
            nombre: 'TOTAL: ' + presentes.length
        });

        // Estilizar la fila de totales
        totalRowPresentes.height = 25;
        totalRowPresentes.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.border = {
                top: { style: 'double', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'double', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };

            if (colNumber === 2) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFACD' }
                };
            };
        });

        // Aplicar filtros automáticos
        worksheetPresentes.autoFilter = {
            from: 'A1',
            to: `B${presentes.length + 1}`
        };

        // Congelar la primera fila
        worksheetPresentes.views = [{
            state: 'frozen',
            ySplit: 1
        }];

        // ==================== HOJA DE AUSENTES ====================
        const worksheetAusentes = workbook.addWorksheet('Ausentes');

        // Definir las columnas
        worksheetAusentes.columns = [
            { header: 'ID Empleado', key: 'id_empleado', width: 15 },
            { header: 'Nombre', key: 'nombre', width: 50 }
        ];

        // Agregar los datos de ausentes
        ausentes.forEach(ausente => {
            worksheetAusentes.addRow({
                id_empleado: ausente.id_empleado,
                nombre: ausente.nombre
            });
        });

        // Estilizar el header de ausentes (color rojo para diferenciar)
        const headerRowAusentes = worksheetAusentes.getRow(1);
        headerRowAusentes.height = 25;
        headerRowAusentes.eachCell((cell) => {
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFF' },
                size: 11
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C00000' } // Rojo para ausentes
            };
            cell.border = {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };
            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
                wrapText: true
            };
        });

        // Aplicar estilos a las filas de datos de ausentes
        worksheetAusentes.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                row.height = 20;

                // Alternar colores de fila (tonos rojizos para ausentes)
                if (rowNumber % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE6E6' } // Rojo muy claro
                        };
                    });
                };

                // Aplicar bordes y formato
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'CCCCCC' } },
                        left: { style: 'thin', color: { argb: 'CCCCCC' } },
                        bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
                        right: { style: 'thin', color: { argb: 'CCCCCC' } }
                    };

                    // Alineación específica por columna
                    if (colNumber === 1) { // ID Empleado
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNumber === 2) { // Nombre
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    };
                });
            };
        });

        // Agregar fila vacía antes de los totales
        worksheetAusentes.addRow({});

        // Agregar fila de totales de ausentes
        const totalRowAusentes = worksheetAusentes.addRow({
            id_empleado: '',
            nombre: 'TOTAL: ' + ausentes.length
        });

        // Estilizar la fila de totales
        totalRowAusentes.height = 25;
        totalRowAusentes.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.border = {
                top: { style: 'double', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'double', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
            };

            if (colNumber === 2) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCCCC' } // Rojo claro para totales
                };
            };
        });

        // Aplicar filtros automáticos
        worksheetAusentes.autoFilter = {
            from: 'A1',
            to: `B${ausentes.length + 1}`
        };

        // Congelar la primera fila
        worksheetAusentes.views = [{
            state: 'frozen',
            ySplit: 1
        }];

        // ==================== HOJA DE INFORMACIÓN ====================
        const infoSheet = workbook.addWorksheet('Información');
        infoSheet.addRow(['Reporte generado:', new Date().toLocaleString('es-AR')]);
        infoSheet.addRow(['Total de empleados presentes:', presentes.length]);
        infoSheet.addRow(['Total de empleados ausentes:', ausentes.length]);
        infoSheet.addRow(['Total general:', presentes.length + ausentes.length]);

        // Estilizar la hoja de información
        infoSheet.getColumn(1).width = 30;
        infoSheet.getColumn(2).width = 25;
        infoSheet.eachRow((row) => {
            row.getCell(1).font = { bold: true };
        });

        // Generar el buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return buffer;
    } catch (error) {
        console.error('Error generando Excel de presentes y ausentes:', error);
        throw new Error('Error al generar el archivo Excel');
    };
};