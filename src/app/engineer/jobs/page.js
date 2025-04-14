"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SignatureCanvas from "react-signature-canvas";
import Switch from "react-switch";
import { generateMaintenancePDF } from "../../../utils/pdfGenerator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EngineerJobs() {
  const [engineer, setEngineer] = useState(null);
  const [maintenanceType, setMaintenanceType] = useState("");
  const [questions, setQuestions] = useState([]);
  const [allAnswers, setAllAnswers] = useState({}); // Object to store answers for each maintenance type
  const [imagePreview, setImagePreview] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [inspectorSignature, setInspectorSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [signaturesReady, setSignaturesReady] = useState(false);

  // New state for common fields
  const [dateIn, setDateIn] = useState("");
  const [dateOut, setDateOut] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [customer, setCustomer] = useState("");
  const [totalHours, setTotalHours] = useState("00:00:00");
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Use `useRef` for references
  const inspectorSignatureRef = useRef(null);
  const customerSignatureRef = useRef(null);
  const remarkTextareaRef = useRef(null);
  const customerTextareaRef = useRef(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    const stored = localStorage.getItem("engineer");
    if (stored) {
      const engineerData = JSON.parse(stored);
      setEngineer(engineerData);
      setInspectorName(engineerData.name); // Set inspector name to default engineer name
    } else {
      router.replace("/engineer/login");
    }
  }, [router]);

  // Reset image preview when maintenance type changes
  useEffect(() => {
    setImagePreview(null);
  }, [maintenanceType]);

  useEffect(() => {
    async function fetchChecklist() {
      if (!maintenanceType) return;
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("id, question, input_type, order")
        .eq("type", maintenanceType)
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching checklist:", error.message);
      } else {
        setQuestions(data);
        setIsSignatureVisible(true); // Show signature fields after questions are fetched

        // Initialize answers for this maintenance type if they don't exist yet
        setAllAnswers((prev) => {
          if (!prev[maintenanceType]) {
            return { ...prev, [maintenanceType]: {} };
          }
          return prev;
        });
      }
    }

    fetchChecklist();
  }, [maintenanceType]);

  // Function to calculate total hours between dateIn and dateOut
  useEffect(() => {
    if (dateIn && dateOut) {
      const inDate = new Date(dateIn);
      const outDate = new Date(dateOut);

      if (!isNaN(inDate) && !isNaN(outDate) && outDate >= inDate) {
        const diffMs = outDate - inDate;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        // Set the formatted time string for display
        setTotalHours(
          `${String(diffHrs).padStart(2, "0")}:${String(diffMins).padStart(
            2,
            "0"
          )}:${String(diffSecs).padStart(2, "0")}`
        );
      } else {
        setTotalHours("00:00:00");
      }
    }
  }, [dateIn, dateOut]);

  const handleAnswerChange = (index, value) => {
    setAllAnswers((prevAllAnswers) => ({
      ...prevAllAnswers,
      [maintenanceType]: {
        ...prevAllAnswers[maintenanceType],
        [index]: value,
      },
    }));
  };

  // Update the captureSignatures function with this more robust approach
  const captureSignatures = () => {
    try {
      // For inspector signature
      if (inspectorSignatureRef.current) {
        const inspectorCanvas = inspectorSignatureRef.current._canvas; // Access the canvas element directly
        if (inspectorCanvas && !inspectorSignatureRef.current.isEmpty()) {
          // Use toDataURL directly on the canvas element
          setInspectorSignature(inspectorCanvas.toDataURL("image/png"));
        } else {
          alert("Inspector signature is missing");
          return false;
        }
      }

      // For customer signature
      if (customerSignatureRef.current) {
        const customerCanvas = customerSignatureRef.current._canvas; // Access the canvas element directly
        if (customerCanvas && !customerSignatureRef.current.isEmpty()) {
          // Use toDataURL directly on the canvas element
          setCustomerSignature(customerCanvas.toDataURL("image/png"));
        } else {
          alert("Customer signature is missing");
          return false;
        }
      }

      // Set signatures as ready
      setSignaturesReady(true);
      alert("Signatures saved successfully!");
      return true;
    } catch (error) {
      console.error("Error capturing signatures:", error);
      alert("Error saving signatures. Please try again.");
      return false;
    }
  };

  // First, define this handler function in your component
  const handleMaintenanceTypeChange = (e) => {
    const newType = e.target.value;
    setMaintenanceType(newType);
    setImagePreview(null);
    setIsSignatureVisible(false); // Hide signatures initially

    // Clear any signatures
    if (inspectorSignatureRef.current) {
      inspectorSignatureRef.current.clear();
    }
    if (customerSignatureRef.current) {
      customerSignatureRef.current.clear();
    }

    // IMPORTANT: Also reset the signature states
    setInspectorSignature(null);
    setCustomerSignature(null);
  };

  // Then use the handler in your select element
  <select
    id="maintenanceType"
    value={maintenanceType}
    onChange={handleMaintenanceTypeChange}
    className="w-full md:w-1/2 px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="" disabled>
      Select maintenance type
    </option>
    <option value="Preventive Maintenance">Preventive Maintenance</option>
    <option value="NCCAL Service Maintenance">NCCAL Service Maintenance</option>
  </select>;

  // Function to get current answers for the selected maintenance type
  const getCurrentAnswers = () => {
    return allAnswers[maintenanceType] || {};
  };

  // Function to automatically adjust textarea height based on content
  const adjustTextareaHeight = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto"; // Reset height to recalculate
    textarea.style.height = `${textarea.scrollHeight}px`; // Set to actual content height
  };

  // Set current date and time (Kuwait time) for dateIn or dateOut
  const setCurrentDateTime = (field) => {
    // Kuwait is UTC+3
    const now = new Date();
    const kuwaitTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Format to YYYY-MM-DDThh:mm:ss
    const formattedDate = kuwaitTime
      .toISOString()
      .slice(0, 19)
      .replace("Z", "");

    if (field === "in") {
      setDateIn(formattedDate);
    } else if (field === "out") {
      setDateOut(formattedDate);
    }
  };

  const handleImageUpload = (e, questionIndex) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result;

        // Update the specific question's image in the answers
        handleAnswerChange(questionIndex, "Yes"); // Mark that this question has an image

        // Store the image data in a special key
        setAllAnswers((prevAllAnswers) => ({
          ...prevAllAnswers,
          [maintenanceType]: {
            ...prevAllAnswers[maintenanceType],
            [`image_${questionIndex}`]: imageData, // Store image with unique key
          },
        }));

        // If it's the first/currently visible image, also set the preview
        setImagePreview(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDelete = (index) => {
    // Remove the image from answers
    setAllAnswers((prevAllAnswers) => {
      const updatedAnswers = { ...prevAllAnswers };
      if (updatedAnswers[maintenanceType]) {
        delete updatedAnswers[maintenanceType][`image_${index}`];

        // Also update the answer value
        updatedAnswers[maintenanceType][index] = "No";
      }
      return updatedAnswers;
    });

    // Reset image preview if needed
    if (allAnswers[maintenanceType]?.[`image_${index}`] === imagePreview) {
      setImagePreview(null);
    }

    // Reset the file input value
    if (fileInputRefs.current[`file_${index}`]) {
      fileInputRefs.current[`file_${index}`].value = "";
    }
  };

  const handleYesNoToggle = (index, value) => {
    handleAnswerChange(index, value);
  };

  const clearSignature = (signatureType) => {
    if (signatureType === "inspector") {
      inspectorSignatureRef.current.clear();
      setInspectorSignature(null);
    } else if (signatureType === "customer") {
      customerSignatureRef.current.clear();
      setCustomerSignature(null);
    }
  };

  // Function to check if all required fields are filled and signatures are done
  // Modify the validateForm function to ensure signatures are properly set

  const validateForm = () => {
    let missing = [];
    const currentAnswers = getCurrentAnswers();

    // Check common fields
    if (!dateIn) missing.push("Date In");
    if (!dateOut) missing.push("Date Out");
    if (!inspectorName.trim()) missing.push("Inspector Name");
    if (!customer.trim()) missing.push("Customer");

    // Check if all required fields are filled
    questions.forEach((q, index) => {
      if (q.input_type !== "image" && !currentAnswers[index]?.trim()) {
        if (q.input_type === "yesno") {
          return;
        }
        missing.push(q.question);
      }
    });

    // Check signatures but DON'T capture them here
    if (
      inspectorSignatureRef.current &&
      inspectorSignatureRef.current.isEmpty() &&
      !inspectorSignature // Check state too
    ) {
      missing.push("Inspector Signature");
    }

    if (
      customerSignatureRef.current &&
      customerSignatureRef.current.isEmpty() &&
      !customerSignature // Check state too
    ) {
      missing.push("Customer Signature");
    }

    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = async () => {
    try {
      if (
        inspectorSignatureRef.current &&
        !inspectorSignatureRef.current.isEmpty()
      ) {
        setInspectorSignature(
          inspectorSignatureRef.current
            .getTrimmedCanvas()
            .toDataURL("image/png")
        );
      }

      if (
        customerSignatureRef.current &&
        !customerSignatureRef.current.isEmpty()
      ) {
        setCustomerSignature(
          customerSignatureRef.current.getTrimmedCanvas().toDataURL("image/png")
        );
      }

      // Small delay to ensure state updates
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (signatureError) {
      console.error("Error capturing signatures:", signatureError);
    }

    // Now validate the form
    if (!validateForm()) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    const currentAnswers = getCurrentAnswers();

    try {
      // Force-capture signatures again to ensure they're available
      if (!inspectorSignature) {
        throw new Error("Inspector signature is required");
      }

      if (!customerSignature) {
        throw new Error("Customer signature is required");
      }

      const inspectorSig = inspectorSignatureRef.current.isEmpty()
        ? null
        : inspectorSignatureRef.current
            .getTrimmedCanvas()
            .toDataURL("image/png");

      const customerSig = customerSignatureRef.current.isEmpty()
        ? null
        : customerSignatureRef.current
            .getTrimmedCanvas()
            .toDataURL("image/png");

      // Update state with latest signatures
      setInspectorSignature(inspectorSig);
      setCustomerSignature(customerSig);

      // Check for null signatures before submission
      if (!inspectorSig) {
        throw new Error("Inspector signature is required");
      }

      if (!customerSig) {
        throw new Error("Customer signature is required");
      }

      // Create the job card record
      const { data: jobCard, error: jobCardError } = await supabase
        .from("job_cards")
        .insert({
          inspector_id: engineer.id,
          customer_name: customerName || customer,
          date_in: dateIn,
          date_out: dateOut,
          total_hours: convertTimeStringToSeconds(totalHours),
          remarks: remark,
          customer_sign_name: customerName,
          customer_signature: customerSignature, // Use state variable
          inspector_signature: inspectorSignature, // Use state variable
          type: maintenanceType,
        })
        .select("id");

      if (jobCardError) throw jobCardError;

      // Now store all answers in the answers table
      if (jobCard && jobCard.length > 0) {
        const jobCardId = jobCard[0].id;

        // Prepare batch insert for all answers
        const answersToInsert = [];

        // Process all questions and their answers
        questions.forEach((question, index) => {
          // Special handling for image-type questions
          if (question.input_type === "image") {
            const imageData = allAnswers[maintenanceType]?.[`image_${index}`];

            answersToInsert.push({
              job_card_id: jobCardId,
              answer: imageData || "No", // Store "No" if no image, otherwise store image data
              template_id: question.id,
            });
          }
          // For yes/no questions
          else if (question.input_type === "yesno") {
            answersToInsert.push({
              job_card_id: jobCardId,
              answer: currentAnswers[index] || "No", // Default to "No" if not answered
              template_id: question.id,
            });
          }
          // For all other questions (text, number)
          else if (currentAnswers[index]?.toString().trim() !== "") {
            answersToInsert.push({
              job_card_id: jobCardId,
              answer: currentAnswers[index],
              template_id: question.id,
            });
          } else {
            // Include empty answers too for completeness
            answersToInsert.push({
              job_card_id: jobCardId,
              answer: "",
              template_id: question.id,
            });
          }
        });

        // Insert all answers in a batch
        if (answersToInsert.length > 0) {
          const { error: answersError } = await supabase
            .from("answers")
            .insert(answersToInsert);

          if (answersError) throw answersError;
        }

        // Generate PDF using our new generator
        try {
          const pdfFileName = await generateMaintenancePDF(jobCardId);

          // Create a success message with download option
          const message = `Maintenance job card submitted successfully! PDF generated: ${pdfFileName}`;

          // You can implement a download function here if needed
          // For example, you could generate a download link for the PDF

          alert(message);
        } catch (pdfError) {
          console.error("Error generating PDF:", pdfError);
          alert(
            "Job card saved but PDF generation failed. Please try downloading it later."
          );
        }

        // Reset form
        setMaintenanceType("");
        setQuestions([]);
        setAllAnswers({});
        setImagePreview(null);
        setCustomerName("");
        setInspectorSignature(null);
        setCustomerSignature(null);
        setDateIn("");
        setDateOut("");
        setRemark("");
        setTotalHours("00:00:00");

        // Clear signature canvases physically
        if (inspectorSignatureRef.current) {
          inspectorSignatureRef.current.clear();
        }
        if (customerSignatureRef.current) {
          customerSignatureRef.current.clear();
        }

        setSignaturesReady(false);
      }
    } catch (error) {
      console.error("Error submitting form:", error.message);
      alert("Error submitting form: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this helper function if you haven't already
  const convertTimeStringToSeconds = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      {engineer ? (
        <div className="w-full bg-gray-200 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Welcome, {engineer.name}
          </h1>

          <div className="mb-6">
            <label
              htmlFor="maintenanceType"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Type of Maintenance
            </label>
            <select
              id="maintenanceType"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Select maintenance type
              </option>
              <option value="Preventive Maintenance">
                Preventive Maintenance
              </option>
              <option value="NCCAL Service Maintenance">
                NCCAL Service Maintenance
              </option>
            </select>
          </div>

          {/* Common Fields Section */}
          {maintenanceType && (
            <div className="space-y-6 border-t border-b border-gray-200 py-6">
              <h2 className="text-xl font-semibold text-gray-700">
                Common Information
              </h2>

              {/* Date In Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="dateIn"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Date In
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="datetime-local"
                      id="dateIn"
                      value={dateIn}
                      onChange={(e) => setDateIn(e.target.value)}
                      className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow"
                    />
                    <button
                      onClick={() => setCurrentDateTime("in")}
                      className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 whitespace-nowrap"
                    >
                      Set to Now
                    </button>
                  </div>
                </div>

                {/* Date Out Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="dateOut"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Date Out
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="datetime-local"
                      id="dateOut"
                      value={dateOut}
                      onChange={(e) => setDateOut(e.target.value)}
                      className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow"
                    />
                    <button
                      onClick={() => setCurrentDateTime("out")}
                      className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 whitespace-nowrap"
                    >
                      Set to Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Inspector and Customer Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="inspectorName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Inspector
                  </label>
                  <input
                    type="text"
                    id="inspectorName"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="customer"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Customer
                  </label>
                  <textarea
                    id="customer"
                    ref={customerTextareaRef}
                    value={customer}
                    onChange={(e) => {
                      setCustomer(e.target.value);
                      adjustTextareaHeight(e);
                    }}
                    onInput={adjustTextareaHeight}
                    className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] resize-none overflow-hidden"
                    style={{ height: "60px" }}
                  />
                </div>
              </div>

              {/* Total Hours and Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="totalHours"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Total Hours
                  </label>
                  <input
                    type="text"
                    id="totalHours"
                    value={totalHours}
                    readOnly
                    className="w-full px-4 py-2 border rounded-lg text-gray-700 bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="remarks"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Remarks
                  </label>
                  <textarea
                    id="remarks"
                    ref={remarkTextareaRef}
                    value={remark}
                    onChange={(e) => {
                      setRemark(e.target.value);
                      adjustTextareaHeight(e);
                    }}
                    onInput={adjustTextareaHeight}
                    className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] resize-none overflow-hidden"
                    style={{ height: "60px" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checklist Questions Section */}
          {questions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Checklist Questions
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {questions.map((q, index) => {
                  const currentAnswers = getCurrentAnswers();
                  return (
                    <div
                      key={index}
                      className="p-5 bg-white shadow-md rounded-xl border border-gray-200 transition hover:shadow-lg"
                    >
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="text-gray-800 font-semibold text-base">
                          {q.question}
                        </div>
                      </div>

                      <div className="mt-3">
                        {q.input_type === "text" && (
                          <textarea
                            placeholder={`Answer to: ${q.question}`}
                            value={currentAnswers[index] || ""}
                            onChange={(e) => {
                              handleAnswerChange(index, e.target.value);
                              adjustTextareaHeight(e);
                            }}
                            onInput={adjustTextareaHeight}
                            className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden min-h-[60px]"
                            style={{ height: "60px" }}
                          />
                        )}

                        {q.input_type === "yesno" && (
                          <div className="flex items-center justify-start space-x-4 mt-2">
                            <span className="text-sm text-gray-600">No</span>
                            <Switch
                              checked={currentAnswers[index] === "Yes"}
                              onChange={(checked) =>
                                handleYesNoToggle(index, checked ? "Yes" : "No")
                              }
                              offColor="#f0f0f0"
                              onColor="#48bb78"
                              offHandleColor="#ed8936"
                              onHandleColor="#2b6cb0"
                            />
                            <span className="text-sm text-gray-600">Yes</span>
                          </div>
                        )}

                        {q.input_type === "number" && (
                          <input
                            type="number"
                            placeholder={`Answer to: ${q.question}`}
                            value={currentAnswers[index] || ""}
                            onChange={(e) =>
                              handleAnswerChange(index, e.target.value)
                            }
                            className="w-full px-4 py-2 mt-1 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                              WebkitAppearance: "none",
                              MozAppearance: "textfield",
                            }}
                          />
                        )}

                        {q.input_type === "image" && (
                          <div className="flex flex-col mt-2 space-y-2">
                            <label className="text-sm text-gray-600">
                              Upload or Capture Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              ref={(el) =>
                                (fileInputRefs.current[`file_${index}`] = el)
                              }
                              onChange={(e) => handleImageUpload(e, index)}
                              className="w-full px-4 py-2 border rounded-lg text-gray-700"
                            />
                            {allAnswers[maintenanceType]?.[
                              `image_${index}`
                            ] && (
                              <div className="relative">
                                <img
                                  src={
                                    allAnswers[maintenanceType][
                                      `image_${index}`
                                    ]
                                  }
                                  alt="Preview"
                                  className="mt-2 w-full max-w-xs rounded-lg"
                                />
                                <button
                                  onClick={() => handleImageDelete(index)}
                                  className="absolute top-4 right-2 bg-red-500 text-white p-1 rounded-full"
                                  title="Delete image"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show signature fields only after questions are loaded */}
          {isSignatureVisible && (
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold text-gray-700">
                Signatures
              </h2>

              {/* Inspector Signature */}
              <div className="space-y-2">
                <label className="text-gray-700">Inspector Signature</label>
                <div
                  className="w-full border rounded-lg"
                  style={{ maxWidth: "100%" }}
                >
                  <SignatureCanvas
                    penColor="black"
                    canvasProps={{
                      className: "signature-canvas",
                      style: {
                        width: "100%",
                        height: "200px",
                      },
                      willReadFrequently: true, // Add this line
                    }}
                    ref={inspectorSignatureRef}
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => clearSignature("inspector")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              {/* Customer Signature */}
              <div className="space-y-2">
                <label className="text-gray-700">Customer Signature</label>
                <div
                  className="w-full border rounded-lg"
                  style={{ maxWidth: "100%" }}
                >
                  <SignatureCanvas
                    penColor="black"
                    canvasProps={{
                      className: "signature-canvas",
                      style: {
                        width: "100%",
                        height: "200px",
                      },
                      willReadFrequently: true, // Add this line
                    }}
                    ref={customerSignatureRef}
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => clearSignature("customer")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700">Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className="bg-red-200 text-red-800 p-4 rounded-lg">
              <h3 className="font-semibold">Missing Fields:</h3>
              <ul className="list-disc list-inside">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-4">
            <button
              onClick={captureSignatures}
              className="px-4 py-2 bg-green-500 text-white rounded-lg mr-4"
              type="button"
            >
              Save Signatures
            </button>
            <button
              onClick={handleSubmit}
              className="w-full md:w-1/3 py-2 px-4 bg-blue-100 text-white font-semibold rounded-lg hover:bg-blue-700"
              disabled={!maintenanceType || isSubmitting || !signaturesReady}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
