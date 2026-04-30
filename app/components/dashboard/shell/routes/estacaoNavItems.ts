import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faCloudRain, faCloudSunRain, faDroplet, faSun, faTemperatureHalf, faWind, faHome } from "@fortawesome/free-solid-svg-icons";

export type EstacaoCapabilities = {
  hasPulsos: boolean;
  hasTemp: boolean;
  hasPressao: boolean;
  hasUmidade: boolean;
  hasLum: boolean;
  hasVent: boolean;
  hasDv: boolean;
}

export type EstacaoNavItem = {
  key:
    | "pagInicial"
    | "pluviometria"
    | "temperatura"
    | "umidade"
    | "luminosidade"
    | "pressao"
    | "velocidadeVento"
    | "direcaoVento",
  label: string;
  icon: IconProp;
  href: (codSta: string) => string;
  enabled: boolean;
};

export const getEstacaoNavItems = (caps: EstacaoCapabilities): EstacaoNavItem[] => [
  {
    key: "pagInicial",
    label: "Página Inicial",
    icon: faHome,
    href: (codSta) => `/dashboard/estacao/${codSta}/inicialPag`,
    enabled: true,
  },
  {
    key: "pluviometria",
    label: "Pluviometria",
    icon: faCloudRain,
    href: (codSta) => `/dashboard/estacao/${codSta}/pluviometria`,
    enabled: caps.hasPulsos,
  },
  {
    key: "temperatura",
    label: "Temperatura",
    icon: faTemperatureHalf,
    href: (codSta) => `/dashboard/estacao/${codSta}/temperatura`,
    enabled: caps.hasTemp,
  },
  {
    key: "umidade",
    label: "Umidade Relativa do Ar",
    icon: faDroplet,
    href: (codSta) => `/dashboard/estacao/${codSta}/umidade`,
    enabled: caps.hasUmidade,
  },
  {
    key: "luminosidade",
    label: "Luminosidade",
    icon: faSun,
    href: (codSta) => `/dashboard/estacao/${codSta}/luminosidade`,
    enabled: caps.hasLum,
  },
  {
    key: "pressao",
    label: "Pressão Atmosférica",
    icon: faCloudSunRain,
    href: (codSta) => `/dashboard/estacao/${codSta}/pressao`,
    enabled: caps.hasPressao,
  },
  {
    key: "velocidadeVento",
    label: "Velocidade do Vento",
    icon: faWind,
    href: (codSta) => `/dashboard/estacao/${codSta}/vento`,
    enabled: caps.hasVent,
  },
  {
    key: "direcaoVento",
    label: "Direção do Vento",
    icon: faWind,
    href: (codSta) => `/dashboard/estacao/${codSta}/vento`,
    enabled: caps.hasDv,
  }
];