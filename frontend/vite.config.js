import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const includesPackage = (id, packageName) =>
  id.includes(`/node_modules/${packageName}/`);

const getVendorChunk = (rawId) => {
  const id = rawId.replace(/\\/g, "/");

  if (!id.includes("/node_modules/")) return undefined;

  const groups = [
    {
      name: "react-vendor",
      packages: ["react", "react-dom", "react-router", "react-router-dom", "scheduler"],
    },
    {
      name: "redux-vendor",
      packages: ["@reduxjs/toolkit", "react-redux", "redux", "immer", "reselect"],
    },
    {
      name: "forms-vendor",
      packages: ["@hookform/resolvers", "react-hook-form", "zod"],
    },
    { name: "motion-vendor", packages: ["framer-motion", "motion-dom", "motion-utils"] },
    { name: "charts-vendor", packages: ["recharts", "d3-", "victory-vendor"] },
    { name: "pdf-document-vendor", packages: ["jspdf", "fflate"] },
    {
      name: "pdf-render-vendor",
      packages: ["html2canvas", "dompurify", "canvg"],
    },
    {
      name: "ui-vendor",
      packages: ["axios", "lucide-react", "sonner", "clsx", "tailwind-merge"],
    },
  ];

  return groups.find(({ packages }) =>
    packages.some((packageName) => includesPackage(id, packageName)),
  )?.name;
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: getVendorChunk,
      },
    },
  },
});
