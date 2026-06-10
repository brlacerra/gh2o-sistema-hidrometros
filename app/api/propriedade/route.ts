import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type CreatePropertyBody = {
  nomeProp: string;
  cidadeProp?: string;
  ufProp?: string;
  coordinates: [number, number][]; // [[lng, lat], [lng, lat], ...]
};

async function generateUniquePropId(): Promise<string> {
  while (true) {
    const id = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const existing = await prisma.propriedade.findUnique({
      where: { codProp: id },
    });
    if (!existing) return id;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login para continuar." },
        { status: 401 }
      );
    }

    let body: CreatePropertyBody;
    try {
      body = (await req.json()) as CreatePropertyBody;
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 }
      );
    }

    const { nomeProp, cidadeProp, ufProp, coordinates } = body;

    if (!nomeProp || typeof nomeProp !== "string" || !nomeProp.trim()) {
      return NextResponse.json(
        { error: "O nome da propriedade é obrigatório." },
        { status: 400 }
      );
    }

    let centroLng: number | null = null;
    let centroLat: number | null = null;
    let geojsonProp: any = null;

    if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
      if (coordinates.length < 3) {
        return NextResponse.json(
          { error: "A propriedade precisa ter no mínimo 3 pontos para formar uma área." },
          { status: 400 }
        );
      }

      // Validate that each coordinate is [number, number]
      for (const coord of coordinates) {
        if (!Array.isArray(coord) || coord.length !== 2 || typeof coord[0] !== "number" || typeof coord[1] !== "number") {
          return NextResponse.json(
            { error: "Formato de coordenadas inválido. Cada ponto deve ser [longitude, latitude]." },
            { status: 400 }
          );
        }
      }

      // Calculate centroid (average)
      let sumLng = 0;
      let sumLat = 0;
      for (const coord of coordinates) {
        sumLng += coord[0];
        sumLat += coord[1];
      }
      centroLng = sumLng / coordinates.length;
      centroLat = sumLat / coordinates.length;

      // Construct GeoJSON Polygon
      // Standard GeoJSON Polygon coordinates are: [ [ [lng1, lat1], [lng2, lat2], ..., [lng1, lat1] ] ]
      const closedCoords = [...coordinates, coordinates[0]];
      geojsonProp = {
        type: "Polygon",
        coordinates: [closedCoords],
      };
    }

    const codProp = await generateUniquePropId();

    const newProperty = await prisma.propriedade.create({
      data: {
        codProp,
        nomeProp: nomeProp.trim(),
        cidadeProp: cidadeProp?.trim() || null,
        ufProp: ufProp?.trim() || null,
        centroLng,
        centroLat,
        geojsonProp,
        usuarioId: user.codUsr,
      },
    });

    return NextResponse.json({ ok: true, propriedade: newProperty }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar propriedade:", err);
    return NextResponse.json(
      { error: "Ocorreu um erro ao salvar a propriedade no servidor." },
      { status: 500 }
    );
  }
}
