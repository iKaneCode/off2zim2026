"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/client-api";

interface ServiceProviderOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface DocumentUpload {
  type: string;
  file: File | null;
  fileUrl?: string | null;
  status: "pending" | "uploaded" | "verified" | "rejected";
}

const ServiceProviderOnboarding = ({
  onComplete,
  onSkip,
}: ServiceProviderOnboardingProps) => {
  const { updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [businessInfo, setBusinessInfo] = useState({
    businessDescription: "",
    establishedYear: "",
    numberOfEmployees: "",
    businessCategory: "",
    servicesOffered: [] as string[],
    operatingHours: "",
    websiteUrl: "",
    socialMediaLinks: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  });

  const [documents, setDocuments] = useState<DocumentUpload[]>([
    {
      type: "Business Registration Certificate",
      file: null,
      status: "pending",
    },
    { type: "Tax Clearance Certificate", file: null, status: "pending" },
    { type: "Tourism License (if applicable)", file: null, status: "pending" },
    { type: "Insurance Certificate", file: null, status: "pending" },
    { type: "Bank Reference Letter", file: null, status: "pending" },
  ]);

  const businessCategories = [
    "Accommodation & Lodging",
    "Tours & Excursions",
    "Transport Services",
    "Adventure Activities",
    "Cultural Experiences",
    "Wildlife & Safari",
    "Food & Dining",
    "Event Planning",
    "Equipment Rental",
    "Other Services",
  ];

  const serviceOptions = [
    "Hotel/Lodge",
    "Guest House",
    "Safari Tours",
    "City Tours",
    "Cultural Tours",
    "Adventure Sports",
    "Transport/Transfers",
    "Car Rental",
    "Equipment Rental",
    "Restaurant/Catering",
    "Event Planning",
    "Photography",
    "Guide Services",
  ];

  const handleBusinessInfoChange = (
    field: string,
    value: string | string[]
  ) => {
    setBusinessInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setBusinessInfo((prev) => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value,
      },
    }));
  };

  const handleServiceToggle = (service: string) => {
    const updatedServices = businessInfo.servicesOffered.includes(service)
      ? businessInfo.servicesOffered.filter((s) => s !== service)
      : [...businessInfo.servicesOffered, service];

    handleBusinessInfoChange("servicesOffered", updatedServices);
  };

  const handleFileUpload = (index: number, file: File) => {
    const updatedDocuments = [...documents];
    updatedDocuments[index] = {
      ...updatedDocuments[index],
      file,
      status: "uploaded",
    };
    setDocuments(updatedDocuments);
  };

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);

    try {
      const uploadedDocuments = await Promise.all(
        documents.map(async (document) => {
          if (!document.file) {
            return document;
          }

          const formData = new FormData();
          formData.append("file", document.file);
          formData.append("documentType", document.type);

          const payload = await apiFetch<{
            asset: {
              fileName: string;
              fileUrl: string;
              contentType: string;
              size: number;
            };
          }>("/api/provider/uploads/documents", {
            method: "POST",
            body: formData,
          });

          return {
            ...document,
            fileUrl: payload.asset.fileUrl,
            status: "uploaded" as const,
          };
        })
      );

      await updateProfile({
        ...businessInfo,
        businessDocuments: uploadedDocuments,
        onboardingCompleted: true,
        basicReviewSubmitted: true,
        basicReviewSubmittedAt: new Date().toISOString(),
      });

      await apiFetch("/api/provider/company/review", {
        method: "POST",
      });

      onComplete?.();
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${
                currentStep >= step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-1 mx-2 
                ${currentStep > step ? "bg-blue-600" : "bg-gray-200"}
              `}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderBusinessInfoStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Complete Your Business Profile
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide detailed information about your business to help customers
          find and trust your services.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Description *
        </label>
        <textarea
          value={businessInfo.businessDescription}
          onChange={(e) =>
            handleBusinessInfoChange("businessDescription", e.target.value)
          }
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your business, services, and what makes you unique..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year Established *
          </label>
          <input
            type="number"
            value={businessInfo.establishedYear}
            onChange={(e) =>
              handleBusinessInfoChange("establishedYear", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 2015"
            min="1900"
            max={new Date().getFullYear()}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Employees
          </label>
          <select
            value={businessInfo.numberOfEmployees}
            onChange={(e) =>
              handleBusinessInfoChange("numberOfEmployees", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select range</option>
            <option value="1-5">1-5 employees</option>
            <option value="6-20">6-20 employees</option>
            <option value="21-50">21-50 employees</option>
            <option value="51-100">51-100 employees</option>
            <option value="100+">100+ employees</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Category *
        </label>
        <select
          value={businessInfo.businessCategory}
          onChange={(e) =>
            handleBusinessInfoChange("businessCategory", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select category</option>
          {businessCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Services Offered *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {serviceOptions.map((service) => (
            <label key={service} className="flex items-center">
              <input
                type="checkbox"
                checked={businessInfo.servicesOffered.includes(service)}
                onChange={() => handleServiceToggle(service)}
                className="rounded border-gray-300 text-blue-600 mr-2"
              />
              <span className="text-sm text-gray-700">{service}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Operating Hours
        </label>
        <input
          type="text"
          value={businessInfo.operatingHours}
          onChange={(e) =>
            handleBusinessInfoChange("operatingHours", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Mon-Fri 8AM-6PM, Weekends 9AM-5PM"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website URL
        </label>
        <input
          type="url"
          value={businessInfo.websiteUrl}
          onChange={(e) =>
            handleBusinessInfoChange("websiteUrl", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://www.yourbusiness.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Social Media Links
        </label>
        <div className="space-y-2">
          {Object.entries(businessInfo.socialMediaLinks).map(
            ([platform, url]) => (
              <div key={platform}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) =>
                    handleSocialMediaChange(platform, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );

  const renderDocumentUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Upload Required Documents
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Upload the following documents for verification. These will be
          reviewed as part of your Basic Review process.
        </p>
      </div>

      <div className="space-y-4">
        {documents.map((doc, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{doc.type}</h4>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  doc.status === "uploaded"
                    ? "bg-green-100 text-green-800"
                    : doc.status === "verified"
                      ? "bg-blue-100 text-blue-800"
                      : doc.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </span>
            </div>

            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(index, file);
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {doc.file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {doc.file.name}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">
          Document Requirements
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• All documents must be clear and legible</li>
          <li>• Accepted formats: PDF, JPG, PNG</li>
          <li>• Maximum file size: 10MB per document</li>
          <li>• Documents must be current and valid</li>
        </ul>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Review & Submit for Basic Review
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Please review your information before submitting for Basic Review. You
          can edit any section by going back to previous steps.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Business Information</h4>
          <div className="mt-2 text-sm text-gray-600">
            <p>
              <strong>Category:</strong> {businessInfo.businessCategory}
            </p>
            <p>
              <strong>Established:</strong> {businessInfo.establishedYear}
            </p>
            <p>
              <strong>Services:</strong>{" "}
              {businessInfo.servicesOffered.join(", ")}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Documents</h4>
          <div className="mt-2 text-sm text-gray-600">
            <p>
              <strong>Uploaded:</strong>{" "}
              {documents.filter((d) => d.status === "uploaded").length} of{" "}
              {documents.length}
            </p>
            <p>
              <strong>Required for Basic Review:</strong> Business Registration,
              Tax Clearance
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Next Steps</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Your application will be reviewed within 3-5 business days</li>
          <li>• You&apos;ll receive email updates on your review status</li>
          <li>• Once approved, you can start listing your services</li>
          <li>• Consider upgrading to Verified Badge for premium benefits</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Service Provider Onboarding
        </h2>
        <p className="text-gray-600 mt-2">
          Complete your profile to start offering services on Off2Zim
        </p>
      </div>

      {renderStepIndicator()}

      <div className="min-h-[600px]">
        {currentStep === 1 && renderBusinessInfoStep()}
        {currentStep === 2 && renderDocumentUploadStep()}
        {currentStep === 3 && renderReviewStep()}
      </div>

      <div className="flex justify-between pt-8 border-t">
        <div>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Skip for now
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 &&
                  (!businessInfo.businessDescription ||
                    !businessInfo.businessCategory ||
                    businessInfo.servicesOffered.length === 0)) ||
                (currentStep === 2 &&
                  documents.filter((d) => d.status === "uploaded").length < 2)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit for Basic Review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderOnboarding;
