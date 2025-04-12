"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SignatureCanvas from "react-signature-canvas";
import Switch from "react-switch";

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

  // State for common fields
  const [dateIn, setDateIn] = useState("");
  const [dateOut, setDateOut] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [customer, setCustomer] = useState("");
  const [totalHours, setTotalHours] = useState("00:00:00");
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Use refs for references
  const inspectorSignatureRef = useRef(null);
  const customerSignatureRef = useRef(null);
  const remarkTextareaRef = useRef(null);
  const customerTextareaRef = useRef(null);

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

        // Store the image data directly in the answer field
        handleAnswerChange(questionIndex, imageData);

        // Set preview
        setImagePreview(imageData);
      };
      reader.readAsDataURL(file);
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

    // Check and capture inspector signature immediately
    if (
      inspectorSignatureRef.current &&
      inspectorSignatureRef.current.isEmpty()
    ) {
      missing.push("Inspector Signature");
    } else if (inspectorSignatureRef.current) {
      // Set inspector signature immediately when validating
      setInspectorSignature(
        inspectorSignatureRef.current.getTrimmedCanvas().toDataURL("image/png")
      );
    }

    // Check and capture customer signature immediately
    if (
      customerSignatureRef.current &&
      customerSignatureRef.current.isEmpty()
    ) {
      missing.push("Customer Signature");
    } else if (customerSignatureRef.current) {
      // Set customer signature immediately when validating
      setCustomerSignature(
        customerSignatureRef.current.getTrimmedCanvas().toDataURL("image/png")
      );
    }

    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    const currentAnswers = getCurrentAnswers();

    try {
      // Force-capture signatures again to ensure they're available
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
          customer_signature: customerSig,
          inspector_signature: inspectorSig,
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
            const imageData = currentAnswers[index];

            // Store "No" if no image was uploaded, otherwise store the image data
            answersToInsert.push({
              job_card_id: jobCardId,
              answer: imageData || "No", // Store image data directly in answer field
              template_id: question.id,
            });
          }
          // For all other questions
          else if (
            question.input_type === "yesno" ||
            (currentAnswers[index] &&
              currentAnswers[index].toString().trim() !== "")
          ) {
            answersToInsert.push({
              job_card_id: jobCardId,
              answer:
                question.input_type === "yesno"
                  ? currentAnswers[index] || "No"
                  : currentAnswers[index],
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

        // Success - redirect or show confirmation
        alert("Maintenance job card submitted successfully!");

        // Optional: Clear form or redirect
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
      }
    } catch (error) {
      console.error("Error submitting form:", error.message);
      alert("Error submitting form: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert time string to seconds
  const convertTimeStringToSeconds = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      {engineer ? (
        <div className="w-full bg-white shadow-lg rounded-xl p-6 space-y-6">
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

          {/* Checklist Questions Section - REDESIGNED */}
          {questions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                <span className="mr-2">Checklist Questions</span>
                <span className="text-sm font-normal text-gray-500">
                  ({questions.length} items)
                </span>
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {questions.map((q, index) => {
                  const currentAnswers = getCurrentAnswers();
                  return (
                    <div
                      key={index}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="h-6 w-6 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 mt-1 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-grow space-y-3">
                          <p className="font-medium text-gray-800">
                            {q.question}
                          </p>

                          {/* Conditional rendering based on input_type */}
                          {q.input_type === "text" && (
                            <textarea
                              placeholder="Enter your answer"
                              value={currentAnswers[index] || ""}
                              onChange={(e) => {
                                handleAnswerChange(index, e.target.value);
                                adjustTextareaHeight(e);
                              }}
                              onInput={adjustTextareaHeight}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] resize-none overflow-hidden"
                              style={{ height: "60px" }}
                            />
                          )}

                          {q.input_type === "yesno" && (
                            <div className="flex items-center space-x-4 py-2">
                              <span className="text-gray-600 font-medium">
                                No
                              </span>
                              <Switch
                                checked={currentAnswers[index] === "Yes"}
                                onChange={(checked) =>
                                  handleYesNoToggle(
                                    index,
                                    checked ? "Yes" : "No"
                                  )
                                }
                                offColor="#f0f0f0"
                                onColor="#48bb78"
                                offHandleColor="#ed8936"
                                onHandleColor="#2b6cb0"
                              />
                              <span className="text-gray-600 font-medium">
                                Yes
                              </span>
                            </div>
                          )}

                          {q.input_type === "number" && (
                            <input
                              type="number"
                              placeholder="Enter a value"
                              value={currentAnswers[index] || ""}
                              onChange={(e) =>
                                handleAnswerChange(index, e.target.value)
                              }
                              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{
                                WebkitAppearance: "none",
                                MozAppearance: "textfield",
                              }}
                            />
                          )}

                          {q.input_type === "image" && (
                            <div className="flex flex-col space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                                <label className="inline-flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg cursor-pointer transition-colors">
                                  <span className="mr-2">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </span>
                                  Upload Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleImageUpload(e, index)
                                    }
                                    className="hidden"
                                  />
                                </label>
                                <span className="text-gray-500 text-sm mt-2 sm:mt-0">
                                  {allAnswers[maintenanceType]?.[
                                    `image_${index}`
                                  ]
                                    ? "Image uploaded"
                                    : "No image selected"}
                                </span>
                              </div>
                              {allAnswers[maintenanceType]?.[
                                `image_${index}`
                              ] && (
                                <div className="mt-2">
                                  <img
                                    src={
                                      allAnswers[maintenanceType][
                                        `image_${index}`
                                      ]
                                    }
                                    alt="Preview"
                                    className="w-full max-w-xs rounded-lg border border-gray-200 shadow-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show signature fields only after questions are loaded */}
          {isSignatureVisible && (
            <div className="space-y-6 mt-8 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-700">
                Signatures
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inspector Signature - FIXED */}
                <div className="space-y-3">
                  <label className="text-gray-700 font-medium">
                    Inspector Signature
                  </label>
                  <div className="border-2 border-gray-200 rounded-lg">
                    <SignatureCanvas
                      penColor="black"
                      canvasProps={{
                        width: 500,
                        height: 200,
                        className: "signature-canvas",
                      }}
                      ref={inspectorSignatureRef}
                    />
                  </div>
                  <button
                    onClick={() => clearSignature("inspector")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear Signature
                  </button>
                </div>

                {/* Customer Signature - FIXED */}
                <div className="space-y-3">
                  <label className="text-gray-700 font-medium">
                    Customer Signature
                  </label>
                  <div className="border-2 border-gray-200 rounded-lg">
                    <SignatureCanvas
                      penColor="black"
                      canvasProps={{
                        width: 500,
                        height: 200,
                        className: "signature-canvas",
                      }}
                      ref={customerSignatureRef}
                    />
                  </div>
                  <button
                    onClick={() => clearSignature("customer")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear Signature
                  </button>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-gray-700 font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-1/2"
                />
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-lg">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="font-semibold">Missing Fields:</h3>
              </div>
              <ul className="list-disc list-inside mt-2 ml-6">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              className="py-3 px-8 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-all hover:shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={!maintenanceType || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
          <div className="text-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-500 mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
