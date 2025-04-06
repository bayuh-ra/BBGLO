// src/utils/fonts.js
import jsPDF from "jspdf";

jsPDF.API.events.push([
  'addFonts',
  function () {
    this.addFileToVFS("Roboto-Regular.ttf", "BASE64_STRING_HERE...");
    this.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  }
]);