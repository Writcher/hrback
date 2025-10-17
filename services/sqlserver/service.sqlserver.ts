"use server"

import { getConnection } from "@/config/sqlserver";
import { getModalidadTrabajoCorrido } from "../modalidadtrabajo/service.modalidadtrabajo";
import { getProyectoModalidadTrabajo } from "../proyecto/service.proyecto";
import { getEmpleados, getEmpleadosPresentes, getProyectoEmpleadosNocturnos } from "../empleado/service.empleado";

export type getMarcasSQLServerParametros = {
    fecha: string; // formato ISO: YYYY-MM-DD
    dispositivos: string[];
};

interface RegistroEmpleado {
    fecha: string;
    hora: string;
    tipo: string;
}

interface EmpleadoJornada {
    nombre: string;
    registros: RegistroEmpleado[];
    requiresManualReview: boolean;
}

interface ResultadoProcesado {
    empleadosJornada: Map<string, EmpleadoJornada>;
    importacionCompleta: boolean;
}

interface getPresentesParametros {
    fecha: string;
    dispositivos: string[];
    filtroProyecto: number;
    pagina: number;
    filasPorPagina: number;
}

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
};

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

        const totalEmpleadosPG = await getEmpleadosPresentes({
            filtroProyecto: parametros.filtroProyecto,
        });

        const totalFiltrado = totalEmpleadosPG.empleados.filter(e => idsEmpleadosPresentes.has(e.id_reloj));

        const totalMensualizados = totalFiltrado.filter(e => e.id_tipoempleado === 2).length;
        const totalJornaleros = totalFiltrado.filter(e => e.id_tipoempleado != 2).length;
        const totalPresentes = totalFiltrado.length;

        const inicio = parametros.pagina * parametros.filasPorPagina;
        const fin = inicio + parametros.filasPorPagina;

        const presentesPaginados = totalFiltrado.slice(inicio, fin);

        return {
            totalMensualizados,
            totalJornaleros,
            totalPresentes,
            presentes: presentesPaginados,
        };
    } catch (error) {
        console.error("Error en getPresentes: ", error);
        throw error;
    };
};

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
};