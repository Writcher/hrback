"use server"

import { getConnection } from "@/config/sqlserver";
import { getModalidadTrabajoCorrido } from "../modalidadtrabajo/service.modalidadtrabajo";
import { getProyectoByNomina, getProyectoModalidadTrabajo, getProyectoNomina } from "../proyecto/service.proyecto";
import { getAllEmpleados, getAusentes, getEmpleadosPresentes, getProyectoEmpleadosNocturnos } from "../empleado/service.empleado";
import ExcelJS from "exceljs";
import { db, QueryResult } from "@vercel/postgres";
import { EmpleadoJornada, getMarcasSQLServerParametros, getNominaProyectoParametros, getPresentesParametros, RegistroEmpleado, ResultadoProcesado } from "@/lib/types/sqlserver";
import { getControlByProyecto } from "../control/service.control";
import { getEstadoEmpleadoActivo } from "../estadoempleado/service.estadoempleado";

const client = db;

export async function getMarcasSQLServer(parametros: getMarcasSQLServerParametros) {
    try {
        const pool = await getConnection();

        const { dispositivos, fecha } = parametros;

        const dispositivosPlaceholders = dispositivos.map((_, index) => `@${index + 2}`).join(', ');

        const texto = `
            SELECT 
                [fecha_acceso],
                [hora_acceso],
                [nombre],
                [id_empleado]
            FROM [control_de_accesos].[dbo].[registros_acceso]
            WHERE [fecha_acceso] = @1
            AND [numero_serie_dispositivo] IN (${dispositivosPlaceholders})
            ORDER BY [nombre] ASC
        `;

        const llamada = pool.request();

        llamada.input('1', fecha);

        dispositivos.forEach((dispositivo, index) => {
            llamada.input(`${index + 2}`, dispositivo);
        });

        const respuesta = await llamada.query(texto);

        return respuesta.recordset;
    } catch (error) {
        console.error("Error en getMarcasSQLServer: ", error);
        throw error;
    };
};//

export async function getPresentes(parametros: getPresentesParametros) {
    try {
        const pool = await getConnection();

        const dispositivosPlaceholders = parametros.dispositivos.map((_, index) => `@${index + 2}`).join(', ');

        let textoFiltroBase = 'WHERE 1=1 ';

        if (parametros.filtroProyecto !== 0) {
            textoFiltroBase += `AND [numero_serie_dispositivo] IN (${dispositivosPlaceholders}) `;
        };

        const texto = `
            SELECT DISTINCT [id_empleado]
            FROM [control_de_accesos].[dbo].[registros_acceso]
            ${textoFiltroBase}
            AND [fecha_acceso] = @1
        `;

        const llamada = pool.request();

        llamada.input('1', parametros.fecha);

        if (parametros.filtroProyecto !== 0) {
            parametros.dispositivos.forEach((dispositivo, index) => {
                llamada.input(`${index + 2}`, dispositivo);
            });
        };

        const respuestaSQL = await llamada.query(texto);

        const idsEmpleadosPresentes = new Set(respuestaSQL.recordset.map(r => Number(r.id_empleado)));

        const totalEmpleadosPG = await getEmpleadosPresentes();

        const totalFiltrado = totalEmpleadosPG.empleados.filter(e => idsEmpleadosPresentes.has(e.id_reloj));

        const totalMensualizados = totalFiltrado.filter(e => e.id_tipoempleado === 2).length;

        const totalJornaleros = totalFiltrado.filter(e => e.id_tipoempleado != 2).length;

        const totalPresentes = totalFiltrado.length;

        const dispositivos = await getControlByProyecto({ id_proyecto: parametros.filtroProyecto })

        let todosAusentes = [];
        let totalAusentes = 0;
        if (parametros.filtroProyecto !== 0) {
            const idsAusentes = await getAusentes({
                filtroProyecto: parametros.filtroProyecto,
                fecha: parametros.fecha,
                dispositivos
            });
            todosAusentes = totalEmpleadosPG.empleados
                .filter(e => idsAusentes.includes(e.id_reloj))
            totalAusentes = todosAusentes.length;
        };

        let presentes;

        if (parametros.pagina !== undefined && parametros.filasPorPagina) {
            const inicio = parametros.pagina * parametros.filasPorPagina;
            const fin = inicio + parametros.filasPorPagina;
            presentes = totalFiltrado.slice(inicio, fin);
        } else {
            presentes = totalFiltrado;
        };

        let ausentes;

        if (parametros.pagina !== undefined && parametros.filasPorPagina) {
            const inicio = parametros.pagina * parametros.filasPorPagina;
            const fin = inicio + parametros.filasPorPagina;
            ausentes = todosAusentes.slice(inicio, fin);
        } else {
            ausentes = todosAusentes;
        };

        return {
            totalMensualizados,
            totalJornaleros,
            totalPresentes,
            totalAusentes,
            presentes: presentes,
            ausentes: ausentes,
        };
    } catch (error) {
        console.error("Error en getPresentes: ", error);
        throw error;
    };
};//

