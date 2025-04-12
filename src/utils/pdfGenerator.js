// src/utils/pdfGenerator.js
import jsPDF from "./pdfSetup";

import { supabase } from "../lib/supabaseClient";

// Function to convert seconds to HH:MM:SS format
const secondsToHHMMSS = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Function to format date from ISO to DD/MM/YYYY HH:MM:SS
const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const generateMaintenancePDF = async (jobCardId) => {
  try {
    // Fetch job card data with engineer details
    const { data: jobCard, error: jobCardError } = await supabase
      .from("job_cards")
      .select(
        `
        id, 
        type, 
        date_in, 
        date_out, 
        total_hours, 
        remarks, 
        customer_name, 
        customer_sign_name, 
        customer_signature, 
        inspector_signature,
        inspector_id,
        engineers (name)
      `
      )
      .eq("id", jobCardId)
      .single();

    if (jobCardError) throw jobCardError;
    if (!jobCard) throw new Error("Job card not found");

    // Extract engineer name from the joined data
    const inspectorName = jobCard.engineers?.name || "Not specified";

    // Fetch checklist questions and answers
    const { data: checklist, error: checklistError } = await supabase
      .from("checklist_templates")
      .select("id, question, order")
      .eq("type", jobCard.type)
      .order("order", { ascending: true });

    if (checklistError) throw checklistError;

    // Fetch answers for this job card
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("template_id, answer")
      .eq("job_card_id", jobCardId);

    if (answersError) throw answersError;

    // Create a mapping of template_id to answer for easier access
    const answerMap = {};
    answers.forEach((answer) => {
      answerMap[answer.template_id] = answer.answer;
    });

    // Initialize PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add logo
    try {
      const logoUrl = "/images/nccal-logo.png"; // Path to logo
      doc.addImage(logoUrl, "PNG", 20, 10, 40, 30);
    } catch (logoError) {
      console.warn("Logo not found or could not be loaded:", logoError);
      // Continue without logo if there's an error
    }

    // Add title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(jobCard.type, pageWidth / 2, 25, { align: "center" });

    // Create a styled section for job details
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, 45, pageWidth - 40, 50, 3, 3, "FD");

    // Add job details - Left column
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Number:", 25, 55);
    doc.text("Date In:", 25, 65);
    doc.text("Total Hours:", 25, 75);
    doc.text("Customer:", 25, 85);

    // Add job details - Right column
    doc.text("Date Out:", pageWidth / 2, 55);
    doc.text("Type:", pageWidth / 2, 65);
    doc.text("Inspector:", pageWidth / 2, 75);
    doc.text("Remark:", pageWidth / 2, 85);

    // Add job values - Left column
    doc.setFont("helvetica", "normal");
    doc.text(jobCard.id.toString(), 70, 55);
    doc.text(formatDate(jobCard.date_in), 70, 65);
    doc.text(secondsToHHMMSS(jobCard.total_hours), 70, 75);

    // Handle multiline text for customer
    const customerText = jobCard.customer_name || "";
    if (customerText.length > 25) {
      doc.text(customerText.substring(0, 25) + "...", 70, 85);
    } else {
      doc.text(customerText, 70, 85);
    }

    // Add job values - Right column
    doc.text(formatDate(jobCard.date_out), pageWidth / 2 + 35, 55);
    doc.text(jobCard.type, pageWidth / 2 + 35, 65);
    doc.text(inspectorName, pageWidth / 2 + 35, 75);

    // Handle multiline text for remarks
    const remarkText = jobCard.remarks || "";
    if (remarkText.length > 25) {
      doc.text(remarkText.substring(0, 25) + "...", pageWidth / 2 + 35, 85);
    } else {
      doc.text(remarkText, pageWidth / 2 + 35, 85);
    }

    // Add CHECKLIST title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CHECKLIST", pageWidth / 2, 105, { align: "center" });

    // Prepare checklist data for table
    const tableData = checklist.map((item) => {
      const answer = answerMap[item.id] || "";
      // Filter out image data for display purposes (too long for the PDF)
      const displayAnswer = answer.startsWith("data:image")
        ? "[Image]"
        : answer;
      return [item.question, displayAnswer, ""]; // Question, Answer, Remarks (empty for now)
    });

    // Add checklist table
    doc.autoTable({
      startY: 115,
      head: [["Question", "Answer", "Remarks"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: {
        cellPadding: 5,
        fontSize: 10,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60 },
        2: { cellWidth: 50 },
      },
    });

    // Start a new page if table takes too much space
    const tableEnd = doc.lastAutoTable.finalY || 115;
    let signatureY = tableEnd + 20;

    if (signatureY > pageHeight - 50) {
      doc.addPage();
      signatureY = 30;
    }

    // Add Signatures section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Signatures", pageWidth / 2, signatureY, { align: "center" });

    // Add signature section box
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, signatureY + 5, pageWidth - 40, 60, 3, 3, "S");

    // Add inspector signature
    if (
      jobCard.inspector_signature &&
      jobCard.inspector_signature.startsWith("data:image")
    ) {
      try {
        doc.addImage(
          jobCard.inspector_signature,
          "PNG",
          30,
          signatureY + 15,
          70,
          30
        );
        doc.setFontSize(10);
        doc.text(`Inspector: ${inspectorName}`, 30, signatureY + 50);
      } catch (sigError) {
        console.warn("Error adding inspector signature:", sigError);
        doc.text("Inspector signature unavailable", 30, signatureY + 30);
        doc.text(`Inspector: ${inspectorName}`, 30, signatureY + 50);
      }
    } else {
      doc.text("Inspector signature unavailable", 30, signatureY + 30);
      doc.text(`Inspector: ${inspectorName}`, 30, signatureY + 50);
    }

    // Add customer signature
    if (
      jobCard.customer_signature &&
      jobCard.customer_signature.startsWith("data:image")
    ) {
      try {
        doc.addImage(
          jobCard.customer_signature,
          "PNG",
          pageWidth - 100,
          signatureY + 15,
          70,
          30
        );
        doc.setFontSize(10);
        doc.text(
          `Customer: ${
            jobCard.customer_sign_name || jobCard.customer_name || ""
          }`,
          pageWidth - 100,
          signatureY + 50
        );
      } catch (sigError) {
        console.warn("Error adding customer signature:", sigError);
        doc.text(
          "Customer signature unavailable",
          pageWidth - 100,
          signatureY + 30
        );
        doc.text(
          `Customer: ${
            jobCard.customer_sign_name || jobCard.customer_name || ""
          }`,
          pageWidth - 100,
          signatureY + 50
        );
      }
    } else {
      doc.text(
        "Customer signature unavailable",
        pageWidth - 100,
        signatureY + 30
      );
      doc.text(
        `Customer: ${
          jobCard.customer_sign_name || jobCard.customer_name || ""
        }`,
        pageWidth - 100,
        signatureY + 50
      );
    }

    // Add footer with date generated
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on: ${formatDate(new Date().toISOString())}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Save the PDF
    const fileName = `Maintenance_${jobCard.type.replace(/\s+/g, "_")}_${
      jobCard.id
    }.pdf`;
    doc.save(fileName);

    return fileName;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// Function to open PDF in a new window for preview
export const previewMaintenancePDF = async (jobCardId) => {
  try {
    const fileName = await generateMaintenancePDF(jobCardId);
    return fileName;
  } catch (error) {
    console.error("Error previewing PDF:", error);
    throw error;
  }
};
