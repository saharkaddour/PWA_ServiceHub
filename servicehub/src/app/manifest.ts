import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiceHub",
    short_name: "ServiceHub",
    description: "Find local services and manage service requests.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    orientation: "portrait",
    background_color: "#f7fafc",
    theme_color: "#1f4e79",
    categories: ["business", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
