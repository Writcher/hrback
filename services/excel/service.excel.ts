"use server";

import { getMesQuincenaParametros, jornadasParametros } from "../../lib/types/excel";
import { resumenJornadasExcel } from "../../lib/types/jornada";
import ExcelJS from "exceljs";
import { db } from "@vercel/postgres";
import { getEstadoImportacionIncompleta, getEstadoImportacionRevision } from "../estadoimportacion/service.estadoimportacion";
import { insertImportacion } from "../importacion/service.importacion";
import { getEstadoJornadaRevision, getEstadoJornadaSinValidar } from "../estadojornada/service.estadojornada";
import { getAñoByValor, insertAño } from "../año/service.año";
import { getMesByMes, insertMes } from "../mes/service.mes";
import { getQuincenaByMes, insertQuincena } from "../quincena/service.quincena";
import { getEmpleadoByRelojProyecto, insertEmpleado } from "../empleado/service.empleado";
import { insertJornada } from "../jornada/service.jornada";

const client = db;

export async function getMesQuincena(parametros: getMesQuincenaParametros) {
  try {
    // Año
    let id_año: number;

    const añoParametros = {
      valor: parametros.año,
    };

    const año = await getAñoByValor(añoParametros);

    if (año.rowCount === 0) {
      id_año = await insertAño(añoParametros);
    } else {
      id_año = año.rows[0].valor;
    };

    // Mes
    let id_mes: number;

    const mesParametros = {
      mes: parametros.mes,
      id_año: id_año,
    };

    const mes = await getMesByMes(mesParametros);

    if (mes.rowCount === 0) {
      id_mes = await insertMes(mesParametros);
    } else {
      id_mes = mes.rows[0].id;
    };

    // Quincena
    let id_quincena: number;

    const quincenaParametros = {
      quincena: parametros.quincena,
      id_mes: id_mes,
    };

    const quincena = await getQuincenaByMes(quincenaParametros);

    if (quincena.rowCount === 0) {
      id_quincena = await insertQuincena(quincenaParametros);
    } else {
      id_quincena = quincena.rows[0].id;
    };

    return { id_mes, id_quincena };
  } catch (error) {
    console.error("Error en verifyExistenciaInstancias: ", error);
    throw error;
  };
};//

