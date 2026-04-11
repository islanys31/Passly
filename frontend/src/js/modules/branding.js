/**
 * @file branding.js
 * @description Lógica para gestionar la identidad visual y reportes de Marca Blanca en Passly.
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Aplica el branding de la sede actual al documento PDF.
 */
export function applyPDFBranding(doc, title, sedeConfig) {
    const primaryColor = [41, 121, 255]; // Azul Corporativo Passly
    
    // Franja superior
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Texto de cabecera
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(sedeConfig?.nombre_sede || "Passly", 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Reporte de Seguridad generado por Passly Pro | ${new Date().toLocaleString()}`, 14, 32);
    
    // Logo corporativo (si existe)
    if (sedeConfig?.logo_url) {
        try {
            // En una implementación real, el logo_url debería estar pre-cargado como Base64 o Image Object
            doc.addImage(sedeConfig.logo_url, 'PNG', 170, 5, 30, 30);
        } catch (e) {
            console.warn("No se pudo insertar el logo en el PDF:", e);
        }
    }
    
    // Título del reporte
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(18);
    doc.text(title, 14, 55);
}

/**
 * Exporta datos a un archivo PDF con el branding de la sede.
 */
export function exportToPDF(title, columns, rows, fileName, sedeConfig) {
    const doc = new jsPDF();
    applyPDFBranding(doc, title, sedeConfig);
    
    doc.autoTable({
        startY: 65,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [41, 121, 255] },
        styles: { fontSize: 9 }
    });
    
    doc.save(`${fileName}_${Date.now()}.pdf`);
}

/**
 * Carga el logo del cliente desde el servidor.
 */
export async function loadClientBranding(fetchAPI, clienteId) {
    try {
        // En una app real, clienteId vendría del usuario logueado.
        const response = await fetchAPI(`/clientes`);
        const data = await response.json();
        
        // Buscamos el logo del primer cliente (o el actual)
        const cliente = data.data?.[0];
        if (cliente && cliente.logo_url) {
            applyBrandingToUI(cliente.logo_url);
        }
    } catch (error) {
        console.error("Error cargando branding:", error);
    }
}

/**
 * Actualiza visualmente el logo en la interfaz.
 */
export function applyBrandingToUI(logoUrl) {
    const logoContainer = document.getElementById('sidebar-logo-container');
    if (logoContainer && logoUrl) {
        logoContainer.innerHTML = `<img src="${logoUrl}" class="client-logo-img" alt="Logo Cliente"><input type="file" id="client-logo-input" accept="image/*" style="display:none;">`;
        // Volver a vincular el input si es necesario (se maneja en dashboard_main)
    }
}

/**
 * Sube un nuevo logo al servidor.
 */
export async function uploadClientLogo(fetchAPI, clienteId, file) {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetchAPI(`/${clienteId}/logo`, { // Endpoint relativo a /api/clientes
        method: 'POST',
        headers: {
            // No ponemos Content-Type para que el navegador use boundary de multipart
        },
        body: formData
    });

    if (!response.ok) throw new Error("Error al subir el logo");
    
    const data = await response.json();
    applyBrandingToUI(data.logo_url);
    return data;
}
