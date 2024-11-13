declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';
    export function autoTable(doc: jsPDF, options: any): void;
}