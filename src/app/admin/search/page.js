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

  // Load initial data
  useEffect(() => {
    fetchEngineers();
    fetchCustomers();

    // Add some dummy search results for demo purposes
    setSearchResults([
      {
        id: 70,
        job_card_no: "JC0070",
        customer_name: "SULTAN ELECTRONICS",
        inspector: "David",
        date_out: "2025-04-14",
        formatted_date_out: "14/04/2025",
        day_of_week: "Mon",
        remarks: "Everything done".repeat(10),
      },
    ]);
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

      setSearchResults(
        formattedResults.length > 0
          ? formattedResults
          : [
              {
                id: 47,
                job_card_no: "JC0047",
                customer_name: "ABC",
                inspector: "David",
                date_out: "2025-04-13",
                formatted_date_out: "13/04/2025",
                day_of_week: "Sun",
                date_in: "2025-04-10",
                formatted_date_in: "10/04/2025",
                total_hours: 8,
                remarks: "ABC",
                type: "Preventive Maintenance",
              },
            ]
      );
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

  const showDetails = (jobCard) => {
    // For demo purposes, create a dummy job card if real data is not available
    const dummyJobCard = {
      id: jobCard.id,
      job_card_no: jobCard.job_card_no,
      customer_name: jobCard.customer_name,
      inspector_name: jobCard.inspector,
      type: jobCard.type || "Preventive Maintenance",
      date_in: jobCard.date_in || "2025-04-10",
      date_out: jobCard.date_out,
      total_hours: jobCard.total_hours || 8,
      remarks: jobCard.remarks || "ABC",
    };

    setSelectedJobCard(dummyJobCard);
    setShowModal(true);
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
      {/* Sidebar */}
      <div className="w-16 bg-teal-600 flex flex-col items-center py-6 shadow-md">
        <Link href="/admin/search" className="mb-8 p-2 bg-teal-700 rounded-md">
          <Search className="text-white" size={24} />
        </Link>
        <Link
          href="/admin/questions"
          className="mb-8 p-2 hover:bg-teal-700 rounded-md"
        >
          <List className="text-white" size={24} />
        </Link>
        <Link
          href="/admin/document"
          className="mb-8 p-2 hover:bg-teal-700 rounded-md"
        >
          <FileText className="text-white" size={24} />
        </Link>
        <Link
          href="/admin/credentials"
          className="mb-8 p-2 hover:bg-teal-700 rounded-md"
        >
          <User className="text-white" size={24} />
        </Link>
        <Link
          href="/admin"
          className="mt-auto p-2 hover:bg-teal-700 rounded-md"
        >
          <LogOut className="text-white" size={24} />
        </Link>
      </div>

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

        {/* Search Button */}
        <div className="flex justify-end mb-6">
          <button
            className="px-8 py-3 bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-70"
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
            className="bg-teal-600 rounded-md w-full max-w-xl pointer-events-auto shadow-lg"
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
            <div className="p-4 text-white">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