export async function processExcel(buffer: ArrayBuffer) {
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
  }

  // Función para extraer fecha de un valor de celda
  function extractDate(cellValue: any): string {
    if (!cellValue) return '';

    if (cellValue instanceof Date) {
      return cellValue.toISOString().split("T")[0];
    }

    if (typeof cellValue === "number") {
      const date = excelDateToJSDate(cellValue);
      return date.toISOString().split("T")[0];
    }

    const str = String(cellValue).trim();
    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        if (year.length === 2) {
          const currentYear = new Date().getFullYear();
          const currentCentury = Math.floor(currentYear / 100) * 100;
          year = String(currentCentury + parseInt(year));
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return str.split(" ")[0];
  }

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
      }

      if (correctedHours >= 24) {
        correctedHours -= 24;
      }

      return `${correctedHours.toString().padStart(2, '0')}:${correctedMinutes.toString().padStart(2, '0')}`;
    }

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
      }
    }

    const str = String(cellValue).trim();
    const parts = str.split(' ');
    if (parts.length > 1) {
      return parts[1];
    }

    return str;
  }

  // Función para convertir tiempo a minutos para comparación
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Función para detectar posibles turnos nocturnos basado en patrones de horarios
  function detectNightShiftPattern(registros: { fecha: string, hora: string, tipo: string }[]): {
    isLikelyNightShift: boolean,
    suspiciousRecords: { fecha: string, hora: string, tipo: string, reason: string }[]
  } {
    const suspicious: { fecha: string, hora: string, tipo: string, reason: string }[] = [];

    // Agrupar por fecha para análisis
    const recordsByDate = new Map<string, { hora: string, tipo: string }[]>();
    registros.forEach(registro => {
      if (!recordsByDate.has(registro.fecha)) {
        recordsByDate.set(registro.fecha, []);
      }
      recordsByDate.get(registro.fecha)!.push({ hora: registro.hora, tipo: registro.tipo });
    });

    let nightShiftIndicators = 0;

    for (const [fecha, dayRecords] of recordsByDate.entries()) {
      for (const record of dayRecords) {
        const minutes = timeToMinutes(record.hora);

        // Detectar patrones sospechosos de turno nocturno
        if (minutes >= 0 && minutes < 360 && record.tipo === 'SALIDA') { // 00:00-06:00 SALIDA
          suspicious.push({
            fecha,
            hora: record.hora,
            tipo: record.tipo,
            reason: 'SALIDA en madrugada - posible fin de turno nocturno'
          });
          nightShiftIndicators++;
        }

        if (minutes >= 1320 && record.tipo === 'ENTRADA') { // 22:00-23:59 ENTRADA
          suspicious.push({
            fecha,
            hora: record.hora,
            tipo: record.tipo,
            reason: 'ENTRADA nocturna - posible inicio de turno nocturno'
          });
          nightShiftIndicators++;
        }
      }
    }

    return {
      isLikelyNightShift: nightShiftIndicators > 0,
      suspiciousRecords: suspicious
    };
  }

  // Función mejorada para limpiar registros duplicados y erróneos
  function cleanRegistros(registros: { fecha: string, hora: string, tipo: string }[]) {
    if (registros.length === 0) return [];

    // Ordenar por fecha y hora (sin modificar fechas para turnos nocturnos)
    registros.sort((a, b) => {
      const dateCompare = a.fecha.localeCompare(b.fecha);
      if (dateCompare !== 0) return dateCompare;
      return timeToMinutes(a.hora) - timeToMinutes(b.hora);
    });

    const cleaned: { fecha: string, hora: string, tipo: string }[] = [];
    const TOLERANCE_MINUTES = 5;

    for (let i = 0; i < registros.length; i++) {
      const current = registros[i];

      // Buscar si hay un registro muy cercano en tiempo
      const nextIndex = i + 1;
      if (nextIndex < registros.length) {
        const next = registros[nextIndex];

        // Si son del mismo día
        if (current.fecha === next.fecha) {
          const currentMinutes = timeToMinutes(current.hora);
          const nextMinutes = timeToMinutes(next.hora);
          const diffMinutes = Math.abs(nextMinutes - currentMinutes);

          // Si están a menos de la tolerancia de distancia
          if (diffMinutes <= TOLERANCE_MINUTES) {
            // Caso 1: Misma hora exacta - tomar la primera
            if (diffMinutes === 0) {
              cleaned.push(current);
              i++; // Saltar la siguiente
              continue;
            }

            // Caso 2: Si uno es ENTRADA y otro SALIDA, evaluar contexto
            if (current.tipo !== next.tipo) {
              const lastEntry = cleaned[cleaned.length - 1];

              if (lastEntry && lastEntry.fecha === current.fecha) {
                // Si ya hay una entrada, la siguiente debería ser salida
                if (lastEntry.tipo === 'ENTRADA') {
                  const salidaRecord = current.tipo === 'SALIDA' ? current : next;
                  cleaned.push(salidaRecord);
                } else {
                  // Si ya hay una salida, la siguiente debería ser entrada
                  const entradaRecord = current.tipo === 'ENTRADA' ? current : next;
                  cleaned.push(entradaRecord);
                }
              } else {
                // Si no hay contexto previo, tomar ENTRADA
                const entradaRecord = current.tipo === 'ENTRADA' ? current : next;
                cleaned.push(entradaRecord);
              }
              i++; // Saltar la siguiente
              continue;
            }

            // Caso 3: Mismo tipo - tomar la primera
            cleaned.push(current);
            i++; // Saltar la siguiente
            continue;
          }
        }
      }

      // Si llegamos aquí, no hay conflicto
      cleaned.push(current);
    }

    return cleaned;
  }



  // Función para validar si los registros están completos (pares entrada-salida)
  function validateCompleteRecords(registros: { fecha: string, hora: string, tipo: string }[]): {
    isComplete: boolean,
    issues: { fecha: string, issue: string }[]
  } {
    const recordsByDate = new Map<string, { hora: string, tipo: string }[]>();
    const issues: { fecha: string, issue: string }[] = [];

    registros.forEach(registro => {
      if (!recordsByDate.has(registro.fecha)) {
        recordsByDate.set(registro.fecha, []);
      }
      recordsByDate.get(registro.fecha)!.push({ hora: registro.hora, tipo: registro.tipo });
    });

    let isComplete = true;

    for (const [fecha, dayRecords] of recordsByDate.entries()) {
      dayRecords.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));

      // Verificar si hay un número par de registros
      if (dayRecords.length % 2 !== 0) {
        isComplete = false;
        issues.push({ fecha, issue: `Número impar de registros (${dayRecords.length})` });
        continue;
      }

      // Verificar patrón ENTRADA-SALIDA
      for (let i = 0; i < dayRecords.length; i += 2) {
        const entrada = dayRecords[i];
        const salida = dayRecords[i + 1];

        if (!entrada || !salida) {
          isComplete = false;
          issues.push({ fecha, issue: 'Registro faltante en par entrada-salida' });
          continue;
        }

        if (entrada.tipo !== 'ENTRADA' || salida.tipo !== 'SALIDA') {
          isComplete = false;
          issues.push({
            fecha,
            issue: `Patrón incorrecto: ${entrada.tipo}-${salida.tipo} en lugar de ENTRADA-SALIDA`
          });
        }

        // Verificar que la salida sea después de la entrada
        const entradaMinutes = timeToMinutes(entrada.hora);
        const salidaMinutes = timeToMinutes(salida.hora);

        if (salidaMinutes <= entradaMinutes) {
          isComplete = false;
          issues.push({
            fecha,
            issue: `Salida (${salida.hora}) no puede ser antes o igual que entrada (${entrada.hora})`
          });
        }
      }
    }

    return { isComplete, issues };
  }

  // Procesar Excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No se encontró hoja en el archivo");
  }

  // Parsear filas a partir de la 7 (ignorando encabezados)
  const empleadosMap = new Map<string, {
    nombre: string,
    registros: { fecha: string, hora: string, tipo: string }[],
    registrosOriginales: number,
    registrosLimpios: number,
    issues: { fecha: string, issue: string }[]
  }>();

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 6) return;

    const fechaRaw = row.getCell(2).value; // Columna B
    const horaRaw = row.getCell(3).value;  // Columna C
    const tipo = row.getCell(5).text?.toUpperCase(); // Columna E
    const idEmpleado = row.getCell(7).text?.trim();  // Columna G
    const nombreEmpleado = row.getCell(8).text?.trim(); // Columna H

    if (!idEmpleado || !nombreEmpleado || !tipo || !fechaRaw || !horaRaw) return;

    const fecha = extractDate(fechaRaw);
    const hora = extractTime(horaRaw);

    if (!empleadosMap.has(idEmpleado)) {
      empleadosMap.set(idEmpleado, {
        nombre: nombreEmpleado,
        registros: [],
        registrosOriginales: 0,
        registrosLimpios: 0,
        issues: []
      });
    }

    empleadosMap.get(idEmpleado)!.registros.push({ fecha, hora, tipo });
  });

  // Procesar cada empleado
  let globalIsComplete = true;
  const empleadosProcessed = new Map();

  for (const [idEmpleado, data] of empleadosMap.entries()) {
    const registrosOriginales = data.registros.length;

    // Detectar patrones de turno nocturno
    const nightShiftAnalysis = detectNightShiftPattern(data.registros);

    // Limpiar registros duplicados
    let registrosLimpios = cleanRegistros(data.registros);

    // Validar completitud (sin inferir registros faltantes)
    const validation = validateCompleteRecords(registrosLimpios);

    if (!validation.isComplete) {
      globalIsComplete = false;
    }

    empleadosProcessed.set(idEmpleado, {
      nombre: data.nombre,
      registros: registrosLimpios,
      registrosOriginales,
      registrosLimpios: registrosLimpios.length,
      issues: validation.issues,
      isComplete: validation.isComplete,
      nightShiftWarnings: nightShiftAnalysis.suspiciousRecords,
      requiresManualReview: !validation.isComplete || nightShiftAnalysis.isLikelyNightShift
    });
  }

  return {
    empleadosJornada: empleadosProcessed,
    importacionCompleta: globalIsComplete
  };
};

