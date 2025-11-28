import { NextRequest, NextResponse } from "next/server";
import { createJornadas, processExcel } from "@/services/excel/service.excel";
import { verifyAuthToken } from "@/lib/utils/authutils";
import { getAusentesProyecto, getMarcasSQLServer, procesarMarcasEmpleados } from "@/services/sqlserver/service.sqlserver";
import { getControlByProyecto, getProyectosConHikVision } from "@/services/control/service.control";
import { createAbsences } from "@/services/jornada/service.jornada";
import { validateData } from "@/lib/utils/validation";
import { createConflictError, handleApiError } from "@/lib/utils/error";

type importFormData = {
  id_proyecto: number,
  id_tipoimportacion: number,
  id_tipojornada: number
}

export async function POST(request: NextRequest) {
  try {
    const { error, payload } = await verifyAuthToken(request);
    if (error) return error;

    const id_usuariocreacion = payload.id;
    const formData = await request.formData();

    const data = {
      id_proyecto: Number(formData.get('id_proyecto')),
      id_tipojornada: Number(formData.get('id_tipojornada')),
      id_tipoimportacion: Number(formData.get('id_tipoimportacion'))
    };

    const validation = validateData<importFormData>(data, [
      { field: 'id_proyecto', required: true, type: 'number' },
      { field: 'id_tipojornada', required: true, type: 'number' },
      { field: 'id_tipoimportacion', required: true, type: 'number' }
    ]);

    if (!validation.valid) {
      throw validation.error;
    };

    const proyectosSoportados = await getProyectosConHikVision();

    if (validation.data.id_tipoimportacion === 2 && !proyectosSoportados.includes(validation.data.id_proyecto)) {
      throw createConflictError(
        'Proyecto no cuenta con controles HikVision',
        { id_proyecto: validation.data.id_proyecto }
      );
    };

    let file = null as File | null;

    if (validation.data.id_tipoimportacion === 1) {
      const validationProsoft = validateData<{ file: File | null }>({
        file: formData.get('file') as File | null
      }, [
        {
          field: 'file', required: true, type: 'file', allowedMimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ]
        }
      ]);

      if (!validationProsoft.valid) {
        throw validationProsoft.error;
      };

      file = validationProsoft.data.file;
    };

    let fecha = '';
    let fechaConvertida = '';

    if (validation.data.id_tipoimportacion === 2) {

      const validationHik = validateData<{ fecha: string }>({
        fecha: formData.get('fecha')
      }, [
        { field: 'fecha', required: true, type: 'string' }
      ]);

      if (!validationHik.valid) {
        throw validationHik.error;
      };

      fecha = validationHik.data.fecha;
      fechaConvertida = fecha.split('-').reverse().join('-');
    };

    const importadores: Record<number, (file: File | null) => Promise<any>> = {
      1: async (file) => {
        const buffer = await file!.arrayBuffer();

        return processExcel({
          buffer: buffer,
          id_proyecto: validation.data.id_proyecto,
        });
      },
      2: async () => {
        const dispositivos = await getControlByProyecto({ id_proyecto: validation.data.id_proyecto });

        const resultado = await getMarcasSQLServer({
          dispositivos,
          fecha: fechaConvertida,
        });

        return procesarMarcasEmpleados({
          registros: resultado,
          id_proyecto: validation.data.id_proyecto
        });
      },
    };

    const importador = importadores[validation.data.id_tipoimportacion];

    if (!importador) {
      throw createConflictError(
        'Tipo de importacion no soportado',
        { id_tipoimportacion: validation.data.id_tipoimportacion }
      );
    };

    /**
     * Resultado esperado de un importador de jornadas.
     *
     * Cada importador debe devolver un objeto con esta forma:
     *
     * {
     *   empleadosJornada: Map<string, {
     *     nombre: string;
     *     registros: {
     *       fecha: string;   // formato ISO: YYYY-MM-DD
     *       hora: string;    // formato HH:mm
     *       tipo: string;    // entrada | salida | etc.
     *     }[];
     *     requiresManualReview: boolean; // true si esta jornada requiere revisión manual
     *   }>;
     *
     *   importacionCompleta: boolean; // false si alguna jornada requiere revisión manual
     * }
     *
     * IMPORTANTE:
     * El endpoint depende de que el importador cumpla con este contrato
     * para poder guardar correctamente las jornadas.
     */

    const empleadosMapa = await importador(file);

    const importacion = await createJornadas({
      ...validation.data,
      empleadosJornadas: empleadosMapa,
      nombreArchivo: file?.name || `Importacion del dia ${fecha}`,
      id_usuariocreacion: Number(id_usuariocreacion)
    });

    if (validation.data.id_tipoimportacion === 2) {
      const ausentes = await getAusentesProyecto({
        fecha: fechaConvertida,
        filtroProyecto: validation.data.id_proyecto
      });

      await createAbsences({
        fecha: fecha,
        id_proyecto: validation.data.id_proyecto,
        ausentes: ausentes,
        id_usuario: Number(payload.id),
        id_importacion: importacion.id_importacion,
      });
    };

    return NextResponse.json({
      importacion: importacion.id_importacion,
      completa: importacion.completa,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'POST /api/import');
  };
};//