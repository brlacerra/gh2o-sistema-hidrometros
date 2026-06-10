import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./getCurrentUser";
import { Decimal } from "@prisma/client/runtime/library";

export type CurrentProperty = {
    codProp: string;
    nomeProp: string;
    cidadeProp: string | null;
    ufProp: string | null;
    geojsonProp?: any;
    centroLng?: Decimal | null;
    centroLat?: Decimal | null;
    created_at: Date;
    updated_at: Date;
}

export async function getCurrentProperty(): Promise<CurrentProperty | null> {
    const user = await getCurrentUser();
    if (!user || !user.propriedade || user.propriedade.length === 0) return null;
    return user.propriedade[0];
}