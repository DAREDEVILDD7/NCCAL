// PDF Generator for Maintenance Reports
import jsPDF from "jspdf";
import { supabase } from "../lib/supabaseClient";

// Main function to generate PDF for a maintenance job card
export const generateMaintenancePDF = async (jobCardId) => {
  try {
    // Fetch the job card data
    const { data: jobCard, error: jobCardError } = await supabase
      .from("job_cards")
      .select("*")
      .eq("id", jobCardId)
      .single();

    if (jobCardError) throw jobCardError;
    if (!jobCard) throw new Error("Job card not found");

    // Fetch the engineer/inspector data
    const { data: engineer, error: engineerError } = await supabase
      .from("engineers")
      .select("name")
      .eq("id", jobCard.inspector_id)
      .single();

    if (engineerError) throw engineerError;

    // Fetch all answers for this job card
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select(
        `
        answer,
        template_id,
        checklist_templates(question, order, input_type)
      `
      )
      .eq("job_card_id", jobCardId)
      .order("template_id");

    if (answersError) throw answersError;

    // Format dates and times
    const dateInFormatted = formatDateTime(jobCard.date_in);
    const dateOutFormatted = formatDateTime(jobCard.date_out);
    const totalHoursFormatted = formatTotalHours(jobCard.total_hours);

    // Create a new PDF document
    const pdf = new jsPDF();

    // Add logo if available
    try {
      const logoUrl = "/nccal-logo.png"; // Replace with your actual logo path
      addImage(pdf, logoUrl, 10, 10, 40, 20);
    } catch (logoError) {
      console.warn("Could not add logo to PDF:", logoError);
    }

    // Add title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(jobCard.type, 105, 20, { align: "center" });

    // Add job card header info
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    // Left column
    pdf.text(`Number: ${jobCardId}`, 20, 40);
    pdf.text(`Date In: ${dateInFormatted}`, 20, 50);
    pdf.text(`Total Hours: ${totalHoursFormatted}`, 20, 60);

    // Right column
    pdf.text(`Customer: ${jobCard.customer_name}`, 120, 40);
    pdf.text(`Date Out: ${dateOutFormatted}`, 120, 50);
    pdf.text(`Type: ${jobCard.type}`, 120, 60);
    pdf.text(`Inspector: ${engineer.name}`, 120, 70);

    // Remarks section
    pdf.text(`Remark: ${jobCard.remarks || ""}`, 20, 80);

    // Add checklist header
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("CHECKLIST", 105, 100, { align: "center" });

    // Add checklist table headers
    pdf.setFontSize(12);
    pdf.text("Question", 20, 110);
    pdf.text("Answer", 120, 110);
    pdf.text("Remarks", 170, 110);

    pdf.line(20, 112, 190, 112); // Horizontal line below headers

    // Add checklist items
    let y = 120; // Starting y position for checklist items

    if (answers && answers.length > 0) {
      // Sort answers by order
      const sortedAnswers = [...answers].sort(
        (a, b) => a.checklist_templates.order - b.checklist_templates.order
      );

      for (const item of sortedAnswers) {
        // Check if we need a new page
        if (y > 250) {
          pdf.addPage();
          y = 30; // Reset y position on new page
        }

        const question = item.checklist_templates.question;
        let displayAnswer = item.answer || "";

        // Check if the answer is a base64 image
        if (isBase64Image(displayAnswer)) {
          displayAnswer = "[Image]";

          // Optionally, you could also add the actual image to the PDF
          // try {
          //   addImageFromBase64(pdf, item.answer, 120, y, 40, 20);
          // } catch (imgError) {
          //   console.warn('Could not add answer image to PDF:', imgError);
          // }
        }

        // Handle word wrapping for long questions
        const questionLines = pdf.splitTextToSize(question, 90);
        pdf.setFont("helvetica", "normal");
        pdf.text(questionLines, 20, y);

        // Handle word wrapping for long answers
        const answerLines = pdf.splitTextToSize(displayAnswer, 40);
        pdf.text(answerLines, 120, y);

        // Calculate how much to move down based on which has more lines
        const lineHeight = 7;
        const linesCount = Math.max(questionLines.length, answerLines.length);
        y += linesCount * lineHeight;
      }
    } else {
      pdf.text("No checklist items found", 20, y);
      y += 10;
    }

    // Add signature section
    y += 20; // Add some space before signatures

    // Check if we need a new page for signatures
    if (y > 250) {
      pdf.addPage();
      y = 30;
    }

    pdf.setFont("helvetica", "bold");
    pdf.text("Signatures", 105, y, { align: "center" });
    y += 10;

    // Add inspector signature
    pdf.setFont("helvetica", "normal");
    pdf.text(`Inspector: ${engineer.name}`, 40, y + 5);

    // Add inspector signature image
    if (jobCard.inspector_signature) {
      try {
        addImageFromBase64(
          pdf,
          jobCard.inspector_signature,
          40,
          y + 10,
          50,
          25
        );
      } catch (sigError) {
        console.warn("Could not add inspector signature to PDF:", sigError);
      }
    }

    // Add customer signature
    pdf.text(
      `Customer: ${jobCard.customer_sign_name || jobCard.customer_name}`,
      140,
      y + 5
    );

    // Add customer signature image
    if (jobCard.customer_signature) {
      try {
        addImageFromBase64(
          pdf,
          jobCard.customer_signature,
          140,
          y + 10,
          50,
          25
        );
      } catch (sigError) {
        console.warn("Could not add customer signature to PDF:", sigError);
      }
    }

    // Add generation timestamp at the bottom
    y += 40;
    const generatedTimestamp = new Date().toLocaleString();
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${generatedTimestamp}`, 105, y + 10, {
      align: "center",
    });

    // Generate the filename
    const fileName = `Maintenance_${jobCard.type.replace(
      /\s+/g,
      "_"
    )}_${jobCardId}.pdf`;

    const pdfBlob = pdf.output("blob");

    // Try to store in Supabase first
    try {
      const { fileUrl, storageFailed, error } = await storePDFInSupabase(
        pdfBlob,
        fileName,
        jobCardId
      );

      // Save it locally (browser download) regardless of storage success
      pdf.save(fileName);

      if (storageFailed) {
        console.warn("PDF saved locally but cloud storage failed:", error);
        return { fileName, fileUrl: null, storageError: error };
      }

      return { fileName, fileUrl };
    } catch (uploadError) {
      console.error("Upload to Supabase failed:", uploadError);

      // If upload fails, still save locally and return
      pdf.save(fileName);
      return { fileName, error: "Failed to upload to cloud storage" };
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Revised storage function with improved error handling

const storePDFInSupabase = async (pdfBlob, fileName, jobCardId) => {
  console.log("Starting PDF upload to Supabase...");

  try {
    // Make sure the blob is valid
    if (!(pdfBlob instanceof Blob)) {
      throw new Error("Invalid PDF data format");
    }

    console.log("Uploading to Supabase Storage...");

    // Create a File from the Blob to ensure proper handling
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });

    try {
      // Try uploading to Supabase Storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from("maintenance-pdfs")
        .upload(`job-cards/${jobCardId}/${fileName}`, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error(
          "Storage upload error details:",
          JSON.stringify(uploadError)
        );
        throw new Error(
          `Storage upload failed: ${uploadError.message || "Unknown error"}`
        );
      }

      console.log("Upload successful, getting public URL...");

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from("maintenance-pdfs")
        .getPublicUrl(`job-cards/${jobCardId}/${fileName}`);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      const fileUrl = publicUrlData.publicUrl;
      console.log("File URL obtained:", fileUrl);

      // Store reference in database
      console.log("Saving to database...");
      const { data: pdfRecord, error: dbError } = await supabase
        .from("pdf_files")
        .insert({
          job_card_id: jobCardId,
          file_name: fileName,
          file_url: fileUrl,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        // If DB insert fails but upload succeeded, we can still return the URL
        return { fileUrl, dbError: dbError.message };
      }

      console.log("PDF successfully stored in Supabase");
      return { fileUrl, pdfId: pdfRecord?.id };
    } catch (uploadError) {
      console.error("Storage upload failed:", uploadError);
      // Return success with local download only
      return {
        localOnly: true,
        fileName,
        error: uploadError.message || "Storage upload failed",
      };
    }
  } catch (error) {
    console.error("Error in storePDFInSupabase:", error);
    // Return success with local download only
    return {
      localOnly: true,
      fileName,
      error: error.message || "Unknown error during PDF storage",
    };
  }
};

// Helper function to check if a string is a base64 image
const isBase64Image = (str) => {
  if (!str) return false;

  // Check for common base64 image patterns
  const isBase64Pattern = /^data:image\/[a-zA-Z]+;base64,/;
  if (isBase64Pattern.test(str)) return true;

  // If it doesn't have the prefix but looks like base64
  if (str.length > 100) {
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    // Check a sample of the string (first 100 chars) to avoid performance issues with long strings
    const sample = str.substring(0, 100);
    if (base64Regex.test(sample)) return true;
  }

  return false;
};

// Helper function to format date and time
const formatDateTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

// Helper function to format total hours from seconds
const formatTotalHours = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
};

// Helper function to add an image from URL
const addImage = (pdf, url, x, y, width, height) => {
  try {
    pdf.addImage(url, "PNG", x, y, width, height);
  } catch (error) {
    console.error("Error adding image:", error);
  }
};

// Helper function to add an image from base64 string
const addImageFromBase64 = (pdf, base64String, x, y, width, height) => {
  try {
    // Remove the data URL prefix if present
    const imageData = base64String.includes("data:image")
      ? base64String
      : `data:image/png;base64,${base64String}`;

    pdf.addImage(imageData, "PNG", x, y, width, height);
  } catch (error) {
    console.error("Error adding base64 image:", error);
  }
};
