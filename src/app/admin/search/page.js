"use client";
import { useState, useEffect } from "react";
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

  // Load initial data
  useEffect(() => {
    fetchEngineers();
    fetchCustomers();
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
        date_out: new Date(card.date_out).toLocaleDateString(),
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
    try {
      // Fetch the detailed job card data
      const { data: jobCardData, error: jobCardError } = await supabase
        .from("job_cards")
        .select(
          `
          *,
          inspector:inspector_id(name)
        `
        )
        .eq("id", jobCard.id)
        .single();

      if (jobCardError) throw jobCardError;

      // Fetch answers related to this job card
      const { data: answersData, error: answersError } = await supabase
        .from("answers")
        .select(
          `
          *,
          template:template_id(id, type, question, input_type, order)
        `
        )
        .eq("job_card_id", jobCard.id);

      if (answersError) throw answersError;

      // Combine the data
      const detailedJobCard = {
        ...jobCardData,
        inspector_name: jobCardData.inspector?.name,
        answers: answersData,
      };

      setSelectedJobCard(detailedJobCard);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching job card details:", error);
      alert("Error fetching job card details. Please try again.");
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
              </div>
            )}
          </div>

          {/* From Date */}
          <div className="flex">
            <input
              type="date"
              placeholder="From Date"
              className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <div className="bg-teal-700 flex items-center px-3 rounded-r-md">
              <Calendar className="text-white" size={20} />
            </div>
          </div>

          {/* To Date */}
          <div className="flex">
            <input
              type="date"
              placeholder="To Date"
              className="w-full p-3 bg-teal-700 text-white placeholder-white border-none outline-none rounded-l-md"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <div className="bg-teal-700 flex items-center px-3 rounded-r-md">
              <Calendar className="text-white" size={20} />
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
                      {result.date_out}
                    </td>
                    <td className="p-3 border border-teal-500">
                      {result.remarks || "-"}
                    </td>
                    <td className="p-3 border border-teal-500 text-center">
                      <button
                        className="p-1 bg-teal-600 rounded-full"
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

      {/* Details Modal */}
      {showModal && selectedJobCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-teal-700 p-6 rounded-md w-full max-w-2xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white font-bold">Job Card Details</h2>
              <button
                className="text-white hover:text-gray-300"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="text-white space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p>
                  <strong>Job Card:</strong> JC
                  {String(selectedJobCard.id).padStart(4, "0")}
                </p>
                <p>
                  <strong>Type:</strong> {selectedJobCard.type}
                </p>
                <p>
                  <strong>Customer:</strong> {selectedJobCard.customer_name}
                </p>
                <p>
                  <strong>Inspector:</strong>{" "}
                  {selectedJobCard.inspector_name || "N/A"}
                </p>
                <p>
                  <strong>Date In:</strong>{" "}
                  {new Date(selectedJobCard.date_in).toLocaleDateString()}
                </p>
                <p>
                  <strong>Date Out:</strong>{" "}
                  {new Date(selectedJobCard.date_out).toLocaleDateString()}
                </p>
                <p>
                  <strong>Total Hours:</strong> {selectedJobCard.total_hours}
                </p>
                <p>
                  <strong>Remarks:</strong> {selectedJobCard.remarks || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
