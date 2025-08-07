"use server";

import { instancesVerification, jornadasData } from "../../lib/excel";
import ExcelJS from "exceljs";
import { db } from "@vercel/postgres";

const client = db;

export async function verifyInstancesExistance(data: instancesVerification) {
    try {
        // Año
        let añoId: number;
        const textAño = `
          SELECT valor
          FROM "año"
          WHERE valor = $1    
        `;
        const valuesAño = [data.año];
        const añoResult = await client.query(textAño, valuesAño);
        if (añoResult.rowCount === 0) {
            const textAñoInsert = `
              INSERT INTO "año" (valor)
              VALUES ($1)
              RETURNING valor
            `;
            const valuesAñoInsert = [data.año];
            const resultAñoInsert = await client.query(textAñoInsert, valuesAñoInsert);
            añoId = resultAñoInsert.rows[0].valor;
            console.log(`   ✅ Instancia de Año ${data.año} creada.`);
        } else {
            añoId = añoResult.rows[0].valor;
            console.log(`   ✅ Instancia de Año ${data.año} ya existe.`);
        };

        // Mes
        let mesId: number;
        const textMes = `
          SELECT id
          FROM "mes"
          WHERE mes = $1 AND id_año = $2
        `;
        const valuesMes = [data.mes, añoId];
        const mesResult = await client.query(textMes, valuesMes);
        if (mesResult.rowCount === 0) {
            const textMesInsert = `
              INSERT INTO "mes" (mes, id_año)
              VALUES ($1, $2)
              RETURNING id
            `;
            const valuesMesInsert = [data.mes, añoId];
            const resultMesInsert = await client.query(textMesInsert, valuesMesInsert);
            mesId = resultMesInsert.rows[0].id;
            console.log(`   ✅ Instancia de Mes ${data.mes} de ${data.año} creada.`);
        } else {
            mesId = mesResult.rows[0].id;
            console.log(`   ✅ Instancia de Mes ${data.mes} de ${data.año} ya existe.`);
        };

        // Quincena
        let quincenaId: number;
        const textQuincena = `
          SELECT id
          FROM "quincena"
          WHERE quincena = $1 AND id_mes = $2
        `;
        const valuesQuincena = [data.quincena, mesId];
        const quincenaResult = await client.query(textQuincena, valuesQuincena);
        if (quincenaResult.rowCount === 0) {
            const textQuincenaInsert = `
              INSERT INTO "quincena" (quincena, id_mes)
              VALUES ($1, $2)
              RETURNING id
            `;
            const valuesQuincenaInsert = [data.quincena, mesId];
            const resultQuincenaInsert = await client.query(textQuincenaInsert, valuesQuincenaInsert);
            quincenaId = resultQuincenaInsert.rows[0].id;
            console.log(`   ✅ Instancia de Quincena ${data.quincena} de Mes ${data.mes} de ${data.año} creada.`);
        } else {
            quincenaId = quincenaResult.rows[0].id;
            console.log(`   ✅ Instancia de Quincena ${data.quincena} de Mes ${data.mes} de ${data.año} ya existe.`);
        };

        const response = { mesId, quincenaId };
        return response;

    } catch (error) {
        console.error("Error en verifyInstancesExistance: ", error);
        throw error;
    };
};

export async function processExcelFile(buffer: ArrayBuffer){
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
            console.log(`🔍 Detectada marca duplicada para ${current.fecha}:`);
            console.log(`   ${current.hora} (${current.tipo}) vs ${next.hora} (${next.tipo})`);
            
            // Lógica de resolución de conflictos:
            
            // Caso 1: Misma hora exacta - tomar la primera
            if (diffMinutes === 0) {
              console.log(`   ✅ Resuelto: Tomando primera marca (${current.tipo})`);
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
                  console.log(`   ✅ Resuelto: Tomando SALIDA (${salidaRecord.hora})`);
                  cleaned.push(salidaRecord);
                } else {
                  // Si ya hay una salida, la siguiente debería ser entrada
                  const entradaRecord = current.tipo === 'ENTRADA' ? current : next;
                  console.log(`   ✅ Resuelto: Tomando ENTRADA (${entradaRecord.hora})`);
                  cleaned.push(entradaRecord);
                };
              } else {
                // Si no hay contexto previo, tomar ENTRADA
                const entradaRecord = current.tipo === 'ENTRADA' ? current : next;
                console.log(`   ✅ Resuelto: Tomando ENTRADA (${entradaRecord.hora})`);
                cleaned.push(entradaRecord);
              };
              i++; // Saltar la siguiente
              continue;
            };
            
            // Caso 3: Mismo tipo - tomar la primera
            console.log(`   ✅ Resuelto: Mismo tipo, tomando primera marca (${current.hora})`);
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

  // Limpiar registros duplicados para cada empleado
  for (const [idEmpleado, data] of empleadosMap.entries()) {
    console.log(`🧹 Limpiando registros para empleado ${data.nombre} (ID: ${idEmpleado})`);
    const originalCount = data.registros.length;
    data.registros = cleanRegistros(data.registros);
    const cleanedCount = data.registros.length;
    
    if (originalCount !== cleanedCount) {
      console.log(`   📊 Registros: ${originalCount} → ${cleanedCount} (eliminados: ${originalCount - cleanedCount})`);
    };
  };

  return empleadosMap;
};

