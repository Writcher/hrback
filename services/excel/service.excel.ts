"use server";

import { verificarInstanciasParametros, jornadasParametros } from "../../lib/excel";
import ExcelJS from "exceljs";
import { db } from "@vercel/postgres";

const client = db;

export async function verifyExistenciaInstancias(params: verificarInstanciasParametros) {
  try {
    // Año
    let id_año: number;
    const textoAño = `
          SELECT valor
          FROM "año"
          WHERE valor = $1    
        `;
    const valoresAño = [params.año];
    const resultadoAño = await client.query(textoAño, valoresAño);
    if (resultadoAño.rowCount === 0) {
      const textoInsertAño = `
              INSERT INTO "año" (valor)
              VALUES ($1)
              RETURNING valor
            `;
      const valoresInsertAño = [params.año];
      const resultadoInsertAño = await client.query(textoInsertAño, valoresInsertAño);
      id_año = resultadoInsertAño.rows[0].valor;
    } else {
      id_año = resultadoAño.rows[0].valor;
    };

    // Mes
    let id_mes: number;
    const textoMes = `
          SELECT id
          FROM "mes"
          WHERE mes = $1 AND id_año = $2
        `;
    const valoresMes = [params.mes, id_año];
    const resultadoMes = await client.query(textoMes, valoresMes);
    if (resultadoMes.rowCount === 0) {
      const textoInsertMes = `
              INSERT INTO "mes" (mes, id_año)
              VALUES ($1, $2)
              RETURNING id
            `;
      const valoresInsertMes = [params.mes, id_año];
      const resultadoInsertMes = await client.query(textoInsertMes, valoresInsertMes);
      id_mes = resultadoInsertMes.rows[0].id;
    } else {
      id_mes = resultadoMes.rows[0].id;
    };

    // Quincena
    let id_quincena: number;
    const textoQuincena = `
          SELECT id
          FROM "quincena"
          WHERE quincena = $1 AND id_mes = $2
        `;
    const valoresQuincena = [params.quincena, id_mes];
    const resultadoQuincena = await client.query(textoQuincena, valoresQuincena);
    if (resultadoQuincena.rowCount === 0) {
      const textQuincenaInsert = `
              INSERT INTO "quincena" (quincena, id_mes)
              VALUES ($1, $2)
              RETURNING id
            `;
      const valoresInsertQuincena = [params.quincena, id_mes];
      const resultadoInsertQuincena = await client.query(textQuincenaInsert, valoresInsertQuincena);
      id_quincena = resultadoInsertQuincena.rows[0].id;
    } else {
      id_quincena = resultadoQuincena.rows[0].id;
    };

    return { id_mes, id_quincena };
  } catch (error) {
    console.error("Error en verifyInstancesExistance: ", error);
    throw error;
  };
};

//Esta la hizo GPT, no tocar que por ahora anda
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

  // Función para convertir tiempo a minutos para comparación
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Función para limpiar registros duplicados y erróneos
  function cleanRegistros(registros: { fecha: string, hora: string, tipo: string }[]) {
    // Ordenar por fecha y hora
    registros.sort((a, b) => {
      const dateCompare = a.fecha.localeCompare(b.fecha);
      if (dateCompare !== 0) return dateCompare;
      return timeToMinutes(a.hora) - timeToMinutes(b.hora);
    });

    const cleaned: { fecha: string, hora: string, tipo: string }[] = [];
    const TOLERANCE_MINUTES = 5; // Tolerancia de 5 minutos

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

          // Si están a menos de 5 minutos de distancia
          if (diffMinutes <= TOLERANCE_MINUTES) {

            // Lógica de resolución de conflictos:

            // Caso 1: Misma hora exacta - tomar la primera
            if (diffMinutes === 0) {
              cleaned.push(current);
              i++; // Saltar la siguiente
              continue;
            };

            // Caso 2: Si uno es ENTRADA y otro SALIDA, evaluar contexto
            if (current.tipo !== next.tipo) {
              // Determinar cuál es más lógico basado en el patrón esperado
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
                };
              } else {
                // Si no hay contexto previo, tomar ENTRADA
                const entradaRecord = current.tipo === 'ENTRADA' ? current : next;
                cleaned.push(entradaRecord);
              };
              i++; // Saltar la siguiente
              continue;
            };

            // Caso 3: Mismo tipo - tomar la primera
            cleaned.push(current);
            i++; // Saltar la siguiente
            continue;
          };
        };
      };

      // Si llegamos aquí, no hay conflicto
      cleaned.push(current);
    };

    return cleaned;
  };

  // Función para validar si los registros están completos (pares entrada-salida)
  function validateCompleteRecords(registros: { fecha: string, hora: string, tipo: string }[]): boolean {
    // Agrupar registros por fecha
    const recordsByDate = new Map<string, { hora: string, tipo: string }[]>();

    registros.forEach(registro => {
      if (!recordsByDate.has(registro.fecha)) {
        recordsByDate.set(registro.fecha, []);
      }
      recordsByDate.get(registro.fecha)!.push({ hora: registro.hora, tipo: registro.tipo });
    });

    // Verificar cada día
    for (const [fecha, dayRecords] of recordsByDate.entries()) {
      // Ordenar por hora
      dayRecords.sort((a, b) => timeToMinutes(a.hora) - timeToMinutes(b.hora));

      // Verificar si hay un número par de registros y si alternan ENTRADA-SALIDA
      if (dayRecords.length % 2 !== 0) {
        // Número impar de registros = incompleto
        return false;
      }

      // Verificar patrón ENTRADA-SALIDA
      for (let i = 0; i < dayRecords.length; i += 2) {
        const entrada = dayRecords[i];
        const salida = dayRecords[i + 1];

        if (entrada.tipo !== 'ENTRADA' || salida.tipo !== 'SALIDA') {
          return false;
        }
      }
    }

    return true;
  };

  // Procesar Excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No se encontró hoja en el archivo");
  };

  // Parsear filas a partir de la 7 (ignorando encabezados)
  const empleadosMap = new Map<string, { nombre: string, registros: { fecha: string, hora: string, tipo: string }[] }>();

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
      empleadosMap.set(idEmpleado, { nombre: nombreEmpleado, registros: [] });
    };

    empleadosMap.get(idEmpleado)!.registros.push({ fecha, hora, tipo });
  });

  // Limpiar registros duplicados y validar completitud para cada empleado
  let globalIsComplete = true;

  for (const [idEmpleado, data] of empleadosMap.entries()) {
    data.registros = cleanRegistros(data.registros);

    // Validar si los registros están completos
    const isEmployeeComplete = validateCompleteRecords(data.registros);

    if (!isEmployeeComplete) {
      globalIsComplete = false;
    };
  };

  return {
    empleadosJornada: empleadosMap,
    importacionCompleta: globalIsComplete
  };
};
//

