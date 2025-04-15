"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  Search,
  List,
  FileText,
  User,
  LogOut,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "../../../app/components/AdminSidebar";

export default function AdminSearch() {
  const [maintenanceType, setMaintenanceType] = useState("");
  const [showMaintenanceOptions, setShowMaintenanceOptions] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [jobCardNumber, setJobCardNumber] = useState("");
  const [inspector, setInspector] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [filteredEngineers, setFilteredEngineers] = useState([]);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // References for date inputs
  const fromDateInputRef = useRef(null);
  const toDateInputRef = useRef(null);
  const modalRef = useRef(null);

  // Format date to dd/mm/yyyy for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Get day of week abbreviation
  const getDayOfWeek = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const isBase64Image = (str) => {
    if (!str) return false;
    try {
      // Check if it starts with a data URI prefix for images
      if (str.startsWith("data:image/")) return true;

      // If it doesn't have a prefix but looks like base64 data
      if (typeof str !== "string" || str.length < 100) return false;
      return /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0;
    } catch (err) {
      return false;
    }
  };

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showModal &&
        modalRef.current &&
        !modalRef.current.contains(event.target)
      ) {
        setShowModal(false);
        // Prevent the click from reaching elements underneath
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Add event listener when modal is shown
    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside, true);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [showModal]);

  useEffect(() => {
    fetchEngineers();
    fetchCustomers();

    // Initialize with empty results (removing the dummy data)
    setSearchResults([]);
  }, []);

  const fetchEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from("engineers")
        .select("id, name");

      if (error) {
        throw error;
      }

      if (data) {
        setEngineers(data);
      }
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  const handleImageClick = (imageData) => {
    setSelectedImage(imageData);
    setShowImageModal(true);
  };

  // Add a new function to fetch the last job card
  const fetchLastJobCard = async () => {
    setLoading(true);
    try {
      // Query the database to get the most recent job card
      const { data, error } = await supabase
        .from("job_cards")
        .select(
          `
        id,
        customer_name,
        date_in,
        date_out,
        total_hours,
        remarks,
        type,
        engineers:inspector_id(id, name)
      `
        )
        .order("id", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Format the results
        const formattedResults = data.map((card) => ({
          id: card.id,
          job_card_no: `JC${String(card.id).padStart(4, "0")}`,
          customer_name: card.customer_name,
          inspector: card.engineers?.name || "N/A",
          date_out: card.date_out,
          formatted_date_out: formatDate(card.date_out),
          day_of_week: getDayOfWeek(card.date_out),
          remarks: card.remarks,
        }));

        setSearchResults(formattedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error fetching last job card:", error);
      alert("Error fetching last job card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Get unique customer names from job_cards
      const { data, error } = await supabase
        .from("job_cards")
        .select("customer_name")
        .order("customer_name");

      if (error) {
        throw error;
      }

      if (data) {
        // Extract unique customer names
        const uniqueCustomers = [
          ...new Set(data.map((item) => item.customer_name)),
        ];
        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Start building the query
      let query = supabase.from("job_cards").select(`
          id,
          customer_name,
          date_in,
          date_out,
          total_hours,
          remarks,
          type,
          engineers:inspector_id(id, name)
        `);

      // Add filters
      if (jobCardNumber) {
        query = query.eq("id", jobCardNumber);
      }

      if (maintenanceType) {
        query = query.eq("type", maintenanceType);
      }

      if (fromDate && toDate) {
        query = query.gte("date_out", fromDate).lte("date_out", toDate);
      } else if (fromDate) {
        query = query.gte("date_out", fromDate);
      } else if (toDate) {
        query = query.lte("date_out", toDate);
      }

      if (customerName) {
        query = query.ilike("customer_name", `%${customerName}%`);
      }

      // Execute the query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // For inspector filtering, we need to do it post-query as it's a join
      let results = data || [];

      if (inspector && results.length > 0) {
        results = results.filter((item) =>
          item.engineers?.name?.toLowerCase().includes(inspector.toLowerCase())
        );
      }

      // Format the results
      const formattedResults = results.map((card) => ({
        id: card.id,
        job_card_no: `JC${String(card.id).padStart(4, "0")}`,
        customer_name: card.customer_name,
        inspector: card.engineers?.name || "N/A",
        date_out: card.date_out,
        formatted_date_out: formatDate(card.date_out),
        day_of_week: getDayOfWeek(card.date_out),
        remarks: card.remarks,
      }));

      setSearchResults(formattedResults);
    } catch (error) {
      console.error("Error searching job cards:", error);
      alert("Error searching job cards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInspectorChange = (e) => {
    const value = e.target.value;
    setInspector(value);

    if (value.trim() === "") {
      setFilteredEngineers([]);
      setShowEngineerDropdown(false);
    } else {
      const filtered = engineers.filter((eng) =>
        eng.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredEngineers(filtered);
      setShowEngineerDropdown(true);
    }
  };

  const handleCustomerNameChange = (e) => {
    const value = e.target.value;
    setCustomerName(value);

    if (value.trim() === "") {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    } else {
      const filtered = customers.filter((customer) =>
        customer.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    }
  };

  const selectEngineer = (name) => {
    setInspector(name);
    setShowEngineerDropdown(false);
  };

  const selectCustomer = (name) => {
    setCustomerName(name);
    setShowCustomerDropdown(false);
  };

  const showDetails = async (jobCard) => {
    setLoading(true);
    try {
      // Fetch job card details
      const { data: jobCardData, error: jobCardError } = await supabase
        .from("job_cards")
        .select(
          `
          id,
          customer_name,
          date_in,
          date_out,
          total_hours,
          remarks,
          type,
          engineers:inspector_id(id, name)
        `
        )
        .eq("id", jobCard.id)
        .single();

      if (jobCardError) throw jobCardError;

      // Fetch checklist items with answers
      const { data: checklistData, error: checklistError } = await supabase
        .from("checklist_templates")
        .select(
          `
          id,
          question,
          order,
          answers!inner(answer, job_card_id)
        `
        )
        .eq("answers.job_card_id", jobCard.id)
        .order("order", { ascending: true });

      if (checklistError) throw checklistError;

      // Format checklist data
      const formattedChecklist = checklistData.map((item) => ({
        question: item.question,
        answer: item.answers[0]?.answer || "N/A",
      }));

      setChecklistItems(formattedChecklist);

      // Set job card details
      const formattedJobCard = {
        id: jobCardData.id,
        job_card_no: `JC${String(jobCardData.id).padStart(4, "0")}`,
        customer_name: jobCardData.customer_name,
        inspector_name: jobCardData.engineers?.name || "N/A",
        type: jobCardData.type || "Preventive Maintenance",
        date_in: jobCardData.date_in,
        date_out: jobCardData.date_out,
        total_hours: jobCardData.total_hours || 8,
        remarks: jobCardData.remarks || "-",
      };

      setSelectedJobCard(formattedJobCard);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching job card details:", error);
      alert("Error fetching job card details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to open date pickers
  const openFromDatePicker = () => {
    if (fromDateInputRef.current) {
      fromDateInputRef.current.showPicker();
    }
  };

  const openToDatePicker = () => {
    if (toDateInputRef.current) {
      toDateInputRef.current.showPicker();
    }
  };

  return (
    <div className="flex h-screen bg-teal-500">
      <AdminSidebar />

      {/* Main content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Search filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Job Card Number */}
          <div className="relative">
            <div className="flex">
              <input
                type="text"
                placeholder="Job Card Number"
                className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md"
                value={jobCardNumber}
                onChange={(e) => setJobCardNumber(e.target.value)}
              />
              <div className="bg-teal-700 flex items-center px-3 rounded-r-md">
                <Search className="text-white" size={20} />
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div className="relative">
            <div className="flex">
              <input
                type="text"
                placeholder="Inspector"
                className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md"
                value={inspector}
                onChange={handleInspectorChange}
                onFocus={() =>
                  inspector.trim() !== "" && setShowEngineerDropdown(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowEngineerDropdown(false), 200)
                }
              />
              <div className="bg-teal-700 flex items-center px-3 rounded-r-md">
                <Search className="text-white" size={20} />
              </div>
            </div>
            {showEngineerDropdown && filteredEngineers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-teal-700 text-white rounded-md shadow-lg max-h-48 overflow-auto">
                {filteredEngineers.map((eng) => (
                  <div
                    key={eng.id}
                    className="p-2 hover:bg-teal-800 cursor-pointer"
                    onMouseDown={() => selectEngineer(eng.name)}
                  >
                    {eng.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div className="relative">
            <div className="flex">
              <input
                type="text"
                placeholder="Customer Name"
                className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md"
                value={customerName}
                onChange={handleCustomerNameChange}
                onFocus={() =>
                  customerName.trim() !== "" && setShowCustomerDropdown(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowCustomerDropdown(false), 200)
                }
              />
              <div className="bg-teal-700 flex items-center px-3 rounded-r-md">
                <Search className="text-white" size={20} />
              </div>
            </div>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-teal-700 text-white rounded-md shadow-lg max-h-48 overflow-auto">
                {filteredCustomers.map((customer, idx) => (
                  <div
                    key={idx}
                    className="p-2 hover:bg-teal-800 cursor-pointer"
                    onMouseDown={() => selectCustomer(customer)}
                  >
                    {customer}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Maintenance Type */}
          <div className="relative">
            <div
              className="flex justify-between items-center p-3 bg-teal-700 text-white rounded-md cursor-pointer"
              onClick={() => setShowMaintenanceOptions(!showMaintenanceOptions)}
            >
              <span>{maintenanceType || "Maintenance Type"}</span>
              <ChevronDown className="text-white" size={20} />
            </div>
            {showMaintenanceOptions && (
              <div className="absolute z-10 w-full mt-1 bg-teal-700 text-white rounded-md shadow-lg">
                <div
                  className="p-3 hover:bg-teal-800 cursor-pointer"
                  onClick={() => {
                    setMaintenanceType("Preventive Maintenance");
                    setShowMaintenanceOptions(false);
                  }}
                >
                  Preventive Maintenance
                </div>
                <div
                  className="p-3 hover:bg-teal-800 cursor-pointer"
                  onClick={() => {
                    setMaintenanceType("NCCAL Service Maintenance");
                    setShowMaintenanceOptions(false);
                  }}
                >
                  NCCAL Service Maintenance
                </div>
                <div
                  className="p-3 hover:bg-teal-800 cursor-pointer border-t border-teal-600"
                  onClick={() => {
                    setMaintenanceType("");
                    setShowMaintenanceOptions(false);
                  }}
                >
                  Clear Selection
                </div>
              </div>
            )}
          </div>

          {/* From Date - Improved implementation */}
          <div className="relative">
            <div className="flex">
              <input
                ref={fromDateInputRef}
                type="text"
                readOnly
                className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md cursor-pointer"
                placeholder="From Date"
                value={fromDate ? formatDate(fromDate) : ""}
                onClick={openFromDatePicker}
              />
              <input
                type="date"
                className="absolute opacity-0 pointer-events-none"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || undefined}
                ref={fromDateInputRef}
              />
              <div
                className="bg-teal-700 flex items-center px-3 rounded-r-md cursor-pointer"
                onClick={openFromDatePicker}
              >
                <Calendar className="text-white" size={20} />
              </div>
            </div>
          </div>

          {/* To Date - Improved implementation */}
          <div className="relative">
            <div className="flex">
              <input
                ref={toDateInputRef}
                type="text"
                readOnly
                className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md cursor-pointer"
                placeholder="To Date"
                value={toDate ? formatDate(toDate) : ""}
                onClick={openToDatePicker}
              />
              <input
                type="date"
                className="absolute opacity-0 pointer-events-none"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                ref={toDateInputRef}
              />
              <div
                className="bg-teal-700 flex items-center px-3 rounded-r-md cursor-pointer"
                onClick={openToDatePicker}
              >
                <Calendar className="text-white" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Last Job Card Buttons */}
        <div className="flex justify-end mb-6 gap-4">
          <button
            className="px-8 py-3 bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-70 order-2 sm:order-1"
            onClick={fetchLastJobCard}
            disabled={loading}
          >
            <span className="hidden sm:inline">Last Job Card</span>
            <span className="sm:hidden">Last</span>
          </button>
          <button
            className="px-8 py-3 bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-70 order-1 sm:order-2"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="p-3 text-left border border-teal-600">
                  Sl. no:
                </th>
                <th className="p-3 text-left border border-teal-600">
                  Job Card no:
                </th>
                <th className="p-3 text-left border border-teal-600">
                  Customer Name
                </th>
                <th className="p-3 text-left border border-teal-600">
                  Inspector
                </th>
                <th className="p-3 text-left border border-teal-600">
                  Date Out (Day)
                </th>
                <th className="p-3 text-left border border-teal-600">
                  Remarks
                </th>
                <th className="p-3 text-center border border-teal-600">
                  See Details
                </th>
              </tr>
            </thead>
            <tbody>
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <tr key={result.id} className="bg-teal-600 text-white">
                    <td className="p-3 border border-teal-500">{index + 1}</td>
                    <td className="p-3 border border-teal-500">
                      {result.job_card_no}
                    </td>
                    <td className="p-3 border border-teal-500">
                      {result.customer_name}
                    </td>
                    <td className="p-3 border border-teal-500">
                      {result.inspector}
                    </td>
                    <td className="p-3 border border-teal-500">
                      {result.formatted_date_out} ({result.day_of_week})
                    </td>
                    <td className="p-3 border border-teal-500 truncate max-w-xs">
                      {result.remarks || "-"}
                    </td>
                    <td className="p-3 border border-teal-500 text-center">
                      <button
                        className="p-1 bg-teal-800 hover:bg-teal-900 rounded-full"
                        onClick={() => showDetails(result)}
                      >
                        <Info className="text-white" size={24} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-teal-600 text-white">
                  <td colSpan="7" className="p-4 text-center">
                    {loading
                      ? "Loading results..."
                      : "No results found. Please try different search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Improved modal implementation as overlay without darkening background */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            ref={modalRef}
            className="bg-teal-600 rounded-md w-full max-w-xl max-h-[90vh] flex flex-col pointer-events-auto shadow-lg"
          >
            {/* Modal header */}
            <div className="flex justify-between items-center p-4 border-b border-teal-500">
              <h2 className="text-xl text-white font-bold">Job Card Details</h2>
              <button
                className="text-white hover:text-gray-300 p-1"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Modal content in two columns */}
            {/* Modal content */}
            <div className="p-4 text-white overflow-y-auto flex-1">
              {/* Current job card info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2">
                    <strong>Job Card:</strong> {selectedJobCard.job_card_no}
                  </p>
                  <p className="mb-2">
                    <strong>Customer:</strong> {selectedJobCard.customer_name}
                  </p>
                  <p className="mb-2">
                    <strong>Date In:</strong>{" "}
                    {formatDate(selectedJobCard.date_in)}
                  </p>
                  <p className="mb-2">
                    <strong>Total Hours:</strong> {selectedJobCard.total_hours}
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    <strong>Type:</strong> {selectedJobCard.type}
                  </p>
                  <p className="mb-2">
                    <strong>Inspector:</strong> {selectedJobCard.inspector_name}
                  </p>
                  <p className="mb-2">
                    <strong>Date Out:</strong>{" "}
                    {formatDate(selectedJobCard.date_out)} (
                    {getDayOfWeek(selectedJobCard.date_out)})
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1">
                  <strong>Remarks:</strong>
                </p>
                <p>{selectedJobCard.remarks}</p>
              </div>

              {/* Divider line */}
              <hr className="my-4 border-teal-500" />

              {/* Checklists section */}
              <div className="mt-4">
                <p className="mb-2">
                  <strong>Checklists:</strong>
                </p>
                {checklistItems.length > 0 ? (
                  <div className="space-y-3">
                    {checklistItems.map((item, index) => (
                      <div key={index} className="flex flex-wrap items-start">
                        <div className="w-full sm:w-1/2 font-medium pr-2">
                          {`${index + 1}: ${item.question}`}
                        </div>
                        <div className="w-full sm:w-1/2 pl-0 sm:pl-2 mt-1 sm:mt-0">
                          {isBase64Image(item.answer) ? (
                            <div>
                              <img
                                src={
                                  item.answer.startsWith("data:image/")
                                    ? item.answer
                                    : `data:image/jpeg;base64,${item.answer}`
                                }
                                alt="Answer"
                                className="h-16 cursor-pointer hover:opacity-80"
                                onClick={() => handleImageClick(item.answer)}
                              />
                            </div>
                          ) : (
                            <span>{item.answer}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No checklist items found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full size image modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-full p-2">
            <button
              className="absolute right-4 top-4 text-white bg-teal-700 rounded-full p-2 hover:bg-teal-800"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
            <img
              src={
                selectedImage.startsWith("data:image/")
                  ? selectedImage
                  : `data:image/jpeg;base64,${selectedImage}`
              }
              alt="Full size"
              className="max-h-[90vh] max-w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
