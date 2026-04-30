"use client";
import { formatDateBR, tempoToDate } from "@/lib/utils";
import Image from "next/image";
import React, { useState } from "react";
import { faFileArrowDown, faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";


function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white shadow-sm border border-slate-200 p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DashBoardHeaderUnique({
  codSta,
  stationLabel,
  isPublic,
  latSta,
  longSta,
  resSta,
  perSta,
  hasImage,
  ts,
  tempAvg,
  preAvg,
  umiAvg,
  lumAvg,
  vvAvg,
  dv,
}: {
  codSta: string;
  stationLabel: string;
  isPublic: boolean;
  latSta: number | null;
  longSta: number | null;
  resSta: unknown;
  perSta: number;
  hasImage: boolean;
  ts: string | number | null;
  tempAvg: number | null;
  preAvg: number | null;
  umiAvg: number | null;
  lumAvg: number | null;
  vvAvg: number | null;
  dv: number | null;
}) {

  const lastReadingText = (() => {
    return formatDateBR(tempoToDate(String(ts))) || "-";
  })();


  const router = useRouter();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <div className="w-full mb-6">
      <Card title="">
        <div className="flex flex-col lg:flex-row justify-between space-y-2">
          <div className="flex flex-col space-y-1">
            <div className="text-xl font-semibold text-slate-900 truncate">
              {stationLabel}
            </div>
            <div className="text-sm text-slate-600 font-mono">{codSta} {latSta} {longSta}</div>
          </div>

          <div className="flex flex-row p-3 gap-2 w-full lg:w-auto justify-center">
            <div className="flex items-center w-1/2 lg:w-auto gap-2 text-slate-700">
              <button
                className="w-full lg:w-auto hover:cursor-pointer p-3 bg-gray-200 hover:bg-gray-300 text-2xl border border-gray-300 transition-colors"
                onClick={() => router.push(`/download/${codSta}`)}
                title="Ir para a página de download de dados"
              >
                <FontAwesomeIcon icon={faFileArrowDown} />
              </button>
            </div>
            <div className="flex items-center w-1/2 lg:w-auto gap-2 text-slate-700">
              <button
                className={`w-full lg:w-auto p-3 text-2xl border border-gray-300 transition-colors ${hasImage
                  ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer text-slate-700'
                  : 'bg-gray-100 cursor-not-allowed text-gray-400 opacity-60'
                  }`}
                disabled={!hasImage}
                onClick={() => setIsImageModalOpen(true)}
                title={hasImage ? "Visualizar foto da estação" : "Estação não possui foto"}
              >
                <FontAwesomeIcon icon={faImage} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Overlay da Imagem (Modal) */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative bg-white p-4 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-800">Foto da Estação: {codSta}</h3>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-500 hover:text-red-500 text-3xl font-bold p-1 leading-none"
                title="Fechar visualização"
              >
                &times;
              </button>
            </div>
            <div className="relative w-full h-[60vh] lg:h-[70vh] bg-gray-100 flex items-center justify-center border border-gray-300">
              <Image
                src={`/stations/${codSta}.jpg`}
                alt={`Foto da estação ${codSta}`}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}