export async function getPresentesGlobal(parametros: getPresentesParametros) {
    try {

        const pool = await getConnection();

        let textoFiltroBase = 'WHERE 1=1 ';

        const texto = `
            SELECT DISTINCT [id_empleado]
            FROM [control_de_accesos].[dbo].[registros_acceso]
            ${textoFiltroBase}
            AND [fecha_acceso] = @1
        `;

        const llamada = pool.request();

        llamada.input('1', parametros.fecha);

        const respuestaSQL = await llamada.query(texto);

        const idsEmpleadosPresentes = new Set(respuestaSQL.recordset.map(r => Number(r.id_empleado)));

        const totalEmpleadosPG = await getEmpleadosPresentes();

        const totalFiltrado = totalEmpleadosPG.empleados.filter(e => idsEmpleadosPresentes.has(e.id_reloj));

        return {
            presentes: totalFiltrado,
        };
    } catch (error) {
        console.error("Error en getPresentesGlobal: ", error);
        throw error;
    };
};//

export async function procesarMarcasEmpleados({ registros, id_proyecto }: { registros: any[], id_proyecto: number }): Promise<ResultadoProcesado> {

    const modalidad_proyecto = await getProyectoModalidadTrabajo({ id_proyecto });

    const modalidad_corrido = await getModalidadTrabajoCorrido();

    const empleadosNocturnosArray = await getProyectoEmpleadosNocturnos({ id_proyecto });
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
};//

export async function syncNomina() {
    try {
        const pool = await getConnection();
        const texto = `
            SELECT DISTINCT [dni_cuil], [legajo], [apellido], [nombre], [proy]
            FROM [control_de_accesos].[dbo].[nomina]
            WHERE [estado] = 'ACTIVO'
                AND [apellido] NOT LIKE '%GARIN ODRIOZOLA%'
        `;
        const llamada = pool.request();
        const respuestaSQL = await llamada.query(texto);
        const respuestaPG = await getAllEmpleados();

        const sqlServerMap = new Map();
        respuestaSQL.recordset.forEach(row => {
            const dniCuil = row['dni_cuil'];
            if (dniCuil && dniCuil.length > 3) {
                const processedDni = dniCuil.slice(2, -1);
                sqlServerMap.set(Number(processedDni), {
                    legajo: row['legajo'],
                    apellido: row['apellido'],
                    nombre: row['nombre'],
                    proyecto: row['proy']
                });
            };
        });

        const existingIdRelojes = new Set(respuestaPG.map(emp => emp.id_reloj));

        const updatePromises: Promise<QueryResult<any>>[] = [];
        const insertPromises: Promise<QueryResult<any>>[] = [];

        for (const [idReloj, data] of sqlServerMap.entries()) {
            if (existingIdRelojes.has(idReloj)) {
                const emp = respuestaPG.find(e => e.id_reloj === idReloj);

                if (!emp) {
                    console.error(`Employee with id_reloj ${idReloj} not found in respuestaPG`);
                    continue;
                };

                const updateQuery = `
                    UPDATE empleado 
                    SET legajo = $1 
                    WHERE id = $2
                `;
                updatePromises.push(client.query(updateQuery, [data.legajo, emp.id]));
            } else {
                const id_proyecto = await getProyectoByNomina({ nomina: data.proyecto });

                if (!id_proyecto) {
                    continue;
                };

                const id_estadoempleado = await getEstadoEmpleadoActivo();
                const nombre = `${data.nombre} ${data.apellido}`;
                const insertQuery = `
                    INSERT INTO empleado (nombreapellido, id_reloj, legajo, id_proyecto, id_estadoempleado)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                insertPromises.push(
                    client.query(insertQuery, [
                        nombre,
                        idReloj,
                        data.legajo,
                        id_proyecto,
                        id_estadoempleado
                    ])
                );
            };
        };

        await Promise.all([...updatePromises, ...insertPromises]);

        console.log(`Sync completed: ${updatePromises.length} updated, ${insertPromises.length} created`);

    } catch (error) {
        console.error("Error en syncNomina: ", error);
        throw error;
    };
};

export async function getNominaProyecto(parametros: getNominaProyectoParametros) {
    try {

        const proyecto = await getProyectoNomina(parametros) as string;

        const pool = await getConnection();

        const texto = `
            SELECT DISTINCT [dni_cuil] AS [id_empleado]
            FROM [control_de_accesos].[dbo].[nomina]
            WHERE [ESTADO] = 'ACTIVO'
                AND [Proy.] = @1
        `;

        const llamada = pool.request();

        llamada.input('1', proyecto);

        const respuesta = await llamada.query(texto);

        return respuesta.recordset;
    } catch (error) {
        console.log("Error en getNominaProyecto: ", error);
        throw error;
    };
};//