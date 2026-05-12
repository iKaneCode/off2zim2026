"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Download,
  Search,
  MoreHorizontal,
} from "lucide-react";

interface Order {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: string;
  serviceDate: string;
  guests: number;
  totalAmount: number;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "in-progress";
  paymentStatus: "paid" | "pending" | "refunded" | "failed";
  notes?: string;
  createdAt: string;
}

const mockOrders: Order[] = [
  {
    id: "1",
    bookingReference: "VF-2024-001",
    customerName: "Sarah Chen",
    customerEmail: "sarah.chen@email.com",
    customerPhone: "+1 555-0123",
    serviceName: "Victoria Falls Helicopter Tour",
    bookingDate: "2024-06-06",
    serviceDate: "2024-06-15",
    guests: 2,
    totalAmount: 360,
    status: "confirmed",
    paymentStatus: "paid",
    notes: "Celebrating anniversary - please provide champagne upgrade",
    createdAt: "2 hours ago",
  },
  {
    id: "2",
    bookingReference: "VF-2024-002",
    customerName: "James Wilson",
    customerEmail: "james.w@email.com",
    customerPhone: "+44 20 7946 0958",
    serviceName: "Sunset River Cruise",
    bookingDate: "2024-06-07",
    serviceDate: "2024-06-12",
    guests: 4,
    totalAmount: 260,
    status: "pending",
    paymentStatus: "pending",
    notes: "Group booking for family vacation",
    createdAt: "6 hours ago",
  },
  {
    id: "3",
    bookingReference: "VF-2024-003",
    customerName: "Emma Rodriguez",
    customerEmail: "emma.rodriguez@email.com",
    customerPhone: "+1 555-0456",
    serviceName: "Hwange Safari Day Trip",
    bookingDate: "2024-06-05",
    serviceDate: "2024-06-10",
    guests: 1,
    totalAmount: 120,
    status: "completed",
    paymentStatus: "paid",
    createdAt: "1 day ago",
  },
  {
    id: "4",
    bookingReference: "VF-2024-004",
    customerName: "Michael Brown",
    customerEmail: "m.brown@email.com",
    customerPhone: "+61 2 9876 5432",
    serviceName: "Traditional Cooking Class",
    bookingDate: "2024-06-04",
    serviceDate: "2024-06-08",
    guests: 2,
    totalAmount: 90,
    status: "cancelled",
    paymentStatus: "refunded",
    notes: "Customer had to cancel due to flight delays",
    createdAt: "2 days ago",
  },
];

export default function OrderManagement() {
  const [orders, setOrders] = useState(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return {
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Confirmed",
        };
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="w-4 h-4" />,
          text: "Pending",
        };
      case "cancelled":
        return {
          color: "bg-red-100 text-red-800",
          icon: <XCircle className="w-4 h-4" />,
          text: "Cancelled",
        };
      case "completed":
        return {
          color: "bg-blue-100 text-blue-800",
          icon: <CheckCircle className="w-4 h-4" />,
          text: "Completed",
        };
      case "in-progress":
        return {
          color: "bg-purple-100 text-purple-800",
          icon: <Clock className="w-4 h-4" />,
          text: "In Progress",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: <AlertCircle className="w-4 h-4" />,
          text: "Unknown",
        };
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.bookingReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus as Order["status"] } : order
      )
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <h2 className="text-xl font-bold text-gray-900">Order Management</h2>

          <div className="flex space-x-3">
            <button className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, booking reference, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Orders</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>

        {/* Order Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">23</div>
            <div className="text-sm text-blue-600">Total Orders</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-green-600">Confirmed</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">$4,250</div>
            <div className="text-sm text-purple-600">Revenue</div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Calendar className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status);

              return (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                    {/* Order Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.bookingReference}
                            </h3>
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                            >
                              {statusBadge.icon}
                              <span>{statusBadge.text}</span>
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentBadge(order.paymentStatus)}`}
                            >
                              {order.paymentStatus.charAt(0).toUpperCase() +
                                order.paymentStatus.slice(1)}
                            </span>
                          </div>

                          <p className="text-lg font-medium text-gray-900 mb-1">
                            {order.serviceName}
                          </p>
                          <p className="text-sm text-gray-600">
                            Booked {order.createdAt}
                          </p>
                        </div>

                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Customer Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">
                            Customer
                          </h4>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {order.customerName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {order.customerEmail}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {order.customerPhone}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">
                            Booking Details
                          </h4>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {order.serviceDate}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {order.guests} guest
                                {order.guests > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-semibold text-green-600">
                                ${order.totalAmount}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">
                              Notes
                            </h4>
                            <p className="text-sm text-gray-600">
                              {order.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 lg:ml-6">
                      {order.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "confirmed")
                            }
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, "cancelled")
                            }
                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {order.status === "confirmed" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}

                      <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        <MessageCircle className="w-4 h-4 inline mr-2" />
                        Message
                      </button>

                      <button className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
