"use server";

import { getMesQuincenaParametros, jornadasParametros } from "../../lib/types/excel";
import { resumenJornadasExcel } from "../../lib/types/jornada";
import ExcelJS from "exceljs";
import { db } from "@vercel/postgres";
import { getEstadoImportacionIncompleta, getEstadoImportacionRevision } from "../estadoimportacion/service.estadoimportacion";
import { insertImportacion } from "../importacion/service.importacion";
import { getEstadoJornadaRevision, getEstadoJornadaValida } from "../estadojornada/service.estadojornada";
import { getAñoByValor } from "../año/service.año";
import { getMesByMes } from "../mes/service.mes";
import { getQuincenaByMes } from "../quincena/service.quincena";
import { getEmpleadoByRelojProyecto, getProyectoEmpleadosNocturnos, insertEmpleado } from "../empleado/service.empleado";
import { deleteAbsenceProSoft, insertJornada, recalculateJornadasEmpleado } from "../jornada/service.jornada";
import { getFuenteMarcaControl } from "../fuentemarca/service.fuentemarca";
import { getProyectoModalidadTrabajo } from "../proyecto/service.proyecto";
import { getModalidadTrabajoCorrido } from "../modalidadtrabajo/service.modalidadtrabajo";
import { createBackEndError } from "@/lib/utils/error";
import { executeQuery } from "@/lib/utils/database";
import { getTipoImportacionProSoft } from "../tipoimportacion/service.tipoimportacion";

const client = db;

export async function getMesQuincena(parametros: getMesQuincenaParametros) {
  try {
    // Año
    const id_año = await getAñoByValor({
      valor: parametros.año,
    });

    // Mes
    const id_mes = await getMesByMes({
      mes: parametros.mes,
      id_año: id_año,
    });

    // Quincena
    const quincenaParametros = {
      quincena: parametros.quincena,
      id_mes: id_mes,
    };

    const id_quincena = await getQuincenaByMes(quincenaParametros);

    return { id_mes, id_quincena };
  } catch (error) {
    throw createBackEndError('getMesQuincena');
  };
};//