export async function createJornadas(parametros: jornadasParametros) {
  try {

    await client.query('BEGIN');

    const { empleadosJornadas, id_proyecto, id_tipojornada, nombreArchivo, id_tipoimportacion } = parametros;
    let contador = 0;
    let fechaMemoria: Date = new Date(0);
    let quincenaMemoria: number = 0;
    let id_mes: number = 0;
    let id_quincena: number = 0;

    const importacion_incompleta = await getEstadoImportacionIncompleta();
    const importacion_revision = await getEstadoImportacionRevision();

    let id_importacion;

    if (empleadosJornadas.importacionCompleta) {

      const insertImportacionParametros = {
        id_estadoimportacion: importacion_revision,
        id_proyecto: id_proyecto,
        nombreArchivo: nombreArchivo,
        id_tipoimportacion: id_tipoimportacion
      };

      id_importacion = await insertImportacion(insertImportacionParametros);
    } else {

      const insertImportacionParametros = {
        id_estadoimportacion: importacion_incompleta,
        id_proyecto: id_proyecto,
        nombreArchivo: nombreArchivo,
        id_tipoimportacion: id_tipoimportacion
      };


      id_importacion = await insertImportacion(insertImportacionParametros);
    };

    const jornada_sinvalidar = await getEstadoJornadaSinValidar();
    const jornada_revision = await getEstadoJornadaRevision();

    const completa = empleadosJornadas.importacionCompleta;

    for (const [id_reloj, { nombre, registros, requiresManualReview }] of empleadosJornadas.empleadosJornada.entries()) {

      let id_empleado: number;

      const empleadoParametros = {
        id_reloj: Number(id_reloj),
        id_proyecto: id_proyecto,
      };

      const empleado = await getEmpleadoByRelojProyecto(empleadoParametros);

      if (empleado.rowCount === 0) {

        const insertEmpleadoParametros = {
          id_reloj: Number(id_reloj),
          id_proyecto: id_proyecto,
          legajo: '' as number | '',
          nombre: nombre,
          id_tipoempleado: '' as number | '',
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

          const getMesQuincenaParametros = { año, mes, quincena };

          const ids = await getMesQuincena(getMesQuincenaParametros);

          id_mes = ids.id_mes;
          id_quincena = ids.id_quincena;
        };

        const jornadas = emparejarEntradaSalida(registrosFecha);

        for (const jornada of jornadas) {
          if (jornada.entrada || jornada.salida) {
            const insertJornadaParametros = {
              fecha: fecha,
              entrada: jornada.entrada || null,
              salida: jornada.salida || null,
              id_empleado: id_empleado,
              id_proyecto: id_proyecto,
              id_mes: id_mes,
              id_quincena: id_quincena,
              id_tipojornada: id_tipojornada,
              id_ausencia: null,
              id_estadojornada: requiresManualReview ? jornada_revision : jornada_sinvalidar,
              id_importacion: id_importacion,
            };

            await insertJornada(insertJornadaParametros);
          };
        };
      };

      contador++;
    };

    await client.query('COMMIT');

    return { id_importacion, completa }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error en insertJornada: ", error);
    throw error;
  };
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

    // Definir las columnas
    worksheet.columns = [
      { header: 'Legajo', key: 'legajo', width: 15 },
      { header: 'Empleado', key: 'empleado', width: 50 },
      { header: 'Total Horas', key: 'suma_total', width: 20 },
      { header: 'Horas Normales', key: 'suma_total_normal', width: 20 },
      { header: 'Horas 50%', key: 'suma_total_50', width: 20 },
      { header: 'Horas 100%', key: 'suma_total_100', width: 20 },
      { header: 'Horas Feriado', key: 'suma_total_feriado', width: 20 },
      { header: 'Horas Nocturnas', key: 'suma_total_nocturno', width: 20},
      { header: 'Horas Nocturnas 100%', key: 'suma_total_nocturno_100', width: 20},
    ];

    // Agregar los datos
    resumenJornadas.forEach(resumen => {
      worksheet.addRow({
        legajo: resumen.legajo,
        empleado: resumen.empleado,
        suma_total: parseFloat(resumen.suma_total.toString()),
        suma_total_normal: parseFloat(resumen.suma_total_normal.toString()),
        suma_total_50: parseFloat(resumen.suma_total_50.toString()),
        suma_total_100: parseFloat(resumen.suma_total_100.toString()),
        suma_total_feriado: parseFloat(resumen.suma_total_feriado.toString()),
        suma_total_nocturno: parseFloat(resumen.suma_total_nocturno.toString()),
        suma_total_nocturno_100: parseFloat(resumen.suma_total_nocturno_100.toString())
      });
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
              fgColor: { argb: 'F8F9FA' } // Gris muy claro
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
          if (colNumber === 1) { // Legajo
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 2) { // Empleado
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else { // Columnas numéricas
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '0.00'; // Formato numérico con 2 decimales
          };
        });
      };
    });

    // Calcular totales
    const totales = resumenJornadas.reduce((acc, resumen) => ({
      suma_total: acc.suma_total + parseFloat(resumen.suma_total.toString()),
      suma_total_normal: acc.suma_total_normal + parseFloat(resumen.suma_total_normal.toString()),
      suma_total_50: acc.suma_total_50 + parseFloat(resumen.suma_total_50.toString()),
      suma_total_100: acc.suma_total_100 + parseFloat(resumen.suma_total_100.toString()),
      suma_total_feriado: acc.suma_total_feriado + parseFloat(resumen.suma_total_feriado.toString()),
      suma_total_nocturno: acc.suma_total_nocturno + parseFloat(resumen.suma_total_nocturno.toString()),
      suma_total_nocturno_100: acc.suma_total_nocturno_100 + parseFloat(resumen.suma_total_nocturno_100.toString())
    }), {
      suma_total: 0,
      suma_total_normal: 0,
      suma_total_50: 0,
      suma_total_100: 0,
      suma_total_feriado: 0,
      suma_total_nocturno: 0,
      suma_total_nocturno_100: 0,
    });

    // Agregar fila vacía antes de los totales
    worksheet.addRow({});

    // Agregar fila de totales
    const totalRow = worksheet.addRow({
      legajo: '',
      empleado: 'TOTALES:',
      suma_total: totales.suma_total,
      suma_total_normal: totales.suma_total_normal,
      suma_total_50: totales.suma_total_50,
      suma_total_100: totales.suma_total_100,
      suma_total_feriado: totales.suma_total_feriado,
      suma_total_nocturno: totales.suma_total_nocturno,
      suma_total_nocturno_100: totales.suma_total_nocturno_100
    });

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
          fgColor: { argb: 'E6F3FF' } // Azul claro
        };
      } else if (colNumber > 2) { // Columnas numéricas
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.00';
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFACD' } // Amarillo claro
        };
      };
    });

    // Aplicar filtros automáticos (solo a los datos, no a los totales)
    worksheet.autoFilter = {
      from: 'A1',
      to: `I${resumenJornadas.length + 1}`
    };

    // Congelar la primera fila
    worksheet.views = [{
      state: 'frozen',
      ySplit: 1
    }];

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
    console.error('Error generando Excel:', error);
    throw new Error('Error al generar el archivo Excel');
  };
};//