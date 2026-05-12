"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import type { ExplorerBookingRecord } from "@/types/platform";

const UserDashboard = () => {
  const { user, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [bookings, setBookings] = useState<ExplorerBookingRecord[]>([]);
  const [bookingError, setBookingError] = useState("");
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [disputeBookingId, setDisputeBookingId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: user?.profile?.phone || "",
    bio: user?.profile?.bio || "",
  });

  useEffect(() => {
    if (!user) return;

    setEditForm({
      phone: user.profile?.phone || "",
      bio: user.profile?.bio || "",
    });
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "explorer") {
      setBookingsLoading(false);
      return;
    }

    const loadBookings = async () => {
      try {
        const payload = await apiFetch<{ bookings: ExplorerBookingRecord[] }>(
          "/api/bookings"
        );
        setBookings(payload.bookings);
      } catch (err) {
        setBookingError(err instanceof Error ? err.message : "Unable to load bookings.");
      } finally {
        setBookingsLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  const bookingMetrics = useMemo(() => {
    const confirmed = bookings.filter((booking) =>
      ["CONFIRMED", "REQUESTED"].includes(booking.status)
    ).length;
    const totalSpend = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const completed = bookings.filter((booking) => booking.status === "COMPLETED").length;

    return { confirmed, totalSpend, completed };
  }, [bookings]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editForm);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: "Bookings" },
    { id: "profile", label: "Profile" },
  ];

  const submitDispute = async (booking: ExplorerBookingRecord) => {
    setSubmittingDispute(true);
    try {
      await apiFetch<{ dispute: unknown }>(
        `/api/bookings/${booking.confirmationNumber}/disputes`,
        {
          method: "POST",
          body: JSON.stringify({
            reason: disputeReason,
            details: disputeDetails,
          }),
        }
      );
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? { ...item, disputesCount: (item.disputesCount || 0) + 1 }
            : item
        )
      );
      setDisputeBookingId("");
      setDisputeReason("");
      setDisputeDetails("");
      setBookingError("");
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Unable to create dispute."
      );
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.firstName || user.name || "Explorer"}!
              </h1>
              <p className="text-gray-600 capitalize">
                {user.role} Dashboard • {user.verificationStatus.replace(/_/g, " ")}
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Active bookings</h3>
                <p className="text-2xl font-bold text-blue-600">{bookingMetrics.confirmed}</p>
                <p className="text-sm text-blue-700">Confirmed or requested</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Total spend</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${bookingMetrics.totalSpend.toFixed(2)}
                </p>
                <p className="text-sm text-green-700">Across your Off2Zim bookings</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Completed trips</h3>
                <p className="text-2xl font-bold text-purple-600">{bookingMetrics.completed}</p>
                <p className="text-sm text-purple-700">Ready for review and follow-up</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a
                  href="/trip-planner"
                  className="bg-blue-100 p-4 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <h4 className="font-medium text-blue-900">Plan New Trip</h4>
                  <p className="text-sm text-blue-700">Create itinerary</p>
                </a>
                <a
                  href="/marketplace"
                  className="bg-orange-100 p-4 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  <h4 className="font-medium text-orange-900">Browse listings</h4>
                  <p className="text-sm text-orange-700">Discover providers</p>
                </a>
                <a
                  href="/activities"
                  className="bg-green-100 p-4 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <h4 className="font-medium text-green-900">Book activities</h4>
                  <p className="text-sm text-green-700">Explore experiences</p>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            {bookingError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {bookingError}
              </div>
            ) : null}

            {bookingsLoading ? (
              <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
                Loading your bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
                You have no bookings yet.
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {booking.listing?.title || booking.bookingType}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {booking.confirmationNumber} • {booking.provider?.companyName || "Off2Zim"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {booking.status}
                      </span>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        {booking.paymentStatus}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm text-gray-600">
                    <div>
                      <div className="text-gray-400">Booked on</div>
                      <div>{new Date(booking.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Dates</div>
                      <div>
                        {booking.checkIn
                          ? new Date(booking.checkIn).toLocaleDateString()
                          : "Flexible"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Guests</div>
                      <div>{booking.guests || 1}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total</div>
                      <div>
                        ${booking.totalAmount.toFixed(2)} {booking.currency}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      {booking.disputesCount || 0} dispute
                      {(booking.disputesCount || 0) === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() =>
                        setDisputeBookingId((current) =>
                          current === booking.id ? "" : booking.id
                        )
                      }
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {disputeBookingId === booking.id ? "Cancel dispute" : "Open dispute"}
                    </button>
                  </div>
                  {disputeBookingId === booking.id ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="grid gap-3">
                        <input
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Reason for dispute"
                          className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm"
                        />
                        <textarea
                          value={disputeDetails}
                          onChange={(e) => setDisputeDetails(e.target.value)}
                          placeholder="Describe what happened and what resolution you need."
                          className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm"
                          rows={4}
                        />
                        <button
                          onClick={() => submitDispute(booking)}
                          disabled={submittingDispute}
                          className="w-fit rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {submittingDispute ? "Submitting..." : "Submit dispute"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Profile Information
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                <div>
                  <div className="text-gray-400">Name</div>
                  <div>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.name}</div>
                </div>
                <div>
                  <div className="text-gray-400">Email</div>
                  <div>{user.email}</div>
                </div>
                <div>
                  <div className="text-gray-400">Phone</div>
                  <div>{user.profile?.phone || "Not set"}</div>
                </div>
                <div>
                  <div className="text-gray-400">Explorer type</div>
                  <div>{user.explorerType || "Not set"}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
