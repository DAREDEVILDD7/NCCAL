// src/pages/admin/template-editor.js
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateMaintenancePDF } from "../../../utils/pdfGenerator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewJobId, setPreviewJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [templateSettings, setTemplateSettings] = useState({
    headerFontSize: 22,
    detailFontSize: 12,
    tableFontSize: 10,
    signatureSectionHeight: 60,
    showLogo: true,
    addBorders: true,
    pageMargin: 20,
  });

  useEffect(() => {
    fetchTemplateTypes();
    fetchRecentJobs();
  }, []);

  const fetchTemplateTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("type")
        .order("type")
        .limit(100);

      if (error) throw error;

      // Extract unique template types
      const uniqueTypes = [...new Set(data.map((item) => item.type))];
      setTemplates(uniqueTypes);
    } catch (error) {
      console.error("Error fetching template types:", error.message);
      alert("Failed to load template types");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_cards")
        .select("id, type, customer_name, date_in")
        .order("date_in", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentJobs(data);
    } catch (error) {
      console.error("Error fetching recent jobs:", error.message);
    }
  };

  const handlePreview = async () => {
    if (!previewJobId) {
      alert("Please enter a job ID to preview");
      return;
    }

    setLoading(true);
    try {
      const fileName = await generateMaintenancePDF(parseInt(previewJobId));
      alert(`PDF preview generated: ${fileName}`);
    } catch (error) {
      console.error("Error generating preview:", error.message);
      alert("Failed to generate PDF preview: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSettingChange = (setting, value) => {
    setTemplateSettings({
      ...templateSettings,
      [setting]: value,
    });
  };

  // This function would normally save template settings to backend
  // For this example, we're just simulating it
  const saveTemplateSettings = () => {
    alert(
      "Template settings saved! (This is a demo - actual saving would be implemented in production)"
    );
    // In a real implementation, you would save these settings to your database
    // and modify the PDF generator to use them
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        PDF Template Administration
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Template Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Type
              </label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedTemplate || ""}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">Select a template type</option>
                {templates.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Font Size
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md"
                value={templateSettings.headerFontSize}
                onChange={(e) =>
                  handleTemplateSettingChange(
                    "headerFontSize",
                    parseInt(e.target.value)
                  )
                }
                min="14"
                max="36"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detail Font Size
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md"
                value={templateSettings.detailFontSize}
                onChange={(e) =>
                  handleTemplateSettingChange(
                    "detailFontSize",
                    parseInt(e.target.value)
                  )
                }
                min="8"
                max="16"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Font Size
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md"
                value={templateSettings.tableFontSize}
                onChange={(e) =>
                  handleTemplateSettingChange(
                    "tableFontSize",
                    parseInt(e.target.value)
                  )
                }
                min="8"
                max="14"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signature Section Height
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md"
                value={templateSettings.signatureSectionHeight}
                onChange={(e) =>
                  handleTemplateSettingChange(
                    "signatureSectionHeight",
                    parseInt(e.target.value)
                  )
                }
                min="40"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Margin (mm)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-md"
                value={templateSettings.pageMargin}
                onChange={(e) =>
                  handleTemplateSettingChange(
                    "pageMargin",
                    parseInt(e.target.value)
                  )
                }
                min="10"
                max="40"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showLogo"
                checked={templateSettings.showLogo}
                onChange={(e) =>
                  handleTemplateSettingChange("showLogo", e.target.checked)
                }
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="showLogo" className="text-sm text-gray-700">
                Show Logo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="addBorders"
                checked={templateSettings.addBorders}
                onChange={(e) =>
                  handleTemplateSettingChange("addBorders", e.target.checked)
                }
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="addBorders" className="text-sm text-gray-700">
                Add Section Borders
              </label>
            </div>

            <button
              onClick={saveTemplateSettings}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              Save Template Settings
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Preview PDF</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Job ID to Preview
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  className="flex-1 p-2 border rounded-md"
                  value={previewJobId}
                  onChange={(e) => setPreviewJobId(e.target.value)}
                  placeholder="Enter job ID"
                />
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400"
                >
                  {loading ? "Processing..." : "Generate Preview"}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-md font-semibold mb-2">Recent Jobs</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {job.id}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {job.type}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {job.customer_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {new Date(job.date_in).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setPreviewJobId(job.id.toString());
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