export async function processExcel({ buffer, id_proyecto }: { buffer: ArrayBuffer, id_proyecto: number }) {

  const modalidad_proyecto = await getProyectoModalidadTrabajo({ id_proyecto });
  const modalidad_corrido = await getModalidadTrabajoCorrido();
  const empleadosNocturnosArray = await getProyectoEmpleadosNocturnos({ id_proyecto });
  const empleadosNocturnos = new Set(empleadosNocturnosArray);

  // Determinar si es modalidad corrido
  const esModalidadCorrido = modalidad_proyecto === modalidad_corrido;

  const TOLERANCIA_MINUTOS = 5;

  // Función mejorada para convertir número serial Excel a JS Date
  function excelDateToJSDate(serial: number): Date {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const fractionalDay = serial - Math.floor(serial);

    const date = new Date(utcValue * 1000);

    const totalSeconds = Math.floor(86400 * fractionalDay);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    date.setUTCHours(hours, minutes, seconds, 0);
    return date;
  };

  // Función para extraer fecha de un valor de celda
  function extractDate(cellValue: any): string {
    if (!cellValue) return '';

    if (cellValue instanceof Date) {
      return cellValue.toISOString().split("T")[0];
    };

    if (typeof cellValue === "number") {
      const date = excelDateToJSDate(cellValue);
      return date.toISOString().split("T")[0];
    };

    const str = String(cellValue).trim();
    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        if (year.length === 2) {
          const currentYear = new Date().getFullYear();
          const currentCentury = Math.floor(currentYear / 100) * 100;
          year = String(currentCentury + parseInt(year));
        };

        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
    };

    return str.split(" ")[0];
  };

  // Función para extraer hora de un valor de celda
  function extractTime(cellValue: any): string {
    if (!cellValue) return '';

    if (cellValue instanceof Date) {
      const hours = cellValue.getHours();
      const minutes = cellValue.getMinutes();

      // Compensar la diferencia de timezone (4 horas) + corrección adicional (17 minutos)
      let correctedHours = hours + 4;
      let correctedMinutes = minutes + 17;

      if (correctedMinutes >= 60) {
        correctedMinutes -= 60;
        correctedHours += 1;
      };

      if (correctedHours >= 24) {
        correctedHours -= 24;
      };

      return `${correctedHours.toString().padStart(2, '0')}:${correctedMinutes.toString().padStart(2, '0')}`;
    };

    if (typeof cellValue === "number") {
      if (cellValue < 1) {
        const totalSeconds = Math.round(86400 * cellValue);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } else {
        const fractional = cellValue - Math.floor(cellValue);
        const totalSeconds = Math.round(86400 * fractional);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
    };

    const str = String(cellValue).trim();
    const parts = str.split(' ');

    if (parts.length > 1) {
      return parts[1];
    };

    return str;
  };

  // Procesar Excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No se encontró hoja en el archivo");
  };

  // Parsear filas a partir de la 7 (ignorando encabezados)
  const empleadosMap = new Map<string, {
    nombre: string,
    registros: { fecha: string, hora: string, fechaHora: Date }[]
  }>();

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 6) return;

    const fechaRaw = row.getCell(2).value; // Columna B
    const horaRaw = row.getCell(3).value;  // Columna C
    const idEmpleado = row.getCell(7).text?.trim();  // Columna G
    const nombreEmpleado = row.getCell(8).text?.trim(); // Columna H

    if (!idEmpleado || !nombreEmpleado || !fechaRaw || !horaRaw) return;

    const fecha = extractDate(fechaRaw);
    const hora = extractTime(horaRaw);

    if (!fecha || !hora) return;

    // Crear objeto Date para ordenar correctamente
    const fechaHora = new Date(`${fecha}T${hora}:00`);

    if (!empleadosMap.has(idEmpleado)) {
      empleadosMap.set(idEmpleado, {
        nombre: nombreEmpleado,
        registros: []
      });
    };

    empleadosMap.get(idEmpleado)!.registros.push({ fecha, hora, fechaHora });
  });

  // Procesar cada empleado
  const empleadosJornada = new Map();
  let importacionCompleta = true;

  for (const [idEmpleado, data] of empleadosMap.entries()) {
    const esEmpleadoNocturno = empleadosNocturnos.has(idEmpleado);

    // Ordenar por fecha y hora
    const registrosOrdenados = [...data.registros].sort((a, b) => {
      return a.fechaHora.getTime() - b.fechaHora.getTime();
    });

    // Filtrar registros duplicados dentro del intervalo de tolerancia
    const registrosFiltrados = registrosOrdenados.filter((registro, index) => {
      if (index === 0) return true;
      const horaActual = registro.fechaHora.getTime();
      const horaAnterior = registrosOrdenados[index - 1].fechaHora.getTime();
      const diferenciaMinutos = (horaActual - horaAnterior) / (1000 * 60);
      return diferenciaMinutos > TOLERANCIA_MINUTOS;
    });

    let registrosProcesados: { fecha: string, hora: string, tipo: string }[] = [];
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

        registrosProcesados.push({
          fecha: marcaEntrada.fecha,
          hora: marcaEntrada.hora,
          tipo: 'ENTRADA'
        });

        registrosProcesados.push({
          fecha: marcaEntrada.fecha,
          hora: '',
          tipo: 'SALIDA'
        });

        requiresManualReview = true;
      } else {
        // Hay al menos 2 marcas: tomar primera y última
        const marcaEntrada = registrosFiltrados[0];
        const marcaSalida = registrosFiltrados[registrosFiltrados.length - 1];

        registrosProcesados.push({
          fecha: marcaEntrada.fecha,
          hora: marcaEntrada.hora,
          tipo: 'ENTRADA'
        });

        registrosProcesados.push({
          fecha: marcaSalida.fecha,
          hora: marcaSalida.hora,
          tipo: 'SALIDA'
        });
      };
    } else {
      // MODALIDAD PARTIDA: Crear pares de entrada/salida
      for (let i = 0; i < registrosFiltrados.length; i += 2) {
        const marcaEntrada = registrosFiltrados[i];
        const marcaSalida = registrosFiltrados[i + 1];

        // Entrada
        registrosProcesados.push({
          fecha: marcaEntrada.fecha,
          hora: marcaEntrada.hora,
          tipo: 'ENTRADA'
        });

        // Salida (si existe)
        if (marcaSalida) {
          registrosProcesados.push({
            fecha: marcaSalida.fecha,
            hora: marcaSalida.hora,
            tipo: 'SALIDA'
          });
        } else {
          // Si no hay salida, agregar vacío
          registrosProcesados.push({
            fecha: marcaEntrada.fecha,
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
      nombre: data.nombre,
      registros: registrosProcesados,
      requiresManualReview
    });
  };

  return {
    empleadosJornada,
    importacionCompleta
  };
};//

export async function createJornadas(parametros: jornadasParametros) { //voy por arreglar esto
  return executeQuery(
    'createJornadas',
    async () => {

      const { empleadosJornadas, id_proyecto, id_tipojornada, nombreArchivo, id_tipoimportacion, id_usuariocreacion } = parametros;
      let contador = 0;
      let fechaMemoria: Date = new Date(0);
      let quincenaMemoria: number = 0;
      let id_mes: number = 0;
      let id_quincena: number = 0;

      const id_importacionProSoft = await getTipoImportacionProSoft();

      const importacion_incompleta = await getEstadoImportacionIncompleta();
      const importacion_revision = await getEstadoImportacionRevision();

      let id_importacion;

      if (empleadosJornadas.importacionCompleta) {

        id_importacion = await insertImportacion({
          id_estadoimportacion: importacion_revision,
          id_proyecto: id_proyecto,
          nombreArchivo: nombreArchivo,
          id_tipoimportacion: id_tipoimportacion,
          id_usuariocreacion: id_usuariocreacion,
        });
      } else {

        id_importacion = await insertImportacion({
          id_estadoimportacion: importacion_incompleta,
          id_proyecto: id_proyecto,
          nombreArchivo: nombreArchivo,
          id_tipoimportacion: id_tipoimportacion,
          id_usuariocreacion: id_usuariocreacion,
        });
      };

      const jornada_valida = await getEstadoJornadaValida();
      const jornada_revision = await getEstadoJornadaRevision();

      const id_fuentemarca = await getFuenteMarcaControl();

      const completa = empleadosJornadas.importacionCompleta;

      //

      for (const [id_reloj, { nombre, registros, requiresManualReview }] of empleadosJornadas.empleadosJornada.entries()) {

        let id_empleado: number;

        const empleadoParametros = {
          id_reloj: Number(id_reloj),
          id_proyecto: id_proyecto,
          id_tipoimportacion: id_tipoimportacion
        };

        const empleado = await getEmpleadoByRelojProyecto(empleadoParametros);

        if (empleado.rowCount === 0) {

          const insertEmpleadoParametros = {
            id_reloj: Number(id_reloj),
            id_proyecto: id_proyecto,
            legajo: null as number | null,
            nombre: nombre,
            id_tipoempleado: null as number | null,
          };

          id_empleado = await insertEmpleado(insertEmpleadoParametros);
        } else {
          id_empleado = empleado.rows[0].id;
        };

        const jornadasPorFecha: Map<string, Array<{ tipo: string; hora: string; orden: number }>> = new Map();

        for (const { fecha, hora, tipo } of registros) {
          if (!jornadasPorFecha.has(fecha)) {
            jornadasPorFecha.set(fecha, []);
          };

          const registrosFecha = jornadasPorFecha.get(fecha)!;
          registrosFecha.push({
            tipo: tipo,
            hora: hora,
            orden: registrosFecha.length
          });
        };

        for (const [fecha, registrosFecha] of jornadasPorFecha.entries()) {

          const fechaObjeto = new Date(fecha + "T12:00:00");
          const año = fechaObjeto.getFullYear();
          const mes = fechaObjeto.getMonth() + 1;
          const dia = fechaObjeto.getDate();
          const quincena = dia <= 15 ? 1 : 2;

          if (fechaMemoria.getFullYear() !== año || fechaMemoria.getMonth() + 1 !== mes || id_mes === 0 || id_quincena === 0 || quincenaMemoria !== quincena) {
            fechaMemoria = fechaObjeto;
            quincenaMemoria = quincena;

            const ids = await getMesQuincena({ año, mes, quincena });

            id_mes = ids.id_mes;
            id_quincena = ids.id_quincena;
          };

          const jornadas = emparejarEntradaSalida(registrosFecha);

          for (const jornada of jornadas) {
            if (jornada.entrada || jornada.salida) {

              if (parametros.id_tipoimportacion === id_importacionProSoft) {

                await deleteAbsenceProSoft({
                  fecha: fecha,
                  id_empleado: id_empleado
                });
              };

              await insertJornada({
                fecha: fecha,
                entrada: jornada.entrada || null,
                salida: jornada.salida || null,
                id_empleado: id_empleado,
                id_proyecto: id_proyecto,
                id_mes: id_mes,
                id_quincena: id_quincena,
                id_tipojornada: id_tipojornada,
                id_ausencia: null,
                id_estadojornada: requiresManualReview ? jornada_revision : jornada_valida,
                id_importacion: id_importacion,
                id_fuentemarca: id_fuentemarca,
                id_usuariocreacion: id_usuariocreacion,
              });
            };
          };
        };

        await recalculateJornadasEmpleado({ id_empleado: id_empleado });

        contador++;
      };

      return { id_importacion, completa }
    },

    parametros,
    true
  );
};//

function emparejarEntradaSalida(registros: Array<{ tipo: string; hora: string; orden: number }>) {
  const jornadas: Array<{ entrada?: string; salida?: string }> = [];

  // Separar entradas y salidas, manteniendo el orden temporal
  const entradas = registros.filter(r => r.tipo === 'ENTRADA').sort((a, b) => a.orden - b.orden);
  const salidas = registros.filter(r => r.tipo === 'SALIDA').sort((a, b) => a.orden - b.orden);

  // Estrategia de emparejamiento
  let indiceEntrada = 0;
  let indiceSalida = 0;

  while (indiceEntrada < entradas.length || indiceSalida < salidas.length) {
    const jornada: { entrada?: string; salida?: string } = {};

    // Si hay entrada disponible
    if (indiceEntrada < entradas.length) {
      jornada.entrada = entradas[indiceEntrada].hora;
      indiceEntrada++;
    }

    // Si hay salida disponible
    if (indiceSalida < salidas.length) {
      jornada.salida = salidas[indiceSalida].hora;
      indiceSalida++;
    }

    jornadas.push(jornada);

    // Prevenir bucle infinito
    if (!jornada.entrada && !jornada.salida) {
      break;
    };
  };
  return jornadas;
};

export async function generarExcel(resumenJornadas: resumenJornadasExcel[]) {
  try {
    // Crear el workbook
    const workbook = new ExcelJS.Workbook();

    // Configurar propiedades del workbook
    workbook.creator = 'Sistema de Jornadas';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.description = 'Resumen de Jornadas de Trabajo';

    // Crear la hoja de cálculo
    const worksheet = workbook.addWorksheet('Resumen de Jornadas');

    // Recolectar todos los tipos de ausencias únicos
    const tiposAusencias = new Map<number, string>();
    resumenJornadas.forEach(resumen => {
      if (resumen.ausencias && Array.isArray(resumen.ausencias)) {
        resumen.ausencias.forEach((ausencia: any) => {
          if (ausencia.id && ausencia.nombre) {
            tiposAusencias.set(ausencia.id, ausencia.nombre);
          }
        });
      }
    });

    // Definir las columnas base
    const columnasBase: any[] = [
      { header: 'Legajo', key: 'legajo', width: 15 },
      { header: 'Empleado', key: 'empleado', width: 50 },
      { header: 'Total Horas', key: 'suma_total', width: 20 },
      { header: 'Horas Normales', key: 'suma_total_normal', width: 20 },
      { header: 'Horas 50%', key: 'suma_total_50', width: 20 },
      { header: 'Horas 100%', key: 'suma_total_100', width: 20 },
      { header: 'Horas Feriado', key: 'suma_total_feriado', width: 20 },
      { header: 'Horas Nocturnas', key: 'suma_total_nocturno', width: 20 },
    ];

    // Agregar columnas de ausencias dinámicamente
    const columnasAusencias: any[] = Array.from(tiposAusencias.entries()).map(([id, nombre]) => ({
      header: `Ausencia: ${nombre}`,
      key: `ausencia_${id}`,
      width: 20
    }));

    worksheet.columns = [...columnasBase, ...columnasAusencias];

    // Agregar los datos
    resumenJornadas.forEach(resumen => {
      const fila: any = {
        legajo: resumen.legajo,
        empleado: resumen.empleado,
        suma_total: parseFloat(resumen.suma_total.toString()),
        suma_total_normal: parseFloat(resumen.suma_total_normal.toString()),
        suma_total_50: parseFloat(resumen.suma_total_50.toString()),
        suma_total_100: parseFloat(resumen.suma_total_100.toString()),
        suma_total_feriado: parseFloat(resumen.suma_total_feriado.toString()),
        suma_total_nocturno: parseFloat(resumen.suma_total_nocturno.toString()),
      };

      // Agregar las ausencias
      tiposAusencias.forEach((nombre, id) => {
        const ausencia = resumen.ausencias?.find((a: any) => a.id === id);
        fila[`ausencia_${id}`] = ausencia ? ausencia.cantidad : 0;
      });

      worksheet.addRow(fila);
    });

    // Estilizar el header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
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
        top: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
    });

    const numColumnasBase = columnasBase.length;

    // Aplicar estilos a las filas de datos
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
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
            top: { style: 'medium', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
          };

          // Alineación específica por columna
          if (colNumber === 1) { // Legajo
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 2) { // Empleado
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else { // Columnas numéricas (horas y ausencias)
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            // Solo formato decimal para columnas de horas
            if (colNumber <= numColumnasBase) {
              cell.numFmt = '0.00';
            } else {
              cell.numFmt = '0'; // Ausencias sin decimales
            }
          };
        });
      };
    });

    // Calcular totales
    const totales: any = {
      suma_total: 0,
      suma_total_normal: 0,
      suma_total_50: 0,
      suma_total_100: 0,
      suma_total_feriado: 0,
      suma_total_nocturno: 0,
    };

    // Inicializar totales de ausencias
    tiposAusencias.forEach((nombre, id) => {
      totales[`ausencia_${id}`] = 0;
    });

    // Calcular totales
    resumenJornadas.forEach(resumen => {
      totales.suma_total += parseFloat(resumen.suma_total.toString());
      totales.suma_total_normal += parseFloat(resumen.suma_total_normal.toString());
      totales.suma_total_50 += parseFloat(resumen.suma_total_50.toString());
      totales.suma_total_100 += parseFloat(resumen.suma_total_100.toString());
      totales.suma_total_feriado += parseFloat(resumen.suma_total_feriado.toString());
      totales.suma_total_nocturno += parseFloat(resumen.suma_total_nocturno.toString());

      // Sumar ausencias
      tiposAusencias.forEach((nombre, id) => {
        const ausencia = resumen.ausencias?.find((a: any) => a.id === id);
        totales[`ausencia_${id}`] += ausencia ? ausencia.cantidad : 0;
      });
    });

    // Agregar fila vacía antes de los totales
    worksheet.addRow({});

    // Agregar fila de totales
    const filaTotal: any = {
      legajo: '',
      empleado: 'TOTALES:',
      suma_total: totales.suma_total,
      suma_total_normal: totales.suma_total_normal,
      suma_total_50: totales.suma_total_50,
      suma_total_100: totales.suma_total_100,
      suma_total_feriado: totales.suma_total_feriado,
      suma_total_nocturno: totales.suma_total_nocturno,
    };

    // Agregar totales de ausencias
    tiposAusencias.forEach((nombre, id) => {
      filaTotal[`ausencia_${id}`] = totales[`ausencia_${id}`];
    });

    const totalRow = worksheet.addRow(filaTotal);

    // Estilizar la fila de totales
    totalRow.height = 25;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 11 };
      cell.border = {
        top: { style: 'double', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'double', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };

      if (colNumber === 2) { // Columna empleado con "TOTALES:"
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E6F3FF' }
        };
      } else if (colNumber > 2) { // Columnas numéricas
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        if (colNumber <= numColumnasBase) {
          cell.numFmt = '0.00';
        } else {
          cell.numFmt = '0';
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFACD' }
        };
      };
    });

    // Aplicar filtros automáticos
    const totalColumnas = columnasBase.length + columnasAusencias.length;
    const letraColumna = String.fromCharCode(64 + totalColumnas); // Convertir número a letra (A, B, C...)
    worksheet.autoFilter = {
      from: 'A1',
      to: `${letraColumna}${resumenJornadas.length + 1}`
    };

    // Congelar la primera fila
    worksheet.views = [{
      state: 'frozen',
      ySplit: 1
    }];

    // Crear hoja de observaciones
    const observacionesSheet = workbook.addWorksheet('Observaciones');
    observacionesSheet.getColumn(1).width = 15; // Legajo
    observacionesSheet.getColumn(2).width = 50; // Empleado
    observacionesSheet.getColumn(3).width = 100; // Observaciones

    // Agregar header de columnas al inicio
    const mainHeaderRow = observacionesSheet.addRow(['Legajo', 'Empleado', 'Observaciones']);
    mainHeaderRow.height = 25;
    mainHeaderRow.eachCell((cell) => {
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
        top: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: 'CCCCCC' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: 'CCCCCC' } }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
    });

    // Agregar una fila por empleado con todas sus observaciones
    resumenJornadas.forEach((resumen) => {
      if (resumen.observaciones && resumen.observaciones.length > 0) {
        // Concatenar todas las observaciones con fecha
        const observacionesTexto = resumen.observaciones
          .map((obs: any) => `[${obs.fecha}] - ${obs.texto}`)
          .join('\n');

        const obsRow = observacionesSheet.addRow([
          resumen.legajo,
          resumen.empleado,
          observacionesTexto
        ]);

        obsRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        obsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        obsRow.getCell(3).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

        // Altura dinámica basada en cantidad de observaciones
        obsRow.height = Math.max(30, resumen.observaciones.length * 15);

        // Aplicar bordes
        obsRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'medium', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
          };
        });
      }
    });

    // Aplicar filtros automáticos a la hoja de observaciones
    const totalObservacionesRows = observacionesSheet.rowCount;
    if (totalObservacionesRows > 1) {
      observacionesSheet.autoFilter = {
        from: 'A1',
        to: `C${totalObservacionesRows}`
      };

      // Congelar la primera fila
      observacionesSheet.views = [{
        state: 'frozen',
        ySplit: 1
      }];
    }

    // Agregar información adicional en una hoja separada
    const infoSheet = workbook.addWorksheet('Información');
    infoSheet.addRow(['Reporte generado:', new Date().toLocaleString('es-AR')]);
    infoSheet.addRow(['Total de empleados:', resumenJornadas.length]);
    infoSheet.addRow(['Total de horas:', totales.suma_total]);

    // Estilizar la hoja de información
    infoSheet.getColumn(1).width = 20;
    infoSheet.getColumn(2).width = 25;
    infoSheet.eachRow((row) => {
      row.getCell(1).font = { bold: true };
    });

    // Generar el buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return buffer;
  } catch (error) {
    throw createBackEndError('generarExcel');
  };
};//