export async function insertJornada(params: jornadasParametros) {
  try {
    const { empleadosJornadas, id_proyecto, id_tipojornada } = params;
    let contador = 0;
    let fechaMemoria: Date = new Date(0);
    let quincenaMemoria: number = 0;
    let id_mes: number = 0;
    let id_quincena: number = 0;

    const textoEstadosImportacion = `
      SELECT *
      FROM "estadoimportacion"
    `;

    const { rows: estados } = await client.query(textoEstadosImportacion);

    const importacionCompleta = estados.find(e => e.nombre.toLowerCase() === 'completa');
    const importacionIncompleta = estados.find(e => e.nombre.toLowerCase() === 'incompleta');

    const textoImportacion = `
      INSERT INTO "importacion" (id_estadoimportacion, id_proyecto)
      VALUES ($1, $2)
      RETURNING id
    `;
    const valoresImportacionCompleta = [importacionCompleta.id, id_proyecto];
    const valoresImportacionIncompleta = [importacionIncompleta.id, id_proyecto];
    let importacionRaw;
    
    if (empleadosJornadas.importacionCompleta) {
      importacionRaw = await client.query(textoImportacion, valoresImportacionCompleta)
    } else {
      importacionRaw = await client.query(textoImportacion, valoresImportacionIncompleta)
    };

    const id_importacion = importacionRaw.rows[0].id;
    const estaCompleta = empleadosJornadas.importacionCompleta;

    for (const [id_reloj, { nombre, registros }] of empleadosJornadas.empleadosJornada.entries()) {

      let id_empleado: number;
      const textoEmpleado = `
        SELECT id
        FROM "empleado"
        WHERE id_reloj = $1 AND id_proyecto = $2
      `;
      const valoresEmpleado = [id_reloj, id_proyecto];
      const resultadoEmpleado = await client.query(textoEmpleado, valoresEmpleado);

      if (resultadoEmpleado.rowCount === 0) {
        const textoInsertEmpleado = `
            INSERT INTO "empleado" (nombreapellido, id_reloj, id_proyecto)
            VALUES ($1, $2, $3)
            RETURNING id
          `;
        const valoresInsertEmpleado = [nombre, id_reloj, id_proyecto];
        const resultadoInsertempleado = await client.query(textoInsertEmpleado, valoresInsertEmpleado);
        id_empleado = resultadoInsertempleado.rows[0].id;
      } else {
        id_empleado = resultadoEmpleado.rows[0].id;
      };

      const jornadasPorFecha: Map<string, Array<{ tipo: string; hora: string; orden: number }>> = new Map();

      for (const { fecha, hora, tipo } of registros) {
        if (!jornadasPorFecha.has(fecha)) {
          jornadasPorFecha.set(fecha, []);
        }

        const registrosFecha = jornadasPorFecha.get(fecha)!;
        registrosFecha.push({
          tipo: tipo,
          hora: hora,
          orden: registrosFecha.length
        });
      }

      for (const [fecha, registrosFecha] of jornadasPorFecha.entries()) {

        const fechaObjeto = new Date(fecha);
        const año = fechaObjeto.getFullYear();
        const mes = fechaObjeto.getMonth() + 1;
        const dia = fechaObjeto.getDate();
        const quincena = dia <= 15 ? 1 : 2;

        if (fechaMemoria.getFullYear() !== año || fechaMemoria.getMonth() + 1 !== mes || id_mes === 0 || id_quincena === 0 || quincenaMemoria !== quincena) {
          fechaMemoria = fechaObjeto;
          quincenaMemoria = quincena;
          const params = { año, mes, quincena };
          const foreignIds = await verifyExistenciaInstancias(params);
          id_mes = foreignIds.id_mes;
          id_quincena = foreignIds.id_quincena;
        }

        const jornadas = emparejarEntradaSalida(registrosFecha);

        for (const jornada of jornadas) {
          if (jornada.entrada || jornada.salida) {
            const textoInsertJornada = `
              INSERT INTO "jornada" (entrada, salida, fecha, id_tipojornada, id_empleado, id_proyecto, id_mes, id_quincena, id_importacion)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            const valoresInsertJornada = [
              jornada.entrada || null,
              jornada.salida || null,
              fecha,
              id_tipojornada,
              id_empleado,
              id_proyecto,
              id_mes,
              id_quincena,
              id_importacion
            ];
            await client.query(textoInsertJornada, valoresInsertJornada);
          }
        }
      }

      contador++;
    }

    return { id_importacion, estaCompleta }
  } catch (error) {
    console.error("Error en insertJornada: ", error);
    throw error;
  }
}

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