export async function insertJornada(data: jornadasData){
  try {
    const { map, id_proyecto, id_tipojornada } = data;

    let contador = 0;
    let fechaMemoria: Date = new Date(0);
    let quincenaMemoria: number = 0;
    let mesId: number = 0;
    let quincenaId: number = 0;

    console.log(`   ✏️  Escribiendo jornadas.`);

    for (const [idReloj, { nombre, registros }] of map.entries()) {
      
      let idEmpleado: number;
      const textEmpleado = `
        SELECT id
        FROM "empleado"
        WHERE id_reloj = $1 AND id_proyecto = $2
      `;
      const valuesEmpleado = [idReloj, id_proyecto];
      const empleadoResult = await client.query(textEmpleado, valuesEmpleado);
      if (empleadoResult.rowCount === 0) {
          const textEmpleadoInsert = `
            INSERT INTO "empleado" (nombreapellido, id_reloj, id_proyecto)
            VALUES ($1, $2, $3)
            RETURNING id
          `;
          const valuesEmpleadoInsert = [nombre, idReloj, id_proyecto];
          const resultEmpleadoInsert = await client.query(textEmpleadoInsert, valuesEmpleadoInsert);
          idEmpleado = resultEmpleadoInsert.rows[0].id;
      } else {
          idEmpleado = empleadoResult.rows[0].id;
      };

      const jornadasPorFecha: Map<string, { entrada?: string; salida?: string }> = new Map();

      for (const { fecha, hora, tipo } of registros) {
        if (!jornadasPorFecha.has(fecha)) {
          jornadasPorFecha.set(fecha, {});
        };

        const fechaObjeto = new Date(fecha);
        const año = fechaObjeto.getFullYear();
        const mes = fechaObjeto.getMonth() + 1;
        const dia = fechaObjeto.getDate();
        const quincena = dia <= 15 ? 1 : 2;

        if (fechaMemoria.getFullYear() !== año || fechaMemoria.getMonth() + 1 !== mes || mesId === 0 || quincenaId === 0 || quincenaMemoria !== quincena) {
          fechaMemoria = fechaObjeto;
          quincenaMemoria = quincena;

          const params = { año, mes, quincena };
          const foreignIds = await verifyInstancesExistance(params);

          mesId = foreignIds.mesId;
          quincenaId = foreignIds.quincenaId;
        };

        const jornada = jornadasPorFecha.get(fecha)!;

        if (tipo === "ENTRADA" && !jornada.entrada) {
          jornada.entrada = hora;
        } else if (tipo === "SALIDA" && !jornada.salida) {
          jornada.salida = hora;
        };
      };

      for (const [fecha, { entrada, salida }] of jornadasPorFecha.entries()) {
        if (entrada || salida) {
          const textJornadaInsert = `
            INSERT INTO "jornada" (entrada, salida, fecha, id_tipojornada, id_empleado, id_proyecto, id_mes, id_quincena)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
          const valuesJornadaInsert = [entrada || null, salida || null, fecha, id_tipojornada, idEmpleado, id_proyecto, mesId, quincenaId];
          await client.query(textJornadaInsert, valuesJornadaInsert);
        };
      };

      contador++;

    };
    console.log(`   ✅ Procesadas jornadas de ${contador} empleados.`);
    return;
  } catch (error) {
      console.error("Error en insertJornada: ", error);
      throw error;
  };
};