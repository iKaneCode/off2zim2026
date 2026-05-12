"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface CommunityGuideApplicationProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const CommunityGuideApplication = ({
  onComplete,
  onCancel,
}: CommunityGuideApplicationProps) => {
  const { user, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [applicationData, setApplicationData] = useState({
    // Personal Information
    yearsInZimbabwe: "",
    currentLocation: "",
    languagesSpoken: [] as string[],

    // Expertise & Experience
    areasOfExpertise: [] as string[],
    tourismExperience: "",
    previousGuideWork: "",
    localKnowledgeDescription: "",

    // Specializations
    preferredTourTypes: [] as string[],
    specialSkills: [] as string[],
    availabilityHours: "",
    transportationAccess: "",

    // References & Verification
    references: [
      { name: "", phone: "", relationship: "", yearsKnown: "" },
      { name: "", phone: "", relationship: "", yearsKnown: "" },
    ],
    motivationLetter: "",

    // Documents
    idDocument: null as File | null,
    certificatesOrTraining: [] as File[],
    portfolioImages: [] as File[],
  });

  const languageOptions = [
    "English",
    "Shona",
    "Ndebele",
    "Kalanga",
    "Nambya",
    "Tonga",
    "Chewa",
    "Chibarwe",
    "Shangani",
    "Venda",
    "Xhosa",
    "French",
    "German",
    "Portuguese",
    "Mandarin",
    "Arabic",
  ];

  const expertiseAreas = [
    "Historical Sites",
    "Cultural Heritage",
    "Wildlife & Nature",
    "Adventure Sports",
    "Local Cuisine",
    "Arts & Crafts",
    "Music & Dance",
    "Traditional Ceremonies",
    "Urban Tours",
    "Rural Communities",
    "Archaeological Sites",
    "Geological Features",
    "Bird Watching",
    "Photography",
    "Hiking & Trekking",
  ];

  const tourTypes = [
    "Walking Tours",
    "Cultural Tours",
    "Historical Tours",
    "Adventure Tours",
    "Wildlife Safari",
    "Village Tours",
    "Food Tours",
    "Art & Craft Tours",
    "Photography Tours",
    "Spiritual/Religious Tours",
    "Educational Tours",
    "Family Tours",
  ];

  const specialSkills = [
    "First Aid Certified",
    "Wildlife Tracking",
    "Bird Identification",
    "Photography",
    "Traditional Cooking",
    "Craft Making",
    "Storytelling",
    "Music/Dance Performance",
    "Emergency Response",
    "Group Management",
    "Conflict Resolution",
    "Digital Marketing",
  ];

  const handleArrayFieldChange = (field: string, value: string) => {
    setApplicationData((prev) => {
      const currentField = prev[field as keyof typeof prev] as string[];
      const includes =
        Array.isArray(currentField) && currentField.includes(value);

      return {
        ...prev,
        [field]: includes
          ? currentField.filter((item: string) => item !== value)
          : [...(currentField || []), value],
      };
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setApplicationData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReferenceChange = (
    index: number,
    field: string,
    value: string
  ) => {
    const updatedReferences = [...applicationData.references];
    updatedReferences[index] = {
      ...updatedReferences[index],
      [field]: value,
    };
    setApplicationData((prev) => ({
      ...prev,
      references: updatedReferences,
    }));
  };

  const handleFileUpload = (field: string, files: FileList | null) => {
    if (!files) return;

    if (field === "certificatesOrTraining" || field === "portfolioImages") {
      setApplicationData((prev) => ({
        ...prev,
        [field]: Array.from(files),
      }));
    } else {
      setApplicationData((prev) => ({
        ...prev,
        [field]: files[0],
      }));
    }
  };

  const validateApplication = () => {
    return (
      applicationData.yearsInZimbabwe &&
      applicationData.currentLocation &&
      applicationData.languagesSpoken.length > 0 &&
      applicationData.areasOfExpertise.length > 0 &&
      applicationData.localKnowledgeDescription &&
      applicationData.motivationLetter &&
      applicationData.references.filter((ref) => ref.name && ref.phone)
        .length >= 2
    );
  };

  const handleSubmit = async () => {
    if (!validateApplication()) {
      alert("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call for Community Guide application submission
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update user profile with application data
      await updateProfile({
        communityGuideApplication: {
          ...applicationData,
          submittedAt: new Date().toISOString(),
          status: "pending",
        },
        guideApplicationStatus: "pending",
      });

      onComplete?.();
    } catch (error) {
      console.error("Application submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is eligible (must be Local Explorer)
  const isEligible =
    user?.role === "explorer" && user?.explorerType === "local";

  if (!isEligible) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Community Guide Application Not Available
        </h2>
        <p className="text-gray-600 mb-6">
          Only verified Local Explorers are eligible to apply for Community
          Guide status. Please ensure you&apos;re registered as a Local Explorer
          first.
        </p>
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Community Guide Application
        </h2>
        <p className="text-gray-600 mt-2">
          Apply to become a vetted Community Guide and help visitors discover
          the real Zimbabwe
        </p>
      </div>

      <div className="space-y-8">
        {/* Eligibility Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-green-800 font-medium">
              Eligible: Local Explorer Account
            </span>
          </div>
        </div>

        {/* Personal Information */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years living in Zimbabwe *
              </label>
              <select
                value={applicationData.yearsInZimbabwe}
                onChange={(e) =>
                  handleInputChange("yearsInZimbabwe", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select years</option>
                <option value="0-5">0-5 years</option>
                <option value="6-10">6-10 years</option>
                <option value="11-20">11-20 years</option>
                <option value="21+">21+ years</option>
                <option value="born-here">Born in Zimbabwe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Location *
              </label>
              <input
                type="text"
                value={applicationData.currentLocation}
                onChange={(e) =>
                  handleInputChange("currentLocation", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="City/Province"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Languages Spoken * (Select all that apply)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {languageOptions.map((language) => (
                <label key={language} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={applicationData.languagesSpoken.includes(language)}
                    onChange={() =>
                      handleArrayFieldChange("languagesSpoken", language)
                    }
                    className="rounded border-gray-300 text-blue-600 mr-2"
                  />
                  <span className="text-sm text-gray-700">{language}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Expertise & Experience */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Expertise & Experience
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Areas of Expertise * (Select all that apply)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {expertiseAreas.map((area) => (
                  <label key={area} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={applicationData.areasOfExpertise.includes(area)}
                      onChange={() =>
                        handleArrayFieldChange("areasOfExpertise", area)
                      }
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{area}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tourism/Hospitality Experience
              </label>
              <textarea
                value={applicationData.tourismExperience}
                onChange={(e) =>
                  handleInputChange("tourismExperience", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Describe any previous experience in tourism, hospitality, or guiding..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local Knowledge Description *
              </label>
              <textarea
                value={applicationData.localKnowledgeDescription}
                onChange={(e) =>
                  handleInputChange("localKnowledgeDescription", e.target.value)
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your knowledge of local culture, history, attractions, and hidden gems..."
                required
              />
            </div>
          </div>
        </section>

        {/* Specializations */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Specializations
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Tour Types
              </label>
              <div className="grid grid-cols-3 gap-2">
                {tourTypes.map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={applicationData.preferredTourTypes.includes(
                        type
                      )}
                      onChange={() =>
                        handleArrayFieldChange("preferredTourTypes", type)
                      }
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Skills & Certifications
              </label>
              <div className="grid grid-cols-3 gap-2">
                {specialSkills.map((skill) => (
                  <label key={skill} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={applicationData.specialSkills.includes(skill)}
                      onChange={() =>
                        handleArrayFieldChange("specialSkills", skill)
                      }
                      className="rounded border-gray-300 text-blue-600 mr-2"
                    />
                    <span className="text-sm text-gray-700">{skill}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Hours
                </label>
                <input
                  type="text"
                  value={applicationData.availabilityHours}
                  onChange={(e) =>
                    handleInputChange("availabilityHours", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Weekends, Evenings, Flexible"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transportation Access
                </label>
                <input
                  type="text"
                  value={applicationData.transportationAccess}
                  onChange={(e) =>
                    handleInputChange("transportationAccess", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Own vehicle, Public transport, Walking tours"
                />
              </div>
            </div>
          </div>
        </section>

        {/* References */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            References (Minimum 2 required)
          </h3>

          {applicationData.references.map((reference, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-lg p-4 mb-4"
            >
              <h4 className="font-medium text-gray-900 mb-3">
                Reference {index + 1}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={reference.name}
                  onChange={(e) =>
                    handleReferenceChange(index, "name", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Full Name"
                />
                <input
                  type="tel"
                  value={reference.phone}
                  onChange={(e) =>
                    handleReferenceChange(index, "phone", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone Number"
                />
                <input
                  type="text"
                  value={reference.relationship}
                  onChange={(e) =>
                    handleReferenceChange(index, "relationship", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Relationship (e.g., Friend, Colleague)"
                />
                <input
                  type="text"
                  value={reference.yearsKnown}
                  onChange={(e) =>
                    handleReferenceChange(index, "yearsKnown", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Years Known"
                />
              </div>
            </div>
          ))}
        </section>

        {/* Motivation Letter */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Motivation Letter
          </h3>
          <textarea
            value={applicationData.motivationLetter}
            onChange={(e) =>
              handleInputChange("motivationLetter", e.target.value)
            }
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us why you want to become a Community Guide, what unique value you can provide to visitors, and how you plan to represent Zimbabwe's culture and heritage..."
            required
          />
        </section>

        {/* Documents Upload */}
        <section className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Supporting Documents
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Document (Required)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload("idDocument", e.target.files)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificates or Training Documents (Optional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) =>
                  handleFileUpload("certificatesOrTraining", e.target.files)
                }
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio Images (Optional)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                onChange={(e) =>
                  handleFileUpload("portfolioImages", e.target.files)
                }
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Application Review Process */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Application Review Process
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium text-blue-900">Application Review</h4>
              <p className="text-sm text-blue-700">
                Admin team reviews your application (5-7 days)
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium text-blue-900">Reference Check</h4>
              <p className="text-sm text-blue-700">
                We contact your references for verification
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium text-blue-900">Approval & Training</h4>
              <p className="text-sm text-blue-700">
                Complete onboarding and start guiding
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-8 border-t">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={!validateApplication() || isSubmitting}
          className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting Application..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
};

export default CommunityGuideApplication;
